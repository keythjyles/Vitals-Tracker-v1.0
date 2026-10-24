# JokeLab — AI operator guide

## ElevenLabs API connection — authoritative update (October 23, 2026)

The prior shared-browser Google sign-in/number-matching and file-picker handoff are **legacy recovery procedures**, not the normal ElevenLabs production path. Supersede any instruction requiring the user to sign in to ElevenLabs for each AI-run job. Do not repeat the known-broken verification-screen workflow.

The dedicated Jokelet API lives at `tools-home/services/jokelet-api/` in this repository and is deployed separately from the unrelated root `server.js` as `https://jokelet-api.onrender.com`. The user verified `/health` returning `status: ok`, `elevenLabsConfigured: true`, and `generationEnabled: true`. This confirms deployment and presence of environment variables, **not** that the ElevenLabs credentials have been authenticated against ElevenLabs or that generation has succeeded.

The server stores `ELEVENLABS_API_KEY` and `JOKELET_OPERATOR_TOKEN` as private Render environment variables. Never expose them in GitHub, static client JavaScript, URLs, logs, or chat. The API currently provides:
- `GET /health` (public configuration status);
- `GET /api/voices` (operator-bearer authenticated, read-only voice discovery; committed, live deployment unverified);
- `POST /api/voice/generate` (operator-bearer authenticated, paid text-to-speech; accepts `text`, `voiceId`, optional `modelId` and `voiceSettings`, returns MP3).
The generation endpoint has input limits, no automatic retries, and a default maximum of three paid attempts **per server process**, not a durable currency budget. It is not yet an autonomous spending-control system. Do not assume an AI operator has direct HTTP access to this API simply because it is deployed; establish and verify an authorized connector/operator execution path first. Do not ask the user to manually operate ElevenLabs when a verified API operator path is available.

The operating architecture is **one shared production engine with three modes**: manual phone-friendly Jokelet Wizard, AI-operated coached, and explicitly bounded autonomous. All share the same source library, approvals, canonical-joke duplicate ledger, voice settings, media assets, production records, costs, versioned rebuild recipes, and GitHub/Drive preservation. Manual controls remain a required feature; the AI should normally execute delegated operations instead of turning the user into a button operator. Preserve stage approvals and spending restrictions according to the current user instruction. The manual wizard and direct AI connector are requirements, **not yet verified as implemented**.

Historical run-specific sign-in requirements and historical checkpoints remain as archival evidence but do not override this new connection. Continue to preserve original ElevenLabs audio, approved PCM WAV for HeyGen, voice/model metadata, timestamps, usage/cost accounting, and all downstream stages.

Version 1.1 · October 23, 2026

## Mission

Operate a specialized, reproducible joke-production system. Help develop performances that fit Grill Sergeant, preserve approved creative doctrine, and document how the system actually works. Improve the system from observed failures and user coaching. Do not substitute a convenient output for proof of the requested process.

A jokelet is the reusable product: joke performance plus its selected reaction and deliberate post-punchline hold. Publications assemble jokelets and an approved outro, with publication graphics and sound. Increasing the approved library can enable more combinations; it does not make quality, coherence or unlimited autonomous operation automatic.

JokeLab currently handles the joke library, tone/wording exploration, production decisions and Script Lab preparation. The Factory/Jokelet tools handle downstream media organization and assembly. Read the live UI and current documentation rather than treating these as a single already-implemented automatic wizard.

## Where to start

1. Read this guide and the active run log.
2. Read [Production method](../jokelets/PRODUCTION_METHOD.md), [episode proof log](../jokelets/EPISODE_PROOF_LOG.md), [reaction checkpoint](../jokelets/REACTION_PROCESSING.md) and [recovery record](../jokelets/recovery-record.json) as needed for the current stage.
3. Check for more specific instructions in the current conversation. Current user instructions override historical run modes.
4. Inspect the live app. Distinguish saved server/bundled material from browser-local work.
5. Identify the selected operating mode, authorized scope, current stage, outputs and financial limits.
6. Resume from a confirmed checkpoint. Do not restart, overwrite, approve or spend merely because a browser queue appears empty.

Private login notes are kept separately. Do not publish account identifiers, phone numbers, credentials, one-time codes or API keys in this public repository.

