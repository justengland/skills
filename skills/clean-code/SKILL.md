---
name: clean-code
description: Audit a codebase against Uncle Bob's Clean Architecture (SOLID, component principles, the Dependency Rule), render it as an interactive HTML map, then grill through whichever finding you pick.
disable-model-invocation: true
---

# Clean Code

Map the codebase onto Uncle Bob's concentric rings and judge it against his fourteen principles. The output is an interactive report: the rings with every real import drawn on them, the Main Sequence plot, and findings you can click to light up the components involved.

The split of labour is the point of this skill. **You supply facts; the template supplies verdicts.** You decide what the components are, which ring each belongs in, and which imports exist. `report.html` derives Dependency Rule violations, cycles, stability (I), abstractness (A), and distance from the Main Sequence (D) from those facts, and `render.ts` reads git history for churn and co-change, the same way every run. Your judgement goes into the ring placement and the findings, and nowhere else.

The vocabulary is Bob's. Use these words exactly: **policy**, **detail**, **actor**, **component**, **ring**, **Dependency Rule**, **boundary**, **stable**, **abstract**, **Main Sequence**, **zone of pain**, **zone of uselessness**. `GLOSSARY.md` names the domain; ADRs in `docs/adr/` record decisions you leave settled.

## Process

### 1. Scope

- If the user named a direction (a subsystem, a pain point), take it.
- Otherwise walk `git log --oneline` back a good stretch, find the hot spots, and weight them first. A small repo gets scanned whole.

Read `GLOSSARY.md` and the ADRs in scope.

### 2. Map

Spawn a sub-agent and hand it [PRINCIPLES.md](PRINCIPLES.md) and [example.json](example.json). It returns `data.json` in the example's shape:

- **components**: one per cohesive package (usually a directory). Each gets a `ring`: 0 entities, 1 use cases, 2 interface adapters, 3 frameworks & drivers. Place each one by what it *is* (policy or detail), never by what it imports, or the Dependency Rule check proves nothing.
- **edges**: every import from one component into another, read from source, not guessed. Done when every cross-component import in scope is an edge.
- **abstract / total**: count of interfaces + abstract types vs. all exported types, per component.
- **folders**: the top-level source folders, each tagged `business` or `technical` (Screaming Architecture).

### 3. Judge

Walk all fourteen principles in PRINCIPLES.md against the map and write `findings`. Done when each principle has been checked and either has a finding or turned up clean. Every finding names its components and files. Leave out what the template measures (outward edges, cycles, SDP inversions, zone of pain), because it adds those itself, tagged `measured`. Your findings are the ones that need reading: SRP actors, OCP switch ladders, LSP contract breaks, fat interfaces, misgrouped components, UI and DB details steering policy.

Strength is one of `strong`, `worth`, `speculative`. A finding that contradicts an ADR shows up only when the pain is real enough to reopen it, and says so in `problem`.

### 4. Render

From the repo root:

```sh
bun ~/.claude/skills/clean-code/render.ts data.json   # --commits N to change the 500-commit window
```

It validates the data, measures churn and co-change per component from `git log`, writes `$TMPDIR/clean-code-<timestamp>.html`, and prints the path. Fix any validation error it reports and rerun. Open the file (`xdg-open`) and give the user the absolute path.

Then ask: "Which finding do you want to dig into?"

### 5. Grill

Once the user picks a finding, call the Skill tool with "grilling" and walk the decision tree: where the boundary goes, which side owns the interface, what moves between rings, which tests survive. Hold off on proposing code until the grilling settles the shape.

As decisions land, call the Skill tool with "domain-modeling": new names go in `GLOSSARY.md`. When the user rejects a finding for a reason a future audit would need, offer an ADR so the next run leaves it alone.
