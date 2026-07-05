import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stripAnsi } from '../dist/ansi.js';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(here, '..', 'dist', 'cli.js');
const fixture = join(here, 'fixtures', 'transcript.jsonl');
const env = { ...process.env, CONTEXT_METER_CONFIG: join(tmpdir(), 'no-such-config.json') };

function runCli(stdin) {
  return spawnSync(process.execPath, [cliPath], { input: stdin, encoding: 'utf8', env });
}

test('renders a full statusline from fixture data', () => {
  const payload = JSON.stringify({
    transcript_path: fixture,
    model: { display_name: 'Opus 4.8' },
    workspace: { current_dir: tmpdir() },
    cost: { total_cost_usd: 1.42, total_duration_ms: 1380000 }
  });
  const result = runCli(payload);
  assert.equal(result.status, 0);
  assert.equal(
    stripAnsi(result.stdout.trim()),
    '▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · $1.42 · 23m'
  );
});

test('prints fallback on garbage stdin', () => {
  const result = runCli('{not json');
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'context-meter');
});

test('falls back when stdin never closes', async () => {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath], {
      stdio: ['pipe', 'pipe', 'ignore'],
      env
    });

    let stdout = '';
    let finished = false;

    const guard = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill('SIGKILL');
      reject(new Error('CLI did not exit within 5s when stdin never closed'));
    }, 5000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.on('exit', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      try {
        assert.equal(code, 0);
        assert.equal(stdout.trim(), 'context-meter');
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    // Deliberately write nothing and never end stdin.
  });
});
