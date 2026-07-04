import type { SessionInput } from './types.js';

export function parseInput(raw: string): SessionInput | null {
  let j: unknown;
  try {
    j = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
  } catch {
    return null;
  }
  if (typeof j !== 'object' || j === null) return null;
  const r = j as Record<string, any>;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    transcriptPath: str(r.transcript_path),
    modelName: str(r.model?.display_name),
    workspaceDir: str(r.workspace?.current_dir) ?? str(r.cwd),
    costUsd: num(r.cost?.total_cost_usd),
    durationMs: num(r.cost?.total_duration_ms),
    contextTokensFromInput: num(r.context_window?.total_input_tokens),
    contextLimitFromInput: num(r.context_window?.context_window_size),
  };
}
