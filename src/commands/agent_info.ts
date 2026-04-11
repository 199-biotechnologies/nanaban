import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

export function runAgentInfo(): void {
  const manifest = {
    name: 'nanaban',
    version: getVersion(),
    description: 'Image generation from the terminal via Gemini API',
    commands: [
      {
        name: 'generate',
        description: 'Generate an image from a text prompt (default command)',
        usage: 'nanaban "prompt" [flags]',
        args: [
          { name: 'prompt', type: 'string', required: true, description: 'Image generation prompt' },
        ],
        flags: [
          { name: '--output', short: '-o', type: 'string', description: 'Output file path (auto-generated from prompt if omitted)' },
          { name: '--ar', type: 'string', default: '1:1', description: 'Aspect ratio: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9, 1:4, 4:1, 1:8, 8:1, square, wide, tall, ultrawide, panoramic, banner, portrait, story' },
          { name: '--size', type: 'string', default: '1k', description: 'Resolution: 1k, 2k, 4k' },
          { name: '--pro', type: 'boolean', default: false, description: 'Use Pro model (higher quality, ~2x cost)' },
          { name: '--neg', type: 'string', description: 'Negative prompt (what to avoid)' },
          { name: '--ref', short: '-r', type: 'string[]', description: 'Reference image path(s) for style/content guidance' },
          { name: '--open', type: 'boolean', default: false, description: 'Open in default viewer after generation' },
          { name: '--json', type: 'boolean', default: false, description: 'Structured JSON output for scripts/agents' },
          { name: '--quiet', type: 'boolean', default: false, description: 'Suppress non-essential output' },
        ],
      },
      {
        name: 'edit',
        description: 'Edit an existing image with a text instruction',
        usage: 'nanaban edit <image> "prompt" [flags]',
        args: [
          { name: 'image', type: 'string', required: true, description: 'Path to image to edit' },
          { name: 'prompt', type: 'string', required: true, description: 'Edit instructions' },
        ],
        flags: [
          { name: '--output', short: '-o', type: 'string', description: 'Output file path' },
          { name: '--ar', type: 'string', default: '1:1', description: 'Aspect ratio' },
          { name: '--size', type: 'string', default: '1k', description: 'Resolution: 1k, 2k, 4k' },
          { name: '--pro', type: 'boolean', default: false, description: 'Use Pro model' },
          { name: '--neg', type: 'string', description: 'Negative prompt' },
          { name: '--json', type: 'boolean', default: false, description: 'JSON output' },
          { name: '--quiet', type: 'boolean', default: false, description: 'Suppress output' },
          { name: '--open', type: 'boolean', default: false, description: 'Open after generation' },
        ],
      },
      {
        name: 'auth',
        description: 'Show authentication status',
        usage: 'nanaban auth',
        flags: [
          { name: '--json', type: 'boolean', default: false, description: 'JSON output' },
        ],
      },
      {
        name: 'auth set',
        description: 'Store API key in ~/.nanaban/config.json',
        usage: 'nanaban auth set <key>',
        args: [
          { name: 'key', type: 'string', required: true, description: 'Gemini API key' },
        ],
      },
      {
        name: 'agent-info',
        description: 'Machine-readable capability manifest (this output)',
        usage: 'nanaban agent-info',
      },
      {
        name: 'skill install',
        description: 'Install agent skill file to Claude, Codex, and Gemini skill directories',
        usage: 'nanaban skill install',
      },
      {
        name: 'skill status',
        description: 'Show which skill directories have nanaban installed',
        usage: 'nanaban skill status',
      },
    ],
    env_vars: [
      { name: 'GEMINI_API_KEY', description: 'Gemini API key (primary auth method)', required: false },
      { name: 'GOOGLE_API_KEY', description: 'Alternative Gemini API key', required: false },
      { name: 'NANABAN_OAUTH_CLIENT_ID', description: 'OAuth client ID for Gemini CLI auth', required: false },
      { name: 'NANABAN_OAUTH_CLIENT_SECRET', description: 'OAuth client secret for Gemini CLI auth', required: false },
    ],
    exit_codes: [
      { code: 0, meaning: 'success' },
      { code: 1, meaning: 'runtime error (generation failed, auth, network)' },
      { code: 2, meaning: 'usage error (missing prompt, image not found)' },
    ],
    error_codes: [
      { code: 'AUTH_MISSING', description: 'No valid authentication found' },
      { code: 'AUTH_INVALID', description: 'API key is invalid' },
      { code: 'AUTH_EXPIRED', description: 'OAuth token expired' },
      { code: 'PROMPT_MISSING', description: 'No prompt provided' },
      { code: 'IMAGE_NOT_FOUND', description: 'Source image does not exist' },
      { code: 'GENERATION_FAILED', description: 'Image generation failed' },
      { code: 'RATE_LIMITED', description: 'API rate limit exceeded' },
      { code: 'NETWORK_ERROR', description: 'Network connectivity issue' },
    ],
    config: {
      path: '~/.nanaban/config.json',
      format: 'json',
    },
    output_contract: {
      stdout: 'File path only (pipeable). With --json: full JSON envelope.',
      stderr: 'Metadata, spinner, errors (human mode only)',
      json_envelope: {
        success: '{"status":"success","file":"...","model":"...","dimensions":{"width":N,"height":N},"size_bytes":N,"duration_ms":N}',
        error: '{"status":"error","code":"ERROR_CODE","message":"..."}',
      },
    },
    install: 'npm install -g nanaban',
    repository: 'https://github.com/199-biotechnologies/nanaban',
  };

  process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
}
