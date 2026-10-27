# Sound Scrubber audio preservation — R12
Verified October 27, 2026 UTC (October 26 America/Chicago).

The user requires name-only rows with inline Play / Approve / Delete at the far right and filename-tap rename. Do not replace this with a Review link or add metadata to every row. Preserve existing SxLock, its sources, sound IDs and owner decisions.

## Actual save path
Approve caches the original as a recovery copy, then POSTs the actual audio bytes to the existing authenticated PreviewLock service /api/audio-save. It reuses the browser's existing PreviewLock connection; never ask the owner to copy setup keys.
Dropbox root: /Grill Sergeant/Sound Effects.
One asset folder per stable ID (commons-<pageid> or local-<SHA256>), containing the original filename and asset.json.
The service verifies stored byte size and Dropbox content_hash against the uploaded original and stores SHA256, metadata, approval and rename history. Same-ID different content is rejected; retries reuse matching originals. Rename moves the existing Dropbox file and preserves its ID. Delete in the intake excludes the candidate; it never deletes cloud originals.
The owner-private metadata is in Dropbox, not public GitHub. Do not put tokens, temporary URLs or credentials in a manifest.

## Drive mirror: existing daily calendar executor
This is an agent bridge using the connected Dropbox and Google Drive accounts, not an instant browser-to-Drive integration. Dropbox saves immediately; Google Drive backup is queued for the once-daily Daily Calendar Task Review. Never call a partial save complete.
Google Drive account: kjiles71@gmail.com.
Existing parent: Gs audio, ID 1HYUS7mSL7_T02y02P9byy-YLixldsgDZ.
Verified Sound Effects folder: 1H269DHSY2hYwD7SKhmCmh2uAmBCh9LDy.
Create/reuse an asset-ID subfolder here; preserve the owner's actual audio filename within it.

Daily action:
1. Read and paginate the Dropbox Sound Effects folders. Skip check-* connection fixtures. Read each returned asset.json; act only on status approved. Respect returned paths and stable IDs. Never approve pending search candidates.
2. Inspect existing Drive receipts before any upload. Use the connected account above. Find/reuse the asset-ID subfolder under the verified library folder. Search/check its files to avoid duplicates.
3. Obtain the original with Dropbox download_link; consume the single-use URL once. Verify downloaded byte count and SHA256 against asset.json. Never use the public source instead of the preserved original for this mirror.
4. Upload the actual audio with google_drive.upload_file to that asset folder. Copy asset.json as associated provenance. Preserve originals and all source metadata. If the file already exists with matching bytes, verify and reuse its ID. Never overwrite a different recording. For a previously mirrored file whose Dropbox name changed, use google_drive.update_file name (metadata-only) to retain its Drive ID, then verify.
5. Read back Drive metadata (ID, name, size, parents) and the full raw audio. Verify SHA256 and byte length against the Dropbox original. A successful upload response alone is insufficient.
6. Create a new UTF-8 drive-receipt-<13-digit Unix milliseconds>.json in the SAME Dropbox asset folder and also in the Drive asset folder. Never overwrite prior receipts; retain every successful version. Poll asynchronous Dropbox uploads to completed. Required body:
{
 "schema":"SoundScrubberDriveReceipt-1",
 "assetId":"<stable asset ID>",
 "name":"<current original filename>",
 "sha256":"<64 lowercase hex original SHA256>",
 "bytes":123,
 "rootFolderId":"1H269DHSY2hYwD7SKhmCmh2uAmBCh9LDy",
 "folderId":"<verified asset Drive folder ID>",
 "fileId":"<verified original Drive file ID>",
 "verified":true,
 "verifiedAt":"<actual UTC verification time>",
 "method":"connected-drive-upload-and-readback"
}
Include relevant provider metadata and provenance, without credentials or temporary download URLs. Never fabricate these fields or set verified before readback.
7. The authenticated /api/audio-record?assetId=... endpoint accepts only a matching original hash, size, current name, expected Drive library folder and verified readback receipt. The app refreshes receipts on open for its approved assets. A rename invalidates the prior name's Drive receipt until the daily worker renames/verifies the Drive copy.
8. Preserve a completion/checkpoint receipt. On partial failure keep the successful original, report the failed destination and resume safely next run. Alert only actionable failures; no routine empty checks. Do not change publication schedules, spend, add timers or import into locked SxLock.

## Verification
Six backend tests passed: original preservation, idempotent retries, real rename, immutable-original conflict protection, metadata-failure recovery, multi-block content hash and strict matching of Drive mirror receipts.
Frontend tests cover inline controls, filename-extension preservation, repeated-click protection, rejection persistence, and explicit Dropbox/Drive partial state.
Live authenticated service test wrote a 60-byte silent WAV to Dropbox, verified readback metadata/content hash, and independently listed it through the connected Dropbox account.
That SAME Dropbox original was downloaded, hashed, uploaded to Google Drive, read back and hashed identically:
SHA256 86b5f5a4a69b226cef532cb4019df8ff0c08a804fa919af5d116e6e257cd9eac.
Fixture asset ID check-20261027cafe, Dropbox file ID id:lnTiunUsDy8AAAAAAAAAXQ; Drive file ID 1HXZkj_xfdA8TaSHOA4u9G4inQQ4ivin9. This is explicitly a connection fixture, NOT an approved production sound. The temporary startup write probe was removed after verification.
The separate cloud browser lacks the phone's PreviewLock connection; its UI fixture could not authenticate. Do not misreport physical-phone save verification. The server-side authenticated route DID complete a real Dropbox upload.
The 500 intake entries are preliminary search candidates, not 500 approved SFX; some require rejection. Metadata sourcing did not save all candidate binaries.

## Current UI
R12. Typical row measured 47 CSS px (previously 105 px), with 42 px Play / Approve / Delete buttons, 2 px gaps, zero right gap, and no metadata/Trim text within rows.
