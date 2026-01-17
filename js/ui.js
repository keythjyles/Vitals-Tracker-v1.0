/*
Vitals Tracker (Modular) — js/ui.js
App Version: v2.001
Purpose:
- Central UI wiring for:
  - Panel navigation (Home/Log/Charts/Add) while preserving the v1 "feel".
  - Non-generic export flows:
    - Text export: copies to clipboard and shows an in-app Export panel (not a generic popup).
    - PDF export: shows an in-app Print/PDF preview panel and triggers window.print() on user action.
- Chart-specific interaction rules:
  - Horizontal pan/zoom only (no vertical zoom).
  - While finger is on the chart canvas, vertical scroll should NOT scroll the whole panel; the chart captures gestures.
  - Export on Charts exports only the visible chart range (handled in export.js).
- Chart range label:
  - Replaces the old week selector box with an always-on label showing the currently visible chart range.
  - Updates on default view, pan, and zoom.

Latest Update (v2.001):
- Initial modular UI controller with:
  - In-app Export sheet (copy/share/save .txt).
  - In-app PDF/Print preview (no generic export choice popup).
  - Chart range label updater hook.
*/

import { $, setText, show, hide, isHidden } from "./utils.js";
import { APP_VERSION, chartView, setActivePanelId } from "./state.js";
import { renderLog } from "./log.js";
import { initChartsDefaultView, renderCharts, updateChartRangeLabel } from "./charts.js";
import {
  buildLogExportText,
  buildChartsExportText,
  copyToClipboard,
  saveTextWithPicker,
  downloadText,
  buildLogPrintableHtml,
  buildChartsPrintableHtml
} from "./export.js";
import { enterAddNewFrom, enterAddEditFromLog, closeAddPanel } from "./add.js";

/* ----------------------------- Internal helpers ----------------------------- */

function safeFocus(el){
  try{ el?.focus?.({ preventScroll:true }); }catch{}
}

function setVersionBadges(){
  const nodes = document.querySelectorAll("[data-app-version]");
  nodes.forEach(n => n.textContent = APP_VERSION);
}

function blurActive(){
  try{ document.activeElement?.blur?.(); }catch{}
}

/* ----------------------------- Navigation ----------------------------- */

export function goTo(panelId){
  // panelId: "home" | "log" | "charts"
  setActivePanelId(panelId);

  // Show the carousel panel via app.js (which controls swipe/carousel). If app.js exists, it calls here.
  // We keep this as a no-op hook unless app.js wires it.
}

/*
The following functions are expected to be called by app.js (carousel controller):
- onPanelShown("log") -> renderLog
- onPanelShown("charts") -> init view if needed, renderCharts
*/

export function onPanelShown(panelId){
  blurActive();

  if(panelId === "log"){
    renderLog();
    return;
  }
  if(panelId === "charts"){
    initChartsDefaultView();      // most recent 7 days, etc.
    renderCharts();
    updateChartRangeLabel();
    return;
  }
}

/* ----------------------------- Export Sheet (Text) ----------------------------- */

let exportPayload = null;
let exportPrevFocus = null;

export function openExportSheet(payload){
  exportPayload = payload;
  exportPrevFocus = document.activeElement || null;

  // payload: { text, filename, count }
  setText($("exportSheetTitle"), "Export ready");
  setText($("exportSheetSub"),
    `Copied to clipboard.\n\n` +
    `This report is reviewer-oriented (method of capture + what matters).\n` +
    `Entries: ${payload.count ?? "—"}\n\n` +
    `Optional:\n` +
    `• Share sends the report to another app.\n` +
    `• Save creates a .txt file on your device.`
  );

  const canShare = !!(navigator.share && typeof navigator.share === "function");
  $("btnExportShare").disabled = !canShare;

  show($("exportSheet"));
  safeFocus($("btnExportClose"));
}

export function closeExportSheet(){
  exportPayload = null;
  hide($("exportSheet"));
  try{ exportPrevFocus?.focus?.({ preventScroll:true }); }catch{}
}

async function doExportCopyAndOpen(payload){
  try{ await copyToClipboard(payload.text); }catch{}
  openExportSheet(payload);
}

async function handleExportSave(){
  if(!exportPayload) return;
  const text = exportPayload.text;
  const filename = exportPayload.filename || "vitals_report.txt";

  try{
    const ok = await saveTextWithPicker(text, filename);
    if(ok){
      // Non-generic: we update in-sheet message instead of alert
      setText($("exportSheetSub"),
        `Saved.\n\nEntries: ${exportPayload.count ?? "—"}\n\n` +
        `Tip: You can still Share or Close.`
      );
      return;
    }
  }catch{}

  downloadText(text, filename);
  setText($("exportSheetSub"),
    `Saved.\n\nEntries: ${exportPayload.count ?? "—"}\n\n` +
    `Tip: You can still Share or Close.`
  );
}

async function handleExportShare(){
  if(!exportPayload) return;
  if(!(navigator.share && typeof navigator.share === "function")) return;

  try{
    await navigator.share({
      title: "Vitals Tracker Export",
      text: exportPayload.text
    });
  }catch{
    // user canceled or share failed; keep silent
  }
}

/* ----------------------------- Print/PDF Panel ----------------------------- */

let printPrevFocus = null;

