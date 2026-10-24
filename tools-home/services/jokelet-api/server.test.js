import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('localhost health endpoint works without an ElevenLabs key or paid API calls', async () => {
  const port = 32000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, PORT: String(port), ELEVENLABS_API_KEY: '', JOKELET_OPERATOR_TOKEN: 'test-only-token', JOKELET_DATA_DIR: '' },
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
      service: 'jokelet-api', status: 'ok', elevenLabsConfigured: false, generationEnabled: false
    });
    for (const path of ['/operator','/operator.js','/performance.js']) {
      const asset=await fetch('http://127.0.0.1:'+port+path);
      assert.equal(asset.status,200);
      assert.match(asset.headers.get('content-security-policy'), /script-src 'self'/);
    }
    for (const path of ['/api/voices','/api/voice/generate','/api/ai/preflight','/api/ai/voice/generate','/api/storage']) {
      const denied=await fetch('http://127.0.0.1:'+port+path,{method:path.endsWith('generate')?'POST':'GET'});
      assert.equal(denied.status,401);
      const configured=await fetch('http://127.0.0.1:'+port+path,{method:path.endsWith('generate')?'POST':'GET',headers:{Authorization:'Bearer test-only-token'}});
      assert.equal(configured.status,path.startsWith('/api/ai/') ? 401 : path === '/api/storage' ? 200 : 503);
    }
    const missing = await fetch('http://127.0.0.1:' + port + '/generate', { method: 'POST' });
    assert.equal(missing.status, 404);
  } finally { child.kill(); }
});

