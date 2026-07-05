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
