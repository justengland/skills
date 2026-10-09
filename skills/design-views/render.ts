// Validate design-views data and write the interactive report.
// Usage (from the repo root): bun render.ts data.json
const VIEWS = ["logical", "physical", "application", "rings", "class"] as const;
const ACTOR_KINDS = ["human", "agent", "system"];
const UNIT_KINDS = ["process", "package", "binary", "folder"];
const STRENGTHS = ["strong", "worth", "speculative"];
const PRINCIPLES: Record<string, string[]> = {
  logical: ["FLOW", "ORPHAN", "LEAK", "HAND"],
  physical: ["PACK", "SCATTER", "GHOST", "HAND"],
  application: ["HUB", "SKIP", "MIX", "HAND"],
  rings: ["DEP", "HAND"],
  class: ["TYPE", "HAND"],
};

const dataPath = Bun.argv[2];
if (!dataPath) throw new Error("usage: bun render.ts data.json");

const data = await Bun.file(dataPath).json();
const errors: string[] = [];

if (!data.repo) errors.push("repo is required");
if (!Array.isArray(data.views) || !data.views.length) errors.push("views must list at least one view");
for (const v of data.views ?? []) {
  if (!(VIEWS as readonly string[]).includes(v)) errors.push(`unknown view ${v}`);
}
const views = new Set<string>(data.views ?? []);

const actorIds = new Set<string>();
if (!Array.isArray(data.actors)) errors.push("actors must be an array");
else
  for (const a of data.actors) {
    if (!a.id) errors.push("actor missing id");
    if (actorIds.has(a.id)) errors.push(`duplicate actor id ${a.id}`);
    actorIds.add(a.id);
    if (!ACTOR_KINDS.includes(a.kind)) errors.push(`actor ${a.id}: kind must be human|agent|system`);
  }

function checkGraph(
  key: "logical" | "physical" | "application",
  nodeKey: "boxes" | "units" | "modules",
  extra?: (n: any) => void,
) {
  if (!views.has(key)) {
    if (data[key]) errors.push(`${key} present but not in views[]`);
    return;
  }
  const g = data[key];
  if (!g) {
    errors.push(`${key} missing for chosen view`);
    return;
  }
  const ids = new Set<string>();
  if (!Array.isArray(g[nodeKey]) || !g[nodeKey].length) errors.push(`${key}.${nodeKey} is empty`);
  for (const n of g[nodeKey] ?? []) {
    if (!n.id) errors.push(`${key} node missing id`);
    if (ids.has(n.id)) errors.push(`duplicate ${key} id ${n.id}`);
    ids.add(n.id);
    if (!n.name) errors.push(`${n.id}: name required`);
    extra?.(n);
  }
  if (!Array.isArray(g.edges)) errors.push(`${key}.edges must be an array`);
  for (const e of g.edges ?? []) {
    if (!ids.has(e.from) || !ids.has(e.to)) errors.push(`${key} edge ${e.from} -> ${e.to} names unknown node`);
  }
  return ids;
}

const boxIds = checkGraph("logical", "boxes", (n) => {
  if (!Array.isArray(n.actors)) errors.push(`${n.id}: actors[] required`);
  else for (const a of n.actors) if (!actorIds.has(a)) errors.push(`${n.id}: unknown actor ${a}`);
});
checkGraph("physical", "units", (n) => {
  if (!UNIT_KINDS.includes(n.kind)) errors.push(`${n.id}: kind must be process|package|binary|folder`);
  if (!Array.isArray(n.paths) || !n.paths.length) errors.push(`${n.id}: paths required`);
});
const modIds = checkGraph("application", "modules", (n) => {
  if (!Array.isArray(n.paths) || !n.paths.length) errors.push(`${n.id}: paths required`);
});

let ringIds: Set<string> | undefined;
if (views.has("rings")) {
  const g = data.rings;
  if (!g) errors.push("rings missing for chosen view");
  else {
    ringIds = new Set();
    if (!Array.isArray(g.components) || !g.components.length) errors.push("rings.components is empty");
    for (const c of g.components ?? []) {
      if (!c.id) errors.push("rings component missing id");
      if (ringIds.has(c.id)) errors.push(`duplicate rings id ${c.id}`);
      ringIds.add(c.id);
      if (![0, 1, 2, 3].includes(c.ring)) errors.push(`${c.id}: ring must be 0-3`);
      if (!Array.isArray(c.paths) || !c.paths.length) errors.push(`${c.id}: paths required`);
    }
    if (!Array.isArray(g.edges)) errors.push("rings.edges must be an array");
    for (const e of g.edges ?? []) {
      if (!ringIds.has(e.from) || !ringIds.has(e.to)) errors.push(`rings edge ${e.from} -> ${e.to} names unknown component`);
    }
  }
} else if (data.rings) errors.push("rings present but not in views[]");

if (views.has("class")) {
  const c = data.class;
  if (!c) errors.push("class missing for chosen view");
  else if (!c.mermaid && !c.image) errors.push("class needs mermaid or image");
} else if (data.class) errors.push("class present but not in views[]");

for (const f of data.findings ?? []) {
  if (!views.has(f.view)) errors.push(`${f.id}: view ${f.view} not in views[]`);
  const allowed = PRINCIPLES[f.view] ?? [];
  if (!allowed.includes(f.principle)) errors.push(`${f.id}: principle must be one of ${allowed.join(", ")}`);
  if (!STRENGTHS.includes(f.strength)) errors.push(`${f.id}: strength must be one of ${STRENGTHS.join(", ")}`);
  const ids =
    f.view === "logical"
      ? boxIds
      : f.view === "physical"
        ? new Set((data.physical?.units ?? []).map((u: any) => u.id))
        : f.view === "application"
          ? modIds
          : f.view === "rings"
            ? ringIds
            : new Set();
  const touched = f.boxes ?? f.units ?? f.modules ?? f.components ?? f.types ?? [];
  for (const id of touched) if (ids && ids.size && !ids.has(id)) errors.push(`${f.id}: unknown id ${id}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const template = await Bun.file(new URL("./report.html", import.meta.url)).text();
const out = `${process.env.TMPDIR ?? "/tmp"}/design-views-${Date.now()}.html`;
await Bun.write(out, template.replace("/*DATA*/null", JSON.stringify(data).replace(/</g, "\\u003c")));
console.log(out);
