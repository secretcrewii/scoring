#!/usr/bin/env node
'use strict';

/**
 * SessionStart 훅: 하루 한 번, 채점 현황 한 줄 리마인더.
 *
 * 조건이 다 맞을 때만 말한다:
 *  - 플러그인 켜져 있고 dailyNudge가 true
 *  - 최근 20시간 안에 리마인더를 띄운 적 없음
 *  - 최근 3일간 채점 기록이 5건 이상 (쓸 얘기가 있을 때만)
 *
 * 무슨 일이 있어도 exit 0.
 */

const config = require('./lib/config');
const ledger = require('./lib/ledger');
const state = require('./lib/state');
const i18n = require('./lib/i18n');

/**
 * 안내 언어를 정한다. 설정이 auto면 최근 채점 기록에 남은 언어를 따른다 —
 * 세션 시작 시점에는 아직 프롬프트가 없어서 감지할 대상이 없기 때문이다.
 */
function nudgeLanguage(records, configured) {
  if (i18n.SUPPORTED.includes(configured)) return configured;

  const korean = records.filter((r) => r.lang === 'ko').length;
  const english = records.filter((r) => r.lang === 'en').length;
  if (korean === 0 && english === 0) return i18n.DEFAULT_LANGUAGE;
  return korean >= english ? 'ko' : 'en';
}

function main() {
  const settings = config.load();
  if (!config.isEnabled()) return;
  if (!settings.dailyNudge) return;
  if (state.within('lastNudgeAt', 20 * 60)) return;

  const records = ledger.read({ sinceDays: 3 });
  if (records.length < 5) return;

  const totals = records.map((r) => r.total).filter(Number.isFinite);
  const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);

  const s = i18n.strings(nudgeLanguage(records, settings.language));

  process.stdout.write(
    [
      '<scoring-nudge>',
      s.nudgeFrame,
      '',
      s.nudge(records.length, avg),
      '</scoring-nudge>',
    ].join('\n') + '\n'
  );

  state.mark('lastNudgeAt');
}

try {
  main();
} catch {
  // 리마인더 때문에 세션 시작이 방해받으면 안 된다.
}
process.exitCode = 0;
