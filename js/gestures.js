/*
Vitals Tracker (Modular) — js/gestures.js
App Version: v2.001
Purpose:
- Implements carousel swipe paging (left/right) and pull-to-refresh (Home only).
- Implements chart horizontal pan/zoom gestures that do NOT vertically scroll the panel:
  - Single-finger drag pans horizontally across time.
  - Pinch zoom adjusts visible time span (1–14 days), anchored at pinch center.
- Ensures: while interacting with the chart, the chart consumes touch; the panel does not scroll.

Latest Update (v2.001):
- Added horizontal-only chart pan + pinch zoom with strict constraints.
- Added chart touch “capture” to prevent panel scrolling during chart interactions.
- Carousel swipe kept simple: pure 100% paging using viewport width.
*/

import { state, PANELS, clamp, clampChartViewToBase } from "./state.js";

/* ---------- Carousel Swipe + Pull-to-Refresh ---------- */

export function initCarouselGestures({ viewportEl, trackEl, onPanelChanged }){
  let swipe = {
    active:false,
    axis:null,
    startX:0,
    startY:0,
    lastX:0,
    lastY:0,
    startT:0,
    baseX:0
  };

  function trackWidth(){
    return viewportEl.clientWidth || 1;
  }
  function xForIndex(idx){
    return -(idx * trackWidth());
  }
  function setTrackX(px, withTransition){
    trackEl.style.transition = withTransition ? "transform 200ms ease" : "none";
    trackEl.style.transform = `translate3d(${px}px,0,0)`;
  }
  function snapToIndex(idx, withTransition=true){
    state.activeIndex = clamp(idx, 0, PANELS.length - 1);
    setTrackX(xForIndex(state.activeIndex), withTransition);
    onPanelChanged?.(PANELS[state.activeIndex]);
  }

  function allowSwipeHere(target){
    if (state.isAddOpen) return false;
    if (target && target.closest?.("input, textarea, select, button")) return false;
    return true;
  }

  function begin(clientX, clientY){
    swipe.active = true;
    swipe.axis = null;
    swipe.startX = clientX;
    swipe.startY = clientY;
    swipe.lastX = clientX;
    swipe.lastY = clientY;
    swipe.startT = Date.now();
    swipe.baseX = xForIndex(state.activeIndex);
    trackEl.style.transition = "none";
  }

  function move(clientX, clientY, prevent){
    if (!swipe.active) return;
    const dx = clientX - swipe.startX;
    const dy = clientY - swipe.startY;
    swipe.lastX = clientX;
    swipe.lastY = clientY;

    const AXIS_LOCK = 10;

    if (!swipe.axis){
      if (Math.abs(dx) >= AXIS_LOCK || Math.abs(dy) >= AXIS_LOCK){
        swipe.axis = (Math.abs(dx) > Math.abs(dy)) ? "x" : "y";
      } else {
        return;
      }
    }

    if (swipe.axis === "x"){
      prevent?.();
      const w = trackWidth();
      const maxX = 0;
      const minX = -((PANELS.length - 1) * w);

      let x = swipe.baseX + dx;
      if (x > maxX) x = maxX + (x - maxX) * 0.25;
      if (x < minX) x = minX + (x - minX) * 0.25;

      setTrackX(x, false);
      return;
    }

    /* Pull-to-refresh: Home only, top only, downward only */
    if (swipe.axis === "y"){
      const active = PANELS[state.activeIndex];
      if (active !== "home") return;
      if (window.scrollY > 0) return;
      if (dy < 0) return;
      /* do nothing while pulling; decision at end() */
    }
  }

  function end(prevent){
    if (!swipe.active) return;

    const dx = swipe.lastX - swipe.startX;
    const dy = swipe.lastY - swipe.startY;

    const w = trackWidth();
    const dt = Math.max(1, Date.now() - swipe.startT);
    const vx = dx / dt;

    const SWIPE_COMMIT = w * 0.18;
    const VELOCITY_COMMIT = 0.55;

    if (swipe.axis === "x"){
      prevent?.();
      let idx = state.activeIndex;
      if (dx <= -SWIPE_COMMIT || vx <= -VELOCITY_COMMIT) idx++;
      if (dx >=  SWIPE_COMMIT || vx >=  VELOCITY_COMMIT) idx--;
      idx = clamp(idx, 0, PANELS.length - 1);
      snapToIndex(idx, true);
      swipe.active = false;
      swipe.axis = null;
      return;
    }

    if (swipe.axis === "y"){
      const active = PANELS[state.activeIndex];
      if (active === "home" && window.scrollY === 0){
        const PULL_THRESHOLD = 70;
        if (dy >= PULL_THRESHOLD && Math.abs(dx) < 24){
          prevent?.();
          location.reload();
        }
      }
    }

    snapToIndex(state.activeIndex, true);
    swipe.active = false;
    swipe.axis = null;
  }

  viewportEl.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse") return;
    if (!allowSwipeHere(ev.target)) return;
    begin(ev.clientX, ev.clientY);
  });

  viewportEl.addEventListener("pointermove", (ev) => {
    if (!swipe.active) return;
    if (ev.pointerType === "mouse") return;
    move(ev.clientX, ev.clientY, () => { try{ ev.preventDefault(); }catch{} });
  }, { passive:false });

  viewportEl.addEventListener("pointerup", (ev) => {
    if (!swipe.active) return;
    if (ev.pointerType === "mouse") return;
    end(() => { try{ ev.preventDefault(); }catch{} });
  }, { passive:false });

  viewportEl.addEventListener("pointercancel", () => {
    if (!swipe.active) return;
    setTrackX(xForIndex(state.activeIndex), true);
    swipe.active = false;
    swipe.axis = null;
  });

  window.addEventListener("resize", () => {
    if (state.isAddOpen) return;
    setTrackX(xForIndex(state.activeIndex), false);
  });

  return { snapToIndex };
}

