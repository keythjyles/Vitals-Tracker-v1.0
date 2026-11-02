## Verified production stages — November 2, 2026

CapLock R16 now produces a captioned composite and opens the same single-joke project in SxLock R31. SxLock saves the editable sound pass and verified jokelet. Clipper R15 remains optional; Studio R2 skips cutting in its normal joke route. Stage-aware lists default to ready inputs with Show all files off. Originals, layers, captions and prior versions are retained. The locked player equipment is unchanged. [Operation, file extensions, rebuild contract and rollback](../studio/PRODUCTION_STAGES_R16.md). Earlier release sections remain historical.

## Jokelet-first cut projects — Clipper R13 / CapLock R14, November 1, 2026

Owner direction: finish and caption individual jokelets. An episode assembly is not a prerequisite. Existing finished/mixed source cuts retain their picture, soundtrack and exact source range; no new performance or automatic transcript is invented.

In Clipper Video + sound, tap the existing CapLock link. Its saved cut list appears by name in a compact CapLock picker while the existing cutter prepares any missing video files. Prepared outputs are reused. Open project creates or resumes that cut's independent jokelet folder and video bed through the existing authenticated PreviewLock service. Browsing alone does not create cloud projects. Each jokelet owns its caption animations, numbered components and CapLock edits; switching saves the current workspace first. The source fingerprint, native IN/exclusive OUT, timestamps, original filename and saved cut ID remain recorded in cutOrigin. Renaming/reordering a cut preserves identity; a changed source or committed frame range creates a separate project without replacing prior caption work.

The same-origin IndexedDB handoff holds temporary cut bytes until the selected video's Dropbox save and hash/size receipt are verified. Opening a project uses the owner's existing PreviewLock connection. Failed/partial saves retain the staged file for retry and never claim a complete project. A verified bed releases its temporary handoff copy, while the cutter's prepared download remains available. Drive backup stays explicitly pending through the existing mirror workflow. No credentials or media bytes enter navigation URLs.

Saved project schema GS-JokeProject-1 gains optional GS-CutJokelet-1 provenance. POST /api/joke-project/from-cut creates the source-bound project without fabricated joke text, then binds the verified bed. Retries reuse a ready project and preserve its title, text, assets and caption history. Cut workspaces reject a CapLock save bound to another jokelet or bed. Existing canonical joke IDs are not guessed from short cut names. Built-in auto-captioning remains owner-locked; import the created animated caption components as before. This handoff does not add a final layered-video renderer or authorize generation/publication.

Rollback: d984d51b589468a19942a34aa4448f682b40938e. Preserve all original media, prepared downloads, cut drafts, child projects, optional cutOrigin data and edit histories. Verification: tools-home/tools/cliplock/JOKELET_PROJECTS_R13.json. Phone/private-cloud acceptance remains distinct from authenticated fixtures and code deployment.

---
# GS Studio R1 — select a joke, then produce it

Owner authorized implementation with “Right. Make it.” after specifying: tap an app icon, open the entrance, select a joke, then follow the structured method. The starting point is the existing JokeLab selector inside GS Studio. ChatGPT is not a required manual entry stage. This release is the repository container, separate from the earlier unapproved ChatGPT Site.

## Open and install

Open `tools-home/tools/studio/` from Tools Home. On supported Android browsers, use Install app when offered, or the browser's Add to Home screen / Install action. The manifest has a stable ID/start URL, standalone display and reproducible 192/512 PNG icons. Installation itself requires the owner's device; remote browser verification does not claim the icon has been installed on their phone.

Launch opens **Select a joke** in the real JokeLab library. Existing Browse/Saved/Queue filtering remains. Select creates or resumes the canonical joke's saved folder and literal text through the existing authenticated backend. Resume a saved joke is available alongside the selector. Browsing does not create projects or generate media.

## Production flow

Six compact tabs: **Joke, Cut, Captions, Scene, Sound, Review**. Actual module names/IDs/releases remain visible within the workspace. The Joke phase contains text, phrases, Scribe and project assets. Develop in JokeLab retains canonical identity. Voice, bed, caption original, reaction, sound/music, image, outro, B-roll and review imports preserve actual originals in this project; matching hashes reuse saved assets.

Cut uses Caption Clipper R5; Captions uses CapLock R10; Scene uses AspectLock R28; Sound uses SxLock R28; Review uses PreviewLock R30. Standalone tool URLs remain available. Existing render/mixing/compositing engines remain; adapters add project load/checkpoint/resume. Project selection is not paid-generation approval.

**Save** checkpoints the active phase. **Next phase** saves and changes module. Direct tab changes follow the same save acknowledgement. A failed/conflicting save keeps the active editor and its local work open. Next/Previous element and Insert remain native distinct actions; CapLock Insert stays editable. Only explicit playback starts video on a phase restore.

