# Resume Jokelet Engine

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


Repository: keythjyles/Vitals-Tracker-v1.0, branch main. Read AGENTS.md, tools-home/tools/jokelab/AI_OPERATOR_GUIDE.md and this checkpoint first.

The previous pebble jokelet is finished and user-approved:9.64s,full4.28s straight-stare hold,25fps1080x1920. Its catalog ID is pebble-straight-stare. It is now saved on Drive and committed to GitHub. Recipe: tools-home/tools/jokelab/runs/JL-20261023-COACHED-01-jokelet-recipe-v01.json. Do not regenerate that joke. Earlier interruptions and source gaps remain in the coached run log.

Active request: create another jokelet from database. User delegates creative choices and permits deviations for better product. Follow library order; next selected canonical dad-00d6dea00e3a33805c7b5007, robots/guacamole/computer chips. Read runs/JL-20261023-NEXT-02.json. Script is prepared; no new paid request. Resolve relevant duplicate candidate and establish combined new spending cap before generation. Earlier caps each covered one completed request; do not reuse them.

Use existing live ElevenLabs signed-in tab if available; actual workspace must be verified. Never automate sign-in or ask for codes. Keep firm/deadpan joke direction, explicit pause, punchline stress and final spoken stop. Save originals and PCM WAV for video; MP3 HeyGen import failed MIME classification. Approved GS4 look85cc768c260a40359212b92f738de459, AvatarIV. No post-punchline dialogue, burned captions, premixedambient/music/SFX or outro in clean master. Preserve full approved reaction duration. Do not spend on retries automatically.

Avoid another long stall: perform focused work, report real blockers promptly, preserve checkpoints. Binary GitHub uploads can be made through create_blob(base64), then create_tree/create_commit/update_ref with expected head. Shell tool output truncates around1MiB; if necessary read binary in600000-byte chunks, base64each and concatenate in functions.exec without printing bytes. No need to clone entire repo again. Original/video files remain in /workspace/scratch/e18d3702989d/jokelet-pebble if same workspace. GitHub/Drive are durable sources.
