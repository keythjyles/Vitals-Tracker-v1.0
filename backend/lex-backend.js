// Claim deCoder — Lex Backend Proxy
// Version: B2.0
// © 2026 Wendell K. Jiles — The Thicket Method

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

const requestCounts = {};
const RATE_LIMIT = 50;
const RATE_WINDOW = 60 * 60 * 1000;

function checkRate(ip) {
  const now = Date.now();
  if (!requestCounts[ip]) requestCounts[ip] = { count: 0, start: now };
  if (now - requestCounts[ip].start > RATE_WINDOW) {
    requestCounts[ip] = { count: 0, start: now };
  }
  requestCounts[ip].count++;
  return requestCounts[ip].count <= RATE_LIMIT;
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

app.get('/', (req, res) => {
  res.json({ status: 'Lex is online', version: 'B2.0', key: API_KEY ? 'set' : 'missing' });
});

app.post('/lex', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRate(ip)) return res.status(429).json({ error: 'Too many requests.' });
  if (!API_KEY) return res.status(500).json({ error: 'Server not configured — API key missing.' });
  try {
    const result = await callAnthropic(req.body);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: 'Anthropic connection failed: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Lex backend B2.0 running on port ${PORT}`);
  console.log(`API key: ${API_KEY ? 'SET (' + API_KEY.slice(0,10) + '...)' : 'MISSING'}`);
});
