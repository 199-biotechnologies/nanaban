import fs from 'fs/promises';
import path from 'path';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'that', 'this', 'these', 'those', 'it', 'its', 'my', 'your',
  'very', 'really', 'just', 'also', 'so', 'than', 'then',
  'some', 'any', 'each', 'every', 'all', 'both', 'few', 'more',
]);

const MAX_WORDS = 6;

export function slugFromPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w));

  const slug = words.slice(0, MAX_WORDS).join('_');
  return slug || 'image';
}

export async function autoName(prompt: string, dir: string, ext = '.png'): Promise<string> {
  const base = slugFromPrompt(prompt);
  let candidate = base + ext;
  let i = 2;

  while (true) {
    try {
      await fs.access(path.join(dir, candidate));
      candidate = `${base}_${i}${ext}`;
      i++;
    } catch {
      return candidate;
    }
  }
}
