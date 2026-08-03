'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { dataDir } = require('./config');

/**
 * 훅이 쓰는 작은 상태 저장소 (~/.claude/scoring/state.json).
 * 쿨다운(lastNoteAt)과 일일 리마인더(lastNudgeAt) 기록용.
 *
 * 어떤 실패도 밖으로 던지지 않는다 — 상태 파일 때문에 훅이 죽으면 안 된다.
 */

function statePath() {
  return path.join(dataDir(), 'state.json');
}

/** 상태를 읽는다. 없거나 깨졌으면 빈 객체. */
function read() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** 상태를 병합 저장한다. 실패해도 조용히 넘어간다. */
function write(patch) {
  try {
    const merged = { ...read(), ...patch };
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(statePath(), JSON.stringify(merged), 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * 마지막 이벤트에서 아직 쿨다운 시간이 안 지났는지 확인한다.
 * @param {string} key 상태 키 (예: 'lastNoteAt')
 * @param {number} minutes 쿨다운 길이(분). 0 이하면 쿨다운 없음.
 * @returns {boolean}
 */
function within(key, minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return false;

  const last = Date.parse(read()[key]);
  if (Number.isNaN(last)) return false;

  return Date.now() - last < minutes * 60 * 1000;
}

/** 이벤트 시각을 지금으로 기록한다. */
function mark(key) {
  return write({ [key]: new Date().toISOString() });
}

module.exports = { statePath, read, write, within, mark };
