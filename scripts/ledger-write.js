#!/usr/bin/env node
'use strict';

/**
 * 스킬이 채점 결과를 기록할 때 쓰는 CLI 래퍼.
 *
 *   node scripts/ledger-write.js --kind prompt --source skill --total 78 \
 *        --role 20 --context 20 --format 10 --constraint 18 --len 240
 *
 * 어떤 경우에도 exit 0이다. 기록 실패 때문에 스킬이 멈추면 안 된다.
 */

const ledger = require('./lib/ledger');
const { DIMENSIONS } = require('./lib/heuristics');

const VALID_KINDS = new Set(['prompt', 'session', 'doc']);
const VALID_SOURCES = new Set(['hook', 'skill']);

/** `--key value` 형태의 인자를 객체로 만든다. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function toScore(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const kind = VALID_KINDS.has(args.kind) ? args.kind : 'prompt';
  const source = VALID_SOURCES.has(args.source) ? args.source : 'skill';

  const dims = {};
  for (const dim of DIMENSIONS) {
    const value = toScore(args[dim]);
    if (value !== null) dims[dim] = value;
  }

  let total = toScore(args.total);
  if (total === null) {
    const values = Object.values(dims);
    total = values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
  }

  if (total === null) {
    process.stdout.write('skipped: no score given\n');
    return;
  }

  const rawLen = Number(args.len);
  const len = Number.isFinite(rawLen) ? Math.max(0, Math.round(rawLen)) : undefined;

  const ok = ledger.append({
    kind,
    source,
    total,
    dims: Object.keys(dims).length > 0 ? dims : undefined,
    len,
    session: typeof args.session === 'string' ? args.session : undefined,
  });

  process.stdout.write(ok ? 'recorded\n' : 'not recorded\n');
}

try {
  main();
} catch {
  process.stdout.write('not recorded\n');
}

process.exitCode = 0;
