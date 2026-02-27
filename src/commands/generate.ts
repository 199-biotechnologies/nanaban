import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { createClient } from '../core/client.js';
import { generateImage, parseAspectRatio, parseImageSize, type Model } from '../core/generate.js';
import { autoName } from '../lib/naming.js';
import { createOutput, type Output } from '../lib/output.js';
import { normalizeError, NB2Error } from '../lib/errors.js';

export interface GenerateCommandOpts {
  output?: string;
  ar: string;
  size: string;
  pro: boolean;
  neg?: string;
  ref?: string[];
  open: boolean;
  json: boolean;
  quiet: boolean;
}

export async function runGenerate(prompt: string, opts: GenerateCommandOpts): Promise<void> {
  const out: Output = createOutput(opts.json, opts.quiet);

  if (!prompt) {
    const err = new NB2Error('PROMPT_MISSING', 'No prompt provided. Usage: nanaban "your prompt"');
    out.error(err);
    process.exit(err.exitCode);
  }

  try {
    const aspectRatio = parseAspectRatio(opts.ar || '1:1');
    const imageSize = parseImageSize(opts.size || '1k');
    const model: Model = opts.pro ? 'pro' : 'nb2';

    out.spin('Generating image...');

    const { client, auth } = await createClient();
    out.info(`Auth: ${auth.method} (${auth.detail})`);

    const result = await generateImage(client, {
      mode: 'generate',
      model,
      prompt,
      negativePrompt: opts.neg,
      aspectRatio,
      imageSize,
      referenceImages: opts.ref?.map(p => ({ source: 'file' as const, path: p })),
    }, process.cwd());

    // Determine output path
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
      const { execFile } = await import('child_process');
      execFile('open', [filePath]);
    }
  } catch (err) {
    out.stopSpin();
    const nb2err = normalizeError(err);
    out.error(nb2err);
    process.exit(nb2err.exitCode);
  }
}
