## Current correction — CapLock R9, October 30

Insert records an editable layer; it never flattens media or automatically locks properties. R6–R8 automatic locks migrate without source, timing or geometry loss. Tap a placed name to edit; Apply settings stays at the sheet top. Move / size or Rotate returns to the canvas. Done or blank space clears selection; Hide/Show changes visibility without deletion. Previous/Next returns to placed items paused at their saved insertion. Schema6 reads1–5; preserve schema6 JSON on rollback.

Project/title/version controls hide after load. From a scrolled page, pull to the top, then pull again to reveal; tapping the grip is an explicit alternative. Independent bed/overlay transforms remain. Full studio adapters, in-item freeze/speed mapping, finished-video export and performance metrics remain unfinished/planned.

Behavior commit `34262bb6142c1282975d4d536d5bb99fc26ddf5a`:43 Node tests and full browser regressions passed (branch41087473606, main41087733684); Pages41087733216 succeeded. Live actual Pebble/1.webm/2.webm review verified insertion, return, X37 applied after insertion, deselection, Hide/Show, tucked drawer and paused ready4/error-null video. Owner-phone and owner-private-cloud acceptance remain separate. See CapLock EDITABLE_LAYERS_R9.json for evidence and the fixed restore-selection regression. No original-media mutation, production test upload, paid generation, SxLock/AspectLock change or schedule change. Clean-start cleanup waits for owner testing.

Historical lock instructions below are superseded by this correction.

---

## Current project/focus direction — October30, R8

Open project is the normal entry; files reveal within the suite and are individually savable. Include recorded text/scripts/transcripts, source media/clips/sounds, caption originals/cuts, alternate animations/reactions, HeyGen/ElevenLabs outputs and provenance/settings/costs. No paid regeneration to fill a stale catalog. R8 independently transforms focused bed/overlays inside a fixed docked player with tucked pull-down project controls; schema5 preserves state. Full cross-module shell/adapters and historical upstream reconciliation remain planned. Future exact-version/platform-post performance records keep organic and paid separate; analytics are unimplemented. Clean-start cleanup remains pending owner testing. Read [R8 operation](../caplock/FOCUSED_WORKSPACE_R8.md), [evidence](../caplock/FOCUSED_WORKSPACE_R8.json) and [recovery](RESUME_JOKELET_ENGINE.md).

## Current project entry — October30, R7

The shared visual project picker and sticky bed selector are implemented in CapLock R7; the complete cross-module studio shell and adapters remain planned. Open project restores its saved bed/edits and exposes recorded assets. Read [R7 evidence](../caplock/PROJECT_ENTRY_R7.json), [procedure and clean-start directive](../studio/PROJECT_PICKER_R7.md) and [recovery](RESUME_JOKELET_ENGINE.md). After owner testing, start from a clean new text-first workspace; test/rejected media stay outside active selection with recoverable lineage. Cleanup is pending; no originals were deleted. Earlier deployment notes below are historical where superseded.

## Current editing direction — October30, 2026

[Studio direction](../studio/STUDIO_DIRECTION.md) is the governing owner requirement: one joke project, visual list/grid picker with preview, associated assets loaded from bed identity, and state-preserving module tabs/phase navigation. CapLock/AspectLock are specialized compositing modules. Shell and unified picker are not implemented. CapLock R6 placement is deployed and browser-verified; read [current recovery](RESUME_JOKELET_ENGINE.md) and [exact evidence](../caplock/CAPTION_PLACEMENT_R6.json). Historical architecture below remains useful but is not a current inventory or deployment receipt.

# Grill Sergeant — production direction and session recovery
Updated: 2026-10-28. Status: architecture agreed; implementation partial.

## Launch contract
Opening JokeLab MUST surface current productions before new joke discovery. The launch panel reads PRODUCTION_LEDGER.json, shows latest selected runs and existing productions, and links playable MP4s where ledger assets exist. This is read-only; missing ledger is an error, not an empty queue. Do not replace existing JokeLab workflows or delete originals. Current panel is a first implementation, not proof of a live deployed browser test. The ledger was last marked 2026-10-24 and is not a complete live inventory.

