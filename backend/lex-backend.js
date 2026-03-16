const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
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

app.get('/', (req, res) => {
  res.json({ status: 'Lex is online', version: 'B1.1' });
});

app.post('/lex', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server not configured.' });
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Connection error. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Lex backend B1.1 running on port ${PORT}`);
});
