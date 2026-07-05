#!/usr/bin/env node
import { loadConfig } from './config.js';
import { parseInput } from './input.js';
import { readContextTokens } from './transcript.js';
import { getGitBranch } from './segments/git.js';
import { renderLine } from './render.js';
import type { SegmentData } from './types.js';

const FALLBACK = 'context-meter';
const STDIN_TIMEOUT_MS = 1500;

async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;

  return new Promise<string | null>((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (result: string | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      process.stdin.destroy();
      finish(null);
    }, STDIN_TIMEOUT_MS);

    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    process.stdin.on('end', () => {
      finish(Buffer.concat(chunks).toString('utf8'));
    });
    process.stdin.on('error', () => {
      finish(null);
    });
  });
}

async function main(): Promise<void> {
  const stdin = await readStdin();
  if (stdin === null) {
    console.log(FALLBACK);
    return;
  }
  const input = parseInput(stdin);
  if (input === null) {
    console.log(FALLBACK);
    return;
  }
  const config = loadConfig();
  const data: SegmentData = {
    contextTokens: input.contextTokensFromInput ?? readContextTokens(input.transcriptPath),
    contextLimit: input.contextLimitFromInput ?? config.contextLimit,
    modelName: input.modelName,
    gitBranch: config.segments.includes('git') ? getGitBranch(input.workspaceDir) : null,
    costUsd: input.costUsd,
    durationMs: input.durationMs,
  };
  const line = renderLine(data, config);
  console.log(line === '' ? FALLBACK : line);
}

main()
  .catch(() => {
    console.log(FALLBACK);
  })
  .finally(() => {
    process.exitCode = 0;
  });
