#!/usr/bin/env npx tsx

/**
 * DEPRECATED: Use `nanaban` CLI instead.
 *   nanaban "prompt"                  — generate image
 *   nanaban edit photo.png "prompt"   — edit image
 *   nanaban --help                    — see all options
 *
 * This file is kept for backward compatibility with existing skill invocations.
 *
 * Usage:
 * npx tsx generate-image.ts --prompt "..." --output "path/to/output.png"
 */

import { resolve, dirname } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { parseArgs } from 'util';
import { generateImage, type AspectRatio, type ImageSize, type GenerationMode, type Model } from './gemini-image.js';

async function main() {
  const { values } = parseArgs({
    options: {
      prompt: { type: 'string', short: 'p' },
      output: { type: 'string', short: 'o' },
      model: { type: 'string', default: 'nb2' },
      aspectRatio: { type: 'string', default: '1:1' },
      imageSize: { type: 'string', default: '1K' },
      reference: { type: 'string', short: 'r', multiple: true },
      negative: { type: 'string' },
      format: { type: 'string', default: 'png' },
      edit: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help || !values.prompt || !values.output) {
    console.log(`
Nano Banana Image Generator (NB2 + Pro)
NOTE: Consider using the new 'nanaban' CLI instead.

Usage: npx tsx generate-image.ts --prompt "..." --output "output.png"

Options:
  --prompt, -p Text prompt (required)
  --output, -o Output path (required)
  --model      nb2 (default, Nano Banana 2) or pro (Nano Banana Pro)
  --aspectRatio 1:1, 16:9, 9:16, 4:3, 3:4 (default: 1:1)
  --imageSize   1K, 2K, 4K (default: 1K)
  --reference, -r Reference image (repeatable)
  --negative    What to avoid
  --format      png or webp (default: png)
  --edit        Edit mode
  --help, -h    Show help

Auth: Set GEMINI_API_KEY or login via Gemini CLI (gemini auth login)
    `);
    process.exit(values.help ? 0 : 1);
  }

  const model = (values.model as Model) || 'nb2';
  const aspectRatio = values.aspectRatio as AspectRatio;
  const imageSize = values.imageSize as ImageSize;
  const mode: GenerationMode = values.edit ? 'edit' : 'generate';

  if (mode === 'edit' && (!values.reference || values.reference.length === 0)) {
    console.error('Error: Edit mode requires at least one --reference image');
    process.exit(1);
  }

  const referenceImages = values.reference?.map((p: string) => ({ source: 'file' as const, path: p }));

  console.log(`Model: ${model}, Mode: ${mode}`);
  console.log(`Prompt: "${values.prompt.slice(0, 50)}${values.prompt.length > 50 ? '...' : ''}"`);
  console.log(`Aspect: ${aspectRatio}, Size: ${imageSize}`);

  try {
    const result = await generateImage({
      mode,
      model,
      prompt: values.prompt,
      negativePrompt: values.negative,
      aspectRatio,
      imageSize,
      referenceImages,
      outputFormat: values.format === 'webp' ? 'webp' : 'png',
    }, process.cwd());

    await mkdir(dirname(resolve(values.output)), { recursive: true });
    await writeFile(resolve(values.output), result.buffer);

    console.log(`\nSaved: ${values.output}`);
    console.log(` ${result.width}x${result.height}, ${result.mimeType}, ${result.buffer.length} bytes`);
  } catch (err: any) {
    console.error('\nError:', err.message);
    process.exit(1);
  }
}

main();
