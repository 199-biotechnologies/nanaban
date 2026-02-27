# nanaban

Image generation from the terminal. Two words and you have a picture.

```bash
nanaban "a fox in snow"
```

That's it. Auto-names the file, saves to your current directory, shows you the result.

## Install

```bash
npm install -g nanaban
```

Or from source:

```bash
git clone https://github.com/199-biotechnologies/nanaban.git
cd nanaban
npm install && npm link
```

## Auth

Three methods, checked in order:

1. **Environment variable** — `GEMINI_API_KEY` or `GOOGLE_API_KEY`
2. **Stored key** — `nanaban auth set <your-key>` (saves to `~/.nanaban/config.json`)
3. **Gemini CLI OAuth** — requires `gemini` CLI login *and* OAuth client credentials via `NANABAN_OAUTH_CLIENT_ID`/`NANABAN_OAUTH_CLIENT_SECRET` env vars or `~/.nanaban/config.json`

```bash
# Easiest: store once, use forever
nanaban auth set AIzaSy...

# Check what's configured
nanaban auth
```

## Usage

```bash
nanaban "prompt"                          # auto-names, saves to CWD
nanaban "prompt" -o sunset.png            # specific output file
nanaban "prompt" --ar 16:9 --size 2k     # wide, high-res
nanaban "prompt" --pro                    # Nano Banana Pro model
nanaban "prompt" --neg "blurry"           # negative prompt
nanaban edit photo.png "add sunglasses"   # edit existing image
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <file>` | Output path | auto from prompt |
| `--ar <ratio>` | `1:1` `16:9` `9:16` `4:3` `3:4` `square` `wide` `tall` | `1:1` |
| `--size <size>` | `1k` `2k` `4k` | `1k` |
| `--pro` | Use Nano Banana Pro (higher quality, 2x cost) | `false` |
| `--neg <text>` | What to avoid in the image | |
| `-r, --ref <file>` | Reference image | |
| `--open` | Open in default viewer after generation | `false` |
| `--json` | Structured JSON output for scripting | `false` |
| `--quiet` | Suppress all non-essential output | `false` |

### Auto-naming

The prompt becomes the filename. Stop words stripped, 6 words max, underscored.

```
"a fox in a snowy forest at dawn" → fox_snowy_forest_dawn.png
```

Collisions auto-increment: `fox_snowy_forest.png`, `fox_snowy_forest_2.png`, etc.

## Models

| Model | Flag | ID | Speed | Cost |
|-------|------|----|-------|------|
| **NB2** (default) | — | `gemini-3.1-flash-image-preview` | Fast | $0.045/img |
| **Pro** | `--pro` | `gemini-3-pro-image-preview` | Slower | ~$0.09/img |

## JSON Mode

For scripts and LLM agents — structured output, no spinners, no colors:

```bash
nanaban "a red circle" --json
```

```json
{
  "status": "success",
  "file": "/Users/you/red_circle.png",
  "model": "gemini-3.1-flash-image-preview",
  "dimensions": { "width": 1024, "height": 1024 },
  "size_bytes": 1247283,
  "duration_ms": 12400
}
```

Errors return the same shape:

```json
{
  "status": "error",
  "code": "AUTH_MISSING",
  "message": "No authentication found."
}
```

### Error Codes

`AUTH_MISSING` `AUTH_INVALID` `AUTH_EXPIRED` `PROMPT_MISSING` `IMAGE_NOT_FOUND` `GENERATION_FAILED` `RATE_LIMITED` `NETWORK_ERROR`

Exit codes: `0` success, `1` runtime error, `2` usage error.

## Piping

stdout is always just the file path (metadata goes to stderr), so this works:

```bash
nanaban "a cat" | xargs open
nanaban "a cat" 2>/dev/null | pbcopy
```

## Dependencies

Minimal footprint:

- `@google/genai` + `google-auth-library` — Gemini API
- `commander` — CLI parsing (~90KB)
- `nanospinner` — terminal spinner (~3KB)
- `picocolors` — terminal colors (~3KB)
- `tsx` + `typescript` — TypeScript runtime (ships TS source, no build step)

## License

ISC

## Author

Boris Djordjevic