/* ---------- Chart Gestures (Horizontal-only, Chart consumes touch) ---------- */

export function initChartGestures({ canvasEl, onChartChanged }){
  function dist2(t1, t2){
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }
  function centerX(t1, t2){
    return (t1.clientX + t2.clientX) / 2;
  }

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
    return state.chart.viewMin + u * (state.chart.viewMax - state.chart.viewMin);
  }

  /* Critical: prevent panel scroll while touching the chart */
  canvasEl.style.touchAction = "none";

  canvasEl.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2){
      e.preventDefault();

      const d = dist2(e.touches[0], e.touches[1]);
      const cx = centerX(e.touches[0], e.touches[1]);
      const anchorTs = screenXToTs(cx);

      state.chart.pinch = {
        dist: d,
        viewMin: state.chart.viewMin,
        viewMax: state.chart.viewMax,
        anchorTs
      };
      state.chart.pan = null;
      return;
    }

    if (e.touches.length === 1){
      e.preventDefault();
      state.chart.pan = {
        x0: e.touches[0].clientX,
        viewMin: state.chart.viewMin,
        viewMax: state.chart.viewMax
      };
      state.chart.pinch = null;
    }
  }, { passive:false });

  canvasEl.addEventListener("touchmove", (e) => {
    if (state.chart.pinch && e.touches.length === 2){
      e.preventDefault();
      const p = state.chart.pinch;

      const newDist = dist2(e.touches[0], e.touches[1]);
      const scale = newDist / (p.dist || 1);

      const startSpan = p.viewMax - p.viewMin;
      let newSpan = startSpan / (scale || 1);
      newSpan = clamp(newSpan, state.chart.minSpan, state.chart.maxSpan);

      let vMin = p.anchorTs - newSpan / 2;
      let vMax = p.anchorTs + newSpan / 2;

      state.chart.viewMin = vMin;
      state.chart.viewMax = vMax;
      clampChartViewToBase();
      onChartChanged?.();
      return;
    }

    if (state.chart.pan && e.touches.length === 1){
      e.preventDefault();

      const { plotW } = plotBounds();
      const dx = e.touches[0].clientX - state.chart.pan.x0;

      const span = (state.chart.pan.viewMax - state.chart.pan.viewMin) || 1;
      const dt = -dx * (span / Math.max(1, plotW));

      state.chart.viewMin = state.chart.pan.viewMin + dt;
      state.chart.viewMax = state.chart.pan.viewMax + dt;
      clampChartViewToBase();
      onChartChanged?.();
    }
  }, { passive:false });

  function end(){
    state.chart.pinch = null;
    state.chart.pan = null;
  }
  canvasEl.addEventListener("touchend", end, { passive:true });
  canvasEl.addEventListener("touchcancel", end, { passive:true });
}

/*
Vitals Tracker (Modular) — js/gestures.js (EOF)
App Version: v2.001
Notes:
- Chart consumes touch so the panel does not scroll during chart interaction.
- Pan/zoom are horizontal-only and clamp to 1–14 days.
- Next expected file: js/chart.js (draw logic + hypertension bands + range label)
*/
