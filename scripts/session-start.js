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

function main() {
  if (!config.isEnabled()) return;
  if (!config.load().dailyNudge) return;
  if (state.within('lastNudgeAt', 20 * 60)) return;

  const records = ledger.read({ sinceDays: 3 });
  if (records.length < 5) return;

  const totals = records.map((r) => r.total).filter(Number.isFinite);
  const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);

  process.stdout.write(
    [
      '<scoring-nudge>',
      '아래는 사용자에게 표시되는 한 줄 안내입니다. 답변에서 언급하지 마세요.',
      '',
      `📊 최근 3일 프롬프트 ${records.length}건 채점, 평균 ${avg}점 · 추세는 /score-report, 세션 리뷰는 /score-session`,
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
