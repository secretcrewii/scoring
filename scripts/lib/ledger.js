'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { dataDir } = require('./config');

/**
 * 채점 기록 적재·조회 (JSONL).
 *
 * 프롬프트 원문은 저장하지 않는다. 점수와 길이만 남긴다.
 * 대표의 프롬프트에는 회사 내부 정보가 들어갈 수 있고,
 * 그것이 평문으로 수개월간 디스크에 쌓이는 구조는 만들지 않는다.
 *
 * 쓰기 실패는 절대 밖으로 던지지 않는다 — 기록 때문에 작업이 멈추면 안 된다.
 */

function ledgerPath() {
  if (process.env.SCORING_LEDGER) return process.env.SCORING_LEDGER;
  return path.join(dataDir(), 'ledger.jsonl');
}

/**
 * 채점 결과 한 건을 적재한다.
 *
 * @param {object} record
 * @param {'prompt'|'session'|'doc'} record.kind
 * @param {'hook'|'skill'} record.source
 * @param {number} record.total
 * @param {Record<string, number>} record.dims
 * @param {number} [record.len] 원문 길이 (원문 자체는 저장하지 않는다)
 * @param {string} [record.session]
 * @returns {boolean} 적재 성공 여부
 */
function append(record) {
  try {
    const file = ledgerPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      kind: record.kind,
      source: record.source,
      total: record.total,
      dims: record.dims,
      len: record.len,
      session: record.session,
    });

    fs.appendFileSync(file, line + '\n', 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * 기록을 읽는다. 손상된 줄은 조용히 건너뛴다.
 *
 * @param {object} [options]
 * @param {number} [options.sinceDays] 지정하면 그 기간 내 기록만 반환
 * @param {'prompt'|'session'|'doc'} [options.kind]
 * @param {'hook'|'skill'} [options.source]
 * @returns {object[]} 오래된 것부터 정렬된 기록
 */
function read(options = {}) {
  let raw;
  try {
    raw = fs.readFileSync(ledgerPath(), 'utf8');
  } catch {
    return [];
  }

  const cutoff = Number.isFinite(options.sinceDays)
    ? Date.now() - options.sinceDays * 24 * 60 * 60 * 1000
    : null;

  const records = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let record;
    try {
      record = JSON.parse(trimmed);
    } catch {
      continue; // 손상된 줄은 버린다
    }

    if (!record || typeof record.total !== 'number' || typeof record.ts !== 'string') continue;

    const time = Date.parse(record.ts);
    if (Number.isNaN(time)) continue;
    if (cutoff !== null && time < cutoff) continue;

    if (options.kind && record.kind !== options.kind) continue;
    if (options.source && record.source !== options.source) continue;

    records.push(record);
  }

  records.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  return records;
}

module.exports = { ledgerPath, append, read };
