# Document scoring criteria

For documents people read — proposals, plans, announcements, reports.
Different from the prompt criteria: here the core question is **can the reader decide?**

> Reflects a 2026-08 survey of document research — BLUF (US Army AR 25-50), the Minto
> Pyramid Principle, Amazon's 6-pager and PR-FAQ, plain-language studies, and NN/g
> eye-tracking. Evidence: [docs/research/doc-review-research-2026-08.md](../../docs/research/doc-review-research-2026-08.md)
>
> The premise everything rests on: **79% of readers only scan; 16% read word by word**
> (NN/g). Score on the assumption the document will not be read to the end.

## Dimensions

### 1. Does the conclusion come first? (25 pts)

| Score | State |
|---|---|
| 22–25 | The opening paragraph carries both the purpose ("why this document exists") and the conclusion/ask — and **the title itself** states the conclusion ("Adopting X projects a 30% cost reduction") |
| 15–21 | There is a conclusion, but it's buried mid-document |
| 8–14 | You have to read to the end to find it |
| 0–7 | Even after reading it all, the ask is unclear |

**Credit**: an inverted-pyramid structure where stopping after the first paragraph still
conveys the gist (NN/g).
**Deductions**: narrative build-up that defers the conclusion; a title that is a topic noun
("Report re: X") rather than a finding; background longer than the conclusion.

### 2. Is it backed by evidence? (25 pts)

| Score | State |
|---|---|
| 22–25 | Evidence follows **immediately beneath** each claim (vertical Q&A — the next sentence answers the "why?" the reader just formed), and major claims carry numbers or sources |
| 15–21 | Only the central claim is supported |
| 8–14 | One or two pieces of evidence |
| 0–7 | Claims without support |

**Credits**

- For proposals: **2–3 alternatives considered, with reasons for rejection** — the standard
  requirement for a decision-ready document
- The decision-maker's first objection is already answered inside the document
  (Amazon's PR-FAQ approach)
- Detailed data and tables moved to an appendix, body kept as prose (Amazon 6-pager)

**Deductions**: unquantified intensifiers ("significantly", "substantially") standing in
for numbers; the same evidence repeated under multiple points; a body that is an
undigested table dump.

### 3. Is there a defined reader? (25 pts)

| Score | State |
|---|---|
| 22–25 | Written to the audience's concerns and decision authority; for a decision document, **a single named decision-maker** |
| 15–21 | The audience is inferable but parts of the content miss it |
| 8–14 | No consideration of who reads it |
| 0–7 | Only the author can follow it |

**Credit**: an opening that starts from what the reader already accepts, then turns on what
changed (Minto SCQA).
**Deductions**: jargon and internal acronyms unexplained (in the US this is a legal
requirement — Plain Writing Act 2010); executives, practitioners, and outsiders lumped into
one document; lengthy repetition of background the reader already has.

### 4. Is the next action clear? (25 pts)

| Score | State |
|---|---|
| 22–25 | **Who (by name), what, by when** in one sentence, and the document states what it wants (approval / awareness / input) |
| 15–21 | There's an action, but the owner or the date is missing |
| 8–14 | "Please review" |
| 0–7 | No next action |

**Credit**: the ask appears within the first two lines; the first milestone carries a firm date.
**Deduction**: ownership assigned to a committee or a department name — an undated request
slides into the reader's someday pile.

## Common deduction: sentence burden (up to −10)

You can satisfy all four dimensions and still lose the reader to long, padded sentences.
Comprehension measures **100% at 8-word sentences and under 10% at 43 words.** Rewriting US
Navy memos in plain language cut reading time 17–23%; rewriting a single VA notice dropped
related phone inquiries from over 1,100 to under 200.

- Recurring sprawling sentences packing three ideas each: −5
- The same point restated: −3
- Needless formality and passive voice: −2

## Score bands

| Total | Reading |
|---|---|
| 90–100 | Send it as is |
| 80–89 | One spot to tighten |
| 70–79 | The reader will come back with a question |
| 60–69 | This needs another meeting |
| Under 60 | Faster to rewrite |

## Every document review must

- **Show a rewritten opening paragraph** with the conclusion pulled to the front. One
  paragraph communicates the difference better than any explanation.
- **Confirm the document's purpose first** (persuade / inform / request approval) and judge
  against it. For an announcement, weight action (④) over evidence (②); for a report,
  weight conclusion (①) and evidence (②).
- **Lead with the largest issue.** Typos go unmentioned unless asked for.
- Read the whole document if it's long, but only raise what affects the decision.
