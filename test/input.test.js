import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInput } from '../dist/input.js';

test('parses a full Claude Code payload', () => {
  const raw = JSON.stringify({
    transcript_path: '/tmp/t.jsonl',
    model: { display_name: 'Opus 4.8' },
    workspace: { current_dir: '/proj' },
    cost: { total_cost_usd: 1.42, total_duration_ms: 1380000 }
  });
  assert.deepEqual(parseInput(raw), {
    transcriptPath: '/tmp/t.jsonl',
    modelName: 'Opus 4.8',
    workspaceDir: '/proj',
    costUsd: 1.42,
    durationMs: 1380000,
    contextTokensFromInput: null,
    contextLimitFromInput: null
  });
});

test('falls back to cwd when workspace missing', () => {
  const parsed = parseInput(JSON.stringify({ cwd: '/somewhere' }));
  assert.equal(parsed?.workspaceDir, '/somewhere');
});

test('tolerates a UTF-8 BOM before the JSON', () => {
  const parsed = parseInput('﻿' + JSON.stringify({ cwd: '/somewhere' }));
  assert.equal(parsed?.workspaceDir, '/somewhere');
});

test('returns null on invalid JSON', () => {
  assert.equal(parseInput('{oops'), null);
});

test('reads context_window fields when present', () => {
  const parsed = parseInput(
    JSON.stringify({ context_window: { total_input_tokens: 50000, context_window_size: 200000 } })
  );
  assert.equal(parsed?.contextTokensFromInput, 50000);
  assert.equal(parsed?.contextLimitFromInput, 200000);
});
