import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('localhost health endpoint works without an ElevenLabs key or paid API calls', async () => {
  const port = 32000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, PORT: String(port), ELEVENLABS_API_KEY: '' },
    stdio: 'ignore'
  });
  try {
    let response;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { response = await fetch('http://127.0.0.1:' + port + '/health'); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(response, 'server did not start');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      service: 'jokelet-api', status: 'ok', elevenLabsConfigured: false
    });
    const missing = await fetch('http://127.0.0.1:' + port + '/generate', { method: 'POST' });
    assert.equal(missing.status, 404);
  } finally { child.kill(); }
});
