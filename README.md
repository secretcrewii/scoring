# scoring

> A Korean-language prompt-coaching plugin for Claude Code — scores your prompts (0-100) as you type, explains why, and teaches research-backed prompting habits. Built for non-developer business users.

프롬프트와 문서에 **점수를 매기고, 왜 그 점수인지 설명하고, 다음에 더 잘 쓰는 법을 알려주는** Claude Code 플러그인입니다.

옆자리에서 리뷰해주던 사람의 역할을 대신합니다.

---

## 뭘 해주나요

| 언제 | 무슨 일이 일어나나 |
|---|---|
| 프롬프트를 칠 때 | 자동으로 점수를 매깁니다. **75점 이상이면 아무 말도 안 합니다.** 아쉬울 때만 한 줄 짚어줍니다 |
| `/score` | 프롬프트를 제대로 읽고 항목별 점수 + 이유 + **고쳐 쓴 프롬프트 전문** |
| `/score-session` | 이번 작업 전체를 돌아보고 종합 평가 + 다음에 시도할 것 한 가지 |
| `/score-doc <파일>` | 기획안·제안서를 읽고 점수 + **결론을 앞으로 뺀 첫 문단** |
| `/score-report` | 그동안의 추세 — 늘고 있는지, 어디가 계속 약한지 |
| `/explain` | **방금 받은 AI 보고가 어려울 때** — 비개발자 눈높이로 풀어서 다시 설명. 다른 AI에게 물으러 갈 필요 없이 그 자리에서 해결 |
| `/save-prompt [이름]` | 방금 나온 좋은 프롬프트를 서랍에 저장 (상세페이지용, CS용…) |
| `/prompts [검색어]` | 서랍을 열어 저장된 프롬프트를 꺼냄 — 복사해서 바로 사용 |

채점 항목은 네 가지입니다.

- **역할 부여** — AI에게 누구로서 답하라고 했는가
- **맥락 · 배경** — 왜 필요한지, 누가 볼 건지 알려줬는가
- **출력 형식** — 어떤 모양으로 답할지 정해줬는가
- **제약 · 예외** — 지켜야 할 선을 그어줬는가

각 25점, 합쳐서 100점입니다.

채점 기준과 팁은 2026-08 프롬프팅 연구 조사(Anthropic·OpenAI·Google 공식 가이드 + 측정 연구 89건)를
반영했습니다. 근거는 [docs/research/prompting-research-2026-08.md](docs/research/prompting-research-2026-08.md)에 있습니다.

---

## 설치

scoring은 Claude Code 플러그인입니다. 환경에 맞는 방법을 고르세요.

### Claude Code (권장)

이 저장소를 플러그인 마켓플레이스로 추가한 뒤 설치합니다:

```
/plugin marketplace add secretcrewii/scoring
/plugin install scoring@scoring
```

그다음 Claude Code를 재시작하세요 (버전이 지원하면 `/reload-plugins`). 스킬과 훅이 그때 로드됩니다.
나중에 업데이트는 `/plugin marketplace update scoring`.

### 수동 설치 (마켓플레이스 없이)

개인 스킬 디렉터리에 클론하면 다음 세션부터 `scoring@skills-dir`로 자동 로드됩니다.
설치 단계가 따로 없습니다.

```bash
git clone https://github.com/secretcrewii/scoring.git ~/.claude/skills/scoring
```

Windows PowerShell:

```powershell
git clone https://github.com/secretcrewii/scoring.git "$env:USERPROFILE\.claude\skills\scoring"
```

그다음 Claude Code를 재시작하세요.

### 로컬 폴더에서 (개발용)

저장소를 이미 받아두었다면 그 폴더를 그대로 마켓플레이스로 등록할 수 있습니다.
이 방식은 폴더를 복사하지 않고 **직접 참조**하므로, `rubrics/` 파일을 고치면 바로 반영됩니다.

```
/plugin marketplace add C:\경로\scoring
/plugin install scoring@scoring
```

---

별도로 설치할 프로그램은 없습니다. Node 18 이상만 있으면 되고, 외부 패키지 의존성은 0개입니다.

---

## 점수 노트가 떴을 때

이런 게 뜹니다.

```
📊 62점 (기준 75점) · 출력 형식 — 어떤 모양으로 답해달라는 지시가 없어요
   역할 20 · 맥락 20 · 형식 4 · 제약 18
   → 끝에 "표 3행으로, 각 행 40자 이내" 한 줄만 붙여도 확 올라갑니다.
   자세한 채점은 /score
```

