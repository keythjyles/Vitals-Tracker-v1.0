# PreviewLock API (isolated)
This service does not modify jokelet-api or lex-backend.

Initial release exposes GET /health and a disabled-by-default OAuth setup path. The intended Dropbox OAuth callback is `https://<verified-render-host>/oauth/dropbox/callback`. Do not register a guessed hostname.

Before OAuth is enabled, set PUBLIC_BASE_URL, DROPBOX_APP_KEY, DROPBOX_APP_SECRET, PREVIEWLOCK_SETUP_KEY in Render secure environment variables. The setup key is an admin secret, not a public website token. Do not paste credentials in chat or commit them.

**Important:** The OAuth callback currently refuses token exchange until secure durable token persistence is implemented. A successful deployment does NOT mean Dropbox is connected. In-memory OAuth state is single-instance only. Do not authorize Dropbox yet. Production implementation must add persistent encrypted token storage, CSRF protection, idempotent upload and verification, and private playback.

No phone downloads or uploads should be needed for the eventual pipeline.
