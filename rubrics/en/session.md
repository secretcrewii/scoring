# Session scoring criteria

Reviews a whole working session rather than an individual prompt. What's being scored is
**how the person directs work**, not any single message.

> Reflects the session-level findings from the 2026-08 prompting research survey.
> Evidence: [docs/research/prompting-research-2026-08.md](../../docs/research/prompting-research-2026-08.md)

## Dimensions

### 1. Quality of the opening instruction (25 pts)

How prepared was the session's first prompt? Apply `rubrics/en/prompt.md` directly.

A good opening shortens the entire session — this is 80% of session quality.
Prompts that perform average 21 words; typical first prompts run under 9 (Google).

| Score | State |
|---|---|
| 22–25 | The first prompt alone produced 80% of what was wanted |
| 15–21 | One or two clarifying rounds, then on track |
| 8–14 | Direction only emerged after three or four exchanges |
| 0–7 | What was wanted stayed unsettled into the middle of the session |

**Credit**: opening a large task with "show me the plan first, start once I approve"
(measured +4pp success, OpenAI). Not credited on a task a single sentence describes —
that's ceremony.

### 2. How often work was redone (25 pts)

Times the same thing was re-requested, or earlier work was reverted.

| Score | State |
|---|---|
| 22–25 | Forward the whole way, no rework |
| 15–21 | One course correction |
| 8–14 | Two or three reversals |
| 0–7 | Repeated reversals, no progress |

**Deduction**: weight it heavier when the cause was *ambiguous instruction* rather than
*a model mistake*.

**Credit**: **starting a fresh conversation** after the same correction landed twice —
carrying the lessons into a new first prompt is almost always faster than continuing to
patch (Claude Code's own guidance). Conversely, a session spent patching the same artifact
ten times over is a deduction.

### 3. Specificity of feedback (25 pts)

When the output missed, what was said about what to change and how.

| Score | State |
|---|---|
| 22–25 | Location + action + criteria together ("item 3 has no evidence — attach a source") |
| 15–21 | The problem was located but not what to do about it |
| 8–14 | "Not great", "again" |
| 0–7 | Dissatisfaction expressed with no direction |

**Research note**: a bare "check it again" is ineffective and will change correct answers
into wrong ones (ICLR 2024). "Check only two things: does the total add up, and is the tax
applied?" is the full-marks shape. Partial edits ("halve the second paragraph") over full
rewrites also earn credit.

### 4. Landing (25 pts)

Did the session reach a conclusion, and did it leave something reusable?

| Score | State |
|---|---|
| 22–25 | Reached a conclusion and left a reusable prompt or document |
| 15–21 | Concluded but left nothing behind |
| 8–14 | Trailed off |
| 0–7 | Stopped mid-way; unclear what was even done |

**Research note**: saving and reusing prompts that worked is the real improvement path,
not hunting for magic phrases (Wharton — the same wording swings ±60pp by task). If a good
prompt emerged and the session ended without saving it, recommend `/save-prompt` as the
closing move.

## Every session review must

1. **Name one repeated weakness.** If the same dimension stayed low throughout, that's the
   actual thing to work on.
2. **Point at the single best prompt and say why it worked.** If it's worth reusing,
   recommend saving it with `/save-prompt`.
3. **Propose exactly one thing to try next session.** Offer several and none get tried.
