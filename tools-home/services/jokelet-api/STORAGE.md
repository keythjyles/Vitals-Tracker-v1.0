# Shared production storage — prepared, not activated

## Scope and status

`production-store.js` is a tested SQLite adapter for the manual and AI production modes. It is **not connected to provider generation yet**. The existing manual bearer endpoint retains its existing process-level cap; the new adapter does not silently claim to enforce that endpoint's spending. AI identity remains read-only. No paid generation, plan upgrade, disk creation, new database service or secret change was made in this implementation.

Private `GET /api/storage` and authenticated AI preflight report mount readiness and `generationLedgerIntegrated:false`. Without `JOKELET_DATA_DIR`, readiness is false. The adapter will not create a database in an ordinary unmounted directory through `openMountedStore`. A detected mount is configuration evidence, not a passed cross-deploy recovery test.

## Implemented adapter

- Immutable approved budget records specify permitted voice/models, expiry, maximum attempts, characters and reserved credit units. Price evidence is mandatory; a reservation is not an actual provider charge or a guaranteed currency cap. Actual provider charges must be reconciled before stronger financial claims.
- A transaction reserves capacity before an attempt. Independent processes cannot both take the last slot. Failed/unknown usage is not automatically refunded. Actual charges above reservations remain charged against the budget.
- A stable job ID binds the exact cued script, voice, model, voice settings and reservation. Reusing the ID returns its stored record; changing input under that ID is rejected. Submission can be claimed once only.
- Canonical IDs can be seeded as already produced. Another production run cannot claim a reserved or produced ID. Multiple authorized takes within the same budget remain possible. Seed data must be reconciled from the existing ledger; there is no automatic semantic deduplication or completed-archive import yet.
- A restart turns outstanding submitted attempts into uncertain outcomes. New jobs under that budget stop until explicit provider reconciliation; no automatic retry is implemented. Manual reconciliation tooling remains to be built.
- Original audio bytes, SHA256, provider take identity and usage are committed atomically with their job record. This adapter currently handles one original audio blob per job, up to16MiB. WAV derivatives, video, full media-library browsing and offsite export remain downstream work.
- Database-native consistent backups retain job history and original audio. Local restart and backup/restore tests pass. Automatic offsite backup is not configured; snapshots must not be treated as an application-consistent database backup.

The database uses WAL and FULL synchronous commits. Native Node SQLite compatibility covers current Node24 and26 APIs; the service engine constraint is now >=24 <27. Database files use owner-only permissions. Authentication secrets are never accepted as job settings.

## Concrete activation proposal — requires approval

Only `jokelet-api` (`srv-dbdui3vb9u1s73bir8kg`) would change:

- Upgrade its Free compute instance to Starter, advertised at $7/month.
- Attach a 1GB persistent disk, advertised at $0.25/GB/month.
- Mount at `/var/data`; merge `JOKELET_DATA_DIR=/var/data` without reading or replacing existing private secrets.
- Base estimate: $7.25/month, excluding tax, provider generations and usage beyond included limits. No workspace-plan upgrade, additional service or lex-backend change.

This is an activation proposal, not a deployed Blueprint or an accepted purchase. Source prices checked October23,2026: https://render.com/pricing . Disk constraints: https://render.com/docs/disks .

After approval, attach/configure storage using a supported Render operation, verify the exact service/disk/plan, run a restart persistence probe and database backup/restore, arrange an offsite copy, then integrate both operator modes with the same budget/job store. Generation must not be labeled ledger-protected until the actual provider routes reserve/reconcile records and preserve outputs. Numeric generation budgets require separate authorization.

A disk-backed service is single-instance and has a short interruption during deploy. Only the mounted path persists. Do not mount or store data in the unrelated root service.

## Validation

Eleven tests passed locally: OIDC identity guards, audio timing, API authentication, job restart/replay, native backup/restore with original-byte equality, canonical blocks, uncertain charge stop, budget/voice/model validation, multi-process contention and rejection of ephemeral paths. No paid provider call was used.
