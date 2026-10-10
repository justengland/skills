#!/usr/bin/env node
// grill-n-chill: local flash-card server + CLI. Zero dependencies (Node 18+).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def;
};
const root = path.resolve(flag('dir', process.cwd()));
const dataDir = path.join(root, '.grill-n-chill');
const sessionFile = path.join(dataDir, 'session.json');
const serverFile = path.join(dataDir, 'server.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (o) => console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2));
const die = (m) => { console.error(m); process.exit(1); };

/* ------------------------------ server ------------------------------ */

function serve() {
  const port = Number(flag('port', 4711));
  const host = flag('host', '127.0.0.1');
  fs.mkdirSync(dataDir, { recursive: true });

  let S = fresh();
  try { S = { ...S, ...JSON.parse(fs.readFileSync(sessionFile, 'utf8')) }; } catch {}
  if (flag('title')) S.title = flag('title');
  const save = () => { S.version++; fs.writeFileSync(sessionFile, JSON.stringify(S, null, 2)); };

  function fresh() {
    return {
      title: 'Grill-n-Chill', status: 'open', version: 0, createdAt: new Date().toISOString(),
      cards: [], answers: {}, events: [], agentCursor: 0, nextId: 1,
    };
  }
  const ev = (type, o) => { S.events.push({ n: S.events.length + 1, type, ts: new Date().toISOString(), ...o }); };
  const cardOf = (id) => S.cards.find((c) => c.id === id);
  const label = (card, v) => {
    if (v === undefined || v === null) return v;
    if (Array.isArray(v)) return v.map((x) => label(card, x));
    if (card?.type === 'mc') {
      const o = (card.options || []).find((o) => o.key === v);
      return o ? `${v}: ${o.label}` : v;
    }
    return v;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const body = (req) => new Promise((res, rej) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 2e6) req.destroy(); });
    req.on('end', () => { try { res(d ? JSON.parse(d) : {}); } catch (e) { rej(e); } });
  });
  const send = (res, code, o, type = 'application/json') => {
    res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(type === 'application/json' ? JSON.stringify(o) : o);
  };

  function pendingRevisions(exceptCard) {
    return S.events
      .filter((e) => e.n > S.agentCursor && e.type === 'revision' && e.cardId !== exceptCard)
      .map((e) => ({ cardId: e.cardId, question: e.question, from: e.from, to: e.to, text: e.text, note: e.note }));
  }
  const markSeen = () => { S.agentCursor = S.events.length; save(); };

  function exportMd() {
    const lines = [`# ${S.title}`, '', `Status: ${S.status}`, ''];
    S.cards.forEach((c, i) => {
      const a = S.answers[c.id];
      lines.push(`## ${i + 1}. ${c.question}${c.stale ? ' (withdrawn)' : ''}`);
      if (c.topic) lines.push(`_Topic: ${c.topic}_`);
      if (c.context) lines.push('', c.context);
      if (c.recommended !== undefined) lines.push('', `Recommended: ${String(label(c, c.recommended))}${c.why ? ` (${c.why})` : ''}`);
      if (a) {
        const v = Array.isArray(a.value) ? a.value.map((x) => label(c, x)).join(', ') : label(c, a.value);
        lines.push('', `**Answer:** ${v}${a.text ? ` , ${a.text}` : ''}`);
        if (a.note) lines.push(`Note: ${a.note}`);
        if (a.history?.length) lines.push(`_Revised ${a.history.length} time(s)._`);
      } else lines.push('', '**Answer:** (unanswered)');
      lines.push('');
    });
    return lines.join('\n');
  }

  const srv = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    try {
      if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
        return send(res, 200, fs.readFileSync(path.join(here, 'ui.html'), 'utf8'), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && p === '/api/state') return send(res, 200, S);
      if (req.method === 'GET' && p === '/api/export') return send(res, 200, exportMd(), 'text/markdown; charset=utf-8');

      if (req.method === 'POST' && p === '/api/cards') {
        const c = await body(req);
        if (!['mc', 'tf', 'essay'].includes(c.type)) return send(res, 400, { error: 'type must be mc, tf or essay' });
        if (!c.question) return send(res, 400, { error: 'question required' });
        if (c.type === 'mc' && !(c.options || []).length) return send(res, 400, { error: 'mc needs options' });
        const existing = c.id && cardOf(c.id);
        if (existing) {
          if (S.answers[existing.id]) return send(res, 200, existing); // reattach, never clobber an answered card
          Object.assign(existing, c);
          save();
          return send(res, 200, existing);
        }
        c.id = c.id || 'c' + S.nextId++;
        c.createdAt = new Date().toISOString();
        S.cards.push(c);
        S.status = 'open';
        ev('card', { cardId: c.id });
        save();
        return send(res, 200, c);
      }

      if (req.method === 'POST' && p === '/api/answer') {
        const b = await body(req);
        const c = cardOf(b.cardId);
        if (!c) return send(res, 404, { error: 'no such card' });
        if (b.value === undefined || b.value === null || b.value === '') return send(res, 400, { error: 'value required' });
        const prev = S.answers[c.id];
        const next = { value: b.value, text: b.text || undefined, note: b.note || undefined, ts: new Date().toISOString(), history: prev?.history || [] };
        if (prev && (!same(prev.value, next.value) || (prev.text || '') !== (next.text || ''))) {
          next.history = [...next.history, { value: prev.value, text: prev.text, note: prev.note, ts: prev.ts }];
          S.answers[c.id] = next;
          ev('revision', { cardId: c.id, question: c.question, from: label(c, prev.value), to: label(c, next.value), text: next.text, note: next.note });
        } else if (prev) {
          S.answers[c.id] = { ...prev, note: next.note };
        } else {
          S.answers[c.id] = next;
          ev('answer', { cardId: c.id });
        }
        save();
        return send(res, 200, { ok: true });
      }

      if (req.method === 'POST' && p === '/api/retire') {
        const b = await body(req);
        const c = cardOf(b.cardId);
        if (!c) return send(res, 404, { error: 'no such card' });
        c.stale = b.stale !== false;
        save();
        return send(res, 200, { ok: true });
      }

      if (req.method === 'POST' && p === '/api/finish') {
        S.status = 'done';
        save();
        return send(res, 200, { ok: true });
      }

      if (req.method === 'GET' && p === '/api/wait') {
        const id = url.searchParams.get('cardId');
        const timeout = Math.min(Number(url.searchParams.get('timeout') || 25000), 55000);
        const t0 = Date.now();
        while (Date.now() - t0 < timeout) {
          if (S.answers[id]) {
            const c = cardOf(id);
            const revisions = pendingRevisions(id);
            markSeen();
            return send(res, 200, { done: true, card: { id, type: c.type, question: c.question }, answer: S.answers[id], revisions });
          }
          // a revision on an earlier card should surface even while waiting
          await sleep(300);
        }
        return send(res, 200, { done: false, pendingRevisions: pendingRevisions(id) });
      }

      if (req.method === 'GET' && p === '/api/peek') {
        const r = pendingRevisions();
        markSeen();
        return send(res, 200, { revisions: r });
      }

      if (req.method === 'POST' && p === '/api/stop') {
        send(res, 200, { ok: true });
        setTimeout(() => process.exit(0), 100);
        return;
      }

      send(res, 404, { error: 'not found' });
    } catch (e) {
      send(res, 500, { error: String(e.message || e) });
    }
  });

  srv.listen(port, host, () => {
    fs.writeFileSync(serverFile, JSON.stringify({ port, host, pid: process.pid }));
  });
  srv.on('error', (e) => die('server error: ' + e.message));
}

