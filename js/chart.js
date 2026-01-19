/* File: js/chart.js */
/*
Vitals Tracker — Charts Engine
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns chart rendering only: canvas sizing, scaling, bands, legend rendering, and chart interactions.
- Must NOT own panel show/hide rules (panels.js owns that).
- Must NOT own global swipe rules (gestures.js owns that).
- Must NOT own storage init (store/storage owns that), but may read from store defensively.

v2.025f — Change Log (THIS FILE ONLY)
1) Deterministic, non-duplicating legend rendering (color-coded chips matching bands).
2) Chart render is idempotent: clears previous draw every time; no “append” accumulation.
3) Smooth pinch zoom + pan on the chart canvas (no snapping to datapoints).
4) Y-scale rule:
   - Floor always 40
   - Ceiling = min(highest observed + 10, 250)
   - Uses max of (systolic, diastolic, HR) observed in current viewport
5) Background BP bands drawn once per render and aligned to thresholds.

Schema position:
File 9 of 10
*/

(function(){
  "use strict";

  const VTChart = {};
  window.VTChart = VTChart;

  // ---------- helpers ----------
  function $(id){ return document.getElementById(id); }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function nowMs(){ return Date.now(); }

  function safeNum(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function parseTimeMs(rec){
    // Accept: rec.ts (ms), rec.time (ms), rec.datetime ISO, rec.date + rec.timeStr, etc.
    if(!rec) return null;

    const ts = safeNum(rec.ts ?? rec.time ?? rec.t ?? rec.timestamp);
    if(ts != null && ts > 0) return ts;

    const dt = (rec.datetime ?? rec.dateTime ?? rec.iso ?? rec.dateISO ?? rec.date_time);
    if(typeof dt === "string"){
      const ms = Date.parse(dt);
      if(Number.isFinite(ms)) return ms;
    }

    // common split fields
    const d = rec.date || rec.day || rec.d;
    const tm = rec.timeStr || rec.time_str || rec.time || rec.tm;
    if(typeof d === "string" && typeof tm === "string"){
      const ms = Date.parse(`${d}T${tm}`);
      if(Number.isFinite(ms)) return ms;
    }
    return null;
  }

  function getBP(rec){
    const s = safeNum(rec.sys ?? rec.systolic ?? rec.SYS ?? rec.Systolic);
    const d = safeNum(rec.dia ?? rec.diastolic ?? rec.DIA ?? rec.Diastolic);
    return { s, d };
  }

  function getHR(rec){
    const hr = safeNum(rec.hr ?? rec.heartRate ?? rec.heart_rate ?? rec.HR);
    return hr;
  }

  function bestRecordsFromStore(){
    // defensive: accept multiple store shapes without throwing
    const S = window.VTStore;
    if(!S) return [];
    try{
      if(typeof S.getAll === "function") return S.getAll() || [];
      if(typeof S.list === "function") return S.list() || [];
      if(typeof S.getRecords === "function") return S.getRecords() || [];
      if(Array.isArray(S.records)) return S.records;
      if(S.state && Array.isArray(S.state.records)) return S.state.records;
    }catch(_){}
    return [];
  }

  function shouldShowLegendOnce(container){
    if(!container) return false;
    return container.dataset && container.dataset.vtLegendBuilt !== "1";
  }

  function markLegendBuilt(container){
    if(container && container.dataset) container.dataset.vtLegendBuilt = "1";
  }

  // ---------- DOM binding (ids are probed, not assumed) ----------
  // Canvas candidate IDs (support older/newer markup without drifting)
  const CANVAS_IDS = ["chartCanvas", "chartsCanvas", "canvasCharts", "vtChartCanvas"];
  const LEGEND_CONTAINER_IDS = ["chartLegend", "chartLegendChips", "legendChips", "chartsLegend"];
  const RANGE_LABEL_IDS = ["chartRangeLabel", "chartsRangeLabel", "rangeLabel", "chartRange"];
  const LOADING_IDS = ["chartsLoading", "chartLoading", "chartsLoadingText", "chartsLoadingLabel"];

  function findFirstId(ids){
    for(const id of ids){
      const el = $(id);
      if(el) return el;
    }
    return null;
  }

  function getCanvas(){
    return findFirstId(CANVAS_IDS);
  }

  function getLegendContainer(){
    return findFirstId(LEGEND_CONTAINER_IDS);
  }

  function getRangeLabel(){
    return findFirstId(RANGE_LABEL_IDS);
  }

  function getLoadingEl(){
    return findFirstId(LOADING_IDS);
  }

  // ---------- chart state ----------
  const state = {
    ctx: null,
    canvas: null,

    // viewport time range [t0, t1] in ms (continuous)
    t0: null,
    t1: null,

    // interaction
    pointers: new Map(), // pointerId -> {x,y}
    isPanning: false,
    panStartX: 0,
    panStartT0: 0,
    panStartT1: 0,

    // pinch
    pinchStartDist: 0,
    pinchStartT0: 0,
    pinchStartT1: 0,
    pinchCenterX: 0,

    // render scheduling
    raf: 0,
    lastDrawAt: 0,

    // cached data
    all: [],
    view: [],
    pxRatio: 1,
    plot: { x:0, y:0, w:0, h:0 },

    // legend/bands
    bands: [
      { key:"HTN2", label:"HTN2 \u2265140", from:140, to:250, color:"rgba(160,60,70,.22)", chip:"rgba(160,60,70,.45)" },
      { key:"HTN1", label:"HTN1 130\u2013139", from:130, to:139.999, color:"rgba(160,120,40,.20)", chip:"rgba(160,120,40,.42)" },
      { key:"ELEV", label:"Elev 120\u2013129", from:120, to:129.999, color:"rgba(70,120,190,.18)", chip:"rgba(70,120,190,.40)" },
      { key:"OPT",  label:"Opt 90\u2013119",  from:90,  to:119.999, color:"rgba(40,120,90,.16)",  chip:"rgba(40,120,90,.38)" },
      { key:"LOW",  label:"Low <90",       from:40,  to:89.999,  color:"rgba(90,70,140,.14)",  chip:"rgba(90,70,140,.34)" },
    ],
  };

  // ---------- legend ----------
  function buildLegend(){
    const wrap = getLegendContainer();
    if(!wrap) return;

    // prevent duplication
    if(!shouldShowLegendOnce(wrap)) return;

    // Clear any existing children (in case markup shipped with static legend text)
    while(wrap.firstChild) wrap.removeChild(wrap.firstChild);

    // chip grid container
    const grid = document.createElement("div");
    grid.className = "vtLegendGrid";
    // inline style (safe) to avoid relying on css drift
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    grid.style.gap = "10px";
    grid.style.padding = "6px";

    function chip(b){
      const el = document.createElement("div");
      el.className = "vtLegendChip";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.gap = "10px";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "999px";
      el.style.border = "1px solid rgba(235,245,255,.18)";
      el.style.background = "rgba(12,21,40,.35)";
      el.style.backdropFilter = "blur(8px)";
      el.style.webkitBackdropFilter = "blur(8px)";

      const sw = document.createElement("span");
      sw.style.width = "14px";
      sw.style.height = "14px";
      sw.style.borderRadius = "5px";
      sw.style.background = b.chip;            // color-coded to band
      sw.style.border = "1px solid rgba(0,0,0,.25)";
      sw.style.boxShadow = "0 0 0 1px rgba(255,255,255,.06) inset";

      const tx = document.createElement("span");
      tx.textContent = b.label;
      tx.style.color = "rgba(235,245,255,.72)";
      tx.style.fontSize = "16px";
      tx.style.letterSpacing = ".2px";
      tx.style.whiteSpace = "nowrap";

      el.appendChild(sw);
      el.appendChild(tx);
      return el;
    }

    // order matches band order (top->bottom visually: HTN2 at top)
    for(const b of state.bands){
      grid.appendChild(chip(b));
    }

    wrap.appendChild(grid);
    markLegendBuilt(wrap);
  }

  // ---------- sizing ----------
  function measurePlot(){
    const canvas = state.canvas;
    if(!canvas) return;

    const parent = canvas.parentElement || canvas;
    const rect = parent.getBoundingClientRect();

    // Use device pixel ratio to avoid blur
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    state.pxRatio = dpr;

    // Match visible size
    const w = Math.max(10, Math.floor(rect.width));
    const h = Math.max(10, Math.floor(rect.height));

    // set CSS size
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    // set backing store size
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    const ctx = canvas.getContext("2d", { alpha:true, desynchronized:true });
    state.ctx = ctx;

    // plot padding inside canvas
    const padL = 44;
    const padR = 16;
    const padT = 16;
    const padB = 34;

    state.plot = {
      x: Math.floor(padL * dpr),
      y: Math.floor(padT * dpr),
      w: Math.max(10, canvas.width - Math.floor((padL + padR) * dpr)),
      h: Math.max(10, canvas.height - Math.floor((padT + padB) * dpr))
    };
  }

  // ---------- viewport selection ----------
  function deriveInitialViewport(records){
    // Default: last 14 days if available, else full range.
    const times = records.map(r => r._t).filter(t => t != null).sort((a,b)=>a-b);
    if(times.length === 0){
      const t = nowMs();
      return { t0: t - 7*86400000, t1: t };
    }
    const minT = times[0];
    const maxT = times[times.length - 1];

    const span14 = 14 * 86400000;
    const t1 = maxT;
    const t0 = Math.max(minT, t1 - span14);
    return { t0, t1 };
  }

  function ensureViewport(){
    if(state.t0 != null && state.t1 != null && state.t1 > state.t0) return;

    const v = deriveInitialViewport(state.all);
    state.t0 = v.t0;
    state.t1 = v.t1;
  }

  // ---------- y scale ----------
  function computeYMax(viewRecords){
    // highest observed among s/d/hr in viewport, +10, clamped to 250; floor 40 already handled in mapping
    let mx = 0;
    for(const r of viewRecords){
      const { s, d } = getBP(r);
      const hr = getHR(r);
      if(s != null) mx = Math.max(mx, s);
      if(d != null) mx = Math.max(mx, d);
      if(hr != null) mx = Math.max(mx, hr);
    }
    const ceiling = clamp(mx + 10, 60, 250);
    return ceiling;
  }

  // ---------- mapping ----------
  function xFromT(t){
    const { x, w } = state.plot;
    const t0 = state.t0, t1 = state.t1;
    if(t0 == null || t1 == null || t1 <= t0) return x;
    const u = (t - t0) / (t1 - t0);
    return x + u * w;
  }

  function yFromV(v, yMax){
    const { y, h } = state.plot;
    const minV = 40; // hard floor
    const maxV = yMax;
    const vv = clamp(v, minV, maxV);
    const u = (vv - minV) / (maxV - minV);
    // invert
    return y + h - u * h;
  }

  // ---------- drawing ----------
  function clear(){
    const ctx = state.ctx;
    const c = state.canvas;
    if(!ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }

  function drawBands(yMax){
    const ctx = state.ctx;
    if(!ctx) return;

    const { x, y, w, h } = state.plot;
    const minV = 40;

    // bands keyed to systolic thresholds. draw from low -> high to avoid overdraw oddities
    const ordered = [...state.bands].slice().reverse(); // LOW first, HTN2 last
    for(const b of ordered){
      const topV = clamp(b.to, minV, yMax);
      const botV = clamp(b.from, minV, yMax);
      const yTop = yFromV(topV, yMax);
      const yBot = yFromV(botV, yMax);
      const hh = Math.max(0, yBot - yTop);
      if(hh <= 0) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(x, yTop, w, hh);
    }

    // subtle border for plot area
    ctx.strokeStyle = "rgba(235,245,255,.10)";
    ctx.lineWidth = Math.max(1, state.pxRatio);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  function drawGrid(yMax){
    const ctx = state.ctx;
    if(!ctx) return;

    const { x, y, w, h } = state.plot;

    ctx.save();
    ctx.strokeStyle = "rgba(235,245,255,.08)";
    ctx.lineWidth = Math.max(1, state.pxRatio);

    // horizontal grid every 20
    for(let v=40; v<=yMax; v+=20){
      const yy = yFromV(v, yMax);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }

    // y labels
    ctx.fillStyle = "rgba(235,245,255,.55)";
    ctx.font = `${Math.floor(12*state.pxRatio)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for(let v=40; v<=yMax; v+=20){
      const yy = yFromV(v, yMax);
      ctx.fillText(String(v), x - Math.floor(8*state.pxRatio), yy);
    }

    ctx.restore();
  }

  function drawSeries(viewRecords, yMax){
    const ctx = state.ctx;
    if(!ctx) return;

    function strokeLine(getVal, strokeStyle){
      let started = false;
      ctx.beginPath();
      for(const r of viewRecords){
        const t = r._t;
        if(t == null) continue;
        const v = getVal(r);
        if(v == null) continue;
        const xx = xFromT(t);
        const yy = yFromV(v, yMax);
        if(!started){
          ctx.moveTo(xx, yy);
          started = true;
        }else{
          ctx.lineTo(xx, yy);
        }
      }
      if(started){
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = Math.max(1.2*state.pxRatio, 2);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    // Use the app’s aesthetic (don’t hardcode bright colors); keep subtle but distinct
    // (These are line strokes; bands are the primary colors.)
    strokeLine(r => getBP(r).s, "rgba(210,230,255,.78)"); // systolic (light)
    strokeLine(r => getBP(r).d, "rgba(235,245,255,.55)"); // diastolic (gray-white)
    strokeLine(r => getHR(r),   "rgba(120,210,160,.70)"); // HR (green-ish)
  }

  function drawXLabels(){
    // minimal; avoid date math drift (panels/state may own range label).
    // Keep plot clean. If a range label element exists, update it from viewport.
    const el = getRangeLabel();
    if(!el) return;

    try{
      const t0 = state.t0, t1 = state.t1;
      if(t0 == null || t1 == null) return;

      const d0 = new Date(t0);
      const d1 = new Date(t1);

      // yyyy-mm-dd
      const f = (d)=> {
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,"0");
        const dd = String(d.getDate()).padStart(2,"0");
        return `${y}-${m}-${dd}`;
      };

      el.textContent = `${f(d0)} \u2192 ${f(d1)}`;
    }catch(_){}
  }

  function filterView(){
    const t0 = state.t0, t1 = state.t1;
    if(t0 == null || t1 == null || t1 <= t0){
      state.view = state.all.slice();
      return;
    }
    state.view = state.all.filter(r => r._t != null && r._t >= t0 && r._t <= t1);
  }

  function draw(){
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(() => {
      state.lastDrawAt = nowMs();

      // (re)measure in case layout changed
      measurePlot();

      // gather data
      filterView();

      // y max rule
      const yMax = computeYMax(state.view);

      // draw
      clear();
      drawBands(yMax);
      drawGrid(yMax);
      drawSeries(state.view, yMax);
      drawXLabels();

      // hide loading label if present
      const loading = getLoadingEl();
      if(loading) loading.textContent = "";
    });
  }

  // ---------- interactions (smooth pinch zoom + pan) ----------
  function canvasLocalX(ev){
    const rect = state.canvas.getBoundingClientRect();
    return ev.clientX - rect.left;
  }

  function canvasLocalY(ev){
    const rect = state.canvas.getBoundingClientRect();
    return ev.clientY - rect.top;
  }

  function timeAtX(xCss){
    // xCss is in CSS px. Convert to plot x in CSS px terms.
    const c = state.canvas;
    if(!c) return null;

    const plotCssX = state.plot.x / state.pxRatio;
    const plotCssW = state.plot.w / state.pxRatio;

    const u = (xCss - plotCssX) / plotCssW;
    const uu = clamp(u, 0, 1);

    const t0 = state.t0, t1 = state.t1;
    if(t0 == null || t1 == null || t1 <= t0) return null;
    return t0 + uu * (t1 - t0);
  }

  function zoomAround(centerXCss, scale){
    // scale >1 zoom in, <1 zoom out
    const t0 = state.t0, t1 = state.t1;
    if(t0 == null || t1 == null || t1 <= t0) return;

    const cT = timeAtX(centerXCss);
    if(cT == null) return;

    const span = t1 - t0;
    const newSpan = clamp(span / scale, 6*3600000, 120*86400000); // 6h min, 120d max

    const left = cT - (cT - t0) * (newSpan / span);
    const right = left + newSpan;

    // clamp to data range if available
    const times = state.all.map(r => r._t).filter(t => t != null);
    if(times.length){
      const minT = Math.min(...times);
      const maxT = Math.max(...times);
      const pad = 2*3600000; // 2h
      const lo = minT - pad;
      const hi = maxT + pad;

      let n0 = left;
      let n1 = right;
      if(n0 < lo){ n1 += (lo - n0); n0 = lo; }
      if(n1 > hi){ n0 -= (n1 - hi); n1 = hi; }
      if(n1 <= n0) return;

      state.t0 = n0;
      state.t1 = n1;
    }else{
      state.t0 = left;
      state.t1 = right;
    }
  }

  function panBy(dxCss){
    const t0 = state.t0, t1 = state.t1;
    if(t0 == null || t1 == null || t1 <= t0) return;

    const plotCssW = state.plot.w / state.pxRatio;
    if(plotCssW <= 0) return;

    const span = t1 - t0;
    const dt = -(dxCss / plotCssW) * span;

    let n0 = t0 + dt;
    let n1 = t1 + dt;

    // clamp to data range if available
    const times = state.all.map(r => r._t).filter(t => t != null);
    if(times.length){
      const minT = Math.min(...times);
      const maxT = Math.max(...times);
      const pad = 2*3600000;
      const lo = minT - pad;
      const hi = maxT + pad;

      const spanNow = n1 - n0;
      if(n0 < lo){ n0 = lo; n1 = lo + spanNow; }
      if(n1 > hi){ n1 = hi; n0 = hi - spanNow; }
    }

    state.t0 = n0;
    state.t1 = n1;
  }

  function bindCanvasInteractions(){
    const c = state.canvas;
    if(!c || c.dataset.vtChartBound === "1") return;
    c.dataset.vtChartBound = "1";

    c.style.touchAction = "none"; // required for pointer-based pinch/pan to be smooth

    c.addEventListener("pointerdown", (ev) => {
      c.setPointerCapture(ev.pointerId);
      state.pointers.set(ev.pointerId, { x: canvasLocalX(ev), y: canvasLocalY(ev) });

      if(state.pointers.size === 1){
        state.isPanning = true;
        state.panStartX = canvasLocalX(ev);
        state.panStartT0 = state.t0 ?? 0;
        state.panStartT1 = state.t1 ?? 0;
      }

      if(state.pointers.size === 2){
        // pinch start
        const pts = Array.from(state.pointers.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        state.pinchStartDist = Math.hypot(dx, dy);
        state.pinchStartT0 = state.t0 ?? 0;
        state.pinchStartT1 = state.t1 ?? 0;
        state.pinchCenterX = (pts[0].x + pts[1].x) / 2; // CSS px
      }
    });

    c.addEventListener("pointermove", (ev) => {
      if(!state.pointers.has(ev.pointerId)) return;

      state.pointers.set(ev.pointerId, { x: canvasLocalX(ev), y: canvasLocalY(ev) });

      if(state.pointers.size === 1 && state.isPanning){
        const xNow = canvasLocalX(ev);
        const dx = xNow - state.panStartX;

        // restore baseline then apply dx to avoid drift compounding
        state.t0 = state.panStartT0;
        state.t1 = state.panStartT1;
        panBy(dx);
        draw();
        return;
      }

      if(state.pointers.size === 2){
        const pts = Array.from(state.pointers.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);

        // restore baseline then apply scale to avoid jitter
        state.t0 = state.pinchStartT0;
        state.t1 = state.pinchStartT1;

        const scale = dist / (state.pinchStartDist || dist || 1);
        // scale is continuous; clamp to keep stable
        const s = clamp(scale, 0.5, 2.5);
        zoomAround(state.pinchCenterX, s);
        draw();
      }
    });

    function endPointer(ev){
      if(state.pointers.has(ev.pointerId)) state.pointers.delete(ev.pointerId);
      if(state.pointers.size === 0){
        state.isPanning = false;
      }
      if(state.pointers.size === 1){
        // reset pan baseline to remaining pointer
        const pt = Array.from(state.pointers.values())[0];
        state.panStartX = pt.x;
        state.panStartT0 = state.t0 ?? 0;
        state.panStartT1 = state.t1 ?? 0;
      }
    }

    c.addEventListener("pointerup", endPointer);
    c.addEventListener("pointercancel", endPointer);
    c.addEventListener("pointerout", endPointer);
    c.addEventListener("pointerleave", endPointer);

    // Optional: wheel zoom for desktop
    c.addEventListener("wheel", (ev) => {
      // prevent page zoom/scroll
      ev.preventDefault();
      const x = canvasLocalX(ev);
      const delta = ev.deltaY;
      const scale = delta > 0 ? 0.92 : 1.08;
      zoomAround(x, scale);
      draw();
    }, { passive:false });
  }

  // ---------- public API ----------
  VTChart.onShow = function(){
    // Called by panels/app on panel open
    try{
      state.canvas = getCanvas();
      if(!state.canvas) return;

      // Build legend exactly once (no duplication)
      buildLegend();

      // pull records (defensive) and normalize
      const raw = bestRecordsFromStore();
      const records = Array.isArray(raw) ? raw.slice() : [];
      for(const r of records){
        // cache time once to avoid repeated parsing
        if(r && r._t == null){
          r._t = parseTimeMs(r);
        }
      }
      // keep only records with time
      state.all = records.filter(r => r && r._t != null).sort((a,b)=>a._t - b._t);

      ensureViewport();
      measurePlot();
      bindCanvasInteractions();
      draw();
    }catch(_){}
  };

  VTChart.resetViewport = function(){
    try{
      const v = deriveInitialViewport(state.all || []);
      state.t0 = v.t0;
      state.t1 = v.t1;
      draw();
    }catch(_){}
  };

  VTChart.setViewport = function(t0, t1){
    try{
      const a = safeNum(t0);
      const b = safeNum(t1);
      if(a == null || b == null || b <= a) return;
      state.t0 = a;
      state.t1 = b;
      draw();
    }catch(_){}
  };

  VTChart.refresh = function(){
    try{ VTChart.onShow(); }catch(_){}
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.025f (legend chips + smooth pinch zoom + y-scale rule)
Schema order: File 9 of 10
*/
```0
