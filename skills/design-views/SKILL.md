---
name: design-views
description: Map logical, physical, and application design views into an interactive HTML report, then grill a finding.
disable-model-invocation: true
---

# Design Views

Map **actors**, responsibilities, packaging, module imports, Clean Architecture **rings**, and **class** structure into one HTML hub. The sticky header links every diagram. You supply facts; the template measures **mess** and outward ring edges. Judgement goes into view choice, placement, and findings.

Use these words exactly: **actor**, **logical**, **physical**, **application**, **rings**, **class**, **unit**, **edge**, **box**, **mess**. `GLOSSARY.md` names the domain; ADRs in `docs/adr/` record decisions you leave settled. Full Clean Architecture audit → `clean-code`. Class PNG/SVG export → `plantuml`.

## Process

### 1. Scope

- If the user named a direction, take it.
- Otherwise walk `git log --oneline` back a good stretch, list hot spots, and weight them first. A small repo gets scanned whole.

Read `GLOSSARY.md` and the ADRs in scope.

**Done when:** direction taken or hot spots listed; glossary and in-scope ADRs read.

### 2. Choose views

Emit only the views the task needs:

| Pain | View |
|---|---|
| who/how, agents, flows, boxes | **logical** |
| packaging, process, deploy, folders | **physical** |
| deps, cycles, import mess, fan-out | **application** |
| Clean Architecture placement / Dependency Rule | **rings** (or run `clean-code` and set `links["clean-code"]`) |
| types, structs, interfaces, inheritance | **class** (Mermaid in `class.mermaid`; `plantuml` for PNG/SVG → `class.image`) |
| full picture / still foggy after hot spots | **logical** first; add **application** if imports look tangled; add **physical** if packaging is fog; add **rings** when policy/detail placement is the question; add **class** when type shape is the question |

If the direction is ambiguous after hot spots, ask once.

**Done when:** `views[]` written; each chosen view justified in one line.

### 3. Map

Spawn a sub-agent with [VIEWS.md](VIEWS.md) and [example.json](example.json). Load only the VIEWS.md sections for chosen views. It returns `data.json` in the example's shape for those views only.

**Done when:** `data.json` matches the example for chosen views; every **edge** is from source (**application**), named collaboration (**logical**), or contains/talks-to/deploys-with (**physical**).

### 4. Judge

Walk the principle ids in VIEWS.md for each **chosen** view. Write `findings`. Leave out what the template measures (cycles, fan metrics, hubs), tagged `measured` there.

Strength is one of `strong`, `worth`, `speculative`. A finding that contradicts an ADR shows up only when the pain is real enough to reopen it, and says so in `problem`.

**Done when:** every principle id for each chosen view is a finding or clean; measured findings omitted from your list.

### 5. Render

From the repo root:

```sh
bun ~/.claude/skills/design-views/render.ts data.json
```

Fix any validation error and rerun. Open the printed path (`xdg-open`) and give the user the absolute path.

Then ask: "Which finding do you want to dig into?"

**Done when:** HTML opened and path given; question asked.

### 6. Grill

Once the user picks a finding, call the Skill tool with "grilling". Hold off on proposing code until grilling settles the shape.

As decisions land, call the Skill tool with "domain-modeling": new names go in `GLOSSARY.md`. When the user rejects a finding for a reason a future run would need, offer an ADR.

**Done when:** grilling finished for the picked finding; glossary/ADR updates offered where they stick.
