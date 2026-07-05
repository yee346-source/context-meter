import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

test('applies a 256 KiB tail cap and still finds the trailing usage entry', () => {
  const bigFile = join(tmpdir(), `context-meter-tail-cap-${process.pid}-${Date.now()}.jsonl`);
  const fillerLine = JSON.stringify({
    type: 'user',
    message: { role: 'user', content: 'x'.repeat(500) }
  });
  // 300 KiB+ of filler lines, guaranteeing the file exceeds the 256 KiB tail cap
  // and that the first line(s) within the tail window are truncated mid-line.
  const targetBytes = 300 * 1024;
  const lines = [];
  let bytes = 0;
  while (bytes < targetBytes) {
    lines.push(fillerLine);
    bytes += Buffer.byteLength(fillerLine, 'utf8') + 1;
  }
  const finalLine = JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', usage: { input_tokens: 42 } }
  });
  lines.push(finalLine);
  writeFileSync(bigFile, lines.join('\n') + '\n', 'utf8');

  try {
    assert.equal(readContextTokens(bigFile), 42);
  } finally {
    unlinkSync(bigFile);
  }
});
