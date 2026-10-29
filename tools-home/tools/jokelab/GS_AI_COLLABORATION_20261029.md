# GS AI Collaboration — 2026-10-29 handoff

## Goal
Produce standalone, publishable **10-second Grill Sergeant jokelets**, not elaborate episodes. Singles first; collections later. Test Gemini video generation using an **existing approved ElevenLabs audio recording**, approved GS pose/reference image and joke concept. Explore personalized nonverbal reactions, including a goat. Keep GS recognizable while allowing performances from stone-faced deadpan to expressive and theatrical comedy. Settings and reaction characters should suit the joke. Preserve post-punchline silence, with ambient sound and nonverbal comedy.

## Two-AI collaboration
ChatGPT and Gemini independently propose treatments, exchange critiques, agree on a plan before execution, then inspect results and jointly resolve issues. Both hold the other to established GS rules, challenge unsupported assumptions, identify violations and preserve disagreements for owner decision. Neither may approve its own exception. Record verbatim proposals, objections, agreement, implementation, failures, revisions and costs. The owner retains final creative approval.

## Gemini Skills
Explore Gemini's new reusable Skills system, which the owner says replaces Gems. Develop portable versioned guidance for GS character/likeness, performance/setting/reaction, and jokelet production. Verify Skills availability and API compatibility; do not assume Skills in the Gemini app are automatically active in API requests. Store the source instructions in the repository and explicitly pass them when needed.

## Creative and editing rules
Aim for 9:16 at 25 fps; conform source output if necessary. Gemini may attempt the complete jokelet, including video, individualized reaction and captions. The component pipeline remains available if necessary. Captions should preferably be independent, transparent and editable CapLock layers. Do not require a perfect first pass: allow adjustment or **surgical regeneration** down to a letter, word, animation, frame range or reaction while preserving everything else. Never silently overwrite approved work, original audio, reference imagery or finished media. No publication without finished sound, captions and approval.

## Verified state versus remaining work
Gemini credentials/model access were verified previously on gs-previewlock-api in Render. GEMINI_ENABLED=false, so generation is disabled. GitHub commits 2a3190d98ed2b5119e7f3db6e318e1b32d4afb54 and 4644a2a7e82f0a506c0c25c71fe97668225ff38c add and route an authenticated per-production Gemini text-conversation endpoint with Dropbox transcript persistence. Render deploy dep-dbhdq0940j4s73fabhpg reports live. **No authenticated conversation round trip, actual ChatGPT-to-Gemini exchange, video generation, Skill loading, or UI handback has been verified.** No new video-generation spend is authorized. Existing API bridge is text-only and not yet a complete collaborative agent.

## Next steps
1. Verify Gemini video model availability, pricing, 10-second portrait output, image conditioning, external-audio ingestion/lip-sync, and caption options. Do not presume support.
2. Select one existing joke with approved audio and matching GS pose from production ledger and storage; document canonical ID, source paths and hashes.
3. Version GS character/performance/production Skills. Test Gemini's ability to apply them, including explicit API prompt injection when necessary.
4. Finish authenticated chat invocation, persistence, UI, and recovery; test actual independent proposals, mutual critique and documented agreement.
5. Obtain bounded approval before any billable video test. Produce one candidate; compare against agreed plan and approved reference.
6. Refine only deficient components, preserve original and variants, and present inline for owner review.
7. Update this handoff and production ledger with receipts, outcomes, costs and next actions.

## Read alongside
RESUME_JOKELET_ENGINE.md; SINGLES_FIRST.md; GS_GEMINI_PRODUCTION_DIRECTION.md; GS_CHARACTER_REGISTRY.json; PRODUCTION_HANDOFF_CONTRACT.json; CURRENT_PRODUCTIONS_R4.md; LIBRARY_R4_2.md; AGENTS.md.

Never repeat Gemini sign-in or recreate paid assets. Preserve existing scheduled posts and approved masters. Distinguish proposed, committed, deployed, tested and approved.
