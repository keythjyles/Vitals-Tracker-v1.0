import { createHash, timingSafeEqual } from 'node:crypto';
import { driveFile, FG01_MASTER_ID } from './drive-private.mjs';

const JOB = 'GS-FG01-GEMINI-ONE-USD-20261112';
const PRESET = 'FG-01';
const MODEL = 'gemini-2.5-flash-image';
const CLUSTER = ['SUFFERING', 'while', 'FIGHTING', 'over', 'CLAIMS'];
const FRAMES = [115, 144, 160, 188, 209, 231];
const MAX_OUTPUT_BYTES = 15_000_000;
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (left, right) => Boolean(left) && left.length === right.length && timingSafeEqual(left, right);
const same = (value, expected) => Array.isArray(value) && value.length === expected.length && value.every((item, i) => item === expected[i]);
let claimed = false;

function respond(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'access-control-allow-origin': 'https://keythjyles.github.io',
  });
  res.end(JSON.stringify(data));
}

function geminiEndpoint(operation = '') {
  return 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + operation;
}

export async function handleFieldGuideGemini(req, res, url) {
  const reservationId = process.env.GEMINI_FG01_DRIVE_RESERVATION_ID;
  const ready = process.env.GEMINI_FG01_ONE_SHOT === 'true' &&
    Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_FG01_OPERATOR_TOKEN_SHA256);
  if (req.method === 'GET') {
    const state = !ready ? (reservationId ? 'closed' : 'operator_required') : reservationId ? 'operator_ready' : 'awaiting_reservation';
    if (state === 'closed') {
      try {
        const record = JSON.parse(await driveFile(reservationId, { minBytes: 1, maxBytes: 12000 }));
        if (record.job === JOB) {
          return respond(res, 200, { job: JOB, preset: PRESET, state, imageProduced: record.imageProduced === true,
            providerStatus: Number.isInteger(record.providerStatus) ? record.providerStatus : undefined });
        }
      } catch { /* The closed test remains unavailable while its receipt is inaccessible. */ }
    }
    return respond(res, 200, { job: JOB, preset: PRESET, state });
  }
  if (req.method !== 'POST') return respond(res, 405, { error: 'method_not_allowed' });
  if (!ready) return respond(res, 423, { error: 'one_shot_disabled' });
  if (req.headers.origin) return respond(res, 403, { error: 'operator_required' });

  const operator = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  const expected = Buffer.from(process.env.GEMINI_FG01_OPERATOR_TOKEN_SHA256, 'hex');
  const supplied = operator && createHash('sha256').update(operator).digest();
  if (!equal(supplied, expected)) return respond(res, 401, { error: 'unauthorized' });

  // A signed operator can check the exact image model and private source without starting generation.
  if (url.searchParams.get('preflight') === '1') {
    try {
      const reference = await driveFile(FG01_MASTER_ID);
      if (!reference.subarray(0, 8).equals(PNG_SIGNATURE)) {
        return respond(res, 424, { error: 'approved_master_invalid' });
      }
      const model = await fetch(geminiEndpoint(), {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(15000),
      });
      if (!model.ok) return respond(res, 424, { error: 'image_model_unavailable', providerStatus: model.status });
      const { supportedGenerationMethods } = await model.json();
      if (!supportedGenerationMethods?.includes('generateContent')) {
        return respond(res, 424, { error: 'image_generation_unavailable' });
      }
      return respond(res, 200, { job: JOB, model: MODEL, referenceSha256: hash(reference), referenceBytes: reference.length });
    } catch {
      return respond(res, 502, { error: 'preflight_failed' });
    }
  }

  if (!reservationId) return respond(res, 424, { error: 'private_drive_reservation_required' });
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 12000) return respond(res, 413, { error: 'request_too_large' });
  }
  let data;
  try { data = JSON.parse(raw); } catch { return respond(res, 400, { error: 'invalid_json' }); }
  if (data?.job !== JOB || data?.preset !== PRESET || !same(data.cluster, CLUSTER) || !same(data.frames, FRAMES)) {
    return respond(res, 400, { error: 'invalid_cluster_or_cues' });
  }

  let reference;
  try {
    reference = await driveFile(FG01_MASTER_ID);
    if (!reference.subarray(0, 8).equals(PNG_SIGNATURE)) return respond(res, 424, { error: 'approved_master_invalid' });
    const reservation = JSON.parse(await driveFile(reservationId, { minBytes: 1, maxBytes: 12000 }));
    if (reservation.job !== JOB || reservation.status !== 'reserved_uncertain_until_verified' ||
        reservation.reservedUsd !== 1 || reservation.attempts !== 1 || reservation.autoRetry !== false ||
        reservation.model !== MODEL || !same(reservation.cluster, CLUSTER) || !same(reservation.frames, FRAMES) ||
        reservation.referenceSha256 !== hash(reference)) {
      return respond(res, 424, { error: 'reservation_mismatch' });
    }
  } catch {
    return respond(res, 424, { error: 'private_drive_reservation_or_master_unavailable' });
  }
  if (claimed) return respond(res, 409, { error: 'already_reserved_no_retry' });
  claimed = true;

  const instruction = 'Use this exact five-element cluster in order: ' + CLUSTER.join(' / ') +
    '. Frame markers: ' + FRAMES.join(', ') +
    '. Create ONLY the typography artwork, with a perfectly uniform solid chroma blue (#0000FF) background. ' +
    'The attached approved reference is the visual authority. Five centered independent elements as provided in the cluster. ' +
    'The first, third and fifth elements must be identical-size bright opaque cream bold condensed uppercase with rich dimensional dark shadow. ' +
    'The second and fourth elements must be flowing connected gold cursive, tight to the adjacent headlines, each with short symmetric gold rules that NEVER cross letters. ' +
    'Match the reference exactly in visual weight, optical spacing, relative widths and alignment. ' +
    'No human, no apron, no photography, no other text, no decorative extras. Output one premium-quality clean graphic, portrait aspect ratio.';
  try {
    const response = await fetch(geminiEndpoint(':generateContent'), {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: instruction }, { inlineData: { mimeType: 'image/png', data: reference.toString('base64') } }] }],
        generationConfig: { candidateCount: 1, responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '9:16' } },
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      const { error } = await response.json().catch(() => ({}));
      const providerCode = /^[A-Z_]{3,40}$/.test(error?.status) ? error.status : undefined;
      return respond(res, 502, { error: 'provider_failed_no_retry', providerStatus: response.status, providerCode, job: JOB });
    }
    const result = await response.json();
    const parts = (result.candidates || []).flatMap(candidate => candidate.content?.parts || []);
    const part = parts.find(item => !item.thought && (item.inlineData?.data || item.inline_data?.data));
    if (!part) return respond(res, 502, { error: 'no_image_returned_no_retry', job: JOB });
    const image = part.inlineData || part.inline_data;
    const bytes = Buffer.from(image.data, 'base64');
    const mime = image.mimeType || image.mime_type;
    const png = bytes.subarray(0, 8).equals(PNG_SIGNATURE);
    const jpeg = bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
    if (bytes.length > MAX_OUTPUT_BYTES || !((mime === 'image/png' && png) || (mime === 'image/jpeg' && jpeg))) {
      return respond(res, 502, { error: 'output_image_invalid_no_retry', job: JOB });
    }

    res.writeHead(200, {
      'content-type': mime,
      'content-length': bytes.length,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-gs-sha256': hash(bytes),
      'x-gs-model': MODEL,
      'x-gs-response-id': String(result.responseId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120),
      'x-gs-input-tokens': String(Number(result.usageMetadata?.promptTokenCount) || 0),
      'x-gs-output-tokens': String(Number(result.usageMetadata?.candidatesTokenCount) || 0),
    });
    res.end(bytes);
  } catch {
    return respond(res, 502, { error: 'request_uncertain_no_retry', job: JOB });
  }
}
