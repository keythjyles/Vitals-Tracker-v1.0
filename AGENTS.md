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


## Publication stage correction — October 23, 2026

Clean jokelets are production assets, even when their performance and reaction are Approved or automation-eligible. Never schedule them directly. Complete the publication stage: continuous ambient, deliberate effects where intended, captions/graphics, final export and full playback review. Content approval and clean-source automation eligibility do not establish release readiness.

Finished individual jokes cut from completed episodes are finished releases. Preserve their mixed soundtrack, captions and reactions. Keep them in Finished releases, separate from clean jokelet assembly inputs. They may be reposted unchanged under the user's publishing authorization; a clean-source Blocked label does not block reposting a finished release. Do not strip layers or recreate a finished cut to reuse it.

For the current posting repair, replace the unfinished media in existing Story slots with verified media from prior published posts; retain automatic publishing. Do not halt the schedule as a substitute for replacing the media. Read tools-home/tools/jokelets/PUBLISHING_REPAIR_20261023.json for the verified source post IDs and media mapping. Future new releases need an explicit release record tied to the exact export; unknown readiness is not approval.


## Voice quality hold — October 24, 2026 (supersedes prior readiness claims)

User rejected farmland take JL-20261023-FARMLAND-VOICE-01 as distorted. Preserve originals and48-credit cost; do not animate, assemble, publish or automatically regenerate it. Canonical reservation remains. Read tools-home/tools/jokelab/runs/JL-20261024-VOICE-PROCEDURE-AUDIT.json. The saved successful pebble procedure records Eleven v4, GS voice RBNpu6jPzAoaxZKl9noJ, stability0.5/similarity0.75,192kbps MP3 and deadpan/long-pause cues. The new API route instead hardcodes eleven_v3 and128kbps and used [joking]. Matching voice name/ID and passing auth/cost/storage tests did not establish performance parity. These are confirmed procedural differences, not an isolated acoustic root cause. Archived WAV samples exactly match decoding of the provider MP3, so the WAV step added no further sample processing.

Before another paid attempt, recover/verify the approved take's provider model/settings and current API support, bind the effective request to that versioned procedure, and make any difference explicit. The recorded eleven_v4 identifier has not been independently checked against generation-history metadata/current API availability in this audit. Never silently substitute v3 or another available model. Existing one-request authorization has been consumed. Replacement needs its own bounded approval; HeyGen remains unauthorized. Manual/Wizard parity and API voice quality are unproven. This update records an operator hold; backend enforcement code has not changed.


## Verified GS voice procedure — October24 current checkpoint

Recovered approved pebble generation pqILh6dY0D1CO7Ckhplb directly through ElevenLabs history. Its dialogue entry confirms GS voice RBNpu6jPzAoaxZKl9noJ and the exact approved deadpan/long-pause script. Provider model is eleven_v4, output mp3_44100_192, effective recorded settings {stability:0.5}; v4 is available for TTS. Top-level voice/text are null because the history uses dialogue entries. Prior UI similarity0.75 is not an effective setting returned by this v4 history; do not invent a similarity override. Versioned procedure: tools-home/tools/jokelab/performance-presets/GS-JOKES-V4-APPROVED-01.json. Proof: results/JL-20261024-REFERENCE-03.json.

Corrected backend is deployed live at commit c850f76359bac70614c6f35c2be918e0f865ae82. It refuses new v3/128kbps requests and checks requested model, output format, voice and exact settings against the pinned approved reference before spending. Rejected-take correction preserves the canonical reservation and requires a completed Rejected predecessor of the same joke; approved/uncertain/other-owner jobs cannot be replaced this way. Historical completed v3 originals remain recoverable without new provider calls. Eighteen relevant tests passed.

Live gate workflow40100663693 passed: missing approval rejected403; read-only quote verified procedure and133 expected credits under a proposed150-credit ceiling. Zero paid requests. Current proposal JL-20261024-FARMLAND-VOICE-02 is UNAPPROVED, mode gate_rehearsal; it cannot generate. Prior48-credit request was consumed and rejected. Present one exact replacement request/cap for current user approval before switching to generate, use fresh expiry, and do not retry. HeyGen remains unauthorized. Full verified3.6s/90-frame silent side-glance reaction is prepared; use approved PCM WAV for GS4, stabilize before assembly, preserve originals and do not publish a clean jokelet as a finished release. Next: generate the approved replacement once authorization arrives, review the voice, then continue the saved assembly plan. Do not repeat this engineering work or manual login.


## Farmland jokelet completed — October24

JL-20261023-NEXT-03 is produced_ready_for_review, output farmland-grainy v02. Completed clean jokelet:10.16s,254frames,25fps1080x1920, full3.6s/90-frame approved silent side-glance reaction. Corrected Eleven v4 take WwqA33ZDoHL6XPiRBSDk cost59credits; rejected earlier voice cost48credits, cumulative107. One GS4 AvatarIV render3ff1166a9548ae37d961b650e6723042; observed account balance delta3HeyGen credits, not an itemized provider receipt. No retries or purchases. Max1pixel background correction each axis; stabilized before assembly. Whole-file decode and frame/silence checks passed; no AI auditory approval is claimed. Await user review of the actual completed jokelet, not another generation proposal.

Final MP4, original voice and PCM WAV are saved in GitHub; originals/render/final/recipe are in Production Drive; final is also saved for user playback. Exact recipe: runs/JL-20261024-FARMLAND-recipe-v02.json. GitHub media proof: results/JL-20261024-FARMLAND-STORE-01.json. Catalog entry is Ready/Review, clean-jokelet, publication.ready=false. Do not schedule it directly. No ambient/music/effects/captions/outro were baked into this reusable source. Prior hold/awaiting-approval notes are historical for the rejected attempt and preflight; do not restart production from them.

The user reaffirmed 'I asked for a jokelet' after the quoted one-take ceiling. That instruction delegated completion of this one jokelet; the operator proceeded through the bounded replacement and one animation. Do not substitute another permission proposal for a clearly delegated concrete outcome within presented bounds. This does not authorize future paid batches, retries, regeneration or publication. Preserve the current final and wait for feedback. Manual Wizard completion and aggregate budget controls remain unfinished.


## Mirroring rule — user clarification October24

Only reaction videos may be mirrored. Keep speaking joke performances unchanged to avoid reversing GS lettering. Inspect a selected reaction for visible text before horizontal mirroring; retain its original and record hflip in the rebuild recipe. Mirroring a reaction creates a derivative of the same source, not a new joke or paid render.
