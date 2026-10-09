# Clean Architecture principles

Reference for the `clean-code` map and judge steps. Git history is evidence: `git log --follow`, `git log -L`, and `git log --stat` show which actors edit a file (SRP), which ladders churn (OCP), and what moves in lockstep (CCP). `render.ts` also measures churn and co-change per component on its own. Each principle has its `id` (used in `findings[].principle`), the rule, and the **smell** to hunt for in code. Principles marked *measured* are computed by `report.html` from components and edges, so only write a finding for them when the numbers miss something.

## Rings

Place each component by what it is:

| ring | name | holds |
|---|---|---|
| 0 | Entities | enterprise rules, domain types, invariants that outlive any app |
| 1 | Use cases | application rules: one per thing the system does for an actor |
| 2 | Interface adapters | controllers, presenters, gateways, repositories that translate between use cases and the outside |
| 3 | Frameworks & drivers | web server, DB driver, UI, CLI, SDK clients, config, `main` |

Adapters may import drivers (ring 2 → 3): SQL and HTTP clients belong in the adapter ring. The template only flags outward edges that leave ring 0 or 1.

If a component holds both policy and detail, place it by its policy and write a finding about the mix.

## SOLID: inside a component

- **SRP**: one module answers to one actor. *Smell:* a file whose functions change for different stakeholders (pricing + persistence + formatting); git log shows unrelated features touching it.
- **OCP**: extend by adding code, not editing it. *Smell:* a growing `switch`/`if` ladder on a kind or type that every new feature edits. Only report it where the ladder actually churns.
- **LSP**: implementations honour the contract. *Smell:* an implementation that throws "not implemented", returns null where the type promises a value, or callers that check `instanceof` / `kind === "x"` to work around one implementation.
- **ISP**: clients depend only on what they use. *Smell:* a wide interface or options bag where each caller touches a small slice; a test double stubbing many methods it never calls.
- **DIP**: policy owns the interface, the detail implements it. *Smell:* a use case constructing or importing a concrete DB / HTTP / filesystem client.

## Component cohesion: what belongs together

- **REP**: the granule of reuse is the granule of release. *Smell:* a `utils/` or `common/` grab-bag that everything imports for one function each.
- **CCP** *(measured from history: components that change together with no import between them)*: things that change together live together. *Smell:* one feature change touches 4+ components in lockstep; `git log --stat` on a recent feature shows the spread.
- **CRP**: users of a component use all of it. *Smell:* importing one function drags in heavy, unrelated dependencies.

## Component coupling: how components relate

- **ADP** *(measured: cycles)*: no cycles in the component graph.
- **SDP** *(measured)*: depend toward stability. I = fan-out / (fan-in + fan-out); an edge into a component with higher I is an inversion.
- **SAP** *(measured: Main Sequence)*: a component should be as abstract as it is stable. D = |A + I − 1|. Low A + low I is the zone of pain (rigid and depended on); high A + high I is the zone of uselessness.

## Boundaries

- **DEP**, the Dependency Rule *(measured: outward edges)*: source dependencies point inward only. Write a finding when a type crosses the boundary in disguise (a DB row or HTTP request object passed straight into a use case) even though no import points outward.
- **SCREAM**, Screaming Architecture: top-level folders name the business (`orders/`, `billing/`), not the tools (`controllers/`, `models/`). The `folders` strip shows it; write a finding when the technical names hide the use cases.
- **DETAILS**: the UI and DB are details. *Smell:* domain types shaped by the schema or ORM, business rules in SQL or components, use cases you cannot run without a live database.

## Exhaustiveness

The judge step is done when all fourteen ids above have been checked. A clean principle gets no finding, but it still has to be checked.
