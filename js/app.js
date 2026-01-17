/*
Vitals Tracker (Modular) — js/app.js
App Version: v2.001
Purpose:
- App bootstrap + carousel (panel swipe) + pull-to-refresh (Home only) preserving v1 feel.
- Wires global hooks used by ui.js (nav, exit, install, clear data).
- Ensures modular architecture does NOT overwrite existing data:
  - Reads/writes the same STORAGE_KEY via storage.js.
- Initializes modules in the correct order.

Latest Update (v2.001):
- Initial modular bootstrap.
- Carousel paging is pure 100% widths (no gaps, no bleed).
- Pull-to-refresh works on Home only (downward pull at top).
- Exit handler preserved: window.close() + delayed alert fallback.
*/

import { $, show, hide } from "./utils.js";
import { setActivePanelId, getActivePanelId } from "./state.js";
import { clearAllRecords } from "./storage.js";
import { refreshInstallButton, handleInstallClick, isStandalone } from "./pwa.js";
import { wireUiControls, onPanelShown } from "./ui.js";
import { renderLog } from "./log.js";
import { initChartsDefaultView, renderCharts } from "./charts.js";

const PANELS = ["home","log","charts"]; // carousel panels only
const viewport = $("viewport");
const track = $("track");

let activeIndex = 0;
let lastCarouselSwipeAt = 0;
let isAddOpen = false;

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

function trackWidth(){
  return viewport?.clientWidth || 1;
}

function xForIndex(idx){
  return -(idx * trackWidth());
}

function setTrackX(px, withTransition){
  if(!track) return;
  track.style.transition = withTransition ? "transform 200ms ease" : "none";
  track.style.transform = `translate3d(${px}px,0,0)`;
}

function snapToIndex(idx, withTransition=true){
  activeIndex = clamp(idx, 0, PANELS.length - 1);
  setTrackX(xForIndex(activeIndex), withTransition);

  const id = PANELS[activeIndex] || "home";
  setActivePanelId(id);
  onPanelShown(id);
}

function showPanel(id){
  if(isAddOpen) return;
  const idx = Math.max(0, PANELS.indexOf(id));
  snapToIndex(idx, true);
  window.scrollTo({ top:0, left:0, behavior:"auto" });
}

/* --------------------------- Pull-to-refresh (Home) -------------------------- */

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

function allowSwipeHere(target){
  if(isAddOpen) return false;
  // Block swiping if interacting with inputs/buttons etc.
  if(target && (target.closest?.("input, textarea, select, button"))) return false;
  // Block if export/print sheets are open
  const exportOpen = $("exportSheet") && !$("exportSheet").classList.contains("hidden");
  const printOpen  = $("printPanel") && !$("printPanel").classList.contains("hidden");
  if(exportOpen || printOpen) return false;
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
  swipe.baseX = xForIndex(activeIndex);
  setTrackX(swipe.baseX, false);
}

function moveSwipe(x,y, ev){
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
    try{ ev.preventDefault(); }catch{}

    const w = trackWidth();
    const maxX = 0;
    const minX = -((PANELS.length-1) * w);

    let px = swipe.baseX + dx;

    if(px > maxX) px = maxX + (px - maxX)*0.25;
    if(px < minX) px = minX + (px - minX)*0.25;

    setTrackX(px, false);
    return;
  }

  if(swipe.axis === "y"){
    // Pull-to-refresh only on Home, only when page is at top, only downward
    const id = PANELS[activeIndex] || "home";
    if(id !== "home") return;
    if(window.scrollY > 0) return;
    if(dy < 0) return;
    // Do not hijack if horizontal intent is obvious
    if(Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy)) return;
  }
}

