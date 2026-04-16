import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';
import { readConfig, getStoredKey, getStoredOpenRouterKey } from '../lib/config.js';
import { NB2Error } from '../lib/errors.js';
import type { ModelInfo, TransportId } from './models.js';
import { TRANSPORT_PREFERENCE } from './models.js';

export type KeyedSource =
  | { type: 'env'; key: string; name: string }
  | { type: 'config'; key: string; path: string };

export type GeminiSource =
  | KeyedSource
  | { type: 'oauth'; client: OAuth2Client; path: string };

export type AuthSource = GeminiSource;

export interface AuthState {
  gemini: GeminiSource | null;
  openRouter: KeyedSource | null;
}

async function getOAuthClient(): Promise<OAuth2Client | null> {
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

export async function detectAuth(): Promise<AuthState> {
  const state: AuthState = { gemini: null, openRouter: null };

  const envGemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envGemini) {
    state.gemini = {
      type: 'env',
      key: envGemini,
      name: process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY',
    };
  } else {
    const stored = await getStoredKey();
    if (stored) {
      state.gemini = { type: 'config', key: stored, path: '~/.nanaban/config.json' };
    } else {
      const oauth = await getOAuthClient();
      if (oauth) {
        state.gemini = { type: 'oauth', client: oauth, path: '~/.gemini/oauth_creds.json' };
      }
    }
  }

  const envOR = process.env.OPENROUTER_API_KEY;
  if (envOR) {
    state.openRouter = { type: 'env', key: envOR, name: 'OPENROUTER_API_KEY' };
  } else {
    const stored = await getStoredOpenRouterKey();
    if (stored) {
      state.openRouter = { type: 'config', key: stored, path: '~/.nanaban/config.json' };
    }
  }

  return state;
}

export function transportAvailable(t: TransportId, auth: AuthState): boolean {
  if (t === 'gemini-direct') return auth.gemini !== null;
  if (t === 'openrouter') return auth.openRouter !== null;
  return false;
}

export interface ResolvedRoute {
  transport: TransportId;
  modelId: string;
  authKey?: string;
  oauthClient?: OAuth2Client;
}

export function resolveRoute(model: ModelInfo, auth: AuthState, forced?: TransportId): ResolvedRoute {
  const tryTransport = (t: TransportId): ResolvedRoute | null => {
    const modelId = model.ids[t];
    if (!modelId) return null;
    if (!transportAvailable(t, auth)) return null;
    if (t === 'gemini-direct') {
      const g = auth.gemini!;
      if (g.type === 'oauth') return { transport: t, modelId, oauthClient: g.client };
      return { transport: t, modelId, authKey: g.key };
    }
    return { transport: t, modelId, authKey: auth.openRouter!.key };
  };

  if (forced) {
    const r = tryTransport(forced);
    if (!r) {
      const reason = !model.ids[forced]
        ? `${model.id} cannot run on ${forced}`
        : `${forced} requires ${forced === 'openrouter' ? 'OPENROUTER_API_KEY' : 'GEMINI_API_KEY'}`;
      throw new NB2Error('TRANSPORT_UNAVAILABLE', reason);
    }
    return r;
  }

  for (const t of TRANSPORT_PREFERENCE) {
    const r = tryTransport(t);
    if (r) return r;
  }

  const needs = Object.keys(model.ids).map(t => t === 'gemini-direct' ? 'GEMINI_API_KEY' : 'OPENROUTER_API_KEY');
  throw new NB2Error(
    'AUTH_MISSING',
    `Cannot reach ${model.display}: requires one of ${needs.join(' or ')}. Run \`nanaban auth set <key>\` or set the env var.`,
  );
}

export function makeGeminiClient(auth: AuthState): GoogleGenAI {
  if (!auth.gemini) throw new NB2Error('AUTH_MISSING', 'No Gemini auth configured');
  if (auth.gemini.type === 'oauth') {
    return new GoogleGenAI({ googleAuthOptions: { authClient: auth.gemini.client as any } });
  }
  return new GoogleGenAI({ apiKey: auth.gemini.key });
}