## Three operating modes

| Mode | Who operates | Who decides | Required behavior |
| --- | --- | --- | --- |
| Manual | User | User | App controls and explanations should support direct user operation. |
| AI-assisted / coached | AI operates the app; user coaches | Defined by the current task; user reviews each stage | Complete one stage, save the record, report evidence and decision reasons, ask for process feedback, then pause. |
| Autonomous with restrictions | AI after human startup/access | AI within explicitly delegated bounds | Follow the recipe, financial limits, approved-asset restrictions and stop conditions; log every action, result and intervention. |

These are operating requirements and requested modes, not a certification that all UI controls, budget enforcement or autonomous orchestration are implemented.

**Current run JL-20261023-COACHED-01 is AI-assisted/coached.** It supersedes the earlier request for a run without production decision points. Do not cross a stage boundary until the user has responded to that stage's coaching question.

## The checkpoint cycle

At each stage:
- State the stage and expected output.
- Record actions in actual order, including failures and retries. Keep the action record faithful; do not invent precision or pretend an inferred event was observed.
- Record input versions/settings and concise, task-relevant reasons for decisions. Record alternatives only where they affected the decision.
- Verify what actually changed in the live UI or resulting artifact.
- Save outputs and a durable checkpoint.
- Present the result, implementation gaps and one focused process question.
- Wait for the user's coaching before the next stage. Incorporate the response and record what changed.

The user coaches implementation; they should not need to operate the app except for genuine human-only access steps. Do not turn every click into a new question. Define meaningful stage outputs and stop at those boundaries.

## Default production path — October 23 clarification

**Choose an unproduced joke → prepare its spoken delivery → create voice/performance → add an approved reaction → save the jokelet → mark produced.**

The known-joke study, linguistic breakdown, tone exploration, research and independent candidate grading are an optional craft/study mode. They are valuable for learning or a specific problem; do not impose them on a user trying to produce consistent content. Ordinary production does not require rewriting every collected joke or proving its comic mechanism again.

The long-term aim is to produce the usable joke library over time, in manageable batches, and observe cost, reliability and audience response. Do not launch a whole-library paid run from that aspiration. No assumption that 900 source records means 900 distinct jokes.

Before paid production, read [PRODUCTION_LEDGER.json](PRODUCTION_LEDGER.json). Match the underlying joke as well as exact wording. Check existing outputs and aliases; reserve the selected canonical joke for the batch; record completion, failures and retries. A new reaction or wording variant is not automatically a new joke to produce. Recombining existing jokelets into episodes does not require generating those jokelets again.

The ledger is initially an operator-maintained record. UI enforcement, automatic semantic reconciliation and atomic concurrency controls have not been implemented or tested. It seeds the known catalog and all source records without claiming the full archive is reconciled. Do not label unmatched entries confirmed unproduced until that check is made. Keep paid batches small and within their explicit limits.

## Stage map

0. Startup/access and run contract: confirm mode, required services, source records, readiness and spending restrictions.
1. Inspect JokeLab library/queue and recover existing work if needed.
2. Select the initial joke/specimen and record its source, setup, hinge/payoff and intended audience/performance.
3. Optional study branch only when requested or needed: explore wording/tone using the actual JokeLab controls and generated prompt. Preserve the original.
4. If study produced candidates, evaluate independently and retain viable options. Otherwise continue from the selected usable joke to spoken-delivery preparation. Do not force a tone contest.
5. Script Lab: develop and lock the spoken performance script, delivery notes and final spoken stop.
6. ElevenLabs: generate/review the required voice performance; retain settings, job ID, attempts, bytes and costs.
7. Performance creation: use the verified GS identity and approved voice; inspect the whole render.
8. Prepare picture and reactions, applying stabilization before motion and recording trims/versions.
9. Render clean jokelets, preserving reactions and full intended holds.
10. Assemble five jokelets and approved outro for the episode; add deliberate publication elements at their documented stage.
11. Verify full exported playback, preserve projects/media/logs and check recovery before any separately authorized release.

This map is an operator guide. The live application may expose different screen names or manual handoffs; log those facts. Do not claim a stage is implemented just because it is listed here.

Stage 1 of the coached run is library/readiness inspection. Joke selection is the next stage and is deliberately not yet performed.

