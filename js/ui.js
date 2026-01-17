/*
Vitals Tracker (Modular) — js/ui.js
App Version: v2.001

Purpose:
- Single UI coordinator for:
  - Panel navigation (Home / Log / Charts) with swipe paging preserved.
  - Add/Edit panel flow preserved (opens as an overlay panel; does not break carousel math).
  - Pull-to-refresh on Home preserved.
  - Log rendering + press-highlight + confirm-edit prompt preserved.
  - Charts: shows a live “Visible Range” label (no date/week selector) and triggers chart renders.
  - Export: uses an in-panel Export Sheet (NOT a generic popup modal), and supports:
      - Copy to clipboard
      - Share (if available)
      - Save .txt
      - Export to PDF (print-to-PDF workflow) without generic popups

Latest Update (v2.001):
- Initial modular UI glue.
- Charts Export exports ONLY visible date range (chartView.viewMin/viewMax via chart.js).
- Chart gesture area prevents panel scrolling while touching chart (gestures.js).
*/

import { APP_VERSION, PANELS, setActivePanelIndex, getActivePanelIndex, setIsAddOpen, getIsAddOpen } from "./state.js";
import { $, $$, clamp, escapeHtml, fmtDateTime, parseDateField, clampEndOfDay, DAY_MS } from "./utils.js";
import { loadRecords, saveRecords, deleteRecord, clearAllRecords } from "./storage.js";
import { makeTextReport } from "./reporting.js";
import { initChart, renderChart, getVisibleRangeLabel, getVisibleRecords, setDefaultToMostRecent7Days } from "./chart.js";
import { initGestures, chartView } from "./gestures.js";
import { injectManifest, registerSW, isStandalone, refreshInstallButton, handleInstallClick } from "./pwa.js";

/* -----------------------------------------
   Internal UI State
------------------------------------------ */
let editTs = null;
let returnPanel = "home";
let timeTimer = null;

const SYMPTOMS = [
  "Sweaty","Dizzy","Panic","Brain fog","Chest tight","Headache",
  "Nausea","Short breath","Hot ears","Shaky","Blurred vision","Weakness"
];

const symState = new Map();

/* -----------------------------------------
   Carousel (swipe panels left/right)
   Note: core swipe math lives in gestures.js (initGestures)
------------------------------------------ */
function showCarouselPanel(id){
  if(getIsAddOpen()) return;
  const idx = Math.max(0, PANELS.indexOf(id));
  setActivePanelIndex(idx);

  if(id === "log") renderLog();
  if(id === "charts"){
    setDefaultToMostRecent7Days();
    updateChartRangeLabel();
    renderChart();
  }
  window.scrollTo({ top:0, left:0, behavior:"auto" });
}

function currentPanelId(){
  return PANELS[getActivePanelIndex()] || "home";
}

/* -----------------------------------------
   Symptoms UI
------------------------------------------ */
function buildSymptoms(){
  const grid = $("symGrid");
  grid.innerHTML = "";
  symState.clear();

  for(const name of SYMPTOMS){
    const item = document.createElement("div");
    item.className = "symItem";
    item.setAttribute("role","checkbox");
    item.setAttribute("aria-checked","false");
    item.tabIndex = 0;

    const box = document.createElement("div");
    box.className = "box";
    const check = document.createElement("div");
    check.className = "check";
    box.appendChild(check);

    const text = document.createElement("div");
    text.className = "symText";
    text.textContent = name;

    item.appendChild(box);
    item.appendChild(text);

    const setSelected = (on) => {
      item.classList.toggle("selected", on);
      item.setAttribute("aria-checked", on ? "true" : "false");
      symState.set(name, on);
    };

    setSelected(false);

    const toggle = () => setSelected(!symState.get(name));
    item.addEventListener("click", toggle);
    item.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        toggle();
      }
    });

    grid.appendChild(item);
  }
}

function selectedSymptoms(){
  return SYMPTOMS.filter(s => symState.get(s));
}

function clearSymUI(){
  for(const k of SYMPTOMS) symState.set(k,false);
  for(const el of $$("symGrid .symItem")){
    el.classList.remove("selected");
    el.setAttribute("aria-checked","false");
  }
}

