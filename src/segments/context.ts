import { green, red, yellow } from '../ansi.js';
import type { Segment } from '../types.js';

export const contextSegment: Segment = (data, config) => {
  if (data.contextTokens === null || data.contextLimit <= 0) return null;
  const pct = Math.min(100, Math.round((data.contextTokens / data.contextLimit) * 100));
  const filledCount = Math.min(config.bar.width, Math.round((pct / 100) * config.bar.width));
  const bar =
    config.bar.filled.repeat(filledCount) + config.bar.empty.repeat(config.bar.width - filledCount);
  const text = `${bar} ${pct}%`;
  if (pct >= config.thresholds.danger) return red(text);
  if (pct >= config.thresholds.warn) return yellow(text);
  return green(text);
};
