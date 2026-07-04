import { closeSync, fstatSync, openSync, readSync } from 'node:fs';

const TAIL_BYTES = 256 * 1024;

export function readContextTokens(transcriptPath: string | null): number | null {
  if (!transcriptPath) return null;
  let text: string;
  try {
    text = readTail(transcriptPath, TAIL_BYTES);
  } catch {
    return null;
  }
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '') continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const tokens = extractUsage(entry);
    if (tokens !== null) return tokens;
  }
  return null;
}

function extractUsage(entry: unknown): number | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const e = entry as { type?: unknown; message?: { usage?: Record<string, unknown> } };
  if (e.type !== 'assistant') return null;
  const usage = e.message?.usage;
  if (typeof usage !== 'object' || usage === null) return null;
  const n = (v: unknown): number => (typeof v === 'number' ? v : 0);
  const total =
    n(usage.input_tokens) + n(usage.cache_read_input_tokens) + n(usage.cache_creation_input_tokens);
  return total > 0 ? total : null;
}

function readTail(path: string, maxBytes: number): string {
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const length = size - start;
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, start);
    return buf.toString('utf8');
  } finally {
    closeSync(fd);
  }
}