function setSymSelected(names){
  const set = new Set((names || []).map(String));
  for(const name of SYMPTOMS) symState.set(name, set.has(name));
  for(const el of $$("symGrid .symItem")){
    const label = el.querySelector(".symText")?.textContent || "";
    const on = set.has(label);
    el.classList.toggle("selected", on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  }
}

/* -----------------------------------------
   Add/Edit Panel Flow
------------------------------------------ */
function clearAddForm(){
  $("sys").value = "";
  $("dia").value = "";
  $("hr").value = "";
  $("notes").value = "";
  clearSymUI();
}

function openAddPanel(){
  setIsAddOpen(true);
  $("add").classList.remove("hidden");
  $("viewport").classList.add("hidden");
  window.scrollTo({ top:0, left:0, behavior:"auto" });
}

function closeAddPanel(){
  setIsAddOpen(false);
  $("add").classList.add("hidden");
  $("viewport").classList.remove("hidden");
  window.scrollTo({ top:0, left:0, behavior:"auto" });
  showCarouselPanel(returnPanel || "home");
}

function tickTime(){
  const ts = (editTs != null) ? editTs : Date.now();
  $("timeLine").textContent = (() => {
    const d = new Date(ts);
    const time = new Intl.DateTimeFormat(undefined, { hour:"2-digit", minute:"2-digit", second:"2-digit" }).format(d);
    const date = new Intl.DateTimeFormat(undefined, { month:"2-digit", day:"2-digit", year:"numeric" }).format(d);
    return `${time}, ${date}`;
  })();

  if(timeTimer) clearTimeout(timeTimer);
  timeTimer = setTimeout(tickTime, 900);
}

function enterAddNew(fromPanel="home"){
  editTs = null;
  returnPanel = fromPanel;

  $("editPill").classList.add("hidden");
  $("btnDelete").classList.add("hidden");

  clearAddForm();
  openAddPanel();
  tickTime();

  setTimeout(() => { try{ $("sys").focus({preventScroll:true}); }catch{} }, 0);
}

function enterAddEdit(ts){
  const recs = loadRecords();
  const r = recs.find(x => x.ts === ts);
  if(!r){
    enterAddNew("log");
    return;
  }

  editTs = ts;
  returnPanel = "log";

  $("editPill").classList.remove("hidden");
  $("btnDelete").classList.remove("hidden");

  $("sys").value = (r.sys ?? "") === null ? "" : (r.sys ?? "");
  $("dia").value = (r.dia ?? "") === null ? "" : (r.dia ?? "");
  $("hr").value  = (r.hr  ?? "") === null ? "" : (r.hr  ?? "");
  $("notes").value = (r.notes ?? "").toString();
  setSymSelected(r.symptoms || []);

  openAddPanel();
  tickTime();
  setTimeout(() => { try{ document.activeElement?.blur(); }catch{} }, 0);
}

function intOrNull(v){
  const t = String(v).trim();
  if(!t) return null;
  const n = Number(t);
  if(!Number.isFinite(n)) return null;
  return Math.round(n);
}

function validateAnyInput(sys,dia,hr,notes,symptoms){
  return !(sys==null && dia==null && hr==null && !String(notes||"").trim() && (symptoms||[]).length===0);
}

/* -----------------------------------------
   Log Rendering + Edit Prompt (custom, not generic)
------------------------------------------ */
let pendingEditTs = null;
let editPromptOpenedAt = 0;

function openEditPrompt(ts){
  pendingEditTs = ts;
  editPromptOpenedAt = Date.now();
  $("editModal").classList.remove("hidden");
  $("btnEditConfirm").disabled = true;
  setTimeout(()=>{ $("btnEditConfirm").disabled = false; }, 450);
}

function closeEditPrompt(){
  pendingEditTs = null;
  $("editModal").classList.add("hidden");
}

function confirmEditPrompt(){
  if($("btnEditConfirm").disabled) return;
  const ts = pendingEditTs;
  closeEditPrompt();
  if(ts != null) enterAddEdit(ts);
}

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

function filteredRecords(){
  const recs = loadRecords();

  const q = ($("search").value || "").trim();

  const fromV = $("fromDate").value || "";
  const toV   = $("toDate").value || "";

  const fromTs = parseDateField(fromV);
  const toMid  = parseDateField(toV);
  const toTs   = toMid != null ? clampEndOfDay(toMid) : null;

  return recs.filter(r => {
    if(fromTs != null && r.ts < fromTs) return false;
    if(toTs != null && r.ts > toTs) return false;
    return recordMatches(r, q);
  });
}

function renderLog(){
  const list = $("logList");
  const recs = filteredRecords();

  list.innerHTML = "";
  if(recs.length === 0){
    const empty = document.createElement("div");
    empty.className = "subtle";
    empty.style.marginTop = "10px";
    empty.textContent = "No matching records.";
    list.appendChild(empty);
    return;
  }

  for(const r of recs){
    const e = document.createElement("div");
    e.className = "entry";
    e.tabIndex = 0;
    e.setAttribute("role","button");
    e.dataset.ts = String(r.ts);

    const top = document.createElement("div");
    top.className = "entryTop";

    const t = document.createElement("div");
    t.className = "entryTime";
    t.textContent = fmtDateTime(r.ts);

    top.appendChild(t);
    e.appendChild(top);

    const line1 = document.createElement("div");
    line1.className = "entryBPHR";

    const bp = document.createElement("div");
    bp.className = "bpBig";
    bp.textContent = `BP ${r.sys ?? "—"}/${r.dia ?? "—"}`;

    const hr = document.createElement("div");
    hr.className = "hrBig";
    hr.textContent = `HR ${r.hr ?? "—"}`;

    line1.appendChild(bp);
    line1.appendChild(hr);
    e.appendChild(line1);

    const sym = (r.symptoms && r.symptoms.length) ? r.symptoms.join(", ") : "None";
    const notes = (r.notes && r.notes.trim()) ? r.notes.trim() : "None";

    const l2 = document.createElement("div");
    l2.className = "entryLine";
    l2.innerHTML = `<b>Symptoms:</b> ${escapeHtml(sym)}`;
    e.appendChild(l2);

    const l3 = document.createElement("div");
    l3.className = "entryLine";
    l3.innerHTML = `<b>Notes:</b> ${escapeHtml(notes)}`;
    e.appendChild(l3);

    list.appendChild(e);
  }
}

/* press-highlight + tap-to-edit (no drift) */
const logTap = {
  activeEl:null,
  activeTs:null,
  pointerId:null,
  tracking:false,
  startX:0,
  startY:0,
  swiped:false
};

function findEntryEl(target){
  if(!target) return null;
  const el = target.closest ? target.closest(".entry") : null;
  if(!el) return null;
  if(el.closest && el.closest("#logList") !== $("logList")) return null;
  return el;
}

function rectInside(el, clientX, clientY){
  const SLOP_PX = 14;
  const rect = el.getBoundingClientRect();
  return (
    clientX >= rect.left - SLOP_PX && clientX <= rect.right + SLOP_PX &&
    clientY >= rect.top  - SLOP_PX && clientY <= rect.bottom + SLOP_PX
  );
}

function clearLogPress(){
  if(logTap.activeEl) logTap.activeEl.classList.remove("pressed");
  logTap.activeEl = null;
  logTap.activeTs = null;
  logTap.pointerId = null;
  logTap.tracking = false;
  logTap.swiped = false;
}

/* -----------------------------------------
   Export Sheet (custom in-panel)
------------------------------------------ */
let exportPayload = null;

function openExportSheet(payload){
  exportPayload = payload;
  $("exportSheetText").textContent = payload.text || "";
  $("exportSheetFile").textContent = payload.filename || "vitals_report.txt";
  $("exportSheet").classList.remove("hidden");

  // enable/disable share
  const canShare = !!(navigator.share && typeof navigator.share === "function");
  $("btnExportShare").disabled = !canShare;

  // copy immediately
  (async ()=>{
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(payload.text || "");
      }
    }catch{}
  })();
}

