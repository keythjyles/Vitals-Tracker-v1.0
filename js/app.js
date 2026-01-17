/*
Vitals Tracker (Modular) — js/app.js
App Version: v2.001
Purpose:
- Main bootstrap + wiring:
  - Preserve v1 storage key and existing data (no migration, no overwrite).
  - Initialize UI, storage, symptoms grid, carousel swipe, add/edit flow, modals.
  - Charts: default 7-day view, pan/zoom horizontal, visible-range export.
  - Pull-to-refresh on Home (release).
  - Exit handler preserved.
- This module is the single entrypoint imported by index.html.

Latest Update (v2.001):
- Initial modular wiring for v2.001 with chart range label (no week selector),
  chart gestures captured by canvas, and visible-range charts export.
*/

import { $, $$, clamp } from "./utils.js";
import { APP_VERSION, state } from "./state.js";
import { loadRecords, saveRecords, clearAllRecords } from "./storage.js";
import {
  buildSymptomsUI,
  selectedSymptoms,
  setSymptomsSelected,
  clearSymptomsSelected
} from "./symptoms.js";
import {
  openAddPanel,
  closeAddPanel,
  enterAddNew,
  enterAddEdit,
  wireInstallButton,
  wireExitButton,
  wireClearDataButton,
  refreshInstallButton,
  openEditPrompt,
  wireEditModal,
  wireExportModal
} from "./ui.js";
import { renderLog, wireLogEvents } from "./log.js";
import { renderCharts, attachChartGestures, wireChartsExportButton, updateChartRangeLabel, chartView } from "./chart.js";
import { injectManifest, registerSW } from "./pwa.js";

/* -----------------------------
   Carousel swipe (Home/Log/Charts)
   Requirements: keep behavior; no neighbor bleed; simple 100% paging.
------------------------------ */
const PANELS = ["home","log","charts"];

const track = $("track");
const viewport = $("viewport");

let swipe = {
  active:false,
  axis:null,
  startX:0,
  startY:0,
  startT:0,
  baseX:0,
  lastX:0,
  lastY:0
};

let lastCarouselSwipeAt = 0;

function trackWidth(){
  return viewport.clientWidth || 1;
}

function xForIndex(idx){
  return -(idx * trackWidth());
}

function setTrackX(px, withTransition){
  track.style.transition = withTransition ? "transform 200ms ease" : "none";
  track.style.transform = `translate3d(${px}px,0,0)`;
}

function snapToIndex(idx, withTransition=true){
  state.activeIndex = clamp(idx, 0, PANELS.length-1);
  setTrackX(xForIndex(state.activeIndex), withTransition);
}

function currentPanelId(){
  return PANELS[state.activeIndex] || "home";
}

function showCarouselPanel(id){
  if(state.isAddOpen) return;
  const idx = Math.max(0, PANELS.indexOf(id));
  snapToIndex(idx, true);

  if(id === "log"){
    renderLog();
  }
  if(id === "charts"){
    // If first time, default is set in chart module; always re-render on entry
    renderCharts();
  }

  window.scrollTo({top:0, left:0, behavior:"auto"});
}

function allowSwipeHere(target){
  if(state.isAddOpen) return false;
  if(!$("editModal").classList.contains("hidden")) return false;
  if(!$("exportModal").classList.contains("hidden")) return false;
  if(target && target.closest?.("input, textarea, select, button")) return false;
  return true;
}

function beginSwipe(x,y){
  swipe.active = true;
  swipe.axis = null;
  swipe.startX = x;
  swipe.startY = y;
  swipe.lastX = x;
  swipe.lastY = y;
  swipe.startT = Date.now();
  swipe.baseX = xForIndex(state.activeIndex);
  track.style.transition = "none";
}

function moveSwipe(x,y, preventDefault){
  if(!swipe.active) return;

  const dx = x - swipe.startX;
  const dy = y - swipe.startY;
  swipe.lastX = x;
  swipe.lastY = y;

  const AXIS_LOCK = 10;
  if(!swipe.axis){
    if(Math.abs(dx) >= AXIS_LOCK || Math.abs(dy) >= AXIS_LOCK){
      swipe.axis = (Math.abs(dx) > Math.abs(dy)) ? "x" : "y";
    }else{
      return;
    }
  }

  if(swipe.axis === "x"){
    lastCarouselSwipeAt = Date.now();
    if(preventDefault) preventDefault();

    const w = trackWidth();
    const maxX = 0;
    const minX = -((PANELS.length-1)*w);

    let px = swipe.baseX + dx;

    // edge rubber-band
    if(px > maxX) px = maxX + (px - maxX) * 0.25;
    if(px < minX) px = minX + (px - minX) * 0.25;

    setTrackX(px, false);
    return;
  }

  // Pull-to-refresh: Home only (release). Keep same behavior.
  if(swipe.axis === "y"){
    if(currentPanelId() !== "home") return;
    if(window.scrollY > 0) return;
    if(dy < 0) return;
    // do nothing until end; we just detect
  }
}

