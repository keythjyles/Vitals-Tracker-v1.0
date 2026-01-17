/*
Vitals Tracker (Modular) — js/panel.js
App Version: v2.001

Purpose:
- Owns the carousel “panel paging” behavior:
  - Swipe left/right between Home, Log, Charts.
  - No neighbor bleed; simple 100% paging.
  - Preserves the original “pull-to-refresh on Home only”.
- Does NOT manage Add/Edit overlay panel (handled by ui.js).
- Provides a small API so ui.js can:
  - snap to specific panel
  - get current panel id
  - temporarily disable swipe while modals/overlays are open

Latest Update (v2.001):
- First modular implementation extracted from v1.19B44 logic.
- Keeps the same axis-lock thresholds and commit behavior.
*/

import { clamp } from "./utils.js";

const PANELS = ["home","log","charts"];

let viewportEl = null;
let trackEl = null;

let activeIndex = 0;

// external guard flags (set by ui.js)
let swipeEnabled = true;
let overlayOpen = false;
let modalOpen = false;

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
  return (viewportEl?.clientWidth || 1);
}

function xForIndex(idx){
  return -(idx * trackWidth());
}

function setTrackX(px, withTransition){
  if(!trackEl) return;
  trackEl.style.transition = withTransition ? "transform 200ms ease" : "none";
  trackEl.style.transform = `translate3d(${px}px,0,0)`;
}

function snapToIndex(idx, withTransition=true){
  activeIndex = clamp(idx, 0, PANELS.length-1);
  setTrackX(xForIndex(activeIndex), withTransition);
}

function currentPanelId(){
  return PANELS[activeIndex] || "home";
}

function allowSwipeHere(target){
  if(!swipeEnabled) return false;
  if(overlayOpen) return false;
  if(modalOpen) return false;

  // block gesture if interacting with input controls
  if(target && (target.closest?.("input, textarea, select, button"))) return false;
  return true;
}

function beginSwipe(clientX, clientY){
  swipe.active = true;
  swipe.axis = null;
  swipe.startX = clientX;
  swipe.startY = clientY;
  swipe.lastX = clientX;
  swipe.lastY = clientY;
  swipe.startT = Date.now();
  swipe.baseX = xForIndex(activeIndex);
  if(trackEl) trackEl.style.transition = "none";
}

function moveSwipe(clientX, clientY, preventer){
  if(!swipe.active) return;

  const dx = clientX - swipe.startX;
  const dy = clientY - swipe.startY;
  swipe.lastX = clientX;
  swipe.lastY = clientY;

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
    if(preventer) preventer();

    const w = trackWidth();
    const maxX = 0;
    const minX = -((PANELS.length-1) * w);

    let x = swipe.baseX + dx;

    // rubber-banding
    if(x > maxX) x = maxX + (x - maxX) * 0.25;
    if(x < minX) x = minX + (x - minX) * 0.25;

    setTrackX(x, false);
    return;
  }

  // pull-to-refresh (Home only)
  if(swipe.axis === "y"){
    if(currentPanelId() !== "home") return;
    if(window.scrollY > 0) return;
    if(dy < 0) return;
  }
}

function endSwipe(preventer, onPanelChanged){
  if(!swipe.active) return;

  const dx = swipe.lastX - swipe.startX;
  const dy = swipe.lastY - swipe.startY;

  const w = trackWidth();
  const dt = Math.max(1, Date.now() - swipe.startT);
  const velocityX = dx / dt;

  const SWIPE_COMMIT = w * 0.18;
  const VELOCITY_COMMIT = 0.55;

  if(swipe.axis === "x"){
    if(preventer) preventer();

    let idx = activeIndex;
    if(dx <= -SWIPE_COMMIT || velocityX <= -VELOCITY_COMMIT) idx = activeIndex + 1;
    if(dx >=  SWIPE_COMMIT || velocityX >=  VELOCITY_COMMIT) idx = activeIndex - 1;
    idx = clamp(idx, 0, PANELS.length-1);

    const changed = (idx !== activeIndex);
    snapToIndex(idx, true);

    swipe.active = false;
    swipe.axis = null;

    if(changed && typeof onPanelChanged === "function"){
      onPanelChanged(currentPanelId());
    }
    return;
  }

  if(swipe.axis === "y"){
    if(currentPanelId() === "home" && window.scrollY === 0){
      const PULL_THRESHOLD = 70;
      if(dy >= PULL_THRESHOLD && Math.abs(dx) < 24){
        if(preventer) preventer();
        location.reload();
      }
    }
  }

  // snap back
  snapToIndex(activeIndex, true);
  swipe.active = false;
  swipe.axis = null;
}

export function initPanelCarousel({ viewportId="viewport", trackId="track", onPanelChanged } = {}){
  viewportEl = document.getElementById(viewportId);
  trackEl = document.getElementById(trackId);

  if(!viewportEl || !trackEl) throw new Error("panel.js: viewport/track not found");

  // pointer events for touch devices
  viewportEl.addEventListener("pointerdown", (ev) => {
    if(ev.pointerType === "mouse") return;
    if(!allowSwipeHere(ev.target)) return;
    beginSwipe(ev.clientX, ev.clientY);
  });

  viewportEl.addEventListener("pointermove", (ev) => {
    if(!swipe.active) return;
    if(ev.pointerType === "mouse") return;
    moveSwipe(ev.clientX, ev.clientY, () => { try{ ev.preventDefault(); }catch{} });
  }, { passive:false });

  viewportEl.addEventListener("pointerup", (ev) => {
    if(!swipe.active) return;
    if(ev.pointerType === "mouse") return;
    endSwipe(() => { try{ ev.preventDefault(); }catch{} }, onPanelChanged);
  }, { passive:false });

  viewportEl.addEventListener("pointercancel", () => {
    if(!swipe.active) return;
    snapToIndex(activeIndex, true);
    swipe.active = false;
    swipe.axis = null;
  });

  window.addEventListener("resize", () => {
    if(overlayOpen) return;
    snapToIndex(activeIndex, false);
  });

  // initial position
  snapToIndex(0, false);
}

export function goToPanel(panelId, { transition=true } = {}){
  const idx = Math.max(0, PANELS.indexOf(panelId));
  snapToIndex(idx, transition);
  window.scrollTo({ top:0, left:0, behavior:"auto" });
}

export function getCurrentPanelId(){
  return currentPanelId();
}

export function getLastCarouselSwipeAt(){
  return lastCarouselSwipeAt;
}

export function setSwipeEnabled(on){
  swipeEnabled = !!on;
}

export function setOverlayOpen(on){
  overlayOpen = !!on;
}

export function setModalOpen(on){
  modalOpen = !!on;
}

/*
Vitals Tracker (Modular) — js/panel.js (EOF)
App Version: v2.001
Integration notes:
- index.html must have:
  - <div class="viewport" id="viewport"><div class="track" id="track"> ... panels ...</div></div>
- ui.js should call:
  - initPanelCarousel({ onPanelChanged })
  - goToPanel("log"/"charts"/"home")
  - setOverlayOpen(true/false) when Add/Edit is open
  - setModalOpen(true/false) when modals are open
*/
