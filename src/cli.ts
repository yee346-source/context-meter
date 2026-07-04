#!/usr/bin/env node
import { loadConfig } from './config.js';
import { parseInput } from './input.js';
import { readContextTokens } from './transcript.js';
import { getGitBranch } from './segments/git.js';
import { renderLine } from './render.js';
import type { SegmentData } from './types.js';

const FALLBACK = 'context-meter';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const input = parseInput(await readStdin());
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
