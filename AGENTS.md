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


## Bookmark jokelet completed — October24

Run JL-20261024-NEXT-04, canonical dad-01e2b3b699efb51afa7d744a, source position8 is produced_ready_for_review. Position7 has an incomplete emoji punchline and remains an editorial hold, not a paid production. Final bookmark-brian v01 is10.36s/259frames/25fps1080x1920. Saved one v4/192kbps voice take X4Y2MYtNCzdXrPkSIVYG (59credits), one GS4 render d1ffb82407eed94a76cf8e742b3f597a (observed HeyGen balance delta3, not itemized), and full3s/75-frame mirrored approved skeptical reaction. No retries or purchases. Speaking footage is not mirrored; GS lettering stays readable. Mirror-only-reactions is the user's explicit rule and is recorded in the recipe.

Final, sources and rebuild trail are saved. Recipe: runs/JL-20261024-BOOKMARK-recipe-v01.json. Media proof: results/JL-20261024-BOOKMARK-STORE-01.json. Final path: tools-home/tools/jokelets/media/GS_Jokelet_Bookmark_Brian_v01.mp4. Whole-file decode, frame/duration and silent-ending checks passed. No AI auditory approval is claimed; final user review pending. Catalog Ready/Review, publication.ready=false: this is a clean jokelet, not a finished release. Do not schedule it directly. Previous farmland output remains preserved; never regenerate either as a new joke.

Supply a working direct MP4 download link with the completed artifact. Resume from saved files, not another generation. Next source position9 needs its own current selection/duplicate check; this one-jokelet request does not authorize an automatic batch.


## Timmy / GS cartoon boy — mandatory discovery (October 24, 2026)

For ANY Timmy illustration, animation, compositing, asset search, editing, or GS video featuring Timmy, FIRST read [Timmy character bible](tools-home/assets/timmy/CHARACTER_BIBLE.md), [Timmy asset manifest](tools-home/assets/timmy/MANIFEST.md), and [Timmy production handoff](tools-home/assets/timmy/PRODUCTION_HANDOFF.md). These files are authoritative across chats. Do not invent a new character or claim files were uploaded based on a chat link. Search the actual repository folder before requesting assets again.

Timmy is the approved cartoon boy in a yellow collared shirt with a dark horizontal stripe, dark shorts, white socks and brown shoes. Preserve exact design and transparent source assets. His head must be animated independently of the fixed body: no whole-body rotation to simulate a head turn or shake. Separate aligned head poses and torso layers are required. For the current Grill Sergeant scene, enter from the right around frame 675, fully visible by frame 700, finish reaction by frame 842, disappear sharply at frame 843. See handoff for details and status.

**All Timmy-related files must be stored under `tools-home/assets/timmy/`**, with versioned names and a contemporaneously updated MANIFEST.md. Keep reference art, sprite layers, pose sheets, animation code, review renders and approved video assets there. Save and verify binaries, not just Markdown descriptions; if blocked, report exactly which assets remain uncommitted. Never silently replace approved references with newly generated variants. Maintain a persistent handoff so the next AI operator can resume without reconstructing prior conversations.


## PreviewLock / DeliveryLock — canonical video storage, delivery, and finalization (October 25, 2026)

**Binding root-level production rule.** This applies to Grill Sergeant, Dad Joke Duty, Timmy Motion Library, Fireside, PSA, VA Education, reusable B-roll, and every subsequent project. Supersedes earlier device-only/browser-only video library approaches.

