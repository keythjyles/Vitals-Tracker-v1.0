/*
Vitals Tracker (Modular) — js/export.js
App Version: v2.001
Purpose:
- Generate exports that are:
  - Succinct but reviewer-oriented (medical/claims).
  - Include method of capture and what matters clinically.
- Charts Export:
  - Exports ONLY the currently visible chart date range (chartView.viewMin..viewMax).
- Log Export:
  - Exports current Log filters (search/from/to), unchanged behavior intent from v1.
- PDF Export:
  - Provide an in-app, non-generic UI flow (handled by UI module):
    - Render a print-ready HTML report in a dedicated overlay panel and invoke window.print().
    - This uses the browser print pipeline (which can save as PDF) but avoids generic popup “pick export type” modals.
    - No external libraries.

Latest Update (v2.001):
- Initial modular exporter created.
- Adds reviewer-focused header sections for both text and print/PDF output.
*/

import { APP_VERSION } from "./state.js";
import { loadRecords } from "./storage.js";
import { chartView } from "./state.js";
import { fmtDateTime, fmtShortDate, escapeHtml, clampEndOfDay, parseDateField } from "./utils.js";

/* ----------------------------- Shared header ----------------------------- */

function buildReviewerHeader({ title, rangeLabel, contextLines }){
  const now = fmtDateTime(Date.now());
  const lines = [
    "Vitals Tracker — Export Report",
    `App Version: ${APP_VERSION}`,
    `Report: ${title}`,
    `Generated: ${now}`,
    rangeLabel ? `Range: ${rangeLabel}` : "",
    "",
    "Method of capture:",
    "- Readings are entered manually by the patient/caregiver at the time of measurement.",
    "- Data is stored locally on this device (offline-first; no account; no cloud sync).",
    "- Each record may include BP (systolic/diastolic), Heart Rate, symptoms, and notes.",
    "",
    "Reviewer notes (what matters):",
    ...(contextLines && contextLines.length ? contextLines : [
      "- Look for clusters of abnormal BP/HR with symptoms (panic, sweating, chest tightness, dizziness, short breath).",
      "- Note variability and spikes, and whether symptoms track with peaks.",
      "- Compare stability periods vs crisis periods; time clustering can be clinically meaningful."
    ]),
    "",
    "------------------------------",
    ""
  ].filter(Boolean);

  return lines.join("\n");
}

