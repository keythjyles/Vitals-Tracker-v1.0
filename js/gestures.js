/*
Vitals Tracker (Modular) — js/gestures.js
App Version: v2.001
Purpose:
- Gesture handling for:
  1) Carousel swipe left/right between panels (Home/Log/Charts).
  2) Pull-to-refresh on Home (down only, release to refresh).
  3) Charts interactions:
     - Horizontal pan (drag) across time
     - Horizontal zoom (pinch) across time
     - NO vertical pan/zoom
     - While interacting with the chart, the panel should not scroll; the chart “owns” the touch.
- Designed to preserve the feel/behavior of v1 without “drift.”

Latest Update (v2.001):
- Initial modular gesture layer implemented with:
  - Pointer-based carousel swipe (mobile-friendly)
  - Touch-based chart pan/zoom that blocks panel scroll during chart interactions
  - Export scope compatibility (chart viewMin/viewMax always reflects visible range)
*/

import { PANELS, setActivePanelByIndex, getActiveIndex, isModalOpen, isAddOpen } from "./ui.js";
import { chartView, clampViewToBase, applyDefaultChartWindowIfNeeded, DAY_MS } from "./state.js";

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

/* ---------------- Carousel swipe + pull-to-refresh ---------------- */

export function attachCarouselGestures({ viewportEl, trackEl, getTrackWidth, snapToIndex, renderOnPanelActivate }){
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

  function allowSwipeHere(target){
    if(isAddOpen()) return false;
    if(isModalOpen()) return false;
    if(target && target.closest?.("input, textarea, select, button")) return false;
    return true;
  }

  function setTrackX(px, withTransition){
    trackEl.style.transition = withTransition ? "transform 200ms ease" : "none";
    trackEl.style.transform = `translate3d(${px}px,0,0)`;
  }

  function xForIndex(idx){
    const w = getTrackWidth();
    return -(idx * w);
  }

  function beginSwipe(clientX, clientY){
    swipe.active = true;
    swipe.axis = null;
    swipe.startX = clientX;
    swipe.startY = clientY;
    swipe.lastX = clientX;
    swipe.lastY = clientY;
    swipe.startT = Date.now();
    swipe.baseX = xForIndex(getActiveIndex());
    trackEl.style.transition = "none";
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

      const w = getTrackWidth();
      const maxX = 0;
      const minX = -((PANELS.length-1) * w);

      let x = swipe.baseX + dx;
      if(x > maxX) x = maxX + (x - maxX) * 0.25;
      if(x < minX) x = minX + (x - minX) * 0.25;

      setTrackX(x, false);
      return;
    }

    // Pull-to-refresh on Home only (down)
    if(swipe.axis === "y"){
      const activePanelId = PANELS[getActiveIndex()] || "home";
      if(activePanelId !== "home") return;
      if(window.scrollY > 0) return;
      if(dy < 0) return;
      // No UI drag needed; v1 just triggers reload on threshold at endSwipe.
    }
  }

  function endSwipe(preventer){
    if(!swipe.active) return;

    const dx = swipe.lastX - swipe.startX;
    const dy = swipe.lastY - swipe.startY;

    const w = getTrackWidth();
    const dt = Math.max(1, Date.now() - swipe.startT);
    const velocityX = dx / dt;

    const SWIPE_COMMIT = w * 0.18;
    const VELOCITY_COMMIT = 0.55;

    if(swipe.axis === "x"){
      if(preventer) preventer();

      let idx = getActiveIndex();
      if(dx <= -SWIPE_COMMIT || velocityX <= -VELOCITY_COMMIT) idx += 1;
      if(dx >=  SWIPE_COMMIT || velocityX >=  VELOCITY_COMMIT) idx -= 1;
      idx = clamp(idx, 0, PANELS.length-1);

      snapToIndex(idx, true);
      setActivePanelByIndex(idx);

      const id = PANELS[idx] || "home";
      if(renderOnPanelActivate) renderOnPanelActivate(id);

      swipe.active = false;
      swipe.axis = null;
      return;
    }

    if(swipe.axis === "y"){
      const activePanelId = PANELS[getActiveIndex()] || "home";
      if(activePanelId === "home" && window.scrollY === 0){
        const PULL_THRESHOLD = 70;
        if(dy >= PULL_THRESHOLD && Math.abs(dx) < 24){
          if(preventer) preventer();
          location.reload();
        }
      }
    }

    snapToIndex(getActiveIndex(), true);
    swipe.active = false;
    swipe.axis = null;
  }

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
    endSwipe(() => { try{ ev.preventDefault(); }catch{} });
  }, { passive:false });

  viewportEl.addEventListener("pointercancel", () => {
    if(!swipe.active) return;
    snapToIndex(getActiveIndex(), true);
    swipe.active = false;
    swipe.axis = null;
  });

  return {
    getLastCarouselSwipeAt: () => lastCarouselSwipeAt
  };
}

