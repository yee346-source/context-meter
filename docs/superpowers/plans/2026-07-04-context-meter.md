# context-meter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish the `context-meter` GitHub repo - a zero-runtime-dependency TypeScript CLI that renders a Claude Code statusline showing context-window usage plus configurable segments.

**Architecture:** Single self-contained process per invocation: read Claude Code's stdin JSON, tail-read the transcript JSONL for token usage, run each enabled segment function `(data, config) → string | null`, join non-null results, print one ANSI-colored line.
Spec: `docs/superpowers/specs/2026-07-04-context-meter-design.md`.

**Tech Stack:** TypeScript (strict, `tsc` to `dist/`, ESM), Node.js >= 18, `node:test`, GitHub Actions, `gh` CLI.

## Global Constraints

- Zero runtime dependencies; only `typescript` and `@types/node` as devDependencies.
- `"engines": { "node": ">=18" }`, `"type": "module"`.
- All relative imports in `src/` must use the `.js` extension (NodeNext ESM resolution).
- The process always exits 0 and never prints error text to stdout; total failure prints the fallback line `context-meter`.
- Transcript reads are capped at the final 256 KiB; the only subprocess is `git rev-parse --abbrev-ref HEAD` with a 200 ms timeout.
- No network calls, ever.
- Tests run against compiled `dist/` output via `node:test`.
- Repo root: `C:\Users\Admin\Desktop\AI Projects\Github Repo\Statusline visualizer` (all commands run from here; quote paths, they contain spaces).
- Commit messages: plain conventional style, no co-author lines.

---

### Task 1: Project scaffold and shared types

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `src/types.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `SessionInput`, `SegmentData`, `Config`, `ThresholdConfig`, `BarConfig`, `Segment` types imported by every later task from `./types.js`; working `npm run build`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "context-meter",
  "version": "0.1.0",
  "description": "Real-time context-window usage bar for your Claude Code statusline",
  "type": "module",
  "bin": { "context-meter": "dist/cli.js" },
  "files": ["dist"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc",
    "test": "npm run build && node --test test/",
    "prepublishOnly": "npm run build"
  },
  "repository": "github:yee346-source/context-meter",
  "keywords": ["claude-code", "statusline", "context-window", "cli", "tokens"],
  "author": "yee346-source",
  "license": "MIT"
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Write `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 yee346-source

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5: Write `src/types.ts`**

```ts
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
```

- [ ] **Step 6: Install dev dependencies and build**

Run: `npm install --save-dev typescript @types/node`
Then: `npm run build`
Expected: exits 0, `dist/types.js` and `dist/types.d.ts` exist.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore LICENSE src/types.ts
git commit -m "feat: scaffold TypeScript project with shared types"
```

---

### Task 2: ANSI color helpers

**Files:**
- Create: `src/ansi.ts`
- Test: `test/ansi.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `green(s: string): string`, `yellow(s: string): string`, `red(s: string): string`, `dim(s: string): string`, `stripAnsi(s: string): string` from `../dist/ansi.js` (tests) / `./ansi.js` (src).

- [ ] **Step 1: Write the failing test `test/ansi.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { green, yellow, red, dim, stripAnsi } from '../dist/ansi.js';

test('green wraps text in ANSI codes', () => {
  assert.equal(green('hi'), '\x1b[32mhi\x1b[0m');
});

test('yellow, red, dim use their codes', () => {
  assert.equal(yellow('x'), '\x1b[33mx\x1b[0m');
  assert.equal(red('x'), '\x1b[31mx\x1b[0m');
  assert.equal(dim('x'), '\x1b[2mx\x1b[0m');
});

test('stripAnsi removes color codes', () => {
  assert.equal(stripAnsi(green('hi') + ' ' + red('yo')), 'hi yo');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ansi.test.js`
Expected: FAIL - cannot find module `dist/ansi.js`.

- [ ] **Step 3: Write `src/ansi.ts`**

```ts
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
```

- [ ] **Step 4: Build and run test to verify it passes**

Run: `npm run build` then `node --test test/ansi.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ansi.ts test/ansi.test.js
git commit -m "feat: add zero-dependency ANSI color helpers"
```

---

### Task 3: Config defaults, loading, and merge validation

**Files:**
- Create: `src/config.ts`
- Test: `test/config.test.js`

