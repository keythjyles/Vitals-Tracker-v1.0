## Production-stage receipts — November 2, 2026

The existing service adds `/api/joke-project/stage` and verifies saved bytes, container, alpha, frames, audio, current render recipe and project-local parents before appending an optional production receipt. Stage assets use `role=stage`; existing originals are preserved. This release requires the same main-branch service deployment, with no settings or credentials changed. [Protocol and rollback](../../tools/studio/PRODUCTION_STAGES_R16.md). Earlier notes remain historical.

## Independent video-cut jokelet projects

`POST /api/joke-project/from-cut?id=cut-<source-bound SHA-256>` accepts a validated `origin` from `shared/cut-jokelets-core.mjs`. It creates a new project with explicitly untranscribed text and pending video, without replacing an existing joke. Upload actual prepared video through the existing `/asset?role=bed` route, then call `/from-cut` with `assetId` and the verified output SHA-256/size/frame/duration/audio metadata. Only an asset saved in this project can complete the binding. A ready retry returns the current project unchanged, including later caption edits. Cut-project CapLock saves must reference that same project and one of its saved beds. Every write retains existing Dropbox byte verification and queues the established Drive backup.

Public health advertises `cutJokeletVersion:1`; authenticated project reads advertise `videoCutProjects:1`. No provider credentials, new service, disk or schedule is added. The browser staging tray is transfer recovery rather than cloud backup. Tests use disposable in-memory Dropbox fixtures and real encoded video; they must not upload test material to production.

---
# PreviewLock API (isolated)
This service does not modify jokelet-api or lex-backend.

Initial release exposes GET /health and a disabled-by-default OAuth setup path. The intended Dropbox OAuth callback is `https://<verified-render-host>/oauth/dropbox/callback`. Do not register a guessed hostname.

Before OAuth is enabled, set PUBLIC_BASE_URL, DROPBOX_APP_KEY, DROPBOX_APP_SECRET, PREVIEWLOCK_SETUP_KEY in Render secure environment variables. The setup key is an admin secret, not a public website token. Do not paste credentials in chat or commit them.

**Important:** The OAuth callback currently refuses token exchange until secure durable token persistence is implemented. A successful deployment does NOT mean Dropbox is connected. In-memory OAuth state is single-instance only. Do not authorize Dropbox yet. Production implementation must add persistent encrypted token storage, CSRF protection, idempotent upload and verification, and private playback.

No phone downloads or uploads should be needed for the eventual pipeline.


## Current audio routes — October 27, 2026

The initial-release text above is historical. The existing production service uses securely configured Dropbox refresh credentials and PreviewLock bearer authentication. Audio source: `audio-store.mjs`. Routes: `/api/audio-save`, `/api/audio-rename`, `/api/audio-record`, and the new `/api/audio-delete`. Health advertises `audioDeleteVersion: 1` when this backend revision is deployed.

Managed deletion has verified Dropbox removal and a durable Drive cleanup request; Drive cleanup uses the existing daily connected-account executor, not a new direct Drive connection. Read `../../tools/sound-scrubber/AUDIO_DELETE.md` for the full protocol. Keep pending/failed provider results explicit. Run `node --test *.test.mjs` here. Tests use provider/storage doubles; they do not establish live cloud deletion.

## Verified workspace and runtime routing — October 28, 2026
See [service map](../../tools/jokelab/RENDER_SERVICE_MAP.json). All three services belong to My Workspace (tea-d6rno2aa214c73bjm3ag), account kjiles71@gmail.com. gs-previewlock-api, ID srv-dberk21srm7s73d4kqr0, starts tools-home/services/previewlock-api; jokelet-api, ID srv-dbdui3vb9u1s73bir8kg, uses tools-home/services/jokelet-api. The separate lex-backend, ID srv-d6rnut4r85hc73ehc12g, starts root server.js for legacy VA-analysis/testing. Do not put the GS Gemini bridge in that root service. User delegated the workspace choice; do not ask again. Preserve service configuration, existing env vars and plan.