## Production architecture
Canonical joke ID is the permanent organizing unit. JokeLab is the canonical source/identity and duplicate ledger. A Gemini creative workspace is desirable per joke, but no direct Gemini connector, automatic project creation, prompt handoff, or return callback is verified. Do not substitute NotebookLM or require users to copy prompts. Gemini should be invited to propose creative variations and improvements; evaluate independently without forced winner ranking. Google Drive and Dropbox are durable asset stores. ChatGPT coordinates approvals, ElevenLabs voice, HeyGen video, editors, CapLock and publishing. Never claim paid generation or publishing without tool confirmation.

## Character registry — next implementation
Create a versioned GS character registry keyed by explicit variant ID. Candidate variants: Classic, Fireside, Daylight, Reaction, Alternate. These are proposed categories, not verified avatar IDs. Each entry must refer to real approved source images, HeyGen avatar/look IDs, ElevenLabs voice ID/model/settings, costume/lighting rules, aspect ratio and constraints. Preserve one identity across variants unless an alternate is explicitly approved. Do not invent references. Reaction may be silent and mirrored; speaking footage must not be mirrored where GS lettering would reverse.

## Creative and technical doctrine
9:16 portrait, 25 fps. GS laconic, deadpan; no speech after punchline, only ambient sound and restrained reaction. Frame-accurate timing and editable separate transparent caption layers, not burned-in captions. Keep voice, picture, music, SFX, caption and edit assets separate with hashes, job IDs, and rebuild recipe. No paid generation without authorization and budget. Do not publish an unapproved jokelet. Do not remove scheduled posts without replacement.

## Work queue
1. Audit current productions against live Drive/Dropbox and update the ledger; existing file says 2026-10-24 and cannot represent every Oct 27–28 editor session.
2. Verify JokeLab launch panel on deployed site and playable links. Keep controls phone-friendly, inline playback and compact.
3. Build GS Character Registry from actual HeyGen looks and approved voice records; do not fabricate IDs.
4. Determine authenticated Gemini API / workspace integration, including whether persistent Gemini chat/project creation is supported. Skills are instructions, not storage or production engines. Do not represent a local bridge as a real integration.
5. Add approved-script and asset handoffs to production manager, preserving state and rollback.
6. Update AGENTS.md, operator guide and dated handoff when implementation changes; record verified vs merely designed.

## Current verified code changes
JokeLab launch panel committed 2026-10-28, reading existing ledger. Earlier manual Gemini bridge page exists as experimental code but was removed from JokeLab launch because it imposed manual copying. This file is the durable recovery record. Resume from ledger and existing productions; never restart production simply because a chat disconnected.


## R4 implementation supersedes the read-only launch description
See [CURRENT_PRODUCTIONS_R4.md](CURRENT_PRODUCTIONS_R4.md), [GS_CHARACTER_REGISTRY.json](GS_CHARACTER_REGISTRY.json) and [GEMINI_CONNECTION_STATUS.md](GEMINI_CONNECTION_STATUS.md). The launch now provides inline controls with separate decision persistence. Deployment evidence remains separate. Unmapped looks, full Drive/Dropbox reconciliation and authenticated Gemini integration remain outstanding.


## Owner strategy update — singles first
See SINGLES_FIRST.md and PRODUCTION_HANDOFF_CONTRACT.json. One independently publishable joke is the primary unit; collections reference finished singles later. Episode-first planning is superseded, while existing masters remain preserved. The new read-only /api/gemini-status route can verify configured provider access without generation. It is not the creative workspace or a completed provider connection.

## Service routing is verified
RENDER_SERVICE_MAP.json identifies the resolved My Workspace account and the three separate runtime paths. User delegated discovery; no further workspace-choice question is needed. Build the GS Gemini connection in gs-previewlock-api, preserving the dedicated voice service and the separate legacy VA-analysis/root testing backend. Gemini authentication and the actual creative round trip still require independent evidence.
