import { checkAuth } from '../core/client.js';
import { setStoredKey } from '../lib/config.js';
import { createOutput } from '../lib/output.js';

export async function runAuthStatus(json: boolean): Promise<void> {
  const methods = await checkAuth();

  if (json) {
    const hasValid = methods.some(m => m.valid);
    const status = methods.length === 0 ? 'none' : hasValid ? 'ok' : 'invalid';
    process.stdout.write(JSON.stringify({ status, methods }) + '\n');
    if (!hasValid) process.exit(1);
    return;
  }

  const out = createOutput(false, false);
  if (methods.length === 0) {
    out.authStatus('none', 'No authentication configured. Run `nanaban auth set <key>` or set GEMINI_API_KEY.', false);
    process.exit(1);
  }

  for (const m of methods) {
    out.authStatus(m.method, m.detail, m.valid);
  }

  const hasValid = methods.some(m => m.valid);
  if (!hasValid) process.exit(1);
}

export async function runAuthSet(key: string, json: boolean): Promise<void> {
  if (!key) {
    if (json) {
      process.stdout.write(JSON.stringify({ status: 'error', code: 'USAGE', message: 'No key provided. Usage: nanaban auth set <key>' }) + '\n');
    } else {
      const out = createOutput(false, false);
      out.authStatus('config', 'No key provided. Usage: nanaban auth set <key>', false);
    }
    process.exit(2);
  }

  await setStoredKey(key);
  if (json) {
    process.stdout.write(JSON.stringify({ status: 'ok', message: 'API key saved to ~/.nanaban/config.json' }) + '\n');
  } else {
    const out = createOutput(false, false);
    out.authStatus('config', 'API key saved to ~/.nanaban/config.json', true);
  }
}
