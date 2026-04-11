import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const SKILL_CONTENT = `---
name: nanaban
description: >
  Generate and edit images from the terminal via Gemini API. Use when user asks
  to create, generate, or make an image, picture, graphic, illustration, or visual.
  Run \\\`nanaban agent-info\\\` for the full machine-readable capability manifest.
---

# nanaban — Image Generation CLI

\\\`\\\`\\\`bash
nanaban "PROMPT"                          # generate, auto-name, save to CWD
nanaban "PROMPT" -o output.png            # custom filename
nanaban "PROMPT" --ar wide --size 2k      # 16:9, high resolution
nanaban "PROMPT" --pro                    # higher quality model
nanaban "PROMPT" --neg "blurry, text"     # negative prompt
nanaban "PROMPT" -r style.png             # match style of reference image
nanaban edit photo.png "add sunglasses"   # edit existing image
nanaban agent-info                        # machine-readable manifest
\\\`\\\`\\\`

## Auth (automatic, priority order)
1. \\\`GEMINI_API_KEY\\\` / \\\`GOOGLE_API_KEY\\\` env var
2. \\\`~/.nanaban/config.json\\\` — stored via \\\`nanaban auth set <key>\\\`
3. Gemini CLI OAuth (\\\`~/.gemini/oauth_creds.json\\\`)

## Key flags
| Flag | Description | Default |
|------|-------------|---------|
| \\\`-o, --output <file>\\\` | Output path | auto from prompt |
| \\\`--ar <ratio>\\\` | 1:1, 16:9, 9:16, 4:3, etc. (also: square, wide, tall) | 1:1 |
| \\\`--size <size>\\\` | 1k, 2k, 4k | 1k |
| \\\`--pro\\\` | Use Pro model (better detail, ~2x cost) | off |
| \\\`--neg <text>\\\` | Negative prompt | |
| \\\`-r, --ref <file>\\\` | Reference image for style guidance | |
| \\\`--json\\\` | Structured JSON output for scripts/agents | off |

## JSON mode
\\\`\\\`\\\`bash
nanaban "a red circle" --json
\\\`\\\`\\\`
Returns: \\\`{"status":"success","file":"...","model":"...","dimensions":{...},"size_bytes":N,"duration_ms":N}\\\`

## Models
- **NB2** (default): ~3s, fast iterations
- **Pro** (\\\`--pro\\\`): ~8s, higher quality

## Output contract
- stdout = file path only (pipeable: \\\`nanaban "cat" | xargs open\\\`)
- stderr = metadata, spinner, errors
- Exit codes: 0 success, 1 runtime error, 2 usage error
`;

interface SkillTarget {
  name: string;
  dir: string;
  file: string;
}

function getTargets(): SkillTarget[] {
  const home = homedir();
  return [
    { name: 'Claude', dir: join(home, '.claude', 'skills', 'nanaban'), file: 'SKILL.md' },
    { name: 'Codex', dir: join(home, '.codex', 'skills', 'nanaban'), file: 'SKILL.md' },
    { name: 'Gemini', dir: join(home, '.gemini', 'skills', 'nanaban'), file: 'SKILL.md' },
  ];
}

export async function runSkillInstall(json: boolean): Promise<void> {
  const targets = getTargets();
  const results: { name: string; path: string; status: string }[] = [];

  for (const t of targets) {
    try {
      await mkdir(t.dir, { recursive: true });
      const fullPath = join(t.dir, t.file);
      await writeFile(fullPath, SKILL_CONTENT, 'utf-8');
      results.push({ name: t.name, path: fullPath, status: 'installed' });
    } catch (err) {
      results.push({ name: t.name, path: join(t.dir, t.file), status: `failed: ${(err as Error).message}` });
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ status: 'success', targets: results }) + '\n');
  } else {
    for (const r of results) {
      const icon = r.status === 'installed' ? '\u2713' : '\u2717';
      process.stderr.write(`${icon} ${r.name}: ${r.path}\n`);
    }
  }
}

export async function runSkillStatus(json: boolean): Promise<void> {
  const targets = getTargets();
  const results: { name: string; path: string; installed: boolean }[] = [];

  for (const t of targets) {
    const fullPath = join(t.dir, t.file);
    const installed = await access(fullPath).then(() => true).catch(() => false);
    results.push({ name: t.name, path: fullPath, installed });
  }

  if (json) {
    process.stdout.write(JSON.stringify({ targets: results }) + '\n');
  } else {
    for (const r of results) {
      const icon = r.installed ? '\u2713' : '\u2717';
      process.stderr.write(`${icon} ${r.name}: ${r.path}\n`);
    }
  }
}
