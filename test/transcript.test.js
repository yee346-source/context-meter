import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readContextTokens } from '../dist/transcript.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, 'fixtures', 'transcript.jsonl');

test('reads latest assistant usage from transcript', () => {
  assert.equal(readContextTokens(fixture), 124000);
});

test('returns null for missing file', () => {
  assert.equal(readContextTokens(join(here, 'fixtures', 'nope.jsonl')), null);
});

test('returns null for null path', () => {
  assert.equal(readContextTokens(null), null);
});

test('skips malformed lines and entries without usage', () => {
  assert.equal(readContextTokens(join(here, 'fixtures', 'malformed.jsonl')), 5000);
});
