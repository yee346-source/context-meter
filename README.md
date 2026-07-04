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
