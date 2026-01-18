/* ======================================================================
File: js/chart.js
Vitals Tracker — Chart Engine (Authoritative)

Copyright (c) 2026 Wendell K. Jiles.
All rights reserved.

App Version: v2.023
Base Version: v2.021 (last known-good chart behavior)
Date: 2026-01-18

ROLE / OWNERSHIP
- This file is the sole owner of ALL chart rendering logic.
- index.html only provides the canvas + lifecycle hooks.
- No other module may draw to #chartCanvas.

SCOPE FOR v2.023
- Restore the classic working chart exactly (bands + lines).
- NO new features.
- NO UI changes.
- NO reporting overlays yet.
- Focus: correctness, stability, predictability.

REQUIRED GLOBALS (provided by index.html)
- window.__VT_RECORDS__  (array of raw records) OR storage fallback
- #chartCanvas
- #chartsTopNote
- Timezone: America/Chicago

DELIVERY ORDER
- File 2 of 10 (v2.023 phase)
- Next expected file: js/log.js

ACCESSIBILITY / USABILITY RULES
- All constants documented.
- All drawing steps labeled.
- EOF footer REQUIRED for mobile paste usability.

====================================================================== */

(function(){
  "use strict";

  /* ===================== CONSTANTS ===================== */

  const TZ = "America/Chicago";
  const DAY_MS = 86400000;

  // Canvas layout
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;

  // Y scale (classic behavior)
  const Y_MIN = 40;
  const Y_MAX = 180;

  // Bands (classic)
  const BANDS = [
    { min: 0,   max: 80,  color: "rgba(90,110,180,0.45)" },   // hypotensive
    { min: 80,  max: 120, color: "rgba(60,120,200,0.55)" },  // normal
    { min: 120, max: 140, color: "rgba(190,170,60,0.55)" },  // elevated
    { min: 140, max: 220, color: "rgba(170,60,60,0.65)" }    // hypertensive
  ];

  // Line colors
  const COLOR_SYS = "#e6f0ff";
  const COLOR_DIA = "#d0d8ff";
  const COLOR_HR  = "#7dd3a7";

  /* ===================== STATE ===================== */

  let canvas, ctx, dpr;
  let records = [];

  /* ===================== HELPERS ===================== */

  function ct(ms){
    return new Date(
      new Date(ms).toLocaleString("en-US",{ timeZone: TZ })
    );
  }

  function clamp(v,min,max){
    return Math.max(min, Math.min(max, v));
  }

  function yToPx(v, h){
    const t = (v - Y_MIN) / (Y_MAX - Y_MIN);
    return PAD_T + (1 - t) * h;
  }

  function xToPx(t, t0, t1, w){
    return PAD_L + ((t - t0) / (t1 - t0)) * w;
  }

  function extract(r){
    return {
      t: +new Date(r.ts || r.time || r.date || r.createdAt || 0),
      sys: Number(r.sys ?? r.systolic),
      dia: Number(r.dia ?? r.diastolic),
      hr:  Number(r.hr  ?? r.heartRate)
    };
  }

  /* ===================== CANVAS ===================== */

  function setupCanvas(){
    canvas = document.getElementById("chartCanvas");
    if(!canvas) return;

    const rect = canvas.getBoundingClientRect();
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

    canvas.width  = Math.floor(rect.width  * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";
  }

  /* ===================== DRAWING ===================== */

  function drawBands(w,h){
    BANDS.forEach(b=>{
      const y1 = yToPx(b.max,h);
      const y2 = yToPx(b.min,h);
      ctx.fillStyle = b.color;
      ctx.fillRect(PAD_L, y1, w, y2 - y1);
    });
  }

  function drawGrid(w,h){
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    for(let v=Y_MIN; v<=Y_MAX; v+=20){
      const y = yToPx(v,h);
      ctx.beginPath();
      ctx.moveTo(PAD_L,y);
      ctx.lineTo(PAD_L+w,y);
      ctx.stroke();

      ctx.fillStyle = "rgba(235,245,255,0.55)";
      ctx.font = "12px system-ui";
      ctx.fillText(v.toString(), 6, y+4);
    }
  }

  function drawLine(points, color, w, h, t0, t1){
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    points.forEach(p=>{
      if(!Number.isFinite(p.v)) return;
      const x = xToPx(p.t,t0,t1,w);
      const y = yToPx(p.v,h);
      if(!started){
        ctx.moveTo(x,y);
        started = true;
      }else{
        ctx.lineTo(x,y);
      }
    });
    ctx.stroke();
  }

  /* ===================== MAIN RENDER ===================== */

  function render(){
    if(!ctx || !records.length) return;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const w = canvas.width / dpr - PAD_L - PAD_R;
    const h = canvas.height / dpr - PAD_T - PAD_B;

    const times = records.map(r=>r.t).filter(Boolean);
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);

    drawBands(w,h);
    drawGrid(w,h);

    drawLine(records.map(r=>({t:r.t,v:r.sys})), COLOR_SYS, w,h,t0,t1);
    drawLine(records.map(r=>({t:r.t,v:r.dia})), COLOR_DIA, w,h,t0,t1);
    drawLine(records.map(r=>({t:r.t,v:r.hr })), COLOR_HR,  w,h,t0,t1);
  }

  /* ===================== PUBLIC API ===================== */

  window.VTCharts = {
    init(raw){
      setupCanvas();
      records = (raw || []).map(extract).filter(r=>r.t>0);
      const note = document.getElementById("chartsTopNote");
      if(note){
        if(records.length){
          const a = ct(records[0].t);
          const b = ct(records[records.length-1].t);
          note.textContent =
            `${a.toISOString().slice(0,10)} → ${b.toISOString().slice(0,10)} (CT)`;
        }else{
          note.textContent = "No data available.";
        }
      }
      render();
    },
    redraw(){
      setupCanvas();
      render();
    }
  };

})();

/* ======================================================================
EOF — js/chart.js

NOTES FOR RESTORE / DEBUG
- If chart is blank: confirm VTCharts.init(records) is called.
- No other file should call canvas.getContext().
- Bands opacity intentionally matches classic screenshots.
- Next file to deliver: js/log.js

====================================================================== */
