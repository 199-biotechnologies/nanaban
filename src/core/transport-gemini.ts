import type { GoogleGenAI } from '@google/genai';
import { loadReferenceImage } from './reference.js';
import { NB2Error } from '../lib/errors.js';
import type { ImageRequest, ImageResult, AspectRatio, ImageSize } from './types.js';

function dimensionsFor(aspectRatio: AspectRatio, size: ImageSize): { width: number; height: number } {
  const base: Record<ImageSize, number> = { '0.5K': 512, '1K': 1024, '2K': 2048, '4K': 4096 };
  const b = base[size];
  const [w, h] = aspectRatio.split(':').map(Number);
  return w >= h
    ? { width: b, height: Math.round(b * (h / w)) }
    : { width: Math.round(b * (w / h)), height: b };
}

export async function generateViaGemini(
  client: GoogleGenAI,
  modelId: string,
  request: ImageRequest,
  basePath?: string,
): Promise<ImageResult> {
  const aspectRatio = request.aspectRatio || '1:1';
  const imageSize = request.imageSize || '1K';
  const dims = dimensionsFor(aspectRatio, imageSize);

  const parts: any[] = [];

  if (request.referenceImages?.length) {
    for (const ref of request.referenceImages) {
      const { mimeType, data } = await loadReferenceImage(ref, basePath);
      parts.push({ inlineData: { mimeType, data } });
    }
  }

  let prompt = request.prompt;
  if (aspectRatio !== '1:1') prompt += `\n\nImage aspect ratio: ${aspectRatio}`;
  if (request.negativePrompt) prompt += `\n\nAvoid: ${request.negativePrompt}`;
  parts.push({ text: prompt });

  const start = Date.now();
  const response = await client.models.generateContent({
    model: modelId,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  const candidate = response?.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new NB2Error('GENERATION_FAILED', 'No content returned from Gemini');
  }

  let buffer: Buffer | null = null;
  let mimeType = 'image/png';
  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      mimeType = part.inlineData.mimeType || mimeType;
      buffer = Buffer.from(part.inlineData.data!, 'base64');
      break;
    }
  }
  if (!buffer) throw new NB2Error('GENERATION_FAILED', 'No image data returned from Gemini');

  return {
    buffer,
    mimeType,
    width: dims.width,
    height: dims.height,
    modelId,
    transport: 'gemini-direct',
    durationMs: Date.now() - start,
  };
}
