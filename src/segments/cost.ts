import type { Segment } from '../types.js';

export const costSegment: Segment = (data) =>
  data.costUsd === null ? null : `$${data.costUsd.toFixed(2)}`;
