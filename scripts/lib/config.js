'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * 플러그인 on/off 및 사용자 설정.
 *
 * 설정 파일은 선택 사항이다. 없으면 전부 기본값으로 동작한다.
 * 어떤 실패도 밖으로 던지지 않는다 — 설정 때문에 훅이 죽으면 안 된다.
 */

const DEFAULTS = {
  enabled: true,
  threshold: 75,
};

/** 사용자 데이터 디렉터리. 플러그인 폴더 바깥이라 플러그인을 업데이트해도 살아남는다. */
function dataDir() {
  if (process.env.SCORING_HOME) return process.env.SCORING_HOME;
  return path.join(os.homedir(), '.claude', 'scoring');
}

function configPath() {
  return path.join(dataDir(), 'config.json');
}

/** 환경변수로 끈 상태인지 확인한다. */
function offByEnv() {
  const raw = process.env.SCORING_OFF;
  if (!raw) return false;
  const value = String(raw).trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

/**
 * 설정 파일을 읽는다. 없거나 깨졌으면 기본값을 반환한다.
 * @returns {{enabled: boolean, threshold: number}}
 */
function load() {
  const config = { ...DEFAULTS };

  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    const parsed = JSON.parse(raw);

    if (typeof parsed.enabled === 'boolean') config.enabled = parsed.enabled;
    if (Number.isFinite(parsed.threshold)) {
      config.threshold = Math.min(100, Math.max(0, parsed.threshold));
    }
  } catch {
    // 파일이 없는 것이 정상 경로다. 깨진 경우에도 기본값으로 계속 간다.
  }

  return config;
}

/**
 * 훅이 동작해야 하는지 판단한다. 환경변수가 설정 파일보다 우선한다.
 * @returns {boolean}
 */
function isEnabled() {
  if (offByEnv()) return false;
  return load().enabled;
}

module.exports = { DEFAULTS, dataDir, configPath, load, isEnabled, offByEnv };
