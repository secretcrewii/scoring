# Contributing

Thanks for looking. This project has an unusually low bar for contribution: **the most
valuable changes are markdown edits, not code.**

## The easiest useful contribution: a tip

`rubrics/<lang>/tips.md` is the tip library (`rubrics/en/tips.md`, `rubrics/ko/tips.md`). Every line inside a `<!-- tip:role -->` block is
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
3. **Only touch the language you can write natively.** A tip in awkward Korean or stilted
   English is worse than no tip.

## Changing the scoring criteria

`rubrics/<lang>/{prompt,session,doc}.md` are the single source of truth for scoring.
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
node --test              # 62 tests, Node's built-in runner
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

## Language

The plugin coaches in English and Korean, detected from the user's own prompt
(`scripts/lib/i18n.js`). Each language has its own rubric tree:

```
rubrics/en/{prompt,session,doc,tips}.md
rubrics/ko/{prompt,session,doc,tips}.md
```

**The two are not translations of each other, and shouldn't be.** The criteria genuinely
differ — Korean scores honorific level as an output-format requirement, which has no
English equivalent. Improve one language's rubric without touching the other if that's
what the evidence supports.

Adding a third language means: a rubric directory, a `STRINGS` entry in `i18n.js`, detection
for that script or locale, and heuristic signals in `SIGNALS`. Open an issue first — the
detection strategy is the part worth agreeing on before anyone writes code.

Hook signals live in one shared array per dimension rather than a per-language map, so a
mixed-language prompt collects credit from both. That's deliberate; keep it that way.
