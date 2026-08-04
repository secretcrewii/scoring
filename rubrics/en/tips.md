# Tip library

Tips are pulled from here by dimension. The hook shows one line per `<!-- tip:... -->`
block, **rotating by date** — add a line and it joins the rotation.
The `/score` skill reads the whole file and picks what fits.

> Reflects a 2026-08 survey of prompting research (89 sources). Links are sources.
> Full evidence: [docs/research/prompting-research-2026-08.md](../../docs/research/prompting-research-2026-08.md)

---

<!-- tip:role -->
One line up front — "You are a senior CRM marketer in fashion e-commerce" — sets tone and focus.
No natural role? Name the reader instead — "this is a text going to mothers in their 30s."
For review and calculation, a lens beats a persona — "look at this only for omission risk."
<!-- /tip -->

**More on roles**

- Beat a bare job title with **domain + seniority + audience**. Not "as a marketer" but
  "as a senior CRM marketer in women's fashion e-commerce, writing a KakaoTalk message to
  customers dormant for six months" ([Google](https://blog.google/products-and-platforms/products/workspace/google-gemini-workspace-ai-prompt-tips/))
- **Naming who will read the output** is often more effective than naming a persona.
  Instead of "you are a marketer," try "this is a re-purchase nudge going to mothers in
  their 30s — keep it light" ([Ethan Mollick](https://www.oneusefulthing.org/p/getting-started-with-ai-good-enough))
- A real person's name carries the tone with it: "You are Steve Jobs at Apple. You hate filler."
- For fact-checking or math, **name the lens instead of the persona**. Not "you are a CPA
  with 20 years' experience" but "review this settlement only for VAT-omission risk."
  Personas don't raise accuracy ([EMNLP 2024](https://arxiv.org/abs/2311.10054), [Wharton](https://gail.wharton.upenn.edu/research-and-insights/tech-report-prompt-engineering-is-complicated-and-contingent/))
- Where tone must stay consistent — customer support — define the persona concretely:
  "Answer as our shop's support rep. Apologize once, keep sentences short and warm"
  ([OpenAI](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-1_prompting_guide))
- **"Answer as if you're a beginner" measurably lowers quality.** To lower the register,
  make it an output requirement instead: "explain it without jargon, so a first-time
  seller follows it"

---

<!-- tip:context -->
One sentence on why you need it and who reads it. Then paste the actual material.
Most failed prompts fail by being too short — high-performing ones average 21 words.
Brief it like a smart new hire who knows nothing about your company.
<!-- /tip -->

**More on context**

