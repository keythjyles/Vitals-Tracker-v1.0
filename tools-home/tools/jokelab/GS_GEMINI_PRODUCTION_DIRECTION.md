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
