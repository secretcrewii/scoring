# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [0.4.0] — 2026-08-03

Rebuilt conversation detection from real-world false positives, and closed the one
genuine gap in the four-dimension rubric.

### Added

- **Task clarity deduction** (up to −15) in the prompt rubric. Filling all four
  dimensions doesn't help if there is no actual task ("You're a marketer. Table, 3 rows.
  Polite tone. *Now do something.*"). Kept as a deduction rather than a fifth dimension
  so the 100-point structure and ledger history stay compatible. `/score` only —
  vague object detection is out of reach for a regex, and the rubric says so.
- 12 real-session regression fixtures (7 conversational, 5 work briefs).

### Changed

- Conversation detection now also skips: question mark without a request marker
  ("is it on the marketplace?" vs "can you put it in a table?"), deliberative phrasing
  anywhere in the message, and reiteration endings ("…like that, I said").
- Documented the governing bias: **when in doubt, treat it as conversation.** A missed
  coaching moment is invisible; a spurious note is what makes people uninstall.

## [0.3.0] — 2026-08-03

### Added

- `/save-prompt` and `/prompts` — a prompt drawer. Save what worked, retrieve it later.
  Research says the real improvement path is reusing standard prompts for recurring work,
  not hunting for magic phrases.
- Cooldown for coaching notes (default 10 min, `config.cooldownMinutes`).
- Once-a-day session-start reminder (`config.dailyNudge`).
- Tip rotation — tip blocks cycle by date so the note doesn't become wallpaper.
- `scripts/lib/state.js` for hook state.

### Changed

- Conversation detection introduced — sentiment, opinion questions, and deliberative
  messages are no longer scored.
- Hook now credits purpose/audience statements ("a text for 30-something customers")
  as a substitute for an explicit role.
- **Document rubric rebuilt** from BLUF (US Army AR 25-50), Minto Pyramid, Amazon
  6-pager/PR-FAQ, and plain-language studies. Added a sentence-burden deduction (−10):
  comprehension measures 100% at 8-word sentences and under 10% at 43 words.
- Session rubric updated with session-level findings (criteria-bearing review requests,
  starting a fresh conversation after two repeats, plan-first).

## [0.2.0] — 2026-08-03

### Added

- `/explain` — restates the assistant's last report in plain language for
  non-technical readers, so they don't have to go ask a different AI mid-task.
- `docs/research/prompting-research-2026-08.md` — sources and evidence.

### Changed

- **Prompt rubric rebuilt** from 89 sources (Anthropic/OpenAI/Google official guidance,
  measured academic studies, practitioner patterns). Notable reversals:
  - Role is a *tone/perspective* device, not an accuracy device (EMNLP 2024, Wharton).
    A prompt that names its audience instead of a persona now scores just as well.
  - Context is scored on relevance, not volume — irrelevant background measurably hurts.
  - Examples outrank format descriptions.
  - Constraints are scored on precision, not count. Prohibitions need a paired
    alternative action, because models systematically ignore negations.
- `tips.md` now cites sources and includes a "what the research overturned" table
  (chain-of-thought is conditional; emotional appeals, tipping, and politeness measure
  as no-ops; prefill is unsupported).

### Fixed

- Short task instructions were silently skipped by the length filter — the shortest
  instructions are exactly when coaching matters.
- Team descriptions ("our staff includes a designer, a marketer") were counted as role
  assignment.
- Scope limits ("only for the designer's work") were not counted as constraints.

## [0.1.0] — 2026-08-03

Initial release.

- `UserPromptSubmit` hook scores prompts with deterministic heuristics (~50ms, no LLM
  call, no token cost) and stays silent above the threshold.
- `/score`, `/score-session`, `/score-doc`, `/score-report`.
- Rubrics live in markdown, logic in JS — change the criteria without touching code.
- Zero external dependencies; tests via Node's built-in runner.
- Prompt text is never stored. Only scores and length go to the ledger.
