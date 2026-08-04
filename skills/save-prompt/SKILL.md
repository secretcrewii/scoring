---
name: save-prompt
description: |
  방금 만든(또는 붙여넣은) 좋은 프롬프트를 서랍에 저장합니다. 다음에 /prompts로 꺼내 재사용합니다.
  Triggers: save-prompt, 프롬프트 저장, 이거 저장해줘, 서랍에 넣어줘, 프롬프트 보관.
argument-hint: "[이름] — 비우면 용도에서 자동 생성"
user-invocable: true
allowed-tools: Read, Write, Glob
---

# 프롬프트 저장

잘 작동한 프롬프트를 저장해 팀의 자산으로 만듭니다. 연구 결론 그대로입니다 —
"만능 문구는 없다. 방향은 마법 문구 수집이 아니라 **반복 업무용 표준 프롬프트 저장**."

## Language / 언어

**Detect the language of the target text (the prompt, session, or document being reviewed)
and respond entirely in that language.** Korean input gets a Korean review; English input
gets an English review. When mixed, follow whichever language the user writes in.

The output format shown below is written in Korean. When responding in English, translate
the labels and headings but keep the structure identical.

## 절차

1. **저장 대상 확보** — 우선순위대로:
   - 사용자가 텍스트를 붙여넣었으면 그것
   - 직전 `/score` 출력에 "이렇게 쓰시면 90점대입니다" 개선판이 있으면 그것
   - 직전 사용자 프롬프트가 고득점(80+)이었으면 그것
   - 없으면 "어떤 프롬프트를 저장할까요?"라고 한 줄로 묻고 멈춥니다.

2. **이름 정하기** — 인자로 이름이 왔으면 그것. 없으면 용도에서 짧은 한글 이름을
   만들어 제안합니다 (예: `상세페이지-신상품`, `CS-환불응대`). 파일명에 못 쓰는 문자는 `-`로.

3. **저장** — `~/.claude/scoring/prompts/<이름>.md` 에 Write로 저장합니다.
   (Windows에서는 `C:\Users\<사용자명>\.claude\scoring\prompts\` — 플러그인 폴더 밖이라
   플러그인을 업데이트해도 살아남습니다.)

   ```md
   ---
   name: 상세페이지-신상품
   use: 신상품 상세페이지 초안 작성
   saved: 2026-08-03
   ---

   (프롬프트 전문 — 수정 없이 그대로)
   ```

   같은 이름의 파일이 이미 있으면 먼저 Read로 내용을 보여주고 덮어쓸지 확인받습니다.

4. **확인** — 저장 후 한 줄로 알려줍니다:
   "저장했습니다: `상세페이지-신상품` — 꺼낼 때는 `/prompts 상세페이지`"

## 규칙

- **프롬프트 원문을 고치지 않고 그대로 저장합니다.** 저장하며 "개선"하지 마세요.
- 프롬프트 안의 특정 상품명·날짜처럼 매번 바뀔 부분이 보이면, 저장 전에
  `[상품명]`, `[날짜]` 꼴로 바꿀지 **한 번만** 물어봅니다. 싫다면 그대로 저장합니다.
- use(용도)는 한 줄로 명확하게 — `/prompts`가 목록에서 보여주는 설명입니다.
