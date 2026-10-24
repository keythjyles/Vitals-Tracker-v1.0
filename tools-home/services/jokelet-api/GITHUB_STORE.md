# Existing-storage production jobs

User correction: use existing GitHub and Google Drive first. No Render upgrade or disk activation is approved. The SQLite adapter is an inactive alternative, not a prerequisite.

## Working path under verification

The AI writes `tools-home/tools/jokelab/requests/voice-preflight.json` through the connected GitHub tool. The dedicated preflight workflow reads the exact request commit, creates a durable job receipt before provider access, performs one authenticated read-only ElevenLabs voice lookup and verifies an existing approved source MP4 by its recorded SHA256. It commits the job and result together in GitHub. Original media stays unchanged in its existing repository/Drive locations.

Stable job records: `tools-home/tools/jokelab/jobs/<jobId>.json`.
Stable results: `tools-home/tools/jokelab/results/<jobId>.json`.

A repeated completed job restores the committed result after checking its hash. It does not contact ElevenLabs again. Different input under the same ID, a missing/changed result, an unfinished job or an unapproved source stops the operation. Provider calls are never automatically retried. A failed persistence operation keeps a recovery artifact; only GitHub ref conflicts may be retried, without another provider call.

The workflow uses its short-lived GitHub token for repository writes and OIDC for the existing read-only Render endpoint. No private provider/operator key is copied or exposed. Its permission is contents:write within the repository; the runner code is loaded from its exact triggering commit. Artifact retention is only a fallback; committed receipts/results are the durable checkpoint.

## Limits

Only zero-paid-request voice preflight is accepted. This does not enable paid AI TTS, a persistent money budget, media uploads, a complete queue or the phone Wizard's authenticated job submission. GitHub workflow concurrency is not a FIFO queue; operate one request at a time and verify completion. Drive still holds the existing media archives through the established connector; the backend has not gained Drive credentials. Adding generated media to Drive and connecting both operator modes to paid reservations remain work to prove.

The live save/restore test is documented in `runs/JL-20261023-GITSTORE-01.json`. Never substitute the old disk approval request for this current path.

## Local checks

Six Python tests pass: replay without a second lookup, changed-input rejection, result-integrity rejection, no retry after uncertain outcome, rejection of paid operations, and approval failure before provider access. The existing Node service tests remain separately recorded.
