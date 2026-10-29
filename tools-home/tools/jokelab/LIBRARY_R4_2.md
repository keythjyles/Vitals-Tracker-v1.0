# JokeLab R4.2 — saved library and compact right-hand rows

Owner correction: saving a joke removes it immediately from the current display. Already-produced jokes do not belong in the discovery list. Controls stay compact at the right.

The old Keep in library action assigned the same library status that undecided rows already used, so it appeared to do nothing. The library now separates Browse (undecided), Saved library, queued production and deleted records. Save persists a saved decision before broadcasting the list update. It removes the row immediately, keeps the next row at its viewport position and recovers the saved choice after reload. Explicit historical Keep decisions appear in Saved library; undecided jokes remain in Browse. Unsave returns a saved joke to Browse. Source text, attribution, original media and old production records remain intact.

The discovery list now loads the canonical production ledger first and excludes known produced IDs and aliases. Missing ledger produces an error rather than pretending the list is safe for new production. Existing production review and archive records remain separate. Semantic duplicates not identified in the ledger are still an unresolved archive issue.

Compact styling is scoped to JokeLab: removes the promotional heading when viewing lists, reduces panel/row spacing, places four short row controls in a tight two-column group at the right and moves source/copy details into the row's collapsed Source section. The original workbench and all specialist editor source files remain unchanged except the workbench wrapper and list-intro visibility.

Persistence boundary: these library decisions use the existing browser-local production store and portable Export backup. This repair does NOT establish cross-device library decision sync or verified Drive/Dropbox backup. The separate current-production cloud overrides remain unchanged.

Build: source/scripts/build-jokelab.mjs rebuilds only assets/jokelab.js; it does not recreate index.html or touch adjacent tools. Build dependencies used: React/React DOM19.1.0 and lucide-react0.468.0 (matching existing bundle), esbuild0.28.2. Set ESBUILD_MODULE and JOKELAB_NODE_MODULES only when dependencies are outside normal resolution. Test with source/scripts/check-library-selection.mjs; four tests cover canonical/alias exclusion, Save/removal/reload, legacy Keep migration and real storage-failure behavior. Production-panel regression tests remain applicable.

Baseline/rollback: main660914b752ddc0f971dd8b03b69b4cecef3e744e. Revert only the R4.2 source/bundle/style/entry changes; retain saved decisions and production media. Deployment and actual browser acceptance require separate receipts.

R4.2.1 live inspection caught older Episode1 entries mapped only as possibleSourceMatches. These IDs and their aliases now also stay out of discovery while identity reconciliation is pending; this does not silently certify them as produced. Scarecrow/Impasta and the spaghetti alias are regression fixtures.

Live Save acceptance passed on R4.2: saved the Bison joke, observed its immediate removal, selected Saved library and found it, refreshed and found it still saved, then Unsave returned it to Browse. The temporary test choice was restored. R4.2.2 also hides produced_approved items from the default current-production panel (retained in All) and prevents the short right-hand button labels wrapping. Eleven related tests passed. No specialist editor or media file changed.

Final deployment receipt: R4.2.2 commit33649743b31957035a82d0e1f762bf56fbad2f8b; Pages40801741995 completed successfully. Fresh live browser verified R4.2.2 identity,888 discovery entries (known produced/possible-match IDs and aliases excluded), zero Scarecrow rows,84px compact row height and zero gap between the action group and row right edge. Live Save/removal/Saved-view/refresh/Unsave acceptance above passed. Physical Android acceptance and cross-device decision sync are not claimed.
