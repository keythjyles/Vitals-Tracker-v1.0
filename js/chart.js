/* File: js/chart.js */
/*
Vitals Tracker — Chart Renderer + Chart Gestures (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.024a
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL chart rendering and ALL chart-only gestures (pan + pinch zoom).
- Must NOT own panel swipe (gestures.js owns that) and must NOT own panel routing (panels.js owns that).

CURRENT FIX SCOPE (v2.024a)
1) Match v2.021 chart look/format:
   - Background bands more opaque (compared to v2.023c/2.024 builds).
   - Series legend positioned cleanly (no collisions).
   - X-axis labels do NOT bleed/overlap.
2) Add a BP band legend BELOW the chart (text legend, not a graphic).
3) Default window = current 7 days (ending at newest record).
4) Zoom min 1 day, max 14 days.
5) Pan bounded strictly to dataset start/end (no panning into empty time).
6) Y scale: min 40; max = min(250, (maxReading+10) rounded up to next 10).

DEPENDENCIES (read-only)
- window.VTStore.getAll()
- window.VTState (chartWindowDays, chartCenterMs)
*/

(function () {
  "use strict";

  function $(id){ return document.getElementById(id); }

  /* =========================
     CONFIG
     ========================= */

  const CFG = Object.freeze({
    yMin: 40,
    yCap: 250,
    padTop: 10,
    padRight: 10,
    padBottom: 28,
    padLeft: 34,

    gridAlpha: 0.18,
    axisAlpha: 0.30,
    textAlpha: 0.70,

    // Background band opacity (more opaque to match v2.021)
    band: {
      severe: 0.34,     // red (>=160 sys or >=100 dia)
      stage2: 0.30,     // purple/indigo-ish (>=140 sys or >=90 dia)
      stage1: 0.26,     // blue (>=130 sys or >=80 dia)
      elevated: 0.22,   // amber (>=120 sys and <130, dia <80)
      normal: 0.16      // greenish/low band suggestion (optional)
    },

    // Time label strategy
    xTicksMax: 5,
    xFontPx: 12,
    legendFontPx: 12,
    yFontPx: 12,

    // Gesture tuning
    panPxToMsMin: 1,           // avoid div-by-zero
    pinchDeadzone: 6,          // px
    panDeadzone: 4,            // px
  });

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function isNum(n){ return Number.isFinite(n); }

  function safeGetRecords(){
    try{
      return window.VTStore?.getAll?.() || [];
    }catch(_){
      return [];
    }
  }

  function getWindowDays(){
    const d = window.VTState?.getChartWindowDays?.();
    return isNum(d) ? clamp(Math.floor(d), 1, 14) : 7;
  }

  function setWindowDays(days){
    try{ window.VTState?.setChartWindowDays?.(clamp(days, 1, 14)); }catch(_){}
  }

  function getCenterMs(){
    const m = window.VTState?.getChartCenterMs?.();
    return isNum(m) ? m : null;
  }

  function setCenterMs(ms){
    try{ window.VTState?.setChartCenterMs?.(ms); }catch(_){}
  }

  function markClean(){
    try{ window.VTState?.markChartClean?.(); }catch(_){}
  }

  /* =========================
     RECORD NORMALIZATION
     ========================= */

  function toMs(ts){
    try{
      const m = new Date(ts || 0).getTime();
      return Number.isFinite(m) ? m : 0;
    }catch(_){
      return 0;
    }
  }

  function pickTs(r){
    return r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? r?.createdAt ?? r?.created_at ?? r?.iso ?? null;
  }

  function num(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function normalize(r){
    if(!r || typeof r !== "object") return null;
    const ms = r._ms ? Number(r._ms) : toMs(pickTs(r));
    if(!Number.isFinite(ms) || ms <= 0) return null;

    // Accept multiple possible field names
    const sys = num(r.systolic ?? r.sys ?? r.SYS ?? r.bpSys ?? r.bp_systolic);
    const dia = num(r.diastolic ?? r.dia ?? r.DIA ?? r.bpDia ?? r.bp_diastolic);
    const hr  = num(r.heartRate ?? r.hr ?? r.HR ?? r.pulse);

    if(sys == null && dia == null && hr == null) return null;

    return { ms, sys, dia, hr };
  }

  function buildSeries(records){
    const out = [];
    for(const r of records){
      const n = normalize(r);
      if(n) out.push(n);
    }
    out.sort((a,b)=>a.ms-b.ms);
    return out;
  }

  function datasetBounds(series){
    if(!series.length) return { minMs: 0, maxMs: 0 };
    return { minMs: series[0].ms, maxMs: series[series.length-1].ms };
  }

  function maxReading(series){
    let m = 0;
    for(const p of series){
      if(isNum(p.sys)) m = Math.max(m, p.sys);
      if(isNum(p.dia)) m = Math.max(m, p.dia);
      if(isNum(p.hr))  m = Math.max(m, p.hr);
    }
    return m;
  }

  function computeYMax(series){
    const mx = maxReading(series);
    const raw = (mx || 0) + 10;
    const rounded = Math.ceil(raw / 10) * 10;
    return clamp(rounded, CFG.yMin + 10, CFG.yCap);
  }

  /* =========================
     WINDOW / PAN BOUNDS
     ========================= */

  function windowMs(days){ return days * 24 * 60 * 60 * 1000; }

  function computeWindow(series){
    const days = getWindowDays();
    const { minMs, maxMs } = datasetBounds(series);
    if(!minMs || !maxMs){
      return { startMs: 0, endMs: 0, centerMs: 0, days };
    }

    const span = windowMs(days);

    // Default to last 7 days ending at newest record.
    let center = getCenterMs();
    if(!center){
      const end = maxMs;
      const start = Math.max(minMs, end - span);
      center = start + (Math.min(span, end - start) / 2);
      setCenterMs(center);
    }

    // Clamp center so window remains within dataset.
    const half = span / 2;
    const minCenter = minMs + half;
    const maxCenter = maxMs - half;

    // If dataset shorter than window, pin to middle
    if(maxCenter < minCenter){
      center = (minMs + maxMs) / 2;
    } else {
      center = clamp(center, minCenter, maxCenter);
    }
    setCenterMs(center);

    const startMs = center - half;
    const endMs = center + half;
    return { startMs, endMs, centerMs: center, days };
  }

  function filterToWindow(series, startMs, endMs){
    if(!series.length) return [];
    // include points slightly outside so lines connect at edges
    const pad = 60 * 60 * 1000; // 1 hour
    const a = startMs - pad;
    const b = endMs + pad;
    return series.filter(p => p.ms >= a && p.ms <= b);
  }

  /* =========================
     DRAW HELPERS
     ========================= */

  function setCanvasSize(canvas){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(10, Math.floor(rect.width));
    const h = Math.max(10, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    return { w, h, dpr };
  }

  function ctxAlphaFill(ctx, rgba, alpha){
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgba;
    ctx.restore();
  }

  function rgba(r,g,b,a){ return `rgba(${r},${g},${b},${a})`; }

  function drawRoundedRect(ctx, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function fmtDay(ms){
    try{
      const d = new Date(ms);
      const wd = d.toLocaleDateString(undefined, { weekday:"short" });
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const dd = String(d.getDate()).padStart(2,"0");
      return { wd, md: `${mm}/${dd}` };
    }catch(_){
      return { wd:"", md:"" };
    }
  }

  function fmtRange(startMs, endMs){
    try{
      const a = new Date(startMs);
      const b = new Date(endMs);
      const fmt = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      return `${fmt(a)} \u2192 ${fmt(b)} (local)`;
    }catch(_){
      return "";
    }
  }

  /* =========================
     RENDER
     ========================= */

  function render(){
    const canvas = $("chartCanvas");
    if(!canvas) return;

    const seriesAll = buildSeries(safeGetRecords());
    const { startMs, endMs } = computeWindow(seriesAll);
    const series = filterToWindow(seriesAll, startMs, endMs);

    const rangeLabel = $("chartRangeLabel");
    if(rangeLabel) rangeLabel.textContent = fmtRange(startMs, endMs);

    const yMax = computeYMax(seriesAll.length ? seriesAll : series);
    const { w, h, dpr } = setCanvasSize(canvas);
    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0,0,w,h);

    const plot = {
      x: CFG.padLeft,
      y: CFG.padTop,
      w: w - CFG.padLeft - CFG.padRight,
      h: h - CFG.padTop - CFG.padBottom
    };

    // Background chart frame (subtle)
    ctx.save();
    drawRoundedRect(ctx, plot.x, plot.y, plot.w, plot.h, 10);
    ctx.clip();

    // --- Background hypertension bands (more opaque like v2.021) ---
    // Using approximate BP zones:
    //   Normal (<=120/80) base fill,
    //   Elevated (120-129 sys, dia <80),
    //   Stage1 (130-139 sys OR 80-89 dia),
    //   Stage2 (140-159 sys OR 90-99 dia),
    //   Severe (>=160 sys OR >=100 dia)
    // We draw from top down so stronger zones overlay.
    const yScale = (val) => {
      const v = clamp(val, CFG.yMin, yMax);
      const t = (v - CFG.yMin) / (yMax - CFG.yMin);
      return plot.y + plot.h - (t * plot.h);
    };

    function fillBand(yTopVal, yBotVal, color, alpha){
      const yt = yScale(yTopVal);
      const yb = yScale(yBotVal);
      const top = Math.min(yt, yb);
      const bot = Math.max(yt, yb);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(plot.x, top, plot.w, bot - top);
      ctx.restore();
    }

    // Base: normal-ish low band (subtle)
    fillBand(CFG.yMin, 120, rgba(40,110,70,1), CFG.band.normal);

    // Elevated (amber)
    fillBand(120, 130, rgba(190,150,40,1), CFG.band.elevated);

    // Stage 1 (blue)
    fillBand(130, 140, rgba(40,90,170,1), CFG.band.stage1);

    // Stage 2 (purple/indigo)
    fillBand(140, 160, rgba(85,55,155,1), CFG.band.stage2);

    // Severe (red) 160+
    fillBand(160, yMax, rgba(170,50,55,1), CFG.band.severe);

    // --- Alternating day vertical bands (subtle) ---
    const dayMs = 24*60*60*1000;
    const startDay = Math.floor(startMs / dayMs) * dayMs;
    for(let t = startDay, i=0; t < endMs; t += dayMs, i++){
      const x0 = plot.x + ((t - startMs) / (endMs - startMs)) * plot.w;
      const x1 = plot.x + (((t + dayMs) - startMs) / (endMs - startMs)) * plot.w;
      ctx.save();
      ctx.globalAlpha = (i % 2 === 0) ? 0.08 : 0.03;
      ctx.fillStyle = rgba(255,255,255,1);
      ctx.fillRect(x0, plot.y, (x1-x0), plot.h);
      ctx.restore();
    }

    // --- Grid lines (y) ---
    ctx.save();
    ctx.globalAlpha = CFG.gridAlpha;
    ctx.strokeStyle = rgba(235,245,255,1);
    ctx.lineWidth = 1;

    const yStep = 20;
    for(let v = CFG.yMin; v <= yMax; v += yStep){
      const yy = yScale(v);
      ctx.beginPath();
      ctx.moveTo(plot.x, yy);
      ctx.lineTo(plot.x + plot.w, yy);
      ctx.stroke();
    }
    ctx.restore();

    // --- Series drawing ---
    const xScale = (ms) => plot.x + ((ms - startMs) / (endMs - startMs)) * plot.w;

    function drawLine(key, stroke, width, alpha){
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      let started = false;
      for(const p of series){
        const val = p[key];
        if(!isNum(val)) continue;
        const x = xScale(p.ms);
        const y = yScale(val);
        if(!started){
          ctx.beginPath();
          ctx.moveTo(x,y);
          started = true;
        }else{
          ctx.lineTo(x,y);
        }
      }
      if(started) ctx.stroke();
      ctx.restore();
    }

    // Colors chosen to match your v2.021 look (sys light blue, dia light gray, HR green)
    drawLine("sys", rgba(160,205,255,1), 2.2, 0.95);
    drawLine("dia", rgba(230,230,235,1), 1.8, 0.80);
    drawLine("hr",  rgba(110,220,160,1), 1.8, 0.85);

    ctx.restore(); // end clip

    // --- Axes labels (Y) ---
    ctx.save();
    ctx.fillStyle = rgba(235,245,255, CFG.textAlpha);
    ctx.font = `${CFG.yFontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for(let v = CFG.yMin; v <= yMax; v += 20){
      const yy = yScale(v);
      ctx.fillText(String(v), plot.x - 6, yy);
    }
    ctx.restore();

    // --- X labels (no overlap / no bleed) ---
    // Strategy: at most 5 ticks, always at midnight day boundaries.
    ctx.save();
    ctx.fillStyle = rgba(235,245,255, 0.65);
    ctx.font = `${CFG.xFontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const span = endMs - startMs;
    const approxTick = span / (CFG.xTicksMax - 1);
    const tickDay = Math.max(dayMs, Math.floor(approxTick / dayMs) * dayMs);

    // Build ticks at day boundaries inside window.
    const ticks = [];
    for(let t = startDay; t <= endMs; t += tickDay){
      if(t >= startMs && t <= endMs) ticks.push(t);
    }
    // Ensure at least two ticks
    if(ticks.length < 2){
      ticks.length = 0;
      ticks.push(startDay);
      ticks.push(startDay + dayMs);
    }

    // Clip the x label area to prevent bleeding.
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x, plot.y + plot.h + 2, plot.w, CFG.padBottom - 4);
    ctx.clip();

    for(const t of ticks){
      const x = plot.x + ((t - startMs) / (endMs - startMs)) * plot.w;
      const { wd, md } = fmtDay(t);
      // two-line label like v2.021: "Sun" above "01/04"
      ctx.fillText(wd, x, plot.y + plot.h + 2);
      ctx.fillText(md, x, plot.y + plot.h + 2 + (CFG.xFontPx + 1));
    }
    ctx.restore();
    ctx.restore();

    // --- Series legend (top-left inside plot; collision-proof) ---
    ctx.save();
    const lx = plot.x + 10;
    const ly = plot.y + 10;
    const lh = 18;

    ctx.font = `${CFG.legendFontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    function legendRow(i, label, color){
      const y = ly + i*lh;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx + 20, y);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = rgba(235,245,255,0.75);
      ctx.fillText(label, lx + 28, y);
    }

    legendRow(0, "Systolic", rgba(160,205,255,1));
    legendRow(1, "Diastolic", rgba(230,230,235,1));
    legendRow(2, "Heart Rate", rgba(110,220,160,1));
    ctx.restore();

    // --- BP band legend below chart (text) ---
    const bandLegend = $("bandLegend");
    if(bandLegend){
      bandLegend.textContent =
        "Bands: Normal ≤120 | Elevated 120–129 | Stage 1 130–139 or 80–89 | Stage 2 140–159 or 90–99 | Severe ≥160 or ≥100";
    }

    markClean();
  }

  /* =========================
     CHART GESTURES (PAN + PINCH)
     ========================= */

  function initGestures(){
    const wrap = $("canvasWrap");
    const canvas = $("chartCanvas");
    if(!wrap || !canvas) return;

    const state = {
      active:false,
      mode:null, // "pan" | "pinch"
      startX:0,
      startCenter:0,
      startSpan:0,

      p0:null,
      p1:null,
      startDist:0,
      startDays:7
    };

    function getBoundsForPan(){
      const seriesAll = buildSeries(safeGetRecords());
      const b = datasetBounds(seriesAll);
      return { seriesAll, ...b };
    }

    function setCenterClamped(center, seriesAll){
      const { minMs, maxMs } = datasetBounds(seriesAll);
      const days = getWindowDays();
      const span = windowMs(days);
      const half = span/2;

      let c = center;
      const minC = minMs + half;
      const maxC = maxMs - half;

      if(!minMs || !maxMs){
        setCenterMs(center);
        return;
      }

      if(maxC < minC){
        c = (minMs + maxMs)/2;
      } else {
        c = clamp(c, minC, maxC);
      }
      setCenterMs(c);
    }

    function dist(a,b){
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.sqrt(dx*dx + dy*dy);
    }

    wrap.addEventListener("touchstart", (e) => {
      if(!($("panelCharts")?.classList.contains("active"))) return;

      if(e.touches.length === 1){
        state.active = true;
        state.mode = "pan";
        state.startX = e.touches[0].clientX;
        state.startCenter = getCenterMs() || 0;
        e.stopPropagation();
        return;
      }
      if(e.touches.length === 2){
        state.active = true;
        state.mode = "pinch";
        state.p0 = e.touches[0];
        state.p1 = e.touches[1];
        state.startDist = dist(state.p0, state.p1);
        state.startDays = getWindowDays();
        e.stopPropagation();
        return;
      }
    }, { passive:true });

    wrap.addEventListener("touchmove", (e) => {
      if(!state.active) return;
      if(!($("panelCharts")?.classList.contains("active"))) return;

      if(state.mode === "pan" && e.touches.length === 1){
        const x = e.touches[0].clientX;
        const dx = x - state.startX;
        if(Math.abs(dx) < CFG.panDeadzone) return;

        // Convert pixels to ms based on current window span and plot width.
        const rect = canvas.getBoundingClientRect();
        const days = getWindowDays();
        const span = windowMs(days);
        const px = Math.max(CFG.panPxToMsMin, rect.width);
        const msPerPx = span / px;

        const nextCenter = state.startCenter - (dx * msPerPx);
        const { seriesAll } = getBoundsForPan();
        setCenterClamped(nextCenter, seriesAll);

        e.preventDefault();
        e.stopPropagation();
        render();
        return;
      }

      if(state.mode === "pinch" && e.touches.length === 2){
        const p0 = e.touches[0];
        const p1 = e.touches[1];
        const d = dist(p0, p1);
        if(Math.abs(d - state.startDist) < CFG.pinchDeadzone) return;

        // Pinch out -> zoom in (fewer days); pinch in -> zoom out (more days)
        const ratio = state.startDist / d;
        let nextDays = Math.round(state.startDays * ratio);

        nextDays = clamp(nextDays, 1, 14);
        setWindowDays(nextDays);

        // Re-clamp center after changing span
        const { seriesAll } = getBoundsForPan();
        setCenterClamped(getCenterMs() || state.startCenter, seriesAll);

        e.preventDefault();
        e.stopPropagation();
        render();
        return;
      }
    }, { passive:false });

    wrap.addEventListener("touchend", (e) => {
      if(e.touches.length === 0){
        state.active = false;
        state.mode = null;
        state.p0 = null;
        state.p1 = null;
      }
    }, { passive:true });
  }

  /* =========================
     PUBLIC API
     ========================= */

  function onShow(){
    // Ensure window defaults to newest 7 days if center not set
    const seriesAll = buildSeries(safeGetRecords());
    const { minMs, maxMs } = datasetBounds(seriesAll);
    if(minMs && maxMs){
      if(!getCenterMs()){
        setWindowDays(7);
        const span = windowMs(7);
        const end = maxMs;
        const start = Math.max(minMs, end - span);
        const center = start + (Math.min(span, end - start)/2);
        setCenterMs(center);
      }
    }
    render();
  }

  function init(){
    initGestures();
    render();
  }

  window.VTChart = Object.freeze({
    init,
    onShow,
    render
  });

  // Auto-init safely
  function onReady(fn){
    if(document.readyState === "complete" || document.readyState === "interactive"){
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }
  onReady(function(){
    try{ init(); }catch(_){}
  });

})();