## Creative and asset constraints

Read the production method for the full doctrine. Key constraints:
- Comedy is performed; wording, timing and silence interact.
- Tone variants must preserve a recognizable premise and explore meaningful differences.
- Independently grade viability/function/voice/delivery/context. Do not force a ranking or one winner.
- Standard post-punchline GS is silent. Do not add tag questions or explanatory filler.
- Review visible mouth motion as well as audio silence.
- Use approved assets for ordinary production; Review is not approval.
- Preserve the whole approved reaction unless a deliberate trim is recorded.
- Keep originals, source relationships and previous approved versions.
- Clean jokelets stay separate from publication thumbnails/CTA and other publication-specific layers.
- Anticipatory listener cuts are an optional future experiment, not a silent change to the baseline.
- Education videos have a separate manuscript → chapters → main parts → teaching script → visuals workflow.

## Priming the pump and access

For ElevenLabs, the established user instruction is to hand over the live session for manual sign-in. Do not attempt an automated credential form. The user handles account/device verification and returns control; verify the actual workspace afterward. Never record challenge codes.

The shared-browser upload picker is known not to work for this user. Do not offer that same failed upload route as a solution. If file loading is needed, follow the documented user-loading arrangement and observe whether the files are actually available in the intended service/session.

Record access loss and reauthentication. An external login or another ChatGPT conversation is not proof that this browser has the same authenticated state. Follow the documented post-login recovery procedure before concluding sign-in failed.

Do not bypass voice/performance production with finished jokelets when the goal is proof of the whole pipeline. An assembly-only run can be useful, but must be labeled honestly and separately.

## Spending controls for autonomous operation

Autonomous spending requires explicit limits. Record currency, total run cap, applicable per-job/provider limits, intended paid operations, retry allowance and stop conditions. Keep estimated, reserved/committed and actual/reconciled usage distinct; do not label an estimate an actual charge.

Before a paid request, check authorization, remaining budget, provider quote or bounded estimate and any outstanding job/charge. Account for failed attempts and retries. Do not blindly repeat a request after a timeout: first determine whether the provider already accepted or charged for it.

If the financial bound cannot be established, a cap would be exceeded, or a permission is missing, stop before that request and report the concrete issue. Do not change providers, models, identities or production stages to evade the limit.

A restricted API key/provider credit quota may help enforce limits in a future backend. This repository's documentation is not an implemented spending controller. Do not store a key in public JavaScript or repository files.

For the current coached run, no numeric generation budget is set. Initial inspection/documentation incurs no provider-generation request. Set the applicable financial boundary before entering a paid stage.

## Logging specification

For each event record:
- Run ID, stage, sequence and time when available.
- Action and the visible control/tool used.
- Input IDs, text/settings/version and source relationship where relevant.
- Concise decision reason, user coaching or applicable rule.
- Observed result, evidence and output IDs/paths/hashes.
- Cost state: no paid request, estimated, committed, actual or unknown.
- Failure/retry/intervention and recovery step.
- Stage status and the next coaching question.

Log operational explanations and decisions, not hidden internal deliberation or sensitive authentication data. Use dated/versioned records and preserve corrections as corrections.

## Document implementations and suggestions

Every implementation note should identify:
1. Observed problem and concrete trigger.
2. Intended behavior and stage affected.
3. Implemented change with file/code commit or configuration version.
4. Checks actually performed and their results.
5. Remaining limits and recovery/rollback location.
6. Whether this changes the recipe, controls, data or only documentation.

Label ideas as **proposed**, changes as **implemented** only after completion, and behavior as **verified** only after observed checks. Suggestions should connect to an observed need, explain their benefit and tradeoff, and respect the current task's stage boundary. Do not silently redesign a running proof.

Maintain an append-only action history where practical. If a fact is corrected, retain the old observation and add the correction with its evidence. Keep prompt/tool versions, project exports and source/output relationships so a new operator can reconstruct the run.

## Preservation and completion

Browser-local saves are not independent backups. Export the relevant project and confirm durable copies. GitHub carries versioned public operating instructions, code and suitable bundled media; Production Drive carries production/recovery files; private access records stay private.

