# Sound classification pipeline — R14.10

Owner requirement: approved is a review status, not a sound category. Approved effects must be categorized and searchable without reapproval or reupload. This stage is explicitly scoped to SxLock's approved-library integration; its R24 editor, audio scheduling, timeline, existing IDs, media and export behavior remain intact.

## Immediate path

`shared/effect-classification.js` supplies a synchronous metadata-rule fallback from name, original name, description, prior tags and search context. This is NOT model inference or audio analysis. Existing approved browser records are enriched on read; no new approval is manufactured. Cricket scientific names/stridulation acquire common-name search tags. SxLock uses actual categories and retains subcategory, tags and aliases. Existing hosted library categories are reused where suitable. Unknown audio stays searchable under Other sounds or its existing descriptive category.

Classification precedence: explicit owner correction, valid AI metadata receipt, then metadata fallback. Approval remains gated on the existing verified audio-save path. Search context and source description accompany future saves. Names, licenses, source metadata, audio identities and recordings are retained.

Inside an approved effect, the collapsed **Category & search tags** editor permits custom category, subcategory and tags. Changes immediately update the shared browser ledger and open library. The existing authenticated `POST /api/audio-classify` writes classification only into that sound's `asset.json`, conditional on original SHA256 and current Dropbox audio identity. It preserves bytes, approval, cloud receipts, existing placements and metadata. Offline failure keeps a locally pending correction and reports the cloud failure; reopening/focusing the library retries it. No successful cloud claim precedes the verified write. Scrubber preserves newer classification fields when writing its ledger.

## AI step — existing daily connected-account executor

The EXISTING “Mirror approved SX audio to Drive” calendar action also performs classification. This is the ChatGPT executor using connected private metadata, not a newly paid model endpoint or service. Run after processing deletion jobs and before ordinary mirroring. Backfill existing approved assets as well as new approvals. Do not pause the existing task or add a timer.

1. Read latest AUDIO_DELETE.md, AUDIO_SAVE.md and this protocol. List/paginate Dropbox `/Grill Sergeant/Sound Effects` and the deletion-intent root. Skip check-* fixtures, pending deletions, missing/invalid asset records, and non-approved records. Recheck deletion intent and original record before writing. Do not recreate a missing asset folder. Never approve candidates.
2. Read `asset.json` and existing `classification-<13-digit-ms>.json` receipts in the asset folder. Reuse matching current-version AI classifications; skip owner classifications. Keep a checkpoint of completed and remaining asset IDs if provider throttling interrupts the batch. Retry in a subsequent existing run; do not call a partial batch complete.
3. As the AI operator, interpret the name AND actual source description/provenance to assign category, subcategory, useful common-name tags and aliases. Translate scientific/foreign names when supported. A song titled “Hen” is Music, a Jet Manakin is a bird, and Saturn radio emissions are space/science recordings. Do not reuse search-query categories blindly. Prefer the existing hosted categories, but meaningful additional/custom categories are allowed. Keep the owner's chosen filename. Do not invent audible characteristics from metadata; use broad labels and record uncertainty when needed. State basis `source-metadata`, never claim listening without actual audio review.
4. Write a NEW UTF-8 `classification-<actual-13-digit-Unix-ms>.json` into that SAME existing asset folder using the connected Dropbox upload tool. No overwrite or replacement of asset.json/audio. Exact schema:

```json
{
  "schema": "SoundScrubberClassification-1",
  "assetId": "<exact stable asset ID>",
  "sha256": "<original SHA256 from verified asset.json>",
  "bytes": 123,
  "classification": {
    "schema": 1,
    "method": "ai-metadata-v1",
    "category": "Animals & nature",
    "subcategory": "Insects",
    "tags": ["cricket", "crickets", "chirping"],
    "aliases": ["Acheta domesticus"],
    "basis": "source-metadata",
    "updatedAt": "<actual UTC time>"
  }
}
```

Category: nonempty, at most 80 characters. Subcategory: at most 80. Tags/aliases: arrays of at most 40 nonempty strings, each at most 80 characters. No control characters or HTML. Do not put credentials or temporary URLs in receipts. Poll asynchronous uploads to completion and fetch/read back exact JSON before recording success.
5. Recheck deletion intent after upload. If deletion raced, leave cleanup pending for the managed deletion worker; do not recreate originals, approve, or claim classification available. Valid classification receipts are managed metadata recognized by backend deletion only with matching asset ID, SHA256 and byte count. The Drive worker includes these receipts with associated provenance and deletes matching managed copies on rejection; never delete unrelated files.
6. Mirror verified classification metadata alongside the normal existing Drive original/provenance without treating metadata preservation as an audio save. Preserve previous receipts. Record separate classification/Dropbox/Drive results.

`GET /api/audio-record` selects the newest valid hash/byte-bound AI classification receipt unless `asset.json` has an owner correction. SxLock retrieves classifications on subscribe/focus/visibility return, sequentially and with a one-minute refresh throttle. It checks current approval and identity again before merging. Owner corrections pending upload cannot be replaced by AI refresh. This is background metadata enrichment, never a timeline insertion or an audio replacement.

## Verification and limits

Automated checks cover 50 legacy cricket approvals searchable by common/scientific names, AI/owner precedence, offline correction retention, deletion races, identity-bound receipts and safe metadata cleanup. The existing review and storage regression suite remains required. Tests use deterministic DOM/storage/provider doubles; physical Android behavior and real authenticated classification POST require separate evidence. Existing library backfill can be partial under Dropbox rate limits. Same-browser catalog scope remains; this change does not implement cross-device catalog discovery.

Rollback: revert this stage's code commits. Retain valid private classification receipts and do not run older deletion code against folders containing them until equivalent metadata handling is restored. Audio, projects and approval records must not be rolled back merely to undo classification.
