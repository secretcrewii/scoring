'use strict';

/**
 * 결정론적 프롬프트 채점.
 *
 * 순수 함수만 둔다 — 파일 I/O 없음, 전역 상태 없음, 출력 없음.
 * 채점 감각이 이 파일 하나에 담긴다. 기준을 조정할 때는 SIGNALS만 손대면 된다.
 *
 * 의도적으로 러프하다. 여기서 할 일은 "무언가 빠졌다"를 감지하는 것이고,
 * 정밀한 판단은 /score 스킬(LLM)이 담당한다.
 */

/** 채점 항목. 배열 순서가 곧 동점 시 우선순위다 (기본기 순). */
const DIMENSIONS = ['role', 'context', 'format', 'constraint'];

/** 항목별 원점수 상한. 이 값 대비 비율로 환산한 뒤 가중치를 곱한다. */
const NOMINAL_MAX = 25;

/** 항목별 배점 기본값. 합이 100이다. */
const DEFAULT_WEIGHTS = { role: 25, context: 25, format: 25, constraint: 25 };

/** 이보다 짧으면 채점하지 않는다. 단, 작업 지시 동사가 있으면 이 길이 미만이어도 채점한다. */
const MIN_LENGTH = 20;

/** 작업 지시 동사가 있으면 아무리 짧아도 채점한다. 이 밑으로는 무조건 스킵. */
const HARD_MIN_LENGTH = 8;

/**
 * 작업 지시 동사. "메신저 앱 만들어봐" 같은 짧은 지시가 정확히 코칭이 필요한 순간이다 —
 * 길이만 보고 건너뛰면 가장 위험한 프롬프트를 놓친다.
 */
const TASK_VERBS =
  /(만들|작성|구현|생성|정리|분석|디자인|설계|기획|번역|요약|검토|리뷰|수정|고쳐|바꿔|찾아|조사|추가|삭제|배포|테스트|짜\s*줘|짜줘|써\s*줘|써줘|그려|만들어|\b(?:write|create|make|build|generate|draft|summari[sz]e|analy[sz]e|design|plan|translate|review|fix|refactor|update|find|research|add|remove|delete|deploy|test|explain|compare|convert|implement|rewrite|outline)\b)/i;

/**
 * 숙고형 어미로 끝나는 문장 — 작업 지시가 아니라 의견을 묻는 대화다.
 * "뭘 추가해야 할게 있을까?"는 '추가'가 있어도 브리핑이 아니다.
 */
const DELIBERATIVE_ENDING =
  /(있을까|할까|할까요|좋을까|어떨까|어떤가|어때|일까|을까요|는지|은지|인가|인가요|잖아)\s*[?？!.~ㅋㅎ\s]*$/;

/**
 * 숙고형 표현 — 문장 끝이 아니어도 대화 신호다.
 * "…부여해야 하지 않을까? 종합적으로" 처럼 뒤에 조각이 붙어도 잡아야 한다.
 */
const DELIBERATIVE =
  /(않을까|않을지|해야\s*하지|하는\s*게\s*(?:맞|좋|나)|는\s*게\s*(?:맞|좋|나)|좋을지|나을까|나을지|어떨지|어떨까|괜찮을까|맞을까|\b(?:should\s+(?:i|we)|shouldn'?t\s+(?:i|we)|do\s+you\s+think|what\s+if|wouldn'?t\s+it|is\s+it\s+(?:better|worth)|any\s+(?:ideas|thoughts|suggestions))\b)/i;

