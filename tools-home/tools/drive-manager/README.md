# Drive Manager · VT-DRIVE-MANAGER · R1

The Vitals Tracker home screen and Tools directory open the same private Drive Manager at `https://gs-previewlock-api.onrender.com/drive/`. The static entry only redirects; the existing Render service serves the application and authenticates every file request.

Connect Google Drive once with the existing Google OAuth web client. This tool needs the full `drive` scope to manage existing files and restore originals; the Sound Scrubber's `drive.file` grant cannot supply it. The existing registered `/oauth/google/callback` dispatches by signed state. Audio, Scribe and Field Guide callbacks retain their current behavior.

Refresh credentials are sealed with AES-256-GCM using a key derived from the existing server secrets and retained in a Secure, HttpOnly, SameSite=Lax cookie. The browser does not receive provider tokens. The session survives a service restart; access tokens refresh automatically. Google revocation, a cleared browser profile, changed server secrets or an expired grant can require reconnection. Only the two existing owner accounts are accepted. No new paid service, plan, disk or setup key is required.

My Drive, Recent, Starred, Shared with me and Trash use current provider data, with pagination. Search covers Drive rather than just the open folder. Folder details show the parent path, actual trash state and original ID. A failed read retains the previous list and an error; it is never presented as an empty success. Pinned folders and recent-change receipts belong to the connected account on that browser.

Renaming, moving, copying, new folders, stars, uploads, Trash and Restore require explicit controls. Nothing is reorganized during page load, refresh, search, navigation or a build. Moves preserve original IDs and remove only the observed source parent. Restore checks and displays any trashed parent locations before restoring parents and descendants in order. No permanent-delete endpoint is supplied. Restore never makes replacement folders. Copy is a separately named action.

Every mutation validates the signed-in session and exact Origin. Duplicate click identifiers reuse the same operation result. Partial failures identify the failed items. A network failure is an uncertain result: inspect Drive before making the change again. Recent rename/move actions may be undone only if their current metadata still matches the recorded result. Trash has an explicit confirmation. Resumable uploads use bounded 4 MB chunks and opaque encrypted upload tickets, preserving the existing upload session when the owner presses Resume.

PDF, image and media previews are authenticated streams. Unsafe active content is downloaded as an attachment. Google-native documents export to PDF subject to Google's export limits. Original source files and sharing permissions are retained.

Run `node --test drive-manager.test.mjs` in the existing service directory. The tests use in-memory provider fixtures, not production records. They cover grant scope, restart recovery, CSRF, inherited Trash, stable IDs, movement/cycle checks, stale undo, duplicate creates, private content and resumable transfer. Run the existing service regressions before deployment. Browser fixtures and live deployment checks must be recorded separately from owner-authorized live Google access.

Rollback baseline: `215c8adbdaf5248d862236c00044c84206ff0ba5`. Revert only this release's application, service registration and navigation changes. Preserve Google Drive originals, existing audio connections, owner browser storage and medical records. The claims-folder visibility repair is an independent user-authorized file operation, not part of a software rollback.
