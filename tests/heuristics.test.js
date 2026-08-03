'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { score, shouldSkip, isAck, findWeakest, DIMENSIONS } = require('../scripts/lib/heuristics');

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
