---
name: nano-banana-pro
description: Generate images using Nano Banana 2 (fast, cheap) or Nano Banana Pro (higher quality). Use when user asks to create, generate, or make an image, picture, graphic, hero image, illustration, or visual.
---

# Image Generation — `nanaban` CLI

```bash
nanaban "PROMPT"
nanaban "PROMPT" -o output.png
nanaban "PROMPT" --ar 16:9 --size 2k --pro
nanaban edit photo.png "add sunglasses"
```

## Auth

Auth is automatic (in priority order):
1. `GEMINI_API_KEY` / `GOOGLE_API_KEY` env var
2. `~/.nanaban/config.json` — stored via `nanaban auth set <key>`
3. Gemini CLI OAuth (`~/.gemini/oauth_creds.json` + OAuth client credentials in env or config)

Check status: `nanaban auth`

## Defaults

- **Model**: NB2 (use `--pro` only if user requests higher quality)
- **Size**: 1k (use `--size 2k` or `4k` only if requested)
- **Aspect**: 1:1 (use `--ar 16:9` / `wide` for hero/banner, `--ar 9:16` / `tall` for mobile)
- **Output**: Auto-named from prompt, saved to CWD
- **Style**: Unless user specifies otherwise, apply: "Minimalist black ink line art with bold watercolor washes. Swiss design aesthetic. Abstract/conceptual representation."

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <file>` | Output path (auto-generated if omitted) | |
| `--ar <ratio>` | 1:1, 16:9, 9:16, 4:3, 3:4 (also: square, wide, tall) | 1:1 |
| `--size <size>` | 1k, 2k, 4k | 1k |
| `--pro` | Use Nano Banana Pro instead of NB2 | false |
| `--neg <text>` | Negative prompt (what to avoid) | |
| `-r, --ref <file>` | Reference image path | |
| `--open` | Open in default viewer after generation | false |
| `--json` | Structured JSON output (for LLM/script piping) | false |
| `--quiet` | Suppress non-essential output | false |

## Models

- **NB2** (`gemini-3.1-flash-image-preview`): Fast, cheap ($0.045/image at 512px). Default.
- **Pro** (`gemini-3-pro-image-preview`): Higher quality, 2x price. Use `--pro`.

## Prompt Craft

Each word earns its place. Structure: **Subject + Treatment + Constraints**

- **Subject**: Specific. Not "a bird" but "heron mid-strike, neck coiled"
- **Treatment**: How rendered. Default to ink/watercolor/Swiss unless specified
- **Constraints**: Use `--neg` for exclusions

**Avoid**: generic modifiers (beautiful, stunning), redundant qualifiers, vague descriptors

## JSON Mode (for agents)

```bash
nanaban "a red circle" --json
```

Returns:
```json
{"status":"success","file":"/path/to/red_circle.png","model":"gemini-3.1-flash-image-preview","dimensions":{"width":1024,"height":1024},"size_bytes":245760,"duration_ms":2340}
```

## Backward Compatibility

Old invocation still works:
```bash
npx tsx ~/.claude/skills/nano-banana-pro/generate-image.ts -p "PROMPT" -o output.png
```

Install globally: `npm install -g nanaban`
