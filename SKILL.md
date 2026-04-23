---
name: nanaban
description: Generate, edit, or modify images from the terminal via the `nanaban` CLI — use whenever the user asks to create, make, generate, render, draw, produce, design, edit, modify, or change an image, picture, photo, illustration, graphic, icon, logo, banner, hero, thumbnail, wallpaper, product shot, concept art, mockup, or visual. Defaults to GPT Image 2 on ChatGPT Plus/Pro (free via Codex OAuth) when available, otherwise Nano Banana 2. Run `nanaban agent-info` for the machine-readable manifest of every model, transport, flag, and error code (including a per-code recovery map).
---

# nanaban

```bash
nanaban "PROMPT"                        # generate (auto-names file, saves to CWD)
nanaban "PROMPT" -o out.png --ar wide   # custom path, 16:9
nanaban edit photo.png "add sunglasses" # edit an existing image
nanaban auth                            # show what's reachable
nanaban agent-info                      # full capability manifest (use this)
```

Pass `--json` for structured output (status/file/model/transport/cost_usd/duration_ms). Stdout is always just the file path — compose with `xargs`, `pbcopy`, etc.
