'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * ledger는 config를 통해 경로를 정하므로, require 이전에 환경변수를 잡아야 한다.
 * 테스트마다 임시 파일을 쓰고 지운다.
 */
function withTempLedger(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoring-test-'));
  const file = path.join(dir, 'ledger.jsonl');
  const previous = process.env.SCORING_LEDGER;
  process.env.SCORING_LEDGER = file;

  try {
    return fn(file);
  } finally {
    if (previous === undefined) delete process.env.SCORING_LEDGER;
    else process.env.SCORING_LEDGER = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const ledger = require('../scripts/lib/ledger');

const SAMPLE = {
  kind: 'prompt',
  source: 'hook',
  total: 78,
  dims: { role: 20, context: 20, format: 20, constraint: 18 },
  len: 240,
  session: 'test-session',
};

test('적재한 기록을 그대로 읽어온다', () => {
  withTempLedger(() => {
    assert.strictEqual(ledger.append(SAMPLE), true);

    const records = ledger.read();
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].total, 78);
    assert.strictEqual(records[0].kind, 'prompt');
    assert.strictEqual(records[0].source, 'hook');
    assert.deepStrictEqual(records[0].dims, SAMPLE.dims);
    assert.ok(records[0].ts, '타임스탬프가 없다');
  });
});

test('프롬프트 원문은 저장하지 않는다', () => {
  withTempLedger((file) => {
    ledger.append({ ...SAMPLE, prompt: '회사 내부 기밀 프로젝트 이름', text: '민감한 내용' });

    const raw = fs.readFileSync(file, 'utf8');
    assert.ok(!raw.includes('기밀'), '원문이 파일에 남았다');
    assert.ok(!raw.includes('민감한'), '원문이 파일에 남았다');
    assert.ok(raw.includes('78'), '점수는 남아야 한다');
  });
});

test('디렉터리가 없어도 만들어서 적재한다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoring-test-'));
  const file = path.join(dir, 'nested', 'deep', 'ledger.jsonl');
  const previous = process.env.SCORING_LEDGER;
  process.env.SCORING_LEDGER = file;

  try {
    assert.strictEqual(ledger.append(SAMPLE), true);
    assert.strictEqual(ledger.read().length, 1);
  } finally {
    if (previous === undefined) delete process.env.SCORING_LEDGER;
    else process.env.SCORING_LEDGER = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('파일이 없으면 빈 배열을 반환한다 (예외를 던지지 않는다)', () => {
  withTempLedger(() => {
    assert.deepStrictEqual(ledger.read(), []);
  });
});

test('손상된 줄은 건너뛰고 나머지를 읽는다', () => {
  withTempLedger((file) => {
    ledger.append(SAMPLE);
    fs.appendFileSync(file, '{ 이건 JSON이 아니다\n', 'utf8');
    fs.appendFileSync(file, '\n', 'utf8');
    fs.appendFileSync(file, '{"ts":"깨진날짜","total":50}\n', 'utf8');
    fs.appendFileSync(file, '{"ts":"2026-01-01T00:00:00Z"}\n', 'utf8'); // total 없음
    ledger.append({ ...SAMPLE, total: 90 });

    const records = ledger.read();
    assert.strictEqual(records.length, 2, '유효한 기록만 남아야 한다');
    assert.deepStrictEqual(
      records.map((r) => r.total).sort((a, b) => a - b),
      [78, 90]
    );
  });
});

test('쓰기가 불가능해도 예외를 던지지 않고 false를 반환한다', () => {
  const previous = process.env.SCORING_LEDGER;
  // 디렉터리를 파일 경로로 쓰게 만들어 쓰기를 실패시킨다.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoring-test-'));
  process.env.SCORING_LEDGER = dir;

  try {
    let result;
    assert.doesNotThrow(() => {
      result = ledger.append(SAMPLE);
    });
    assert.strictEqual(result, false);
  } finally {
    if (previous === undefined) delete process.env.SCORING_LEDGER;
    else process.env.SCORING_LEDGER = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sinceDays로 기간을 거를 수 있다', () => {
  withTempLedger((file) => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(file, JSON.stringify({ ...SAMPLE, ts: old, total: 40 }) + '\n', 'utf8');
    ledger.append({ ...SAMPLE, total: 88 });

    assert.strictEqual(ledger.read().length, 2);
    assert.strictEqual(ledger.read({ sinceDays: 30 }).length, 1);
    assert.strictEqual(ledger.read({ sinceDays: 30 })[0].total, 88);
  });
});

test('kind와 source로 거를 수 있다', () => {
  withTempLedger(() => {
    ledger.append({ ...SAMPLE, kind: 'prompt', source: 'hook' });
    ledger.append({ ...SAMPLE, kind: 'prompt', source: 'skill' });
    ledger.append({ ...SAMPLE, kind: 'doc', source: 'skill' });

    assert.strictEqual(ledger.read({ source: 'hook' }).length, 1);
    assert.strictEqual(ledger.read({ source: 'skill' }).length, 2);
    assert.strictEqual(ledger.read({ kind: 'doc' }).length, 1);
    assert.strictEqual(ledger.read({ kind: 'prompt', source: 'skill' }).length, 1);
  });
});

test('기록은 오래된 것부터 정렬된다', () => {
  withTempLedger((file) => {
    const t = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
    fs.writeFileSync(
      file,
      [
        JSON.stringify({ ...SAMPLE, ts: t(1), total: 90 }),
        JSON.stringify({ ...SAMPLE, ts: t(5), total: 70 }),
        JSON.stringify({ ...SAMPLE, ts: t(3), total: 80 }),
      ].join('\n') + '\n',
      'utf8'
    );

    assert.deepStrictEqual(
      ledger.read().map((r) => r.total),
      [70, 80, 90]
    );
  });
});
