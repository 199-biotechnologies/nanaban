import { GoogleGenAI } from '@google/genai';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { getStoredKey, readConfig } from '../lib/config.js';
import { NB2Error } from '../lib/errors.js';

export interface AuthInfo {
  method: 'env' | 'config' | 'oauth';
  detail: string;
}

export interface ClientResult {
  client: GoogleGenAI;
  auth: AuthInfo;
}

async function getOAuthClient(): Promise<OAuth2Client | null> {
  // OAuth client credentials can come from:
  // 1. NANABAN_OAUTH_CLIENT_ID / NANABAN_OAUTH_CLIENT_SECRET env vars
  // 2. ~/.nanaban/config.json oauthClientId / oauthClientSecret fields
  const config = await readConfig();
  const clientId = process.env.NANABAN_OAUTH_CLIENT_ID || config.oauthClientId;
  const clientSecret = process.env.NANABAN_OAUTH_CLIENT_SECRET || config.oauthClientSecret;

  if (!clientId || !clientSecret) return null;

  const oauthPath = path.join(homedir(), '.gemini', 'oauth_creds.json');
  try {
    const raw = await fs.readFile(oauthPath, 'utf-8');
    const creds = JSON.parse(raw);

    const oauth2Client = new OAuth2Client({ clientId, clientSecret });
    oauth2Client.setCredentials(creds);

    const { token } = await oauth2Client.getAccessToken();
    if (!token) return null;

    return oauth2Client;
  } catch {
    return null;
  }
}

export async function createClient(): Promise<ClientResult> {
  // 1. API key from env (highest priority)
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envKey) {
    return {
      client: new GoogleGenAI({ apiKey: envKey }),
      auth: { method: 'env', detail: process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY' },
    };
  }

  // 2. Stored key from ~/.nanaban/config.json
  const storedKey = await getStoredKey();
  if (storedKey) {
    return {
      client: new GoogleGenAI({ apiKey: storedKey }),
      auth: { method: 'config', detail: '~/.nanaban/config.json' },
    };
  }

  // 3. Gemini CLI OAuth (requires OAuth client credentials in config or env)
  const oauthClient = await getOAuthClient();
  if (oauthClient) {
    return {
      client: new GoogleGenAI({ googleAuthOptions: { authClient: oauthClient } }),
      auth: { method: 'oauth', detail: '~/.gemini/oauth_creds.json' },
    };
  }

  throw new NB2Error(
    'AUTH_MISSING',
    'No authentication found. Run `nanaban auth set <key>`, set GEMINI_API_KEY, or login via Gemini CLI.'
  );
}

export async function checkAuth(): Promise<{ method: string; detail: string; valid: boolean }[]> {
  const results: { method: string; detail: string; valid: boolean }[] = [];

  // Check env
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envKey) {
    const varName = process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY';
    results.push({ method: 'env', detail: `${varName}=${envKey.slice(0, 8)}...`, valid: true });
  }

  // Check config
  const storedKey = await getStoredKey();
  if (storedKey) {
    results.push({ method: 'config', detail: `~/.nanaban/config.json (${storedKey.slice(0, 8)}...)`, valid: true });
  }

  // Check OAuth
  const oauthClient = await getOAuthClient();
  if (oauthClient) {
    results.push({ method: 'oauth', detail: '~/.gemini/oauth_creds.json', valid: true });
  } else {
    const oauthPath = path.join(homedir(), '.gemini', 'oauth_creds.json');
    const exists = await fs.access(oauthPath).then(() => true).catch(() => false);
    if (exists) {
      const config = await readConfig();
      const hasClientCreds = !!(process.env.NANABAN_OAUTH_CLIENT_ID || config.oauthClientId);
      const detail = hasClientCreds
        ? '~/.gemini/oauth_creds.json (expired/invalid)'
        : '~/.gemini/oauth_creds.json (no OAuth client credentials configured)';
      results.push({ method: 'oauth', detail, valid: false });
    }
  }

  return results;
}
