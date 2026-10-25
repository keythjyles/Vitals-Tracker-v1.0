# PreviewLock transfer contract v1 — Step 02
Date: 2026-10-25
Status: DESIGN COMPLETE; implementation and credential authorization pending.

## Goal
Producer outputs a finalized MP4 in a server-accessible production staging area; an authenticated service moves it directly to Dropbox and registers a durable asset record. No user phone download/upload. ChatGPT sandbox links and ChatGPT Dropbox fileParams are not the transport.

## Existing systems
GitHub repo: keythjyles/Vitals-Tracker-v1.0. Render: jokelet-api and lex-backend; do not modify either as part of this integration. GitHub Pages PreviewLock prototype uses IndexedDB/local URLs and is NOT the canonical library. Existing SxLock and frame-review tool remain intact. Dropbox target: /Grill Sergeant/Timmy Motion Library/.

## Ingest and authentication
Preferred: separate Render PreviewLock service, authenticated by a narrowly scoped producer identity, receives a short-lived upload request from a producer that can read the rendered MP4. If producer cannot reach Render directly, use a separate trusted cloud staging source with authenticated fetch. No public arbitrary-URL fetch (SSRF risk), no long-lived credentials in browser or GitHub. Dropbox OAuth credential is server-only; ChatGPT Dropbox connector access is separate and does not grant Render credentials.

## Asset contract
Asset ID (UUID); project; logical name; version; source provenance; parent IDs; file size; SHA-256; MIME video/mp4; dimensions; FPS; duration; Dropbox path, file ID, revision, server timestamp; lifecycle state; creation and approval audit. Store manifest durably outside Render ephemeral filesystem (e.g., Dropbox JSON manifest with optimistic concurrency or managed DB). Never treat GitHub Pages IndexedDB as durable record.

## Upload protocol
1. Producer calculates SHA-256 and size; obtains authenticated upload authorization with declared metadata and idempotency key.
2. Server accepts bounded streamed upload; validates content, filename, MIME and checksum; no unbounded memory buffering.
3. Server uploads via Dropbox upload session as needed, obtains Dropbox file ID/revision/size, and verifies readback metadata.
4. Commit manifest atomically/with revision check; mark AVAILABLE only after Dropbox verification. Retries use idempotency key and must not create duplicate logical versions.
5. Return asset ID and authenticated PreviewLock playback reference. Server mints short-lived access to Dropbox content or streams with Range support. Do not publish permanent public links or raw credentials.
6. On failure, preserve source, report FAILED/RETRYABLE, log request ID and nonsecret error; never claim success.

## Acceptance
A) Producer-generated TM-002 transfers without Android file handling. B) Dropbox metadata and checksum match. C) Android can play/scrub via PreviewLock; review tool unchanged. D) A second new file follows identical steps. E) approved FINAL survives service restart; audit cleanup never removes masters or reusable clips.

## Open prerequisites / Step 03
1. Configure secure Dropbox app OAuth for Render, ideally scoped to /Grill Sergeant with least privilege.
2. Identify a producer execution path that has direct access to the completed MP4. The ChatGPT connector alone cannot directly supply this to Render; this must be proven with a real end-to-end transfer.
3. Select durable manifest persistence and private playback mechanism.
No Render service created and no Dropbox credential granted by this document.
