const ESC = '\x1b[';

function wrap(code: number, s: string): string {
  return `${ESC}${code}m${s}${ESC}0m`;
}

export const green = (s: string): string => wrap(32, s);
export const yellow = (s: string): string => wrap(33, s);
export const red = (s: string): string => wrap(31, s);
export const dim = (s: string): string => wrap(2, s);

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}
