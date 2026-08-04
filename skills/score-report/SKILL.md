---
name: score-report
description: |
  쌓인 채점 기록을 집계해 최근 추세, 항목별 평균, 가장 자주 무너지는 항목을 보여줍니다.
  Triggers: score-report, 점수 리포트, 추세, 늘고 있어, 그동안 어땠어, 통계, 점수 기록.
argument-hint: ""
user-invocable: true
allowed-tools: Bash
---

# 점수 추세 리포트

쌓인 기록에서 **패턴**을 읽습니다. 개별 점수가 아니라 방향을 봅니다.

## Language / 언어

**Detect the language of the target text (the prompt, session, or document being reviewed)
and respond entirely in that language.** Korean input gets a Korean review; English input
gets an English review. When mixed, follow whichever language the user writes in.

The output format shown below is written in Korean. When responding in English, translate
the labels and headings but keep the structure identical.

## 절차

1. **집계 실행** — Bash로 다음을 실행합니다.
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/report.js"
   ```
   JSON이 나옵니다. `hook`(자동 채점)과 `skill`(정독 채점)이 분리되어 있습니다.
   **두 값을 섞지 마세요.** 채점 방식이 달라서 절대값을 비교할 수 없습니다.

2. **해석** — 숫자를 나열하지 말고 읽어냅니다.
   - `trend.delta`가 양수면 나아지고 있는 것입니다. 얼마나, 어느 항목에서인지 짚습니다.
   - `weakest`는 가장 자주 최저점을 받은 항목입니다. 여기가 진짜 개선 지점입니다.
   - `byDim`에서 유독 낮은 항목이 있으면 그것도 짚습니다.

3. **출력** — 아래 형식.

4. 기록은 하지 않습니다. 리포트는 채점이 아닙니다.

## 출력 형식

```
최근 30일 · 자동 채점 128건
──────────────────────────────
평균          74점 → 82점  (+8)
최근 7일      82점

항목별 평균 (최근 30일)
  역할 부여    21.4
  맥락 · 배경  20.8
  출력 형식    12.1   ← 가장 자주 무너지는 항목 (128건 중 71건)
  제약 · 예외  19.5

읽어보면
  두 달 전보다 8점 올랐고, 특히 역할 부여가 확실히 자리 잡았습니다.
  다만 출력 형식은 여전히 절반 이상의 프롬프트에서 최저점입니다.
  여기 하나만 잡으면 평균이 90점대로 올라갑니다.

다음 한 걸음
  프롬프트 끝에 "표 N행으로" 또는 "N문장으로" 한 줄을 붙이는 습관.
```

## 규칙

- **기록이 없거나 10건 미만이면** 점수를 해석하지 않습니다.
  "아직 %d건입니다. 조금 더 쌓이면 추세를 보여드릴게요"라고 한 줄로 말하고 멈춥니다.
- **자동 채점과 정독 채점을 같은 표에 넣지 않습니다.** 기본은 자동 채점 기준으로 보여주고,
  정독 채점 기록이 5건 이상 있으면 아래에 따로 한 줄 덧붙입니다.
- 숫자를 나열하고 끝내지 않습니다. **"읽어보면"과 "다음 한 걸음"이 이 명령어의 본체입니다.**
- 나빠졌을 때도 그대로 말합니다. 다만 원인을 추측해 붙이지 않습니다 — 기록에는 점수만 있습니다.
- 존댓말, 간결하게.
