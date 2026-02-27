import pc from 'picocolors';
import { createSpinner } from 'nanospinner';
import type { Spinner } from 'nanospinner';
import type { NB2Error } from './errors.js';

export interface GenerateResult {
  file: string;
  model: string;
  width: number;
  height: number;
  sizeBytes: number;
  durationMs: number;
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
      const meta = pc.dim(`     ${r.width}x${r.height} | ${kb} KB | ${sec}s | ${r.model}`);
      process.stderr.write(meta + '\n');
    }
    // Always print file path to stdout (pipeable)
    process.stdout.write(r.file + '\n');
  }

  error(err: NB2Error): void {
    if (this.spinner) {
      this.spinner.error({ text: pc.red(err.message) });
      this.spinner = null;
    } else {
      process.stderr.write(pc.red(`Error: ${err.message}`) + '\n');
    }
    // Always show error code — errors must never be silenced
    process.stderr.write(pc.dim(`     code: ${err.code}`) + '\n');
  }

  info(text: string): void {
    if (!this.quiet) {
      process.stderr.write(pc.dim(text) + '\n');
    }
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
    const out = {
      status: 'success',
      file: r.file,
      model: r.model,
      dimensions: { width: r.width, height: r.height },
      size_bytes: r.sizeBytes,
      duration_ms: r.durationMs,
    };
    process.stdout.write(JSON.stringify(out) + '\n');
  }

  error(err: NB2Error): void {
    const out = {
      status: 'error',
      code: err.code,
      message: err.message,
    };
    process.stdout.write(JSON.stringify(out) + '\n');
  }

  info(_text: string): void {}

  authStatus(method: string, detail: string, valid: boolean): void {
    const out = { method, detail, valid };
    process.stdout.write(JSON.stringify(out) + '\n');
  }
}

export function createOutput(json: boolean, quiet: boolean): Output {
  return json ? new JsonOutput() : new HumanOutput(quiet);
}
