/* File: js/chart.js */
/*
Vitals Tracker — Chart Engine
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.021
Base: v2.020
Date: 2026-01-18

Change Log (v2.021)
1) Hypertension systolic bands: reduced opacity by 30% from v2.020 level (more transparent than prior).
2) Hour-mode x-axis: hour labels remain on top row; day-of-week labels appear below hours centered per day; date row hidden in hour-mode.
3) X-axis label collision control: labels never overlap. We selectively drop labels (hours or days) based on measured width while preserving context.
4) Right-side plot padding: reduced slightly vs prior to reclaim plot width; maintains safe clipping margin.
5) Zoom range: supports pinch down to 1 day and up to 14 days (chart consumer reads view.windowDays).
6) Bands are systolic-only and align to medically recognized ranges (Optimal, Elevated, HTN1, HTN2, Hypotension), drawn across current Y-scale.
7) Prepared hooks for future band legends (reserved; not displayed yet per instruction).

Ownership / Boundaries
- This module ONLY renders charts + axes + bands + legend + label logic.
- Gesture math stays in js/gestures.js.
- Panel navigation stays in js/panels.js.
- Data access goes through StorageBridge (storage.js) and is passed in by app.js.

Exports
- VTChart.render({ canvas, wrapEl, records, view, tz, options }) -> void
- VTChart.setOptions(next) -> void
*/