A larger reusable library enables a later assembly/recombination mode, distinct from a full generation proof. Record which components were reused and which stages were actually exercised. Technical completion, user approval and publication are separate states.

The active user request determines when to continue and when to pause. For this coached run, save each completed stage and ask for input before proceeding.


## Current path and source integrity correction

Follow the existing source-library order. Inspect the next canonical joke, its aliases, existing outputs and outstanding work before reserving it. Skip jokes already produced or reserved. Do not search for a familiar joke to shortcut the path. Study, tone research and variants are optional. An unresolved identity is not proof that a joke is unproduced; reconcile it before a paid request.

A finished jokelet still counts as produced even when it contains ambient sound, music, effects or burned captions, or has been rejected. Do not reset its underlying joke to unproduced because its export is unsuitable for automation. Repair/rebuild that existing jokelet as a versioned job, not a new joke. Keep old sources and outputs.

Editorial approval, automation eligibility and rebuild completeness are separate. Automatic reuse requires explicit content approval and a clean-source review: voice-only sound for spoken units, clean picture without burned captions, no pre-mixed music, ambient sound or effects. A silent reaction is allowed when reviewed as such. Unknown legacy metadata fails closed. A manually usable mixed/captioned publication can remain approved while excluded from automatic source selection.

Every production must retain a documented path to the exact cued script, ElevenLabs original voice take, provider IDs/settings, HeyGen original render, picture transforms/reaction trims, and separate original ambient/music/effect files with edit/mix settings. A finished MP4 is not a rebuild project. See [rebuild recipe contract](../jokelets/REBUILD_RECIPE.md). Missing links must be explicit, never invented. Replacing one sound, music track or video creates a new version of the same underlying joke; preserve the previous recipe and output.

Implemented in Factory: Disapprove, editable Content approval, separate automation review with mixed-source validation, and editable source-trail/rebuild-project references. Future manual-wizard manifests retain snapshots of selected source records. Existing source trails remain to be reconciled. This is not a universal recipe importer or a verified rebuild of legacy productions, and not an app-wide automatic production/duplicate guard.

## Embedded instruction locations — v3.3.0

The public JokeLab entry exposes a collapsed AI operator instruction panel. Generated handoff prompts include the same operator policy. Source: tools-home/source/app/jokelab.ts (OPERATOR_INSTRUCTIONS and buildPrompt); portable browser bundle: tools-home/assets/jokelab.js. Direct production defaults to one wording-locked Script Lab item; optional study retains the research mode. Backend instruction source imports that policy, but this update has not redeployed or exercised the private generation service. Run scripts/check-production-policy.mjs to verify shared-source/portable-prompt behavior. Do not treat a prompt instruction as an implemented canonical-identity lock or a verified source rebuild.


## Video-generation audio input — WAV required

User instruction, October 23, 2026: supply WAV, not MP3, to video-generation services. Preserve the provider original unchanged. Prefer an original WAV when available; otherwise decode the approved recording to PCM WAV without changing timing, gain, speed or content. Converting a lossy source to WAV does not restore lost quality. Record parent/source hash, conversion, WAV hash, sample rate, channels and duration. Verify that the service recognizes the uploaded asset as audio before submitting a render. Do not repeat the known MP3 upload path: in the coached run it was classified as application/octet-stream and failed; the PCM WAV was accepted. This is an operator workflow requirement; app-wide format enforcement is not implemented by this documentation change.


## Performance editor update — October 23, 2026

The dedicated operator now has categorized cues, selected-text emphasis, frame-based silence planning/PCM WAV assembly, separate take previews/downloads and device-local tested combinations. Read [performance editor implementation and limitations](../../services/jokelet-api/PERFORMANCE_EDITOR.md) before operating. Markers `[[silence:25f]]` belong to the shared engine, never the speech provider. Segmented speech incurs one paid request per speech segment; no automatic retries. Preserve every original MP3, PCM WAV and JSON job record. Browser takes and presets are not durable archives. Secure AI execution and durable budget/production storage remain unimplemented. Configuration/static-page health does not prove authenticated provider generation.

`JL-20261023-NEXT-02` (robots/guacamole) is already produced, ready for final review; do not regenerate it as a new candidate.


## Story publishing cadence — October 23, 2026