- **Most failing prompts fail because they're short.** Prompts that perform average 21
  words; typical first prompts run under 9. Instead of "write a product page," add the
  product, the target, and the angle ([Google measurement](https://services.google.com/fh/files/misc/gemini_for_workspace_prompt_guide_october_2024_digital_final.pdf))
- Brief the model like **a smart new hire who knows nothing about your company**. The
  check before you send: could an outsider do the job from this text alone?
  ([Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices))
- **Paste the material before you ask.** "Here are three product pages that performed
  well. Keep this tone for the new one." Don't assume the model knows your assets
- **Long material first, question last.** Up to 30% better responses in Anthropic's own
  testing. If the material is very long, repeat the instruction at both ends
- Give background that is **relevant, not plentiful**. Irrelevant information degrades
  answers to problems the model otherwise solves ([ICML 2023](https://arxiv.org/abs/2302.00093))
- **Attach a *why* and the model generalizes.** "Don't use ellipses" → "this goes out as
  voice guidance, so don't use ellipses." Knowing the reason, it avoids adjacent mistakes
- Anchor the answer: "answer only from the terms of service pasted below; if it's not
  there, say so" ([EACL 2024](https://arxiv.org/abs/2305.13252))
- Keep names and phone numbers out. "A woman in her 30s, two purchases in three months"
  produces the same quality message
- If you already tried a direction and it failed, say so. You won't get it twice

---

<!-- tip:format -->
An example beats ten lines of description. Attach 3–5 outputs you liked.
State length as a number — not "short" but "one paragraph, under 300 characters."
Specify the register too. The model can't guess whether you want formal or casual.
<!-- /tip -->

**More on output format**

- Don't describe the format — **attach 3–5 outputs you liked.** Paste last month's three
  best-performing product names under "Examples:" and say "name 10 new products in this
  style." Keep the examples consistent and pick only good ones; results swing hard on
  example quality and order ([Google](https://ai.google.dev/gemini-api/docs/prompting-strategies))
- Say the shape in a sentence: "compare three competitors in a table with price, shipping,
  and review count, then three bullets of takeaways." Leaving format open is an official
  anti-pattern
- **Length as a number.** "One paragraph, under 300 characters" instead of "short"
  ([OpenAI](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-1_prompting_guide))
- **Specify the register of the output.** Being polite in your prompt has no measured
  effect on quality, but the model cannot guess the register of the result: "formal for
  the press release," "conversational for the social post"
- Separate instructions from material with delimiters — `## Instructions` / `## Reference`
  or `<data>…</data>`. Wrapping long documents in JSON measured notably worse
- Don't force "table only" on complex analysis. **Two steps**: "analyze the trade-offs
  freely first, then summarize the conclusion as a table" ([EMNLP 2024](https://arxiv.org/abs/2408.02442))
- **Ask for variants, not one answer.** "Write the launch message in a premium tone, a
  friendly tone, and a witty tone." Then combine: "keep the opening of #1 and the close of #3"
- To skip the preamble, say so: "no greeting, start directly with the table"

---

<!-- tip:constraint -->
Pair every prohibition with a replacement — "instead of discounts, emphasize quality."
Add one line at the end — "if it's not in the source, say so instead of guessing."
Five constraints is plenty. A long rule list buries the rules that matter.
<!-- /tip -->

**More on constraints**

- One line at the end: **"If you're not certain or it isn't in the material, say 'not
  enough information' rather than guessing."** This alone sharply reduces confident-sounding
  fabrication. Mandatory for policy, legal, and numeric questions
  ([Anthropic](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations))
- **Don't list prohibitions alone — pair each with a replacement.** "No jargon" → "explain
  it with an analogy a ten-year-old would follow." Models systematically ignore "don't"
  ([OpenAI](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api))
- **More constraints is not safer.** Keep about five. Long rule lists bury the important
  ones, and current Claude over-reacts to "MUST!! NEVER!!"
  ([Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))
- Check your instructions don't collide before sending. If a collision is unavoidable,
  state priority: "if the two rules conflict, stock status wins"
- Decide exception handling up front: "mark numbers not in the source as [needs checking];
  if a refund calculation is uncertain, ask me rather than answering"
- **Bring criteria to a review request.** "Check only two things: does the total add up,
  and is the 10% tax applied?" A bare "check it again" will change correct answers into
  wrong ones ([ICLR 2024](https://arxiv.org/abs/2310.01798))
- For long documents, **require quotation**: "quote the sentences you're relying on
  verbatim first, then judge only from those quotes"
- Build a reusable list of legally prohibited phrasings for your category once — it applies
  to every product afterward

---

## Habits that cut across all four

- **Plan before doing on large tasks.** "Don't start yet — show me the plan, and begin
  once I approve." Measured +4pp success on its own, ~20% combined with related
  instructions ([OpenAI](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide)).
  Skip it for anything a single sentence describes
- **Not sure what you want? Get interviewed.** "Before you start, ask me the questions you
  need answered. Skip the obvious ones and dig into what I've missed." But let easily
  reversible work (a draft) proceed on reasonable assumptions — force confirmation only
  where reversal is hard: sending, paying, deleting
- **Chain complex work.** ① classify complaints across 500 reviews → ② propose fixes for
  the top three → ③ write the customer notice. Checking each step shows you where it went wrong
- **Treat the first output as an 80% draft.** "Cut the second paragraph in half and drop
  the pricing mention" beats starting over
- **If you've made the same correction three times, abandon the conversation.** Start a
  fresh one with those lessons built into the first prompt — almost always faster
- **Ask the model to fix your prompt.** "This prompt didn't get me what I wanted. I wanted:
  (…). Propose a revised version and point out any contradictory instructions"
- **Save prompts that worked.** Group them by recurring job — product pages, support
  replies, weekly reports. Quality stabilizes and the team can share them
- **There is no magic phrase.** The same wording helps or hurts depending on the task
  (±60pp swings, [Wharton](https://gail.wharton.upenn.edu/research-and-insights/tech-report-prompt-engineering-is-complicated-and-contingent/)).
  Pick one recurring job, compare two or three prompt versions on real cases, and make the
  winner your standard
- **For decisions that matter, ask in 2–3 fresh conversations and trust only the overlap**
- **One job per prompt.** Ask for three things and you get three mediocre things

## What the research overturned

Don't spend effort on techniques that don't pay. These measure as ineffective or conditional.

| Common belief | What measurement shows |
|---|---|
| "Think step by step" (CoT) is universal | +12–14pp on math and logic only. On current reasoning models, no gain and 20–80% more latency; some tasks drop |
| Emotional appeals ("this is important"), offered tips ("$100 for a good answer") | No average effect. Only ±35% task-level noise |
| Being polite gets better answers | No relation to quality (measured across ~19,800 runs). The **output's** register still matters |
| Expert roles make answers more accurate | No effect on accuracy (two independent large studies). Still effective for tone, perspective, and register |
| More constraints is safer | Long rule lists bury the important rules; emphasis inflation triggers over-compliance |
| "Don't do X" is enough to prevent X | Models systematically ignore negations. Pair prohibitions with replacement actions |