1. **Google Drive is the canonical binary asset store.** Store original footage, imported clips, intermediate renders while active, transparent animation masters, approved masters, and review proxies in project-specific Drive folders. GitHub contains application code, schemas, catalogs/manifests, and documentation; do not treat GitHub or GitHub Pages as a video archive. PreviewLock is the user-facing catalog and player, not the authoritative binary storage.
2. **Never depend on phone storage for production operation.** A local file picker may be an optional ingress convenience only. Do not make IndexedDB, localStorage, browser cache, phone Downloads, or local device storage the sole copy of any asset or the primary library. The cloud-backed application must load and list existing projects and assets across devices without reimporting from the phone. The currently deployed PreviewLock v0.1 browser-only import is an interim prototype, not compliance with this requirement.
3. **Verified upload and delivery transaction.** Upload to the correct Drive project folder; read back Drive metadata (file ID, name, size, MIME type, folder, revision if available); establish a supported authenticated playback mechanism or accessible review proxy; test actual playback from the intended client; only then mark the asset DELIVERED. Record Drive ID, project, role, source, version, direction/mirroring, duration, FPS, dimensions, review/approval state, provenance, created time, and delivery validation in the catalog. Never substitute a sandbox link, ephemeral object URL, or fabricated Drive URL for verified cloud delivery. Do not claim uploaded, playable, or backed up without verification.
4. **Project states:** INTAKE -> WORKING -> REVIEW -> APPROVED -> FINAL -> ARCHIVED. APPROVED refers to an approved component/review; FINAL is an explicit user decision about the complete project, not an AI inference. A preview or a finished render is not automatically FINAL.
5. **Finalization gate:** On explicit FINAL approval, verify (a) immutable final master(s) and all required deliverables are present in Drive and readable; (b) original source footage and designated reusable library components are preserved; (c) catalog and lineage manifest are written; (d) an inventory of temporary files is prepared with paths/Drive IDs, purposes, sizes, parent assets, and disposition; (e) there is a recoverable record of the project, including prior version IDs, timestamps, edit decisions, render parameters, and source links.
6. **Temporary file cleanup:** Only after the gate succeeds, remove transient render chunks, duplicate proxies, failed exports, staging files, and superseded intermediates not designated for retention. Prefer a reversible trash/quarantine stage with a logged retention window before irreversible deletion. Never delete originals, final masters, user-approved reusable reactions/animations/B-roll, required transparency source assets, project manifests, or anything with unresolved provenance. If retention is ambiguous, retain and flag for review. Never silently delete assets from Drive or the user's device.
7. **Reference trail survives cleanup.** Append each cleanup action to the project manifest: original filename and Drive ID/path, asset type, hash if available, parent/final lineage, disposition (retained/trashed/deleted), timestamp, reason, and recovery location/deadline if applicable. A deleted temp may no longer play, but its existence and role remain searchable forever. Retained source assets and final deliverables remain playable.
8. **SxLock handoff isolation:** A newly loaded source must begin with no sound effects from the previous video, while explicitly saved prior projects remain recoverable. PreviewLock should provide frame/FPS/position/seek controls and an edit handoff without silently copying unrelated project state.
9. **Storage and authentication:** Do not expose Drive credentials, private file URLs, or tokens in public GitHub Pages code. A server-side authenticated upload/catalog/playback bridge is required for true cloud-backed operation. Until that bridge is deployed and verified, clearly identify PreviewLock as a prototype and do not promise persistent cross-device storage.

## PreviewLock delivery — mandatory operating procedure (October 25, 2026)

Read [the PreviewLock delivery protocol](tools-home/tools/previewlock/README.md) before delivering any Grill Sergeant preview. The user verified the render → Dropbox upload (completed) → PreviewLock direct-open URL → video loaded in player workflow. **Deliver previews in PreviewLock, not as chat sandbox MP4 links.** The URL format is `https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/previewlock/cloud-test.html?v=CURRENT_BUILD&open=URL_ENCODED_FILENAME.mp4`. Wait for upload completion, preserve the exact stored filename, and never expose credentials. Frame-specific persistent notes and AI retrieval remain unfinished; do not claim them as functional.


## Grill Sergeant animation source-of-truth — Gemini (October 25, 2026)

**Gemini is the user's established animation-generation workflow.** The user explicitly identified the Timmy animation visible in the PreviewLock screenshot as **Gemini-rendered Timmy**. Do not misidentify it as an earlier assistant-made animation, an approved v10 head-turn composite, or a generic test asset. Do not default to recommending paid animation services or complicated external animation pipelines when Gemini is already producing the required animation.

**Required procedure:** identify the exact Gemini-generated source and version that the user approved; inspect the actual file, not just its thumbnail; preserve the original; composite that exact animation into the clean video bed; render a versioned preview; upload it to the PreviewLock Dropbox library; share a direct-open PreviewLock URL; collect revisions. Never silently substitute a different Timmy clip or infer asset identity from similar-looking thumbnails. If the approved Gemini file is unavailable, locate it in connected libraries or ask for the exact file instead of guessing.

**Distinguish tools:** Gemini = animation generation; PreviewLock = review/delivery; FrameLock/AnchorLock = stabilization; MotionLock = compositing motion; SxLock/WavLock = audio and sound tools. Use only the stages the actual deliverable requires. Avoid unnecessary paid services.

**Known failure:** On October 25, an incorrect Timmy clip was composited and the user identified the intended Gemini-rendered Timmy in a screenshot. This is an asset-selection error, not a reason to replace Gemini with another service. Source identification must be verified before compositing.

## Mandatory visible tool identity and version (October 25, 2026)