/* ------------------------------- client ------------------------------ */

function endpoint() {
  try {
    const s = JSON.parse(fs.readFileSync(serverFile, 'utf8'));
    const h = s.host === '0.0.0.0' ? '127.0.0.1' : s.host;
    return `http://${h}:${s.port}`;
  } catch { return null; }
}
async function call(method, p, data) {
  const base = endpoint();
  if (!base) die('No server running here. Run: gnc.mjs start');
  let r;
  try {
    r = await fetch(base + p, { method, headers: { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  } catch { die('Server not reachable. Run: gnc.mjs start'); }
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) die(`HTTP ${r.status}: ${typeof j === 'string' ? j : j.error}`);
  return j;
}
async function alive() {
  const base = endpoint();
  if (!base) return false;
  try { return (await fetch(base + '/api/state')).ok; } catch { return false; }
}
async function readInput(src) {
  if (!src || src === '-') {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8');
  }
  return fs.readFileSync(src, 'utf8');
}

async function main() {
  if (cmd === 'serve') return serve();

  if (cmd === 'start') {
    if (!(await alive())) {
      fs.mkdirSync(dataDir, { recursive: true });
      try { fs.unlinkSync(serverFile); } catch {}
      const a = ['serve', '--dir', root];
      for (const f of ['port', 'host', 'title']) if (flag(f)) a.push('--' + f, flag(f));
      const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...a], { detached: true, stdio: 'ignore' });
      child.unref();
      for (let i = 0; i < 50 && !(await alive()); i++) await sleep(100);
      if (!(await alive())) die('Server failed to start (is the port in use? try --port).');
    }
    const s = JSON.parse(fs.readFileSync(serverFile, 'utf8'));
    return out(`Grill-n-Chill is up: http://localhost:${s.port}  (state in ${dataDir})`);
  }

  if (cmd === 'ask') {
    let card;
    try { card = JSON.parse(await readInput(argv[1])); } catch (e) { die('Card must be valid JSON: ' + e.message); }
    const posted = await call('POST', '/api/cards', card);
    const deadline = Date.now() + Number(flag('max-minutes', 60)) * 60000;
    while (Date.now() < deadline) {
      const r = await call('GET', `/api/wait?cardId=${encodeURIComponent(posted.id)}&timeout=25000`);
      if (r.done) return out({ card: r.card, answer: r.answer, revisions: r.revisions });
    }
    return out({ card: { id: posted.id }, answer: null, timedOut: true, hint: 'Run ask again with the same id to reattach.' });
  }

  if (cmd === 'peek') return out(await call('GET', '/api/peek'));
  if (cmd === 'retire') return out(await call('POST', '/api/retire', { cardId: argv[1] }));
  if (cmd === 'finish') return out(await call('POST', '/api/finish', {}));
  if (cmd === 'state') return out(await call('GET', '/api/state'));
  if (cmd === 'export') return out(await call('GET', '/api/export'));
  if (cmd === 'stop') return out(await call('POST', '/api/stop', {}));

  die('Usage: gnc.mjs <start|ask|peek|retire|state|export|finish|stop> [options]');
}
main();
