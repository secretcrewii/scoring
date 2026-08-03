'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const GATE = path.join(__dirname, '..', 'scripts', 'prompt-gate.js');

const WEAK_PROMPT = '마케팅 이메일 하나 써줘. 좀 잘 써주면 좋겠어 부탁할게';
const STRONG_PROMPT =
  '너는 10년 차 B2B SaaS 마케터야. 이번에 출시할 신규 요금제 안내 메일을 쓰려고 해. ' +
  '대상은 기존 유료 고객이고, 첨부한 pricing.md를 참고해줘. ' +
  '표 3행으로, 각 행 40자 이내로 정리하고, 과장된 표현은 쓰지 마. 존댓말로.';

/**
 * 훅을 실제 프로세스로 띄운다. stdin/exit code/stdout을 있는 그대로 검증한다.
 */
function runGate(input, extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoring-gate-'));
  const ledgerFile = path.join(dir, 'ledger.jsonl');

  try {
    const result = spawnSync(process.execPath, [GATE], {
      input: typeof input === 'string' ? input : JSON.stringify(input),
      encoding: 'utf8',
      env: {
        ...process.env,
        SCORING_LEDGER: ledgerFile,
        SCORING_HOME: dir,
        SCORING_OFF: '',
        ...extraEnv,
      },
    });

    const ledgerLines = fs.existsSync(ledgerFile)
      ? fs
          .readFileSync(ledgerFile, 'utf8')
          .split('\n')
          .filter((line) => line.trim())
      : [];

    return { ...result, ledgerLines };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('부실한 프롬프트에는 코칭 노트를 낸다', () => {
  const result = runGate({ prompt: WEAK_PROMPT, session_id: 'abc123' });

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /scoring-coach-note/);
  assert.match(result.stdout, /점/);
  assert.match(result.stdout, /\/score/, '자세히 보는 방법을 안내해야 한다');
});

test('코칭 노트는 Claude에게 무시하라고 명시한다', () => {
  const result = runGate({ prompt: WEAK_PROMPT });

  assert.match(
    result.stdout,
    /언급하지 말고|그대로 수행/,
    'Claude가 노트에 반응하지 않도록 지시가 있어야 한다'
  );
});

test('노트는 가장 약한 항목 하나만 지적한다', () => {
  const result = runGate({ prompt: WEAK_PROMPT });

  const headlines = ['누구로서', '왜 필요한', '어떤 모양으로', '지켜야 할 선'];
  const matched = headlines.filter((h) => result.stdout.includes(h));

  assert.strictEqual(matched.length, 1, `지적 항목이 ${matched.length}개다: ${matched.join(', ')}`);
});

test('잘 쓴 프롬프트에는 아무 말도 하지 않는다', () => {
  const result = runGate({ prompt: STRONG_PROMPT });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), '', `침묵해야 하는데 출력이 있다: ${result.stdout}`);
});

test('잘 쓴 프롬프트도 기록은 남긴다', () => {
  const result = runGate({ prompt: STRONG_PROMPT });

  assert.strictEqual(result.ledgerLines.length, 1);
  const record = JSON.parse(result.ledgerLines[0]);
  assert.strictEqual(record.source, 'hook');
  assert.strictEqual(record.kind, 'prompt');
  assert.ok(record.total >= 75);
});

test('기록에 프롬프트 원문이 들어가지 않는다', () => {
  const result = runGate({ prompt: STRONG_PROMPT, session_id: 'sess-1' });

  const raw = result.ledgerLines.join('\n');
  assert.ok(!raw.includes('마케터'), '원문이 기록에 남았다');
  assert.ok(!raw.includes('pricing.md'), '원문이 기록에 남았다');

  const record = JSON.parse(result.ledgerLines[0]);
  assert.strictEqual(record.session, 'sess-1');
  assert.ok(Number.isFinite(record.len), '길이는 남아야 한다');
});

test('슬래시 명령어는 채점도 기록도 하지 않는다', () => {
  const result = runGate({ prompt: '/score 이 프롬프트 좀 자세히 봐줘' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), '');
  assert.strictEqual(result.ledgerLines.length, 0);
});

test('짧은 수긍 표현은 채점도 기록도 하지 않는다', () => {
  const result = runGate({ prompt: 'ㅇㅇ 그렇게 해줘 고마워요 수고' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), '');
  assert.strictEqual(result.ledgerLines.length, 0);
});

test('SCORING_OFF=1이면 아무것도 하지 않는다', () => {
  const result = runGate({ prompt: WEAK_PROMPT }, { SCORING_OFF: '1' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), '');
  assert.strictEqual(result.ledgerLines.length, 0);
});

test('깨진 JSON을 받아도 exit 0으로 조용히 통과한다', () => {
  const result = runGate('{ 이건 JSON이 아니다');

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), '');
});

test('빈 입력에도 exit 0으로 통과한다', () => {
  const result = runGate('');

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), '');
});

test('prompt 필드가 없거나 타입이 달라도 exit 0으로 통과한다', () => {
  for (const payload of [{}, { prompt: null }, { prompt: 42 }, { prompt: [] }, []]) {
    const result = runGate(payload);
    assert.strictEqual(result.status, 0, `payload=${JSON.stringify(payload)} 에서 exit 0이 아니다`);
    assert.strictEqual(result.stdout.trim(), '');
  }
});

test('기록을 쓸 수 없는 상황에서도 코칭 노트는 정상 출력된다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoring-gate-'));

  try {
    // 디렉터리를 ledger 파일 경로로 지정해 쓰기를 실패시킨다.
    const result = spawnSync(process.execPath, [GATE], {
      input: JSON.stringify({ prompt: WEAK_PROMPT }),
      encoding: 'utf8',
      env: { ...process.env, SCORING_LEDGER: dir, SCORING_HOME: dir, SCORING_OFF: '' },
    });

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /scoring-coach-note/, '기록 실패가 출력을 막으면 안 된다');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
