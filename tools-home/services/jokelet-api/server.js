// Isolated Jokelet Engine ElevenLabs API. Never expose the key to browser code.
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 3100);
const elevenKey = process.env.ELEVENLABS_API_KEY;
const operatorToken = process.env.JOKELET_OPERATOR_TOKEN;
const maxChars = Number(process.env.JOKELET_MAX_CHARS || 1000);
const maxRequests = Number(process.env.JOKELET_MAX_REQUESTS_PER_PROCESS || 3);
let requestsMade = 0;

const send = (res, status, value) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
};
function authorized(req) {
  const provided = req.headers.authorization;
  if (!operatorToken || !provided?.startsWith('Bearer ')) return false;
  const actual = Buffer.from(provided.slice(7));
  const expected = Buffer.from(operatorToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/';
  // Log only method and path, never headers, credentials, queries or request bodies.
  console.log('Request', req.method, pathname);
  if (req.method === 'GET' && (pathname === '/health' || pathname === '/'))
    return send(res, 200, { service: 'jokelet-api', status: 'ok', elevenLabsConfigured: Boolean(elevenKey), generationEnabled: Boolean(elevenKey && operatorToken) });
  if (req.method !== 'POST' || pathname !== '/api/voice/generate')
    return send(res, 404, { error: 'Not found' });
  if (!authorized(req)) return send(res, 401, { error: 'Unauthorized' });
  if (!elevenKey) return send(res, 503, { error: 'ElevenLabs is not configured' });
  if (requestsMade >= maxRequests) return send(res, 429, { error: 'Process request limit reached' });
  let body = '';
  try {
    for await (const chunk of req) {
      body += chunk.toString();
      if (body.length > 12000) return send(res, 413, { error: 'Request too large' });
    }
    const input = JSON.parse(body);
    const { text, voiceId, modelId = 'eleven_multilingual_v2', voiceSettings } = input;
    if (typeof text !== 'string' || !text.trim() || text.length > maxChars)
      return send(res, 400, { error: 'Invalid text or text exceeds configured limit' });
    if (typeof voiceId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(voiceId))
      return send(res, 400, { error: 'Invalid voiceId' });
    if (typeof modelId !== 'string' || !/^[a-zA-Z0-9_-]{3,100}$/.test(modelId))
      return send(res, 400, { error: 'Invalid modelId' });
    if (voiceSettings !== undefined && (typeof voiceSettings !== 'object' || !voiceSettings || Array.isArray(voiceSettings)))
      return send(res, 400, { error: 'Invalid voiceSettings' });
    requestsMade++; // Reserve a request before contacting the paid provider; no automatic retry.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    let response;
    try {
      response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId), {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'content-type': 'application/json', 'accept': 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: modelId, ...(voiceSettings ? { voice_settings: voiceSettings } : {}) }),
        signal: controller.signal
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) return send(res, 502, { error: 'ElevenLabs request failed', upstreamStatus: response.status });
    const audio = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, { 'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'content-length': audio.length });
    return res.end(audio);
  } catch {
    if (!res.headersSent) return send(res, 400, { error: 'Request could not be completed' });
    res.end();
  }
});
server.listen(port, '0.0.0.0', () => console.log('Jokelet API listening on port ' + port));
