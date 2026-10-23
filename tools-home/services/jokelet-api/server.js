// Isolated Jokelet Engine service. No generation or billing endpoints.
import http from 'node:http';

const port = Number(process.env.PORT || 3100);
const key = process.env.ELEVENLABS_API_KEY;
const json = (res, status, value) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { service: 'jokelet-api', status: 'ok', elevenLabsConfigured: Boolean(key) });
  }
  // This service deliberately does not expose a public account/voice probe.
  // Verify ElevenLabs from the server console with the separate check script.
  return json(res, 404, { error: 'Not found' });
});
server.listen(port, '127.0.0.1', () => console.log('Jokelet API listening on localhost:' + port));
