import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, loadConfig, mergeConfig } from '../dist/config.js';

test('loadConfig returns defaults when file is missing', () => {
  const cfg = loadConfig('Z:/definitely/missing/context-meter.json');
  assert.deepEqual(cfg, DEFAULT_CONFIG);
});

test('mergeConfig keeps valid overrides', () => {
  const cfg = mergeConfig({ segments: ['context', 'model'], separator: ' | ', bar: { width: 20 } });
  assert.deepEqual(cfg.segments, ['context', 'model']);
  assert.equal(cfg.separator, ' | ');
  assert.equal(cfg.bar.width, 20);
  assert.equal(cfg.bar.filled, DEFAULT_CONFIG.bar.filled);
});

test('mergeConfig drops invalid values individually', () => {
  const cfg = mergeConfig({
    segments: ['bogus'],
    thresholds: { warn: 90, danger: 40 },
    bar: { width: 0 },
    contextLimit: -5
  });
  assert.deepEqual(cfg, DEFAULT_CONFIG);
});

test('mergeConfig ignores non-object input', () => {
  assert.deepEqual(mergeConfig('nope'), DEFAULT_CONFIG);
});
