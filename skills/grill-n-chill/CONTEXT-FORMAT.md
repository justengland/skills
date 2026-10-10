# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentences: what this context is and why it exists.}

## Language

**Order**:
{One or two sentence description of the term.}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## Rules

- **Be opinionated.** When several words name one concept, pick the best and list the rest under `_Avoid_`.
- **Keep definitions tight.** One or two sentences. Define what it IS, not what it does.
- **Only project-specific terms.** General programming concepts (timeouts, error types, utility patterns) do not belong.
- **Group under subheadings** when clusters emerge; a flat list is fine for one cohesive area.
- **No implementation details.** It is a glossary, not a spec or scratch pad.

## Single vs multi-context repos

- One `CONTEXT.md` at the repo root for most repos.
- If a `CONTEXT-MAP.md` exists at the root, the repo has several contexts. The map lists each context, where it lives, and how contexts relate:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md): receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md): generates invoices and processes payments

## Relationships

- **Ordering -> Billing**: Ordering emits `OrderPlaced`; Billing consumes it to generate invoices
```

When several contexts exist, infer which one the topic belongs to; if unclear, ask with a card.