**Interfaces:**
- Consumes: `Config` from `./types.js`.
- Produces: `DEFAULT_CONFIG: Config`, `SEGMENT_NAMES` (readonly tuple of the six segment names), `defaultConfigPath(): string`, `loadConfig(path?: string): Config`, `mergeConfig(raw: unknown): Config`.
- `defaultConfigPath()` honors the `CONTEXT_METER_CONFIG` env var (used by E2E tests to isolate from the user's real config).

- [ ] **Step 1: Write the failing test `test/config.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, loadConfig, mergeConfig } from '../dist/config.js';

test('loadConfig returns defaults when file is missing', () => {
  const cfg = loadConfig('Z:/definitely/missing/context-meter.json');
  assert.deepEqual(cfg, DEFAULT_CONFIG);
});

test('mergeConfig keeps valid overrides', () => {
  const cfg = mergeConfig({ segments: ['context', 'model'], separator: ' | ', bar: { width: 20 } });
  assert.deepEqual(cfg.segments, ['context', 'model']);
  assert.equal(cfg.separator, ' | ');
  assert.equal(cfg.bar.width, 20);
  assert.equal(cfg.bar.filled, DEFAULT_CONFIG.bar.filled);
});

test('mergeConfig drops invalid values individually', () => {
  const cfg = mergeConfig({
    segments: ['bogus'],
    thresholds: { warn: 90, danger: 40 },
    bar: { width: 0 },
    contextLimit: -5
  });
  assert.deepEqual(cfg, DEFAULT_CONFIG);
});

test('mergeConfig ignores non-object input', () => {
  assert.deepEqual(mergeConfig('nope'), DEFAULT_CONFIG);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/config.test.js`
Expected: FAIL - cannot find module `dist/config.js`.

- [ ] **Step 3: Write `src/config.ts`**

```ts
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { Config } from './types.js';

export const SEGMENT_NAMES = ['context', 'tokens', 'model', 'git', 'cost', 'duration'] as const;

export const DEFAULT_CONFIG: Config = {
  segments: [...SEGMENT_NAMES],
  separator: ' · ',
  thresholds: { warn: 60, danger: 80 },
  bar: { width: 10, filled: '▓', empty: '░' },
  contextLimit: 200000,
};

export function defaultConfigPath(): string {
  return process.env.CONTEXT_METER_CONFIG ?? join(homedir(), '.claude', 'context-meter.json');
}

export function loadConfig(path: string = defaultConfigPath()): Config {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
  return mergeConfig(raw);
}

export function mergeConfig(raw: unknown): Config {
  const cfg: Config = structuredClone(DEFAULT_CONFIG);
  if (typeof raw !== 'object' || raw === null) return cfg;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.segments)) {
    const names = r.segments.filter(
      (s): s is string => typeof s === 'string' && (SEGMENT_NAMES as readonly string[]).includes(s),
    );
    if (names.length > 0) cfg.segments = names;
  }
  if (typeof r.separator === 'string') cfg.separator = r.separator;

  const t = r.thresholds as Record<string, unknown> | undefined;
  if (t && typeof t.warn === 'number' && t.warn >= 0 && t.warn <= 100) cfg.thresholds.warn = t.warn;
  if (t && typeof t.danger === 'number' && t.danger >= 0 && t.danger <= 100) cfg.thresholds.danger = t.danger;
  if (cfg.thresholds.warn > cfg.thresholds.danger) {
    cfg.thresholds = { ...DEFAULT_CONFIG.thresholds };
  }

  const b = r.bar as Record<string, unknown> | undefined;
  if (b && typeof b.width === 'number' && Number.isInteger(b.width) && b.width >= 1 && b.width <= 50) {
    cfg.bar.width = b.width;
  }
  if (b && typeof b.filled === 'string' && b.filled.length > 0) cfg.bar.filled = b.filled;
  if (b && typeof b.empty === 'string' && b.empty.length > 0) cfg.bar.empty = b.empty;

  if (typeof r.contextLimit === 'number' && r.contextLimit > 0) cfg.contextLimit = r.contextLimit;
  return cfg;
}
```

- [ ] **Step 4: Build and run test to verify it passes**

Run: `npm run build` then `node --test test/config.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts test/config.test.js
git commit -m "feat: add config defaults with per-key validation"
```

---

### Task 4: Transcript tail parser

**Files:**
- Create: `src/transcript.ts`
- Create: `test/fixtures/transcript.jsonl`
- Create: `test/fixtures/malformed.jsonl`
- Test: `test/transcript.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure `node:fs`).
- Produces: `readContextTokens(transcriptPath: string | null): number | null` - the most recent assistant `usage` sum (`input_tokens + cache_read_input_tokens + cache_creation_input_tokens`), or null.

- [ ] **Step 1: Write fixture `test/fixtures/transcript.jsonl`**

```
{"type":"user","message":{"role":"user","content":"hello"}}
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":1200,"cache_read_input_tokens":90000,"cache_creation_input_tokens":2800,"output_tokens":450}}}
{"type":"system","subtype":"info"}
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":2000,"cache_read_input_tokens":118000,"cache_creation_input_tokens":4000,"output_tokens":600}}}
```

- [ ] **Step 2: Write fixture `test/fixtures/malformed.jsonl`**

```
{"type":"assistant","message":{"usage":{"input_tokens":1000,"cache_read_input_tokens":4000}}}
this line is not json at all
{"type":"assistant","message":{"nope":true}}
{broken json
```

- [ ] **Step 3: Write the failing test `test/transcript.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readContextTokens } from '../dist/transcript.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, 'fixtures', 'transcript.jsonl');

test('reads latest assistant usage from transcript', () => {
  assert.equal(readContextTokens(fixture), 124000);
});

test('returns null for missing file', () => {
  assert.equal(readContextTokens(join(here, 'fixtures', 'nope.jsonl')), null);
});

test('returns null for null path', () => {
  assert.equal(readContextTokens(null), null);
});

test('skips malformed lines and entries without usage', () => {
  assert.equal(readContextTokens(join(here, 'fixtures', 'malformed.jsonl')), 5000);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `node --test test/transcript.test.js`
Expected: FAIL - cannot find module `dist/transcript.js`.

- [ ] **Step 5: Write `src/transcript.ts`**

```ts
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';

const TAIL_BYTES = 256 * 1024;

export function readContextTokens(transcriptPath: string | null): number | null {
  if (!transcriptPath) return null;
  let text: string;
  try {
    text = readTail(transcriptPath, TAIL_BYTES);
  } catch {
    return null;
  }
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '') continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const tokens = extractUsage(entry);
    if (tokens !== null) return tokens;
  }
  return null;
}

function extractUsage(entry: unknown): number | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const e = entry as { type?: unknown; message?: { usage?: Record<string, unknown> } };
  if (e.type !== 'assistant') return null;
  const usage = e.message?.usage;
  if (typeof usage !== 'object' || usage === null) return null;
  const n = (v: unknown): number => (typeof v === 'number' ? v : 0);
  const total =
    n(usage.input_tokens) + n(usage.cache_read_input_tokens) + n(usage.cache_creation_input_tokens);
  return total > 0 ? total : null;
}

function readTail(path: string, maxBytes: number): string {
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const length = size - start;
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, start);
    return buf.toString('utf8');
  } finally {
    closeSync(fd);
  }
}
```

- [ ] **Step 6: Build and run test to verify it passes**

Run: `npm run build` then `node --test test/transcript.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/transcript.ts test/transcript.test.js test/fixtures/transcript.jsonl test/fixtures/malformed.jsonl
git commit -m "feat: parse latest token usage from transcript tail"
```

---

### Task 5: Stdin input parser

**Files:**
- Create: `src/input.ts`
- Test: `test/input.test.js`

**Interfaces:**
- Consumes: `SessionInput` from `./types.js`.
- Produces: `parseInput(raw: string): SessionInput | null` (null only when `raw` is not valid JSON or not an object).

- [ ] **Step 1: Write the failing test `test/input.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInput } from '../dist/input.js';

test('parses a full Claude Code payload', () => {
  const raw = JSON.stringify({
    transcript_path: '/tmp/t.jsonl',
    model: { display_name: 'Opus 4.8' },
    workspace: { current_dir: '/proj' },
    cost: { total_cost_usd: 1.42, total_duration_ms: 1380000 }
  });
  assert.deepEqual(parseInput(raw), {
    transcriptPath: '/tmp/t.jsonl',
    modelName: 'Opus 4.8',
    workspaceDir: '/proj',
    costUsd: 1.42,
    durationMs: 1380000,
    contextTokensFromInput: null,
    contextLimitFromInput: null
  });
});

test('falls back to cwd when workspace missing', () => {
  const parsed = parseInput(JSON.stringify({ cwd: '/somewhere' }));
  assert.equal(parsed?.workspaceDir, '/somewhere');
});

test('returns null on invalid JSON', () => {
  assert.equal(parseInput('{oops'), null);
});

test('reads context_window fields when present', () => {
  const parsed = parseInput(
    JSON.stringify({ context_window: { total_input_tokens: 50000, context_window_size: 200000 } })
  );
  assert.equal(parsed?.contextTokensFromInput, 50000);
  assert.equal(parsed?.contextLimitFromInput, 200000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/input.test.js`
Expected: FAIL - cannot find module `dist/input.js`.

- [ ] **Step 3: Write `src/input.ts`**

```ts
import type { SessionInput } from './types.js';

export function parseInput(raw: string): SessionInput | null {
  let j: unknown;
  try {
    j = JSON.parse(raw);
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
```

- [ ] **Step 4: Build and run test to verify it passes**

Run: `npm run build` then `node --test test/input.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/input.ts test/input.test.js
git commit -m "feat: parse Claude Code statusline stdin payload"
```

---

### Task 6: Pure segments (context, tokens, model, cost, duration)

**Files:**
- Create: `src/segments/context.ts`
- Create: `src/segments/tokens.ts`
- Create: `src/segments/model.ts`
- Create: `src/segments/cost.ts`
- Create: `src/segments/duration.ts`
- Test: `test/segments.test.js`

**Interfaces:**
- Consumes: `Segment`, `SegmentData`, `Config` from `../types.js`; `green`, `yellow`, `red` from `../ansi.js`.
- Produces: `contextSegment: Segment`, `tokensSegment: Segment`, `compactTokens(n: number): string`, `modelSegment: Segment`, `costSegment: Segment`, `durationSegment: Segment`.

- [ ] **Step 1: Write the failing test `test/segments.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../dist/config.js';
import { stripAnsi } from '../dist/ansi.js';
import { contextSegment } from '../dist/segments/context.js';
import { tokensSegment, compactTokens } from '../dist/segments/tokens.js';
import { modelSegment } from '../dist/segments/model.js';
import { costSegment } from '../dist/segments/cost.js';
import { durationSegment } from '../dist/segments/duration.js';

const data = (overrides = {}) => ({
  contextTokens: 124000,
  contextLimit: 200000,
  modelName: 'Opus 4.8',
  gitBranch: 'main',
  costUsd: 1.42,
  durationMs: 23 * 60000,
  ...overrides
});

test('context segment renders bar and percent', () => {
  assert.equal(stripAnsi(contextSegment(data(), DEFAULT_CONFIG)), '▓▓▓▓▓▓░░░░ 62%');
});

test('context segment picks color by threshold', () => {
  assert.ok(contextSegment(data({ contextTokens: 40000 }), DEFAULT_CONFIG).includes('\x1b[32m'));
  assert.ok(contextSegment(data(), DEFAULT_CONFIG).includes('\x1b[33m'));
  assert.ok(contextSegment(data({ contextTokens: 180000 }), DEFAULT_CONFIG).includes('\x1b[31m'));
});

test('context segment returns null without token data', () => {
  assert.equal(contextSegment(data({ contextTokens: null }), DEFAULT_CONFIG), null);
});

test('tokens segment formats compact counts', () => {
  assert.equal(tokensSegment(data(), DEFAULT_CONFIG), '124k/200k');
  assert.equal(compactTokens(950), '950');
});

test('model, cost, duration segments format values', () => {
  assert.equal(modelSegment(data(), DEFAULT_CONFIG), 'Opus 4.8');
  assert.equal(costSegment(data(), DEFAULT_CONFIG), '$1.42');
  assert.equal(durationSegment(data(), DEFAULT_CONFIG), '23m');
  assert.equal(durationSegment(data({ durationMs: 72 * 60000 }), DEFAULT_CONFIG), '1h 12m');
});

test('cost and duration return null when data missing', () => {
  assert.equal(costSegment(data({ costUsd: null }), DEFAULT_CONFIG), null);
  assert.equal(durationSegment(data({ durationMs: null }), DEFAULT_CONFIG), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/segments.test.js`
Expected: FAIL - cannot find module `dist/segments/context.js`.

- [ ] **Step 3: Write `src/segments/context.ts`**

```ts
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
```

- [ ] **Step 4: Write `src/segments/tokens.ts`**

```ts
import type { Segment } from '../types.js';

export function compactTokens(n: number): string {
  return n < 1000 ? String(n) : `${Math.round(n / 1000)}k`;
}

export const tokensSegment: Segment = (data) => {
  if (data.contextTokens === null || data.contextLimit <= 0) return null;
  return `${compactTokens(data.contextTokens)}/${compactTokens(data.contextLimit)}`;
};
```

- [ ] **Step 5: Write `src/segments/model.ts`**

```ts
import type { Segment } from '../types.js';

export const modelSegment: Segment = (data) => data.modelName;
```

- [ ] **Step 6: Write `src/segments/cost.ts`**

```ts
import type { Segment } from '../types.js';

export const costSegment: Segment = (data) =>
  data.costUsd === null ? null : `$${data.costUsd.toFixed(2)}`;
```

- [ ] **Step 7: Write `src/segments/duration.ts`**

```ts
import type { Segment } from '../types.js';

export const durationSegment: Segment = (data) => {
  if (data.durationMs === null || data.durationMs < 0) return null;
  const minutes = Math.floor(data.durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};
```

- [ ] **Step 8: Build and run test to verify it passes**

Run: `npm run build` then `node --test test/segments.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 9: Commit**

```bash
git add src/segments test/segments.test.js
git commit -m "feat: add context, tokens, model, cost, duration segments"
```

---

### Task 7: Git branch segment

**Files:**
- Create: `src/segments/git.ts`
- Test: `test/git.test.js`

**Interfaces:**
- Consumes: `Segment` from `../types.js`.
- Produces: `getGitBranch(dir: string | null): string | null` (spawns git, 200 ms timeout, null on any failure or detached HEAD) and `gitSegment: Segment` (echoes `data.gitBranch`).

- [ ] **Step 1: Write the failing test `test/git.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getGitBranch, gitSegment } from '../dist/segments/git.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('getGitBranch returns a branch inside a repo', () => {
  const branch = getGitBranch(repoRoot);
  assert.equal(typeof branch, 'string');
  assert.ok(branch.length > 0);
});

