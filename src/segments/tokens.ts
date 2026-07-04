import type { Segment } from '../types.js';

export function compactTokens(n: number): string {
  return n < 1000 ? String(n) : `${Math.round(n / 1000)}k`;
}

export const tokensSegment: Segment = (data) => {
  if (data.contextTokens === null || data.contextLimit <= 0) return null;
  return `${compactTokens(data.contextTokens)}/${compactTokens(data.contextLimit)}`;
};
