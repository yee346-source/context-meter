import type { Segment } from '../types.js';

export const durationSegment: Segment = (data) => {
  if (data.durationMs === null || data.durationMs < 0) return null;
  const minutes = Math.floor(data.durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};
