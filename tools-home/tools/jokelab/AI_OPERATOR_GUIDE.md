# JokeLab — AI operator guide
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
