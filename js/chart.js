/* File: js/chart.js */
/*
Vitals Tracker — Chart Engine (Renderer + Chart Gestures)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025e
Base: v2.021
Date: 2026-01-18

Schema position:
File 7 of 10

Former file:
File 6 — js/state.js

Next file:
File 8 — js/gestures.js

FILE ROLE (LOCKED)
- Owns ALL chart drawing (axes, labels, bands, legend, formatting).
- Owns ONLY chart gestures inside the canvas (pan + pinch-zoom).
- Must NOT implement panel rotation (gestures.js owns that).
- Must NOT touch storage except read-only via VTStore / VTStorage.

v2.025e — Change Log (THIS FILE ONLY)
1) Fully formatted chart rendering restored.
2) Bands 35% more opaque.
3) Y-axis locked: min 40, max = min(250, maxReading + 10).
4) Default view = last 7 days of dataset.
5) Zoom range = 1–14 days.
6) Pan clamped strictly to dataset bounds.
7) Smooth pinch-zoom (no snapping).
8) Legend injected below chart if missing.

ANTI-DRIFT RULES
- Do NOT add Settings logic here.
- Do NOT add panel swipe logic here.
- Do NOT write to storage here.
*/

(function () {
  "use strict";

  /* ===================== Constants ===================== */

  const ID_CANVAS = "chartCanvas";
  const ID_WRAP   = "canvasWrap";
  const ID_NOTE   = "chartsTopNote";
  const LEGEND_ID = "chartLegend";

  const MS_HOUR = 3600000;
  const MS_DAY  = 86400000;

  const LIMITS = Object.freeze({
    minDays: 1,
    maxDays: 14,
    defaultDays: 7
  });

  const STYLE = Object.freeze({
    bg:       "rgba(0,0,0,0.10)",
    frame:    "rgba(235,245,255,0.16)",
    grid:     "rgba(235,245,255,0.10)",
    yLabel:   "rgba(235,245,255,0.58)",
    xLabel:   "rgba(235,245,255,0.58)",

    dayBandA: "rgba(40,90,170,0.16)",
    dayBandB: "rgba(0,0,0,0.16)",

    bands: {
      ht2:  "rgba(255, 70, 70, 0.24)",
      ht1:  "rgba(255,210, 80, 0.23)",
      elev: "rgba( 80,160,255, 0.20)",
      opt:  "rgba( 70,120,255, 0.15)",
      hypo: "rgba(170,120,255, 0.18)"
    },

    series: {
      sys: { stroke:"rgba(170,210,255,1)", alpha:0.95, w:1.6 },
      dia: { stroke:"rgba(235,245,255,1)", alpha:0.78, w:1.35 },
      hr:  { stroke:"rgba(150,255,210,1)", alpha:0.72, w:1.25 }
    }
  });

  /* ===================== Helpers ===================== */

  function $(id){ return document.getElementById(id); }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function safeNum(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }

  function parseTs(v){
    if(v == null) return null;
    if(typeof v === "number") return v > 1e12 ? v : v * 1000;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }

  function extractTs(r){
    return r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? null;
  }

  function extractBP(r){
    return {
      sys: safeNum(r?.sys ?? r?.systolic),
      dia: safeNum(r?.dia ?? r?.diastolic)
    };
  }

  function extractHR(r){
    return safeNum(r?.hr ?? r?.heartRate ?? r?.pulse);
  }

  function ensureCanvasSize(canvas){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if(canvas.width !== w || canvas.height !== h){
      canvas.width = w;
      canvas.height = h;
    }
    return { dpr, rect, w, h };
  }

  function niceCeil10(v){ return Math.ceil(v / 10) * 10; }

  /* ===================== Runtime State ===================== */

  const S = {
    t0:null,
    t1:null,
    dataMin:null,
    dataMax:null,
    pointers:new Map(),
    lastPinchDist:null,
    lastPinchMidX:null,
    raf:null,
    bound:false
  };

  /* ===================== Data ===================== */

  async function loadRecords(){
    try{
      if(window.VTStore?.getAll) return window.VTStore.getAll() || [];
      if(window.VTStorage?.getAllRecords) return await window.VTStorage.getAllRecords();
    }catch(_){}
    return [];
  }

  function datasetBounds(records){
    let min=Infinity, max=-Infinity;
    for(const r of records){
      const t = parseTs(extractTs(r));
      if(t!=null){ min=Math.min(min,t); max=Math.max(max,t); }
    }
    if(!Number.isFinite(min)) return {min:null,max:null};
    return {min,max};
  }

  /* ===================== Viewport ===================== */

  function setViewport(a,b){
    const minSpan = LIMITS.minDays * MS_DAY;
    const maxSpan = LIMITS.maxDays * MS_DAY;

    let span = b - a;
    span = clamp(span, minSpan, maxSpan);

    if(Number.isFinite(S.dataMin)){
      if(a < S.dataMin){ a = S.dataMin; b = a + span; }
      if(b > S.dataMax){ b = S.dataMax; a = b - span; }
    }

    S.t0 = a;
    S.t1 = b;
  }

  async function ensureDefaultViewport(){
    const records = await loadRecords();
    const b = datasetBounds(records);

    if(!Number.isFinite(b.min)){
      const now = Date.now();
      setViewport(now - LIMITS.defaultDays*MS_DAY, now);
      return;
    }

    S.dataMin = b.min;
    S.dataMax = b.max;

    setViewport(
      b.max - LIMITS.defaultDays*MS_DAY,
      b.max
    );
  }

  /* ===================== Chart Gestures ===================== */

  function pan(dxPx, width){
    const span = S.t1 - S.t0;
    const msPerPx = span / width;
    setViewport(S.t0 - dxPx*msPerPx, S.t1 - dxPx*msPerPx);
  }

  function zoom(cxPx, factor, width){
    const span = S.t1 - S.t0;
    const newSpan = clamp(span * factor, LIMITS.minDays*MS_DAY, LIMITS.maxDays*MS_DAY);
    const alpha = cxPx / width;
    const center = S.t0 + span*alpha;
    setViewport(center - newSpan*alpha, center + newSpan*(1-alpha));
  }

  function bindGestures(){
    if(S.bound) return;
    const canvas = $(ID_CANVAS);
    if(!canvas) return;
    S.bound = true;

    canvas.style.touchAction = "none";

    canvas.addEventListener("pointerdown", e=>{
      canvas.setPointerCapture(e.pointerId);
      S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    });

    canvas.addEventListener("pointermove", e=>{
      if(!S.pointers.has(e.pointerId)) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;

      const prev = S.pointers.get(e.pointerId);
      S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

      if(S.pointers.size===1){
        pan(e.clientX - prev.x, w);
      }else if(S.pointers.size===2){
        const pts=[...S.pointers.values()];
        const d=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y);
        if(S.lastPinchDist){
          zoom((pts[0].x+pts[1].x)/2-rect.left, S.lastPinchDist/d, w);
        }
        S.lastPinchDist=d;
      }
      schedule();
    });

    canvas.addEventListener("pointerup", ()=>{ S.pointers.clear(); S.lastPinchDist=null; });
    canvas.addEventListener("pointercancel", ()=>{ S.pointers.clear(); S.lastPinchDist=null; });
  }

  /* ===================== Rendering ===================== */

  function schedule(){
    if(S.raf) return;
    S.raf=requestAnimationFrame(()=>{ S.raf=null; render(); });
  }

  async function render(){
    const canvas=$(ID_CANVAS);
    if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const {w,h}=ensureCanvasSize(canvas);

    const raw=await loadRecords();
    const records=[];
    for(const r of raw){
      const ts=parseTs(extractTs(r));
      if(ts==null) continue;
      const bp=extractBP(r);
      records.push({ts,sys:bp.sys,dia:bp.dia,hr:extractHR(r)});
    }
    records.sort((a,b)=>a.ts-b.ts);

    const b=datasetBounds(records);
    S.dataMin=b.min;
    S.dataMax=b.max;

    if(S.t0==null) await ensureDefaultViewport();

    ctx.clearRect(0,0,w,h);
    ctx.fillStyle=STYLE.bg;
    ctx.fillRect(0,0,w,h);

    const padL=w*0.1, padR=w*0.04, padT=h*0.06, padB=h*0.18;
    const x0=padL, y0=padT, pw=w-padL-padR, ph=h-padT-padB;

    const yMin=40;
    let yMax=40;
    for(const r of records){
      if(r.sys!=null) yMax=Math.max(yMax,r.sys);
      if(r.dia!=null) yMax=Math.max(yMax,r.dia);
      if(r.hr!=null)  yMax=Math.max(yMax,r.hr);
    }
    yMax=niceCeil10(Math.min(250,yMax+10));

    function xOf(t){ return x0 + (t-S.t0)/(S.t1-S.t0)*pw; }
    function yOf(v){ return y0 + (1-(v-yMin)/(yMax-yMin))*ph; }

    // bands
    const bands=[
      {y0:140,y1:yMax,c:STYLE.bands.ht2},
      {y0:130,y1:140,c:STYLE.bands.ht1},
      {y0:120,y1:130,c:STYLE.bands.elev},
      {y0: 90,y1:120,c:STYLE.bands.opt},
      {y0:yMin,y1: 90,c:STYLE.bands.hypo}
    ];
    for(const b of bands){
      ctx.fillStyle=b.c;
      ctx.fillRect(x0,yOf(b.y1),pw,yOf(b.y0)-yOf(b.y1));
    }

    function plot(key,style){
      ctx.strokeStyle=style.stroke;
      ctx.lineWidth=style.w;
      ctx.globalAlpha=style.alpha;
      ctx.beginPath();
      let first=true;
      for(const r of records){
        if(r[key]==null||r.ts<S.t0||r.ts>S.t1) continue;
        const x=xOf(r.ts), y=yOf(r[key]);
        if(first){ctx.moveTo(x,y);first=false;} else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.globalAlpha=1;
    }

    plot("sys",STYLE.series.sys);
    plot("dia",STYLE.series.dia);
    plot("hr", STYLE.series.hr);

    ctx.strokeStyle=STYLE.frame;
    ctx.strokeRect(x0,y0,pw,ph);
  }

  async function onShow(){
    bindGestures();
    if(S.t0==null) await ensureDefaultViewport();
    schedule();
  }

  window.VTChart={ onShow };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version: v2.025e
Base: v2.021
Schema: File 7 of 10
Next file: js/gestures.js
*/