/* ---------------- Chart gestures: horizontal pan/zoom only ---------------- */

export function attachChartGestures({
  canvasEl,
  onChartViewChanged, // callback: rerender + update range label
  isChartsPanelActive
}){
  function plotBounds(){
    const rect = canvasEl.getBoundingClientRect();
    const padL = 62;
    const padR = 18;
    const plotW = Math.max(1, rect.width - (padL + padR));
    return { rect, padL, padR, plotW };
  }

  function screenXToTs(screenX){
    const { rect, padL, plotW } = plotBounds();
    const xIn = clamp(screenX - rect.left - padL, 0, plotW);
    const u = xIn / plotW;
    return chartView.viewMin + u * (chartView.viewMax - chartView.viewMin);
  }

  function distX(t1, t2){
    return Math.abs(t2.clientX - t1.clientX);
  }
  function centerX(t1, t2){
    return (t1.clientX + t2.clientX) / 2;
  }

  function ensureDefaultWindow(){
    applyDefaultChartWindowIfNeeded();
  }

  canvasEl.addEventListener("touchstart", (e) => {
    if(!isChartsPanelActive()) return;

    // Chart must "own" the touch so the panel does not scroll during chart interaction.
    e.preventDefault();

    ensureDefaultWindow();

    if(e.touches.length === 2){
      const d = distX(e.touches[0], e.touches[1]);
      const cx = centerX(e.touches[0], e.touches[1]);
      const centerTs = screenXToTs(cx);
      chartView._pinch = {
        dist: d,
        viewMin: chartView.viewMin,
        viewMax: chartView.viewMax,
        centerTs
      };
      chartView._pan = null;
      return;
    }

    if(e.touches.length === 1){
      chartView._pan = {
        x0: e.touches[0].clientX,
        viewMin: chartView.viewMin,
        viewMax: chartView.viewMax
      };
      chartView._pinch = null;
    }
  }, { passive:false });

  canvasEl.addEventListener("touchmove", (e) => {
    if(!isChartsPanelActive()) return;

    // Block panel scroll while touching the chart.
    e.preventDefault();

    if(chartView._pinch && e.touches.length === 2){
      const p = chartView._pinch;
      const newDist = distX(e.touches[0], e.touches[1]);
      const scale = newDist / (p.dist || 1);

      const startSpan = p.viewMax - p.viewMin;
      let newSpan = startSpan / (scale || 1);

      // v2 rules:
      // Zoom in: down to 1 day
      // Zoom out: up to 14 days
      const minSpan = 1 * DAY_MS;
      const maxSpan = 14 * DAY_MS;

      newSpan = clamp(newSpan, minSpan, maxSpan);

      let vMin = p.centerTs - newSpan/2;
      let vMax = p.centerTs + newSpan/2;

      chartView.viewMin = vMin;
      chartView.viewMax = vMax;

      clampViewToBase(); // also clamps to baseMin/baseMax window
      if(onChartViewChanged) onChartViewChanged();
      return;
    }

    if(chartView._pan && e.touches.length === 1){
      const { plotW } = plotBounds();
      const dx = e.touches[0].clientX - chartView._pan.x0;

      const span = (chartView._pan.viewMax - chartView._pan.viewMin) || (7*DAY_MS);
      const dt = -dx * (span / Math.max(1, plotW)); // horizontal only

      chartView.viewMin = chartView._pan.viewMin + dt;
      chartView.viewMax = chartView._pan.viewMax + dt;

      clampViewToBase();
      if(onChartViewChanged) onChartViewChanged();
    }
  }, { passive:false });

  function endGestures(){
    chartView._pinch = null;
    chartView._pan = null;
  }
  canvasEl.addEventListener("touchend", endGestures, { passive:true });
  canvasEl.addEventListener("touchcancel", endGestures, { passive:true });
}

/*
Vitals Tracker (Modular) — js/gestures.js (EOF)
App Version: v2.001
Notes:
- Carousel swipe uses pointer events; chart uses touch events.
- Chart gestures explicitly preventDefault so chart interaction does not scroll the panel.
- Next expected file: js/chart.js (rendering, dynamic y-axis, hypertension bands, range label update hooks)
*/
