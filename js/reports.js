/*
Vitals Tracker (Modular) — js/reports.js
App Version: v2.001
Purpose:
- Generates succinct, reviewer-friendly export text for:
  1) Log Export (filtered by search/from/to)
  2) Charts Export (VISIBLE chart date range only)
- Copies to clipboard, then opens the app’s Export Modal (ui.js) with Share/Save options.
- Each report includes:
  - Method of capture
  - Why it matters clinically/for claims review (succinct, non-editorial)

Latest Update (v2.001):
- Initial reporting module; designed to avoid “generic pop-up” exports and provide claim/medical context.
*/

import { fmtDateTime } from "./utils.js";
import { openExportModal, copyToClipboard } from "./ui.js";
import { APP_VERSION } from "./state.js";

function buildHeaderLines({ title, rangeLabel, reviewerNotes }){
  const now = fmtDateTime(Date.now());
  const lines = [
    "Vitals Tracker — Export Report",
    `App Version: ${APP_VERSION}`,
    `Report: ${title}`,
    `Generated: ${now}`,
    rangeLabel ? `Range: ${rangeLabel}` : "",
    "",
    "Method of capture:",
    "- Readings were entered manually by the user into Vitals Tracker on this device.",
    "- Data is stored locally on the device (no account, no cloud sync).",
    "- Each record may include BP (systolic/diastolic), heart rate, symptoms, and notes.",
    "",
    "For medical/claims review (why this matters):",
    reviewerNotes || "- These entries provide time-stamped, contemporaneous self-reported vitals and symptom context. Evaluate trends, clustering during symptomatic episodes, and response to treatment over time.",
    "",
    "------------------------------",
    ""
  ].filter(Boolean);
  return lines.join("\n");
}

function entryBlock(r){
  const dt = fmtDateTime(r.ts);
  const bp = `BP ${r.sys ?? "—"}/${r.dia ?? "—"}`;
  const hr = `HR ${r.hr ?? "—"}`;
  const sym = (r.symptoms && r.symptoms.length) ? r.symptoms.join(", ") : "None";
  const notes = (r.notes && r.notes.trim()) ? r.notes.trim() : "None";

  return [
    dt,
    `${bp} • ${hr}`,
    `Symptoms: ${sym}`,
    `Notes: ${notes}`,
    ""
  ].join("\n");
}

function makeFilename(base){
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth()+1).padStart(2,"0");
  const d = String(ts.getDate()).padStart(2,"0");
  return `${base}_${y}-${m}-${d}.txt`;
}

async function exportText({ text, filename }){
  try{ await copyToClipboard(text); }catch{}
  openExportModal({ text, filename });
}

export function exportLogReport(recs, { search, from, to }){
  const rangeLabel = (() => {
    if(from && to) return `${from} to ${to}`;
    if(from) return `From ${from}`;
    if(to) return `Up to ${to}`;
    if(search) return `Filtered by search: "${search}"`;
    return "All log entries (with current filters applied)";
  })();

  const reviewerNotes =
    "- Use BP/HR values with associated symptoms/notes to assess severity, frequency, and functional impact.\n" +
    "- Look for episodic clustering, nocturnal events, or patterns suggesting dysautonomia, panic surges, medication effects, or sleep-disordered breathing.";

  const header = buildHeaderLines({
    title: "Log Export",
    rangeLabel,
    reviewerNotes
  });

  const body = (recs || []).map(entryBlock).join("\n");
  const out = header + body;

  exportText({
    text: out,
    filename: makeFilename("vitals_log_report")
  });
}

export function exportChartsVisibleReport(recsInVisibleRange, { viewMin, viewMax }){
  const rangeLabel = `${fmtDateTime(viewMin)} to ${fmtDateTime(viewMax)} (visible chart range)`;

  const reviewerNotes =
    "- This export contains only the readings currently visible on the Charts view.\n" +
    "- Use this to document specific symptomatic windows (e.g., clusters during crises) with exact timestamps.";

  const header = buildHeaderLines({
    title: "Charts Export (Visible Range)",
    rangeLabel,
    reviewerNotes
  });

  const body = (recsInVisibleRange || []).map(entryBlock).join("\n");
  const out = header + body;

  exportText({
    text: out,
    filename: makeFilename("vitals_charts_visible_report")
  });
}

/*
Vitals Tracker (Modular) — js/reports.js (EOF)
App Version: v2.001
Notes:
- Charts export must be passed ONLY visible-range records (viewMin/viewMax).
- Next expected file: js/chart.js (rendering + hypertension bands + range label + visible-range export wiring)
*/