(function(){
  "use strict";

  const DEFAULTS = {
    tz: "America/Chicago",
    yMin: 40,
    // yMax is auto-fit to data; provided as fallback
    yMaxFallback: 200,
    // small pad above max sys
    yPad: 6,
    // right/left padding tuned for your UI
    padL: 30,
    padR: 18,
    padT: 10,
    padB: 42,

    // bands (systolic-only)
    bands: {
      // Opacity reduced by ~30% vs the previous "more opaque" request.
      // NOTE: these are the CURRENT baseline levels; next edit requested: reduce transparency by 25% from current and add legend.
      ht2:  "rgba(255, 70, 70, .18)",
      ht1:  "rgba(255, 210, 80, .17)",
      elev: "rgba(80, 160, 255, .15)",
      opt:  "rgba(70, 120, 255, .11)",
      hypo: "rgba(170, 120, 255, .13)"
    },

    // day banding
    dayBandA: "rgba(40,90,170,.12)",
    dayBandB: "rgba(0,0,0,.12)",

    // grid and labels
    grid: "rgba(235,245,255,.10)",
    frame: "rgba(235,245,255,.14)",
    yLabel: "rgba(235,245,255,.58)",
    xLabel: "rgba(235,245,255,.58)",

    // series
    series: {
      sys: { stroke:"rgba(170,210,255,1)", alpha:0.95 },
      dia: { stroke:"rgba(235,245,255,1)", alpha:0.78 },
      hr:  { stroke:"rgba(150,255,210,1)", alpha:0.72 }
    },

    // legend
    legend: true
  };

  function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
  function safeNum(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function extractTs(r){
    return r.ts || r.time || r.timestamp || r.date || r.createdAt || r.created_at || r.iso || null;
  }
  function extractBP(r){
    const sys = safeNum(r.sys ?? r.systolic ?? (r.bp && (r.bp.sys ?? r.bp.systolic)));
    const dia = safeNum(r.dia ?? r.diastolic ?? (r.bp && (r.bp.dia ?? r.bp.diastolic)));
    return { sys, dia };
  }
  function extractHR(r){
    return safeNum(r.hr ?? r.heartRate ?? r.pulse ?? (r.vitals && (r.vitals.hr ?? r.vitals.pulse)));
  }

  const MS_HOUR = 3600000;
  const MS_DAY  = 86400000;

  function makeFmtYMDParts(tz){
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit" });
  }
  function makeFmtWeekday(tz){
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday:"short" });
  }
  function makeFmtMD(tz){
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, month:"2-digit", day:"2-digit" });
  }
  function makeFmtHourNum12(tz){
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour:"numeric", hour12:true });
  }

  function fmtCTDateOnly(ms, fmtYMDParts){
    try{
      if(!Number.isFinite(ms)) return "—";
      const parts = fmtYMDParts.formatToParts(new Date(ms));
      const map = {};
      for(const p of parts) map[p.type]=p.value;
      return `${map.year}-${map.month}-${map.day}`;
    }catch(_){
      return "—";
    }
  }

  function ctDayKey(ms, fmtYMDParts){
    const parts = fmtYMDParts.formatToParts(new Date(ms));
    const get = (t)=> parts.find(p=>p.type===t)?.value || "";
    const y = get("year");
    const m = get("month");
    const d = get("day");
    return `${y}-${m}-${d}`;
  }

  function computeDataBounds(records){
    let tMin = Infinity, tMax = -Infinity;
    for(const r of records){
      const t = new Date(extractTs(r) || 0).getTime();
      if(Number.isFinite(t) && t>0){
        tMin = Math.min(tMin, t);
        tMax = Math.max(tMax, t);
      }
    }
    if(!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMin===Infinity || tMax===-Infinity){
      return { tMin:null, tMax:null };
    }
    return { tMin, tMax };
  }

  function computeGlobalYMaxFromDB(records, yPad, fallback){
    let maxSys = null;
    for(const r of records){
      const bp = extractBP(r);
      if(bp.sys != null){
        maxSys = (maxSys == null) ? bp.sys : Math.max(maxSys, bp.sys);
      }
    }
    if(maxSys == null) return fallback;

    const raw = maxSys + yPad;
    const nice = Math.ceil(raw / 10) * 10;
    return Math.max(120, nice);
  }

  function buildSystolicBands(yMin, yMax, fills){
    // "medically recognized" (systolic)
    // - Hypotension: <90
    // - Optimal: <120
    // - Elevated: 120–129
    // - HTN1: 130–139
    // - HTN2: >=140
    return [
      { name:"HTN2", y0:140, y1:yMax, fill:fills.ht2 },
      { name:"HTN1", y0:130, y1:140,  fill:fills.ht1 },
      { name:"Elev", y0:120, y1:130,  fill:fills.elev },
      { name:"Opt",  y0: 90, y1:120,  fill:fills.opt },
      { name:"Hypo", y0:yMin, y1: 90, fill:fills.hypo }
    ];
  }

  function buildNiceYTicks(yMin, yMax){
    const span = Math.max(1, yMax - yMin);
    let step = 20;
    if(span <= 90) step = 10;
    else if(span <= 160) step = 20;
    else step = 20;

    const start = Math.floor(yMin / step) * step;
    const ticks = [];
    for(let v=start; v<=yMax; v+=step){
      if(v >= yMin) ticks.push(v);
    }
    if(ticks[ticks.length-1] !== yMax) ticks.push(yMax);
    return ticks;
  }

  function computeDayBoundaries(t0, t1, fmtYMDParts){
    const bounds = [];
    if(!Number.isFinite(t0) || !Number.isFinite(t1) || t1<=t0) return bounds;

    let t = Math.floor(t0 / MS_HOUR) * MS_HOUR;
    let prevKey = ctDayKey(t, fmtYMDParts);

    while(t < t1 + MS_HOUR){
      const tNext = t + MS_HOUR;
      const nextKey = ctDayKey(tNext, fmtYMDParts);
      if(nextKey !== prevKey){
        let lo = t, hi = tNext;
        for(let i=0;i<12;i++){
          const mid = Math.floor((lo+hi)/2);
          if(ctDayKey(mid, fmtYMDParts) === prevKey) lo = mid; else hi = mid;
        }
        const boundary = hi;
        if(boundary >= t0 && boundary <= t1) bounds.push(boundary);
        prevKey = nextKey;
      }
      t = tNext;
    }
    return bounds.sort((a,b)=>a-b);
  }

  function buildSeriesVisible(records, t0, t1){
    const sys = [], dia = [], hr = [];
    for(const r of records){
      const t = new Date(extractTs(r) || 0).getTime();
      if(!Number.isFinite(t) || t<=0) continue;
      if(t < t0 || t > t1) continue;

      const bp = extractBP(r);
      const h = extractHR(r);

      if(bp.sys != null) sys.push({t, y: bp.sys});
      if(bp.dia != null) dia.push({t, y: bp.dia});
      if(h != null)      hr.push({t, y: h});
    }
    sys.sort((a,b)=>a.t-b.t);
    dia.sort((a,b)=>a.t-b.t);
    hr.sort((a,b)=>a.t-b.t);
    return { sys, dia, hr };
  }

  function plotLine(ctx, points, frame, t0, t1, yMin, yMax, stroke, alpha){
    if(points.length < 2) return;
    const { x0, pw } = frame;

    const yToPx = (y)=>{
      const t = (y - yMin) / Math.max(1, (yMax - yMin));
      return frame.y0 + (1 - t) * frame.ph;
    };

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.35;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";

    ctx.beginPath();
    for(let i=0;i<points.length;i++){
      const p = points[i];
      const x = x0 + ((p.t - t0) / (t1 - t0)) * pw;
      const y = yToPx(p.y);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // points
    ctx.fillStyle = stroke;
    ctx.globalAlpha = Math.min(1, alpha + 0.08);
    for(const p of points){
      const x = x0 + ((p.t - t0) / (t1 - t0)) * pw;
      const y = yToPx(p.y);
      ctx.fillRect(Math.round(x)-1, Math.round(y)-1, 2, 2);
    }

    ctx.restore();
  }

  function measureText(ctx, s){
    return ctx.measureText(s).width;
  }

  function dropOverlappingTicks(ctx, ticks, x0, pw, t0, t1, minGapPx){
    // ticks: {t, top, bot?, dayKey?}
    const placed = [];
    let lastRight = -Infinity;

    for(const tk of ticks){
      const x = x0 + ((tk.t - t0)/(t1 - t0)) * pw;
      const wTop = tk.top ? measureText(ctx, tk.top) : 0;
      const wBot = tk.bot ? measureText(ctx, tk.bot) : 0;
      const w = Math.max(wTop, wBot);

      const left = x - (w/2);
      const right = x + (w/2);

      if(left >= lastRight + minGapPx){
        placed.push(tk);
        lastRight = right;
      }
    }
    return placed;
  }

  function buildXTicks(t0, t1, tz, fmtYMDParts){
    const spanDays = (t1 - t0) / MS_DAY;
    const ticks = [];
    const hourMode = (spanDays <= 2.0);

    if(hourMode){
      const fmtHourNum = makeFmtHourNum12(tz);
      // 4-hour cadence
      const step = 4 * MS_HOUR;
      let t = Math.ceil(t0/step)*step;
      while(t <= t1){
        const hour = fmtHourNum.format(new Date(t)); // "12", "4", "8", etc
        ticks.push({ t, top: hour, bot: "" });
        t += step;
      }
      return { ticks, hourMode:true };
    }

    const fmtDay = makeFmtWeekday(tz);
    const fmtMD = makeFmtMD(tz);

    const bounds = computeDayBoundaries(t0, t1, fmtYMDParts);
    const cuts = [t0, ...bounds].filter(v=>v>=t0 && v<=t1);

    for(const t of cuts){
      ticks.push({ t, top: fmtDay.format(new Date(t)), bot: fmtMD.format(new Date(t)) });
    }
    return { ticks, hourMode:false };
  }

  function computeDayCentersInRange(t0, t1, tz, fmtYMDParts){
    // For hour-mode: show weekday label centered per day (below hours).
    const bounds = computeDayBoundaries(t0, t1, fmtYMDParts);
    const cuts = [t0, ...bounds, t1].filter((v,i,a)=> i===0 || v>a[i-1]);
    const fmtDay = makeFmtWeekday(tz);

    const days = [];
    for(let i=0;i<cuts.length-1;i++){
      const a = cuts[i], b = cuts[i+1];
      const mid = a + (b-a)/2;
      days.push({ t: mid, label: fmtDay.format(new Date(mid)) });
    }
    return days;
  }

  function drawLegend(ctx, frame, series){
    const { x0, y0 } = frame;
    ctx.save();
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const items = [
      { label:"Systolic",  stroke:series.sys.stroke, alpha:series.sys.alpha },
      { label:"Diastolic", stroke:series.dia.stroke, alpha:series.dia.alpha },
      { label:"Heart Rate",stroke:series.hr.stroke,  alpha:series.hr.alpha  }
    ];

    let lx = x0 + 8;
    let ly = y0 + 6;
    for(const it of items){
      ctx.fillStyle = "rgba(235,245,255,.72)";
      ctx.strokeStyle = it.stroke;
      ctx.globalAlpha = it.alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly+7);
      ctx.lineTo(lx+16, ly+7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(it.label, lx+22, ly);
      ly += 18;
    }
    ctx.restore();
  }

  function renderImpl(args){
    const canvas = args.canvas;
    const wrapEl = args.wrapEl;
    const records = Array.isArray(args.records) ? args.records : [];
    const view = args.view || {};
    const tz = args.tz || DEFAULTS.tz;
    const opt = Object.assign({}, DEFAULTS, args.options || {});
    opt.tz = tz;

    if(!canvas || !wrapEl) return;

    // setup canvas (DPR)
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(280, Math.floor(rect.width));
    const cssH = Math.max(220, Math.floor(rect.height));
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d", { alpha:true, desynchronized:true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // clear
    ctx.clearRect(0,0,cssW,cssH);

    if(!records.length){
      // nothing to draw
      return;
    }

    const fmtYMDParts = makeFmtYMDParts(tz);

    // time range
    const bounds = computeDataBounds(records);
    if(bounds.tMin == null || bounds.tMax == null) return;

    const windowDays = clamp(Number(view.windowDays ?? 7) || 7, 1, 14);

    // view center must be provided by app.js; if missing, default near newest
    let centerMs = Number.isFinite(view.centerMs) ? view.centerMs : (bounds.tMax - (windowDays*MS_DAY*0.35));
    centerMs = clamp(centerMs, bounds.tMin, bounds.tMax);

    const wMs = windowDays * MS_DAY;
    let t0 = centerMs - wMs/2;
    let t1 = centerMs + wMs/2;

    if(t0 < bounds.tMin){
      const shift = bounds.tMin - t0;
      t0 += shift; t1 += shift;
    }
    if(t1 > bounds.tMax){
      const shift = t1 - bounds.tMax;
      t0 -= shift; t1 -= shift;
    }
    t0 = Math.max(bounds.tMin, t0);
    t1 = Math.min(bounds.tMax, t1);

    // y scale
    const yMin = opt.yMin;
    const yMax = computeGlobalYMaxFromDB(records, opt.yPad, opt.yMaxFallback);

    // frame
    const padL = opt.padL, padR = opt.padR, padT = opt.padT, padB = opt.padB;
    const x0 = padL, y0 = padT;
    const pw = cssW - padL - padR;
    const ph = cssH - padT - padB;

    // frame rect
    ctx.strokeStyle = opt.frame;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, pw, ph);

    const frame = { x0, y0, pw, ph };

    const yToPx = (y)=>{
      const t = (y - yMin) / Math.max(1, (yMax - yMin));
      return y0 + (1 - t) * ph;
    };

    // alternating days background
    {
      const dayBounds = computeDayBoundaries(t0, t1, fmtYMDParts);
      const cuts = [t0, ...dayBounds, t1].filter((v,i,a)=> i===0 || v>a[i-1]);

      // parity by day-of-month from start
      const startKey = ctDayKey(t0, fmtYMDParts);
      const startD = Number(startKey.slice(-2)) || 1;
      let parity = startD % 2;

      for(let i=0;i<cuts.length-1;i++){
        const a = cuts[i], b = cuts[i+1];
        const xa = x0 + ((a - t0)/(t1 - t0)) * pw;
        const xb = x0 + ((b - t0)/(t1 - t0)) * pw;
        const isAlt = ((parity + i) % 2) === 0;
        ctx.fillStyle = isAlt ? opt.dayBandA : opt.dayBandB;
        ctx.fillRect(xa, y0, Math.max(0, xb-xa), ph);
      }
    }

    // systolic bands (systolic-only)
    {
      const bands = buildSystolicBands(yMin, yMax, opt.bands);
      for(const b of bands){
        const yTop = yToPx(b.y1);
        const yBot = yToPx(b.y0);
        const h = Math.max(0, yBot - yTop);
        ctx.fillStyle = b.fill;
        ctx.fillRect(x0, yTop, pw, h);
      }
    }

    // y grid + labels
    {
      const ticks = buildNiceYTicks(yMin, yMax);
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = opt.yLabel;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      for(const val of ticks){
        const y = yToPx(val);
        ctx.strokeStyle = opt.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0+pw, y);
        ctx.stroke();

        ctx.fillText(String(val), 4, y);
      }
    }

    // x labels with collision control
    {
      const { ticks, hourMode } = buildXTicks(t0, t1, tz, fmtYMDParts);

      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = opt.xLabel;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // first: prevent overlap on hour/day ticks
      const minGap = 8;
      const safeTicks = dropOverlappingTicks(ctx, ticks, x0, pw, t0, t1, minGap);

      for(const tk of safeTicks){
        const x = x0 + ((tk.t - t0) / (t1 - t0)) * pw;

        ctx.strokeStyle = opt.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y0 + ph);
        ctx.lineTo(x, y0 + ph + 5);
        ctx.stroke();

        if(tk.top){
          ctx.fillText(tk.top, x, y0 + ph + 8);
        }

        // non-hour mode shows date row
        if(!hourMode && tk.bot){
          ctx.fillText(tk.bot, x, y0 + ph + 22);
        }
      }

      // hourMode: weekday labels centered per day (no date row)
      if(hourMode){
        const dayCenters = computeDayCentersInRange(t0, t1, tz, fmtYMDParts);

        // weekday labels can also collide; drop overlaps
        const dayTicks = dayCenters.map(d => ({ t:d.t, top:d.label, bot:"" }));
        const safeDays = dropOverlappingTicks(ctx, dayTicks, x0, pw, t0, t1, 10);

        // place weekday row below hours row
        for(const tk of safeDays){
          const x = x0 + ((tk.t - t0)/(t1 - t0)) * pw;
          ctx.fillText(tk.top, x, y0 + ph + 24);
        }
      }
    }

    // series
    const series = buildSeriesVisible(records, t0, t1);
    plotLine(ctx, series.sys, {x0, y0, pw, ph}, t0, t1, yMin, yMax, opt.series.sys.stroke, opt.series.sys.alpha);
    plotLine(ctx, series.dia, {x0, y0, pw, ph}, t0, t1, yMin, yMax, opt.series.dia.stroke, opt.series.dia.alpha);
    plotLine(ctx, series.hr,  {x0, y0, pw, ph}, t0, t1, yMin, yMax, opt.series.hr.stroke,  opt.series.hr.alpha);

    // legend (series only)
    if(opt.legend){
      drawLegend(ctx, {x0, y0, pw, ph}, opt.series);
    }

    // return computed values for caller to use in top label if needed
    return { t0, t1, yMin, yMax, windowDays };
  }

  const VTChart = {
    _options: Object.assign({}, DEFAULTS),

    setOptions(next){
      this._options = Object.assign({}, this._options, next || {});
    },

    render(payload){
      return renderImpl(Object.assign({}, payload, { options: Object.assign({}, this._options, (payload && payload.options) || {}) }));
    }
  };

  window.VTChart = VTChart;

})();