function endSwipe(ev){
  if(!swipe.active) return;

  const dx = swipe.lastX - swipe.startX;
  const dy = swipe.lastY - swipe.startY;

  const w = trackWidth();
  const dt = Math.max(1, Date.now() - swipe.startT);
  const velocityX = dx / dt;

  const SWIPE_COMMIT = w * 0.18;
  const VELOCITY_COMMIT = 0.55;

  if(swipe.axis === "x"){
    try{ ev.preventDefault(); }catch{}

    let idx = activeIndex;
    if(dx <= -SWIPE_COMMIT || velocityX <= -VELOCITY_COMMIT) idx = activeIndex + 1;
    if(dx >=  SWIPE_COMMIT || velocityX >=  VELOCITY_COMMIT) idx = activeIndex - 1;

    idx = clamp(idx, 0, PANELS.length-1);
    snapToIndex(idx, true);

    swipe.active = false;
    swipe.axis = null;
    return;
  }

  if(swipe.axis === "y"){
    const id = PANELS[activeIndex] || "home";
    if(id === "home" && window.scrollY === 0){
      const PULL_THRESHOLD = 70;
      if(dy >= PULL_THRESHOLD && Math.abs(dx) < 24){
        try{ ev.preventDefault(); }catch{}
        location.reload();
      }
    }
  }

  // Reset position
  snapToIndex(activeIndex, true);
  swipe.active = false;
  swipe.axis = null;
}

/* ------------------------------- Exit handler -------------------------------- */

function exitApp(){
  window.close();
  setTimeout(() => {
    alert("If it didn’t close: use your phone’s Back/Home.");
  }, 200);
}

/* ------------------------------- Clear data ---------------------------------- */

function clearDataFlow(){
  const ok = confirm(
    "Clear ALL saved vitals data?\n\n" +
    "This deletes everything stored on this phone for Vitals Tracker.\n" +
    "This cannot be undone."
  );
  if(!ok) return;

  clearAllRecords();

  // Reset UI filters quickly
  const from = $("fromDate"); if(from) from.value = "";
  const to   = $("toDate");   if(to) to.value = "";
  const s    = $("search");   if(s) s.value = "";

  alert("All data cleared.");
  showPanel("home");
}

/* ----------------------------- Hooks for ui.js --------------------------------
   ui.js calls window.__vtNav / __vtExit / __vtClearAll / __vtInstall
------------------------------------------------------------------------------- */

function installFlow(){
  handleInstallClick();
}

/* ------------------------------ Bootstrapping -------------------------------- */

function wireCarouselEvents(){
  if(!viewport) return;

  viewport.addEventListener("pointerdown", (ev) => {
    if(ev.pointerType === "mouse") return;
    if(!allowSwipeHere(ev.target)) return;
    beginSwipe(ev.clientX, ev.clientY);
  });

  viewport.addEventListener("pointermove", (ev) => {
    if(!swipe.active) return;
    if(ev.pointerType === "mouse") return;
    moveSwipe(ev.clientX, ev.clientY, ev);
  }, { passive:false });

  viewport.addEventListener("pointerup", (ev) => {
    if(!swipe.active) return;
    if(ev.pointerType === "mouse") return;
    endSwipe(ev);
  }, { passive:false });

  viewport.addEventListener("pointercancel", () => {
    if(!swipe.active) return;
    snapToIndex(activeIndex, true);
    swipe.active = false;
    swipe.axis = null;
  });

  window.addEventListener("resize", () => {
    if(isAddOpen) return;
    snapToIndex(activeIndex, false);
    if(getActivePanelId() === "charts") renderCharts();
  });
}

export function setAddOpenState(open){
  isAddOpen = !!open;
}

function bootstrap(){
  // hooks for ui.js
  window.__vtNav = (id) => showPanel(id);
  window.__vtExit = () => exitApp();
  window.__vtClearAll = () => clearDataFlow();
  window.__vtInstall = () => installFlow();

  wireUiControls();
  wireCarouselEvents();

  refreshInstallButton();

  // Initial panel
  snapToIndex(0, false);

  // Pre-render for fast startup
  renderLog();
  initChartsDefaultView();
  renderCharts();
}

bootstrap();

/*
Vitals Tracker (Modular) — js/app.js (EOF)
App Version: v2.001
Notes:
- Keeps the frozen Exit behavior (window.close + delayed alert).
- Carousel is pure 100% paging; no track gap; no neighbor bleed.
- Pull-to-refresh: Home only, downward pull at top.
- Next expected file: js/pwa.js (manifest + SW injection; install/uninstall button behavior)
*/
