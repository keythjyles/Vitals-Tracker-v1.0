/* File: js/chart.js */
/*
Vitals Tracker — Chart Renderer + Interactions (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023e
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL chart drawing and chart-specific gestures (pan/zoom).
- Must NOT implement panel swipe (gestures.js owns that).

v2.023e — Change Log (THIS FILE ONLY)
1) Restores a renderer:
   - First tries to bind to an existing/legacy renderer if present.
   - If none exists, uses internal renderer that draws Systolic/Diastolic/HR.
2) Keeps pan + pinch zoom on the chart.
3) Maintains VTChart API: onShow(), requestRender(), setRenderer().

ASSUMPTIONS
- Records are objects that may contain:
  - ts / time / datetime / createdAt (ms or ISO)
  - sys/systolic, dia/diastolic, hr/heartRate
- We try multiple module sources to find records:
  VTStore, VTState, VTStorage, window.records
*/

(function(){
  "use strict";

  const ID_WRAP = "canvasWrap";
  const ID_CANVAS = "chartCanvas";
  const ID_NOTE = "chartsTopNote";

  const state = {
    t0: null,
    t1: null,
    minSpanMs: 6 * 60 * 60 * 1000,
    maxSpanMs: 7 * 24 * 60 * 60 * 1000,
    pointers: new Map(),
    lastPinchDist: null,
    lastPanX: null,
    renderFn: null,
    _bound: false,
  };

  function vStr(){
    try{ return window.VTVersion?.getVersionString?.() || "v?.???"; }catch(_){ return "v?.???"; }
  }
  function $(id){ return document.getElementById(id); }
  function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

  function ensureCanvasSize(canvas){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if(canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }
    return { dpr, rect, w, h };
  }

  function spanMs(){ return (state.t0!=null && state.t1!=null) ? (state.t1 - state.t0) : null; }

  function setDefaultViewportIfMissing(){
    if(state.t0!=null && state.t1!=null) return;
    const now = Date.now();
    state.t1 = now;
    state.t0 = now - state.maxSpanMs; // default 7 days
  }

  function panByPixels(dxPx){
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || 1);
    const sp = spanMs(); if(!sp) return;
    const msPerPx = sp / w;
    const shift = dxPx * msPerPx;
    state.t0 -= shift;
    state.t1 -= shift;
  }

  function zoomAt(centerXPx, zoomFactor){
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || 1);

    const sp = spanMs(); if(!sp) return;
    const newSpan = clamp(sp * zoomFactor, state.minSpanMs, state.maxSpanMs);

    const alpha = clamp(centerXPx / w, 0, 1);
    const centerT = state.t0 + sp * alpha;

    state.t0 = centerT - newSpan * alpha;
    state.t1 = state.t0 + newSpan;
  }

  function distance(p1,p2){
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function midpoint(p1,p2){ return { x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2 }; }

  function parseTs(v){
    if(v == null) return null;
    if(typeof v === "number" && isFinite(v)) return v > 1e12 ? v : v*1000; // allow seconds
    if(typeof v === "string"){
      const t = Date.parse(v);
      return isFinite(t) ? t : null;
    }
    return null;
  }

  function getRecordsBestEffort(){
    // Try common store/state surfaces (best-effort, non-throwing).
    try{
      if(Array.isArray(window.records)) return window.records;
    }catch(_){}

    try{
      if(window.VTState){
        if(Array.isArray(window.VTState.records)) return window.VTState.records;
        if(typeof window.VTState.getRecords === "function") return window.VTState.getRecords() || [];
      }
    }catch(_){}

    try{
      if(window.VTStore){
        if(typeof window.VTStore.getAll === "function") return window.VTStore.getAll() || [];
        if(typeof window.VTStore.getRecords === "function") return window.VTStore.getRecords() || [];
        if(Array.isArray(window.VTStore.records)) return window.VTStore.records;
      }
    }catch(_){}

    try{
      if(window.VTStorage){
        if(typeof window.VTStorage.getAllRecords === "function") return window.VTStorage.getAllRecords() || [];
        if(typeof window.VTStorage.loadAll === "function") return window.VTStorage.loadAll() || [];
      }
    }catch(_){}

    return [];
  }

  function normalizeRecord(r){
    const ts =
      parseTs(r.ts) ?? parseTs(r.time) ?? parseTs(r.datetime) ?? parseTs(r.createdAt) ??
      parseTs(r.date) ?? parseTs(r.timestamp);

    const sys = r.sys ?? r.systolic ?? r.sbp ?? r.SBP ?? null;
    const dia = r.dia ?? r.diastolic ?? r.dbp ?? r.DBP ?? null;
    const hr  = r.hr  ?? r.heartRate ?? r.pulse ?? r.HR ?? null;

    return { ts, sys: numOrNull(sys), dia: numOrNull(dia), hr: numOrNull(hr) };
  }

  function numOrNull(x){
    const n = Number(x);
    return (isFinite(n) ? n : null);
  }

  function pickInRange(list, t0, t1){
    const out = [];
    for(const r of list){
      if(r.ts==null) continue;
      if(r.ts >= t0 && r.ts <= t1) out.push(r);
    }
    out.sort((a,b)=>a.ts-b.ts);
    return out;
  }

  function internalRenderer({ ctx, size, viewport }){
    const { w, h } = size;
    ctx.clearRect(0,0,w,h);

    // Background
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0,0,w,h);

    // Frame
    ctx.strokeStyle = "rgba(235,245,255,0.18)";
    ctx.lineWidth = Math.max(1, Math.floor(w*0.002));
    ctx.strokeRect(0.5,0.5,w-1,h-1);

    const all = getRecordsBestEffort().map(normalizeRecord).filter(r=>r.ts!=null);
    const inView = pickInRange(all, viewport.t0, viewport.t1);

    // If no data, show message
    if(inView.length === 0){
      ctx.fillStyle = "rgba(235,245,255,0.70)";
      ctx.font = `${Math.max(14, Math.floor(h*0.06))}px system-ui, sans-serif`;
      ctx.fillText("No records in view.", 18, 34);
      ctx.font = `${Math.max(12, Math.floor(h*0.045))}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(235,245,255,0.55)";
      ctx.fillText(`Version: ${vStr()}`, 18, 58);
      return;
    }

    // Determine value ranges (BP + HR)
    const vals = [];
    for(const r of inView){
      if(r.sys!=null) vals.push(r.sys);
      if(r.dia!=null) vals.push(r.dia);
      if(r.hr!=null)  vals.push(r.hr);
    }
    let vMin = Math.min(...vals);
    let vMax = Math.max(...vals);
    // pad
    const pad = Math.max(8, (vMax - vMin) * 0.10);
    vMin -= pad; vMax += pad;

    // Plot area
    const L = Math.floor(w*0.09);
    const R = Math.floor(w*0.03);
    const T = Math.floor(h*0.10);
    const B = Math.floor(h*0.12);
    const pw = w - L - R;
    const ph = h - T - B;

    function xOf(ts){
      const a = (ts - viewport.t0) / (viewport.t1 - viewport.t0);
      return L + clamp(a,0,1) * pw;
    }
    function yOf(v){
      const a = (v - vMin) / (vMax - vMin);
      return T + (1 - clamp(a,0,1)) * ph;
    }

    // Light grid
    ctx.strokeStyle = "rgba(235,245,255,0.10)";
    ctx.lineWidth = 1;
    const gridN = 4;
    for(let i=0;i<=gridN;i++){
      const y = T + (ph * i/gridN);
      ctx.beginPath(); ctx.moveTo(L,y); ctx.lineTo(L+pw,y); ctx.stroke();
    }

    // Series drawer
    function drawSeries(key, stroke){
      const pts = inView.filter(r => r[key]!=null);
      if(pts.length < 2) return;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(2, Math.floor(w*0.004));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for(let i=0;i<pts.length;i++){
        const x = xOf(pts[i].ts);
        const y = yOf(pts[i][key]);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }

    // Match your look: systolic light, diastolic light, HR greenish
    drawSeries("sys", "rgba(235,245,255,0.75)");
    drawSeries("dia", "rgba(235,245,255,0.55)");
    drawSeries("hr",  "rgba(120,255,180,0.65)");

    // Legend
    ctx.font = `${Math.max(12, Math.floor(h*0.05))}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(235,245,255,0.75)";
    ctx.fillText("Systolic", L+10, T+18);
    ctx.fillStyle = "rgba(235,245,255,0.55)";
    ctx.fillText("Diastolic", L+10, T+38);
    ctx.fillStyle = "rgba(120,255,180,0.65)";
    ctx.fillText("Heart Rate", L+10, T+58);
  }

  function tryBindLegacyRenderer(){
    // If your older renderer exists anywhere, bind it here.
    // We support several common names so you don’t have to refactor everything at once.
    const candidates = [
      window.VTChartRenderer,
      window.renderVitalsChart,
      window.renderChart,
      window.VTCharts?.render,
      window.VTChart?.renderLegacy
    ];

    for(const fn of candidates){
      if(typeof fn === "function"){
        state.renderFn = ({ canvas, ctx, size, viewport, version }) => {
          // call legacy with best-effort signature tolerance
          try{
            fn({ canvas, ctx, size, viewport, version });
          }catch(_){
            try{ fn(canvas, ctx, viewport); }catch(__){}
          }
        };
        return true;
      }
    }
    return false;
  }

  function requestRender(){
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    const size = ensureCanvasSize(canvas);

    if(typeof state.renderFn === "function"){
      try{
        state.renderFn({ canvas, ctx, size, viewport: { t0: state.t0, t1: state.t1 }, version: vStr() });
        return;
      }catch(_){}
    }

    // Default: internal renderer
    internalRenderer({ canvas, ctx, size, viewport: { t0: state.t0, t1: state.t1 }, version: vStr() });
  }

  function bindInteractions(){
    const wrap = $(ID_WRAP);
    const canvas = $(ID_CANVAS);
    if(!wrap || !canvas) return;

    canvas.style.touchAction = "none";
    wrap.style.touchAction = "none";

    if(state._bound) return;
    state._bound = true;

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      state.lastPanX = e.clientX;
      if(state.pointers.size === 2){
        const pts = Array.from(state.pointers.values());
        state.lastPinchDist = distance(pts[0], pts[1]);
      }
    }, { passive:true });

    canvas.addEventListener("pointermove", (e) => {
      if(!state.pointers.has(e.pointerId)) return;

      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if(state.pointers.size === 1){
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

        if(state.lastPinchDist && state.lastPinchDist > 0){
          const ratio = dist / state.lastPinchDist;
          const zoomFactor = 1 / ratio;
          zoomAt(cx, zoomFactor);
        }
        state.lastPinchDist = dist;
        requestRender();
      }
    }, { passive:false });

    const end = (e) => {
      state.pointers.delete(e.pointerId);
      if(state.pointers.size < 2) state.lastPinchDist = null;
      if(state.pointers.size === 0) state.lastPanX = null;
    };
    canvas.addEventListener("pointerup", end, { passive:true });
    canvas.addEventListener("pointercancel", end, { passive:true });
  }

  function onShow(){
    setDefaultViewportIfMissing();
    bindInteractions();

    // Bind renderer (legacy first). If none, internal renderer will run.
    tryBindLegacyRenderer();

    // Update top note
    const note = $(ID_NOTE);
    if(note){
      try{
        note.textContent = `${new Date(state.t0).toLocaleDateString()} \u2192 ${new Date(state.t1).toLocaleDateString()} (local)`;
      }catch(_){}
    }

    requestRender();
  }

  function setRenderer(fn){ state.renderFn = fn; requestRender(); }

  window.VTChart = Object.freeze({
    onShow,
    requestRender,
    setRenderer,
    getViewport: () => ({ t0: state.t0, t1: state.t1 }),
    setViewport: (t0, t1) => { state.t0=t0; state.t1=t1; requestRender(); }
  });

})();
