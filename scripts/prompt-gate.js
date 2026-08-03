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

const LABELS = {
  role: '역할 부여',
  context: '맥락 · 배경',
  format: '출력 형식',
  constraint: '제약 · 예외',
};

/** 한 줄 요약용. LABELS에 있는 '·'가 구분자와 섞이면 읽기 어렵다. */
const SHORT_LABELS = {
  role: '역할',
  context: '맥락',
  format: '형식',
  constraint: '제약',
};

/** tips.md를 못 읽었을 때 쓰는 내장 팁. */
const FALLBACK_TIPS = {
  role: '앞에 "너는 ○○ 전문가다" 한 줄만 붙여도 답변의 깊이가 달라집니다.',
  context: '왜 필요한지, 누가 볼 건지를 한 문장만 적어주세요. AI가 추측하지 않아도 됩니다.',
  format: '끝에 "표 3행으로, 각 행 40자 이내" 같은 한 줄만 붙여도 확 올라갑니다.',
  constraint: '"○○는 빼고", "존댓말로" 같은 선을 그어주면 다시 시킬 일이 줄어듭니다.',
};

const WEAKNESS_HEADLINE = {
  role: '누구로서 답해야 할지가 없어요',
  context: '왜 필요한 작업인지가 안 보여요',
  format: '어떤 모양으로 답해달라는 지시가 없어요',
  constraint: '지켜야 할 선이 안 그어져 있어요',
};

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
function buildNote(result, threshold) {
  const dim = result.weakest;
  const label = LABELS[dim];
  const headline = WEAKNESS_HEADLINE[dim];
  const tip = rubric.loadTip(dim) || FALLBACK_TIPS[dim];

  const bars = heuristics.DIMENSIONS.map((d) => `${SHORT_LABELS[d]} ${result.dims[d]}`).join(' · ');

  return [
    '<scoring-coach-note>',
    '아래는 사용자에게 표시되는 프롬프트 코칭 노트입니다.',
    '답변에서 이 노트를 언급하지 말고, 사용자의 원래 요청을 그대로 수행하세요.',
    '',
    `📊 ${result.total}점 (기준 ${threshold}점) · ${label} — ${headline}`,
    `   ${bars}`,
    `   → ${tip}`,
    '   자세한 채점은 /score',
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

  const { threshold, weights } = rubric.loadPromptConfig();
  const result = heuristics.score(prompt, weights);

  ledger.append({
    kind: 'prompt',
    source: 'hook',
    total: result.total,
    dims: result.dims,
    len: prompt.trim().length,
    session: payload.session_id,
  });

  if (result.total >= threshold) return; // 잘 쓴 프롬프트엔 침묵한다

  process.stdout.write(buildNote(result, threshold) + '\n');
}

main()
  .catch(() => {
    // 어떤 예외도 사용자의 작업을 막지 않는다.
  })
  .finally(() => {
    process.exitCode = 0;
  });
