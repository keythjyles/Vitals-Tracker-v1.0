/* File: js/chart.js */
/*
Vitals Tracker — Chart Renderer + Interactions (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL chart drawing and chart-specific gestures (pan/zoom).
- Must NOT implement panel swipe (gestures.js owns that).

CORE FIXES
1) Async-safe record loading:
   - Prefer VTStore.getAll() (sync) after ensuring VTStore.init()/refresh().
   - Never call async VTStorage.getAllRecords() from a renderer loop.
2) Deterministic renderer binding:
   - Always has an internal renderer (no "no renderer bound").
3) Pointer gestures remain chart-owned and do not conflict with panel swipe
   (gestures.js blocks swipe starts inside #canvasWrap).

VTChart API
- onShow(): prepares viewport, ensures store loaded, binds interactions, renders
- requestRender(): draw with current viewport
- setRenderer(fn): override render function (optional)
*/

(function(){
  "use strict";

  const ID_WRAP   = "canvasWrap";
  const ID_CANVAS = "chartCanvas";
  const ID_NOTE   = "chartsTopNote";

  const state = {
    t0: null,
    t1: null,
    minSpanMs: 6 * 60 * 60 * 1000,          // 6h
    maxSpanMs: 7 * 24 * 60 * 60 * 1000,     // 7d
    pointers: new Map(),
    lastPinchDist: null,
    lastPanX: null,
    renderFn: null,
    bound: false,
    recordsCache: [],
    recordsCacheMs: 0,
    pending: false,
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
      canvas.width = w;
      canvas.height = h;
    }
    return { dpr, rect, w, h };
  }

  function spanMs(){
    return (state.t0!=null && state.t1!=null) ? (state.t1 - state.t0) : null;
  }

  function setDefaultViewportIfMissing(){
    if(state.t0!=null && state.t1!=null) return;
    const now = Date.now();
    state.t1 = now;
    state.t0 = now - state.maxSpanMs;
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
  function midpoint(p1,p2){
    return { x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2 };
  }

  function parseTs(v){
    if(v == null) return null;
    if(typeof v === "number" && isFinite(v)) return v > 1e12 ? v : v*1000;
    if(typeof v === "string"){
      const t = Date.parse(v);
      return isFinite(t) ? t : null;
    }
    return null;
  }

  function numOrNull(x){
    const n = Number(x);
    return (isFinite(n) ? n : null);
  }

  function normalizeRecord(r){
    if(!r || typeof r !== "object") return null;

    const ts =
      parseTs(r.ts) ?? parseTs(r.time) ?? parseTs(r.datetime) ?? parseTs(r.createdAt) ??
      parseTs(r.date) ?? parseTs(r.timestamp);

    if(ts == null) return null;

    const sys = r.sys ?? r.systolic ?? r.sbp ?? r.SBP ?? null;
    const dia = r.dia ?? r.diastolic ?? r.dbp ?? r.DBP ?? null;
    const hr  = r.hr  ?? r.heartRate ?? r.pulse ?? r.HR ?? null;

    return { ts, sys: numOrNull(sys), dia: numOrNull(dia), hr: numOrNull(hr) };
  }

  function pickInRange(list, t0, t1){
    const out = [];
    for(const r of list){
      if(!r || r.ts==null) continue;
      if(r.ts >= t0 && r.ts <= t1) out.push(r);
    }
    out.sort((a,b)=>a.ts-b.ts);
    return out;
  }

  // ===== Records: deterministic + non-async during render =====

  async function ensureRecordsLoaded(){
    // avoid overlapping loads
    if(state.pending) return;
    state.pending = true;

    try{
      // Preferred: VTStore (sync getter) after init/refresh
      if(window.VTStore){
        if(typeof window.VTStore.init === "function") {
          try { await window.VTStore.init(); } catch(_){}
        }
        if(typeof window.VTStore.getAll === "function"){
          const raw = window.VTStore.getAll() || [];
          const norm = raw.map(normalizeRecord).filter(Boolean);
          state.recordsCache = norm;
          state.recordsCacheMs = Date.now();
          return;
        }
      }

      // Fallback: if no VTStore, attempt a ONE-TIME async fetch, then cache
      if(window.VTStorage && typeof window.VTStorage.getAllRecords === "function"){
        const raw = await window.VTStorage.getAllRecords();
        const norm = (Array.isArray(raw) ? raw : []).map(normalizeRecord).filter(Boolean);
        state.recordsCache = norm;
        state.recordsCacheMs = Date.now();
        return;
      }

      // Last resort
      if(Array.isArray(window.records)){
        const norm = window.records.map(normalizeRecord).filter(Boolean);
        state.recordsCache = norm;
        state.recordsCacheMs = Date.now();
        return;
      }

      state.recordsCache = [];
      state.recordsCacheMs = Date.now();
    } finally {
      state.pending = false;
    }
  }

  function getCachedRecords(){
    return Array.isArray(state.recordsCache) ? state.recordsCache : [];
  }

  // ===== Renderer =====

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

    const all = getCachedRecords();
    const inView = pickInRange(all, viewport.t0, viewport.t1);

    if(inView.length === 0){
      ctx.fillStyle = "rgba(235,245,255,0.70)";
      ctx.font = `${Math.max(14, Math.floor(h*0.06))}px system-ui, sans-serif`;
      ctx.fillText("No records in view.", 18, 34);
      ctx.font = `${Math.max(12, Math.floor(h*0.045))}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(235,245,255,0.55)";
      ctx.fillText(`Version: ${vStr()}`, 18, 58);
      return;
    }

    // Determine value ranges
    const vals = [];
    for(const r of inView){
      if(r.sys!=null) vals.push(r.sys);
      if(r.dia!=null) vals.push(r.dia);
      if(r.hr!=null)  vals.push(r.hr);
    }
    let vMin = Math.min(...vals);
    let vMax = Math.max(...vals);
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

    // Grid
    ctx.strokeStyle = "rgba(235,245,255,0.10)";
    ctx.lineWidth = 1;
    const gridN = 4;
    for(let i=0;i<=gridN;i++){
      const y = T + (ph * i/gridN);
      ctx.beginPath(); ctx.moveTo(L,y); ctx.lineTo(L+pw,y); ctx.stroke();
    }

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
          try{ fn({ canvas, ctx, size, viewport, version }); }
          catch(_){ try{ fn(canvas, ctx, viewport); }catch(__){} }
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

    const fn = (typeof state.renderFn === "function") ? state.renderFn : null;
    if(fn){
      try{
        fn({ canvas, ctx, size, viewport: { t0: state.t0, t1: state.t1 }, version: vStr() });
        return;
      }catch(_){
        // fall through to internal
      }
    }

    internalRenderer({ ctx, size, viewport: { t0: state.t0, t1: state.t1 } });
  }

  // ===== Interactions (pointer pan + pinch) =====

  function bindInteractions(){
    const wrap = $(ID_WRAP);
    const canvas = $(ID_CANVAS);
    if(!wrap || !canvas) return;

    // Let the chart own gestures
    canvas.style.touchAction = "none";
    wrap.style.touchAction = "none";

    if(state.bound) return;
    state.bound = true;

    canvas.addEventListener("pointerdown", (e) => {
      try{ canvas.setPointerCapture?.(e.pointerId); }catch(_){}
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
        e.preventDefault();
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

  async function onShow(){
    setDefaultViewportIfMissing();
    bindInteractions();

    // Bind renderer (legacy first), but internal always exists
    tryBindLegacyRenderer();

    // Load records deterministically BEFORE render
    await ensureRecordsLoaded();

    const note = $(ID_NOTE);
    if(note){
      try{
        note.textContent = `${new Date(state.t0).toLocaleDateString()} \u2192 ${new Date(state.t1).toLocaleDateString()} (local)`;
      }catch(_){}
    }

    requestRender();
  }

  function setRenderer(fn){
    state.renderFn = (typeof fn === "function") ? fn : null;
    requestRender();
  }

  window.VTChart = Object.freeze({
    onShow,
    requestRender,
    setRenderer,
    refreshData: async () => { await ensureRecordsLoaded(); requestRender(); },
    getViewport: () => ({ t0: state.t0, t1: state.t1 }),
    setViewport: (t0, t1) => { state.t0=t0; state.t1=t1; requestRender(); }
  });

})();
