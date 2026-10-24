# AI Operator identity — read-only first stage

The AI can commit the preflight request at `tools-home/tools/jokelab/requests/voice-preflight.json` through the connected GitHub service. A dedicated main-branch push workflow obtains a short-lived GitHub OIDC identity and calls `GET /api/ai/preflight`. Neither the ElevenLabs key nor operator token is copied to GitHub, the AI context, public JavaScript or job results.

The server verifies RS256 signature against GitHub's pinned issuer/key URL, exact audience, immutable repository/owner IDs, main branch, exact workflow path, push event, GitHub-hosted runner, current workflow/commit SHA and short validity window. Pull-request/fork identities fail closed. This trust grants **read-only voice discovery only**, never paid generation. The existing bearer-protected generation route remains separate. Request logs never include Authorization or token claims. OIDC identities may be reused within their short validity for read-only preflight; no paid replay privilege exists.

Trigger only the request file after the service code is live. No credential setup, provider generation, automatic retry or manual browser login is needed. A failed run preserves a sanitized error report. Successful reports retain selected GS voice metadata, authenticated lookup status, source commit and workflow run identity; provider billing balance is not inferred. Artifacts expire after 30 days, so checkpoint the sanitized result in the production repository after inspecting it.

An authenticated voice-list response proves API authentication and that endpoint's permission only. It does not prove TTS permission, a successful paid take, sufficient balance or video production.

## Remaining paid execution requirements

The service remains on Render's free plan/ephemeral filesystem. Do not call a local file a durable spending ledger. Choose persistent storage with the user before introducing paid infrastructure. Before granting AI generation, implement atomic budget reservation, idempotent job IDs, duplicate/canonical checks, cost reconciliation, storage of original bytes, no blind timeout retries and approval policy. The manual and AI modes must use the same records and spending controller. Do not expose an unauthenticated paid trigger to work around missing credentials.

## Verification

Six local tests pass: signature/identity trust checks, expiry/fork/workflow rejection, cue/marker planning, exact PCM silence/WAV encoding and protected HTTP routes. Live OIDC/provider verification is recorded separately after execution. No paid generation was made while building this stage.

References: https://docs.github.com/en/actions/reference/security/oidc ; https://github.com/actions/upload-artifact .