test('getGitBranch returns null outside a repo', () => {
  assert.equal(getGitBranch(tmpdir()), null);
});

test('getGitBranch returns null for null dir', () => {
  assert.equal(getGitBranch(null), null);
});

test('gitSegment echoes gathered branch', () => {
  assert.equal(gitSegment({ gitBranch: 'main' }, {}), 'main');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/git.test.js`
Expected: FAIL - cannot find module `dist/segments/git.js`.

- [ ] **Step 3: Write `src/segments/git.ts`**

```ts
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
```

- [ ] **Step 4: Build and run test to verify it passes**

Run: `npm run build` then `node --test test/git.test.js`
Expected: PASS, 4 tests.
Note: the "outside a repo" test assumes the OS temp dir is not inside a git repo; this holds on dev machines and CI runners.

- [ ] **Step 5: Commit**

```bash
git add src/segments/git.ts test/git.test.js
git commit -m "feat: add git branch segment with fail-silent subprocess"
```

---

### Task 8: Renderer

**Files:**
- Create: `src/render.ts`
- Test: `test/render.test.js`

**Interfaces:**
- Consumes: all six segment functions; `Config`, `Segment`, `SegmentData` from `./types.js`.
- Produces: `renderLine(data: SegmentData, config: Config): string` - joins non-null segment outputs with `config.separator`, skipping unknown segment names and any segment that throws.

- [ ] **Step 1: Write the failing test `test/render.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLine } from '../dist/render.js';
import { DEFAULT_CONFIG } from '../dist/config.js';
import { stripAnsi } from '../dist/ansi.js';

const data = {
  contextTokens: 124000,
  contextLimit: 200000,
  modelName: 'Opus 4.8',
  gitBranch: 'main',
  costUsd: 1.42,
  durationMs: 23 * 60000
};

test('renders all default segments joined by separator', () => {
  assert.equal(
    stripAnsi(renderLine(data, DEFAULT_CONFIG)),
    '▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · main · $1.42 · 23m'
  );
});

test('skips segments with missing data', () => {
  const line = stripAnsi(renderLine({ ...data, gitBranch: null, costUsd: null }, DEFAULT_CONFIG));
  assert.equal(line, '▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · 23m');
});

test('respects segment order and skips unknown names', () => {
  const cfg = { ...DEFAULT_CONFIG, segments: ['model', 'wat', 'context'] };
  assert.equal(stripAnsi(renderLine(data, cfg)), 'Opus 4.8 · ▓▓▓▓▓▓░░░░ 62%');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render.test.js`
Expected: FAIL - cannot find module `dist/render.js`.

- [ ] **Step 3: Write `src/render.ts`**

```ts
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
```

- [ ] **Step 4: Build and run test to verify it passes**

Run: `npm run build` then `node --test test/render.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/render.ts test/render.test.js
git commit -m "feat: add segment registry and line renderer"
```

---

### Task 9: CLI entry point and end-to-end tests

**Files:**
- Create: `src/cli.ts`
- Test: `test/cli.test.js`

**Interfaces:**
- Consumes: `parseInput`, `loadConfig`, `readContextTokens`, `getGitBranch`, `renderLine`, `SegmentData`.
- Produces: executable `dist/cli.js` (the package `bin`); always exits 0; prints fallback `context-meter` on unparseable stdin or empty render.

- [ ] **Step 1: Write the failing test `test/cli.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stripAnsi } from '../dist/ansi.js';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(here, '..', 'dist', 'cli.js');
const fixture = join(here, 'fixtures', 'transcript.jsonl');
const env = { ...process.env, CONTEXT_METER_CONFIG: join(tmpdir(), 'no-such-config.json') };

function runCli(stdin) {
  return spawnSync(process.execPath, [cliPath], { input: stdin, encoding: 'utf8', env });
}

test('renders a full statusline from fixture data', () => {
  const payload = JSON.stringify({
    transcript_path: fixture,
    model: { display_name: 'Opus 4.8' },
    workspace: { current_dir: tmpdir() },
    cost: { total_cost_usd: 1.42, total_duration_ms: 1380000 }
  });
  const result = runCli(payload);
  assert.equal(result.status, 0);
  assert.equal(
    stripAnsi(result.stdout.trim()),
    '▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · $1.42 · 23m'
  );
});

test('prints fallback on garbage stdin', () => {
  const result = runCli('{not json');
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'context-meter');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cli.test.js`
Expected: FAIL - cannot find module `dist/cli.js`.

- [ ] **Step 3: Write `src/cli.ts`**

```ts
#!/usr/bin/env node
import { loadConfig } from './config.js';
import { parseInput } from './input.js';
import { readContextTokens } from './transcript.js';
import { getGitBranch } from './segments/git.js';
import { renderLine } from './render.js';
import type { SegmentData } from './types.js';

const FALLBACK = 'context-meter';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const input = parseInput(await readStdin());
  if (input === null) {
    console.log(FALLBACK);
    return;
  }
  const config = loadConfig();
  const data: SegmentData = {
    contextTokens: input.contextTokensFromInput ?? readContextTokens(input.transcriptPath),
    contextLimit: input.contextLimitFromInput ?? config.contextLimit,
    modelName: input.modelName,
    gitBranch: config.segments.includes('git') ? getGitBranch(input.workspaceDir) : null,
    costUsd: input.costUsd,
    durationMs: input.durationMs,
  };
  const line = renderLine(data, config);
  console.log(line === '' ? FALLBACK : line);
}

main()
  .catch(() => {
    console.log(FALLBACK);
  })
  .finally(() => {
    process.exitCode = 0;
  });
```

- [ ] **Step 4: Build and run the full suite**

Run: `npm test`
Expected: PASS - all test files (ansi, config, transcript, input, segments, git, render, cli) green.

- [ ] **Step 5: Manual smoke test**

Run (PowerShell, from repo root):

```powershell
'{"transcript_path":"test/fixtures/transcript.jsonl","model":{"display_name":"Opus 4.8"},"cost":{"total_cost_usd":0.48,"total_duration_ms":720000}}' | node dist/cli.js
```

Expected: a colored line like `▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · <branch> · $0.48 · 12m`.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts test/cli.test.js
git commit -m "feat: add CLI entry with never-fail statusline output"
```

---

### Task 10: README and CI workflow

**Files:**
- Create: `README.md`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the finished CLI behavior from Task 9.
- Produces: user-facing documentation and a green CI matrix required by Task 11.

- [ ] **Step 1: Write `README.md`**

````markdown
# context-meter

Real-time context-window usage in your Claude Code statusline.

```
▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 · main · $1.42 · 23m
```

Know exactly how full your context window is - before Claude compacts your session.
Zero dependencies, no daemon, no network calls, works on Windows, macOS and Linux.

## Install

Add this to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y context-meter"
  }
}
```

That's it.
The next time Claude Code refreshes, your statusline shows the meter.

For a faster start (skips the npx check), install globally and reference the binary directly:

```json
{
  "statusLine": {
    "type": "command",
    "command": "context-meter"
  }
}
```

after `npm install -g context-meter`.

## What the segments mean

| Segment | Example | Meaning |
|---|---|---|
| `context` | `▓▓▓▓▓▓░░░░ 62%` | How full the context window is. Green, then yellow at 60%, red at 80%. |
| `tokens` | `124k/200k` | Tokens used / window size. |
| `model` | `Opus 4.8` | The model in this session. |
| `git` | `main` | Current branch of your project (hidden outside git repos). |
| `cost` | `$1.42` | Session cost so far. |
| `duration` | `23m` | Session wall-clock time. |

## Configuration (optional)

Create `~/.claude/context-meter.json`.
Everything is optional; anything invalid falls back to its default.

```json
{
  "segments": ["context", "tokens", "model", "git", "cost", "duration"],
  "separator": " · ",
  "thresholds": { "warn": 60, "danger": 80 },
  "bar": { "width": 10, "filled": "▓", "empty": "░" },
  "contextLimit": 200000
}
```

- `segments` - which pieces to show, in order. Drop what you don't want.
- `thresholds` - percentages where the bar turns yellow (`warn`) and red (`danger`).
- `bar` - width in characters and the fill glyphs.
- `contextLimit` - fallback window size in tokens when Claude Code doesn't report one.

## How it works

Claude Code runs the command on every statusline refresh and pipes it session JSON.
context-meter reads the tail of your session transcript, takes the newest assistant message's token usage, and renders one ANSI-colored line.
It never breaks your statusline: any segment that can't produce a value simply disappears, and the process always exits 0.

## Troubleshooting

- **No bar, only model/cost:** the transcript path wasn't readable yet; it appears after the first assistant reply.
- **No git branch:** you're not in a git repo, or `git` isn't on PATH - both are fine, the segment just hides.
- **Weird characters instead of blocks:** your terminal font lacks `▓`/`░`; set different glyphs via `bar.filled` / `bar.empty`.

## License

MIT
````

- [ ] **Step 2: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22, 24]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

- [ ] **Step 3: Commit**

```bash
git add README.md .github/workflows/ci.yml
git commit -m "docs: add README and CI workflow"
```

---

### Task 11: Create the GitHub repository and verify CI

**Files:**
- No new files; publishes the repo.

**Interfaces:**
- Consumes: all previous commits on `main`.
- Produces: public repo `github.com/yee346-source/context-meter` with green CI.

- [ ] **Step 1: Create the repo and push**

Run from repo root:

```bash
gh repo create yee346-source/context-meter --public --source . --push --description "Real-time context-window usage bar for your Claude Code statusline"
```

Expected: repo created, `main` pushed, remote `origin` set.

- [ ] **Step 2: Watch CI**

Run: `gh run watch` (or `gh run list --limit 1` until status is `completed`).
Expected: the CI workflow completes with conclusion `success` across the whole matrix.
If any leg fails: fix locally, commit, push, and re-watch - do not proceed with a red matrix.

- [ ] **Step 3: Verify the repo renders correctly**

Run: `gh repo view yee346-source/context-meter --web` and confirm the README displays with the sample line and tables intact.

---

## Not in this plan

- npm publish (`npm publish` requires the user's npm login; performed together with the user after this plan completes).
- Demo GIF/screenshot for the README (needs a real recorded terminal; added post-v1).
