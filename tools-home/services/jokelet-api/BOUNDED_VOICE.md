# Bounded AI voice jobs

This stage uses the existing GitHub/Drive production resources. No disk, new service, subscription upgrade, provider key copy or browser login is required.

## Scoped execution

The dedicated `.github/workflows/jokelet-voice.yml` has a distinct signed GitHub identity. It obtains a short-lived GitHub workflow token and passes it privately over HTTPS to our own Render service for fixed-repository receipt writes. Tokens are never persisted in source, job records, URLs or logs. The old preflight workflow identity cannot use the voice-generation route.

`POST /api/ai/voice/generate` checks the signed repository/owner/workflow/ref identity and reads the exact request from that commit. The body cannot override its script, voice, model or budget. The server requires an explicitly approved, unexpired one-request budget and duplicate review. Only the established GS voice and Eleven v3 are allowed. Approval is recorded by the AI from the user's specific authorization; repository metadata is not independent proof of consent.

Model rate, owned generated-voice category and sufficient existing quota are read before reservation. Private subscription balances/invoices are not returned or saved. The expected character cost must fit the approved ceiling. These checks are not a provider-enforced dollar cap; the provider's response header reports actual credits, or the record explicitly says unknown. No auto-purchase, plan change, retry or overage request is implemented.

GitHub atomically claims the job and canonical joke before the one provider POST. The receipt survives Render restart. A concurrent or repeated submission cannot claim it again. A completed request verifies and reuses the stored original instead of paying again. An uncertain outcome retains its claim and stops for provider reconciliation. Known produced IDs and unresolved known aliases are blocked; global archive semantic reconciliation remains incomplete.

The backend atomically saves the original MP3 and receipt, including exact script/settings, request/history IDs when returned, SHA256 and provider-reported cost. If persistence fails after bytes arrive, the authenticated workflow receives a recovery copy for its artifact. An abrupt provider/network/process failure can still leave an uncertain charged request; no exactly-once provider guarantee is claimed.

The workflow checks FFmpeg/FFprobe availability before generation, converts the preserved original to PCM16 WAV without trim/gain/speed/resampling directives, verifies its audio metadata, and checkpoints the derivative/hash/parent link. Failed WAV conversion retains the provider original. GitHub records/media are the durable stage; transfer of new generated audio to Drive is still a connector-operated step. No HeyGen call occurs here.

## Unpaid rehearsal

A `gate_rehearsal` request must be rejected for missing approval. It then obtains a read-only price/funding quote. Only after success is the real request eligible for user approval. Both calls use the signed voice workflow and make zero paid generation requests. Execution is requested by changing `tools-home/tools/jokelab/requests/voice-job.json`, one job at a time.

## Current limits

This is a per-job, one-attempt gate, not an aggregate episode/month spending controller. The legacy manual endpoint still has its previous process-only cap and is not covered by these receipts. Manual Wizard job submission, aggregate budgets, automatic Drive writeback and full video assembly remain to be connected. Do not claim the factory is finished.

The unapproved candidate is library position6, dad-01390bc83ffc16630ae3d503: farmland/grainy photos. Exact library bytes matched GitHub blob1d9dd64c99cf51233aba2d5eb6c1bc22978fa69b. No matching finished catalog/ledger entry, Drive text result or HeyGen 'grainy' title was identified; unnamed archive contents remain unverified. No familiar-joke shortcut was taken. Proposed script is108characters, one [joking] cue and no post-punchline dialogue.

Official references: https://elevenlabs.io/docs/api-reference/introduction/ (character-cost/request-id headers); https://elevenlabs.io/docs/api-reference/user/subscription/get ; https://elevenlabs.io/docs/api-reference/text-to-speech/convert .
