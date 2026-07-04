import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLine } from '../dist/render.js';
import { DEFAULT_CONFIG } from '../dist/config.js';
import { stripAnsi } from '../dist/ansi.js';

const data = {
  contextTokens: 124000,
  contextLimit: 200000,
  modelName: 'Opus 4.8',
  gitBranch: 'main',
  costUsd: 1.42,
  durationMs: 23 * 60000
};

test('renders all default segments joined by separator', () => {
  assert.equal(
    stripAnsi(renderLine(data, DEFAULT_CONFIG)),
    '▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · main · $1.42 · 23m'
  );
});

test('skips segments with missing data', () => {
  const line = stripAnsi(renderLine({ ...data, gitBranch: null, costUsd: null }, DEFAULT_CONFIG));
  assert.equal(line, '▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · 23m');
});

test('respects segment order and skips unknown names', () => {
  const cfg = { ...DEFAULT_CONFIG, segments: ['model', 'wat', 'context'] };
  assert.equal(stripAnsi(renderLine(data, cfg)), 'Opus 4.8 · ▓▓▓▓▓▓░░░░ 62%');
});