The authorized baseline is three Instagram Stories plus three Facebook Stories daily, rotating approved Dad Joke Duty D1/D2/D3 content. The October23–29 queue is verified: 21 combined records /42 placements. See [publishing execution record](runs/JL-20261023-STORIES-01.json) for source hashes, performance evidence, dates, UUIDs and planner URLs. Existing Reels and internal drafts were left unchanged. This is a finite seven-day queue; never imply indefinite replenishment is running.

Use the connected Metricool create/update operations. Read/analytics success is not write success; saved autoPublish=true/draft=false is scheduled, not published. Verify provider status. Earlier safety-check rejection was not reproduced in this Work session and its root cause remains unknown. Do not broaden permissions or use review tools/browser as a safety bypass. Review tools are only for an actual user-requested review workflow. When updating, preserve all applicable original fields; the GET response injects twitterData even without Twitter as a provider, and the write validator rejects that extraneous field. Normalize only that unsupported default when Twitter is not selected.

Repost approved immutable publications with their original soundtrack/captions; automatic clean-source assembly eligibility is a separate matter. Do not publish a staging draft or Review reaction. Match approved source bytes and direct media URLs, not social-page URLs. Performance weights are evidence, not guarantees. Keep publication graphics separate from new clean jokelet masters.

Upcoming user goals: next Dad Joke Duty episode October24, another October26, VA video October28. Integrate only once completed and approved. Update existing future Story slots deliberately, preserving the three-per-network daily total, canonical source trail and existing Reels; do not stack duplicate slots or manufacture the unfinished content as a publishing shortcut.


## Existing-storage proof — current path

User instruction: GitHub and Drive first; no new recurring infrastructure charge is approved. GitHub durable job save and separate-runner recovery have now passed. See runs/JL-20261023-GITSTORE-01.json and ../../services/jokelet-api/GITHUB_STORE.md. A real read-only job verified an approved unchanged source MP4 and saved its ElevenLabs voice-discovery result in GitHub; the next runner restored that result with zero provider calls. Existing Drive source references are preserved, not newly revalidated by this test.

Use a stable job ID and one request at a time. Completed replay must verify saved hashes and must not call the provider again. Changed input under the same ID, altered/missing results or unfinished provider outcomes must stop for reconciliation. The current workflow deliberately rejects paid requests. Paid budget reservation and Manual Wizard submission still need integration; do not claim a completed factory or an active currency cap. Do not revive the unapproved Render disk proposal as a prerequisite.


## Bounded voice execution — current engineering status

Read ../../services/jokelet-api/BOUNDED_VOICE.md and runs/JL-20261023-VOICE-WIRING-01.json. The distinct signed jokelet-voice workflow now has a GitHub-backed one-attempt route, pricing/quota preflight, atomic canonical/job claim, original MP3 preservation and PCM WAV conversion code. Existing preflight identity still cannot invoke it. The legacy manual endpoint is not yet integrated with this ledger; do not imply global spending protection.

Live gate run40049155845 passed: unapproved generation returned403 approval_required, and a read-only funding quote returned108expected credits for108characters under a proposed150-credit ceiling. No paid TTS was made. Actual TTS permission/audio/WAV preservation still await a bounded paid test. Current next source is library position6 farmland/grainy, in runs/JL-20261023-NEXT-03.json. Its proposed credit cap is not approved; earlier joke budgets do not carry forward. Do not generate robots or pebble again. No new disk, subscription or paid infrastructure is authorized.


## Publication stage correction — October 23, 2026

Clean jokelets are production assets, even when their performance and reaction are Approved or automation-eligible. Never schedule them directly. Complete the publication stage: continuous ambient, deliberate effects where intended, captions/graphics, final export and full playback review. Content approval and clean-source automation eligibility do not establish release readiness.

Finished individual jokes cut from completed episodes are finished releases. Preserve their mixed soundtrack, captions and reactions. Keep them in Finished releases, separate from clean jokelet assembly inputs. They may be reposted unchanged under the user's publishing authorization; a clean-source Blocked label does not block reposting a finished release. Do not strip layers or recreate a finished cut to reuse it.