/** 의견을 묻는 표현 — 위치와 무관하게 대화 신호. */
const OPINION_ASK =
  /(어떻게\s*생각|의견\s*(?:이|을|좀|은)|궁금|무슨\s*(?:소리|말)|뭔\s*(?:소리|말)|\b(?:what\s+do\s+you\s+think|your\s+(?:opinion|take)|thoughts\b|i'?m\s+curious|not\s+sure\s+(?:what|if)|what\s+does\s+(?:this|that)\s+mean)\b)/i;

/** 감상·칭찬으로 시작하는 문장. 작업 동사가 없으면 대화로 본다. */
const SENTIMENT_OPENER =
  /^(좋다|좋네|좋아요|좋은데|와+\s|오+\s|우와|대박|굿|멋지|멋있|최고|감사|고마|고맙|훌륭|역시|미쳤|쩐다|짱|(?:nice|great|awesome|cool|perfect|excellent|amazing|wow|love\s+(?:it|this)|thanks|thank\s+you|beautiful|impressive)\b)/i;

/**
 * 사람이 쓴 프롬프트가 아니라 하네스가 주입한 메시지.
 * 백그라운드 작업 알림, 슬래시 명령어 래퍼, 로컬 명령 출력 등이 여기 해당한다.
 * 이걸 채점하면 사용자에게 뜬금없는 노트가 뜨고 평균까지 오염된다.
 */
const SYSTEM_MESSAGE =
  /(\[SYSTEM NOTIFICATION|<task-notification>|<system-reminder>|<local-command-caveat>|<command-name>|<command-message>|<local-command-stdout>|Caveat: The messages below were generated)/;

/** 물음표. 한국어에서 가장 강한 질문 신호다. */
const QUESTION_MARK = /[?？]/;

/**
 * 요청 표현. 물음표가 있어도 이게 함께 있으면 작업 브리핑으로 본다.
 * "표 3행으로 정리해줄래?"는 질문형이지만 실제로는 지시다.
 */
const REQUEST_MARKER =
  /(줘|주세요|주실|줄래|줄\s*수|부탁|해\s*봐|해\s*보자|하자|시켜|시작해|진행해|만들어|알려|\b(?:please|can\s+you|could\s+you|would\s+you|give\s+me|show\s+me|help\s+me|let'?s|go\s+ahead|i\s+need\s+you\s+to|i\s+want\s+you\s+to)\b)/i;

/**
 * 앞서 한 말을 다시 강조하는 어미 — 새 브리핑이 아니라 정정·재촉이다.
 * "아니 이거 이렇게 되게끔 하라고", "끝까지 다 하라고"
 */
const REITERATION_ENDING =
  /(라고|말이야|말이지|얘기야|얘기지|거잖아|잖아요|\b(?:i\s+said|like\s+i\s+said|as\s+i\s+said|i\s+mean|i\s+meant))\s*[.!~ㅋㅎ\s]*$/i;

/** 수긍 표현 판정은 이 길이 이하에서만 시도한다. */
const ACK_MAX_LENGTH = 40;

/** 짧은 수긍·감사 표현. 대화의 리듬을 방해하지 않기 위해 채점에서 제외한다. */
const ACKS = new Set([
  'ㅇㅇ', 'ㅇㅋ', 'ㄱㄱ', 'ㄱ', 'ㅇ', 'ㅅㄱ', 'ㅎㅇ',
  '응', '어', '넵', '네', '예', '그래', '그래요', '알겠어', '알겠어요', '알았어', '알겠습니다',
  '아니', '아니야', '노', '맞아', '맞아요',
  '고마워', '고마워요', '고맙습니다', '감사', '감사해요', '감사합니다',
  '굿', '좋아', '좋아요', '좋습니다', '오케이', '수고', '수고했어',
  '해', '해줘', '하라고', '그렇게해', '그렇게', '계속', '진행',
  'ok', 'okay', 'k', 'y', 'n', 'yes', 'no', 'go', 'continue', 'thanks', 'thx',
]);

/**
 * 항목별 신호. 각 항목의 원점수는 매칭된 신호의 pts 합이며 NOMINAL_MAX에서 잘린다.
 * 신호가 겹쳐 매칭되는 것은 의도된 동작이다 — 여러 근거가 있으면 더 확실한 신호다.
 */
const SIGNALS = {
  // 역할 · 페르소나: AI에게 누구로서 답할지 지정했는가
  role: [
    { re: /(?:너는|넌|당신은|자네는)\s*\S/, pts: 8 },
    // 직군 목록에 없는 역할("투자 심사역")도 잡으려면 어휘가 아니라 문장 구조를 봐야 한다.
    { re: /(?:너는|넌|당신은|자네는)\s*[^.!?\n]{2,40}?(?:이야|이다|입니다|이고|예요|이에요|야[.,\s]|야$)/, pts: 10 },
    { re: /(?:로서|으로서|입장에서|의\s*관점에서)/, pts: 8 },
    // 직군 단어는 "부여" 문맥이 있을 때만 역할이다.
    // "직원 구성은 디자이너, 마케터…" 같은 팀 소개를 역할 부여로 오인하면 안 된다.
    { re: /(?:너는|넌|당신은|자네는|역할\s*[:：]|you\s+are|act\s+as)[^.!?\n]{0,40}?(전문가|디자이너|엔지니어|개발자|기획자|마케터|변호사|의사|컨설턴트|카피라이터|편집자|교수|선생|멘토|심사역|CTO|CEO|CFO|PM|PO)/i, pts: 7 },
    { re: /(전문가|디자이너|엔지니어|개발자|기획자|마케터|변호사|의사|컨설턴트|카피라이터|편집자|교수|선생|멘토|심사역|CTO|CEO|CFO|PM|PO)\s*(?:로서|으로서|의\s*관점|입장에서|처럼|답게)/i, pts: 7 },
    { re: /(\d+\s*년\s*차|경력\s*\d|베테랑|시니어|주니어|수석)/, pts: 6 },
    { re: /\bas\s+(?:an?|the)\s+\w+/i, pts: 8 },
    { re: /(역할|페르소나|persona|role)\s*[:：]/i, pts: 10 },
    { re: /(?:you\s+are|act\s+as)\s+an?\s/i, pts: 10 },
    { re: /\b(?:\d+\+?\s*years?\s+(?:of\s+)?experience|senior|principal|veteran|seasoned|junior)\b/i, pts: 6 },
    // 용도·독자 명시는 역할 부여를 대체한다 — 연구상 동등하거나 더 효과적 (rubrics/prompt.md 참고).
    // "ChatGPT에 붙여넣을 용도", "30대 고객에게 보낼" 같은 표현이 여기 해당한다.
    { re: /(에게\s*(?:보낼|전달할|안내할|발송할|줄)|가\s*읽을|이\s*볼|용도로|용도이|할\s*용도|에\s*쓸|에\s*붙여넣|목적으로|에\s*올릴)/, pts: 8 },
    { re: /(독자는|대상\s*독자|읽는\s*사람|보는\s*사람은)/, pts: 8 },
    { re: /\b(?:target\s+audience|intended\s+for|will\s+be\s+read\s+by|written\s+for|aimed\s+at|this\s+is\s+for)\b/i, pts: 8 },
    { re: /\b(?:from\s+(?:the\s+)?(?:perspective|point\s+of\s+view|standpoint|lens)\s+of|through\s+the\s+lens\s+of)\b/i, pts: 8 },
  ],

  // 맥락 · 배경: 왜 이걸 시키는지, 누구를 위한 건지 알려줬는가
  context: [
    { re: /(하려고|하려는|위해서|위한|목적은|목표는|때문에|때문이|이유는)/, pts: 7 },
    { re: /(대상은|독자는|고객|사용자|타겟|타깃|팀원|초보자|비개발자|경영진|투자자)/, pts: 5 },
    { re: /(첨부|아래|다음|참고|참조|기준으로|바탕으로)/, pts: 5 },
    { re: /(@[\w./\\-]+|`[^`]+`|\.(?:md|txt|csv|json|ts|js|py|pdf|xlsx?|docx?)\b)/i, pts: 5 },
    { re: /(현재|지금|기존|우리는|우리가|저희는|저희가)/, pts: 4 },
    { re: /(상황|배경|맥락|context|전제)/i, pts: 5 },
    { re: /\b(?:so\s+that|because|in\s+order\s+to|the\s+goal\s+is|we'?re\s+trying\s+to|we\s+need\s+this|the\s+point\s+is|this\s+will\s+be\s+used)\b/i, pts: 7 },
    { re: /\b(?:audience|readers?|customers?|stakeholders?|executives?|beginners?|non-?technical|end\s+users?)\b/i, pts: 5 },
    { re: /\b(?:attached|below|above|the\s+following|based\s+on|according\s+to|see\s+the|reference[sd]?)\b/i, pts: 5 },
    { re: /\b(?:currently|right\s+now|at\s+the\s+moment|existing|we\s+(?:have|use|run)|our\s+(?:team|company|product|current))\b/i, pts: 4 },
  ],

  // 출력 형식: 어떤 모양으로 답할지 정해줬는가
  format: [
    { re: /(표로|표\s|테이블|table|마크다운|markdown|JSON|리스트|목록|불릿|bullet|글머리|개조식)/i, pts: 9 },
    { re: /\d+\s*(줄|행|개|가지|문장|단락|문단|항목|자|글자|페이지|슬라이드|words?|lines?|items?|bullets?|sentences?|pages?)/i, pts: 9 },
    { re: /(형식|포맷|format|형태로|모양으로|구성으로|양식)/i, pts: 6 },
    { re: /(예시|예를\s*들어|예\s*[:：]|e\.g\.|for\s+example|샘플|sample)/i, pts: 6 },
    { re: /```/, pts: 5 },
    { re: /(순서대로|단계별|step\s*by\s*step|번호를\s*매겨)/i, pts: 5 },
    // 단위마다 조건을 다는 것도 형식 지정이다 ("각 항목마다 근거를 붙여줘")
    { re: /각\s*(?:행|줄|항목|단계|칸|문단|섹션|가지|개)/, pts: 6 },
    { re: /(정리해|정리하고|정리해서|나열|목록화|분류해)/, pts: 5 },
    { re: /\b(?:table|markdown|json|yaml|csv|bullet(?:ed|s)?|numbered\s+list|outline|columns?)\b/i, pts: 9 },
    { re: /\b\d+\s*(?:lines?|rows?|items?|bullets?|sentences?|paragraphs?|words?|characters?|chars?|pages?|slides?|columns?|sections?|steps?)\b/i, pts: 9 },
    { re: /\b(?:format|structure|layout|template|schema|shape)\b/i, pts: 6 },
    { re: /\b(?:for\s+example|e\.g\.|for\s+instance|sample|like\s+this|such\s+as)\b/i, pts: 6 },
    { re: /\b(?:step[-\s]?by[-\s]?step|in\s+order|sequentially)\b/i, pts: 5 },
    { re: /\beach\s+(?:row|line|item|step|section|column|bullet|entry)\b/i, pts: 6 },
  ],

  // 제약 · 예외: 하지 말아야 할 것, 지켜야 할 선을 그어줬는가
  constraint: [
    // "하지 마" 뿐 아니라 "쓰지 마", "넣지 말" 같은 일반 동사형도 잡는다.
    { re: /([가-힣]지\s*(?:마|말)|하지\s*않|금지|제외|빼고|없이|말고|배제)/, pts: 8 },
    { re: /(반드시|꼭|필수|무조건|절대|only|must|never)/i, pts: 7 },
    { re: /(톤|말투|어조|존댓말|반말|격식|캐주얼|정중|tone)/i, pts: 6 },
    { re: /(이내|이하|이상|미만|최대|최소|넘지|초과하지)/, pts: 6 },
    { re: /(조건|제약|규칙|주의|유의|단,|다만)/, pts: 5 },
    // 범위 한정도 제약이다 — "디자이너 업무에 대해서만", "지금은 일단 ~만"
    { re: /(대해서만|에\s*한해|한정해|까지만|범위는|스코프|지금은\s*(?:일단\s*)?[^.!?\n]{0,20}만)/, pts: 6 },
    { re: /\b(?:do\s+not|don'?t|never|avoid|without|except|exclude|skip\s+the|leave\s+out|no\s+need\s+to)\b/i, pts: 8 },
    { re: /\b(?:must|always|required|mandatory|strictly|be\s+sure\s+to|make\s+sure)\b/i, pts: 7 },
    { re: /\b(?:tone|voice|formal|informal|casual|professional|friendly|concise|plain\s+language)\b/i, pts: 6 },
    { re: /\b(?:under|at\s+most|no\s+more\s+than|maximum|minimum|within|less\s+than|fewer\s+than|up\s+to)\b/i, pts: 6 },
    { re: /\b(?:constraints?|rules?|requirements?|note\s+that|caveat|important:)\b/i, pts: 5 },
    { re: /\b(?:only\s+(?:for|the|cover|include)|limited\s+to|scope\s+is|just\s+the|for\s+now|nothing\s+else)\b/i, pts: 6 },
  ],
};

/**
 * 채점을 건너뛸 입력인지 판단한다.
 * @param {string} text
 * @returns {boolean}
 */
function shouldSkip(text) {
  if (typeof text !== 'string') return true;

  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // 슬래시 명령어는 프롬프트가 아니다.
  if (trimmed.startsWith('/')) return true;

  // 하네스가 주입한 메시지도 사람이 쓴 프롬프트가 아니다.
  if (SYSTEM_MESSAGE.test(trimmed)) return true;

  if (trimmed.length < HARD_MIN_LENGTH) return true;

  if (trimmed.length <= ACK_MAX_LENGTH && isAck(trimmed)) return true;

  // 짧아도 작업 지시라면 채점한다. 짧은 지시일수록 코칭이 필요하다.
  if (trimmed.length < MIN_LENGTH && !TASK_VERBS.test(trimmed)) return true;

  // 대화·감상·의견 질문은 브리핑이 아니다. 채점하면 통계가 오염되고 잔소리가 된다.
  if (isConversational(trimmed)) return true;

  return false;
}

/**
 * 짧은 수긍·감사 표현인지 확인한다. 공백·문장부호를 걷어내고 토큰 단위로 본다.
 * 모든 토큰이 수긍 표현이면 수긍으로 본다.
 * @param {string} text
 * @returns {boolean}
 */
function isAck(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/[.,!?~^\-—…"'`()[\]{}]/g, ' ')
    .trim();

  if (cleaned.length === 0) return true;

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.every((token) => ACKS.has(token));
}

/**
 * 작업 브리핑이 아닌 대화(감상·질문·숙고·재촉)인지 판단한다.
 *
 * 판단이 애매하면 대화 쪽으로 기웁니다 — 놓친 코칭은 보이지 않지만
 * 헛도는 잔소리는 바로 거슬리고, 결국 플러그인을 끄게 만들기 때문입니다.
 * 제대로 채점받고 싶으면 언제든 /score를 부르면 됩니다.
 *
 * @param {string} text
 * @returns {boolean}
 */
function isConversational(text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (trimmed.length === 0) return false;

  if (DELIBERATIVE_ENDING.test(trimmed)) return true;
  if (DELIBERATIVE.test(trimmed)) return true;
  if (OPINION_ASK.test(trimmed)) return true;
  if (REITERATION_ENDING.test(trimmed)) return true;

  // 칭찬으로 시작하고 작업 동사가 없으면 감상이다. ("좋다. 이제 배포해줘"는 작업)
  if (SENTIMENT_OPENER.test(trimmed) && !TASK_VERBS.test(trimmed)) return true;

  // 물음표가 있는데 요청 표현이 없으면 질문이다.
  // "이거 마켓플레이스에 있는거지?" → 질문 / "표로 정리해줄래?" → 요청
  if (QUESTION_MARK.test(trimmed) && !REQUEST_MARKER.test(trimmed)) return true;

  return false;
}

/**
 * 한 항목의 원점수를 구한다. 매칭된 신호의 pts 합이며 NOMINAL_MAX에서 잘린다.
 * @param {string} text
 * @param {Array<{re: RegExp, pts: number}>} signals
 * @returns {number} 0..NOMINAL_MAX
 */
function rawDimensionScore(text, signals) {
  let sum = 0;
  for (const signal of signals) {
    if (signal.re.test(text)) sum += signal.pts;
  }
  return Math.min(sum, NOMINAL_MAX);
}

/**
 * 맥락 항목은 신호 외에 분량도 본다. 배경을 설명했다면 길어질 수밖에 없다.
 * @param {string} text
 * @returns {number} 추가 원점수
 */
function lengthBonus(text) {
  const len = text.trim().length;
  if (len >= 400) return 8;
  if (len >= 200) return 5;
  if (len >= 100) return 3;
  return 0;
}

/**
 * 점수가 가장 낮은 항목을 고른다. 동점이면 DIMENSIONS 순서상 앞선 항목을 택한다.
 * @param {Record<string, number>} dims
 * @returns {string}
 */
function findWeakest(dims) {
  let weakest = DIMENSIONS[0];
  for (const dim of DIMENSIONS) {
    if (dims[dim] < dims[weakest]) weakest = dim;
  }
  return weakest;
}

/**
 * 프롬프트를 채점한다.
 *
 * @param {string} text 프롬프트 원문
 * @param {Record<string, number>} [weights] 항목별 배점. 기본값은 각 25점.
 * @returns {{dims: Record<string, number>, total: number, weakest: string}}
 */
function score(text, weights = DEFAULT_WEIGHTS) {
  const source = typeof text === 'string' ? text : '';
  const effective = { ...DEFAULT_WEIGHTS, ...(weights || {}) };

  const dims = {};
  for (const dim of DIMENSIONS) {
    let raw = rawDimensionScore(source, SIGNALS[dim]);
    if (dim === 'context') {
      raw = Math.min(raw + lengthBonus(source), NOMINAL_MAX);
    }
    const ratio = raw / NOMINAL_MAX;
    dims[dim] = Math.round(ratio * effective[dim]);
  }

  const total = DIMENSIONS.reduce((sum, dim) => sum + dims[dim], 0);

  return { dims, total, weakest: findWeakest(dims) };
}

module.exports = {
  DIMENSIONS,
  DEFAULT_WEIGHTS,
  MIN_LENGTH,
  score,
  shouldSkip,
  isAck,
  isConversational,
  findWeakest,
};
