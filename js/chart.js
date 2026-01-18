/* File: js/chart.js */
/*
Vitals Tracker — Chart Rendering Engine
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (last known-good chart behavior)
Date: 2026-01-18

This file is: 4 of 10 (v2.023 phase)
Touched in this release: YES
Module owner: ALL chart rendering, scaling, axes, bands, zoom/pinch logic.

v2.023 SCOPE (LOCKED — do not drift)
- Restore the v2.021 chart engine behavior and visual quality.
- Fixed Y-axis (no jitter). Axis derived from data max with minimal padding.
- Hypertension bands (SYS-based only, medically recognized):
    * Hypotension
    * Optimal
    * Hypertension Stage 1
    * Hypertension Stage 2
- Bands opacity restored (current level = v2.021 baseline).
- Canvas crispness: DPR-aware, imageSmoothing OFF.
- X-axis labeling rules:
    * Days view: date only (no time)
    * Hour view: hours shown (12,4,8…) + DAY NAME centered per day
    * No overlapping labels (selective dropout)
- Zoom behavior:
    * Pinch OUT (fingers apart) = zoom IN (less data, down to 1 day)
    * Pinch IN  (fingers together) = zoom OUT (more data, up to 14 days)
- Chart must NEVER exceed highest systolic datapoint + small pad.
- Chart rendering must be deterministic and non-blurry.

Dependencies:
- index.html provides:
    canvas#chartCanvas
    div#canvasWrap
    div#chartsTopNote
- VTStorage.loadAll() for data

IMPORTANT (accessibility / mobile):
- Header and footer comments required for fast orientation when pasting.
- No silent behavior changes.
*/

