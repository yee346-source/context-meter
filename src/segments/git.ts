import { spawnSync } from 'node:child_process';
import type { Segment } from '../types.js';

export function getGitBranch(dir: string | null): string | null {
  if (!dir) return null;
  try {
    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: dir,
      timeout: 200,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    if (result.status !== 0 || typeof result.stdout !== 'string') return null;
    const branch = result.stdout.trim();
    if (branch === '' || branch === 'HEAD') return null;
    return branch;
  } catch {
    return null;
  }
}

export const gitSegment: Segment = (data) => data.gitBranch;
