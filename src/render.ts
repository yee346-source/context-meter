import type { Config, Segment, SegmentData } from './types.js';
import { contextSegment } from './segments/context.js';
import { tokensSegment } from './segments/tokens.js';
import { modelSegment } from './segments/model.js';
import { gitSegment } from './segments/git.js';
import { costSegment } from './segments/cost.js';
import { durationSegment } from './segments/duration.js';

const REGISTRY: Record<string, Segment> = {
  context: contextSegment,
  tokens: tokensSegment,
  model: modelSegment,
  git: gitSegment,
  cost: costSegment,
  duration: durationSegment,
};

export function renderLine(data: SegmentData, config: Config): string {
  const parts: string[] = [];
  for (const name of config.segments) {
    const segment = REGISTRY[name];
    if (segment === undefined) continue;
    let piece: string | null;
    try {
      piece = segment(data, config);
    } catch {
      piece = null;
    }
    if (piece !== null && piece !== '') parts.push(piece);
  }
  return parts.join(config.separator);
}
