/*
Vitals Tracker (Modular) — js/log.js
App Version: v2.001
Purpose:
- Log panel: search + date filters, render entries, press-highlight, and “Edit this reading?” modal.
- Exports log report based on current filters (search + date range).
- Does NOT change record schema; uses storage.js.

Key Behaviors (match v1 intent):
- Tap/press entry highlights; release confirms edit modal (with brief delay disabling Edit).
- Horizontal swipe on a log entry cancels press (so carousel swipe wins).
- Search and date inputs filter live.
- Export uses current filters and is succinct but reviewer-friendly.

Latest Update (v2.001):
- Initial modular log module. Uses shared export modal (ui.js) and add.js for editing.
*/

import { $, escapeHtml, fmtDateTime, clampEndOfDay, parseDateField } from "./utils.js";
import { loadRecords } from "./storage.js";
import { openAddEdit } from "./add.js";
import { openEditPrompt } from "./ui.js";
import { exportLogReport } from "./reports.js";

let _lastCarouselSwipeAt = 0;

export function setLastCarouselSwipeAt(ts){
  _lastCarouselSwipeAt = ts || 0;
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

export function getFilteredRecords(){
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

export function renderLog(){
  const list = $("logList");
  const recs = getFilteredRecords();

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
    e.setAttribute("aria-label","Open entry for editing");
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

  try{ document.activeElement?.blur?.(); }catch{}
}

/* Press-highlight + release-to-confirm edit (v1-style) */
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

export function attachLogInteractions(){
  $("btnRunSearch").addEventListener("click", (e) => { e.preventDefault(); renderLog(); });

  $("search").addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      renderLog();
      try{ e.target.blur(); }catch{}
    }
  });

  ["fromDate","toDate"].forEach(id => {
    $(id).addEventListener("input", () => renderLog());
    $(id).addEventListener("change", () => renderLog());
  });

  $("btnExportLog").addEventListener("click", () => {
    const recs = getFilteredRecords();
    exportLogReport(recs, {
      search: ($("search").value || "").trim(),
      from: $("fromDate").value || "",
      to: $("toDate").value || ""
    });
  });

  // Pointer flow for entries
  $("logList").addEventListener("pointerdown", (ev) => {
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

  $("logList").addEventListener("pointercancel", () => clearLogPress());

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
      const justCarouselSwiped = (Date.now() - _lastCarouselSwipeAt) < 260;
      if(justCarouselSwiped) return;

      // Open the edit prompt modal; on confirm, openAddEdit(ts)
      openEditPrompt(ts, () => openAddEdit(ts));
    }
  });

  $("logList").addEventListener("keydown", (ev) => {
    const entry = findEntryEl(ev.target);
    if(!entry) return;
    if(ev.key === "Enter" || ev.key === " "){
      const ts = Number(entry.dataset.ts);
      if(!Number.isFinite(ts)) return;
      ev.preventDefault();

      const justCarouselSwiped = (Date.now() - _lastCarouselSwipeAt) < 260;
      if(justCarouselSwiped) return;

      openEditPrompt(ts, () => openAddEdit(ts));
    }
  });
}

/*
Vitals Tracker (Modular) — js/log.js (EOF)
App Version: v2.001
Notes:
- Uses ui.js edit modal to preserve the “Confirm → Edit” pattern.
- Next expected file: js/reports.js (succinct reviewer-facing exports + charts visible-range export)
*/
