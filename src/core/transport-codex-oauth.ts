import { randomUUID } from 'node:crypto';
import { loadReferenceImage } from './reference.js';
import { NB2Error } from '../lib/errors.js';
import type { ImageRequest, ImageResult, AspectRatio } from './types.js';

const ENDPOINT = 'https://chatgpt.com/backend-api/codex/responses';

// The Codex bridge rejects `gpt-image-2` as a top-level `model` — it must carry a
// Codex "coding" model that invokes the `image_generation` tool, which internally
// runs the current GPT Image model. `gpt-5.4` is the safe everyday default today;
// override via NANABAN_CODEX_CARRIER if OpenAI rotates the list.
const CARRIER_MODEL = process.env.NANABAN_CODEX_CARRIER ?? 'gpt-5.4';

// gpt-image-2 via the Codex bridge accepts these three discrete output sizes.
// Any aspect ratio outside this set is rejected up front by aspect.ts
// (see GPT_IMAGE_2_RATIOS in models.ts), so this map only needs to cover them.
const SIZE_FOR_RATIO: Partial<Record<AspectRatio, string>> = {
  '1:1': '1024x1024',
  '2:3': '1024x1536',
  '3:2': '1536x1024',
};

function resolveSize(ratio: AspectRatio): string {
  const size = SIZE_FOR_RATIO[ratio];
  if (!size) {
    throw new NB2Error(
      'CAPABILITY_UNSUPPORTED',
      `gpt-image-2 via codex-oauth only supports aspect ratios 1:1, 2:3, 3:2 (got ${ratio})`,
    );
  }
  return size;
}

export interface CodexOAuthAuth {
  accessToken: string;
  accountId: string;
}

/**
 * Call the Codex responses backend with the user's ChatGPT Plus/Pro access token.
 *
 * Protocol reference: remorses/egaki/docs/chatgpt-codex-image-backend.md
 * - Uses Responses-API shape (`input`/`input_text`/`input_image`), NOT Chat Completions.
 * - SSE events separated by `\n\n`; final image arrives in an event whose top-level
 *   `type` is `response.output_item.done` and whose `item.type` is `image_generation_call`.
 * - Billing: counts against the ChatGPT subscription — no metered cost.
 */
export async function generateViaCodexOAuth(
  auth: CodexOAuthAuth,
  modelId: string,
  request: ImageRequest,
  basePath?: string,
): Promise<ImageResult> {
  const ratio = request.aspectRatio ?? '1:1';
  const size = resolveSize(ratio);
  const [width, height] = size.split('x').map(Number);

  const content: any[] = [];
  if (request.referenceImages?.length) {
    for (const ref of request.referenceImages) {
      const { mimeType, data } = await loadReferenceImage(ref, basePath);
      // egaki verified shape: input_image carries a string image_url (data URL or https URL).
      content.push({ type: 'input_image', image_url: `data:${mimeType};base64,${data}` });
    }
  }

  let promptText = request.prompt;
  if (request.negativePrompt) promptText += `\n\nAvoid: ${request.negativePrompt}`;
  content.push({ type: 'input_text', text: promptText });

  const body = {
    model: CARRIER_MODEL,
    instructions:
      'You generate or edit images using the image_generation tool. ' +
      'Always call the tool exactly once and return the result. Do not describe the image in text.',
    input: [{ type: 'message', role: 'user', content }],
    tools: [{ type: 'image_generation', output_format: 'png', size }],
    tool_choice: { type: 'image_generation' },
    stream: true,
    store: false,
    prompt_cache_key: randomUUID(),
  };

  const start = Date.now();

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'ChatGPT-Account-ID': auth.accountId,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'OpenAI-Beta': 'responses=experimental',
        'Originator': 'nanaban-cli',
        'Session-Id': randomUUID(),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new NB2Error('NETWORK_ERROR', `Codex bridge request failed: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = text;
    try { detail = JSON.parse(text)?.error?.message || text; } catch { /* not json */ }
    if (res.status === 401) {
      throw new NB2Error('AUTH_INVALID', `Codex OAuth token rejected — run \`codex login\`. ${detail}`);
    }
    if (res.status === 403) {
      throw new NB2Error('AUTH_INVALID', `Codex bridge forbade this account: ${detail}`);
    }
    if (res.status === 429) {
      throw new NB2Error('RATE_LIMITED', `Codex bridge rate-limited (ChatGPT sub quota): ${detail}`);
    }
    if (res.status >= 500) {
      throw new NB2Error('NETWORK_ERROR', `Codex backend ${res.status}: ${detail}`);
    }
    throw new NB2Error('GENERATION_FAILED', `Codex backend ${res.status}: ${detail}`);
  }

  if (!res.body) throw new NB2Error('GENERATION_FAILED', 'Codex bridge returned empty body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let base64: string | null = null;
  let streamError: string | null = null;

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line (\n\n). Handle CRLF too.
    buf = buf.replace(/\r\n/g, '\n');
    let sep: number;
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const rawEvent = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      // Collect `data:` lines in this event.
      let dataStr = '';
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('data:')) dataStr += line.slice(5).trimStart();
      }
      if (!dataStr || dataStr === '[DONE]') continue;
      let parsed: any;
      try { parsed = JSON.parse(dataStr); } catch { continue; }

      if (parsed.type === 'response.output_item.done'
          && parsed.item?.type === 'image_generation_call'
          && typeof parsed.item?.result === 'string') {
        base64 = parsed.item.result;
        break outer;
      }
      if (parsed.type === 'response.failed' || parsed.type === 'error') {
        streamError =
          parsed.response?.error?.message
          ?? parsed.error?.message
          ?? `Codex bridge reported ${parsed.type}`;
        break outer;
      }
    }
  }

  if (streamError) throw new NB2Error('GENERATION_FAILED', streamError);
  if (!base64) {
    throw new NB2Error(
      'GENERATION_FAILED',
      'Codex bridge stream finished without an image — ChatGPT subscription may have hit its image quota.',
    );
  }

  const buffer = Buffer.from(base64, 'base64');
  return {
    buffer,
    mimeType: 'image/png',
    width,
    height,
    modelId,
    transport: 'codex-oauth',
    durationMs: Date.now() - start,
    costUsd: 0,
  };
}
