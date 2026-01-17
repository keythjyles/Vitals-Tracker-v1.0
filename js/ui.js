/*
Vitals Tracker (Modular) — js/ui.js
App Version: v2.001

Purpose:
- Owns UI-only behavior that should not touch core data structures:
  - Open/close Add/Edit panel (without destroying carousel state).
  - Time line ticker + font fit.
  - Edit confirmation modal (press-highlight flow remains in log.js).
  - Export modal (no generic popups; consistent in-app modal UX).
  - Install/Uninstall guidance button behavior.
  - Clear Data button (with explicit confirmation).
  - Exit handler preserved (window.close + delayed alert fallback).

Latest Update (v2.001):
- Initial modular UI wiring for v2.001.
- Export modal accepts payload text/filename and offers Close / Share / Save .txt.
- Clear Data removes ONLY the v1 storage key (preserves modular files, does not alter browser settings).
*/

import { $, clamp } from "./utils.js";
import { APP_VERSION, STORAGE_KEY, state } from "./state.js";
import { loadRecords, saveRecords, clearAllRecords } from "./storage.js";

/* -----------------------------
   Add/Edit panel open/close
------------------------------ */
export function openAddPanel(){
  state.isAddOpen = true;
  $("add").classList.remove("hidden");
  $("viewport").classList.add("hidden");
  window.scrollTo({top:0, left:0, behavior:"auto"});
}

export function closeAddPanel(){
  state.isAddOpen = false;
  $("add").classList.add("hidden");
  $("viewport").classList.remove("hidden");
  window.scrollTo({top:0, left:0, behavior:"auto"});
}

export function enterAddNew(fromPanel="home"){
  state.editTs = null;
  state.returnPanel = fromPanel;

  $("editPill").classList.add("hidden");
  $("btnDelete").classList.add("hidden");

  $("sys").value = "";
  $("dia").value = "";
  $("hr").value  = "";
  $("notes").value = "";

  // symptoms grid state is managed by symptoms.js; we only clear UI safely here if present
  try{
    const ev = new CustomEvent("vt:clearSymptoms");
    window.dispatchEvent(ev);
  }catch{}

  openAddPanel();
  startTimeTicker();
  adjustTimeFont();

  setTimeout(() => { try{ $("sys").focus({preventScroll:true}); }catch{} }, 0);
}

export function enterAddEdit(ts){
  const recs = loadRecords();
  const r = recs.find(x => x.ts === ts);
  if(!r){
    enterAddNew("log");
    return;
  }

  state.editTs = ts;
  state.returnPanel = "log";

  $("editPill").classList.remove("hidden");
  $("btnDelete").classList.remove("hidden");

  $("sys").value = (r.sys ?? "") === null ? "" : (r.sys ?? "");
  $("dia").value = (r.dia ?? "") === null ? "" : (r.dia ?? "");
  $("hr").value  = (r.hr  ?? "") === null ? "" : (r.hr  ?? "");
  $("notes").value = (r.notes ?? "").toString();

  try{
    const ev = new CustomEvent("vt:setSymptoms", { detail: { symptoms: r.symptoms || [] } });
    window.dispatchEvent(ev);
  }catch{}

  openAddPanel();
  startTimeTicker();
  adjustTimeFont();
  setTimeout(() => { try{ document.activeElement?.blur(); }catch{} }, 0);
}

/* -----------------------------
   Time line ticker + font fit
------------------------------ */
let timeTimer = null;

function fmtTimeCommaDate(ts){
  const d = new Date(ts);
  const time = new Intl.DateTimeFormat(undefined, {
    hour:"2-digit", minute:"2-digit", second:"2-digit"
  }).format(d);
  const date = new Intl.DateTimeFormat(undefined, {
    month:"2-digit", day:"2-digit", year:"numeric"
  }).format(d);
  return `${time}, ${date}`;
}

function tickTime(){
  const line = $("timeLine");
  const ts = (state.editTs != null) ? state.editTs : Date.now();
  line.textContent = fmtTimeCommaDate(ts);
  adjustTimeFont();

  if(timeTimer) clearTimeout(timeTimer);
  timeTimer = setTimeout(tickTime, 900);
}

