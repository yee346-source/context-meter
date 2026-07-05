import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../dist/config.js';
import { stripAnsi } from '../dist/ansi.js';
import { contextSegment } from '../dist/segments/context.js';
import { tokensSegment, compactTokens } from '../dist/segments/tokens.js';
import { modelSegment } from '../dist/segments/model.js';
import { costSegment } from '../dist/segments/cost.js';
import { durationSegment } from '../dist/segments/duration.js';

const data = (overrides = {}) => ({
  contextTokens: 124000,
  contextLimit: 200000,
  modelName: 'Opus 4.8',
  gitBranch: 'main',
  costUsd: 1.42,
  durationMs: 23 * 60000,
  ...overrides
});

test('context segment renders bar and percent', () => {
  assert.equal(stripAnsi(contextSegment(data(), DEFAULT_CONFIG)), '▓▓▓▓▓▓░░░░ 62%');
});

test('context segment picks color by threshold', () => {
  assert.ok(contextSegment(data({ contextTokens: 40000 }), DEFAULT_CONFIG).includes('\x1b[32m'));
  assert.ok(contextSegment(data(), DEFAULT_CONFIG).includes('\x1b[33m'));
  assert.ok(contextSegment(data({ contextTokens: 180000 }), DEFAULT_CONFIG).includes('\x1b[31m'));
});

test('context segment returns null without token data', () => {
  assert.equal(contextSegment(data({ contextTokens: null }), DEFAULT_CONFIG), null);
});

test('context segment threshold boundaries', () => {
  // 120000 / 200000 = exactly 60% -> warn threshold, yellow
  assert.ok(
    contextSegment(data({ contextTokens: 120000 }), DEFAULT_CONFIG).includes('\x1b[33m')
  );
  // 160000 / 200000 = exactly 80% -> danger threshold, red
  assert.ok(
    contextSegment(data({ contextTokens: 160000 }), DEFAULT_CONFIG).includes('\x1b[31m')
  );
  // 119999 / 200000 = 59.9995%, rounds to 60% -> still yellow
  assert.ok(
    contextSegment(data({ contextTokens: 119999 }), DEFAULT_CONFIG).includes('\x1b[33m')
  );
});

test('context segment clamps percentage at 100', () => {
  assert.equal(
    stripAnsi(contextSegment(data({ contextTokens: 260000 }), DEFAULT_CONFIG)),
    '▓▓▓▓▓▓▓▓▓▓ 100%'
  );
});

test('tokens segment formats compact counts', () => {
  assert.equal(tokensSegment(data(), DEFAULT_CONFIG), '124k/200k');
  assert.equal(compactTokens(950), '950');
});

test('model, cost, duration segments format values', () => {
  assert.equal(modelSegment(data(), DEFAULT_CONFIG), 'Opus 4.8');
  assert.equal(costSegment(data(), DEFAULT_CONFIG), '$1.42');
  assert.equal(durationSegment(data(), DEFAULT_CONFIG), '23m');
  assert.equal(durationSegment(data({ durationMs: 72 * 60000 }), DEFAULT_CONFIG), '1h 12m');
});

test('cost and duration return null when data missing', () => {
  assert.equal(costSegment(data({ costUsd: null }), DEFAULT_CONFIG), null);
  assert.equal(durationSegment(data({ durationMs: null }), DEFAULT_CONFIG), null);
});

test('cost segment formats zero and negative values', () => {
  assert.equal(costSegment(data({ costUsd: 0 }), DEFAULT_CONFIG), '$0.00');
  assert.equal(costSegment(data({ costUsd: -1.42 }), DEFAULT_CONFIG), '-$1.42');
});

test('duration segment boundaries', () => {
  assert.equal(durationSegment(data({ durationMs: 0 }), DEFAULT_CONFIG), '0m');
  assert.equal(durationSegment(data({ durationMs: -1 }), DEFAULT_CONFIG), null);
});