Each departure pauses the active module, saves a native snapshot and unloads the frame after success. This avoids keeping six media engines decoded on the phone. Reopening restores native state rather than reimporting the source from Downloads. CapLock's undo/redo/view metadata is included when it belongs to the same current native cloud snapshot; newer standalone CapLock edits win. Other native undo behavior is not invented as a new persistent undo system.

The Joke phase's Assets list shows original and historical component media with preview/save controls. Use as bed selects one saved video for the whole joke; Captions, Scene, Sound and Review use that bed while retaining their editable passes. Importing an alternate video alone does not replace the selected bed. Existing source folders are reused; device choice is optional import ingress. The first native player and its right-hand precision controls remain intact, with added items immediately below the player/control dock. Duplicate app navigation is hidden only while inside the container.

## Persistence contract

Working root remains `/Grill Sergeant/JokeLab Productions/<canonical-id>/` in Dropbox. Google Drive mirroring remains separate. A completed working save is not a verified current Drive backup. The app never reports a queued backup as complete.

The existing `GS-JokeProject-1` manifest gains optional `studio` data (`GS-Studio-1`, version 1): current phase and versioned per-module sessions, immutable snapshot references, and bounded request receipts. Existing CapLock state/history, text history, media, cut passes and previous schemas remain preserved.

Authenticated `POST /api/joke-project/studio?id=...` requires expected project revision, expected module revision, request ID, next phase and a `GS-StudioModule-1` session bound to the same project/module. Successful retries reuse their recorded request ID. Stale module writers are rejected even if they have reread the latest project revision. Cut drafts also bind source asset/hash/pass, preventing old-pass drafts from repopulating a new slate.

Unrendered caption ranges, marks, name, cursor and keying settings can be checkpointed without calling the renderer. New pass continues to use the established R4/R5 cut-history mechanism and never deletes prior files. Clipper marks retain native source frames/timestamps; CapLock uses composition frames; SxLock/PreviewLock preserve seconds; AspectLock retains its native 540×960 alignment specification and separate view transform.

SxLock keeps its native project/mixer schema. Used imported recordings are preserved as actual project assets; their cloud references replace embedded bytes in studio snapshots and reconnect on restore. Used recorded library effects are also copied once into the joke project before a completed studio save. Existing synthesized legacy effects retain their native definitions/source code. This is separate from general cross-device Sound Scrubber catalog synchronization.

RPC is same-origin, versioned and bound to the exact child frame/request ID. The backend preserves existing PreviewLock authentication. No setup key, provider token or temporary playback URL is put into navigation URLs, adapter messages, project exports or public source. No new infrastructure, permissions, account or schedule is created.

## Boundaries

The container does not establish automated Gemini creative handback. Gemini captions opens the existing native conversation for Pebble or the normal Gemini entry for other jokes; this is labeled separate navigation. Import the finished animation. It does not generate voice/video on its own or consume the old experiment's budget.

The container does not implement per-frame animation speed/hold maps or a combined final renderer. Scene and Sound operate their saved native passes. PreviewLock labels the source bed as **Source preview** unless an explicitly imported review export is selected. Do not label an uncomposited source a finished release or assume SxLock export includes independent CapLock/AspectLock layers. Final composition, durable review notes, performance metrics and complete historical archive reconciliation remain further milestones.

No production cloud project is rewritten merely by deploying the app. Legacy Pebble migration occurs only through actual editor use/save. No source cleanup, paid generation or scheduled-post changes are performed.

## Checks and rollback

`GS Studio checks` runs core/transaction tests and an authenticated-fixture browser flow through the real modules, with actual FFmpeg-made source/alpha fixtures. Existing CapLock, Clipper and SxLock workflows remain required regressions. Runtime release/phone/cloud/deployment evidence is recorded separately in `RELEASE_R1.json` after verification; test fixtures are never uploaded into production storage.

Rollback baseline: `9088243aae62dcaa3f78d5c532337639db6640a2`. Revert application changes only; retain project.json, optional studio fields, immutable edit snapshots, sound/media originals, cutHistory, CapLock history and backup receipts. Older standalone modules may not show studio-specific state; they must not be used as a migration tool to discard it. Do not roll back the server's supported project roles while pending studio edits reference them without first planning compatible recovery.

Source: `index.html`, `studio.mjs`, `studio.css`, `core.mjs`, `adapter.mjs`, `app.webmanifest`, `scripts/make-icons.py`; additive native adapters are at each module's existing entry/controller. Backend source: `../../services/previewlock-api/joke-project.mjs`. Recovery entry: `STUDIO_DIRECTION.md` and the repository's master tool index.

