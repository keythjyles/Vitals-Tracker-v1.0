# Jokelet Engine API (isolated scaffold)

This service is independent of the repository-root `server.js` (a different application).

## Status
- Implemented: minimal localhost-only health service and private, read-only ElevenLabs authentication check.
- Not implemented: deployed backend, secret installation, browser authentication, voice selection, generation, job persistence, spending enforcement, HeyGen, or GitHub/Drive delivery.
- No ElevenLabs requests are made merely by starting the server.
- No production credits are spent by the account check.

## Setup (on a trusted private backend)
Use Node.js 20+. Store `ELEVENLABS_API_KEY` in the hosting provider's private environment/secret manager. Never commit or expose it to browser code.

From this directory:
```sh
node --check server.js
node server.js
```
In a separate backend terminal, with the secret already configured:
```sh
node check-elevenlabs.js
```
This performs a read-only request to `GET /v1/user` and reports success/failure without printing the credential or account details.

## Security / next stage
The server binds to localhost and has no paid-generation endpoints. Before exposing an API to the browser, add strong authentication, origin protections, input limits, rate limits, durable job and cost records, and server-side spending authorization. Store the ElevenLabs key only in a private server secret store. Never put it in GitHub Pages, GitHub Actions unless Actions is actually the chosen runtime, or the public repository.
