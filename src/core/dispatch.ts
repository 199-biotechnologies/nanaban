import { detectAuth, resolveRoute, makeGeminiClient, type AuthState } from './auth.js';
import { resolveModel, type ModelInfo, type TransportId } from './models.js';
import { generateViaGemini } from './transport-gemini.js';
import { generateViaOpenRouter } from './transport-openrouter.js';
import { parseAspectRatio, parseImageSize, checkCapabilities } from './aspect.js';
import { NB2Error } from '../lib/errors.js';
import type { ImageRequest, ImageResult, GenerationMode } from './types.js';
import type { ReferenceImage } from './reference.js';

export interface DispatchOptions {
  prompt: string;
  mode: GenerationMode;
  modelName?: string;
  pro?: boolean;
  via?: string;
  aspect?: string;
  size?: string;
  negativePrompt?: string;
  referenceImages?: ReferenceImage[];
  basePath?: string;
}

export interface DispatchResult extends ImageResult {
  model: ModelInfo;
  authMethod: string;
}

function pickModel(opts: DispatchOptions): ModelInfo {
  const name = opts.modelName ?? (opts.pro ? 'nb2-pro' : 'nb2');
  const model = resolveModel(name);
  if (!model) {
    throw new NB2Error('MODEL_NOT_FOUND', `Unknown model "${name}". Run \`nanaban agent-info\` to list available models.`);
  }
  return model;
}

function parseTransport(via: string | undefined): TransportId | undefined {
  if (!via) return undefined;
  if (via === 'gemini-direct' || via === 'openrouter') return via;
  if (via === 'gemini' || via === 'google') return 'gemini-direct';
  if (via === 'or') return 'openrouter';
  throw new NB2Error('CAPABILITY_UNSUPPORTED', `Unknown transport "${via}". Use one of: gemini-direct, openrouter`);
}

export async function dispatch(opts: DispatchOptions): Promise<DispatchResult> {
  const model = pickModel(opts);
  const aspectRatio = parseAspectRatio(opts.aspect || '1:1');
  const imageSize = parseImageSize(opts.size || '1K');
  checkCapabilities(model, aspectRatio, imageSize);

  if (opts.mode === 'edit' && !model.caps.edit) {
    throw new NB2Error('CAPABILITY_UNSUPPORTED', `${model.display} does not support image editing`);
  }
  if (opts.referenceImages && opts.referenceImages.length > model.caps.maxRefImages) {
    throw new NB2Error(
      'CAPABILITY_UNSUPPORTED',
      `${model.display} accepts at most ${model.caps.maxRefImages} reference image(s)`,
    );
  }

  const auth = await detectAuth();
  const forced = parseTransport(opts.via);
  const route = resolveRoute(model, auth, forced);

  const request: ImageRequest = {
    mode: opts.mode,
    prompt: opts.prompt,
    negativePrompt: opts.negativePrompt,
    aspectRatio,
    imageSize,
    referenceImages: opts.referenceImages,
  };

  let result: ImageResult;
  if (route.transport === 'gemini-direct') {
    const client = makeGeminiClient(auth);
    result = await generateViaGemini(client, route.modelId, request, opts.basePath);
  } else {
    result = await generateViaOpenRouter(route.authKey!, route.modelId, request, opts.basePath);
  }

  return {
    ...result,
    model,
    authMethod: describeAuth(route.transport, auth),
  };
}

function describeAuth(transport: TransportId, auth: AuthState): string {
  if (transport === 'gemini-direct' && auth.gemini) {
    const a = auth.gemini;
    return `gemini-direct via ${a.type === 'env' ? a.name : a.type === 'config' ? a.path : a.path}`;
  }
  if (transport === 'openrouter' && auth.openRouter) {
    const a = auth.openRouter;
    return `openrouter via ${a.type === 'env' ? a.name : a.path}`;
  }
  return transport;
}
