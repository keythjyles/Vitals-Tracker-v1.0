# JokeLab production flow · 2026-10-21

Entry: select a library joke or write a specimen. Preserve originals and research.

1. Run research and GS tone treatments inside the connected private JokeLab. Generated variants enter the library automatically. The original may remain unchanged. Do not force a winner or a claim that a joke is funny.
2. Keep in library retains the version without production. Save for production approves that exact wording and queues a Script Lab job. Delete removes it from the working library after confirmation; source/research archives remain, and refresh must not resurrect it.
3. Script Lab generates performance cues around approved wording. Human edits and approves the script. Any subsequent edit removes approval.
4. Approved script enters the audio queue. Audio generation and rendered-audio approval must precede avatar/video generation. This upgrade does not implement ElevenLabs or HeyGen render submission, or schedule publication. Saving never starts a paid render.

Queue jobs preserve wording, source identity, settings, notes, script, creation time and approval. Repeated Save does not duplicate or reorder an existing exact version. Different wording creates a separate production version.

Research records preserve source, candidates, report, sources and usage; the private server also archives the request and full provider response. AI runs are explicit, bounded to five candidates, and use idempotent request IDs to avoid a repeated paid call on retry. No automatic regeneration or billing retry.

GitHub Pages is the portable browser workspace. It has no server key. “Run in connected JokeLab” transfers a specimen in the URL fragment to the existing private Site; queued jobs include the exact script and approval. The private Site uses same-origin authenticated server routes. API credentials are secret runtime configuration, never in GitHub or client bundles.

Decisions, scripts, approvals and research autosave locally. The connected workspace also backs up production state to its existing private database. Export project & research and Save / share library provide portable JSON backups for Drive; Import project merges records and respects newer decisions. Source collections remain in IndexedDB. Different origins have separate browser storage; transfer or import a backup when changing workspaces.

API status verified 2026-10-21: key creation succeeded. Live Responses API probe returned HTTP 429 / billing_not_active. API billing must be activated before generation can succeed. A ChatGPT response can still be imported for review and production decisions.

Validation: client bundle, private production build, TypeScript checks; DOM flows for queue order, duplicate Save, script approval/revocation, deletion/restore, research archive, returned variants and API failure preservation. Browser/phone visual QA remains outstanding.
