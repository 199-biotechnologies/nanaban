import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

const CONFIG_DIR = path.join(homedir(), '.nanaban');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export interface NB2Config {
  apiKey?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
}

export async function readConfig(): Promise<NB2Config> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function writeConfig(config: NB2Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export async function getStoredKey(): Promise<string | undefined> {
  const config = await readConfig();
  return config.apiKey;
}

export async function setStoredKey(key: string): Promise<void> {
  const config = await readConfig();
  config.apiKey = key;
  await writeConfig(config);
}
