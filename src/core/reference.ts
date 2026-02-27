import fs from 'fs/promises';
import path from 'path';

export interface ReferenceImage {
  source: 'file' | 'base64' | 'url';
  path?: string;
  data?: string;
  url?: string;
  mimeType?: string;
}

export interface LoadedImage {
  mimeType: string;
  data: string;
}

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export async function loadReferenceImage(ref: ReferenceImage, basePath?: string): Promise<LoadedImage> {
  if (ref.source === 'base64' && ref.data) {
    return { mimeType: ref.mimeType || 'image/png', data: ref.data };
  }

  if (ref.source === 'url' && ref.url) {
    const response = await fetch(ref.url);
    if (!response.ok) throw new Error(`Failed to fetch: ${ref.url}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    return { mimeType: response.headers.get('content-type') || 'image/png', data: buffer.toString('base64') };
  }

  if (ref.source === 'file' && ref.path) {
    const filePath = basePath ? path.resolve(basePath, ref.path) : path.resolve(ref.path);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return { mimeType: MIME_MAP[ext] || 'image/png', data: buffer.toString('base64') };
  }

  throw new Error('Invalid reference image configuration');
}
