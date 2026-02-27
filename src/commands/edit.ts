import fs from 'fs/promises';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { createClient } from '../core/client.js';
import { generateImage, type AspectRatio, type ImageSize } from '../core/generate.js';
import { autoName } from '../lib/naming.js';
import { createOutput, type Output } from '../lib/output.js';
import { normalizeError, NB2Error } from '../lib/errors.js';

export interface EditCommandOpts {
  output?: string;
  ar: string;
  size: string;
  json: boolean;
  quiet: boolean;
  open: boolean;
}

export async function runEdit(imagePath: string, prompt: string, opts: EditCommandOpts): Promise<void> {
  const out: Output = createOutput(opts.json, opts.quiet);

  if (!imagePath || !prompt) {
    const err = new NB2Error('PROMPT_MISSING', 'Usage: nanaban edit <image> "edit instructions"');
    out.error(err);
    process.exit(err.exitCode);
  }

  const resolved = path.resolve(imagePath);
  try {
    await fs.access(resolved);
  } catch {
    const err = new NB2Error('IMAGE_NOT_FOUND', `Image not found: ${resolved}`);
    out.error(err);
    process.exit(err.exitCode);
  }

  const aspectRatio: AspectRatio = (opts.ar || '1:1') as AspectRatio;
  const imageSize: ImageSize = (opts.size?.toUpperCase() || '1K') as ImageSize;

  out.spin('Editing image...');

  try {
    const { client, auth } = await createClient();
    out.info(`Auth: ${auth.method} (${auth.detail})`);

    const result = await generateImage(client, {
      mode: 'edit',
      prompt,
      aspectRatio,
      imageSize,
      referenceImages: [{ source: 'file', path: resolved }],
    }, process.cwd());

    const dir = process.cwd();
    const filename = opts.output || await autoName(prompt, dir);
    const filePath = path.resolve(dir, filename);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, result.buffer);

    out.stopSpin();
    out.success({
      file: filePath,
      model: result.model,
      width: result.width,
      height: result.height,
      sizeBytes: result.buffer.length,
      durationMs: result.durationMs,
    });

    if (opts.open) {
      const { exec } = await import('child_process');
      exec(`open "${filePath}"`);
    }
  } catch (err) {
    out.stopSpin();
    const nb2err = normalizeError(err);
    out.error(nb2err);
    process.exit(nb2err.exitCode);
  }
}
