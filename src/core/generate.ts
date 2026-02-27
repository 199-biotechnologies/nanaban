import type { GoogleGenAI } from '@google/genai';
import { loadReferenceImage, type ReferenceImage } from './reference.js';
import { NB2Error } from '../lib/errors.js';

export type Model = 'nb2' | 'pro';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageSize = '1K' | '2K' | '4K';
export type GenerationMode = 'generate' | 'edit';

export const MODEL_IDS: Record<Model, string> = {
  nb2: 'gemini-3.1-flash-image-preview',
  pro: 'gemini-3-pro-image-preview',
};

export const ASPECT_ALIASES: Record<string, AspectRatio> = {
  square: '1:1',
  wide: '16:9',
  tall: '9:16',
};

const VALID_RATIOS = new Set<string>(['1:1', '16:9', '9:16', '4:3', '3:4']);
const VALID_SIZES = new Set<string>(['1K', '2K', '4K']);

export function parseAspectRatio(input: string): AspectRatio {
  const resolved = ASPECT_ALIASES[input] || input;
  if (!VALID_RATIOS.has(resolved)) {
    throw new NB2Error('GENERATION_FAILED', `Invalid aspect ratio "${input}". Use: 1:1, 16:9, 9:16, 4:3, 3:4, square, wide, tall`);
  }
  return resolved as AspectRatio;
}

export function parseImageSize(input: string): ImageSize {
  const normalized = input.toUpperCase();
  if (!VALID_SIZES.has(normalized)) {
    throw new NB2Error('GENERATION_FAILED', `Invalid size "${input}". Use: 1k, 2k, 4k`);
  }
  return normalized as ImageSize;
}

export interface GenerateOptions {
  mode: GenerationMode;
  model?: Model;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  referenceImages?: ReferenceImage[];
}

export interface GenerateResult {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  model: string;
  durationMs: number;
}

function getDimensions(aspectRatio: AspectRatio, imageSize: ImageSize): { width: number; height: number } {
  const base: Record<ImageSize, number> = { '1K': 1024, '2K': 2048, '4K': 4096 };
  const b = base[imageSize];
  const ratios: Record<AspectRatio, { width: number; height: number }> = {
    '1:1': { width: b, height: b },
    '16:9': { width: b, height: Math.round(b * (9 / 16)) },
    '9:16': { width: Math.round(b * (9 / 16)), height: b },
    '4:3': { width: b, height: Math.round(b * (3 / 4)) },
    '3:4': { width: Math.round(b * (3 / 4)), height: b },
  };
  return ratios[aspectRatio];
}

export async function generateImage(client: GoogleGenAI, options: GenerateOptions, basePath?: string): Promise<GenerateResult> {
  const model = options.model || 'nb2';
  const modelId = MODEL_IDS[model];
  const aspectRatio = options.aspectRatio || '1:1';
  const imageSize = options.imageSize || '1K';
  const { width, height } = getDimensions(aspectRatio, imageSize);

  const parts: any[] = [];

  // Load reference images
  if (options.referenceImages && options.referenceImages.length > 0) {
    for (const ref of options.referenceImages) {
      const { mimeType, data } = await loadReferenceImage(ref, basePath);
      parts.push({ inlineData: { mimeType, data } });
    }
  }

  // Build prompt
  let prompt = options.prompt;
  if (aspectRatio !== '1:1') prompt += `\n\nImage aspect ratio: ${aspectRatio}`;
  if (options.negativePrompt) prompt += `\n\nAvoid: ${options.negativePrompt}`;
  parts.push({ text: prompt });

  const startTime = Date.now();

  const response = await client.models.generateContent({
    model: modelId,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  const candidate = response?.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new NB2Error('GENERATION_FAILED', 'No content returned from model');
  }

  let imageBuffer: Buffer | null = null;
  let mimeType = 'image/png';

  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      mimeType = part.inlineData.mimeType || mimeType;
      imageBuffer = Buffer.from(part.inlineData.data!, 'base64');
      break;
    }
  }

  if (!imageBuffer) {
    throw new NB2Error('GENERATION_FAILED', 'No image data returned from model');
  }

  return {
    buffer: imageBuffer,
    mimeType,
    width,
    height,
    model: modelId,
    durationMs: Date.now() - startTime,
  };
}
