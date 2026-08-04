# Prompt scoring criteria

This file is the **single source of truth** for scoring. To change how prompts are judged,
edit this file. You don't need to touch any code.

> Updated from a 2026-08 survey of prompting research — official guidance from three
> vendors, measured academic studies, and practitioner patterns (89 sources).
> Evidence and citations: [docs/research/prompting-research-2026-08.md](../../docs/research/prompting-research-2026-08.md)
>
> Worth knowing: these four dimensions map almost exactly onto Google's official
> PTCF framework (Persona · Task · Context · Format).

## Settings

Change the numbers below and the hook's behavior changes.

- `threshold` — a coaching note appears only below this score. Raise it to get more notes.
- `weights` — points per dimension. Keep the total at 100.

```json
{
  "threshold": 75,
  "weights": {
    "role": 25,
    "context": 25,
    "format": 25,
    "constraint": 25
  }
}
```

## Dimensions

### 1. Role (25 pts)

Did the prompt say **who should answer, from what perspective**?

**Scoring philosophy**: a role is a **tone, perspective, and register device — not an
accuracy device.** Large measured studies (EMNLP 2024; Wharton Report 4) found expert
personas do not improve factual accuracy. So score not "is there a role?" but "is the
role specific enough to fix tone, audience, and viewpoint?"

| Score | State |
|---|---|
| 22–25 | Domain + seniority + audience ("As a senior CRM marketer in women's fashion e-commerce, writing to lapsed customers") — **or** no role at all but an equally specific audience/purpose ("This is a re-purchase nudge going to mothers in their 30s") |
| 15–21 | A role, but generic ("You're a marketer") |
| 8–14 | Only a field is named ("something marketing-related") |
| 0–7 | No role, no audience, no perspective |

**Deductions**

- The role has nothing to do with the task (asking for a code review from "a poet")
- A low-knowledge persona ("answer as if you're a beginner") — measurably *lowers*
  answer quality. If the intent was to simplify the output, redirect to an output
  requirement ("explain it so a first-time seller understands, no jargon")
- Several stacked roles that blur the focus

**Full marks by exception**: for fact-checking or calculation, naming the review lens
instead of a persona ("review this settlement only for VAT-omission risk"). Measurement
says this is the safer use.

### 2. Context (25 pts)

Did the prompt say **why** this is needed, **who** will read it, and supply **the material**?

**Scoring philosophy**: context is scored on **relevance, not volume.** Irrelevant
background measurably degrades answers on problems the model otherwise solves (ICML 2023).

| Score | State |
|---|---|
| 22–25 | Purpose + audience + the actual source material, with nothing irrelevant |
| 15–21 | Purpose is there, but audience or material is missing |
| 8–14 | About one line of background |
| 0–7 | Instructions with no context |

**Credits**

- The instruction carries a *why* — "no ellipses, since this goes out as voice guidance"
  is the officially recommended shape (Anthropic)
