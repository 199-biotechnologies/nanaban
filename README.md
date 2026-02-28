# nanaban

<p align="center">
  <img src="nanaban_logo.png" alt="nanaban" width="600">
</p>

<p align="center">
  <strong>Nano Banana 2 CLI — generate images from the terminal. $0.04, 3 seconds, one command.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nanaban"><img src="https://img.shields.io/npm/v/nanaban.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/nanaban"><img src="https://img.shields.io/npm/dm/nanaban.svg" alt="npm downloads"></a>
  <a href="https://github.com/199-biotechnologies/nanaban/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/nanaban.svg" alt="license"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/nanaban.svg" alt="node version"></a>
</p>

A CLI for [Nano Banana 2](https://ai.google.dev/gemini-api/docs/image-generation) and [Nano Banana Pro](https://ai.google.dev/gemini-api/docs/image-generation). One install, one command, one image. Works for humans typing prompts and AI agents calling `--json`.

```bash
npm install -g nanaban
nanaban "a fox in snow"
```

Auto-named, saved to your current directory, done. If you use [OpenClaw](https://github.com/openclaw/openclaw), paste this repo URL and let it handle the rest.

## What it looks like

<table>
<tr>
<td align="center">
<img src="examples/cyberpunk_tokyo.png" width="350"><br>
<code>nanaban "cyberpunk tokyo street neon rain" --ar wide</code>
</td>
<td align="center">
<img src="examples/fox_ink.png" width="250"><br>
<code>nanaban "minimalist single line fox"</code>
</td>
<td align="center">
<img src="examples/product_mug.png" width="250"><br>
<code>nanaban "product photo white ceramic mug"</code>
</td>
</tr>
</table>

Every image on this page was generated with nanaban. ~3 seconds each, $0.04 per image, straight from the terminal.

## Why nanaban

Most image generation tools make you open a browser, wait in a queue, click through UI, download manually. nanaban cuts all of that:

- **One command** — type your prompt, get a file. No browser, no signup flow, no queue.
- **Auto-names files** — `"a fox in a snowy forest at dawn"` becomes `fox_snowy_forest_dawn.png`. No more `image_032_final_v2.png`.
- **Built for scripts** — stdout is always the file path. `nanaban "a cat" | xargs open` just works.
- **Built for LLM agents** — `--json` gives you structured output. Plug it into any AI pipeline.
- **Cheap** — $0.04/image on the fast model. $0.09 on Pro. No subscription.
- **Tiny** — 6 dependencies. Ships TypeScript source directly, no build step.

## Install

```bash
npm install -g nanaban
```

Needs Node 18+. That's the only requirement.

Want to work from source instead?

```bash
git clone https://github.com/199-biotechnologies/nanaban.git
cd nanaban && npm install && npm link
```

## Setup (30 seconds)

You need a Google Gemini API key. It's free and takes a minute:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with any Google account
3. Click **Create API Key**
4. Pick any Google Cloud project (or let it create one for you)
5. Copy the key — it starts with `AIzaSy...`

Then store it once:

```bash
nanaban auth set AIzaSy...
```

That's it. The key persists across sessions. You can also set `GEMINI_API_KEY` or `GOOGLE_API_KEY` as an environment variable if you prefer.

Check what's configured anytime:

```bash
nanaban auth
```

## Usage

```bash
nanaban "prompt"                          # auto-names, saves to CWD
nanaban "prompt" -o sunset.png            # pick your own filename
nanaban "prompt" --ar wide --size 2k      # 16:9, high resolution
nanaban "prompt" --pro                    # higher quality model
nanaban "prompt" --neg "blurry, text"     # negative prompt
nanaban "prompt" -r style.png            # match the style of another image
nanaban edit photo.png "add sunglasses"   # edit an existing image
```

### Flags

| Flag | What it does | Default |
|------|-------------|---------|
| `-o, --output <file>` | Output path | auto from prompt |
| `--ar <ratio>` | Aspect ratio (see table below) | `1:1` |
| `--size <size>` | Resolution: `1k` `2k` `4k` | `1k` |
| `--pro` | Use Pro model — better detail, ~2x cost | off |
| `--neg <text>` | What to keep out of the image | |
| `-r, --ref <file>` | Reference image (style/content guidance) | |
| `--open` | Open in your default viewer after generating | off |
| `--json` | Structured JSON output for scripts | off |
| `--quiet` | Suppress non-essential output | off |

Every flag works with both `nanaban "prompt"` and `nanaban edit`.

### Aspect Ratios

14 aspect ratios — from square to extreme panoramic:

| Ratio | Shorthand | Good for |
|-------|-----------|----------|
| `1:1` | `square` | Profile pics, thumbnails |
| `4:3` | | Photos, slides |
| `3:2` | | Classic photo format |
| `5:4` | | Print, posters |
| `16:9` | `wide` | Hero images, banners, wallpapers |
| `21:9` | `ultrawide` | Cinematic, ultrawide monitors |
| `4:1` | `panoramic` | Panoramas, website headers |
| `8:1` | `banner` | Extreme banners, ribbons |
| `3:4` | | Portrait photos |
| `2:3` | `portrait` | Book covers, tall posters |
| `4:5` | | Instagram portrait |
| `9:16` | `tall` / `story` | Phone wallpapers, stories |
| `1:4` | | Tall strips, infographic panels |
| `1:8` | | Extreme vertical banners |

Note: `1:4`, `4:1`, `1:8`, `8:1` are only available on the NB2 (default) model. Pro supports the standard 10 ratios.

## Reference images

Pass any image as a style or content reference with `-r`:

```bash
nanaban "portrait of a woman" -r painting_style.png
nanaban "modern living room" -r color_palette.jpg
nanaban "product shot" -r brand_reference.png
```

The model picks up on the visual language of your reference — color palette, composition, texture, artistic style — and applies it to your prompt. Useful for keeping a consistent look across a batch of images, matching brand aesthetics, or steering the output toward a specific vibe without writing a 200-word prompt.

## Editing existing images

```bash
nanaban edit photo.png "remove the background"
nanaban edit headshot.png "make it a pencil sketch"
nanaban edit product.png "place on a marble table" --ar wide
```

Takes a source image and your edit instruction. Same flags apply — you can change aspect ratio, resolution, use Pro for finer edits.

## Models

| Model | Flag | Speed | Cost | Best for |
|-------|------|-------|------|----------|
| **NB2** (default) | — | ~3s | $0.04/img | Quick iterations, bulk generation, drafts |
| **Pro** | `--pro` | ~8s | ~$0.09/img | Final assets, detail-heavy work, text in images |

Both run on Gemini's image generation models (`gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview`).

## For LLM agents and scripts

`--json` gives you machine-readable output. No spinners, no colors, no ambiguity:

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

Error codes: `AUTH_MISSING`, `AUTH_INVALID`, `AUTH_EXPIRED`, `PROMPT_MISSING`, `IMAGE_NOT_FOUND`, `GENERATION_FAILED`, `RATE_LIMITED`, `NETWORK_ERROR`.

Exit codes: `0` success, `1` runtime error, `2` usage error.

## Piping

stdout is always just the file path. Metadata goes to stderr. So these compose naturally:

```bash
nanaban "a cat" | xargs open                              # generate and open
nanaban "a cat" 2>/dev/null | pbcopy                       # copy path to clipboard
cat prompts.txt | while read p; do nanaban "$p"; done      # batch generate
```

## Auto-naming

Your prompt becomes the filename. Common words get stripped, capped at 6 words, joined with underscores:

```
"a fox in a snowy forest at dawn" → fox_snowy_forest_dawn.png
```

Collisions auto-increment: `fox_snowy_forest.png`, `fox_snowy_forest_2.png`, `fox_snowy_forest_3.png`.

## Dependencies

Deliberately small:

- `@google/genai` + `google-auth-library` — Gemini API access
- `commander` — CLI parsing (~90KB)
- `nanospinner` — terminal spinner (~3KB)
- `picocolors` — terminal colors (~3KB)
- `tsx` + `typescript` — runs TypeScript source directly, no build step

## License

ISC

## Author

[Boris Djordjevic](https://github.com/199-biotechnologies)
