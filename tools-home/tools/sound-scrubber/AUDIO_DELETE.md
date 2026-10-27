# Managed sound deletion — R14.3

This supersedes older statements that Delete is browser-only or protects an
approved sound. It does not change SxLock or delete project placements.

## Owner interaction and API

Normal review rows retain name / Play / Approve / Delete. Delete removes approval
availability immediately. A cloud-backed recording calls the existing authenticated
PreviewLock service's `POST /api/audio-delete`, with `assetId`, original `sha256`,
`name`, `bytes`, and Dropbox `contentHash` when available. This route is implemented
in `tools-home/services/previewlock-api/audio-store.mjs`; it uses the existing
PreviewLock bearer authentication. No new credentials or service are required.

The service verifies stable identity against `asset.json` and stored receipts,
including original hash/size and exact managed Dropbox folder contents. For an
upload whose metadata write failed, it requires the cached original's size and
Dropbox content hash. Unknown/changed files stop removal and remain recoverable.
Before removing anything it writes and verifies a durable metadata-only intent:

`/Grill Sergeant/Sound Effect Deletions/<assetId>.json`

Schema `SoundScrubberDeletion-1` includes a unique `requestId`, original hash,
Drive library root, original Drive receipts, an inventory of managed Dropbox files,
and separate destination states. It contains no audio, credentials, or playback URL.
Dropbox files are removed individually by verified IDs; the asset folder is removed
only after it is empty. Retries verify absence and resume the same request. Provider
errors are never interpreted as confirmed absence. Deletion of a never-saved local
candidate does not require a cloud call.

The frontend keeps unfinished deletions in **PENDING DELETIONS**, below review and
failed saves, with one retry/refresh control. It removes browser audio only after
the cloud deletion intent is durable. On cloud-request failure it retains local
audio and retry metadata. A local deletion failure also remains retryable. Reload
resumes these requests. Complete is shown only when browser, Dropbox, and Drive
are all verified. No permanent rejection blacklist is created. A completed cloud
deletion permits a new approval of a rediscovered candidate; an unfinished deletion
blocks a conflicting re-save of the same cloud identity.

## Existing daily Drive executor — process BEFORE mirroring

Drive has no authenticated direct-delete connection in this deployed service.
Use the existing connected-account daily mirror action; do not add a timer,
service, payment requirement, or frontend credentials. Drive removal is asynchronous
and must remain visibly pending until the following operations actually succeed.

1. Read/paginate `/Grill Sergeant/Sound Effect Deletions`. Process only JSON with
   schema `SoundScrubberDeletion-1` and `complete !== true`; the separately named
   completion receipts are not jobs. Re-read the current job before each mutation,
   requiring the same `requestId` and original SHA256. Do not act on a removed or
   superseded job. Do not process `check-*` fixtures unless explicitly running a
   bounded integration test.
2. Use connected Drive account `kjiles71@gmail.com`, verified library root
   `1H269DHSY2hYwD7SKhmCmh2uAmBCh9LDy`. Search/paginate **all** asset-ID subfolders
   with the exact job `assetId` under this root, including unreceipted partial
   uploads. Validate every receipt's `assetId`, `sha256`, and root before using it.
   Receipt folder IDs must still be children of the verified root with the exact
   asset-ID folder name; never follow a moved file into an unrelated project.
3. List/paginate each matching folder. Verify the original audio by raw download,
   SHA256, and byte count (or an already verified matching immutable receipt plus
   unchanged provider revision). Renames retain identity. Delete only matching
   original copies, `asset.json`, and managed `drive-receipt-<13-digit-ms>.json`
   metadata for this asset. Validate metadata identity before deleting it. If an
   unknown recording, unrelated file, changed original, or unexpected subfolder
   appears, stop that folder's cleanup, keep the job pending, and report the
   actionable mismatch. Do not delete other projects, sources, or collections.
4. Delete the matching files and then the empty asset-ID folder using the connected
   Drive operation. Use the connected `google_drive.delete_file` permanent-delete operation.
   Verify each returned ID is absent and re-query the root to verify no matching
   managed copies remain. Only explicit provider absence establishes deletion;
   permission errors or empty tool output do not. Record the verified operation. A receipt-only cleanup
   is insufficient if the audio still exists. If no asset folders/copies exist,
   verify that absence through the same paginated root query.
5. Save a UTF-8 completion receipt at the **returned existing job root**:
   `<assetId>-<requestId>-drive.json`. Poll asynchronous Dropbox uploads to complete
   and read it back. Exact body:

   ```json
   {
     "schema": "SoundScrubberDriveDeletionReceipt-1",
     "assetId": "<job assetId>",
     "requestId": "<job requestId>",
     "sha256": "<job original SHA256>",
     "rootFolderId": "1H269DHSY2hYwD7SKhmCmh2uAmBCh9LDy",
     "verified": true,
     "status": "deleted",
     "method": "connected-drive-delete-and-readback",
     "verifiedAt": "<actual UTC verification time>",
     "folderIds": ["<actual removed folder IDs>"],
     "fileIds": ["<actual removed file IDs>"],
     "deletionMode": "permanent-delete"
   }
   ```

   Use `status: "absent"` with empty ID arrays only when all managed copies were
   already absent. Preserve a matching existing verified receipt rather than
   creating a conflicting overwrite. Never invent IDs, times, or verification.
   Do not write this receipt inside the deleted asset folder or recreate it.
   Do not overwrite the API-owned job; API retries independently verify Dropbox
   absence and accept only a matching, current Drive completion receipt.
6. Before every ordinary mirror upload, check for an active deletion job. Skip
   pending deletions even when an earlier download or Drive upload already began.
   Recheck after uploading and before writing an approval receipt. If deletion
   started concurrently, remove the newly created matching managed copy using
   the protocol above. Never restore an approved audio copy from stale metadata.

The app completes its next Delete retry/reload after the Drive receipt exists.
Until then it continues to display Drive pending, even if the executor has already
removed the file. Completed intents are metadata receipts, not search exclusions;
the API clears the old intent before a subsequently authorized new save. Historical
Drive completion receipts cannot authorize deleting that new save.

## Verification status

Automated provider doubles cover scoped deletion, interrupted checkpoints, orphan
upload recovery, altered-file refusal, paginated listing, repeat retries, stale
Drive receipts, and rediscovery/reapproval. Frontend state doubles execute the
shipped approval/deletion functions, including storage failure and reload recovery.
These are not live cloud or physical Android tests. A live authenticated disposable
fixture is still required to claim end-to-end provider verification.

Run: `node --test tools-home/services/previewlock-api/*.test.mjs`.
