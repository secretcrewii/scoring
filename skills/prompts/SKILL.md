---
name: prompts
description: |
  저장해둔 프롬프트 서랍을 열어 목록을 보거나 꺼냅니다. 검색어를 주면 이름·용도·내용에서 찾습니다.
  Triggers: prompts, 프롬프트 서랍, 저장한 프롬프트, 그때 그 프롬프트, 프롬프트 목록, 꺼내줘.
argument-hint: "[검색어] — 비우면 전체 목록"
user-invocable: true
allowed-tools: Read, Glob, Grep
---

# 프롬프트 서랍 열기

`~/.claude/scoring/prompts/` (Windows: `C:\Users\<사용자명>\.claude\scoring\prompts\`)에
저장된 프롬프트를 찾아서 보여줍니다.

## Language / 언어

**Detect the language of the target text (the prompt, session, or document being reviewed)
and respond entirely in that language.** Korean input gets a Korean review; English input
gets an English review. When mixed, follow whichever language the user writes in.

The output format shown below is written in Korean. When responding in English, translate
the labels and headings but keep the structure identical.

## 절차

1. **Glob**으로 `~/.claude/scoring/prompts/*.md` 목록을 가져옵니다.
   - 폴더가 없거나 비어 있으면: "서랍이 비어 있습니다. 좋은 프롬프트가 나왔을 때
     `/save-prompt 이름`으로 저장해 두세요"라고 한 줄로 안내하고 멈춥니다.

2. **검색어가 없으면** — 전체 목록을 표로:

   | 이름 | 용도 | 저장일 |
   |---|---|---|

   각 파일의 frontmatter(name, use, saved)만 읽어 채웁니다. 마지막에
   "꺼내려면 `/prompts 이름`" 한 줄.

3. **검색어가 있으면** — 이름 → 용도 → 본문 순으로 찾습니다 (Grep 활용).
   - 1개 매칭: 프롬프트 **전문을 코드블록으로** 보여줍니다 — 바로 복사해 쓸 수 있게.
     매번 바뀌는 `[상품명]` 같은 자리가 있으면 "채울 곳: [상품명]" 한 줄을 덧붙입니다.
   - 여러 개 매칭: 표로 좁혀 보여주고 이름으로 다시 부르게 안내합니다.
   - 0개 매칭: 가장 비슷한 이름 1~2개를 "혹시 이거?"로 제안합니다.

## 규칙

- 전문을 보여줄 때 **수정하지 않습니다.** 서랍은 보관함이지 편집기가 아닙니다.
  개선하고 싶다면 꺼낸 뒤 `/score`로 채점받으라고 안내합니다.
- 목록이 15개를 넘으면 최근 저장 순으로 15개만 보여주고 "검색어로 좁혀주세요" 안내.