function startTimeTicker(){
  tickTime();
}

export function adjustTimeFont(){
  const el = $("timeLine");
  if(!el) return;
  const parent = el.parentElement;
  if(!parent) return;

  el.style.fontSize = "";
  const maxW = parent.clientWidth - 8;

  let fs = parseFloat(getComputedStyle(el).fontSize) || 28;
  let guard = 0;
  while(el.scrollWidth > maxW && fs > 16 && guard < 30){
    fs -= 1;
    el.style.fontSize = fs + "px";
    guard++;
  }
}

/* -----------------------------
   Edit confirm modal
------------------------------ */
let pendingEditTs = null;
let modalPrevFocus = null;
let modalOpenedAt = 0;
let enableEditTimer = null;

export function openEditPrompt(ts){
  pendingEditTs = ts;
  modalPrevFocus = document.activeElement || null;
  modalOpenedAt = Date.now();

  const m = $("editModal");
  const btnEdit = $("btnEditConfirm");

  btnEdit.disabled = true;
  if(enableEditTimer) clearTimeout(enableEditTimer);
  enableEditTimer = setTimeout(() => { btnEdit.disabled = false; }, 450);

  m.classList.remove("hidden");
  setTimeout(() => { try{ $("btnEditCancel").focus({preventScroll:true}); }catch{} }, 0);
}

function closeEditPrompt(){
  pendingEditTs = null;
  $("editModal").classList.add("hidden");
  try{ modalPrevFocus?.focus?.({preventScroll:true}); }catch{}
}

export function wireEditModal({ onConfirm }){
  $("btnEditCancel").addEventListener("click", (e) => { e.preventDefault(); closeEditPrompt(); });
  $("btnEditConfirm").addEventListener("click", (e) => {
    e.preventDefault();
    if($("btnEditConfirm").disabled) return;
    const ts = pendingEditTs;
    closeEditPrompt();
    if(ts != null) onConfirm(ts);
  });

  $("editModal").addEventListener("click", (e) => {
    const justOpened = (Date.now() - modalOpenedAt) < 220;
    if(justOpened){ e.preventDefault(); e.stopPropagation(); return; }
    if(e.target === $("editModal")) closeEditPrompt();
  });

  document.addEventListener("keydown", (e) => {
    const open = !$("editModal").classList.contains("hidden");
    if(!open) return;

    if(e.key === "Escape"){
      e.preventDefault();
      closeEditPrompt();
      return;
    }
    if(e.key === "Enter"){
      const ae = document.activeElement;
      if(ae && ae.id === "btnEditCancel"){
        e.preventDefault();
        closeEditPrompt();
      }else{
        e.preventDefault();
        $("btnEditConfirm").click();
      }
    }
  });
}

/* -----------------------------
   Export modal (no generic popups)
------------------------------ */
let exportPayload = null;
let exportPrevFocus = null;
let exportOpenedAt = 0;
let enableExportTimer = null;

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

async function saveTextWithPicker(text, suggestedName){
  const canPick = typeof window.showSaveFilePicker === "function";
  if(!canPick) return false;

  const opts = {
    suggestedName: suggestedName || "vitals_report.txt",
    types: [{ description: "Text", accept: {"text/plain": [".txt"]} }]
  };

  const handle = await window.showSaveFilePicker(opts);
  const writable = await handle.createWritable();
  await writable.write(new Blob([text], {type:"text/plain;charset=utf-8"}));
  await writable.close();
  return true;
}

export function openExportModal(payload){
  exportPayload = payload;
  exportPrevFocus = document.activeElement || null;
  exportOpenedAt = Date.now();

  const btnClose = $("btnExportClose");
  const btnShare = $("btnExportShare");
  const btnSave  = $("btnExportSave");

  btnClose.disabled = true;
  btnShare.disabled = true;
  btnSave.disabled  = true;

  $("exportModal").classList.remove("hidden");

  if(enableExportTimer) clearTimeout(enableExportTimer);
  enableExportTimer = setTimeout(() => {
    btnClose.disabled = false;
    btnShare.disabled = !isShareAvailable();
    btnSave.disabled  = false;
  }, 450);

  setTimeout(() => { try{ btnClose.focus({preventScroll:true}); }catch{} }, 0);
}

