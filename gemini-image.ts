/**
 * Backward-compatibility re-export.
 * New code should import from src/core/ directly.
 */

export { type ReferenceImage } from './src/core/reference.js';
export { type Model, type AspectRatio, type ImageSize, type GenerationMode } from './src/core/generate.js';
export type { GenerateResult as ImageResult } from './src/core/generate.js';

// Re-export ImageOptions interface and generateImage with the old signature
import { createClient } from './src/core/client.js';
import { generateImage as _generateImage, type GenerateOptions } from './src/core/generate.js';
import type { ReferenceImage } from './src/core/reference.js';
import type { Model, AspectRatio, ImageSize, GenerationMode } from './src/core/generate.js';

export interface ImageOptions {
  mode: GenerationMode;
  model?: Model;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  referenceImages?: ReferenceImage[];
  outputFormat?: 'png' | 'webp';
}

export interface ImageResult {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  model: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}

export async function generateImage(options: ImageOptions, basePath?: string): Promise<ImageResult> {
  const { client } = await createClient();
  const result = await _generateImage(client, {
    mode: options.mode,
    model: options.model,
    prompt: options.prompt,
    negativePrompt: options.negativePrompt,
    aspectRatio: options.aspectRatio,
    imageSize: options.imageSize,
    referenceImages: options.referenceImages,
  }, basePath);

  return {
    buffer: result.buffer,
    mimeType: result.mimeType,
    width: result.width,
    height: result.height,
    model: result.model,
    aspectRatio: options.aspectRatio || '1:1',
    imageSize: options.imageSize || '1K',
  };
}
