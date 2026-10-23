# Jokelet Engine API

Independent of the repository-root server.js, which belongs to another app.

## Current capability
- Authenticated paid ElevenLabs text-to-speech endpoint: `POST /api/voice/generate`
- Private key: `ELEVENLABS_API_KEY` (server environment only)
- Separate operator bearer token: `JOKELET_OPERATOR_TOKEN` (server environment only)
- Request length limit: `JOKELET_MAX_CHARS` (default 1000)
- Per-process request cap: `JOKELET_MAX_REQUESTS_PER_PROCESS` (default 3)
- No automatic retries; no audio generation on startup or in health checks.
- Not deployed, no provider credentials installed, no paid calls made.

## Run
Node.js 20 or newer. Configure secrets privately in the chosen hosting environment, never in GitHub Pages or client JavaScript. Run `npm test` and `npm start` from this directory. Server binds to localhost by default. For external access, deploy behind an authenticated HTTPS reverse proxy.

## Paid request
Send JSON to `POST /api/voice/generate` with bearer authorization and `text`, `voiceId`, optional `modelId` and `voiceSettings`. The response is audio/mpeg. This endpoint incurs ElevenLabs charges/credits when invoked with valid provider credentials.

The process request cap resets on restart and is **not** a monetary spending cap. Do not expose it as an unlimited production service. Production requires durable authorization, accounting, and rate controls before broad use. Do not use this API from a public browser client with the operator token embedded in JavaScript.
