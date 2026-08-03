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

/** 이보다 짧으면 채점하지 않는다. */
const MIN_LENGTH = 20;

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
    { re: /(전문가|디자이너|엔지니어|개발자|기획자|마케터|변호사|의사|컨설턴트|카피라이터|편집자|교수|선생|멘토|CTO|CEO|CFO|PM|PO)/i, pts: 7 },
    { re: /(\d+\s*년\s*차|경력\s*\d|베테랑|시니어|주니어|수석)/, pts: 6 },
    { re: /\bas\s+(?:an?|the)\s+\w+/i, pts: 8 },
    { re: /(역할|페르소나|persona|role)\s*[:：]/i, pts: 10 },
    { re: /(?:you\s+are|act\s+as)\s+an?\s/i, pts: 10 },
  ],

  // 맥락 · 배경: 왜 이걸 시키는지, 누구를 위한 건지 알려줬는가
  context: [
    { re: /(하려고|하려는|위해서|위한|목적은|목표는|때문에|때문이|이유는)/, pts: 7 },
    { re: /(대상은|독자는|고객|사용자|타겟|타깃|팀원|초보자|비개발자|경영진|투자자)/, pts: 5 },
    { re: /(첨부|아래|다음|참고|참조|기준으로|바탕으로)/, pts: 5 },
    { re: /(@[\w./\\-]+|`[^`]+`|\.(?:md|txt|csv|json|ts|js|py|pdf|xlsx?|docx?)\b)/i, pts: 5 },
    { re: /(현재|지금|기존|우리는|우리가|저희는|저희가)/, pts: 4 },
    { re: /(상황|배경|맥락|context|전제)/i, pts: 5 },
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
  ],

  // 제약 · 예외: 하지 말아야 할 것, 지켜야 할 선을 그어줬는가
  constraint: [
    // "하지 마" 뿐 아니라 "쓰지 마", "넣지 말" 같은 일반 동사형도 잡는다.
    { re: /([가-힣]지\s*(?:마|말)|하지\s*않|금지|제외|빼고|없이|말고|배제)/, pts: 8 },
    { re: /(반드시|꼭|필수|무조건|절대|only|must|never)/i, pts: 7 },
    { re: /(톤|말투|어조|존댓말|반말|격식|캐주얼|정중|tone)/i, pts: 6 },
    { re: /(이내|이하|이상|미만|최대|최소|넘지|초과하지)/, pts: 6 },
    { re: /(조건|제약|규칙|주의|유의|단,|다만)/, pts: 5 },
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

  if (trimmed.length < MIN_LENGTH) return true;

  if (trimmed.length <= ACK_MAX_LENGTH && isAck(trimmed)) return true;

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
  findWeakest,
};