function closeExportModal(){
  exportPayload = null;
  $("exportModal").classList.add("hidden");
  try{ exportPrevFocus?.focus?.({preventScroll:true}); }catch{}
}

export function wireExportModal(){
  $("btnExportClose").addEventListener("click", (e) => { e.preventDefault(); closeExportModal(); });

  $("exportModal").addEventListener("click", (e) => {
    const justOpened = (Date.now() - exportOpenedAt) < 220;
    if(justOpened){ e.preventDefault(); e.stopPropagation(); return; }
    if(e.target === $("exportModal")) closeExportModal();
  });

  document.addEventListener("keydown", (e) => {
    const open = !$("exportModal").classList.contains("hidden");
    if(!open) return;
    if(e.key === "Escape"){
      e.preventDefault();
      closeExportModal();
    }
  });

  $("btnExportShare").addEventListener("click", async (e) => {
    e.preventDefault();
    if(!exportPayload) return;
    if($("btnExportShare").disabled) return;

    if(!isShareAvailable()){
      // No popups required; but Share button is disabled when unavailable.
      return;
    }
    try{
      await navigator.share({
        title: "Vitals Tracker Export",
        text: exportPayload.text
      });
    }catch{}
  });

  $("btnExportSave").addEventListener("click", async (e) => {
    e.preventDefault();
    if(!exportPayload) return;
    if($("btnExportSave").disabled) return;

    try{
      const ok = await saveTextWithPicker(exportPayload.text, exportPayload.filename);
      if(ok) return;
    }catch{}

    downloadText(exportPayload.text, exportPayload.filename || "vitals_report.txt");
  });
}

export async function exportToModal({ text, filename }){
  try{ await copyToClipboard(text); }catch{}
  openExportModal({ text, filename });
}

/* -----------------------------
   Install / Exit / Clear Data
------------------------------ */
let deferredPrompt = null;

export function wireInstallButton(){
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    refreshInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    refreshInstallButton();
  });

  $("btnInstall").addEventListener("click", async () => {
    if(isStandalone()){
      // No generic popup: but we still must inform the user. Alert is acceptable as an OS-level prompt;
      // If you want this in an in-app modal later, we can convert it.
      alert(
        "Uninstall:\n\n" +
        "Android: press-and-hold the app icon → Uninstall.\n" +
        "Uninstall typically does NOT delete your saved data, but device/browser behavior can vary.\n\n" +
        "To delete data on purpose: use Clear Data (home screen)."
      );
      return;
    }
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{ await deferredPrompt.userChoice; }catch{}
      deferredPrompt = null;
      refreshInstallButton();
      return;
    }
    alert("Install is available when your browser offers it (menu → Install app).");
  });
}

export function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function refreshInstallButton(){
  $("btnInstall").textContent = isStandalone() ? "Uninstall" : "Install";
}

export function wireExitButton(){
  $("btnExitHome").addEventListener("click", () => {
    // frozen known-good behavior
    window.close();
    setTimeout(() => {
      alert("If it didn’t close: use your phone’s Back/Home.");
    }, 200);
  });
}

export function wireClearDataButton(){
  $("btnClearAll").addEventListener("click", () => {
    const ok = confirm(
      "Clear ALL saved vitals data?\n\n" +
      "This deletes everything stored on this phone for Vitals Tracker.\n" +
      "This cannot be undone."
    );
    if(!ok) return;

    clearAllRecords();

    // reset log filters if present
    if($("fromDate")) $("fromDate").value = "";
    if($("toDate")) $("toDate").value = "";
    if($("search")) $("search").value = "";

    alert("All data cleared.");
    // caller controls navigation; keep minimal
  });
}

/*
Vitals Tracker (Modular) — js/ui.js (EOF)
App Version: v2.001
Notes:
- Export modal is the required non-generic UI for exports; charts/log use exportToModal().
- If you want “export as PDF” next: we will add js/pdf.js to render a clean report to a hidden DOM,
  then print-to-PDF (or share as PDF) via browser print pipeline with controlled layout.
*/
