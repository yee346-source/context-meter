export interface SessionInput {
  transcriptPath: string | null;
  modelName: string | null;
  workspaceDir: string | null;
  costUsd: number | null;
  durationMs: number | null;
  contextTokensFromInput: number | null;
  contextLimitFromInput: number | null;
}

export interface SegmentData {
  contextTokens: number | null;
  contextLimit: number;
  modelName: string | null;
  gitBranch: string | null;
  costUsd: number | null;
  durationMs: number | null;
}

export interface ThresholdConfig {
  warn: number;
  danger: number;
}

export interface BarConfig {
  width: number;
  filled: string;
  empty: string;
}

export interface Config {
  segments: string[];
  separator: string;
  thresholds: ThresholdConfig;
  bar: BarConfig;
  contextLimit: number;
}

export type Segment = (data: SegmentData, config: Config) => string | null;
