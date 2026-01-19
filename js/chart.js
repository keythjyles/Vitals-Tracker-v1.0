/* File: js/chart.js */
/*
Vitals Tracker — Chart Renderer + Interactions (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.024
Base: v2.023e
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL chart drawing + chart-specific gestures (pan/zoom).
- Must NOT implement panel swipe (gestures.js owns that).

v2.024 — Change Log (THIS FILE ONLY)
1) Restores the FORMATTED renderer (bands + alternating day stripes + axes + legend + labels).
2) Keeps pinch-zoom + pan on the chart (pointer events).
3) Viewport rules:
   - Default = last 7 days ending at newest record timestamp.
   - Zoom min = 1 day, max = 14 days.
   - Pan is clamped to dataset start/end (cannot pan past data).
4) Bands opacity: +35% more opaque than prior v2.021-style levels.
5) Maintains VTChart API: onShow(), requestRender(), setRenderer(), setViewport(), getViewport().

ASSUMPTIONS
- Records may contain:
  - ts / time / datetime / createdAt (ms or ISO)
  - sys/systolic, dia/diastolic, hr/heartRate
- Records are sourced best-effort from:
  window.VTStore / window.VTState / window.VTStorage / window.records
*/

(function(){
  "use strict";

  const ID_WRAP  = "canvasWrap";
  const ID_CANVAS= "chartCanvas";
  const ID_NOTE  = "chartsTopNote";

  const state = {
    t0: null,
    t1: null,
    // Zoom constraints
    minSpanMs:  24 * 60 * 60 * 1000,   // 1 day
    maxSpanMs:  14 * 24 * 60 * 60 * 1000, // 14 days
    defaultSpanMs: 7 * 24 * 60 * 60 * 1000, // 7 days default

    pointers: new Map(),
    lastPinchDist: null,
    lastPanX: null,

    // Renderer injection (optional)
    renderFn: null,

    // Cached dataset bounds (ms)
    dataMinT: null,
    dataMaxT: null,

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

  function spanMs(){
    return (state.t0!=null && state.t1!=null) ? (state.t1 - state.t0) : null;
  }

  function parseTs(v){
    if(v == null) return null;
    if(typeof v === "number" && isFinite(v)) return v > 1e12 ? v : v*1000; // allow seconds
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

  function getNormalizedAll(){
    return getRecordsBestEffort().map(normalizeRecord).filter(r => r.ts != null);
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

  function computeDataBounds(all){
    if(!all || all.length === 0){
      state.dataMinT = null;
      state.dataMaxT = null;
      return;
    }
    let mn = Infinity, mx = -Infinity;
    for(const r of all){
      if(r.ts == null) continue;
      if(r.ts < mn) mn = r.ts;
      if(r.ts > mx) mx = r.ts;
    }
    if(isFinite(mn) && isFinite(mx)){
      state.dataMinT = mn;
      state.dataMaxT = mx;
    }else{
      state.dataMinT = null;
      state.dataMaxT = null;
    }
  }

  function setDefaultViewport(){
    const all = getNormalizedAll();
    computeDataBounds(all);

    if(state.dataMaxT == null){
      // No data: show last 7 days from now
      const now = Date.now();
      state.t1 = now;
      state.t0 = now - state.defaultSpanMs;
      return;
    }

    // Default: last 7 days ending at newest record time
    const end = state.dataMaxT;
    const start = end - state.defaultSpanMs;

    // If dataset is shorter than 7 days, expand to include earliest (but keep 7-day span if possible)
    state.t1 = end;
    state.t0 = start;

    // Clamp to dataset bounds (so initial view does not overshoot left if data is short)
    clampViewportToData();
  }

  function clampViewportToData(){
    if(state.t0==null || state.t1==null) return;
    const sp = spanMs();
    if(!sp) return;

    // Always enforce zoom constraints first
    const newSpan = clamp(sp, state.minSpanMs, state.maxSpanMs);
    if(newSpan !== sp){
      // Keep right edge anchored during constraint correction
      state.t1 = state.t0 + newSpan;
    }

    // If we have dataset bounds, clamp pan so viewport stays within [dataMinT, dataMaxT]
    if(state.dataMinT != null && state.dataMaxT != null){
      const d0 = state.dataMinT;
      const d1 = state.dataMaxT;

      // If dataset span is smaller than viewport span, center around dataset (but still show something stable)
      const dataSpan = Math.max(1, d1 - d0);
      const viewSpan = Math.max(1, state.t1 - state.t0);

      if(dataSpan <= viewSpan){
        // Center on dataset mid
        const mid = d0 + dataSpan/2;
        state.t0 = mid - viewSpan/2;
        state.t1 = state.t0 + viewSpan;
        return;
      }

      // Normal clamp
      if(state.t0 < d0){
        state.t0 = d0;
        state.t1 = state.t0 + viewSpan;
      }
      if(state.t1 > d1){
        state.t1 = d1;
        state.t0 = state.t1 - viewSpan;
      }
    }
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

    clampViewportToData();
  }

  function zoomAt(centerXPx, zoomFactor){
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || 1);

    const sp = spanMs(); if(!sp) return;
    const targetSpan = clamp(sp * zoomFactor, state.minSpanMs, state.maxSpanMs);

    const alpha = clamp(centerXPx / w, 0, 1);
    const centerT = state.t0 + sp * alpha;

    state.t0 = centerT - targetSpan * alpha;
    state.t1 = state.t0 + targetSpan;

    clampViewportToData();
  }

  function distance(p1,p2){
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    return Math.sqrt(dx*dx + dy*dy);
  }
  function midpoint(p1,p2){ return { x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2 }; }

  function fmtDateShort(d){
    try{
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const dd = String(d.getDate()).padStart(2,"0");
      return `${mm}/${dd}`;
    }catch(_){ return ""; }
  }
  function fmtDow(d){
    try{
      return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()] || "";
    }catch(_){ return ""; }
  }
  function startOfDayLocal(t){
    const d = new Date(t);
    d.setHours(0,0,0,0);
    return d.getTime();
  }

  // --- Formatted renderer ---
  function formattedRenderer({ ctx, size, viewport }){
    const { w, h } = size;

    ctx.clearRect(0,0,w,h);

    // Chart frame area
    const pad = Math.max(10, Math.floor(w*0.02));
    const L = Math.floor(w*0.12);
    const R = Math.floor(w*0.04);
    const T = Math.floor(h*0.10);
    const B = Math.floor(h*0.18);
    const pw = Math.max(1, w - L - R);
    const ph = Math.max(1, h - T - B);

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0,0,w,h);

    // Rounded-ish panel fill (simple)
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(pad, pad, w-pad*2, h-pad*2);

    // Data
    const all = getNormalizedAll();
    computeDataBounds(all);

    const inView = pickInRange(all, viewport.t0, viewport.t1);

    // Helpers
    function xOf(ts){
      const a = (ts - viewport.t0) / (viewport.t1 - viewport.t0);
      return L + clamp(a,0,1) * pw;
    }

    // If no data: message + frame
    if(inView.length === 0){
      // Frame
      ctx.strokeStyle = "rgba(235,245,255,0.18)";
      ctx.lineWidth = Math.max(1, Math.floor(w*0.002));
      ctx.strokeRect(pad+0.5,pad+0.5,w-pad*2-1,h-pad*2-1);

      ctx.fillStyle = "rgba(235,245,255,0.72)";
      ctx.font = `${Math.max(16, Math.floor(h*0.06))}px system-ui, sans-serif`;
      ctx.fillText("No records in view.", pad+14, pad+34);
      ctx.font = `${Math.max(12, Math.floor(h*0.045))}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(235,245,255,0.55)";
      ctx.fillText(`Version: ${vStr()}`, pad+14, pad+58);
      return;
    }

    // Value ranges (use BP + HR but keep BP primary scale)
    const valsBP = [];
    const valsHR = [];
    for(const r of inView){
      if(r.sys!=null) valsBP.push(r.sys);
      if(r.dia!=null) valsBP.push(r.dia);
      if(r.hr!=null) valsHR.push(r.hr);
    }

    // Determine y-scale: include both, but prioritize BP bounds with reasonable padding.
    let vMin = Math.min(...valsBP, ...(valsHR.length?valsHR:[Infinity]));
    let vMax = Math.max(...valsBP, ...(valsHR.length?valsHR:[-Infinity]));
    if(!isFinite(vMin) || !isFinite(vMax)){
      vMin = 40; vMax = 180;
    }
    if(vMax - vMin < 30){
      vMin -= 15; vMax += 15;
    }else{
      const p = (vMax - vMin) * 0.12;
      vMin -= p; vMax += p;
    }

    // Clamp to sensible chart bounds
    vMin = Math.max(20, Math.floor(vMin));
    vMax = Math.min(260, Math.ceil(vMax));

    function yOf(v){
      const a = (v - vMin) / (vMax - vMin);
      return T + (1 - clamp(a,0,1)) * ph;
    }

    // --- Alternating day stripes (within plot area) ---
    const day0 = startOfDayLocal(viewport.t0);
    const day1 = startOfDayLocal(viewport.t1) + 24*60*60*1000;
    const dayMs = 24*60*60*1000;

    let dayIdx = 0;
    for(let t = day0; t < day1; t += dayMs, dayIdx++){
      const x0 = xOf(t);
      const x1 = xOf(t + dayMs);
      const stripeW = Math.max(0, x1 - x0);
      if(stripeW <= 0) continue;

      // Match prior look: subtle alternating bands
      ctx.fillStyle = (dayIdx % 2 === 0) ? "rgba(120,180,255,0.06)" : "rgba(0,0,0,0.02)";
      ctx.fillRect(x0, T, stripeW, ph);
    }

    // --- Hypertension bands (more opaque by +35%) ---
    // Prior baseline assumed modest alpha; we set explicit targets and apply +35% multiplier.
    const OP_MUL = 1.35;

    // Colors are kept in the same “glass” family; opacities are the requested part.
    // Bands are drawn across full plot area between y ranges.
    const bands = [
      // Normal (sys<120 AND dia<80) -> approximate region <=120 and <=80
      { name:"Normal", y0: yOf(120), y1: yOf(vMin), fill:`rgba(70,140,255,${0.06*OP_MUL})` },

      // Elevated (sys 120-129 and dia <80) -> approximate 120-130
      { name:"Elevated", y0: yOf(130), y1: yOf(120), fill:`rgba(255,210,90,${0.06*OP_MUL})` },

      // Stage 1 (130-139 OR 80-89) -> 130-140 region
      { name:"Stage 1", y0: yOf(140), y1: yOf(130), fill:`rgba(255,170,80,${0.08*OP_MUL})` },

      // Stage 2 (>=140 OR >=90) -> 140-180 region
      { name:"Stage 2", y0: yOf(180), y1: yOf(140), fill:`rgba(255,120,120,${0.10*OP_MUL})` },

      // Crisis (>=180 OR >=120) -> 180+ region
      { name:"Crisis", y0: yOf(vMax), y1: yOf(180), fill:`rgba(255,70,70,${0.12*OP_MUL})` },
    ];

    // Draw in correct order (top bands last so they sit “above”)
    for(const b of bands){
      const top = Math.min(b.y0, b.y1);
      const bot = Math.max(b.y0, b.y1);
      if(bot <= T || top >= T+ph) continue;
      ctx.fillStyle = b.fill;
      ctx.fillRect(L, top, pw, bot-top);
    }

    // --- Grid lines + y-axis ticks ---
    const gridN = 7;
    ctx.strokeStyle = "rgba(235,245,255,0.12)";
    ctx.lineWidth = 1;

    const tickVals = [];
    // Choose tick step
    const span = vMax - vMin;
    let step = 20;
    if(span <= 80) step = 10;
    else if(span <= 140) step = 20;
    else step = 25;

    const firstTick = Math.ceil(vMin/step)*step;
    for(let v = firstTick; v <= vMax; v += step) tickVals.push(v);

    // Horizontal grid + labels
    ctx.font = `${Math.max(10, Math.floor(h*0.04))}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(235,245,255,0.50)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for(const v of tickVals){
      const y = yOf(v);
      if(y < T || y > T+ph) continue;
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(L+pw, y);
      ctx.stroke();
      ctx.fillText(String(v), L - 8, y);
    }

    // Vertical reference lines: show at day boundaries (subtle)
    ctx.strokeStyle = "rgba(235,245,255,0.10)";
    for(let t = day0; t < day1; t += dayMs){
      const x = xOf(t);
      ctx.beginPath();
      ctx.moveTo(x, T);
      ctx.lineTo(x, T+ph);
      ctx.stroke();
    }

    // --- Series lines ---
    function drawSeries(key, stroke, widthScale){
      const pts = inView.filter(r => r[key]!=null);
      if(pts.length < 2) return;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(2, Math.floor(w*widthScale));
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

    // Match your prior palette: sys bright, dia dimmer, HR green.
    drawSeries("sys", "rgba(235,245,255,0.88)", 0.0042);
    drawSeries("dia", "rgba(235,245,255,0.62)", 0.0036);
    drawSeries("hr",  "rgba(120,255,180,0.70)", 0.0036);

    // --- Frame around plot ---
    ctx.strokeStyle = "rgba(235,245,255,0.18)";
    ctx.lineWidth = Math.max(1, Math.floor(w*0.002));
    ctx.strokeRect(L+0.5, T+0.5, pw-1, ph-1);

    // --- Legend (top-left inside plot) ---
    const legX = L + 10;
    let legY = T + 18;

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${Math.max(12, Math.floor(h*0.045))}px system-ui, sans-serif`;

    ctx.fillStyle = "rgba(235,245,255,0.90)";
    ctx.fillText("Systolic", legX, legY);
    legY += 18;

    ctx.fillStyle = "rgba(235,245,255,0.62)";
    ctx.fillText("Diastolic", legX, legY);
    legY += 18;

    ctx.fillStyle = "rgba(120,255,180,0.70)";
    ctx.fillText("Heart Rate", legX, legY);

    // --- X-axis day labels (bottom) ---
    ctx.font = `${Math.max(11, Math.floor(h*0.040))}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(235,245,255,0.55)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Label every ~3 days, but ensure first/last present when possible
    const totalDays = Math.max(1, Math.round((viewport.t1 - viewport.t0)/dayMs));
    const stride = (totalDays <= 7) ? 2 : 3;

    let labelCount = 0;
    for(let t = day0; t < day1; t += dayMs){
      const d = new Date(t);
      const x = xOf(t + dayMs/2);
      const should =
        (labelCount % stride === 0) ||
        (t === day0) ||
        (t + dayMs >= day1 - 1);

      if(should){
        const txt1 = fmtDow(d);
        const txt2 = fmtDateShort(d);
        ctx.fillText(txt1, x, T+ph+8);
        ctx.fillText(txt2, x, T+ph+22);
      }
      labelCount++;
    }
  }

  function requestRender(){
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    const size = ensureCanvasSize(canvas);

    // If an external renderer is set, prefer it; otherwise use formatted renderer.
    if(typeof state.renderFn === "function"){
      try{
        state.renderFn({ canvas, ctx, size, viewport: { t0: state.t0, t1: state.t1 }, version: vStr() });
        return;
      }catch(_){}
    }

    formattedRenderer({ ctx, size, viewport: { t0: state.t0, t1: state.t1 } });
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
          // ratio > 1 => fingers apart => zoom in (smaller span)
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

  function updateTopNote(){
    const note = $(ID_NOTE);
    if(!note) return;
    try{
      const d0 = new Date(state.t0);
      const d1 = new Date(state.t1);
      note.textContent = `${d0.toLocaleDateString()} \u2192 ${d1.toLocaleDateString()} (local)`;
    }catch(_){}
  }

  function onShow(){
    // Compute default viewport if missing OR if dataset bounds changed
    if(state.t0==null || state.t1==null){
      setDefaultViewport();
    }else{
      // Refresh bounds and clamp any drift
      computeDataBounds(getNormalizedAll());
      clampViewportToData();
    }

    bindInteractions();
    updateTopNote();
    requestRender();
  }

  function setRenderer(fn){
    state.renderFn = (typeof fn === "function") ? fn : null;
    requestRender();
  }

  function setViewport(t0, t1){
    const a = parseTs(t0);
    const b = parseTs(t1);
    if(a==null || b==null) return;
    state.t0 = Math.min(a,b);
    state.t1 = Math.max(a,b);
    computeDataBounds(getNormalizedAll());
    clampViewportToData();
    updateTopNote();
    requestRender();
  }

  window.VTChart = Object.freeze({
    onShow,
    requestRender,
    setRenderer,
    getViewport: () => ({ t0: state.t0, t1: state.t1 }),
    setViewport
  });

})();