export function openPrintPanel(htmlDoc){
  // htmlDoc is a full HTML document string to print
  printPrevFocus = document.activeElement || null;

  const frame = $("printFrame");
  if(frame){
    // Load HTML into iframe
    const blob = new Blob([htmlDoc], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    frame.dataset.blobUrl && URL.revokeObjectURL(frame.dataset.blobUrl);
    frame.dataset.blobUrl = url;
    frame.src = url;
  }

  show($("printPanel"));
  safeFocus($("btnPrintNow"));
}

export function closePrintPanel(){
  hide($("printPanel"));
  try{ printPrevFocus?.focus?.({ preventScroll:true }); }catch{}
}

function printNow(){
  const frame = $("printFrame");
  if(!frame) return;

  try{
    // Some browsers need a brief delay for the iframe to finish loading.
    const win = frame.contentWindow;
    if(!win) return;
    win.focus();
    win.print();
  }catch{
    // If printing fails, leave preview open
  }
}

/* ----------------------------- Wire controls ----------------------------- */

export function wireUiControls(){
  setVersionBadges();

  // Home buttons
  $("btnGoAdd")?.addEventListener("click", () => enterAddNewFrom("home"));
  $("btnGoLog")?.addEventListener("click", () => window.__vtNav?.("log"));
  $("btnGoCharts")?.addEventListener("click", () => window.__vtNav?.("charts"));

  $("btnClearAll")?.addEventListener("click", () => window.__vtClearAll?.());
  $("btnInstall")?.addEventListener("click", () => window.__vtInstall?.());

  // Exit handler MUST remain in app.js (frozen). We call hook.
  $("btnExitHome")?.addEventListener("click", () => window.__vtExit?.());

  // Log buttons
  $("btnBackFromLog")?.addEventListener("click", () => window.__vtNav?.("home"));
  $("btnAddFromLog")?.addEventListener("click", () => enterAddNewFrom("log"));
  $("btnRunSearch")?.addEventListener("click", (e) => { e.preventDefault(); renderLog(); });

  $("search")?.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      renderLog();
      blurActive();
    }
  });

  ["fromDate","toDate"].forEach(id => {
    $(id)?.addEventListener("input", () => renderLog());
    $(id)?.addEventListener("change", () => renderLog());
  });

  // Charts buttons
  $("btnBackFromCharts")?.addEventListener("click", () => window.__vtNav?.("home"));

  // Export (Text) — Log
  $("btnExportLogTxt")?.addEventListener("click", async () => {
    const payload = buildLogExportText({
      searchValue: $("search")?.value || "",
      fromDateValue: $("fromDate")?.value || "",
      toDateValue: $("toDate")?.value || ""
    });
    await doExportCopyAndOpen(payload);
  });

  // Export (PDF) — Log
  $("btnExportLogPdf")?.addEventListener("click", () => {
    const html = buildLogPrintableHtml({
      searchValue: $("search")?.value || "",
      fromDateValue: $("fromDate")?.value || "",
      toDateValue: $("toDate")?.value || ""
    });
    openPrintPanel(html);
  });

  // Export (Text) — Charts (visible range only)
  $("btnExportChartsTxt")?.addEventListener("click", async () => {
    const payload = buildChartsExportText();
    await doExportCopyAndOpen(payload);
  });

  // Export (PDF) — Charts (visible range only)
  $("btnExportChartsPdf")?.addEventListener("click", () => {
    const html = buildChartsPrintableHtml();
    openPrintPanel(html);
  });

  // Export sheet
  $("btnExportClose")?.addEventListener("click", (e) => { e.preventDefault(); closeExportSheet(); });
  $("btnExportShare")?.addEventListener("click", async (e) => { e.preventDefault(); await handleExportShare(); });
  $("btnExportSave")?.addEventListener("click", async (e) => { e.preventDefault(); await handleExportSave(); });

  // Click outside sheets closes (non-generic, but still standard)
  $("exportSheet")?.addEventListener("click", (e) => {
    if(e.target === $("exportSheet")) closeExportSheet();
  });

  // Print panel
  $("btnPrintClose")?.addEventListener("click", (e) => { e.preventDefault(); closePrintPanel(); });
  $("btnPrintNow")?.addEventListener("click", (e) => { e.preventDefault(); printNow(); });

  $("printPanel")?.addEventListener("click", (e) => {
    if(e.target === $("printPanel")) closePrintPanel();
  });

  // Add panel back button (handled in add.js but we ensure close)
  $("btnBackFromAdd")?.addEventListener("click", () => closeAddPanel());

  // Keep chart range label in sync if charts module emits events
  window.addEventListener("vt:chartviewchanged", () => {
    updateChartRangeLabel();
  });
}

/*
Vitals Tracker (Modular) — js/ui.js (EOF)
App Version: v2.001
Notes:
- Requires index.html to include:
  - Export sheet DOM ids:
    exportSheet, exportSheetTitle, exportSheetSub,
    btnExportClose, btnExportShare, btnExportSave
  - Print panel DOM ids:
    printPanel, printFrame, btnPrintClose, btnPrintNow
  - Log export buttons:
    btnExportLogTxt, btnExportLogPdf
  - Charts export buttons:
    btnExportChartsTxt, btnExportChartsPdf
  - Chart range label element:
    chartRangeLabel
- Next expected file: js/app.js (bootstrap; preserve existing STORAGE_KEY exactly; implement carousel swipe + pull-to-refresh; hook __vtNav/__vtExit/__vtClearAll/__vtInstall)
*/
