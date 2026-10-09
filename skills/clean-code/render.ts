// Validate clean-code data, measure git history, and write the interactive report.
// Usage (from the repo root): bun render.ts data.json [--commits 500]
import { $ } from "bun";

const PRINCIPLES = ["SRP", "OCP", "LSP", "ISP", "DIP", "REP", "CCP", "CRP", "ADP", "SDP", "SAP", "DEP", "SCREAM", "DETAILS"];
const STRENGTHS = ["strong", "worth", "speculative"];
// ponytail: commits touching more components than this are mass edits (renames, formatting) and drown the signal
const MAX_SPREAD = 8;

const args = Bun.argv.slice(2);
const dataPath = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const commitsArg = args.indexOf("--commits");
const commitLimit = commitsArg >= 0 ? Number(args[commitsArg + 1]) : 500;
if (!dataPath) throw new Error("usage: bun render.ts data.json [--commits 500]");

const data = await Bun.file(dataPath).json();
const errors: string[] = [];
const ids = new Set<string>();
for (const c of data.components ?? []) {
  if (ids.has(c.id)) errors.push(`duplicate component id ${c.id}`);
  ids.add(c.id);
  if (![0, 1, 2, 3].includes(c.ring)) errors.push(`${c.id}: ring must be 0-3`);
  if (!Array.isArray(c.paths) || !c.paths.length) errors.push(`${c.id}: paths must list at least one path`);
  if (!(c.total >= c.abstract && c.abstract >= 0)) errors.push(`${c.id}: need 0 <= abstract <= total`);
}
if (!ids.size) errors.push("components is empty");
for (const e of data.edges ?? []) {
  if (!ids.has(e.from) || !ids.has(e.to)) errors.push(`edge ${e.from} -> ${e.to} names an unknown component`);
}
for (const f of data.findings ?? []) {
  if (!PRINCIPLES.includes(f.principle)) errors.push(`${f.id}: principle must be one of ${PRINCIPLES.join(", ")}`);
  if (!STRENGTHS.includes(f.strength)) errors.push(`${f.id}: strength must be one of ${STRENGTHS.join(", ")}`);
  for (const c of f.components ?? []) if (!ids.has(c)) errors.push(`${f.id}: unknown component ${c}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// History: churn per component and how often pairs change in the same commit.
data.history = null;
const log = await $`git log -n ${commitLimit} --no-merges --name-only --format=tformat:__C__`.quiet().nothrow();
if (log.exitCode === 0) {
  const owners = data.components
    .flatMap((c: any) => c.paths.map((p: string) => ({ id: c.id, p: p.replace(/\/$/, "") })))
    .sort((a: any, b: any) => b.p.length - a.p.length);
  const ownerOf = (file: string) => owners.find((o: any) => file === o.p || file.startsWith(o.p + "/"))?.id;
  const churn: Record<string, number> = {};
  const pairs: Record<string, number> = {};
  let commits = 0;
  for (const chunk of log.stdout.toString().split("__C__")) {
    const touched = [...new Set(chunk.split("\n").map((f) => ownerOf(f.trim())).filter(Boolean))] as string[];
    if (!touched.length || touched.length > MAX_SPREAD) continue;
    commits++;
    for (const id of touched) churn[id] = (churn[id] ?? 0) + 1;
    touched.sort();
    for (let i = 0; i < touched.length; i++)
      for (let j = i + 1; j < touched.length; j++) {
        const k = `${touched[i]}|${touched[j]}`;
        pairs[k] = (pairs[k] ?? 0) + 1;
      }
  }
  const cochange = Object.entries(pairs).map(([k, n]) => {
    const [a, b] = k.split("|");
    return { a, b, n };
  });
  data.history = { commits, churn, cochange };
}

const template = await Bun.file(new URL("./report.html", import.meta.url)).text();
const out = `${process.env.TMPDIR ?? "/tmp"}/clean-code-${Date.now()}.html`;
await Bun.write(out, template.replace("/*DATA*/null", JSON.stringify(data).replace(/</g, "\\u003c")));
console.log(out);
