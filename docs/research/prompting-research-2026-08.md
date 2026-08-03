# 프롬프팅 연구 조사 노트 (2026-08)

rubric과 tips를 갱신하기 위해 수행한 조사의 근거 기록입니다.
"왜 이렇게 채점하나"에 대한 답이 필요할 때 이 문서를 보세요.

## 조사 방법

5개 도메인을 병렬 조사, 총 89건의 기법·연구 수집 후 종합.

| 도메인 | 소스 |
|---|---|
| Anthropic 공식 | docs.claude.com 프롬프트 엔지니어링, Claude 프롬프팅 베스트 프랙티스, 엔지니어링 블로그 |
| OpenAI·Google 공식 | GPT-4.1/5 프롬프팅 가이드, Gemini 프롬프트 설계, Workspace 프롬프팅 가이드 |
| 학술 측정 연구 | The Prompt Report, EMNLP/ICML/ICLR/TACL/EACL 게재 측정 연구, Wharton Prompting Science Reports |
| 실무 고수 패턴 | Simon Willison, Ethan Mollick, Claude Code 베스트 프랙티스, 프롬프트 라이브러리 운영 사례 |
| 비즈니스·한국어 | Microsoft Copilot·Google Workspace 비즈니스 가이드, CO-STAR(싱가포르 GovTech), 이커머스 특화 사례 |

## 핵심 검증: 우리 4개 항목 구조는 유효하다

이 플러그인의 4개 채점 항목(역할·맥락·형식·제약)은 **Google 공식 PTCF 프레임워크**
(Persona·Task·Context·Format)와 거의 일치한다. 루브릭 구조 자체가 벤더 공식 가이드로
검증된 셈이므로 구조는 유지하고 세부 기준만 연구 결과로 갱신했다.

## 통념을 뒤집은 측정 결과 10개

1. **전문가 페르소나는 정답률을 높이지 못한다.** EMNLP 2024(4개 모델군, 2,410문항)와
   Wharton Report 4(6개 모델)가 독립 확인. Anthropic도 "페르소나가 모델을 과도하게
   제약할 수 있다"고 인정. → role 항목을 "역할 유무"가 아니라 "톤·관점·독자 적합성"으로 채점.
2. **CoT("단계별로 생각해봐")는 조건부다.** 계산·논리에서만 +12~14%p. 최신 추론형 모델에선
   효과 없이 응답 시간만 20~80% 증가, 일부 과제 최대 -36.3%p. → 만능 팁으로 소개 금지.
3. **감정 호소·팁 제안·협박은 무효.** 재현 연구와 Wharton Report 3에서 평균 효과 없음
   (문항별 ±35% 요동만). → 팁에서 제외, 채점 무관 처리.
4. **공손함은 품질과 무관.** 프롬프트당 19,800회 측정에서 총합 효과 없음. 단, **출력물의**
   말투 지정(해요체/합쇼체)은 한국어 format 채점에서 중요하게 유지.
5. **제약은 많을수록 좋지 않다.** 긴 규칙 목록은 핵심 규칙 무시를 유발, "반드시!!" 남발에
   최신 모델이 과잉 반응 (Anthropic 공식). → constraint를 개수가 아닌 정밀도로 채점.
6. **부정형 지시는 체계적으로 무시된다** (negation blindness). → 금지+대체행동 짝을 상위 기준으로.
7. **prefill(답변 첫머리 대신 쓰기)은 최신 클로드에서 지원 종료.** → "서론 없이 바로 시작"
   직접 지시로 교체.
8. **엄격한 출력 형식 강제가 추론 품질을 떨어뜨린다는 연구와 반박 연구가 공존.**
   → 감점하지 않되, 복잡한 분석에 한해 "자유 분석 → 형식 정리" 2단계를 팁으로 안내.
9. **"항상 명확화 질문시켜라"도 조건부.** 되돌리기 쉬운 작업은 합리적 가정으로 진행,
   되돌리기 어려운 작업(발송·결제·삭제)만 확인 강제 (OpenAI 공식).
10. **무관한 맥락은 정확도를 떨어뜨린다** (ICML 2023 GSM-IC). → context를 양이 아닌
    관련성으로 채점, 무관 정보 나열은 감점.

## 채점에 반영된 실측 수치

| 수치 | 출처 |
|---|---|
| 긴 자료 위 + 지시 아래 배치 → 품질 최대 30% 개선 | Anthropic 공식 테스트 |
| 성과 좋은 프롬프트 평균 21단어 vs 보통 9단어 미만 | Google Workspace 측정 |
| 계획-실행 분리 → 성공률 +4%p, 관련 지시 결합 시 ~20% | OpenAI GPT-4.1 가이드 실측 |
| 기준 없는 "다시 검토해줘" → 맞은 답을 틀리게 고침 | ICLR 2024 (Huang et al.) |
| 출처 고정("~에 근거해서만") → 환각 감소 | EACL 2024 "According to" |

## 반영 내역

- [rubrics/prompt.md](../../rubrics/prompt.md) — 4개 항목 전부 채점 철학·가감점 기준 갱신
- [rubrics/tips.md](../../rubrics/tips.md) — 출처 달린 팁으로 확장 + "통념과 달랐던 것" 표 추가
- 훅 휴리스틱은 변경하지 않음 (얕은 감지 역할 유지 — 뉘앙스 판단은 /score가 rubric을 읽어 수행)

## 주요 출처

- Anthropic: [Claude prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) · [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) · [Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- OpenAI: [GPT-4.1 prompting guide](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide) · [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- Google: [Gemini prompting strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) · [Workspace prompt guide (PDF)](https://services.google.com/fh/files/misc/gemini_for_workspace_prompt_guide_october_2024_digital_final.pdf)
- 학술: [Persona 무효과 (EMNLP 2024)](https://arxiv.org/abs/2311.10054) · [무관 맥락의 해악 (ICML 2023)](https://arxiv.org/abs/2302.00093) · [자가 수정의 한계 (ICLR 2024)](https://arxiv.org/abs/2310.01798) · [형식 제약과 추론 (EMNLP 2024)](https://arxiv.org/abs/2408.02442) · [Self-Consistency](https://arxiv.org/abs/2203.11171)
- Wharton: [Prompting Science Reports](https://gail.wharton.upenn.edu/research-and-insights/tech-report-prompt-engineering-is-complicated-and-contingent/)
- 실무: [Ethan Mollick — Good enough prompting](https://www.oneusefulthing.org/p/getting-started-with-ai-good-enough) · [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
