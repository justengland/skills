---
name: grill-n-chill
description: Relentless design interview run as browser flash cards (multiple choice, true/false, essay) with history and editable answers, while sharpening the project glossary (CONTEXT.md) and recording ADRs. Use when the user wants to be grilled on a plan or design, wants to stress-test an idea, or says "grill-n-chill".
---

# Grill-n-Chill

Based on `grilling` and `grill-with-docs` from mattpocock/skills. Same relentless interview and the same living docs (CONTEXT.md glossary, sparse ADRs), but the questions arrive as flash cards in the user's browser instead of walls of chat text. The user can flip a card to peek at your recommendation, go back through history, and change earlier answers.

## Ground rules (inherited from grilling)

- Walk down each branch of the decision tree and resolve dependencies one decision at a time. Never put two decisions on one card.
- Every card carries your recommended answer and the reason for it. The user may peek at it (flip) or accept it.
- If a fact can be found by looking (code, files, docs, tools), look it up instead of asking. Cards are for decisions, which belong to the user.
- Do not act on the result (no implementation, no file changes beyond CONTEXT.md and ADRs) until the user confirms a shared understanding.

## Starting up

1. Read `CONTEXT-MAP.md` / `CONTEXT.md` and `docs/adr/` if they exist, and skim the code relevant to the topic, before the first card.
2. Start the card server from the project root (the directory being grilled):

   ```bash
   node <skill-dir>/scripts/gnc.mjs start --title "Short topic title"
   ```

   It prints a URL (default `http://localhost:4711`). Tell the user to open it. State lives in `.grill-n-chill/` in the project root; add it to `.gitignore` if the repo is tracked.
3. If the browser cannot reach the machine running you (remote sandbox), add `--host 0.0.0.0` and tell the user the URL needs forwarding. If that is not possible, fall back to plain chat questions, same rules.

## The loop

Post one card and block until it is answered:

```bash
node <skill-dir>/scripts/gnc.mjs ask - <<'JSON'
{ "type": "mc", "topic": "Cancellation", "question": "...", "options": [...], "recommended": "b", "why": "..." }
JSON
```

`ask` prints JSON: `{ card, answer, revisions }`. Read `revisions` every time (see below), then pick the next question from the answer.

### Card types

| type | use for | fields |
|---|---|---|
| `mc` | default. 2-4 options labeled a, b, c, d. The UI always adds "Other" and "Not sure". | `options: [{key, label, detail?}]`, `multi?: true` to allow several |
| `tf` | testing a single claim you believe the user holds, or a crisp yes/no. | `recommended: true \| false` |
| `essay` | naming things, open scenarios, "walk me through...", anything where options would lead the witness. | `recommended` is a suggested text answer |

Common fields: `question` (required, one sentence if possible), `topic` (short eyebrow label), `context` (optional evidence: a code finding, glossary entry, or scenario; plain text, backticks allowed), `recommended`, `why` (shown on the back of the card).

Answer shape: `value` is the option key (`"b"`), an array of keys for `multi`, `"true"`/`"false"` for `tf`, the text for `essay`, or `"other"` (with `text`) / `"unsure"` for any `mc`. `note` is an optional comment the user attached.

When the user answers "unsure", treat your recommendation as a proposal, say so in the next card's context, and confirm it with a `tf` card if it matters.

### Handling history and changed answers

The user can go back and change any answer. When they do, the next `ask` (or `peek`) returns it in `revisions`: `{ cardId, question, from, to, note }`.

- Treat the new answer as current truth. Update CONTEXT.md or ADRs if the old answer had already been written down there.
- Decide which later cards depended on it. Withdraw those with `gnc.mjs retire <cardId>` (the UI marks them stale) and re-ask the ones that still matter.
- Between cards you can call `gnc.mjs peek` to see pending revisions without posting anything.

## Sharpening the domain model (inherited from domain-modeling)

Do this while grilling, not after:

- **Challenge against the glossary.** When the user's wording conflicts with CONTEXT.md, post a card about it ("Glossary says 'cancellation' means X, you seem to mean Y").
- **Sharpen fuzzy language.** Overloaded or vague terms get an `essay` or `mc` card proposing one canonical term.
- **Stress-test with scenarios.** Invent concrete edge cases as cards: `tf` for "in this scenario, X happens, correct?" and `mc` for what should happen.
- **Cross-reference with code.** When an answer contradicts what the code does, put the contradiction in `context` and ask which is right.
- **Update CONTEXT.md inline** the moment a term is resolved. Format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md). It is a glossary and nothing else: no implementation details.
- **Offer ADRs sparingly**, only when the decision is hard to reverse, surprising without context, and a real trade-off. Offer it as a `tf` card ("Record this as an ADR?"). Format in [ADR-FORMAT.md](./ADR-FORMAT.md).
- Create files lazily: the first CONTEXT.md when the first term resolves, `docs/adr/` when the first ADR is needed.

## Finishing

When the branches are exhausted, post one final `tf` card: "Do we have a shared understanding?" with a short recap in `context`. Only on "true":

```bash
node <skill-dir>/scripts/gnc.mjs finish
node <skill-dir>/scripts/gnc.mjs export   # prints the Q&A transcript as markdown
```

Give the user a short summary in chat, point to the docs you wrote, then wait for their go-ahead before acting on any of it. If they say false, ask what is still unclear and keep going.

## CLI reference

| command | does |
|---|---|
| `start [--title T] [--port N] [--host H]` | start (or reuse) the server, print the URL |
| `ask <file\|->` | post a card, block until answered, print answer plus revisions |
| `peek` | print pending revisions without posting |
| `retire <cardId>` | mark a card stale after an upstream answer changed |
| `state` | dump the full session JSON |
| `export` | markdown transcript of the session |
| `finish` | mark the session done |
| `stop` | stop the server |

`ask` waits up to an hour by default (`--max-minutes N`). If it times out, nothing is lost: run `ask` again with the same card `id` and it reattaches to the open card.
