# ADR Format

ADRs live in `docs/adr/` with sequential names: `0001-slug.md`, `0002-slug.md`. Create the directory lazily, when the first ADR is needed. Scan for the highest existing number and increment.

## Template

```md
# {Short title of the decision}

{1-3 sentences: the context, what was decided, and why.}
```

An ADR can be a single paragraph. The value is recording that a decision was made and why.

## Optional sections (only when they add real value)

- **Status** frontmatter: `proposed | accepted | deprecated | superseded by ADR-NNNN`
- **Considered Options**: when the rejected alternatives are worth remembering
- **Consequences**: when downstream effects are non-obvious

## When to offer one

All three must be true:

1. **Hard to reverse**: changing your mind later has meaningful cost.
2. **Surprising without context**: a future reader will wonder why it was done this way.
3. **A real trade-off**: genuine alternatives existed and one was picked for specific reasons.

Easy to reverse: skip it. Not surprising: skip it. No real alternative: skip it.

## What usually qualifies

- Architectural shape (monorepo, event-sourced write model).
- Integration patterns between contexts.
- Technology choices with lock-in (database, message bus, auth provider, deploy target).
- Boundary and scope decisions, including explicit "no" decisions.
- Deliberate deviations from the obvious path (manual SQL instead of an ORM).
- Constraints not visible in the code (compliance, partner contracts).
- Non-obvious rejected alternatives, so nobody re-proposes them in six months.