function normalizeText(s){
  return String(s ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function recordToTextBlock(r){
  const dt = fmtDateTime(r.ts);
  const bp = `BP ${r.sys ?? "—"}/${r.dia ?? "—"}`;
  const hr = `HR ${r.hr ?? "—"}`;
  const sym = (r.symptoms && r.symptoms.length) ? r.symptoms.join(", ") : "None";
  const notes = (r.notes && String(r.notes).trim()) ? String(r.notes).trim() : "None";
  return `${dt}\n${bp} • ${hr}\nSymptoms: ${sym}\nNotes: ${notes}\n`;
}

function filenameStamp(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

/* ----------------------------- Clipboard + file ----------------------------- */

export async function copyToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

export function downloadText(text, filename){
  const blob = new Blob([text], { type:"text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function saveTextWithPicker(text, suggestedName){
  const canPick = typeof window.showSaveFilePicker === "function";
  if(!canPick) return false;

  const opts = {
    suggestedName: suggestedName || "vitals_report.txt",
    types: [{ description:"Text", accept:{ "text/plain": [".txt"] } }]
  };

  const handle = await window.showSaveFilePicker(opts);
  const writable = await handle.createWritable();
  await writable.write(new Blob([text], { type:"text/plain;charset=utf-8" }));
  await writable.close();
  return true;
}

/* ----------------------------- Log export (filtered) ----------------------------- */

function recordMatches(rec, q){
  if(!q) return true;
  const s = q.toLowerCase().trim();
  if(!s) return true;

  const bp = `${rec.sys ?? ""}/${rec.dia ?? ""}`.toLowerCase();
  const hr = `${rec.hr ?? ""}`.toLowerCase();
  const notes = (rec.notes || "").toLowerCase();
  const sym = (rec.symptoms || []).join(", ").toLowerCase();
  const dt = fmtDateTime(rec.ts).toLowerCase();

  return bp.includes(s) || hr.includes(s) || notes.includes(s) || sym.includes(s) || dt.includes(s);
}

function filteredLogRecords({ searchValue, fromDateValue, toDateValue }){
  const recs = loadRecords();

  const q = String(searchValue || "").trim();

  const fromTs = parseDateField(fromDateValue || "");
  const toMid  = parseDateField(toDateValue || "");
  const toTs   = toMid != null ? clampEndOfDay(toMid) : null;

  return recs.filter(r => {
    if(fromTs != null && r.ts < fromTs) return false;
    if(toTs != null && r.ts > toTs) return false;
    return recordMatches(r, q);
  });
}

export function buildLogExportText({ searchValue, fromDateValue, toDateValue }){
  const recs = filteredLogRecords({ searchValue, fromDateValue, toDateValue });

  const rangeLabel = (() => {
    const f = String(fromDateValue || "");
    const t = String(toDateValue || "");
    if(f && t) return `${f} to ${t}`;
    if(f) return `From ${f}`;
    if(t) return `Up to ${t}`;
    return "All log entries (filtered by search/date if set)";
  })();

  const header = buildReviewerHeader({
    title: "Log Export",
    rangeLabel,
    contextLines: [
      "- This export reflects the Log screen filters (Search + optional From/To dates).",
      "- If symptoms/notes co-occur with out-of-range vitals, the pairing supports clinical severity and functional impact.",
      "- Time-stamped clusters may reflect episodic dysautonomia/anxiety/OSA-related events depending on clinical context."
    ]
  });

  const body = recs.map(recordToTextBlock).join("\n");
  const out = header + body;

  return {
    text: out,
    filename: `vitals_log_report_${filenameStamp()}.txt`,
    count: recs.length
  };
}

/* ----------------------------- Charts export (VISIBLE RANGE ONLY) ----------------------------- */

export function recordsInVisibleChartRange(){
  const all = loadRecords().slice().reverse(); // oldest->newest
  const a = chartView.viewMin;
  const b = chartView.viewMax;
  return all.filter(r => r.ts >= a && r.ts <= b);
}

export function buildChartsExportText(){
  const recs = recordsInVisibleChartRange();
  const rangeLabel = `${fmtDateTime(chartView.viewMin)} to ${fmtDateTime(chartView.viewMax)}`;

  const header = buildReviewerHeader({
    title: "Charts Export (Visible Range)",
    rangeLabel,
    contextLines: [
      "- This export includes ONLY the readings visible in the chart window at export time (after zoom/pan).",
      "- Clustering of readings can indicate symptom-driven measurement during episodes (clinically relevant).",
      "- Compare systolic/diastolic/HR trajectories with symptoms and notes for correlation."
    ]
  });

  const body = recs.map(recordToTextBlock).join("\n");
  const out = header + body;

  return {
    text: out,
    filename: `vitals_charts_report_${filenameStamp()}.txt`,
    count: recs.length
  };
}

/* ----------------------------- Print/PDF (no generic popups) -----------------------------
   Approach:
   - Build a clean HTML report string and insert into a dedicated print container.
   - UI module controls showing the print panel and calling window.print().
   - The user can "Save as PDF" from the print destination dialog; we avoid internal generic export choice popups.
*/

function recordToHtmlBlock(r){
  const dt = escapeHtml(fmtDateTime(r.ts));
  const bp = escapeHtml(`BP ${r.sys ?? "—"}/${r.dia ?? "—"}`);
  const hr = escapeHtml(`HR ${r.hr ?? "—"}`);
  const sym = escapeHtml((r.symptoms && r.symptoms.length) ? r.symptoms.join(", ") : "None");
  const notes = escapeHtml((r.notes && String(r.notes).trim()) ? String(r.notes).trim() : "None");

  return `
    <div class="r">
      <div class="dt">${dt}</div>
      <div class="v">${bp} <span class="dot">•</span> ${hr}</div>
      <div class="m"><b>Symptoms:</b> ${sym}</div>
      <div class="m"><b>Notes:</b> ${notes}</div>
    </div>
  `;
}

export function buildPrintableHtml({ title, rangeLabel, reviewerBullets, records }){
  const now = escapeHtml(fmtDateTime(Date.now()));

  const bullets = (reviewerBullets && reviewerBullets.length)
    ? reviewerBullets
    : [
        "Look for clusters of abnormal BP/HR with symptoms (panic, sweating, chest tightness, dizziness, short breath).",
        "Note variability and spikes, and whether symptoms track with peaks.",
        "Compare stability periods vs crisis periods; time clustering can be clinically meaningful."
      ];

  const bulletHtml = bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("");

  const recHtml = (records || []).map(recordToHtmlBlock).join("");

  // Inline print styles (kept inside report so it is self-contained)
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Vitals Tracker</title>
  <style>
    :root{ --text:#0b1324; --muted:#334; --rule:#d7dbe3; }
    body{ margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:var(--text); }
    .page{ padding: 22px 22px 28px; max-width: 900px; margin: 0 auto; }
    .h1{ font-size: 22px; font-weight: 900; letter-spacing:.2px; margin: 0 0 6px; }
    .meta{ font-size: 12px; color: var(--muted); line-height: 1.35; }
    hr{ border:0; border-top:1px solid var(--rule); margin: 14px 0; }
    .secTitle{ font-size: 13px; font-weight: 850; margin: 12px 0 6px; }
    ul{ margin: 6px 0 0 18px; padding:0; }
    li{ margin: 4px 0; }
    .r{ padding: 10px 0; border-bottom: 1px solid var(--rule); break-inside: avoid; page-break-inside: avoid; }
    .dt{ font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    .v{ font-size: 14px; font-weight: 800; margin-bottom: 4px; }
    .m{ font-size: 13px; color: #222; line-height: 1.25; margin: 2px 0; }
    .dot{ padding: 0 6px; color: #777; }
    @media print{
      .page{ padding: 0; }
      .r{ border-color: #bbb; }
      a{ color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="h1">Vitals Tracker — ${escapeHtml(title)}</div>
    <div class="meta">
      <div><b>App Version:</b> ${escapeHtml(APP_VERSION)}</div>
      <div><b>Generated:</b> ${now}</div>
      <div><b>Range:</b> ${escapeHtml(rangeLabel || "")}</div>
    </div>

    <hr />

    <div class="secTitle">Method of capture</div>
    <div class="meta">
      - Readings are entered manually by the patient/caregiver at the time of measurement.<br/>
      - Data is stored locally on this device (offline-first; no account; no cloud sync).<br/>
      - Each record may include BP (systolic/diastolic), Heart Rate, symptoms, and notes.
    </div>

    <div class="secTitle">Reviewer notes (what matters)</div>
    <ul class="meta">${bulletHtml}</ul>

    <hr />

    <div class="secTitle">Entries</div>
    ${recHtml || `<div class="meta">No records in this export range.</div>`}
  </div>
</body>
</html>
  `.trim();
}

export function buildChartsPrintableHtml(){
  const recs = recordsInVisibleChartRange();
  const rangeLabel = `${fmtDateTime(chartView.viewMin)} to ${fmtDateTime(chartView.viewMax)}`;

  return buildPrintableHtml({
    title: "Charts Export (Visible Range)",
    rangeLabel,
    reviewerBullets: [
      "This report includes ONLY the readings visible in the chart window at export time (after zoom/pan).",
      "Clusters of entries often indicate symptom-driven measurement during episodes (clinically relevant).",
      "Compare systolic/diastolic/HR with symptoms/notes for correlation and functional impact."
    ],
    records: recs
  });
}

export function buildLogPrintableHtml({ searchValue, fromDateValue, toDateValue }){
  const recs = filteredLogRecords({ searchValue, fromDateValue, toDateValue });

  const rangeLabel = (() => {
    const f = String(fromDateValue || "");
    const t = String(toDateValue || "");
    if(f && t) return `${f} to ${t}`;
    if(f) return `From ${f}`;
    if(t) return `Up to ${t}`;
    return "All log entries (filtered by search/date if set)";
  })();

  return buildPrintableHtml({
    title: "Log Export",
    rangeLabel,
    reviewerBullets: [
      "This report reflects the Log screen filters (Search + optional From/To dates).",
      "Symptom/notes + objective readings support severity and day-to-day functional impact.",
      "Time-stamped clusters may be clinically meaningful depending on context (sleep disruption, anxiety/dysautonomia, medication timing)."
    ],
    records: recs
  });
}

/*
Vitals Tracker (Modular) — js/export.js (EOF)
App Version: v2.001
Notes:
- Text exports are clipboard-first (UI decides copy/share/save), and include capture method + reviewer notes.
- Print/PDF export is implemented by generating a print-ready HTML document; UI module must inject into a print iframe or container and call window.print().
- Next expected file: js/ui.js (wire buttons, non-generic export flows, range label updates, ensure chart canvas captures horizontal pan/zoom without vertical scrolling of the panel)
*/
