'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  average,
  withinDays,
  dimensionAverages,
  mostFrequentWeakness,
  trend,
  summarize,
} = require('../scripts/report');

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

function record(overrides = {}) {
  return {
    ts: daysAgo(1),
    kind: 'prompt',
    source: 'hook',
    total: 75,
    dims: { role: 20, context: 20, format: 20, constraint: 15 },
    ...overrides,
  };
}

test('average는 빈 배열에 null을 반환한다', () => {
  assert.strictEqual(average([]), null);
  assert.strictEqual(average([80]), 80);
  assert.strictEqual(average([70, 80]), 75);
  assert.strictEqual(average([70, 75, 81]), 75.3); // 소수 첫째 자리 반올림
});

test('withinDays는 기간 밖 기록을 제외한다', () => {
  const records = [record({ ts: daysAgo(2) }), record({ ts: daysAgo(20) }), record({ ts: daysAgo(60) })];

  assert.strictEqual(withinDays(records, 7).length, 1);
  assert.strictEqual(withinDays(records, 30).length, 2);
  assert.strictEqual(withinDays(records, 365).length, 3);
});

test('dimensionAverages는 항목별 평균을 낸다', () => {
  const records = [
    record({ dims: { role: 10, context: 20, format: 0, constraint: 25 } }),
    record({ dims: { role: 20, context: 20, format: 10, constraint: 15 } }),
  ];

  const averages = dimensionAverages(records);
  assert.strictEqual(averages.role, 15);
  assert.strictEqual(averages.context, 20);
  assert.strictEqual(averages.format, 5);
  assert.strictEqual(averages.constraint, 20);
});

test('dimensionAverages는 dims 없는 기록을 무시한다', () => {
  const averages = dimensionAverages([record({ dims: undefined }), record()]);
  assert.strictEqual(averages.role, 20);
});

test('mostFrequentWeakness는 가장 자주 최저인 항목을 고른다', () => {
  const records = [
    record({ dims: { role: 20, context: 20, format: 5, constraint: 20 } }),
    record({ dims: { role: 25, context: 20, format: 8, constraint: 20 } }),
    record({ dims: { role: 3, context: 20, format: 20, constraint: 20 } }),
  ];

  const result = mostFrequentWeakness(records);
  assert.strictEqual(result.dim, 'format');
  assert.strictEqual(result.count, 2);
});

test('mostFrequentWeakness는 기록이 없으면 null을 반환한다', () => {
  assert.strictEqual(mostFrequentWeakness([]), null);
  assert.strictEqual(mostFrequentWeakness([record({ dims: undefined })]), null);
});

test('trend는 앞뒤 절반의 평균 차이를 낸다', () => {
  const records = [
    record({ total: 60 }),
    record({ total: 60 }),
    record({ total: 80 }),
    record({ total: 80 }),
  ];

  const result = trend(records);
  assert.strictEqual(result.earlier, 60);
  assert.strictEqual(result.later, 80);
  assert.strictEqual(result.delta, 20);
});

test('trend는 기록이 4건 미만이면 판단하지 않는다', () => {
  const result = trend([record(), record(), record()]);
  assert.strictEqual(result.delta, null);
  assert.strictEqual(result.earlier, null);
});

test('summarize는 기간별 평균과 약점을 함께 낸다', () => {
  const records = [
    record({ ts: daysAgo(25), total: 60, dims: { role: 15, context: 15, format: 10, constraint: 20 } }),
    record({ ts: daysAgo(20), total: 64, dims: { role: 18, context: 16, format: 10, constraint: 20 } }),
    record({ ts: daysAgo(3), total: 88, dims: { role: 24, context: 22, format: 20, constraint: 22 } }),
    record({ ts: daysAgo(1), total: 92, dims: { role: 25, context: 23, format: 22, constraint: 22 } }),
  ];

  const summary = summarize(records);

  assert.strictEqual(summary.count, 4);
  assert.strictEqual(summary.count7, 2);
  assert.strictEqual(summary.count30, 4);
  assert.strictEqual(summary.avg7, 90);
  assert.strictEqual(summary.avg30, 76);
  assert.strictEqual(summary.weakest.dim, 'format');
  assert.strictEqual(summary.trend.delta, 28);
  assert.ok(summary.firstSeen);
  assert.ok(summary.lastSeen);
});

test('summarize는 빈 기록에도 죽지 않는다', () => {
  const summary = summarize([]);

  assert.strictEqual(summary.count, 0);
  assert.strictEqual(summary.avg7, null);
  assert.strictEqual(summary.avg30, null);
  assert.strictEqual(summary.weakest, null);
  assert.strictEqual(summary.firstSeen, null);
  assert.strictEqual(summary.trend.delta, null);
});

test('30일 밖 기록은 항목 평균과 약점 판정에서 빠진다', () => {
  const summary = summarize([
    record({ ts: daysAgo(90), dims: { role: 0, context: 0, format: 25, constraint: 25 } }),
    record({ ts: daysAgo(2), dims: { role: 25, context: 25, format: 0, constraint: 25 } }),
  ]);

  assert.strictEqual(summary.count, 2);
  assert.strictEqual(summary.count30, 1);
  assert.strictEqual(summary.weakest.dim, 'format', '오래된 기록이 약점 판정에 섞였다');
  assert.strictEqual(summary.byDim.role, 25);
});
