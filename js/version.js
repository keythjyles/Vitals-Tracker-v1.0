/*
Vitals Tracker (Modular) — js/version.js
App Version: v2.001
Purpose:
- Single source of truth for app versioning metadata used across UI and exports.
- Prevents version drift between footer labels, export headers, and internal constants.
- Provides a simple, centralized change log string for reports.

Latest Update (v2.001):
- Initial v2 version scaffold created.
- Defines VERSION constants and helper for composing the standard “method of capture” block used in all exports.
*/

export const APP_VERSION = "v2.001";

/* Human-facing build notes for this version (keep succinct). */
export const BUILD_NOTES = [
  "Modular v2 baseline created from v1.19B44 look/feel.",
  "No change to storage key to preserve existing data.",
  "Chart work (horizontal pan/zoom + hypertension bands) implemented in v2.001."
];

/* Standard, consistent “method of capture” section for all exports */
export function captureMethodBlock(){
  return [
    "How this data was captured:",
    "- Readings are entered manually into Vitals Tracker on this device.",
    "- Data is stored locally on the phone (no cloud sync, no account).",
    "- Each record may include BP (systolic/diastolic), Heart Rate, Symptoms, and Notes."
  ].join("\n");
}

/* Standard reviewer guidance (succinct; appended to every report) */
export function reviewerNotesBlock(context){
  const base = [
    "What may matter to a medical / claim reviewer:",
    "- This is contemporaneous self-tracking; each entry is timestamped at save time on the device.",
    "- Patterns (clusters during symptoms, sustained elevation, response to meds/rest) are often more informative than single readings.",
    "- Export scope is explicitly stated (Log filters or the visible Charts date range)."
  ];

  if(context){
    base.push(`- Context: ${String(context)}`);
  }
  return base.join("\n");
}

/*
Vitals Tracker (Modular) — js/version.js (EOF)
App Version: v2.001
Notes:
- Keep APP_VERSION updated every edit (v2.002, v2.003, ...).
- BUILD_NOTES should mention ONLY what changed in that version.
- Next expected file: js/storage.js
*/