**그냥 넘어가셔도 됩니다.** 요청은 그대로 처리됩니다. 노트는 참고용입니다.

제대로 보고 싶으면 `/score`를 치세요. 왜 그 점수인지 설명하고,
**그대로 복사해서 쓸 수 있는 개선판 프롬프트**를 만들어 드립니다.

---

## 시끄러울 때

### 잠깐 끄기

명령 프롬프트에서 환경변수를 설정한 뒤 Claude Code를 실행합니다.

```
set SCORING_OFF=1
```

### 완전히 끄기

`C:\Users\<사용자명>\.claude\scoring\config.json` 파일을 만들고:

```json
{ "enabled": false }
```

### 덜 자주 뜨게 하기

같은 파일에서 기준점을 낮춥니다. 기본은 75점입니다.

```json
{ "threshold": 60 }
```

60으로 낮추면 정말 부실할 때만 뜹니다.

### 원래 잘 안 뜹니다

점수 노트는 **10분에 한 번만** 뜹니다 (연달아 낮은 점수여도 잔소리를 반복하지 않습니다).
대화·질문·감상("이거 좋다", "어떻게 생각해?")은 아예 채점하지 않습니다.

`config.json`으로 조절할 수 있습니다:

```json
{ "cooldownMinutes": 30, "dailyNudge": false }
```

- `cooldownMinutes` — 노트 최소 간격(분). 0이면 매번 뜸. 기본 10
- `dailyNudge` — 하루 한 번 세션 시작 시 "최근 3일 N건, 평균 M점" 한 줄 안내. 기본 켜짐

---

## 채점 기준을 바꾸려면

`rubrics/` 폴더의 마크다운 파일만 고치면 됩니다. **코드는 건드릴 필요 없습니다.**

| 파일 | 무엇을 정하나 |
|---|---|
| `rubrics/prompt.md` | 프롬프트 채점 기준. 맨 위 설정 블록에서 기준점과 항목별 배점도 조정 |
| `rubrics/session.md` | 세션 평가 기준 |
| `rubrics/doc.md` | 문서·기획안 평가 기준 |
| `rubrics/tips.md` | 항목별 개선 팁 모음. **새 팁이 생기면 여기 계속 추가하세요** |

예를 들어 "출력 형식을 더 중요하게 보고 싶다"면 `rubrics/prompt.md`의 설정 블록에서:

```json
{
  "threshold": 75,
  "weights": { "role": 20, "context": 20, "format": 40, "constraint": 20 }
}
```

합이 100이 되게만 유지하면 됩니다.

---

## 기록은 어디에 남나요

`C:\Users\<사용자명>\.claude\scoring\ledger.jsonl`

**프롬프트 원문은 저장하지 않습니다.** 점수와 글자 수만 남깁니다.
회사 내부 내용이 파일로 쌓이지 않게 하기 위해서입니다.

기록을 지우고 싶으면 이 파일을 삭제하면 됩니다. 새로 쌓기 시작합니다.

---

## 개발자를 위한 메모

```
scripts/lib/heuristics.js   결정론적 채점. 순수 함수 — 채점 감각이 여기 담겨 있다
scripts/lib/rubric.js       rubrics/*.md에서 임계값·배점·팁을 뽑는다
scripts/lib/ledger.js       JSONL 적재·조회. 실패해도 예외를 던지지 않는다
scripts/lib/config.js       on/off 및 사용자 설정
scripts/prompt-gate.js      UserPromptSubmit 훅 진입점. 조율만 한다
scripts/report.js           집계. CLI로 실행하면 JSON을 뱉는다
scripts/ledger-write.js     스킬이 기록할 때 쓰는 CLI 래퍼
```

- **외부 의존성 0개.** Node 내장 모듈만 씁니다. `npm install` 불필요
- 테스트: `npm test` (Node 내장 `node --test`)
- 훅은 **어떤 경우에도 `exit 0`** 입니다. 채점 때문에 작업이 멈추면 안 됩니다
- 채점 기준을 조정할 때는 `scripts/lib/heuristics.js`의 `SIGNALS`만 손대고,
  `tests/heuristics.test.js`의 픽스처로 회귀를 확인하세요

설계 문서: [docs/superpowers/specs/2026-08-03-scoring-plugin-design.md](docs/superpowers/specs/2026-08-03-scoring-plugin-design.md)
