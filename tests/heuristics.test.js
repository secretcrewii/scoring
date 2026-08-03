'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  score,
  shouldSkip,
  isAck,
  isConversational,
  findWeakest,
  DIMENSIONS,
} = require('../scripts/lib/heuristics');

/**
 * 이 파일이 채점 감각을 고정한다.
 * SIGNALS를 조정할 때 여기가 회귀를 막는다.
 */

const GOOD_PROMPTS = [
  // 네 항목이 모두 채워진 프롬프트
  '너는 10년 차 B2B SaaS 마케터야. 이번에 출시할 신규 요금제 안내 메일을 쓰려고 해. ' +
    '대상은 기존 유료 고객이고, 첨부한 pricing.md를 참고해줘. ' +
    '표 3행으로, 각 행 40자 이내로 정리하고, 과장된 표현은 쓰지 마. 존댓말로.',

  '너는 깐깐한 투자 심사역이야. 아래 IR 초안을 검토하려고 하는데, 대상 독자는 시리즈A 투자자야. ' +
    'deck.md를 기준으로 봐줘. 문제점을 5개 항목으로 정리하고 각 항목마다 근거를 붙여줘. ' +
    '숫자 없는 지적은 하지 말고, 격식 있는 톤으로 부탁해.',

  '역할: 시니어 백엔드 엔지니어. 현재 우리 API 응답이 느려서 원인을 찾으려고 해. ' +
    '`server.js`를 참고해서 병목 후보를 표로 정리해줘. 3개 이내로 좁히고, ' +
    '추측은 배제하고 코드에 근거가 있는 것만 써줘.',

  'You are a senior technical writer. 개발자 온보딩 문서를 다시 쓰려고 합니다. ' +
    '대상은 입사 첫 주 신입 개발자이고, 기존 README.md를 바탕으로 해주세요. ' +
    '단계별로 7단계 이내, 각 단계 2문장으로. 내부 약어는 반드시 풀어서 쓰고 반말은 쓰지 마세요.',
];

const BAD_PROMPTS = [
  '마케팅 이메일 하나 써줘. 좀 잘 써주면 좋겠어.',
  '이거 어떻게 생각해? 의견 좀 말해봐 궁금하네',
  '보고서 작성 좀 도와줘 빨리 해야 하는데 급해서 그래',
  '코드 리뷰 해줘 어디가 문제인지 봐줘 그냥 대충 봐도 돼',
];

test('좋은 프롬프트는 기본 임계값 75점을 넘는다', () => {
  for (const prompt of GOOD_PROMPTS) {
    const result = score(prompt);
    assert.ok(
      result.total >= 75,
      `기대: >=75, 실제: ${result.total}\n항목: ${JSON.stringify(result.dims)}\n프롬프트: ${prompt.slice(0, 40)}…`
    );
  }
});

test('부실한 프롬프트는 임계값 75점에 못 미친다', () => {
  for (const prompt of BAD_PROMPTS) {
    const result = score(prompt);
    assert.ok(
      result.total < 75,
      `기대: <75, 실제: ${result.total}\n항목: ${JSON.stringify(result.dims)}\n프롬프트: ${prompt}`
    );
  }
});

test('총점은 0~100 범위이고 항목 합과 일치한다', () => {
  for (const prompt of [...GOOD_PROMPTS, ...BAD_PROMPTS]) {
    const result = score(prompt);
    const sum = DIMENSIONS.reduce((acc, dim) => acc + result.dims[dim], 0);

    assert.strictEqual(result.total, sum, '총점이 항목 합과 다르다');
    assert.ok(result.total >= 0 && result.total <= 100, `총점이 범위 밖: ${result.total}`);

    for (const dim of DIMENSIONS) {
      assert.ok(result.dims[dim] >= 0 && result.dims[dim] <= 25, `${dim} 점수가 범위 밖`);
    }
  }
});