For the current posting repair, replace the unfinished media in existing Story slots with verified media from prior published posts; retain automatic publishing. Do not halt the schedule as a substitute for replacing the media. Read tools-home/tools/jokelets/PUBLISHING_REPAIR_20261023.json for the verified source post IDs and media mapping. Future new releases need an explicit release record tied to the exact export; unknown readiness is not approval.


## Verified voice checkpoint — October 24, 2026

First bounded ElevenLabs API voice generation succeeded in workflow40050049943. Run JL-20261023-NEXT-03, canonical dad-01390bc83ffc16630ae3d503, job JL-20261023-FARMLAND-VOICE-01: one provider request,48 provider-reported credits under150 approved existing credits, zero retries. Original MP3 and5.12-second44.1kHz mono PCM16 WAV are preserved in GitHub and Production Drive. Receipt: voice-jobs/JL-20261023-FARMLAND-VOICE-01.json. Hashes verified locally; Drive metadata byte sizes match, checksums were not returned. User listening approval remains pending; no AI auditory verification is claimed. No HeyGen spend is authorized yet. Resume from this recording; do not generate it again. Earlier awaiting-authorization/no-TTS notes are historical and superseded by this checkpoint.

The first runner40049788128 failed before any paid request because Ubuntu26.04 lacked audio tools. Workflow now pins Ubuntu24.04 and verifies/installs ffmpeg/ffprobe before paid execution. This was infrastructure recovery, not a paid retry. Existing GitHub/Drive path remains in use; no paid Render upgrade. Per-job controls are proven for this take; aggregate budgets and legacy manual endpoint integration remain unfinished.


## Voice quality hold — October 24, 2026 (supersedes prior readiness claims)

User rejected farmland take JL-20261023-FARMLAND-VOICE-01 as distorted. Preserve originals and48-credit cost; do not animate, assemble, publish or automatically regenerate it. Canonical reservation remains. Read runs/JL-20261024-VOICE-PROCEDURE-AUDIT.json. The saved successful pebble procedure records Eleven v4, GS voice RBNpu6jPzAoaxZKl9noJ, stability0.5/similarity0.75,192kbps MP3 and deadpan/long-pause cues. The new API route instead hardcodes eleven_v3 and128kbps and used [joking]. Matching voice name/ID and passing auth/cost/storage tests did not establish performance parity. These are confirmed procedural differences, not an isolated acoustic root cause. Archived WAV samples exactly match decoding of the provider MP3, so the WAV step added no further sample processing.

Before another paid attempt, recover/verify the approved take's provider model/settings and current API support, bind the effective request to that versioned procedure, and make any difference explicit. The recorded eleven_v4 identifier has not been independently checked against generation-history metadata/current API availability in this audit. Never silently substitute v3 or another available model. Existing one-request authorization has been consumed. Replacement needs its own bounded approval; HeyGen remains unauthorized. Manual/Wizard parity and API voice quality are unproven. This update records an operator hold; backend enforcement code has not changed.


## Verified GS voice procedure — October24 current checkpoint

Recovered approved pebble generation pqILh6dY0D1CO7Ckhplb directly through ElevenLabs history. Its dialogue entry confirms GS voice RBNpu6jPzAoaxZKl9noJ and the exact approved deadpan/long-pause script. Provider model is eleven_v4, output mp3_44100_192, effective recorded settings {stability:0.5}; v4 is available for TTS. Top-level voice/text are null because the history uses dialogue entries. Prior UI similarity0.75 is not an effective setting returned by this v4 history; do not invent a similarity override. Versioned procedure: performance-presets/GS-JOKES-V4-APPROVED-01.json. Proof: results/JL-20261024-REFERENCE-03.json.

Corrected backend is deployed live at commit c850f76359bac70614c6f35c2be918e0f865ae82. It refuses new v3/128kbps requests and checks requested model, output format, voice and exact settings against the pinned approved reference before spending. Rejected-take correction preserves the canonical reservation and requires a completed Rejected predecessor of the same joke; approved/uncertain/other-owner jobs cannot be replaced this way. Historical completed v3 originals remain recoverable without new provider calls. Eighteen relevant tests passed.

