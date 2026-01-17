/*
Vitals Tracker (Modular) — js/export.js
App Version: v2.001
Purpose:
- Centralized export pipeline for Log and Charts.
- Exports are always scoped to what the user is actually viewing:
  - Log export: current Log filters (Search + optional From/To).
  - Charts export: ONLY the visible chart date range.
- Every report includes:
  - Method of capture
  - Succinct “what matters to a reviewer” notes
  - Explicit scope/range
- PDF export (no generic popups):
  - Generates a clean, printable document in a new tab using a dedicated in-app print template,
    then triggers print() (user chooses “Save as PDF” in system print UI).
  - No alert/confirm popups; uses inline status text return values instead.

Latest Update (v2.001):
- Initial modular export module with:
  - Standardized report header/footer blocks
  - Text export and PDF export flows
  - Clipboard + Share + Save-to-file support
*/

import { APP_VERSION, captureMethodBlock, reviewerNotesBlock } from "./version.js";

function fmtDateTime(ts){
  const d = new Date(ts);
  return new Intl.DateTimeFormat(undefined, {
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit"
  }).format(d);
}

function safeText(s){ return String(s ?? ""); }

function buildHeader({ title, rangeLabel, contextForReviewer }){
  const now = fmtDateTime(Date.now());

  const lines = [
    "Vitals Tracker — Export Report",
    `App Version: ${APP_VERSION}`,
    `Report: ${title}`,
    `Generated: ${now}`,
    rangeLabel ? `Range: ${rangeLabel}` : "",
    "",
    captureMethodBlock(),
    "",
    reviewerNotesBlock(contextForReviewer),
    "",
    "------------------------------",
    ""
  ].filter(Boolean);

  return lines.join("\n");
}

function renderEntryText(r){
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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${base}_${y}-${m}-${da}.txt`;
}

/* ---------------- Clipboard / Share / Save ---------------- */

async function copyToClipboard(text){
  if (navigator.clipboard && navigator.clipboard.writeText){
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

async function saveTextWithPicker(text, suggestedName){
  const canPick = typeof window.showSaveFilePicker === "function";
  if (!canPick) return false;

  const handle = await window.showSaveFilePicker({
    suggestedName: suggestedName || "vitals_report.txt",
    types: [{ description:"Text", accept: {"text/plain":[".txt"]} }]
  });
  const writable = await handle.createWritable();
  await writable.write(new Blob([text], {type:"text/plain;charset=utf-8"}));
  await writable.close();
  return true;
}

function isShareAvailable(){
  return !!(navigator.share && typeof navigator.share === "function");
}

/*
Returns an object for UI to show (no popups):
{ ok:boolean, copied:boolean, text:string, filename:string, canShare:boolean }
*/
export async function exportTextReport({ title, rangeLabel, contextForReviewer, records, filenameBase }){
  const header = buildHeader({ title, rangeLabel, contextForReviewer });
  const body = (records || []).map(renderEntryText).join("\n");
  const out = header + body;

  const filename = makeFilename(filenameBase || "vitals_report");

  let copied = false;
  try { copied = await copyToClipboard(out); } catch { copied = false; }

  return {
    ok: true,
    copied,
    text: out,
    filename,
    canShare: isShareAvailable()
  };
}

export async function shareTextReport(text){
  if (!isShareAvailable()) return { ok:false, reason:"share_unavailable" };
  try{
    await navigator.share({ title:"Vitals Tracker Export", text: safeText(text) });
    return { ok:true };
  }catch{
    return { ok:false, reason:"share_failed_or_canceled" };
  }
}

export async function saveTextReport(text, filename){
  const out = safeText(text);
  const name = safeText(filename || "vitals_report.txt");

  try{
    const ok = await saveTextWithPicker(out, name);
    if (ok) return { ok:true, method:"picker" };
  }catch{
    /* fall through */
  }

  try{
    downloadText(out, name);
    return { ok:true, method:"download" };
  }catch{
    return { ok:false, method:"none" };
  }
}

/* ---------------- PDF Export (print template) ---------------- */
/*
No generic popups.
Implementation:
- Opens a new window with a minimal print-optimized HTML template.
- Injects the report as preformatted text with mild typography.
- Triggers print() once loaded; user selects “Save as PDF” in system print UI.
*/

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function exportToPDF({ title, rangeLabel, contextForReviewer, records }){
  const header = buildHeader({ title, rangeLabel, contextForReviewer });
  const body = (records || []).map(renderEntryText).join("\n");
  const out = header + body;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win){
    return { ok:false, reason:"popup_blocked" };
  }

  const doc = win.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Vitals Tracker Export</title>
<style>
  @page { margin: 0.75in; }
  html,body{ height:100%; }
  body{
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    color:#111;
    background:#fff;
    margin:0;
  }
  .wrap{ padding: 0.75in; }
  h1{
    margin: 0 0 10px;
    font-size: 18px;
    letter-spacing: .2px;
  }
  .meta{
    margin: 0 0 14px;
    font-size: 12px;
    color:#333;
  }
  pre{
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11.5px;
    line-height: 1.35;
    border: 1px solid #ddd;
    padding: 12px;
    border-radius: 10px;
  }
  .foot{
    margin-top: 10px;
    font-size: 11px;
    color:#444;
  }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Vitals Tracker — Export Report</h1>
    <div class="meta">${escapeHtml(title)}${rangeLabel ? " | " + escapeHtml(rangeLabel) : ""}</div>
    <pre>${escapeHtml(out)}</pre>
    <div class="foot">Tip: In the print dialog, choose “Save as PDF” to export a PDF file.</div>
  </div>
<script>
  window.addEventListener('load', () => {
    setTimeout(() => { window.print(); }, 50);
  });
</script>
</body>
</html>`);
  doc.close();

  return { ok:true };
}

/*
Vitals Tracker (Modular) — js/export.js (EOF)
App Version: v2.001
Notes:
- No alert/confirm popups are used by this module.
- PDF export uses a dedicated print template window and triggers print().
- Next expected file: js/state.js (central runtime state including chart view and gesture bounds)
*/
