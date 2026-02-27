# nanaban

<p align="center">
  <img src="nanaban_logo.png" alt="nanaban" width="600">
</p>

Image generation from the terminal. Two words, one picture.

```bash
nanaban "a fox in snow"
```

Auto-names the file, saves it to your current directory, opens it on request. Done.

## Install

```bash
npm install -g nanaban
```

Or clone and link if you'd rather work from source:

```bash
git clone https://github.com/199-biotechnologies/nanaban.git
cd nanaban
npm install && npm link
```

Needs Node 18+.

## Auth

You need a Google Gemini API key. Three ways to provide one, checked in this order:

1. **Environment variable** — `GEMINI_API_KEY` or `GOOGLE_API_KEY`
2. **Stored key** — `nanaban auth set <your-key>` saves it to `~/.nanaban/config.json`
3. **Gemini CLI OAuth** — if you've logged in with the `gemini` CLI *and* have OAuth client credentials set via `NANABAN_OAUTH_CLIENT_ID`/`NANABAN_OAUTH_CLIENT_SECRET` env vars or in `~/.nanaban/config.json`

Easiest way: grab a key from [Google AI Studio](https://aistudio.google.com/apikey), store it once.

```bash
nanaban auth set AIzaSy...
```

That's it. The key sticks between sessions. Check what's configured anytime:

```bash
nanaban auth
```

## Usage

```bash
nanaban "prompt"                          # auto-names, saves to CWD
nanaban "prompt" -o sunset.png            # specific output file
nanaban "prompt" --ar 16:9 --size 2k     # wide, high-res
nanaban "prompt" --pro                    # higher quality model
nanaban "prompt" --neg "blurry"           # negative prompt
nanaban "prompt" -r style.png            # use a reference image
nanaban edit photo.png "add sunglasses"   # edit an existing image
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <file>` | Output path | auto from prompt |
| `--ar <ratio>` | `1:1` `16:9` `9:16` `4:3` `3:4` `square` `wide` `tall` | `1:1` |
| `--size <size>` | `1k` `2k` `4k` | `1k` |
| `--pro` | Nano Banana Pro — better quality, roughly 2x the cost | `false` |
| `--neg <text>` | What to avoid in the image | |
| `-r, --ref <file>` | Reference image for style or content guidance | |
| `--open` | Open the result in your default viewer | `false` |
| `--json` | Structured JSON output for scripts and agents | `false` |
| `--quiet` | Suppress non-essential output | `false` |

All flags work with both `nanaban "prompt"` and `nanaban edit`.

### Auto-naming

Your prompt becomes the filename. Stop words get stripped, capped at 6 words, joined by underscores.

```
"a fox in a snowy forest at dawn" → fox_snowy_forest_dawn.png
```

If the file already exists, it auto-increments: `fox_snowy_forest.png`, `fox_snowy_forest_2.png`, and so on.

### Aspect Ratios

Exact ratios or shorthand — your call:

| Shorthand | Ratio | Good for |
|-----------|-------|----------|
| `square` | 1:1 | Profile pics, thumbnails |
| `wide` | 16:9 | Hero images, banners, wallpapers |
| `tall` | 9:16 | Phone wallpapers, stories |

## Models

Two models. Pick based on what you need:

| Model | Flag | Speed | Cost | When to use |
|-------|------|-------|------|-------------|
| **NB2** (default) | — | ~3s | $0.045/img | Quick iterations, bulk generation |
| **Pro** | `--pro` | ~8s | ~$0.09/img | Final assets, detail-heavy work |

Both are Gemini image models (`gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview`).

## JSON Mode

For scripts, CI pipelines, and LLM agents. No spinners, no colors, just data:

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

Errors come back in the same shape:

```json
{
  "status": "error",
  "code": "AUTH_MISSING",
  "message": "No authentication found."
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_MISSING` | No API key found anywhere |
| `AUTH_INVALID` | Key exists but was rejected |
| `AUTH_EXPIRED` | OAuth token needs refresh |
| `PROMPT_MISSING` | You forgot the prompt |
| `IMAGE_NOT_FOUND` | Edit mode: source image doesn't exist |
| `GENERATION_FAILED` | Model returned no image |
| `RATE_LIMITED` | Too many requests, slow down |
| `NETWORK_ERROR` | Can't reach the API |

Exit codes: `0` success, `1` runtime error, `2` usage error.

## Piping

stdout is always just the file path. Metadata goes to stderr. So these work:

```bash
nanaban "a cat" | xargs open
nanaban "a cat" 2>/dev/null | pbcopy
cat prompts.txt | while read p; do nanaban "$p"; done
```

## Dependencies

Kept small on purpose:

- `@google/genai` + `google-auth-library` — Gemini API
- `commander` — CLI parsing (~90KB)
- `nanospinner` — terminal spinner (~3KB)
- `picocolors` — terminal colors (~3KB)
- `tsx` + `typescript` — ships TypeScript source directly, no build step

## License

ISC

## Author

Boris Djordjevic
