# context-meter - design spec

Date: 2026-07-04
Status: approved pending user review

## Overview

context-meter is a statusline command for Claude Code.
It renders one ANSI-colored line showing real-time context-window usage plus optional session segments.
Claude Code invokes it on every statusline refresh, pipes session JSON to stdin, and displays the single line it prints to stdout.

Primary audience: Claude Code users (r/ClaudeAI community).
The pitch: install one package, add one line to settings, and always know how full your context window is.

## Decisions

- Target: Claude Code `statusLine` integration only. No tmux, starship, or generic terminal support in v1.
- Runtime: Node.js >= 18 (matches Claude Code's own requirement).
- Language: TypeScript (strict mode), compiled with `tsc` to `dist/`. The npm package ships compiled JS plus `.d.ts` declarations.
- Dependencies: zero runtime dependencies. TypeScript and tooling are devDependencies only.
- Name: `context-meter` (verified available on npm on 2026-07-04). GitHub repo: `yee346-source/context-meter`, public, MIT license.
- Architecture: single self-contained process per invocation (approach A). No daemon, no cache files.

## What the line shows

Default output (all segments enabled):

```
▓▓▓▓▓▓░░░░ 62% · 124k/200k · Opus 4.8 ·  main · $1.42 · 23m
```

Segments, in default order:

1. `context` - progress bar plus percentage. Color: green below `warn` threshold, yellow between `warn` and `danger`, red at or above `danger`.
2. `tokens` - used/limit in compact form (e.g. `124k/200k`).
3. `model` - model display name from stdin JSON.
4. `git` - current branch name of the workspace directory, omitted when not in a git repo.
5. `cost` - session cost in USD from stdin JSON.
6. `duration` - session wall-clock duration, compact (e.g. `23m`, `1h 12m`).

Every segment can be disabled or reordered via config.
A segment that cannot produce a value returns nothing and is skipped without any error text.

## Architecture and data flow

```
Claude Code → stdin JSON → gather data → run segments → join with separator → stdout (one line)
```

1. Read stdin fully and parse JSON. On parse failure, print a minimal fallback line and exit 0.
2. Load config (defaults merged with the user's config file, if present).
3. Gather data: parse the transcript tail for token usage; run `git` for the branch; take model/cost/duration from stdin JSON.
4. Each enabled segment maps `(data, config) → string | null`.
5. Join non-null segment strings with the configured separator and print.

## Components

```
context-meter/
├── src/
│   ├── cli.ts            # entry: orchestrates read → gather → render → print
│   ├── input.ts          # parse and validate the stdin JSON from Claude Code
│   ├── transcript.ts     # tail-read the session JSONL, extract latest token usage
│   ├── config.ts         # defaults, config file loading, merge logic
│   ├── render.ts         # join enabled segments with separators
│   ├── ansi.ts           # minimal ANSI color helpers (hand-rolled, ~30 lines)
│   └── segments/
│       ├── context.ts    # bar + percentage
│       ├── tokens.ts     # used/limit
│       ├── model.ts
│       ├── git.ts
│       ├── cost.ts
│       └── duration.ts
├── test/                 # node:test suites, run against dist/ output
│   └── fixtures/         # sample stdin payloads and transcript JSONL files
├── dist/                 # compiled output (gitignored, published to npm)
└── docs/superpowers/specs/
```

Each segment module exports one pure function with the shared signature.
`cli.ts` is the only file with side effects (stdin, stdout, process exit).

## Data contract

From the Claude Code stdin JSON, v1 reads:

- `transcript_path` - path to the session transcript JSONL.
- `model.display_name` - for the model segment.
- `workspace.current_dir` (fallback `cwd`) - working directory for the git segment.
- `cost.total_cost_usd` - for the cost segment.
- `cost.total_duration_ms` - for the duration segment.
- `context_window` token fields, if the running Claude Code version provides them (preferred source when present).

Context usage from the transcript (fallback and primary method):

- Read the last 256 KiB of the transcript file only.
- Scan lines in reverse for the most recent assistant message with a `usage` object.
- Context tokens = `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`.
- Context limit: from stdin JSON when provided, else config `contextLimit`, else 200000.

## Configuration

Location: `~/.claude/context-meter.json`.
Missing file means pure defaults; a malformed file is ignored (defaults apply) rather than crashing the statusline.

Schema with defaults:

```json
{
  "segments": ["context", "tokens", "model", "git", "cost", "duration"],
  "separator": " · ",
  "thresholds": { "warn": 60, "danger": 80 },
  "bar": { "width": 10, "filled": "▓", "empty": "░" },
  "contextLimit": 200000
}
```

Unknown keys are ignored.
Values are validated by hand (no schema library); invalid values fall back to their defaults individually.

## Error handling

Golden rule: never break the statusline.

- Any segment failure (missing file, git not installed, unexpected JSON shape) silently drops that segment; the rest still render.
- Unparseable stdin prints a minimal static fallback (`context-meter`) and exits 0.
- The process always exits 0; error text never reaches stdout.
- The `git` subprocess gets a hard timeout (200 ms) and `stderr` is discarded.

## Performance

- Budget: under 50 ms per invocation on a typical machine.
- Transcript reads are capped at the final 256 KiB regardless of file size.
- No network calls, ever.
- Single `git rev-parse --abbrev-ref HEAD` subprocess is the only external process.

## Testing

- Framework: `node:test` (built-in), asserting against compiled `dist/` output so tests exercise exactly what ships.
- Unit tests per segment with synthetic data, including missing-data cases.
- Transcript parser tests against fixture JSONL files, including truncated tail edge cases (a partial first line after seeking is expected and must be skipped).
- One end-to-end test: spawn the CLI with a fixture stdin payload and fixture transcript, assert on the rendered line (ANSI codes stripped for comparison).
- CI: GitHub Actions matrix - Windows, macOS, Linux against Node 18, 20, 22 and current LTS - running build, type check, and tests on every push and PR.

## Packaging and publishing

- `package.json`: `"bin": { "context-meter": "dist/cli.js" }`, `"files": ["dist"]`, `"engines": { "node": ">=18" }`, `"type": "module"`.
- README: hero screenshot/GIF, one-paragraph pitch, copy-paste install and settings snippet, config reference table, troubleshooting section.
- Install story for users:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y context-meter"
  }
}
```

- npm publish is a manual step performed with the user at the end (requires their npm login).

## Out of scope for v1

- tmux, starship, or non-Claude-Code integrations.
- Powerline glyph themes and background-color styling.
- Cost budgets/alerts, weekly usage stats, or any analytics.
- Windows PowerShell-specific rendering fallbacks beyond standard ANSI (Windows Terminal handles ANSI fine).
- Auto-compact threshold awareness beyond the plain percentage (may become v1.1 once validated).