(function(){
  "use strict";

  const APP_VERSION = "v2.023";

  // ===== Constants =====
  const DAY_MS = 86400000;
  const HOUR_MS = 3600000;

  const TZ = "America/Chicago";

  const VIEW_MIN_DAYS = 1;
  const VIEW_MAX_DAYS = 14;

  const Y_PAD = 6; // minimal top padding so max point never touches border

  // ===== Hypertension bands (SYSTOLIC ONLY) =====
  const BANDS = [
    { name:"Hypotension", min:0,   max:89,  color:"rgba(120,160,255,0.18)" },
    { name:"Optimal",     min:90,  max:119, color:"rgba(120,220,160,0.18)" },
    { name:"HTN 1",       min:120, max:139, color:"rgba(255,210,120,0.22)" },
    { name:"HTN 2",       min:140, max:300, color:"rgba(255,120,120,0.28)" }
  ];

  // ===== State =====
  let canvas, ctx;
  let records = [];

  let view = {
    windowDays: 7,
    centerTs: null,
    minTs: null,
    maxTs: null
  };

  // ===== Formatters =====
  const fmtDate = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month:"2-digit",
    day:"2-digit",
    year:"numeric"
  });

  const fmtDay = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday:"short"
  });

  const fmtHour = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour:"numeric",
    hour12:true
  });

  function dateKey(ts){
    const d = new Date(ts);
    return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate();
  }

  // ===== Setup =====
  function setup(){
    canvas = document.getElementById("chartCanvas");
    if(!canvas) return;

    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();

    canvas.width  = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx = canvas.getContext("2d", { alpha:true, desynchronized:true });
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = false;
  }

  // ===== Data =====
  async function loadData(){
    if(!window.VTStorage) return;
    const res = await window.VTStorage.loadAll();
    records = Array.isArray(res.records) ? res.records.slice() : [];

    records.sort((a,b)=>a.ts-b.ts);

    if(records.length){
      view.minTs = records[0].ts;
      view.maxTs = records[records.length-1].ts;
      view.centerTs = view.maxTs;
    }
  }

  // ===== Y Axis =====
  function computeYMax(){
    let maxSys = 120;
    for(const r of records){
      if(typeof r.sys === "number"){
        maxSys = Math.max(maxSys, r.sys);
      }
    }
    return Math.min(maxSys + Y_PAD, maxSys + Y_PAD);
  }

  function yToPx(v, yMax, h){
    return h - (v / yMax) * h;
  }

  // ===== X Axis =====
  function getVisibleRange(){
    const half = (view.windowDays * DAY_MS) / 2;
    return {
      start: view.centerTs - half,
      end:   view.centerTs + half
    };
  }

  function xToPx(ts, start, end, w){
    return ((ts - start) / (end - start)) * w;
  }

  // ===== Render =====
  function render(){
    if(!ctx || !records.length) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0,0,w,h);

    const range = getVisibleRange();
    const yMax = computeYMax();

    // ===== Bands =====
    for(const b of BANDS){
      const y1 = yToPx(b.min, yMax, h);
      const y2 = yToPx(b.max, yMax, h);
      ctx.fillStyle = b.color;
      ctx.fillRect(0, y2, w, y1 - y2);
    }

    // ===== Data line =====
    ctx.strokeStyle = "rgba(235,245,255,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for(const r of records){
      if(!r.sys) continue;
      if(r.ts < range.start || r.ts > range.end) continue;

      const x = xToPx(r.ts, range.start, range.end, w);
      const y = yToPx(r.sys, yMax, h);

      if(!started){
        ctx.moveTo(x,y);
        started = true;
      }else{
        ctx.lineTo(x,y);
      }
    }
    ctx.stroke();

    // ===== Points =====
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for(const r of records){
      if(!r.sys) continue;
      if(r.ts < range.start || r.ts > range.end) continue;

      const x = xToPx(r.ts, range.start, range.end, w);
      const y = yToPx(r.sys, yMax, h);

      ctx.beginPath();
      ctx.arc(x,y,3,0,Math.PI*2);
      ctx.fill();
    }

    drawXAxis(range, w, h);
  }

  // ===== X Axis Labels =====
  function drawXAxis(range, w, h){
    ctx.fillStyle = "rgba(235,245,255,0.6)";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const spanDays = view.windowDays;

    if(spanDays <= 1){
      // Hour view
      const startHour = Math.floor(range.start / HOUR_MS) * HOUR_MS;
      let lastX = -999;

      for(let t=startHour; t<=range.end; t+=4*HOUR_MS){
        const x = xToPx(t, range.start, range.end, w);
        if(x - lastX < 36) continue;
        lastX = x;
        ctx.fillText(fmtHour.format(new Date(t)), x, h-16);
      }

      // Day label centered
      const mid = (range.start + range.end)/2;
      ctx.fillText(fmtDay.format(new Date(mid)), w/2, h-32);

    }else{
      // Day view
      const startDay = Math.floor(range.start / DAY_MS) * DAY_MS;
      let lastX = -999;

      for(let t=startDay; t<=range.end; t+=DAY_MS){
        const x = xToPx(t + DAY_MS/2, range.start, range.end, w);
        if(x - lastX < 48) continue;
        lastX = x;
        ctx.fillText(fmtDate.format(new Date(t)), x, h-16);
      }
    }
  }

  // ===== Pinch Zoom =====
  let pinch = { active:false, dist:0 };

  function distTouches(t){
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function bindGestures(){
    const wrap = document.getElementById("canvasWrap");
    if(!wrap) return;

    wrap.addEventListener("touchstart", e=>{
      if(e.touches.length === 2){
        pinch.active = true;
        pinch.dist = distTouches(e.touches);
      }
    }, {passive:true});

    wrap.addEventListener("touchmove", e=>{
      if(!pinch.active || e.touches.length !== 2) return;

      const d = distTouches(e.touches);
      const delta = d - pinch.dist;

      if(Math.abs(delta) > 6){
        if(delta > 0){
          // fingers apart = zoom IN
          view.windowDays = Math.max(VIEW_MIN_DAYS, view.windowDays - 1);
        }else{
          // fingers together = zoom OUT
          view.windowDays = Math.min(VIEW_MAX_DAYS, view.windowDays + 1);
        }
        pinch.dist = d;
        render();
      }
    }, {passive:true});

    wrap.addEventListener("touchend", ()=>{
      pinch.active = false;
    });
  }

  // ===== Public API =====
  window.renderCharts = async function(){
    setup();
    await loadData();
    render();
  };

  window.setupCanvas = setup;

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", ()=>{
    setup();
    bindGestures();
  });

})();

/* EOF: js/chart.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES

Next file to deliver (on "N"):
- File 5 of 10: js/log.js
*/
