// Isolated Jokelet Engine ElevenLabs API. Never expose the key to browser code.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import {verifyGithubIdentity} from './github-identity.js';

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
  if (req.method === 'GET' && ['/operator','/operator.js','/performance.js'].includes(pathname)) {
    try {
      const file = pathname === '/operator' ? 'operator.html' : pathname.slice(1);
      const html = await readFile(new URL('./' + file, import.meta.url));
      res.writeHead(200, { 'content-type': pathname === '/operator' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; media-src blob:; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
      return res.end(html);
    } catch { return send(res, 500, { error: 'Operator page unavailable' }); }
  }
  if (req.method === 'GET' && (pathname === '/health' || pathname === '/'))
    return send(res, 200, { service: 'jokelet-api', status: 'ok', elevenLabsConfigured: Boolean(elevenKey), generationEnabled: Boolean(elevenKey && operatorToken) });
  if (req.method === 'GET' && pathname === '/api/ai/preflight') {
    let identity;
    try { identity=await verifyGithubIdentity(req.headers.authorization); }
    catch { return send(res,401,{error:'Unauthorized'}); }
    if(!elevenKey)return send(res,503,{error:'ElevenLabs is not configured'});
    try {
      const response=await fetch('https://api.elevenlabs.io/v2/voices?page_size=100',{
        headers:{'xi-api-key':elevenKey,accept:'application/json'},signal:AbortSignal.timeout(12000)
      });
      if(!response.ok)return send(res,502,{error:'ElevenLabs authenticated lookup failed',upstreamStatus:response.status});
      const data=await response.json();
      return send(res,200,{schema:'GS-AIPreflight-1',identity,authenticatedVoiceLookup:true,paidGeneration:false,
        voices:(data.voices||[]).filter(v=>/grill|sargent|sergeant|gs4/i.test(v.name||'')).map(v=>({voiceId:v.voice_id,name:v.name,category:v.category})),
        next:'Paid AI execution remains disabled; establish durable spending and job storage first.'});
    } catch {return send(res,502,{error:'ElevenLabs authenticated lookup unavailable'});}
  }
  if (req.method === 'GET' && pathname === '/api/voices') {
    if (!authorized(req)) return send(res, 401, { error: 'Unauthorized' });
    if (!elevenKey) return send(res, 503, { error: 'ElevenLabs is not configured' });
    try {
      const response = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', {
        headers: { 'xi-api-key': elevenKey, 'accept': 'application/json' },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) return send(res, 502, { error: 'ElevenLabs voice lookup failed', upstreamStatus: response.status });
      const data = await response.json();
      return send(res, 200, { voices: (data.voices || []).map(v => ({
        voiceId: v.voice_id, name: v.name, category: v.category
      })) });
    } catch {
      return send(res, 502, { error: 'ElevenLabs voice lookup unavailable' });
    }
  }
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
    if (/\[\[|\]\]/.test(text)) return send(res, 400, { error: 'Engine markers must be assembled locally, never submitted to speech generation' });
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

