'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { DEFAULT_WEIGHTS } = require('./heuristics');
const config = require('./config');

/**
 * rubrics/*.md에서 훅이 쓸 설정(임계값·배점)을 뽑는다.
 *
 * 채점 기준의 단일 출처는 마크다운이다. 로직(JS)과 기준(md)을 분리해서,
 * 기준을 바꿀 사람이 JS를 건드리지 않아도 되게 한다.
 *
 * 파일이 없거나 깨졌으면 내장 기본값으로 진행한다. 예외를 던지지 않는다.
 */

const RUBRIC_DIR = path.join(__dirname, '..', '..', 'rubrics');

const DEFAULT_PROMPT_CONFIG = {
  threshold: config.DEFAULTS.threshold,
  weights: { ...DEFAULT_WEIGHTS },
};

/**
 * 마크다운에서 첫 번째 ```json 펜스를 찾아 파싱한다.
 * @param {string} markdown
 * @returns {object|null}
 */
function extractJsonBlock(markdown) {
  const match = markdown.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * 언어별 rubric 파일 경로를 찾는다.
 *
 * `rubrics/<lang>/<name>.md`를 우선 보고, 없으면 `rubrics/<name>.md`로 물러난다.
 * 후자는 0.4.x 이전 구조로, 그때 파일을 직접 고쳐 쓰던 사용자를 깨뜨리지 않기 위한 통로다.
 *
 * @param {string} name 확장자 없는 파일명 (prompt | session | doc | tips)
 * @param {string} [lang]
 * @param {string} [rubricDir]
 * @returns {string|null} 존재하는 경로, 없으면 null
 */
function resolve(name, lang = 'ko', rubricDir = RUBRIC_DIR) {
  const candidates = [
    path.join(rubricDir, lang, `${name}.md`),
    path.join(rubricDir, `${name}.md`),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // 다음 후보로
    }
  }
  return null;
}

/**
 * 프롬프트 채점 설정을 로드한다.
 *
 * 우선순위: 사용자 config.json의 threshold > rubrics/<lang>/prompt.md > 내장 기본값
 *
 * @param {string} [lang]
 * @param {string} [rubricDir] 테스트용 오버라이드
 * @returns {{threshold: number, weights: Record<string, number>}}
 */
function loadPromptConfig(lang = 'ko', rubricDir = RUBRIC_DIR) {
  const result = {
    threshold: DEFAULT_PROMPT_CONFIG.threshold,
    weights: { ...DEFAULT_PROMPT_CONFIG.weights },
  };

  try {
    const file = resolve('prompt', lang, rubricDir);
    const markdown = fs.readFileSync(file, 'utf8');
    const block = extractJsonBlock(markdown);

    if (block) {
      if (Number.isFinite(block.threshold)) {
        result.threshold = Math.min(100, Math.max(0, block.threshold));
      }
      if (block.weights && typeof block.weights === 'object') {
        for (const dim of Object.keys(result.weights)) {
          if (Number.isFinite(block.weights[dim])) {
            result.weights[dim] = Math.max(0, block.weights[dim]);
          }
        }
      }
    }
  } catch {
    // rubric 파일이 없어도 동작해야 한다.
  }

  // 사용자가 config.json에서 임계값을 직접 정했다면 그쪽이 우선이다.
  const userConfig = config.load();
  if (userConfig.threshold !== config.DEFAULTS.threshold) {
    result.threshold = userConfig.threshold;
  }

  return result;
}

/**
 * 특정 항목의 개선 팁을 tips.md에서 꺼낸다.
 * 훅 출력에 한 줄 붙이는 용도다.
 *
 * 블록에 줄이 여러 개면 날짜에 따라 순환한다 — 매일 같은 문구가 뜨면
 * 광고 배너처럼 무시되기 때문이다. 같은 날에는 같은 팁이 나온다 (결정론 유지).
 *
 * @param {string} dimension role | context | format | constraint
 * @param {string} [lang]
 * @param {number} [dayIndex] 테스트용 오버라이드. 기본은 오늘 날짜 기반.
 * @param {string} [rubricDir]
 * @returns {string|null}
 */
function loadTip(dimension, lang = 'ko', dayIndex, rubricDir = RUBRIC_DIR) {
  try {
    const file = resolve('tips', lang, rubricDir);
    const markdown = fs.readFileSync(file, 'utf8');
    const pattern = new RegExp(`<!--\\s*tip:${dimension}\\s*-->\\s*\\n([\\s\\S]*?)\\n<!--\\s*/tip\\s*-->`);
    const match = markdown.match(pattern);
    if (!match) return null;

    const lines = match[1]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return null;

    const day = Number.isFinite(dayIndex)
      ? dayIndex
      : Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    return lines[((day % lines.length) + lines.length) % lines.length];
  } catch {
    return null;
  }
}

module.exports = {
  RUBRIC_DIR,
  DEFAULT_PROMPT_CONFIG,
  resolve,
  loadPromptConfig,
  loadTip,
  extractJsonBlock,
};
