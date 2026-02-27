import { checkAuth } from '../core/client.js';
import { setStoredKey } from '../lib/config.js';
import { createOutput } from '../lib/output.js';

export async function runAuthStatus(json: boolean): Promise<void> {
  const out = createOutput(json, false);
  const methods = await checkAuth();

  if (methods.length === 0) {
    out.authStatus('none', 'No authentication configured. Run `nb2 auth set <key>` or set GEMINI_API_KEY.', false);
    process.exit(1);
  }

  for (const m of methods) {
    out.authStatus(m.method, m.detail, m.valid);
  }

  const hasValid = methods.some(m => m.valid);
  if (!hasValid) process.exit(1);
}

export async function runAuthSet(key: string, json: boolean): Promise<void> {
  const out = createOutput(json, false);

  if (!key) {
    out.authStatus('config', 'No key provided. Usage: nb2 auth set <key>', false);
    process.exit(2);
  }

  await setStoredKey(key);
  out.authStatus('config', 'API key saved to ~/.nb2/config.json', true);
}
