/* File: js/chart.js */
/*
Vitals Tracker — Chart Renderer + Interactions (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023d
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL chart drawing AND chart-specific gestures (pan/zoom on chart).
- Must NOT implement panel swipe (gestures.js owns that).
- Must NOT navigate panels.

v2.023d — Change Log (THIS FILE ONLY)
1) Adds pointer/touch interaction layer (pan + pinch zoom) on #canvasWrap/#chartCanvas.
2) Keeps chart read-only (no add/edit/delete here).
3) Provides a stable API: window.VTChart.onShow() + window.VTChart.requestRender().
4) If your existing renderer already draws, call VTChart.requestRender() from it.

IMPORTANT
- This file assumes the canvas exists:
  #canvasWrap and #chartCanvas
- It does not assume any particular data model; it simply maintains a viewport and calls a render hook.

*/

(function(){
  "use strict";

  const ID_WRAP = "canvasWrap";
  const ID_CANVAS = "chartCanvas";
  const ID_NOTE = "chartsTopNote";

  const state = {
    // viewport for time-based charts:
    // t0/t1 are ms timestamps defining what window is visible
    t0: null,
    t1: null,
    // zoom limits (in ms)
    minSpanMs: 6 * 60 * 60 * 1000,   // 6 hours
    maxSpanMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    // gesture tracking
    pointers: new Map(),
    lastPinchDist: null,
    lastPinchCenterX: null,
    lastPanX: null,
    // render hook
    renderFn: null
  };

  function vStr(){
    try{ return window.VTVersion?.getVersionString?.() || "v?.???"; }catch(_){ return "v?.???"; }
  }

  function $(id){ return document.getElementById(id); }

  function ensureCanvasSize(canvas){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if(canvas.width !== w || canvas.height !== h){
      canvas.width = w;
      canvas.height = h;
    }
    return { dpr, rect, w, h };
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function spanMs(){ return (state.t0 != null && state.t1 != null) ? (state.t1 - state.t0) : null; }

  function setDefaultViewportIfMissing(){
    if(state.t0 != null && state.t1 != null) return;

    // Default: last 14 days (matches your screenshot range vibe). Clamp to maxSpan.
    const now = Date.now();
    const maxSpan = state.maxSpanMs;
    const span = maxSpan; // 7 days visible by default
    state.t1 = now;
    state.t0 = now - span;
  }

  function panByPixels(dxPx){
    // dxPx > 0 means finger moved right; chart window should move left (earlier time)
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    const { rect } = canvas.getBoundingClientRect ? {rect: canvas.getBoundingClientRect()} : {rect:{width:1}};
    const w = Math.max(1, rect.width || 1);
    const span = spanMs();
    if(!span) return;
    const msPerPx = span / w;
    const shift = dxPx * msPerPx;
    state.t0 -= shift;
    state.t1 -= shift;
  }

  function zoomAt(centerXPx, zoomFactor){
    // zoomFactor < 1 zooms in, > 1 zooms out
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || 1);

    const tSpan = spanMs();
    if(!tSpan) return;

    const newSpan = clamp(tSpan * zoomFactor, state.minSpanMs, state.maxSpanMs);

    const alpha = clamp(centerXPx / w, 0, 1);
    const centerT = state.t0 + tSpan * alpha;

    state.t0 = centerT - newSpan * alpha;
    state.t1 = state.t0 + newSpan;
  }

  function distance(p1, p2){
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function midpoint(p1, p2){
    return { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
  }

  function requestRender(){
    // If a concrete renderer is registered, call it.
    if(typeof state.renderFn === "function"){
      try{
        const canvas = $(ID_CANVAS);
        if(!canvas) return;
        const ctx = canvas.getContext("2d");
        if(!ctx) return;
        const size = ensureCanvasSize(canvas);
        state.renderFn({ canvas, ctx, size, viewport: { t0: state.t0, t1: state.t1 }, version: vStr() });
      }catch(_){}
    }else{
      // Minimal fallback so you can see it’s alive even if no renderer attached.
      const canvas = $(ID_CANVAS);
      if(!canvas) return;
      const ctx = canvas.getContext("2d");
      if(!ctx) return;
      const { w, h } = ensureCanvasSize(canvas);
      ctx.clearRect(0,0,w,h);
      ctx.globalAlpha = 0.9;
      ctx.font = `${Math.max(12, Math.floor(h*0.05))}px system-ui, sans-serif`;
      ctx.fillText("Chart engine ready (no renderer bound).", 16, 32);
      ctx.fillText(`Viewport: ${new Date(state.t0).toLocaleString()} → ${new Date(state.t1).toLocaleString()}`, 16, 56);
      ctx.fillText(`Version: ${vStr()}`, 16, 80);
    }
  }

  function bindInteractions(){
    const wrap = $(ID_WRAP);
    const canvas = $(ID_CANVAS);
    if(!wrap || !canvas) return;

    // Make sure pointer events behave predictably
    canvas.style.touchAction = "none";
    wrap.style.touchAction = "none";

    const onPointerDown = (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      state.lastPanX = e.clientX;
      if(state.pointers.size === 2){
        const pts = Array.from(state.pointers.values());
        state.lastPinchDist = distance(pts[0], pts[1]);
        state.lastPinchCenterX = midpoint(pts[0], pts[1]).x - canvas.getBoundingClientRect().left;
      }
    };

    const onPointerMove = (e) => {
      if(!state.pointers.has(e.pointerId)) return;

      const prev = state.pointers.get(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if(state.pointers.size === 1){
        // pan
        const dx = e.clientX - (state.lastPanX ?? e.clientX);
        state.lastPanX = e.clientX;
        panByPixels(dx);
        requestRender();
        return;
      }

      if(state.pointers.size === 2){
        const pts = Array.from(state.pointers.values());
        const dist = distance(pts[0], pts[1]);
        const rect = canvas.getBoundingClientRect();
        const cx = midpoint(pts[0], pts[1]).x - rect.left;

        if(state.lastPinchDist != null && state.lastPinchDist > 0){
          const ratio = dist / state.lastPinchDist;
          // ratio > 1 means fingers apart => zoom out; invert for nicer feel
          const zoomFactor = 1 / ratio;
          zoomAt(cx, zoomFactor);
        }

        state.lastPinchDist = dist;
        state.lastPinchCenterX = cx;

        requestRender();
      }
    };

    const onPointerUp = (e) => {
      state.pointers.delete(e.pointerId);
      if(state.pointers.size < 2){
        state.lastPinchDist = null;
        state.lastPinchCenterX = null;
      }
      if(state.pointers.size === 0){
        state.lastPanX = null;
      }
    };

    // Bind once
    if(canvas.dataset.vtChartBound === "1") return;
    canvas.dataset.vtChartBound = "1";

    canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp, { passive: true });
    canvas.addEventListener("pointercancel", onPointerUp, { passive: true });
  }

  function onShow(){
    setDefaultViewportIfMissing();
    bindInteractions();
    requestRender();
    // Update the top note if present (non-authoritative)
    const note = $(ID_NOTE);
    if(note){
      try{
        note.textContent = `${new Date(state.t0).toLocaleDateString()} → ${new Date(state.t1).toLocaleDateString()} (local)`;
      }catch(_){}
    }
  }

  function setRenderer(fn){
    // fn({canvas, ctx, size, viewport:{t0,t1}, version})
    state.renderFn = fn;
  }

  // Public API
  window.VTChart = Object.freeze({
    onShow,
    requestRender,
    setRenderer,
    getViewport: () => ({ t0: state.t0, t1: state.t1 }),
    setViewport: (t0, t1) => { state.t0 = t0; state.t1 = t1; requestRender(); }
  });

})();