Every internal tool, lab, wizard, editor, viewer, and service UI must display a persistent, human-readable **tool name + unique tool ID + release version**. This applies to all existing and future tools, including PreviewLock, AspectLock, FrameLock, AnchorLock, MotionLock, SxLock, WavLock, CapLock, JokeLab, and any new modules. Examples: `AspectLock · GS-TOOL-ASPECTLOCK · R2` and `PreviewLock · GS-TOOL-PREVIEWLOCK · R26`. Never ship a tool without visible identification. Keep identifiers stable across releases; increment release numbers whenever deployed functionality changes. Match the visible version, document title, build identifier, and review links. During internal development, keep IDs legible on mobile without occupying significant screen space. Public distribution may hide the identifier in an About/Details panel only by explicit product decision; retain it in metadata, logs, support diagnostics, and version history. Do not confuse asset version IDs with tool release IDs. Verify the visible version after deployment.


## Release review access — October 25 correction

The owner must never be asked to know, locate, copy, or enter a PreviewLock setup key for ordinary video review. The key prompt was rejected as an operator-created usability failure. Release review now lives at https://gs-release-review.briskpear.chatgpt.site/ and uses owner-private ChatGPT account access. Project ID: appgprj_6ade3f9c3a908191a767fa078a102f6f. The old GitHub content-review.html redirects there. The private Site contains 56 recovered file candidates and saves owner decisions as durable review documents. No candidate is automatically release-approved. Browser verification confirmed the Chapter 1 VA video playing at 74.64 seconds total, readyState 4, no media error. This does not establish owner review of every file. Sources and master transfers are retained in the prior recovery checkpoint. Do not revert to a setup-key prompt or turn the owner into the integration operator.


## Sound Scrubber and cloud save contract — October 26, 2026 (owner directive)

This section supplements the existing production, cloud-storage and AI-operator instructions; do not replace or truncate those instructions. The owner's systems are interconnected: GitHub is versioned application source and method/manifest repository, Dropbox and Google Drive are durable media stores, and phone-first apps are operational interfaces. Inspect the existing code, storage folders, production instructions and cloud bridges before changing a tool. Avoid parallel shadow libraries.

**SAVE MUST SAVE THE ACTUAL FILE.** A Sound Scrubber Save is not merely a URL, metadata record, IndexedDB blob or download link. It must durably preserve the actual original audio bytes and their associated metadata in **both Dropbox audio files and Google Drive**, with verified write receipts from both. Browser cache is permitted as an intermediate/offline queue, never the only destination or a basis for claiming a completed cloud save. On partial failure, show which destination succeeded, keep the original and retry; do not display Saved until both destinations succeed. Maintain original and trimmed derivatives separately, with stable IDs, source, author, license/attribution (fields, **not import barriers**), rename history, category, duration, trims, approval status, bytes/hash when available, and exact cloud locations/receipts.

**Owner actions:** Inline Play, Save, Rename, Reject must operate without redundant steps. Save approves the recording and commits actual audio to both cloud stores. Reject removes it from the visible queue and future search results; retain only a stable rejection ID for deduplication. Never silently delete a cloud master. The Sound Scrubber is the acquisition/QC engine; SxLock is the locked production engine. Never auto-import or modify SxLock. Existing production assets should later be audited through the same scrubber review method.

**Verified structure, not assumed destinations:** Dropbox connected account currently lists `/Grill Sergeant/` with immediate children `Animation Lab/` and `Timmy Motion Library/`; a dedicated Dropbox audio destination was **not confirmed** by the current limited inspection. Google Drive account `kjiles71@gmail.com` exposes several distinct audio folders: `Gs audio` (ID `1HYUS7mSL7_T02y02P9byy-YLixldsgDZ`), `Audio` (IDs `1J1jFdEt44KI40UOfuDUx3sgFsfVoB2gM`, `1D6W1iDAlKHwqK3PPiEM4qwyg-sg5Oz6I`), and `GS_Jokelets_Clean_Audio_v1` (IDs `1ur2K9B_OYkH1Rdqxv5-FcKftr2d94n2w`, `1JhstLc_RKcgvfUyx09Xg_8JPVU0xib_D`). These are **observed folder candidates, not verified destinations for Sound Scrubber**. Trace parent folders and established workflow before routing audio; do not guess or merge unrelated categories.

**Integration limitation:** The static GitHub Pages browser cannot directly use ChatGPT's connected Dropbox/Drive tools or embed private cloud credentials. Build or reuse an authenticated backend/agent bridge with verified provider uploads and receipts. Existing R5 Sound Scrubber saves audio only to local browser IndexedDB; this is NOT compliant with the cloud-save requirement. Fix the integration before representing it as complete. Keep explicit failed/queued/partial/verified status and do not promise cross-device recovery without verifying it.

