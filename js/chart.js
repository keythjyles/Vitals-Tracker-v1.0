/* File: js/chart.js */
/*
Vitals Tracker — Chart Renderer + Interactions (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023f
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL chart drawing and chart-specific gestures (pan/zoom).
- Must NOT implement panel swipe (gestures.js owns that).

v2.023f — Change Log (THIS FILE ONLY)
1) Restores formatted chart look comparable to v2.021:
   - Y-axis scale labels
   - X-axis day labels (weekday + MM/DD)
   - Alternating day background bands
   - Hypertension bands (with reduced transparency) + legend
2) Keeps pinch zoom + pan (pointer-based).
3) Maintains VTChart API: onShow(), requestRender(), setRenderer().

ASSUMPTIONS
- Records are objects that may contain:
  - ts / time / datetime / createdAt (ms or ISO)
  - sys/systolic, dia/diastolic, hr/heartRate
*/

(function(){
  "use strict";

  const ID_WRAP = "canvasWrap";
  const ID_CANVAS = "chartCanvas";
  const ID_NOTE = "chartsTopNote";

  // ===== Visual constants (match v2.021 spirit) =====
  const AXIS_MIN = 40;
  const AXIS_MAX = 180;
  const AXIS_STEP = 20;

  // Hypertension bands: alpha reduced by ~25% vs typical heavier fills
  const BAND_ALPHA = 0.105;

  const COLORS = Object.freeze({
    grid: "rgba(235,245,255,0.10)",
    frame: "rgba(235,245,255,0.18)",
    text: "rgba(235,245,255,0.70)",
    text2: "rgba(235,245,255,0.55)",
    sys: "rgba(170,220,255,0.95)",
    dia: "rgba(235,245,255,0.80)",
    hr:  "rgba(120,255,180,0.75)",
    dayBand: "rgba(120,180,255,0.06)",

    // BP bands (top is “worse”)
    band_stage2: `rgba(255,90,90,${BAND_ALPHA})`,     // 140–180
    band_stage1: `rgba(255,175,80,${BAND_ALPHA})`,    // 130–139
    band_elev:   `rgba(255,235,140,${BAND_ALPHA})`,   // 120–129
    band_norm:   `rgba(80,150,255,${BAND_ALPHA})`,    // <120
  });

  const state = {
    t0: null,
    t1: null,
    minSpanMs: 6 * 60 * 60 * 1000,
    maxSpanMs: 14 * 24 * 60 * 60 * 1000,
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

    // Default: most recent 7 days ending now (like v2.021 weekly feel)
    const now = Date.now();
    const span = 7 * 24 * 60 * 60 * 1000;
    state.t1 = now;
    state.t0 = now - span;
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
    const ts =
      parseTs(r.ts) ?? parseTs(r.time) ?? parseTs(r.datetime) ?? parseTs(r.createdAt) ??
      parseTs(r.date) ?? parseTs(r.timestamp);

    const sys = r.sys ?? r.systolic ?? r.sbp ?? r.SBP ?? null;
    const dia = r.dia ?? r.diastolic ?? r.dbp ?? r.DBP ?? null;
    const hr  = r.hr  ?? r.heartRate ?? r.pulse ?? r.HR ?? null;

    return { ts, sys: numOrNull(sys), dia: numOrNull(dia), hr: numOrNull(hr) };
  }

  function getRecordsBestEffort(){
    try{ if(Array.isArray(window.records)) return window.records; }catch(_){}

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

  function pickInRange(list, t0, t1){
    const out = [];
    for(const r of list){
      if(r.ts==null) continue;
      if(r.ts >= t0 && r.ts <= t1) out.push(r);
    }
    out.sort((a,b)=>a.ts-b.ts);
    return out;
  }

  function startOfLocalDayMs(ms){
    const d = new Date(ms);
    d.setHours(0,0,0,0);
    return d.getTime();
  }

  function formatTopRange(t0,t1){
    try{
      const a = new Date(t0);
      const b = new Date(t1);
      // match your earlier display style: M/D/YYYY → M/D/YYYY (local)
      const fmt = (d) => d.toLocaleDateString();
      return `${fmt(a)} \u2192 ${fmt(b)} (local)`;
    }catch(_){
      return "";
    }
  }

  function formatDayLabel(ms){
    try{
      const d = new Date(ms);
      // “Sun\n01/04” vibe
      const wd = d.toLocaleDateString(undefined, { weekday:"short" });
      const md = d.toLocaleDateString(undefined, { month:"2-digit", day:"2-digit" });
      return { wd, md };
    }catch(_){
      return { wd:"", md:"" };
    }
  }

  function internalRendererFormatted({ ctx, size, viewport }){
    const { w, h } = size;
    ctx.clearRect(0,0,w,h);

    // Layout similar to v2.021
    const L = Math.floor(w*0.12);   // room for Y labels
    const R = Math.floor(w*0.04);
    const T = Math.floor(h*0.10);
    const B = Math.floor(h*0.16);   // room for X labels
    const pw = w - L - R;
    const ph = h - T - B;

    function xOf(ts){
      const a = (ts - viewport.t0) / (viewport.t1 - viewport.t0);
      return L + clamp(a,0,1) * pw;
    }
    function yOf(v){
      const a = (v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN);
      return T + (1 - clamp(a,0,1)) * ph;
    }

    // ----- Alternating day bands (vertical) -----
    const day0 = startOfLocalDayMs(viewport.t0);
    const dayN = startOfLocalDayMs(viewport.t1) + 24*60*60*1000;
    const dayMs = 24*60*60*1000;

    let i = 0;
    for(let t = day0; t < dayN; t += dayMs, i++){
      if(i % 2 === 1){
        const x0 = xOf(t);
        const x1 = xOf(t + dayMs);
        ctx.fillStyle = COLORS.dayBand;
        ctx.fillRect(Math.floor(x0), Math.floor(T), Math.ceil(x1 - x0), Math.floor(ph));
      }
    }

    // ----- Hypertension bands (horizontal, behind grid) -----
    // Normal: <120, Elevated: 120–129, Stage1: 130–139, Stage2: 140+
    // Render from bottom up within AXIS range.
    function band(yMin, yMax, fill){
      const yy0 = yOf(yMax);
      const yy1 = yOf(yMin);
      ctx.fillStyle = fill;
      ctx.fillRect(L, yy0, pw, yy1 - yy0);
    }
    // Normal (40–119)
    band(AXIS_MIN, 119, COLORS.band_norm);
    // Elevated (120–129)
    band(120, 129, COLORS.band_elev);
    // Stage 1 (130–139)
    band(130, 139, COLORS.band_stage1);
    // Stage 2 (140–180)
    band(140, AXIS_MAX, COLORS.band_stage2);

    // ----- Grid lines + Y labels -----
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    const fontY = Math.max(12, Math.floor(h*0.045));
    ctx.font = `${fontY}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";

    for(let v = AXIS_MIN; v <= AXIS_MAX; v += AXIS_STEP){
      const y = Math.round(yOf(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(L+pw, y);
      ctx.stroke();

      ctx.fillStyle = COLORS.text2;
      ctx.textAlign = "right";
      ctx.fillText(String(v), L - Math.floor(w*0.02), y);
    }

    // ----- Frame -----
    ctx.strokeStyle = COLORS.frame;
    ctx.lineWidth = 1;
    ctx.strokeRect(L+0.5, T+0.5, pw-1, ph-1);

    // ----- Data -----
    const all = getRecordsBestEffort().map(normalizeRecord).filter(r=>r.ts!=null);
    const inView = pickInRange(all, viewport.t0, viewport.t1);

    if(inView.length === 0){
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${Math.max(14, Math.floor(h*0.06))}px system-ui, sans-serif`;
      ctx.fillText("No records in view.", L + 10, T + 30);
      ctx.font = `${Math.max(12, Math.floor(h*0.045))}px system-ui, sans-serif`;
      ctx.fillStyle = COLORS.text2;
      ctx.fillText(`Version: ${vStr()}`, L + 10, T + 54);
      return;
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

    drawSeries("sys", COLORS.sys);
    drawSeries("dia", COLORS.dia);

    // HR is not on BP axis, but v2.021 showed it in-range visually (scaled).
    // We map HR into the same axis band by clamping to AXIS range (keeps it visible).
    // This matches the “single chart” design you’re using.
    drawSeries("hr", COLORS.hr);

    // ----- X-axis day labels (at day starts) -----
    const fontX = Math.max(12, Math.floor(h*0.045));
    ctx.font = `${fontX}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Choose ~5 labels max to avoid clutter on small screens
    const totalDays = Math.max(1, Math.round((viewport.t1 - viewport.t0)/dayMs));
    const stepDays = Math.max(1, Math.ceil(totalDays / 5));

    let labelIndex = 0;
    for(let t = day0; t < dayN; t += dayMs){
      const dayCount = Math.round((t - day0)/dayMs);
      if(dayCount % stepDays !== 0) continue;

      const x = xOf(t);
      if(x < L || x > L+pw) continue;

      const { wd, md } = formatDayLabel(t);
      const yBase = T + ph + Math.floor(h*0.045);

      ctx.fillStyle = COLORS.text2;
      ctx.fillText(wd, x, yBase);
      ctx.fillText(md, x, yBase + Math.floor(fontX*1.05));

      labelIndex++;
      if(labelIndex >= 6) break;
    }

    // ----- Legend (top-left inside plot) -----
    const legX = L + 12;
    const legY = T + 18;
    const legFont = Math.max(12, Math.floor(h*0.05));
    ctx.font = `${legFont}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillStyle = COLORS.sys; ctx.fillText("Systolic", legX, legY);
    ctx.fillStyle = COLORS.dia; ctx.fillText("Diastolic", legX, legY + Math.floor(legFont*1.2));
    ctx.fillStyle = COLORS.hr;  ctx.fillText("Heart Rate", legX, legY + Math.floor(legFont*2.4));

    // Hypertension band legend (right-top)
    const bx = L + pw - Math.floor(w*0.30);
    const by = T + 18;
    const sw = Math.max(14, Math.floor(w*0.03));
    const sh = Math.max(10, Math.floor(h*0.03));
    const gap = Math.max(8, Math.floor(h*0.015));

    function bandLegend(y, fill, label){
      ctx.fillStyle = fill;
      ctx.fillRect(bx, y - sh/2, sw, sh);
      ctx.strokeStyle = "rgba(235,245,255,0.20)";
      ctx.strokeRect(bx+0.5, y - sh/2 + 0.5, sw-1, sh-1);
      ctx.fillStyle = COLORS.text2;
      ctx.fillText(label, bx + sw + 8, y);
    }

    ctx.font = `${Math.max(11, Math.floor(h*0.042))}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    bandLegend(by, COLORS.band_stage2, "Stage 2");
    bandLegend(by + (sh+gap), COLORS.band_stage1, "Stage 1");
    bandLegend(by + 2*(sh+gap), COLORS.band_elev, "Elevated");
    bandLegend(by + 3*(sh+gap), COLORS.band_norm, "Normal");
  }

  function tryBindLegacyRenderer(){
    // If an older renderer exists, we’ll bind it, but our formatted renderer is now strong enough
    // that binding legacy is optional. Still keep this path for compatibility.
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
          catch(_){
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

    // Default: our formatted renderer
    internalRendererFormatted({ canvas, ctx, size, viewport: { t0: state.t0, t1: state.t1 }, version: vStr() });
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

    // Try legacy renderer first; if not found we still render formatted view.
    tryBindLegacyRenderer();

    const note = $(ID_NOTE);
    if(note){
      const s = formatTopRange(state.t0, state.t1);
      if(s) note.textContent = s;
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
 
/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version: v2.023f
Base: v2.021
Touched in v2.023f: js/chart.js (formatted renderer + band legend + axes)
*/
