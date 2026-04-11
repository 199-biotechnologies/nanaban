import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tsx = join(root, 'node_modules', '.bin', 'tsx');
const cli = join(root, 'src', 'cli.ts');

function run(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync(tsx, [cli, ...args], {
      cwd: root,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
      timeout: 10_000,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || '',
      exitCode: err.status ?? 1,
    };
  }
}

describe('agent-info', () => {
  it('returns valid JSON', () => {
    const { stdout, exitCode } = run(['agent-info']);
    assert.equal(exitCode, 0, 'agent-info should exit 0');
    const manifest = JSON.parse(stdout);
    assert.equal(manifest.name, 'nanaban');
    assert.ok(manifest.version);
  });

  it('lists all commands', () => {
    const { stdout } = run(['agent-info']);
    const manifest = JSON.parse(stdout);
    const names = manifest.commands.map((c: any) => c.name);
    assert.ok(names.includes('generate'), 'missing generate');
    assert.ok(names.includes('edit'), 'missing edit');
    assert.ok(names.includes('auth'), 'missing auth');
    assert.ok(names.includes('auth set'), 'missing auth set');
    assert.ok(names.includes('agent-info'), 'missing agent-info');
    assert.ok(names.includes('skill install'), 'missing skill install');
  });

  it('lists all error codes', () => {
    const { stdout } = run(['agent-info']);
    const manifest = JSON.parse(stdout);
    const codes = manifest.error_codes.map((e: any) => e.code);
    for (const expected of ['AUTH_MISSING', 'AUTH_INVALID', 'AUTH_EXPIRED', 'PROMPT_MISSING', 'IMAGE_NOT_FOUND', 'GENERATION_FAILED', 'RATE_LIMITED', 'NETWORK_ERROR']) {
      assert.ok(codes.includes(expected), `missing error code: ${expected}`);
    }
  });

  it('lists exit codes 0, 1, 2', () => {
    const { stdout } = run(['agent-info']);
    const manifest = JSON.parse(stdout);
    const exitCodes = manifest.exit_codes.map((e: any) => e.code);
    assert.deepEqual(exitCodes.sort(), [0, 1, 2]);
  });

  it('lists env vars', () => {
    const { stdout } = run(['agent-info']);
    const manifest = JSON.parse(stdout);
    const vars = manifest.env_vars.map((v: any) => v.name);
    assert.ok(vars.includes('GEMINI_API_KEY'));
    assert.ok(vars.includes('GOOGLE_API_KEY'));
  });

  it('declares config path and format', () => {
    const { stdout } = run(['agent-info']);
    const manifest = JSON.parse(stdout);
    assert.equal(manifest.config.path, '~/.nanaban/config.json');
    assert.equal(manifest.config.format, 'json');
  });
});

describe('version and help', () => {
  it('--version exits 0', () => {
    const { exitCode, stdout } = run(['--version']);
    assert.equal(exitCode, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  it('--help exits 0', () => {
    const { exitCode } = run(['--help']);
    assert.equal(exitCode, 0);
  });

  it('edit --help exits 0', () => {
    const { exitCode } = run(['edit', '--help']);
    assert.equal(exitCode, 0);
  });

  it('auth --help exits 0', () => {
    const { exitCode } = run(['auth', '--help']);
    assert.equal(exitCode, 0);
  });

  it('skill --help exits 0', () => {
    const { exitCode } = run(['skill', '--help']);
    assert.equal(exitCode, 0);
  });
});

describe('exit codes', () => {
  it('no prompt shows help and exits 0', () => {
    const { exitCode } = run([]);
    assert.equal(exitCode, 0);
  });
});

describe('skill status', () => {
  it('--json returns valid JSON', () => {
    const { stdout, exitCode } = run(['skill', 'status', '--json']);
    assert.equal(exitCode, 0);
    const result = JSON.parse(stdout);
    assert.ok(Array.isArray(result.targets));
    assert.ok(result.targets.length > 0);
    assert.ok(result.targets[0].name);
    assert.ok(typeof result.targets[0].installed === 'boolean');
  });
});
