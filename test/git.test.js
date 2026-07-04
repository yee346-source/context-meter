import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getGitBranch, gitSegment } from '../dist/segments/git.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('getGitBranch returns a branch inside a repo', () => {
  const branch = getGitBranch(repoRoot);
  assert.equal(typeof branch, 'string');
  assert.ok(branch.length > 0);
});

test('getGitBranch returns null outside a repo', () => {
  assert.equal(getGitBranch(tmpdir()), null);
});

test('getGitBranch returns null for null dir', () => {
  assert.equal(getGitBranch(null), null);
});

test('gitSegment echoes gathered branch', () => {
  assert.equal(gitSegment({ gitBranch: 'main' }, {}), 'main');
});
