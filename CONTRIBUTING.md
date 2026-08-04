# Contributing

Thanks for looking. This project has an unusually low bar for contribution: **the most
valuable changes are markdown edits, not code.**

## The easiest useful contribution: a tip

`rubrics/tips.md` is the tip library. Every line inside a `<!-- tip:role -->` block is
shown to users on rotation. Adding a good line is a complete, welcome contribution.

```markdown
<!-- tip:format -->
Say the length as a number. "Short" isn't a format; "one paragraph, under 300 characters" is.
<!-- /tip -->
```

Two rules for tips:

1. **Concrete enough to act on immediately.** Include the phrase to type, not the concept.
   "Be specific about format" is useless. `"Compare in a 3-column table: price, shipping, review count"` is a tip.
2. **Cite a source if you're claiming an effect.** We removed several popular techniques
   (chain-of-thought as a universal, emotional appeals, politeness) because measurement
   says they don't work. Don't reintroduce folklore. See the
   "what the research overturned" table at the bottom of `tips.md`.

## Changing the scoring criteria

`rubrics/prompt.md`, `session.md`, and `doc.md` are the single source of truth for scoring.
`/score` reads them at runtime; the hook only pulls the threshold and weights from the
JSON block at the top of `prompt.md`.

If you change a scoring band, say **why** in the PR, and prefer official vendor guidance or
measured studies over intuition. Existing evidence lives in `docs/research/`.

## Changing the hook heuristics

`scripts/lib/heuristics.js` is a pure function: string in, score object out. No file I/O,
no globals, no output. That's deliberate — it makes the scoring sense testable in isolation.

**If you touch `SIGNALS` or the conversation detection, add a fixture.**
`tests/heuristics.test.js` holds real messages that previously scored wrong. That array is
the regression barrier; it's the reason the same false positive doesn't come back.

The governing bias for conversation detection: **when in doubt, treat it as conversation.**
A missed coaching moment is invisible. A spurious note is what makes people uninstall.

## Constraints that are not negotiable

These are design constraints, not preferences. A PR that breaks one won't be merged.

| Constraint | Why |
|---|---|
| **Zero external dependencies** | Must run on a non-developer's machine with no `npm install`. CI enforces this. |
| **The hook always exits 0** | A scoring tool must never block someone's actual work. Wrap everything; swallow everything. |
| **The hook never calls an LLM** | ~50ms and no token cost is the reason people leave it on. Deep judgment belongs to `/score`. |
| **Prompt text is never stored** | The ledger keeps scores and length only. Prompts contain business-confidential material. |

## Running things locally

```bash
node --test              # 56 tests, Node's built-in runner
claude plugin validate . # same check the marketplace review runs
```

To try your changes in a live session, register the folder itself as a marketplace — it
loads in place rather than being copied, so rubric edits apply immediately:

```
/plugin marketplace add /path/to/scoring
/plugin install scoring@scoring
```

Hook and skill changes need a Claude Code restart (or `/reload-plugins`). Rubric and tip
changes don't.

## A note on language

The plugin currently coaches in Korean, and the rubrics encode Korean-specific judgment
(honorific level as an output-format requirement, for instance). English support is
wanted but not yet built — if that's what you came for, open an issue before writing code
so we can agree on the shape first.
