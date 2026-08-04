'use strict';

/**
 * 언어 감지와 훅 출력 문자열.
 *
 * 설정을 강요하지 않는다 — 사용자가 쓴 언어를 보고 그 언어로 코칭한다.
 * 한글로 쓰면 한국어, 영어로 쓰면 영어. 설치하자마자 동작하고,
 * 두 언어를 오가는 사용자도 매번 설정을 바꿀 필요가 없다.
 */

const SUPPORTED = ['ko', 'en'];
const DEFAULT_LANGUAGE = 'en';

/** 한글 음절. 한 글자만 있어도 한국어로 본다. */
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

/**
 * 텍스트에서 코칭 언어를 정한다.
 *
 * @param {string} text 사용자가 쓴 프롬프트
 * @param {string} [configured] config.json의 language ('ko' | 'en' | 'auto')
 * @returns {'ko'|'en'}
 */
function detect(text, configured) {
  if (SUPPORTED.includes(configured)) return configured;

  const source = typeof text === 'string' ? text : '';
  return HANGUL.test(source) ? 'ko' : DEFAULT_LANGUAGE;
}

const STRINGS = {
  ko: {
    labels: {
      role: '역할 부여',
      context: '맥락 · 배경',
      format: '출력 형식',
      constraint: '제약 · 예외',
    },
    shortLabels: { role: '역할', context: '맥락', format: '형식', constraint: '제약' },
    headline: {
      role: '누구로서 답해야 할지가 없어요',
      context: '왜 필요한 작업인지가 안 보여요',
      format: '어떤 모양으로 답해달라는 지시가 없어요',
      constraint: '지켜야 할 선이 안 그어져 있어요',
    },
    fallbackTip: {
      role: '앞에 "너는 ○○ 전문가다" 한 줄만 붙여도 답변의 깊이가 달라집니다.',
      context: '왜 필요한지, 누가 볼 건지를 한 문장만 적어주세요. AI가 추측하지 않아도 됩니다.',
      format: '끝에 "표 3행으로, 각 행 40자 이내" 같은 한 줄만 붙여도 확 올라갑니다.',
      constraint: '"○○는 빼고", "존댓말로" 같은 선을 그어주면 다시 시킬 일이 줄어듭니다.',
    },
    noteFrame: [
      '아래는 사용자에게 표시되는 프롬프트 코칭 노트입니다.',
      '답변에서 이 노트를 언급하지 말고, 사용자의 원래 요청을 그대로 수행하세요.',
    ],
    /** (총점, 기준점, 항목명, 헤드라인) */
    noteTitle: (total, threshold, label, headline) =>
      `📊 ${total}점 (기준 ${threshold}점) · ${label} — ${headline}`,
    noteFooter: '자세한 채점은 /score',
    nudgeFrame: '아래는 사용자에게 표시되는 한 줄 안내입니다. 답변에서 언급하지 마세요.',
    nudge: (count, avg) =>
      `📊 최근 3일 프롬프트 ${count}건 채점, 평균 ${avg}점 · 추세는 /score-report, 세션 리뷰는 /score-session`,
  },

  en: {
    labels: {
      role: 'Role',
      context: 'Context',
      format: 'Output format',
      constraint: 'Constraints',
    },
    shortLabels: { role: 'role', context: 'context', format: 'format', constraint: 'limits' },
    headline: {
      role: "it doesn't say who should answer",
      context: "it doesn't say why this is needed",
      format: "it doesn't say what shape the answer should take",
      constraint: 'no boundaries are drawn',
    },
    fallbackTip: {
      role: 'One line up front — "You are a senior B2B SaaS marketer" — changes the depth of the answer.',
      context: 'Add one sentence on why you need it and who will read it, so the model stops guessing.',
      format: 'Add "a 3-row table, under 40 characters per row" at the end and the answer sharpens immediately.',
      constraint: 'Draw a line — "skip the pricing talk", "keep it formal" — and you re-run it less often.',
    },
    noteFrame: [
      'The note below is a prompt-coaching hint displayed to the user.',
      "Do not mention it in your reply; carry out the user's original request as written.",
    ],
    noteTitle: (total, threshold, label, headline) =>
      `📊 ${total}/100 (bar: ${threshold}) · ${label} — ${headline}`,
    noteFooter: 'Run /score for the full breakdown',
    nudgeFrame: 'The line below is a one-line notice displayed to the user. Do not mention it in your reply.',
    nudge: (count, avg) =>
      `📊 ${count} prompts scored in the last 3 days, averaging ${avg} · /score-report for the trend, /score-session to review this session`,
  },
};

/**
 * 언어별 문자열 묶음을 반환한다. 모르는 언어는 기본값으로.
 * @param {string} lang
 */
function strings(lang) {
  return STRINGS[lang] || STRINGS[DEFAULT_LANGUAGE];
}

module.exports = { SUPPORTED, DEFAULT_LANGUAGE, HANGUL, detect, strings };