**Automation:** The existing Google Calendar `ChatGPT To-Do List — Daily Task Queue` is the central daily action index. Add sub-actions there, not new ChatGPT scheduled tasks. The Sound Scrubber sourcing cycle targets 50 distinct new sound candidates daily, logs licenses as metadata, deduplicates sources/rejections and requires owner QC. Nothing is auto-approved.

**Change control:** SxLock's working player, recording, mixing, timeline and export are locked to explicit user-authorized actions only. Android right-hand operation: controls right or bottom, compact. Sequential release IDs, unique cache identifiers, preserve source media and manifests, and distinguish code committed from Android/browser/cloud verification.


## WavLock component workflow — verified 2026-10-26

WavLock already exists at `tools-home/tools/wavlock/index.html` (currently v1.1). It loads original audio files, displays a waveform, supports precise IN/OUT marks, ±0.1-second seeking, selection preview, naming, and WAV export while preserving the original. It is the existing audio cutting and reusable-component export tool; do not invent another editor or replace WavLock.

**Pipeline:** Sound Scrubber discovers, previews, rejects, renames and approves sound assets → WavLock performs precision trims and exports independently named reusable WAV components → both original and derived components must be stored with provenance, trim points, parent asset ID and verified Dropbox + Google Drive save receipts → SxLock consumes only approved assets/components. The exact integration handoff from Scrubber to WavLock and the dual-cloud storage bridge must be implemented and tested; WavLock currently exports to the device, not verified cloud storage. Preserve existing controls and original source files. Never claim export alone constitutes dual-cloud backup.


## Sound Scrubber R12 save repair — October 26, 2026 (supersedes local-only R5 status)

Current implementation and operator protocol: tools-home/tools/sound-scrubber/AUDIO_SAVE.md. Preserve name-only rows with inline Play / Approve / Delete at the far right; tap filename to rename. Typical row is 47 CSS px, previously 105 px. Do not restore the indirect Review-link list or add per-row metadata. SxLock remains unchanged and locked.

Approve now sends actual original audio bytes through the EXISTING authenticated gs-previewlock-api service to /Grill Sergeant/Sound Effects/<asset-id>/, verifies byte size and Dropbox content_hash and preserves asset.json, approval/provenance and rename history. Uses the owner's existing PreviewLock connection; no new setup-key handoff. Retries are idempotent and different audio cannot overwrite a stable original ID. /api/audio-rename moves the real Dropbox file. Intake Delete does not delete cloud originals.

Drive is an explicit queued agent mirror, not immediate browser Drive upload. The existing daily calendar executor runs “ChatGPT Action — Mirror approved SX audio to Drive” (series i3j4ji1l9ji1ka21lb5qrb2d3s), with full instructions in that event and AUDIO_SAVE.md. This is NOT another task timer. Drive account kjiles71@gmail.com; verified Sound Effects library folder 1H269DHSY2hYwD7SKhmCmh2uAmBCh9LDy under Gs audio 1HYUS7mSL7_T02y02P9byy-YLixldsgDZ. Copy only approved Dropbox originals and metadata; preserve filenames in stable-ID subfolders. Verify downloaded Dropbox SHA256/bytes, actual Drive upload, provider metadata and raw Drive readback before writing a versioned drive-receipt-<13-digit-ms>.json to BOTH cloud asset folders. Do not auto-approve intake candidates, change schedules or import to SxLock. Resume partial saves rather than duplicate files.

/api/audio-record reads matching Drive receipts and rechecks current Dropbox metadata; only both verified may be shown as Saved. Renames invalidate the old-name Drive receipt until the daily mirror renames/verifies Drive. App refreshes receipts on open for its known approved assets. Browser cache remains temporary recovery storage, never sufficient preservation.

Verification: a bounded silent fixture passed a REAL authenticated Dropbox service upload, stored hash/size verification and independent connected-account listing. That same original was copied to Drive, downloaded and SHA256/size verified identically; receipt stored in both clouds. SHA256 86b5f5a4a69b226cef532cb4019df8ff0c08a804fa919af5d116e6e257cd9eac (60 bytes). Fixture check-20261027cafe is NOT a production sound and daily mirroring skips check-* folders. Startup write probe removed after success. Backend tests passed; the separate cloud browser lacked the phone's PreviewLock session, so physical-phone save verification is not claimed. Do not claim the 500 candidate binaries have all been backed up or approved; they remain preliminary search intake requiring QC.
