#!/usr/bin/env node
'use strict';

/**
 * UserPromptSubmit 훅 진입점.
 *
 * 조율만 한다 — 채점 지식은 lib/heuristics.js에 있다.
 *
 * 흐름:
 *   stdin JSON → on/off 확인 → 스킵 판단 → 채점 → 임계값 이상이면 침묵
 *                                              → 미만이면 가장 약한 항목 하나만 지적
 *              → ledger 적재 → exit 0
 *
 * 무슨 일이 있어도 exit 0이다. 채점 도구 때문에 사용자의 작업이 멈추면 안 된다.
 */

const heuristics = require('./lib/heuristics');
const rubric = require('./lib/rubric');
const ledger = require('./lib/ledger');
const config = require('./lib/config');
const state = require('./lib/state');
const i18n = require('./lib/i18n');

/** stdin을 끝까지 읽는다. */
function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    // stdin이 없는 환경(수동 실행 등)에서 매달리지 않도록 방어한다.
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

/**
 * 코칭 노트를 만든다.
 *
 * 훅의 stdout은 사용자에게 보이는 동시에 Claude의 컨텍스트에도 들어간다.
 * 감싸지 않으면 Claude가 매 턴 "프롬프트를 다시 써주세요"라고 반응하며
 * 원래 작업을 하지 않는다. 그래서 명시적으로 무시하라고 지시한다.
 */
function buildNote(result, threshold, lang) {
  const s = i18n.strings(lang);
  const dim = result.weakest;
  const tip = rubric.loadTip(dim, lang) || s.fallbackTip[dim];

  const bars = heuristics.DIMENSIONS.map((d) => `${s.shortLabels[d]} ${result.dims[d]}`).join(' · ');

  return [
    '<scoring-coach-note>',
    ...s.noteFrame,
    '',
    s.noteTitle(result.total, threshold, s.labels[dim], s.headline[dim]),
    `   ${bars}`,
    `   → ${tip}`,
    `   ${s.noteFooter}`,
    '</scoring-coach-note>',
  ].join('\n');
}

async function main() {
  if (!config.isEnabled()) return;

  const raw = await readStdin();
  if (!raw.trim()) return;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return; // 깨진 입력은 조용히 통과시킨다
  }

  const prompt = payload && typeof payload.prompt === 'string' ? payload.prompt : '';
  if (heuristics.shouldSkip(prompt)) return;

  const settings = config.load();
  const lang = i18n.detect(prompt, settings.language);
  const { threshold, weights } = rubric.loadPromptConfig(lang);
  const result = heuristics.score(prompt, weights);

  ledger.append({
    kind: 'prompt',
    source: 'hook',
    total: result.total,
    dims: result.dims,
    len: prompt.trim().length,
    lang,
    session: payload.session_id,
  });

  if (result.total >= threshold) return; // 잘 쓴 프롬프트엔 침묵한다

  // 잔소리 방지: 최근에 노트를 띄웠으면 이번엔 참는다 (기록은 위에서 이미 남겼다).
  if (state.within('lastNoteAt', settings.cooldownMinutes)) return;

  process.stdout.write(buildNote(result, threshold, lang) + '\n');
  state.mark('lastNoteAt');
}

main()
  .catch(() => {
    // 어떤 예외도 사용자의 작업을 막지 않는다.
  })
  .finally(() => {
    process.exitCode = 0;
  });
