# PreviewLock — master implementation index
Updated: 2026-10-25

## Objective and non-negotiable acceptance
Finished video -> automatic transfer -> permanent Dropbox asset -> stable Android playback through PreviewLock -> approval -> retained master and audited cleanup. User must not download, rename, reupload, or store the video on the phone. Preserve existing frame-review app and SxLock. Do not display PreviewLock as available until tested. Do not conflate manual file delivery with automation success.

## Indexed steps
- [x] **01 Audit infrastructure.** Verified Render workspace `tea-d6rno2aa214c73bjm3ag`: `jokelet-api` (`srv-dbdui3vb9u1s73bir8kg`, GitHub repo `keythjyles/Vitals-Tracker-v1.0`, root `tools-home/services/jokelet-api/`) and `lex-backend` (`srv-d6rnut4r85hc73ehc12g`, same repo, root `/`). Both currently on free plan. Existing GitHub Pages tools, SxLock, frame-review application, and PreviewLock prototype are not to be replaced. Dropbox connected; folders `/Grill Sergeant` (id:lnTiunUsDy8AAAAAAAAABQ) and `/Grill Sergeant/Timmy Motion Library` (id:lnTiunUsDy8AAAAAAAAABg) created. **No Render-Dropbox credential or automatic transfer has been verified.** Step 01 is an inventory, not a proof of cloud transfer.
- [ ] **02 Define transfer contract.** Establish source file availability and permitted ingest path, identity, destination, checksum, authentication, status, errors, and idempotent retries; choose isolated service rather than changing jokelet-api unless justified.
- [ ] **03 Authorize Render-to-Dropbox access.** Secure server-side OAuth/token; never expose credentials in GitHub Pages, source control, logs, or chat.
- [ ] **04 Build automatic transfer.** Server-controlled upload with no user phone handling.
- [ ] **05 Verify integrity.** Dropbox returned file ID, byte size, revision, hash where available; readback and retry/failure handling.
- [ ] **06 Create persistent asset catalog.** Source, lineage, status, versions, timestamps, file IDs, reuse tags, approvals.
- [ ] **07 Connect PreviewLock playback.** Stable authenticated cloud playback link and Android verification.
- [ ] **08 Integrate SxLock/frame review.** Preserve current tools, ensure clean handoff and no stale effects.
- [ ] **09 Approval and cleanup.** Explicit FINAL gate, preserve originals/masters/reusable clips, audit and reversible temp cleanup.
- [ ] **10 Android end-to-end acceptance.** Test with TM-002 and a subsequent new asset, no manual download/upload.
- [ ] **11 Document and release.** Update AGENTS.md, operator/runbook, then enable tools-page link only after pass.

## TM-002 test identity
Approved visual asset `GS_TM002_POINT_LAUGH_IN_L_OUT_R_POC_v01.mp4`, approximately 2.6 MB. User manually downloaded and reuploaded as `17078.mp4`; this does NOT constitute automated delivery. Gemini original `17075.mp4` is separate. No Dropbox upload of approved TM-002 has been verified.

## Change control
Update step status only with verified evidence. No destructive operations without explicit approval. Do not require repeated user confirmation for already-approved project scope. Keep production systems isolated.
