# Design views reference

Disclosed reference for the `design-views` Map and Judge steps. Load only the sections for the chosen views.

## Actors

An **actor** is any stakeholder or runtime participant: human operator, CLI, web UI, Cursor, Jev, Bowser, shell, external API, cron, other service.

| kind | holds |
|---|---|
| `human` | operator, reviewer, author |
| `agent` | LLM or tool-using agent (Cursor, Jev, Bowser, …) |
| `system` | process, service, binary, external API with no human in the loop |

List every **actor** that appears on a **logical** **box** (or as a physical peer) in `actors[]`. Ids are stable; boxes reference them.

## Hand off

**HAND** (every view): when the finding is a ring or Dependency Rule question, `fix` points at `clean-code`.

## Logical

**Logical** shows collaboration and information flow: who talks to whom, which responsibility sits where.

### Map

- **boxes**: one cohesive responsibility (a use of the system, a workflow stage, a capability). Fields: `id`, `name`, `actors[]` (who initiates or serves it), optional `paths` when code owns it.
- **edges**: directed collaboration (`from` → `to`), optional `label` (what moves: decision, tape line, prompt, HTTP, …). Draw the flow the operators and agents actually use.

Done when every actor in scope sits on at least one box, and every named collaboration in scope is an edge.

### Judge (principle ids)

- **FLOW**: a collaboration the product depends on is missing, or one actor serves two unrelated jobs on one box. *Smell:* an agent box that both writes code and grades itself; a human path that bypasses the recorded flow.
- **ORPHAN**: a box with no actors, or an actor listed but attached to no box.
- **LEAK**: packaging or import facts drawn as logical edges — put those on **physical** or **application**; keep logical edges as collaboration.
- **HAND**

## Physical

**Physical** shows where things live at runtime and on disk: processes, packages, binaries, folders.

### Map

- **units**: `id`, `name`, `kind` (`process` | `package` | `binary` | `folder`), `paths` (at least one).
- **edges**: `contains`, talks-to, or deploys-with. Optional `label` for the relation.

Done when every in-scope runtime process and top-level package/folder that hosts chosen logical boxes is a unit, and containment/talks-to edges cover how they sit together.

### Judge (principle ids)

- **PACK**: two responsibilities that must deploy or restart apart share one process/unit with no seam.
- **SCATTER**: one responsibility's files span many unrelated units with no containing unit.
- **GHOST**: a unit with no paths, or paths that do not exist in the repo.
- **HAND**

## Application

**Application** is the fine-grained module dependency graph inside the app. Edges are **real cross-module imports**, read from source.

### Map

- **modules**: cohesive packages (usually directories). `id`, `name`, `paths`.
- **edges**: every import from one module into another in scope. Done when every cross-module import in scope is an edge.

### Judge (principle ids)

Leave cycles, fan-in/out, hubs, and bidirectional pairs to the template (`measured`). Your findings:

- **HUB**: a module everyone reaches for one helper — write only when reading the code shows the thin use, not merely high fan-in.
- **SKIP**: callers reach a leaf detail instead of the façade that should own the seam.
- **MIX**: one module holds unrelated jobs that change for different actors (git log shows unrelated features).
- **HAND**

## Rings

**Rings** is Uncle Bob's concentric placement (0 entities → 3 frameworks). Same labour split as `clean-code`: place by what a component *is*, never by what it imports. The template flags outward edges from policy (rings 0–1). For the full fourteen-principle audit, run `clean-code` and optionally set `links["clean-code"]` so the header opens that report.

### Map

- **components**: `id`, `name`, `ring` (0–3), `paths`.
- **edges**: real cross-component imports.

### Judge (principle ids)

- **DEP**: leave measured outward edges to the template; write a finding only when a type crosses the boundary without an import.
- **HAND**

## Class

**Class** shows types and their relations. Default: Mermaid `classDiagram` in `class.mermaid` (renders in the report). For PNG/SVG export or Salt/use-case leftovers, run `plantuml` and set `class.image` (and optionally `links.plantuml`).

### Map

- `class.mermaid`: a Mermaid classDiagram string, or
- `class.image`: path/URL to a rendered diagram.

Done when the types in scope and their inheritance/association edges are on the diagram.

### Judge (principle ids)

- **TYPE**: a named type or relation the code depends on is missing, or the diagram invents a hierarchy the code does not have.
- **HAND**

## Links

Optional `links` object: `clean-code`, `plantuml`, or a view name → absolute `file://` or path the header can open. Use when the sibling skill already produced a report you want one click away.

## Findings shape

Match [example.json](example.json). Touched ids go in `boxes`, `units`, `modules`, `components`, or `types` for the finding's view. Strength: `strong` | `worth` | `speculative`.

## Exhaustiveness

Judge is done when every principle id for each **chosen** view has been checked. A clean principle gets no finding. Skip principle ids for views not in `views[]`.
