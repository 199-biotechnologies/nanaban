import { NB2Error } from '../lib/errors.js';
import type { AspectRatio, ImageSize } from './types.js';
import type { ModelInfo } from './models.js';

export const ASPECT_ALIASES: Record<string, AspectRatio> = {
  square: '1:1',
  wide: '16:9',
  tall: '9:16',
  ultrawide: '21:9',
  panoramic: '4:1',
  banner: '8:1',
  portrait: '2:3',
  story: '9:16',
};

const VALID_RATIOS = new Set<string>([
  '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4',
  '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1',
]);

const VALID_SIZES = new Set<string>(['0.5K', '1K', '2K', '4K']);

export function parseAspectRatio(input: string): AspectRatio {
  const resolved = ASPECT_ALIASES[input.toLowerCase()] || input;
  if (!VALID_RATIOS.has(resolved)) {
    throw new NB2Error(
      'CAPABILITY_UNSUPPORTED',
      `Invalid aspect ratio "${input}". Use one of: ${[...VALID_RATIOS].join(', ')} (or aliases: ${Object.keys(ASPECT_ALIASES).join(', ')})`,
    );
  }
  return resolved as AspectRatio;
}

export function parseImageSize(input: string): ImageSize {
  const upper = input.toUpperCase();
  if (!VALID_SIZES.has(upper)) {
    throw new NB2Error('CAPABILITY_UNSUPPORTED', `Invalid size "${input}". Use one of: 0.5k, 1k, 2k, 4k`);
  }
  return upper as ImageSize;
}

export function checkCapabilities(model: ModelInfo, ar: AspectRatio, size: ImageSize): void {
  if (!model.caps.aspectRatios.includes(ar)) {
    throw new NB2Error(
      'CAPABILITY_UNSUPPORTED',
      `${model.display} does not support aspect ratio ${ar}. Supported: ${model.caps.aspectRatios.join(', ')}`,
    );
  }
  if (!model.caps.sizes.includes(size)) {
    throw new NB2Error(
      'CAPABILITY_UNSUPPORTED',
      `${model.display} does not support size ${size}. Supported: ${model.caps.sizes.join(', ')}`,
    );
  }
}