Live gate workflow40100663693 passed: missing approval rejected403; read-only quote verified procedure and133 expected credits under a proposed150-credit ceiling. Zero paid requests. Current proposal JL-20261024-FARMLAND-VOICE-02 is UNAPPROVED, mode gate_rehearsal; it cannot generate. Prior48-credit request was consumed and rejected. Present one exact replacement request/cap for current user approval before switching to generate, use fresh expiry, and do not retry. HeyGen remains unauthorized. Full verified3.6s/90-frame silent side-glance reaction is prepared; use approved PCM WAV for GS4, stabilize before assembly, preserve originals and do not publish a clean jokelet as a finished release. Next: generate the approved replacement once authorization arrives, review the voice, then continue the saved assembly plan. Do not repeat this engineering work or manual login.


## Farmland jokelet completed — October24

JL-20261023-NEXT-03 is produced_ready_for_review, output farmland-grainy v02. Completed clean jokelet:10.16s,254frames,25fps1080x1920, full3.6s/90-frame approved silent side-glance reaction. Corrected Eleven v4 take WwqA33ZDoHL6XPiRBSDk cost59credits; rejected earlier voice cost48credits, cumulative107. One GS4 AvatarIV render3ff1166a9548ae37d961b650e6723042; observed account balance delta3HeyGen credits, not an itemized provider receipt. No retries or purchases. Max1pixel background correction each axis; stabilized before assembly. Whole-file decode and frame/silence checks passed; no AI auditory approval is claimed. Await user review of the actual completed jokelet, not another generation proposal.

Final MP4, original voice and PCM WAV are saved in GitHub; originals/render/final/recipe are in Production Drive; final is also saved for user playback. Exact recipe: runs/JL-20261024-FARMLAND-recipe-v02.json. GitHub media proof: results/JL-20261024-FARMLAND-STORE-01.json. Catalog entry is Ready/Review, clean-jokelet, publication.ready=false. Do not schedule it directly. No ambient/music/effects/captions/outro were baked into this reusable source. Prior hold/awaiting-approval notes are historical for the rejected attempt and preflight; do not restart production from them.

The user reaffirmed 'I asked for a jokelet' after the quoted one-take ceiling. That instruction delegated completion of this one jokelet; the operator proceeded through the bounded replacement and one animation. Do not substitute another permission proposal for a clearly delegated concrete outcome within presented bounds. This does not authorize future paid batches, retries, regeneration or publication. Preserve the current final and wait for feedback. Manual Wizard completion and aggregate budget controls remain unfinished.


## Mirroring rule — user clarification October24

Only reaction videos may be mirrored. Keep speaking joke performances unchanged to avoid reversing GS lettering. Inspect a selected reaction for visible text before horizontal mirroring; retain its original and record hflip in the rebuild recipe. Mirroring a reaction creates a derivative of the same source, not a new joke or paid render.


## Bookmark jokelet completed — October24

Run JL-20261024-NEXT-04, canonical dad-01e2b3b699efb51afa7d744a, source position8 is produced_ready_for_review. Position7 has an incomplete emoji punchline and remains an editorial hold, not a paid production. Final bookmark-brian v01 is10.36s/259frames/25fps1080x1920. Saved one v4/192kbps voice take X4Y2MYtNCzdXrPkSIVYG (59credits), one GS4 render d1ffb82407eed94a76cf8e742b3f597a (observed HeyGen balance delta3, not itemized), and full3s/75-frame mirrored approved skeptical reaction. No retries or purchases. Speaking footage is not mirrored; GS lettering stays readable. Mirror-only-reactions is the user's explicit rule and is recorded in the recipe.

Final, sources and rebuild trail are saved. Recipe: runs/JL-20261024-BOOKMARK-recipe-v01.json. Media proof: results/JL-20261024-BOOKMARK-STORE-01.json. Final path: tools-home/tools/jokelets/media/GS_Jokelet_Bookmark_Brian_v01.mp4. Whole-file decode, frame/duration and silent-ending checks passed. No AI auditory approval is claimed; final user review pending. Catalog Ready/Review, publication.ready=false: this is a clean jokelet, not a finished release. Do not schedule it directly. Previous farmland output remains preserved; never regenerate either as a new joke.

Supply a working direct MP4 download link with the completed artifact. Resume from saved files, not another generation. Next source position9 needs its own current selection/duplicate check; this one-jokelet request does not authorize an automatic batch.