function closeExportSheet(){
  exportPayload = null;
  $("exportSheet").classList.add("hidden");
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
  if(!canPick) return false;

  const opts = {
    suggestedName: suggestedName || "vitals_report.txt",
    types: [{ description:"Text", accept: {"text/plain":[".txt"]} }]
  };

  const handle = await window.showSaveFilePicker(opts);
  const writable = await handle.createWritable();
  await writable.write(new Blob([text], {type:"text/plain;charset=utf-8"}));
  await writable.close();
  return true;
}

/* PDF export: print current report text into a minimal printable HTML and invoke print()
   This is still the system print dialog for "Save as PDF" (no generic popup modals). */
function exportToPDF(text, title){
  const win = window.open("", "_blank", "noopener,noreferrer");
  if(!win){ alert("Popup blocked. Allow popups to export PDF."); return; }

  const safe = (text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const doc = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${(title||"Vitals Report").replaceAll("<","")}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 18px; }
  pre{ white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.25; }
  h1{ font-size: 16px; margin: 0 0 10px; }
</style>
</head>
<body>
  <h1>${(title||"Vitals Tracker Export").replaceAll("<","")}</h1>
  <pre>${safe}</pre>
  <script>
    setTimeout(()=>{ window.print(); }, 250);
  </script>
</body>
</html>`;
  win.document.open();
  win.document.write(doc);
  win.document.close();
}

/* -----------------------------------------
   Charts UI helpers
------------------------------------------ */
function updateChartRangeLabel(){
  $("chartRangeLabel").textContent = getVisibleRangeLabel();
}

/* -----------------------------------------
   Clear Data (preserve key discipline)
------------------------------------------ */
function clearData(){
  const ok = confirm(
    "Clear ALL saved vitals data?\n\n" +
    "This deletes everything stored on this phone for Vitals Tracker.\n" +
    "This cannot be undone."
  );
  if(!ok) return;

  clearAllRecords();

  $("fromDate").value = "";
  $("toDate").value = "";
  $("search").value = "";

  alert("All data cleared.");
  showCarouselPanel("home");
}

/* -----------------------------------------
   Wire Events
------------------------------------------ */
export function initUI(){
  // Footer version
  const vEl = $("homeVersion");
  if(vEl) vEl.textContent = APP_VERSION;

  buildSymptoms();

  // PWA
  injectManifest();
  registerSW();
  refreshInstallButton();

  // Chart init
  initChart("chart");

  // Gestures init (carousel + chart)
  initGestures({
    viewportEl: $("viewport"),
    trackEl: $("track"),
    getActiveIndex: getActivePanelIndex,
    setActiveIndex: setActivePanelIndex,
    onPanelChanged: (panelId) => {
      if(panelId === "log") renderLog();
      if(panelId === "charts"){
        setDefaultToMostRecent7Days();
        updateChartRangeLabel();
        renderChart();
      }
    },
    onHomePullToRefresh: () => location.reload(),
    onChartInteraction: () => {
      updateChartRangeLabel();
      renderChart();
    }
  });

  // Home buttons
  $("btnGoAdd").addEventListener("click", () => enterAddNew(currentPanelId()));
  $("btnGoLog").addEventListener("click", () => showCarouselPanel("log"));
  $("btnGoCharts").addEventListener("click", () => showCarouselPanel("charts"));
  $("btnClearAll").addEventListener("click", clearData);

  $("btnInstall").addEventListener("click", handleInstallClick);

  $("btnExitHome").addEventListener("click", () => {
    window.close();
    setTimeout(() => {
      alert("If it didn’t close: use your phone’s Back/Home.");
    }, 200);
  });

  // Log buttons
  $("btnBackFromLog").addEventListener("click", () => showCarouselPanel("home"));
  $("btnAddFromLog").addEventListener("click", () => enterAddNew("log"));

  // Charts buttons
  $("btnBackFromCharts").addEventListener("click", () => showCarouselPanel("home"));

  // Add panel buttons
  $("btnBackFromAdd").addEventListener("click", () => { editTs = null; closeAddPanel(); });

  $("btnSave").addEventListener("click", () => {
    const sys = intOrNull($("sys").value);
    const dia = intOrNull($("dia").value);
    const hr  = intOrNull($("hr").value);
    const notes = ($("notes").value || "").toString();
    const symptoms = selectedSymptoms();

    if(!validateAnyInput(sys,dia,hr,notes,symptoms)){
      alert("Enter at least one value (BP, HR, notes, or symptom).");
      return;
    }

    const recs = loadRecords();

    if(editTs == null){
      recs.unshift({ ts: Date.now(), sys, dia, hr, notes, symptoms });
    }else{
      const idx = recs.findIndex(r => r.ts === editTs);
      if(idx >= 0){
        recs[idx] = { ts: editTs, sys, dia, hr, notes, symptoms };
      }else{
        recs.unshift({ ts: Date.now(), sys, dia, hr, notes, symptoms });
      }
    }

    recs.sort((a,b)=> b.ts - a.ts);
    saveRecords(recs);

    $("fromDate").value = "";
    $("toDate").value = "";
    $("search").value = "";

    editTs = null;
    closeAddPanel();
    showCarouselPanel("log");
  });

  $("btnDelete").addEventListener("click", () => {
    if(editTs == null) return;
    const ok = confirm("Delete this entry? This cannot be undone.");
    if(!ok) return;

    deleteRecord(editTs);
    editTs = null;
    closeAddPanel();
    showCarouselPanel("log");
  });

  // Search
  $("btnRunSearch").addEventListener("click", (e)=>{ e.preventDefault(); renderLog(); });
  $("search").addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){ e.preventDefault(); renderLog(); try{ e.target.blur(); }catch{} }
  });
  ["fromDate","toDate"].forEach(id => {
    $(id).addEventListener("input", renderLog);
    $(id).addEventListener("change", renderLog);
  });

  // Log list press/tap
  $("logList").addEventListener("pointerdown", (ev) => {
    if(currentPanelId() !== "log") return;
    if(ev.button != null && ev.button !== 0) return;

    const entry = findEntryEl(ev.target);
    if(!entry) return;

    const ts = Number(entry.dataset.ts);
    if(!Number.isFinite(ts)) return;

    clearLogPress();
    logTap.activeEl = entry;
    logTap.activeTs = ts;
    logTap.pointerId = ev.pointerId;
    logTap.tracking = true;
    logTap.startX = ev.clientX;
    logTap.startY = ev.clientY;
    logTap.swiped = false;

    entry.classList.add("pressed");
    try{ entry.setPointerCapture(ev.pointerId); }catch{}
  });

  $("logList").addEventListener("pointermove", (ev) => {
    if(!logTap.tracking) return;
    if(logTap.pointerId != null && ev.pointerId !== logTap.pointerId) return;
    if(!logTap.activeEl) return;

    const dx = ev.clientX - logTap.startX;
    const dy = ev.clientY - logTap.startY;

    const SWIPE_T = 12;

    if(Math.abs(dx) > SWIPE_T && Math.abs(dx) > Math.abs(dy)){
      logTap.swiped = true;
      clearLogPress();
      return;
    }

    if(!rectInside(logTap.activeEl, ev.clientX, ev.clientY)){
      clearLogPress();
    }
  });

  $("logList").addEventListener("pointercancel", clearLogPress);

  $("logList").addEventListener("pointerup", (ev) => {
    if(!logTap.tracking) return;
    if(logTap.pointerId != null && ev.pointerId !== logTap.pointerId) return;

    const entry = logTap.activeEl;
    const ts = logTap.activeTs;

    const dx = ev.clientX - logTap.startX;
    const dy = ev.clientY - logTap.startY;

    const inside = entry ? rectInside(entry, ev.clientX, ev.clientY) : false;
    const wasSwipe = logTap.swiped || (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy));

    clearLogPress();
    if(wasSwipe) return;

    if(inside && ts != null){
      setTimeout(() => openEditPrompt(ts), 0);
    }
  });

  $("logList").addEventListener("keydown", (ev) => {
    const entry = findEntryEl(ev.target);
    if(!entry) return;
    if(ev.key === "Enter" || ev.key === " "){
      const ts = Number(entry.dataset.ts);
      if(!Number.isFinite(ts)) return;
      ev.preventDefault();
      openEditPrompt(ts);
    }
  });

  // Edit prompt modal buttons (custom, but still modal — not “generic”)
  $("btnEditCancel").addEventListener("click", (e)=>{ e.preventDefault(); closeEditPrompt(); });
  $("btnEditConfirm").addEventListener("click", (e)=>{ e.preventDefault(); confirmEditPrompt(); });
  $("editModal").addEventListener("click", (e)=>{
    const justOpened = (Date.now() - editPromptOpenedAt) < 220;
    if(justOpened){ e.preventDefault(); e.stopPropagation(); return; }
    if(e.target === $("editModal")) closeEditPrompt();
  });

  document.addEventListener("keydown", (e)=>{
    const open = !$("editModal").classList.contains("hidden");
    if(!open) return;
    if(e.key === "Escape"){ e.preventDefault(); closeEditPrompt(); }
    if(e.key === "Enter"){
      const ae = document.activeElement;
      e.preventDefault();
      if(ae && ae.id === "btnEditCancel") closeEditPrompt();
      else confirmEditPrompt();
    }
  });

  // Export buttons
  $("btnExportLog").addEventListener("click", () => {
    const recs = filteredRecords();
    const rangeLabel = (() => {
      const f = $("fromDate").value;
      const t = $("toDate").value;
      if(f && t) return `${f} to ${t}`;
      if(f) return `From ${f}`;
      if(t) return `Up to ${t}`;
      return "All log entries (filtered by search/date if set)";
    })();

    const payload = makeTextReport({
      title: "Log Export",
      rangeLabel,
      extraNotes: "This report reflects the Log screen filters (Search + optional From/To dates).",
      records: recs,
      filenameBase: "vitals_log_report"
    });
    openExportSheet(payload);
  });

  $("btnExportCharts").addEventListener("click", () => {
    const recs = getVisibleRecords();
    const rangeLabel = getVisibleRangeLabel();

    const payload = makeTextReport({
      title: "Charts Export (Visible Range)",
      rangeLabel,
      extraNotes:
        "What you are looking at:\n" +
        "- The Charts screen shows a rolling time window (default: most recent 7 days).\n" +
        "- You can pinch to zoom (1–14 days) and drag to pan left/right.\n" +
        "- This export includes ONLY readings currently visible in the chart window.",
      records: recs,
      filenameBase: "vitals_charts_report"
    });
    openExportSheet(payload);
  });

  // Export sheet controls
  $("btnExportClose").addEventListener("click", (e)=>{ e.preventDefault(); closeExportSheet(); });

  $("btnExportShare").addEventListener("click", async (e)=>{
    e.preventDefault();
    if(!exportPayload) return;
    if(!(navigator.share && typeof navigator.share === "function")) return;
    try{
      await navigator.share({ title:"Vitals Tracker Export", text: exportPayload.text });
    }catch{}
  });

  $("btnExportSave").addEventListener("click", async (e)=>{
    e.preventDefault();
    if(!exportPayload) return;

    try{
      const ok = await saveTextWithPicker(exportPayload.text, exportPayload.filename);
      if(ok) return;
    }catch{}

    downloadText(exportPayload.text, exportPayload.filename || "vitals_report.txt");
  });

  $("btnExportPDF").addEventListener("click", (e)=>{
    e.preventDefault();
    if(!exportPayload) return;
    exportToPDF(exportPayload.text, "Vitals Tracker Export");
  });

  // initial render
  showCarouselPanel("home");
  renderLog();

  // keep chart label accurate if window changes via resize
  window.addEventListener("resize", () => {
    if(getIsAddOpen()) return;
    if(currentPanelId() === "charts"){
      updateChartRangeLabel();
      renderChart();
    }
  });
}

/*
Vitals Tracker (Modular) — js/ui.js (EOF)
App Version: v2.001
Notes:
- This module assumes the DOM includes:
  - chartRangeLabel element on Charts panel
  - exportSheet panel with:
      exportSheetText, exportSheetFile
      btnExportClose, btnExportShare, btnExportSave, btnExportPDF
- Next expected file: js/pwa.js
*/
