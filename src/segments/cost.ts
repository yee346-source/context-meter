import type { Segment } from '../types.js';

export const costSegment: Segment = (data) => {
  if (data.costUsd === null) return null;
  const sign = data.costUsd < 0 ? '-' : '';
  return `${sign}$${Math.abs(data.costUsd).toFixed(2)}`;
};