- Long material placed first, question and instructions last (measured up to 30% better
  responses in Anthropic's testing)
- Answers anchored to a source — "answer only from the terms below" (measurably reduces
  fabrication)
- Actual material supplied rather than assumed — existing copy, the policy text, the data

**Deductions**

- Irrelevant background piled on (company history and so on)
- Internal acronyms or proper nouns used without explanation
- Unresolvable references — "that thing", "the one from last time"
- Personal data in the raw (names, phone numbers) — redirect to a segment description
  ("a female customer in her 30s, two purchases in the last three months")

### 3. Output format (25 pts)

Did the prompt say **what shape the answer should take**? Four slots:
**structure + length (a number) + tone/register + examples**.

**Scoring philosophy**: the strongest format control is **an example, not a description**
(all three vendors agree). Length stated as a number beats "short" or "brief".

| Score | State |
|---|---|
| 22–25 | A good example attached, **or** structure + numeric length + tone all specified |
| 15–21 | Only one or two of structure / length / tone |
| 8–14 | Only vague words — "briefly", "in detail" |
| 0–7 | No format instruction |

**Deductions**

- Conflicting format instructions ("as a table, and also as prose")
- A length that is unrealistic for the task

**Not deducted** (raise as a tip instead)

- No delimiter tags (`<data>`, `##`) in a short prompt — unnecessary on current models
- A strict format imposed on complex analysis from the start — suggest the two-step
  pattern ("analyze freely first, then summarize the conclusion as a table")

### 4. Constraints (25 pts)

Did the prompt **draw the lines**? Scored on **precision, not count.**

**Scoring philosophy**: about five core constraints is ideal. The longer the rule list,
the more the important rules get buried, and models systematically ignore negations
(negation blindness).

| Score | State |
|---|---|
| 22–25 | Precise constraints: prohibition paired with a replacement action ("instead of discounts, emphasize quality") + exception handling ("mark anything not in the source as [needs checking]") or an out ("say you don't know if you don't") |
| 15–21 | One or two working constraints (bare prohibitions land here) |
| 8–14 | Constraints only implied |
| 0–7 | None |

**Credits**

- An escape hatch — "say you don't know rather than guessing." Anthropic's first-line
  strategy for reducing hallucination
- Priority stated when instructions conflict ("if the two rules collide, stock status wins")
- Self-check with stated criteria ("check your output against: under 30 chars, no banned
  words — and show the check")

**Deductions**

- Mutually contradictory instructions — measurably worse on newer models (OpenAI's own warning)
- Emphasis inflation ("MUST!! NEVER!!") — triggers over-compliance on current models (Anthropic)
- So many constraints that there's no room left to answer

## Common deduction: task clarity (up to −15)

The four dimensions are a checklist of **what to add**. But if there is **no actual task**,
none of it helps.

> "You're a senior marketer. Audience is 30-somethings. Table, 3 rows. Polite tone.
> **Now do something.**"
> — four dimensions full marks, impossible to execute.

This isn't a fifth 25-point dimension. It's a property of the whole prompt rather than an
element to add, so it's a deduction. It occupies the T (Task) slot of Google's PTCF.

| Situation | Deduction |
|---|---|
| Unclear what is wanted — a verb with a vague object ("organize it" with no *it*; "that thing", "whatever you think", "something appropriate") | −10 |
| Two or more unrelated jobs in one prompt — one prompt, one job | −5 |

**If the total lands under 60 after deduction**, lead with *"let's settle what you're
asking for in one sentence"* rather than dimension-by-dimension advice. Role and format
notes are useless at that point.

**Not deducted**: a task that is large but clear ("build me a messenger app" is broad in
scope, but what's wanted is unambiguous) — that belongs to the context dimension.

> The hook (automatic scoring) does not compute this deduction. A vague object is beyond
> what a regex can judge, so only `/score` applies it. Hook scores and `/score` scores can
> therefore differ.

## Score bands

| Total | Reading |
|---|---|
| 90–100 | Worth reusing as-is. Save it as a team asset |
| 80–89 | Good. One dimension away from the 90s |
| 70–79 | Usable, but the model will ask a clarifying question |
| 60–69 | You'll likely re-run it after seeing the result |
| Under 60 | Closer to a question than an instruction. Faster to rewrite |

## How to deliver a score

- **Say what went right first.** Even a 60 has something working. Find it and name it.
- **Give one thing to fix.** Flagging all four dimensions gets none of them fixed.
- **Show the rewritten prompt in full.** An explanation alone makes the reader translate
  advice back into words.
- **The most common failure is not a missing technique — it's a prompt that's too short.**
  Prompts that perform average 21 words; typical first prompts run under 9 (Google's
  measurement). "Add two or three more sentences" beats any clever technique.
- **Only recommend what has been measured.** Emotional appeals ("this is important to
  me"), offered tips, and polite phrasing measure as no-ops — neither credit nor penalty.
- A score is not a verdict. It's **a direction for the next step.**
