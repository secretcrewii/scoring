---
name: score-session
description: |
  이번 작업 세션 전체를 돌아보며 종합 점수와 반복된 약점, 다음에 시도할 것 한 가지를 냅니다.
  Triggers: score-session, 세션 점수, 오늘 어땠어, 세션 리뷰, 이번 작업 평가, 종합 평가.
argument-hint: ""
user-invocable: true
allowed-tools: Read, Bash
---

# 세션 종합 리뷰

개별 프롬프트가 아니라 **일을 시키는 방식**을 봅니다.

## Language / 언어

**Detect the language of the target text (the prompt, session, or document being reviewed)
and respond entirely in that language.** Korean input gets a Korean review; English input
gets an English review. When mixed, follow whichever language the user writes in.

Load the matching rubric: `${CLAUDE_PLUGIN_ROOT}/rubrics/<lang>/<name>.md` where `<lang>`
is `ko` or `en`. If that path does not exist, fall back to `${CLAUDE_PLUGIN_ROOT}/rubrics/<name>.md`.

The output format shown below is written in Korean. When responding in English, translate
the labels and headings but keep the structure identical.

## 절차

1. **기준 읽기** — `${CLAUDE_PLUGIN_ROOT}/rubrics/<lang>/session.md`를 Read로 읽습니다.

2. **세션 훑기** — 현재 대화에서 사용자가 보낸 발화들을 처음부터 되짚습니다.
   - 첫 지시가 얼마나 준비되어 있었는가
   - 몇 번 되돌아갔는가, 그 원인이 지시의 모호함인가 AI의 실수인가
   - 결과가 아쉬울 때 어떻게 피드백했는가
   - 결론에 도달했는가, 재사용할 것을 남겼는가

3. **채점** — session.md의 네 항목에 각 25점.
   각 점수마다 **세션에서 실제로 있었던 장면을 인용해** 근거를 답니다.

4. **출력** — 아래 형식.

5. **기록** —
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/ledger-write.js" --kind session --source skill --total <총점>
   ```
   실패는 무시하고 진행합니다.

## 출력 형식

```
이번 세션 76점
──────────────────────────────
첫 지시의 완성도  ██████░░░░  16/25
되돌아간 횟수     ████████░░  20/25
피드백의 구체성   ████████░░  20/25
마무리            ████████░░  20/25

가장 좋았던 순간
  "표 3행, 각 행 40자 이내로" — 여기서 형식을 못 박으신 덕에
  그 뒤로 다시 시킬 일이 없었습니다.

반복된 약점
  첫 지시에 목적이 빠져 있어서 초반 세 번을 방향 맞추는 데 썼습니다.
  세션 후반에는 잘 하셨는데, 그걸 처음부터 하셨다면 세션이 절반으로 줄었습니다.

다음 세션에서 한 가지만
  첫 프롬프트에 "이 결과를 어디에 쓸 건지" 한 문장을 넣어보세요.
```

## 규칙

- **가장 좋았던 순간을 먼저**, 실제 문구를 인용해서 짚습니다.
- **반복된 약점은 하나만.** 세션 내내 같은 항목이 낮았다면 그게 진짜 개선 지점입니다.
- **다음에 할 것은 딱 한 가지.** 여러 개 주면 하나도 안 합니다.
- 세션이 너무 짧아(사용자 발화 3개 미만) 평가가 무의미하면, 점수 대신
  "아직 평가할 만큼 쌓이지 않았습니다"라고 한 줄로 말하고 멈춥니다.
- 존댓말, 간결하게. 훈계하지 않습니다.