test('항목별로 해당 신호를 실제로 감지한다', () => {
  const roleOnly = score('너는 10년 차 마케팅 전문가야. 그거 알아서 잘 해줘 대충 아무렇게나');
  assert.ok(roleOnly.dims.role >= 15, `역할 신호 미감지: ${roleOnly.dims.role}`);

  const formatOnly = score('아무거나 정리해줘 표 3행으로, 각 항목 40자 이내 마크다운 형식으로');
  assert.ok(formatOnly.dims.format >= 15, `형식 신호 미감지: ${formatOnly.dims.format}`);

  const constraintOnly = score('그거 좀 해줘 존댓말로 쓰고 과장된 표현은 쓰지 마 반드시 3줄 이내로');
  assert.ok(constraintOnly.dims.constraint >= 15, `제약 신호 미감지: ${constraintOnly.dims.constraint}`);

  const contextOnly = score(
    '신규 요금제를 안내하려고 하는데 대상은 기존 유료 고객이고 첨부한 pricing.md를 참고해서 우리가 지금 쓰는 방식대로 해줘'
  );
  assert.ok(contextOnly.dims.context >= 15, `맥락 신호 미감지: ${contextOnly.dims.context}`);
});

test('"쓰지 마" 같은 일반 동사형 부정도 제약으로 잡는다', () => {
  const withNegation = score('신규 요금제 안내문을 작성해줘 과장된 표현은 절대 쓰지 마');
  const withoutNegation = score('신규 요금제 안내문을 작성해줘 자유롭게 표현해도 괜찮아');

  assert.ok(
    withNegation.dims.constraint > withoutNegation.dims.constraint,
    '부정 표현이 제약 점수를 올리지 못했다'
  );
});

test('weakest는 최저 항목이며 동점이면 DIMENSIONS 순서를 따른다', () => {
  assert.strictEqual(findWeakest({ role: 10, context: 20, format: 5, constraint: 25 }), 'format');

  // 전부 동점이면 첫 항목
  assert.strictEqual(findWeakest({ role: 0, context: 0, format: 0, constraint: 0 }), 'role');

  // role과 constraint가 동점 최저면 순서상 앞선 role
  assert.strictEqual(findWeakest({ role: 3, context: 20, format: 20, constraint: 3 }), 'role');
});

test('배점 가중치를 바꾸면 항목 점수가 따라 바뀐다', () => {
  const prompt = GOOD_PROMPTS[0];
  const base = score(prompt);
  const weighted = score(prompt, { role: 50, context: 25, format: 25, constraint: 0 });

  assert.ok(weighted.dims.role > base.dims.role, '배점을 올렸는데 점수가 안 올랐다');
  assert.strictEqual(weighted.dims.constraint, 0, '배점 0인 항목이 0점이 아니다');
});

test('슬래시 명령어는 채점하지 않는다', () => {
  assert.strictEqual(shouldSkip('/score 이 프롬프트 좀 봐줘 자세하게'), true);
  assert.strictEqual(shouldSkip('/help'), true);
});

test('짧은 입력은 채점하지 않는다', () => {
  assert.strictEqual(shouldSkip('짧아'), true);
  assert.strictEqual(shouldSkip(''), true);
  assert.strictEqual(shouldSkip('   '), true);
  assert.strictEqual(shouldSkip('19자짜리 문자열입니다'), true);
});

test('짧은 수긍 표현은 채점하지 않는다', () => {
  assert.strictEqual(isAck('ㅇㅇ'), true);
  assert.strictEqual(isAck('ㅇㅇ 그렇게 해'), true);
  assert.strictEqual(isAck('네 감사합니다'), true);
  assert.strictEqual(isAck('ok thanks'), true);
  assert.strictEqual(shouldSkip('ㅇㅇ 그렇게 해줘 고마워요 수고'), true);

  assert.strictEqual(isAck('신규 요금제 안내문을 작성해줘'), false);
});

test('짧아도 작업 지시면 채점한다 (실사례: 15자 지시를 놓쳤던 버그)', () => {
  // 실제로 훅이 침묵했던 프롬프트 — 가장 짧은 지시가 가장 코칭이 필요하다
  assert.strictEqual(shouldSkip('메신저 앱 만들건데 만들어봐'), false);
  assert.strictEqual(shouldSkip('보고서 하나 써줘'), false);
  assert.strictEqual(shouldSkip('이거 번역해줘 빨리'), false);

  // 작업 동사가 없는 짧은 입력은 여전히 스킵
  assert.strictEqual(shouldSkip('그건 좀 아닌 것 같은데'), true);
  // 8자 미만은 무조건 스킵
  assert.strictEqual(shouldSkip('만들어봐'), true);
  // 수긍 표현은 여전히 스킵 (ACKS가 우선)
  assert.strictEqual(shouldSkip('ㅇㅇ 그렇게 해줘 고마워요 수고'), true);
});

