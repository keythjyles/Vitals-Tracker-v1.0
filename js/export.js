/*
Vitals Tracker (Modular) — js/export.js
App Version: v2.001
Purpose:
- Generates reviewer-ready text reports (succinct, clinical framing).
- Enforces “visible range only” export for Charts.
- No generic popups: export uses direct actions (download/share) with minimal prompts.
- PDF export: generates a print-ready HTML and invokes print() so the user can “Save as PDF”.
  (True programmatic PDF generation without any dialog is not reliably possible in-browser across Android.)

Latest Update (v2.001):
- Initial export module:
  - buildReportHeader() includes method of capture + what matters to reviewers.
  - exportText() supports clipboard + file download + share (when available).
  - exportChartVisibleRange() expects viewMin/viewMax and only exports records in that range.
  - exportAsPDF() opens a clean print window and triggers print() (user chooses Save as PDF).
*/

import { fmtDateTime } from "./utils.js";

function isShareAvailable(){
  return !!(navigator.share && typeof navigator.share === "function");
}

async function copyToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function downloadText(text, filename){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ymdNow(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export function buildReportHeader({appVersion, title, rangeLabel, extraNotes}){
  const now = fmtDateTime(Date.now());

  const important =
    "What matters to a medical or claim reviewer:\n" +
    "- These readings are patient-entered, time-stamped, and stored locally on-device.\n" +
    "- Look for sustained elevation, spikes with symptoms, and clustering during crisis episodes.\n" +
    "- Note associated symptoms/notes and whether readings improve after meds or rest.\n";

  const capture =
    "Method of capture:\n" +
    "- Readings are entered manually into Vitals Tracker on this device.\n" +
    "- Data is stored locally on the phone (no cloud sync, no account).\n" +
    "- Each record may include BP (systolic/diastolic), Heart Rate, Symptoms, and Notes.\n";

  const lines = [
    "Vitals Tracker — Export Report",
    `App Version: ${appVersion}`,
    `Report: ${title}`,
    `Generated: ${now}`,
    rangeLabel ? `Range: ${rangeLabel}` : "",
    "",
    capture,
    important,
    extraNotes ? (extraNotes.trim() + "\n") : "",
    "------------------------------",
    ""
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildEntriesText(recs){
  return recs.map(r => {
    const dt = fmtDateTime(r.ts);
    const bp = `BP ${r.sys ?? "—"}/${r.dia ?? "—"}`;
    const hr = `HR ${r.hr ?? "—"}`;
    const sym = (r.symptoms && r.symptoms.length) ? r.symptoms.join(", ") : "None";
    const notes = (r.notes && r.notes.trim()) ? r.notes.trim() : "None";

    return `${dt}\n${bp} • ${hr}\nSymptoms: ${sym}\nNotes: ${notes}\n`;
  }).join("\n");
}

/* Primary export: text */
export async function exportText({text, filenameBase, preferCopy=true}){
  const filename = `${filenameBase || "vitals_report"}_${ymdNow()}.txt`;

  // Copy (best for quick sharing into messages)
  if(preferCopy){
    try{ await copyToClipboard(text); }catch{}
  }

  return {
    filename,
    canShare: isShareAvailable(),
    share: async () => {
      if(!isShareAvailable()) return false;
      try{
        await navigator.share({ title: "Vitals Tracker Export", text });
        return true;
      }catch{
        return false;
      }
    },
    save: async () => {
      downloadText(text, filename);
      return true;
    }
  };
}

/* Charts export: visible range only */
export function exportChartVisibleRange({appVersion, recordsAsc, viewMin, viewMax, rangeLabel}){
  const recs = (recordsAsc || []).filter(r => r.ts >= viewMin && r.ts <= viewMax);
  const header = buildReportHeader({
    appVersion,
    title: "Charts Export (Visible Range)",
    rangeLabel: rangeLabel || `${fmtDateTime(viewMin)} to ${fmtDateTime(viewMax)}`,
    extraNotes:
      "Interpretation tip:\n" +
      "- This export reflects ONLY the currently visible chart window (after pan/zoom).\n"
  });

  const body = buildEntriesText(recs);
  return header + body;
}

/* PDF export via print window */
export function exportAsPDF({title, subtitle, bodyText}){
  const win = window.open("", "_blank", "noopener,noreferrer");
  if(!win){
    alert("Pop-up blocked. Allow pop-ups for PDF export.");
    return false;
  }

  const safe = (s) => String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${safe(title || "Vitals Tracker Export")}</title>
<style>
  body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; color:#111; }
  h1{ margin:0 0 6px; font-size: 20px; }
  h2{ margin:0 0 16px; font-size: 13px; font-weight: 600; color:#444; }
  pre{ white-space: pre-wrap; word-wrap: break-word; font-size: 12px; line-height: 1.28; }
  .meta{ margin-top: 8px; color:#444; font-size: 12px; }
  @media print { body{ margin: 16mm; } }
</style>
</head>
<body>
  <h1>${safe(title || "Vitals Tracker Export")}</h1>
  <h2>${safe(subtitle || "")}</h2>
  <pre>${safe(bodyText || "")}</pre>
  <script>
    window.onload = () => {
      setTimeout(() => { window.print(); }, 50);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

/*
Vitals Tracker (Modular) — js/export.js (EOF)
App Version: v2.001
Notes:
- Text export is the primary evidence artifact (easy to paste into Secure Message/email).
- PDF export uses print() so the user can Save as PDF (device/browser-controlled).
- Next expected file: js/chart.js (rendering + hypertension bands + dynamic y-axis + visible range label hook)
*/
