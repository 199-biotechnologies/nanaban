import pc from 'picocolors';
import { createSpinner } from 'nanospinner';
import type { Spinner } from 'nanospinner';
import type { NB2Error } from './errors.js';

export interface GenerateResult {
  file: string;
  model: string;
  transport: string;
  width: number;
  height: number;
  sizeBytes: number;
  durationMs: number;
  costUsd?: number;
}

export interface Output {
  spin(text: string): void;
  stopSpin(): void;
  success(result: GenerateResult): void;
  error(err: NB2Error): void;
  info(text: string): void;
  authStatus(method: string, detail: string, valid: boolean): void;
}

export class HumanOutput implements Output {
  private spinner: Spinner | null = null;
  private quiet: boolean;

  constructor(quiet = false) {
    this.quiet = quiet;
  }

  spin(text: string): void {
    if (this.quiet) return;
    this.spinner = createSpinner(text).start();
  }

  stopSpin(): void {
    this.spinner?.stop();
    this.spinner = null;
  }

  success(r: GenerateResult): void {
    this.spinner?.success({ text: pc.bold(r.file) });
    this.spinner = null;
    if (!this.quiet) {
      const kb = Math.round(r.sizeBytes / 1024);
      const sec = (r.durationMs / 1000).toFixed(1);
      const cost = r.costUsd !== undefined ? ` | $${r.costUsd.toFixed(4)}` : '';
      const meta = pc.dim(`     ${r.width}x${r.height} | ${kb} KB | ${sec}s${cost} | ${r.model} (${r.transport})`);
      process.stderr.write(meta + '\n');
    }
    process.stdout.write(r.file + '\n');
  }

  error(err: NB2Error): void {
    if (this.spinner) {
      this.spinner.error({ text: pc.red(err.message) });
      this.spinner = null;
    } else {
      process.stderr.write(pc.red(`Error: ${err.message}`) + '\n');
    }
    process.stderr.write(pc.dim(`     code: ${err.code}`) + '\n');
  }

  info(text: string): void {
    if (!this.quiet) process.stderr.write(pc.dim(text) + '\n');
  }

  authStatus(method: string, detail: string, valid: boolean): void {
    const icon = valid ? pc.green('OK') : pc.red('FAIL');
    process.stderr.write(`${icon} ${pc.bold(method)}: ${detail}\n`);
  }
}

export class JsonOutput implements Output {
  spin(_text: string): void {}
  stopSpin(): void {}

  success(r: GenerateResult): void {
    const out: Record<string, unknown> = {
      status: 'success',
      file: r.file,
      model: r.model,
      transport: r.transport,
      dimensions: { width: r.width, height: r.height },
      size_bytes: r.sizeBytes,
      duration_ms: r.durationMs,
    };
    if (r.costUsd !== undefined) out.cost_usd = r.costUsd;
    process.stdout.write(JSON.stringify(out) + '\n');
  }

  error(err: NB2Error): void {
    process.stdout.write(JSON.stringify({ status: 'error', code: err.code, message: err.message }) + '\n');
  }

  info(_text: string): void {}

  authStatus(method: string, detail: string, valid: boolean): void {
    process.stdout.write(JSON.stringify({ method, detail, valid }) + '\n');
  }
}

export function createOutput(json: boolean, quiet: boolean): Output {
  return json ? new JsonOutput() : new HumanOutput(quiet);
}