function endSwipe(preventDefault){
  if(!swipe.active) return;

  const dx = swipe.lastX - swipe.startX;
  const dy = swipe.lastY - swipe.startY;

  const w = trackWidth();
  const velocityX = (() => {
    const dt = Math.max(1, Date.now() - swipe.startT);
    return dx / dt;
  })();

  const SWIPE_COMMIT = w * 0.18;
  const VELOCITY_COMMIT = 0.55;

  if(swipe.axis === "x"){
    if(preventDefault) preventDefault();

    let idx = state.activeIndex;
    if(dx <= -SWIPE_COMMIT || velocityX <= -VELOCITY_COMMIT) idx = state.activeIndex + 1;
    if(dx >=  SWIPE_COMMIT || velocityX >=  VELOCITY_COMMIT) idx = state.activeIndex - 1;
    idx = clamp(idx, 0, PANELS.length-1);

    snapToIndex(idx, true);

    const id = currentPanelId();
    if(id === "log") renderLog();
    if(id === "charts") renderCharts();

    swipe.active = false;
    swipe.axis = null;
    return;
  }

  if(swipe.axis === "y"){
    if(currentPanelId() === "home" && window.scrollY === 0){
      const PULL_THRESHOLD = 70;
      if(dy >= PULL_THRESHOLD && Math.abs(dx) < 24){
        if(preventDefault) preventDefault();
        location.reload();
      }
    }
  }

  snapToIndex(state.activeIndex, true);
  swipe.active = false;
  swipe.axis = null;
}

/* -----------------------------
   Add/Edit Save/Delete (core flow preserved)
------------------------------ */
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

function wireAddPanelButtons(){
  $("btnGoAdd").addEventListener("click", () => enterAddNew(currentPanelId()));
  $("btnAddFromLog").addEventListener("click", () => enterAddNew("log"));

  $("btnBackFromAdd").addEventListener("click", () => {
    state.editTs = null;
    closeAddPanel();
    showCarouselPanel(state.returnPanel || "home");
  });

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

    if(state.editTs == null){
      recs.unshift({ ts: Date.now(), sys, dia, hr, notes, symptoms });
    }else{
      const idx = recs.findIndex(r => r.ts === state.editTs);
      if(idx >= 0){
        recs[idx] = { ts: state.editTs, sys, dia, hr, notes, symptoms };
      }else{
        recs.unshift({ ts: Date.now(), sys, dia, hr, notes, symptoms });
      }
    }

    recs.sort((a,b)=> b.ts - a.ts);
    saveRecords(recs);

    // reset log filters
    $("fromDate").value = "";
    $("toDate").value = "";
    $("search").value = "";

    state.editTs = null;
    closeAddPanel();
    showCarouselPanel("log");
  });

  $("btnDelete").addEventListener("click", () => {
    if(state.editTs == null) return;
    const ok = confirm("Delete this entry? This cannot be undone.");
    if(!ok) return;

    const recs = loadRecords().filter(r => r.ts !== state.editTs);
    saveRecords(recs);

    state.editTs = null;
    closeAddPanel();
    showCarouselPanel("log");
  });
}

/* -----------------------------
   Navigation buttons
------------------------------ */
function wireNavButtons(){
  $("btnGoLog").addEventListener("click", () => showCarouselPanel("log"));
  $("btnGoCharts").addEventListener("click", () => showCarouselPanel("charts"));

  $("btnBackFromLog").addEventListener("click", () => showCarouselPanel("home"));
  $("btnBackFromCharts").addEventListener("click", () => showCarouselPanel("home"));
}

/* -----------------------------
   Bootstrap
------------------------------ */
export function initApp(){
  // footer version
  const footerV = $("footerVersion");
  if(footerV) footerV.textContent = APP_VERSION;

  // symptoms UI
  buildSymptomsUI();

  // modals
  wireEditModal({
    onConfirm: (ts) => enterAddEdit(ts, { lastCarouselSwipeAt })
  });
  wireExportModal();

  // log
  wireLogEvents({ lastCarouselSwipeAt });

  // charts
  attachChartGestures();
  wireChartsExportButton();

  // buttons
  wireNavButtons();
  wireAddPanelButtons();
  wireInstallButton();
  wireExitButton();
  wireClearDataButton();

  // carousel swipe
  viewport.addEventListener("pointerdown", (ev) => {
    if(ev.pointerType === "mouse") return;
    if(!allowSwipeHere(ev.target)) return;
    beginSwipe(ev.clientX, ev.clientY);
  });

  viewport.addEventListener("pointermove", (ev) => {
    if(!swipe.active) return;
    if(ev.pointerType === "mouse") return;
    moveSwipe(ev.clientX, ev.clientY, () => { try{ ev.preventDefault(); }catch{} });
  }, { passive:false });

  viewport.addEventListener("pointerup", (ev) => {
    if(!swipe.active) return;
    if(ev.pointerType === "mouse") return;
    endSwipe(() => { try{ ev.preventDefault(); }catch{} });
  }, { passive:false });

  viewport.addEventListener("pointercancel", () => {
    if(!swipe.active) return;
    snapToIndex(state.activeIndex, true);
    swipe.active = false;
    swipe.axis = null;
  });

  window.addEventListener("resize", () => {
    if(state.isAddOpen) return;
    snapToIndex(state.activeIndex, false);
    if(currentPanelId() === "charts") renderCharts();
  });

  // PWA
  injectManifest();
  registerSW();

  // install label
  refreshInstallButton();

  // initial state
  $("fromDate").value = "";
  $("toDate").value = "";
  snapToIndex(0, false);

  renderLog();
  // charts will render on first entry; but keep label correct if already visible by swipe
  updateChartRangeLabel();
}

/*
Vitals Tracker (Modular) — js/app.js (EOF)
App Version: v2.001
Notes:
- Uses same storage key as v1 to preserve existing data; no migration performed.
- Next expected file: js/ui.js (panels, add/edit open/close, modals, install/exit/clear wiring, clipboard)
*/
