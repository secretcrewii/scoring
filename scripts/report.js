#!/usr/bin/env node
'use strict';

/**
 * 채점 기록 집계. /score-report 스킬이 호출한다.
 *
 * CLI로 실행하면 요약을 JSON으로 출력한다:
 *   node scripts/report.js
 */

const ledger = require('./lib/ledger');
const { DIMENSIONS } = require('./lib/heuristics');

function average(numbers) {
  if (numbers.length === 0) return null;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round((sum / numbers.length) * 10) / 10;
}

function withinDays(records, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter((r) => Date.parse(r.ts) >= cutoff);
}

/**
 * 항목별 평균을 구한다.
 * @param {object[]} records
 * @returns {Record<string, number|null>}
 */
function dimensionAverages(records) {
  const result = {};
  for (const dim of DIMENSIONS) {
    const values = records
      .map((r) => (r.dims ? r.dims[dim] : undefined))
      .filter((v) => Number.isFinite(v));
    result[dim] = average(values);
  }
  return result;
}

/**
 * 가장 자주 무너지는 항목. 각 기록에서 최저 항목을 세어 가장 많이 나온 것을 고른다.
 * 동점이면 DIMENSIONS 순서상 앞선 항목을 택한다.
 * @param {object[]} records
 * @returns {{dim: string, count: number}|null}
 */
function mostFrequentWeakness(records) {
  const counts = Object.fromEntries(DIMENSIONS.map((d) => [d, 0]));
  let scored = 0;

  for (const record of records) {
    if (!record.dims) continue;
    let weakest = null;
    for (const dim of DIMENSIONS) {
      const value = record.dims[dim];
      if (!Number.isFinite(value)) continue;
      if (weakest === null || value < record.dims[weakest]) weakest = dim;
    }
    if (weakest) {
      counts[weakest] += 1;
      scored += 1;
    }
  }

  if (scored === 0) return null;

  let top = DIMENSIONS[0];
  for (const dim of DIMENSIONS) {
    if (counts[dim] > counts[top]) top = dim;
  }
  return { dim: top, count: counts[top] };
}

/**
 * 최근 30일을 반으로 갈라 앞뒤 평균을 비교한다.
 * @param {object[]} records 30일 이내 기록
 * @returns {{earlier: number|null, later: number|null, delta: number|null}}
 */
function trend(records) {
  if (records.length < 4) return { earlier: null, later: null, delta: null };

  const midpoint = Math.floor(records.length / 2);
  const earlier = average(records.slice(0, midpoint).map((r) => r.total));
  const later = average(records.slice(midpoint).map((r) => r.total));

  const delta =
    earlier === null || later === null ? null : Math.round((later - earlier) * 10) / 10;

  return { earlier, later, delta };
}

/**
 * 기록 전체를 요약한다.
 * @param {object[]} records
 * @returns {object}
 */
function summarize(records) {
  const last7 = withinDays(records, 7);
  const last30 = withinDays(records, 30);

  return {
    count: records.length,
    count7: last7.length,
    count30: last30.length,
    avg7: average(last7.map((r) => r.total)),
    avg30: average(last30.map((r) => r.total)),
    avgAll: average(records.map((r) => r.total)),
    byDim: dimensionAverages(last30),
    weakest: mostFrequentWeakness(last30),
    trend: trend(last30),
    firstSeen: records.length > 0 ? records[0].ts : null,
    lastSeen: records.length > 0 ? records[records.length - 1].ts : null,
  };
}

/** 기록 출처를 나눠 각각 요약한다. 휴리스틱 점수와 정독 점수를 섞으면 안 된다. */
function buildReport() {
  const all = ledger.read();
  return {
    ledger: ledger.ledgerPath(),
    hook: summarize(all.filter((r) => r.source === 'hook')),
    skill: summarize(all.filter((r) => r.source === 'skill')),
  };
}

if (require.main === module) {
  let output;
  try {
    output = buildReport();
  } catch (error) {
    output = { error: String((error && error.message) || error) };
  }
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

module.exports = {
  average,
  withinDays,
  dimensionAverages,
  mostFrequentWeakness,
  trend,
  summarize,
  buildReport,
};
