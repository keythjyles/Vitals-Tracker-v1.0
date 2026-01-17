/*
Vitals Tracker (Modular) — js/reporting.js
App Version: v2.001

Purpose:
- Generates succinct, reviewer-friendly export reports (Log export + Charts export).
- Enforces:
  - Method of capture disclosure (manual entry, local-only storage).
  - “What’s clinically important” section in plain language.
- Export UI must NOT use generic popup modals in v2:
  - This module provides only text + filename.
  - ui.js decides how to present/share/save (custom in-panel sheet).

Latest Update (v2.001):
- Initial modular reporting module.
- Adds explicit reviewer guidance:
  - Variability / clusters during symptoms
  - Hypertension staging relevance (systolic emphasis)
  - Advises correlation with symptoms/med timing in notes
*/

import { APP_VERSION } from "./state.js";
import { fmtDateTime } from "./utils.js";

function buildCaptureMethodBlock(){
  return [
    "How this data was captured:",
    "- Readings were entered manually into Vitals Tracker on this device.",
    "- Data is stored locally on the phone (offline-first; no account; no cloud sync).",
    "- Each record may include BP (systolic/diastolic), heart rate, symptoms, and notes."
  ].join("\n");
}

function buildReviewerNotesBlock(){
  return [
    "What may matter to a medical/claims reviewer:",
    "- Look for sustained hypertension and/or frequent spikes (especially systolic), not just single outliers.",
    "- Clusters of readings close together often reflect symptomatic episodes (e.g., panic, dyspnea, chest tightness).",
    "- Notes/symptoms can indicate timing with medications, sleep disruption, or autonomic events.",
    "- Consider trends over weeks and functional impact documented in notes."
  ].join("\n");
}

export function buildReportHeader({ title, rangeLabel, extraNotes }){
  const now = fmtDateTime(Date.now());
  const lines = [
    "Vitals Tracker — Export Report",
    `App Version: ${APP_VERSION}`,
    `Report: ${title}`,
    `Generated: ${now}`,
    rangeLabel ? `Range: ${rangeLabel}` : "",
    "",
    buildCaptureMethodBlock(),
    "",
    buildReviewerNotesBlock(),
    extraNotes ? ("\n" + extraNotes) : "",
    "",
    "------------------------------",
    ""
  ].filter(Boolean);

  return lines.join("\n");
}

function recordToTextBlock(r){
  const dt = fmtDateTime(r.ts);
  const bp = `BP ${r.sys ?? "—"}/${r.dia ?? "—"}`;
  const hr = `HR ${r.hr ?? "—"}`;
  const sym = (r.symptoms && r.symptoms.length) ? r.symptoms.join(", ") : "None";
  const notes = (r.notes && String(r.notes).trim()) ? String(r.notes).trim() : "None";

  return [
    dt,
    `${bp} • ${hr}`,
    `Symptoms: ${sym}`,
    `Notes: ${notes}`,
    ""
  ].join("\n");
}

export function makeTextReport({ title, rangeLabel, extraNotes, records, filenameBase }){
  const header = buildReportHeader({ title, rangeLabel, extraNotes });
  const blocks = (records || []).map(recordToTextBlock).join("\n");

  const out = header + blocks;

  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, "0");
  const d = String(ts.getDate()).padStart(2, "0");

  const filename = `${filenameBase || "vitals_report"}_${y}-${m}-${d}.txt`;

  return { text: out, filename };
}

/*
Vitals Tracker (Modular) — js/reporting.js (EOF)
App Version: v2.001
Notes:
- UI layer (ui.js) should present export results in a custom in-panel sheet (not generic popup).
- Charts export MUST pass only records in the visible chart window (chartView.viewMin/viewMax).
*/