test('팀 구성 설명을 역할 부여로 오인하지 않는다 (실사례)', () => {
  // "디자이너, 마케터"는 직원 소개지 AI에게 준 역할이 아니다
  const teamIntro = score(
    '나는 이커머스 셀러고 직원의 구성은 디자이너, 마케터, MD, CS가 있는데 업무 정리를 부탁하려고'
  );
  // 실제 역할 부여와 비교
  const realRole = score('너는 10년 차 이커머스 운영 전문 컨설턴트야. 업무 정리를 부탁하려고');

  assert.ok(
    teamIntro.dims.role < realRole.dims.role,
    `팀 소개(${teamIntro.dims.role})가 실제 역할 부여(${realRole.dims.role})와 같거나 높다`
  );
  assert.ok(teamIntro.dims.role <= 7, `팀 소개만으로 role ${teamIntro.dims.role}점은 과하다`);
});

test('관점 지정이 있으면 직군 단어가 역할로 잡힌다', () => {
  const withPerspective = score('마케팅 전문가로서 이 카피를 검토해줘 부탁할게');
  assert.ok(withPerspective.dims.role >= 10, `"전문가로서"를 못 잡았다: ${withPerspective.dims.role}`);
});

test('범위 한정을 제약으로 잡는다 (실사례)', () => {
  const scoped = score('전체 업무 flow가 목표지만 지금은 일단 디자이너 업무에 대해서만 체크리스트를 만들어줘');
  const unscoped = score('전체 업무 flow 체크리스트를 만들어줘 잘 부탁해 고맙습니다 화이팅');

  assert.ok(
    scoped.dims.constraint > unscoped.dims.constraint,
    `범위 한정(${scoped.dims.constraint})이 무한정(${unscoped.dims.constraint})보다 높지 않다`
  );
});

test('대화·감상·의견 질문은 채점하지 않는다 (실사례)', () => {
  // 실제로 4점 노트가 떴던 대화형 메시지 — 작업 동사('추가')가 있어도 대화다
  assert.strictEqual(
    shouldSkip('좋다 지금 이 플러그인 너무 좋다. 근데 더 업그레이드 하거나 추가해야할게 있을까?'),
    true
  );
  assert.strictEqual(isConversational('이 기능 어떻게 생각해? 의견이 궁금하네'), true);
  assert.strictEqual(isConversational('그렇게 하는 게 더 좋을까'), true);

  // 감상으로 시작해도 작업 동사가 이어지면 작업이다
  assert.strictEqual(isConversational('좋다. 이제 결제 모듈 배포해줘'), false);
  // 평범한 작업 지시는 대화가 아니다
  assert.strictEqual(isConversational('메신저 앱 만들건데 만들어봐'), false);
  assert.strictEqual(
    shouldSkip('너는 10년 차 마케터야. 신규 요금제 안내 메일을 표 3행으로 써줘'),
    false
  );
});

test('용도·독자 명시를 역할 대체로 인정한다 (실사례: 훅 64 vs 정독 78 괴리)', () => {
  // "ChatGPT에 붙여넣을 용도" — 역할은 없지만 용도가 역할을 대체한다
  const withPurpose = score(
    '인기글 300개를 수집해줘. 수집한 데이터를 ChatGPT에 붙여넣어서 사용할 용도로 쓸 거라서 md 파일 형식으로 추출해주면 좋겠어'
  );
  assert.ok(withPurpose.dims.role >= 8, `용도 명시를 role로 못 잡았다: ${withPurpose.dims.role}`);

  const withAudience = score('30대 육아맘 고객에게 보낼 재구매 유도 문자를 작성해줘 부담스럽지 않게');
  assert.ok(withAudience.dims.role >= 8, `독자 명시를 role로 못 잡았다: ${withAudience.dims.role}`);

  const without = score('인기글 300개를 수집해서 파일로 추출해줘 최대한 많은 정보를 담아서');
  assert.ok(
    withPurpose.dims.role > without.dims.role,
    '용도 명시가 role 점수를 올리지 못했다'
  );
});

test('문자열이 아닌 입력에도 죽지 않는다', () => {
  assert.strictEqual(shouldSkip(null), true);
  assert.strictEqual(shouldSkip(undefined), true);
  assert.strictEqual(shouldSkip(42), true);

  const result = score(null);
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.weakest, 'role');
});

test('같은 입력은 항상 같은 점수를 낸다', () => {
  const prompt = GOOD_PROMPTS[1];
  const first = score(prompt);
  const second = score(prompt);
  assert.deepStrictEqual(first, second);
});
