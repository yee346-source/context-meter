import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { Config } from './types.js';

export const SEGMENT_NAMES = ['context', 'tokens', 'model', 'git', 'cost', 'duration'] as const;

export const DEFAULT_CONFIG: Config = {
  segments: [...SEGMENT_NAMES],
  separator: ' · ',
  thresholds: { warn: 60, danger: 80 },
  bar: { width: 10, filled: '▓', empty: '░' },
  contextLimit: 200000,
};

export function defaultConfigPath(): string {
  return process.env.CONTEXT_METER_CONFIG ?? join(homedir(), '.claude', 'context-meter.json');
}

export function loadConfig(path: string = defaultConfigPath()): Config {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
  return mergeConfig(raw);
}

export function mergeConfig(raw: unknown): Config {
  const cfg: Config = structuredClone(DEFAULT_CONFIG);
  if (typeof raw !== 'object' || raw === null) return cfg;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.segments)) {
    const names = r.segments.filter(
      (s): s is string => typeof s === 'string' && (SEGMENT_NAMES as readonly string[]).includes(s),
    );
    if (names.length > 0) cfg.segments = names;
  }
  if (typeof r.separator === 'string') cfg.separator = r.separator;

  const t = r.thresholds as Record<string, unknown> | undefined;
  if (t && typeof t.warn === 'number' && t.warn >= 0 && t.warn <= 100) cfg.thresholds.warn = t.warn;
  if (t && typeof t.danger === 'number' && t.danger >= 0 && t.danger <= 100) cfg.thresholds.danger = t.danger;
  if (cfg.thresholds.warn > cfg.thresholds.danger) {
    cfg.thresholds = { ...DEFAULT_CONFIG.thresholds };
  }

  const b = r.bar as Record<string, unknown> | undefined;
  if (b && typeof b.width === 'number' && Number.isInteger(b.width) && b.width >= 1 && b.width <= 50) {
    cfg.bar.width = b.width;
  }
  if (b && typeof b.filled === 'string' && b.filled.length > 0) cfg.bar.filled = b.filled;
  if (b && typeof b.empty === 'string' && b.empty.length > 0) cfg.bar.empty = b.empty;

  if (typeof r.contextLimit === 'number' && r.contextLimit > 0) cfg.contextLimit = r.contextLimit;
  return cfg;
}
