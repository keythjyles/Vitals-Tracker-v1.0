# Instructions for AI operators

## ElevenLabs API connection — authoritative update (October 23, 2026)

The prior shared-browser Google sign-in/number-matching and file-picker handoff are **legacy recovery procedures**, not the normal ElevenLabs production path. Supersede any instruction requiring the user to sign in to ElevenLabs for each AI-run job. Do not repeat the known-broken verification-screen workflow.

The dedicated Jokelet API lives at `tools-home/services/jokelet-api/` in this repository and is deployed separately from the unrelated root `server.js` as `https://jokelet-api.onrender.com`. The user verified `/health` returning `status: ok`, `elevenLabsConfigured: true`, and `generationEnabled: true`. This confirms deployment and presence of environment variables, **not** that the ElevenLabs credentials have been authenticated against ElevenLabs or that generation has succeeded.

The server stores `ELEVENLABS_API_KEY` and `JOKELET_OPERATOR_TOKEN` as private Render environment variables. Never expose them in GitHub, static client JavaScript, URLs, logs, or chat. The API currently provides:
- `GET /health` (public configuration status);
- `GET /api/voices` (operator-bearer authenticated, read-only voice discovery; committed, live deployment unverified);
- `POST /api/voice/generate` (operator-bearer authenticated, paid text-to-speech; accepts `text`, `voiceId`, optional `modelId` and `voiceSettings`, returns MP3).
The generation endpoint has input limits, no automatic retries, and a default maximum of three paid attempts **per server process**, not a durable currency budget. It is not yet an autonomous spending-control system. Do not assume an AI operator has direct HTTP access to this API simply because it is deployed; establish and verify an authorized connector/operator execution path first. Do not ask the user to manually operate ElevenLabs when a verified API operator path is available.

The operating architecture is **one shared production engine with three modes**: manual phone-friendly Jokelet Wizard, AI-operated coached, and explicitly bounded autonomous. All share the same source library, approvals, canonical-joke duplicate ledger, voice settings, media assets, production records, costs, versioned rebuild recipes, and GitHub/Drive preservation. Manual controls remain a required feature; the AI should normally execute delegated operations instead of turning the user into a button operator. Preserve stage approvals and spending restrictions according to the current user instruction. The manual wizard and direct AI connector are requirements, **not yet verified as implemented**.

Historical run-specific sign-in requirements and historical checkpoints remain as archival evidence but do not override this new connection. Continue to preserve original ElevenLabs audio, approved PCM WAV for HeyGen, voice/model metadata, timestamps, usage/cost accounting, and all downstream stages.


For work on JokeLab, the Jokelet Engine, or the GS production pipeline, first read:
- [JokeLab AI operator guide](tools-home/tools/jokelab/AI_OPERATOR_GUIDE.md)
- [Production method](tools-home/tools/jokelets/PRODUCTION_METHOD.md)
- The active dated record under [JokeLab runs](tools-home/tools/jokelab/runs/).

These instructions apply to that production scope, not unrelated Vitals Tracker functionality. The current user's instructions control operating mode and permissions. Read the active run record before acting; do not assume an autonomous mode or permission to spend.

Record actions, settings, concise decision reasons, outputs, failures, costs and implementation evidence. Keep proposed, implemented and verified behavior distinct. Preserve original sources and durable checkpoints. Do not publish authentication details or secrets.

For a coached run, operate the UI yourself, complete one meaningful stage, save its record, ask for the user's process feedback, and pause at that stage boundary. Do not bypass required production stages to make a proof appear successful.

Default to direct batch production; craft study and tone research are optional. Before a paid production request, check tools-home/tools/jokelab/PRODUCTION_LEDGER.json for the canonical joke, aliases, existing outputs and in-progress work. The initial ledger requires further reconciliation and is not yet an app-enforced duplicate guard.


Follow source-library order; do not keyword-hunt a familiar joke to bypass the path. A produced joke remains produced even if its output is automation-ineligible. Check editorial approval and clean-source eligibility separately. Preserve the exact script, provider originals and individual sound layers in a versioned rebuild recipe; read tools-home/tools/jokelets/REBUILD_RECIPE.md. Mark unknown provenance explicitly.

For video generation, supply an approved PCM WAV audio asset, not MP3. Preserve the original recording; document conversion/source hashes and verify the service recognizes the WAV before rendering. See the operator guide's WAV requirement.


## Verified AI access — October 23, 2026

Read-only AI preflight is live and passed. Workflow run40044909488 authenticated through GitHub OIDC, and ElevenLabs accepted the server API key for voice discovery, returning Grill Sargent Jokes (`RBNpu6jPzAoaxZKl9noJ`). No private keys were retrieved/copied; no manual ElevenLabs login or paid generation was performed. See [auth verification](tools-home/tools/jokelab/runs/JL-20261023-AUTH-01.json) and [identity contract](tools-home/services/jokelet-api/AI_AUTH.md). The OIDC identity does not authorize POST /api/voice/generate. TTS permission/credit availability remain unverified; durable shared budget/job/media storage must precede paid AI execution.


## Existing storage first — user correction

Use the existing GitHub and Google Drive production resources before adding paid infrastructure. No Render service upgrade or persistent disk is approved. The SQLite adapter remains an inactive alternative, not a production prerequisite. Resume from the current RESUME_JOKELET_ENGINE.md and read tools-home/services/jokelet-api/GITHUB_STORE.md. Prove real job/asset recovery; do not call a metadata proposal a working production engine. Preserve previous records and distinguish read-only save/restore tests from paid TTS and shared budget enforcement.


## Bounded voice job role

The dedicated jokelet-voice workflow has a separate signed identity and GitHub-backed one-attempt generation route; it still requires explicit current-job user approval, price/quota checks and atomic receipts. Read tools-home/services/jokelet-api/BOUNDED_VOICE.md and current resume checkpoint. The first live approval rejection and read-only108-credit quote passed; actual TTS/WAV success is NOT yet verified. Candidate NEXT-03's150-credit proposal remains unapproved. Existing manual generation is not ledger-integrated. Do not infer global budget enforcement or spend from this engineering implementation.
