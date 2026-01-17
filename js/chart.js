/*
Vitals Tracker (Modular) — js/chart.js
App Version: v2.001

Purpose:
- Charts rendering + chart-range state for the modular v2 app.
- Implements:
  - Default view: most recent 7 days (based on latest record timestamp)
  - Zoom: min 1 day, max 14 days (horizontal only)
  - Pan left/right across time (within available data bounds)
  - Dynamic Y-axis labels based on visible data
  - Hypertension bands (systolic-focused) as subtle but obvious clinical cues
  - Visible range label (replaces any date-range selector UI)
  - Export scope: ONLY records inside current visible chart range

Integration:
- Requires global VT namespace:
  - VT.data.getAll(): array of records {ts,sys,dia,hr,notes,symptoms}
  - VT.util: helpers (fmtDateShort, fmtDateTime, startOfDay, clamp)
  - VT.gestures: attaches chart gestures and calls provided callbacks
- Exposes:
  - VT.chart.init({ canvasEl, rangeLabelEl })
  - VT.chart.render()
  - VT.chart.setDefaultRange()
  - VT.chart.getVisibleRange() => {min,max}
  - VT.chart.getVisibleRecords() => records in view (ascending ts)
  - VT.chart.onDataChanged() (call after add/edit/delete)

Latest Update (v2.001):
- Initial modular charts implementation.
- Horizontal-only pinch zoom and pan hooks (actual gesture math lives in gestures.js).
- Hypertension bands added.
- Range label replaces week selector logic from v1.19B44.
*/

(() => {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;

  // Systolic-focused hypertension bands (AHA-style ranges; informative, not clinical advice)
  // Bounds are inclusive on low end, exclusive on high end (except last).
  const HTN_BANDS = [
    { name: "Hypotensive",   min: -Infinity, max: 90,  alpha: 0.12 },
    { name: "Normal",        min: 90,        max: 120, alpha: 0.10 },
    { name: "Elevated",      min: 120,       max: 130, alpha: 0.12 },
    { name: "HTN Stage 1",   min: 130,       max: 140, alpha: 0.14 },
    { name: "HTN Stage 2",   min: 140,       max: 180, alpha: 0.16 },
    { name: "Hypertensive",  min: 180,       max: Infinity, alpha: 0.18 },
  ];

  const VT = (window.VT = window.VT || {});
  VT.chart = VT.chart || {};

  let canvas = null;
  let ctx = null;
  let rangeLabelEl = null;

  // view state
  const view = {
    minSpan: 1 * DAY_MS,
    maxSpan: 14 * DAY_MS,
    baseMin: 0, // earliest available ts boundary
    baseMax: 0, // latest available ts boundary
    vMin: 0,
    vMax: 0,
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function getAllAsc() {
    const recs = (VT.data && VT.data.getAll) ? VT.data.getAll() : [];
    // ensure ascending for draw loop
    return recs.slice().sort((a, b) => a.ts - b.ts);
  }

  function computeBaseBounds(recsAsc) {
    if (!recsAsc.length) {
      const now = Date.now();
      return { baseMin: now - 7 * DAY_MS, baseMax: now };
    }
    const minTs = recsAsc[0].ts;
    const maxTs = recsAsc[recsAsc.length - 1].ts;
    // Give minimal padding to allow pan to show leading/trailing space within the 14d cap.
    return { baseMin: minTs, baseMax: maxTs };
  }

  function setDefaultRange() {
    const recsAsc = getAllAsc();
    const { baseMin, baseMax } = computeBaseBounds(recsAsc);
    view.baseMin = baseMin;
    view.baseMax = baseMax;

    // default: most recent 7 days ending at latest record (or now if no records)
    const end = baseMax || Date.now();
    const start = end - 7 * DAY_MS;
    view.vMax = end;
    view.vMin = start;

    // ensure within base bounds; if dataset is narrow, allow some slack but keep sane
    clampViewToData();
    updateRangeLabel();
  }

  function clampViewToData() {
    const span = clamp(view.vMax - view.vMin, view.minSpan, view.maxSpan);
    const mid = (view.vMin + view.vMax) / 2;

    let vMin = mid - span / 2;
    let vMax = mid + span / 2;

    // If no data, allow pan within "now-14d .. now"
    const baseMin = view.baseMin || (Date.now() - 14 * DAY_MS);
    const baseMax = view.baseMax || Date.now();

    // Expand allowable pan window slightly so user can see context:
    // Clamp to [baseMin - 1d, baseMax + 1d] but keep within maxSpan logic.
    const panMin = baseMin - 1 * DAY_MS;
    const panMax = baseMax + 1 * DAY_MS;

    if (vMin < panMin) { vMin = panMin; vMax = panMin + span; }
    if (vMax > panMax) { vMax = panMax; vMin = panMax - span; }

    view.vMin = vMin;
    view.vMax = vMax;
  }

  function fmtRange(minTs, maxTs) {
    const u = VT.util || {};
    const a = u.fmtDateShort ? u.fmtDateShort(minTs) : new Date(minTs).toLocaleDateString();
    const b = u.fmtDateShort ? u.fmtDateShort(maxTs) : new Date(maxTs).toLocaleDateString();
    return `${a} to ${b}`;
  }

  function updateRangeLabel() {
    if (!rangeLabelEl) return;
    rangeLabelEl.textContent = `Visible: ${fmtRange(view.vMin, view.vMax)}`;
  }

  function getVisibleRange() {
    return { min: view.vMin, max: view.vMax };
  }

  function getVisibleRecords() {
    const recsAsc = getAllAsc();
    const a = view.vMin;
    const b = view.vMax;
    return recsAsc.filter(r => r.ts >= a && r.ts <= b);
  }

  function pickValues(recs) {
    const vals = [];
    for (const r of recs) {
      if (Number.isFinite(r.sys)) vals.push(r.sys);
      if (Number.isFinite(r.dia)) vals.push(r.dia);
      if (Number.isFinite(r.hr)) vals.push(r.hr);
    }
    return vals;
  }

  function computeYBounds(recs) {
    const vals = pickValues(recs);
    if (!vals.length) return { yMin: 40, yMax: 180 };

    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const padV = Math.max(8, Math.round((maxV - minV) * 0.12));
    let yMin = minV - padV;
    let yMax = maxV + padV;

    // Ensure systolic bands are visible contextually by including 90..180 when close
    yMin = Math.min(yMin, 80);
    yMax = Math.max(yMax, 190);

    // Prevent zero span
    if (yMax - yMin < 20) {
      yMin -= 10; yMax += 10;
    }
    return { yMin, yMax };
  }

  function xFromTs(ts, tMin, tMax, pad, W) {
    const span = W - pad.l - pad.r;
    const denom = (tMax - tMin) || 1;
    const u = (ts - tMin) / denom;
    return pad.l + span * u;
  }

  function yTo(v, yMin, yMax, pad, H) {
    const span = H - pad.t - pad.b;
    const t = (v - yMin) / (yMax - yMin || 1);
    return pad.t + span * (1 - t);
  }

  function drawBackground(ctx, W, H) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(235,245,255,.12)";
    ctx.fillStyle = "rgba(255,255,255,.02)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, W, H, 22);
    else ctx.rect(0, 0, W, H);
    ctx.fill();
    ctx.stroke();
  }

  function drawHypertensionBands(ctx, plot, yMin, yMax) {
    // draw inside plot area only
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x0, plot.y0, plot.w, plot.h);
    ctx.clip();

    // Use a single hue family but varying alpha; avoid distracting colors.
    // If you later want explicit colors, we can add them.
    for (const band of HTN_BANDS) {
      const b0 = Math.max(band.min, yMin);
      const b1 = Math.min(band.max, yMax);
      if (b1 <= b0) continue;

      const yTop = yTo(b1, yMin, yMax, plot.pad, plot.H);
      const yBot = yTo(b0, yMin, yMax, plot.pad, plot.H);

      ctx.fillStyle = `rgba(47,120,255,${band.alpha})`;
      ctx.fillRect(plot.x0, yTop, plot.w, Math.max(0, yBot - yTop));
    }

    // band labels (left side, subtle)
    ctx.font = "12px system-ui,Segoe UI,Roboto";
    ctx.fillStyle = "rgba(235,245,255,.40)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (const band of HTN_BANDS) {
      const mid = (Math.max(band.min, yMin) + Math.min(band.max, yMax)) / 2;
      if (!Number.isFinite(mid)) continue;
      if (mid < yMin || mid > yMax) continue;
      const y = yTo(mid, yMin, yMax, plot.pad, plot.H);
      // keep labels inside plot a bit
      if (y < plot.y0 + 10 || y > plot.y0 + plot.h - 10) continue;
      ctx.fillText(band.name, plot.x0 + 8, y);
    }

    ctx.restore();
  }

  function drawGridAndYLabels(ctx, W, H, pad, yMin, yMax) {
    ctx.font = "16px system-ui,Segoe UI,Roboto";
    ctx.fillStyle = "rgba(235,245,255,.60)";
    ctx.strokeStyle = "rgba(235,245,255,.10)";
    ctx.lineWidth = 1;

    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.t + (H - pad.t - pad.b) * (i / ticks);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();

      const val = Math.round(yMax - (yMax - yMin) * (i / ticks));
      ctx.fillText(String(val), 16, y + 6);
    }
  }

  function drawXLabels(ctx, W, H, pad, tMin, tMax) {
    const rangeMs = (tMax - tMin);
    const showTime = rangeMs <= (2 * DAY_MS);

    ctx.fillStyle = "rgba(235,245,255,.90)";
    ctx.font = "20px system-ui,Segoe UI,Roboto";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const yDow = H - 44;
    const yDate = H - 22;

    // label each day that intersects view
    const u = VT.util || {};
    const start = u.startOfDay ? u.startOfDay(tMin) : (new Date(tMin).setHours(0,0,0,0), tMin);
    const startDay = (u.startOfDay ? u.startOfDay(tMin) : new Date(tMin).setHours(0,0,0,0));

    const days = Math.min(14, Math.max(1, Math.ceil((tMax - tMin) / DAY_MS) + 1));
    for (let i = 0; i < days; i++) {
      const dayStart = startDay + i * DAY_MS;
      const dayCenter = dayStart + (DAY_MS / 2);
      if (dayCenter < tMin || dayCenter > tMax) continue;

      const x = xFromTs(dayCenter, tMin, tMax, pad, W);

      const dow = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(dayStart));
      const md = new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit" }).format(new Date(dayStart));

      ctx.fillText(dow, x, yDow);

      ctx.fillStyle = "rgba(235,245,255,.70)";
      ctx.font = "16px system-ui,Segoe UI,Roboto";
      ctx.fillText(md, x, yDate);

      ctx.fillStyle = "rgba(235,245,255,.90)";
      ctx.font = "20px system-ui,Segoe UI,Roboto";
    }

    if (showTime) {
      ctx.fillStyle = "rgba(235,245,255,.56)";
      ctx.font = "14px system-ui,Segoe UI,Roboto";
      ctx.textAlign = "left";

      const labelCount = 4;
      for (let i = 0; i < labelCount; i++) {
        const ts = tMin + rangeMs * (i / (labelCount - 1 || 1));
        const x = xFromTs(ts, tMin, tMax, pad, W);

        const d = new Date(ts);
        const lab = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);

        const maxX = W - pad.r - 2;
        const minX = pad.l + 2;
        let tx = x - 18;
        if (tx < minX) tx = minX;
        if (tx > maxX - 54) tx = maxX - 54;

        ctx.fillText(lab, tx, H - 66);
      }
    }

    ctx.textAlign = "start";
  }

  function drawAlternatingDayBands(ctx, plot, tMin, tMax) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x0, plot.y0, plot.w, plot.h);
    ctx.clip();

    const startDay = (VT.util && VT.util.startOfDay) ? VT.util.startOfDay(tMin) : (() => {
      const d = new Date(tMin); d.setHours(0,0,0,0); return d.getTime();
    })();

    const days = Math.min(16, Math.max(1, Math.ceil((tMax - tMin) / DAY_MS) + 1));
    for (let i = 0; i < days; i++) {
      const bandStart = startDay + i * DAY_MS;
      const bandEnd = bandStart + DAY_MS;

      const a = Math.max(bandStart, tMin);
      const b = Math.min(bandEnd, tMax);
      if (b <= a) continue;

      let x0 = xFromTs(a, tMin, tMax, plot.pad, plot.W);
      let x1 = xFromTs(b, tMin, tMax, plot.pad, plot.W);
      x0 = Math.max(x0, plot.x0);
      x1 = Math.min(x1, plot.x0 + plot.w);
      if (x1 <= x0) continue;

      ctx.fillStyle = (i % 2 === 0)
        ? "rgba(255,255,255,.10)"
        : "rgba(47,120,255,.18)";
      ctx.fillRect(x0, plot.y0, (x1 - x0), plot.h);
    }

    ctx.restore();
  }

  function drawSeries(ctx, recsAsc, pick, tMin, tMax, yMin, yMax, pad, W, H, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    let started = false;
    let prevTs = null;

    ctx.beginPath();
    for (const r of recsAsc) {
      if (r.ts < tMin || r.ts > tMax) continue;

      const v = pick(r);
      if (v == null || !Number.isFinite(v)) { started = false; prevTs = r.ts; continue; }

      if (prevTs != null) {
        const prevDay = (VT.util && VT.util.startOfDay) ? VT.util.startOfDay(prevTs) : (() => {
          const d = new Date(prevTs); d.setHours(0,0,0,0); return d.getTime();
        })();
        const curDay = (VT.util && VT.util.startOfDay) ? VT.util.startOfDay(r.ts) : (() => {
          const d = new Date(r.ts); d.setHours(0,0,0,0); return d.getTime();
        })();
        if (curDay - prevDay > DAY_MS) started = false;
      }

      const x = xFromTs(r.ts, tMin, tMax, pad, W);
      const y = yTo(v, yMin, yMax, pad, H);

      if (!started) { ctx.moveTo(x, y); started = true; }
      else { ctx.lineTo(x, y); }

      prevTs = r.ts;
    }
    ctx.stroke();
  }

  function drawLegend(ctx, pad) {
    const lx = pad.l + 10;
    let ly = pad.t + 26;

    ctx.font = "22px system-ui,Segoe UI,Roboto";
    ctx.textAlign = "start";

    function legend(text, color) {
      ctx.fillStyle = color;
      ctx.fillRect(lx, ly - 14, 26, 8);
      ctx.fillStyle = "rgba(235,245,255,.88)";
      const spaced = text.split("").join(" ");
      ctx.fillText(spaced, lx + 38, ly - 6);
      ly += 32;
    }

    legend("Systolic", "rgba(79,140,255,.98)");
    legend("Diastolic", "rgba(216,224,240,.88)");
    legend("Heart Rate", "rgba(120,220,180,.92)");
  }

  function render() {
    if (!canvas || !ctx) return;

    clampViewToData();
    updateRangeLabel();

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    drawBackground(ctx, W, H);

    const pad = { l: 62, r: 18, t: 18, b: 92 };
    const plot = {
      x0: pad.l,
      y0: pad.t,
      w: (W - pad.l - pad.r),
      h: (H - pad.t - pad.b),
      pad,
      W,
      H,
    };

    const recsAsc = getAllAsc();
    const visible = getVisibleRecords();
    const { yMin, yMax } = computeYBounds(visible);

    const tMin = view.vMin;
    const tMax = view.vMax;

    // day bands (visual time cues)
    drawAlternatingDayBands(ctx, plot, tMin, tMax);

    // hypertension bands (systolic focused)
    drawHypertensionBands(ctx, plot, yMin, yMax);

    // grid + y labels
    drawGridAndYLabels(ctx, W, H, pad, yMin, yMax);

    // x labels (days; time when zoomed in close)
    drawXLabels(ctx, W, H, pad, tMin, tMax);

    if (visible.length) {
      drawSeries(ctx, recsAsc, r => r.sys, tMin, tMax, yMin, yMax, pad, W, H, "rgba(79,140,255,.98)");
      drawSeries(ctx, recsAsc, r => r.dia, tMin, tMax, yMin, yMax, pad, W, H, "rgba(216,224,240,.88)");
      drawSeries(ctx, recsAsc, r => r.hr,  tMin, tMax, yMin, yMax, pad, W, H, "rgba(120,220,180,.92)");
    } else {
      ctx.fillStyle = "rgba(235,245,255,.46)";
      ctx.font = "18px system-ui,Segoe UI,Roboto";
      ctx.fillText("No readings in this view.", pad.l + 12, pad.t + 34);
    }

    drawLegend(ctx, pad);
  }

  function onZoom(scale, anchorTs) {
    // scale > 1 means zoom in, < 1 means zoom out
    const curSpan = view.vMax - view.vMin;
    let newSpan = curSpan / (scale || 1);
    newSpan = clamp(newSpan, view.minSpan, view.maxSpan);

    const anchor = Number.isFinite(anchorTs) ? anchorTs : (view.vMin + curSpan / 2);

    view.vMin = anchor - newSpan / 2;
    view.vMax = anchor + newSpan / 2;
    clampViewToData();
    render();
  }

  function onPan(deltaTs) {
    // deltaTs positive means move window forward in time
    view.vMin += deltaTs;
    view.vMax += deltaTs;
    clampViewToData();
    render();
  }

  function init(opts) {
    canvas = opts.canvasEl;
    rangeLabelEl = opts.rangeLabelEl;

    if (!canvas) throw new Error("VT.chart.init: missing canvasEl");
    ctx = canvas.getContext("2d");

    // default range from data
    setDefaultRange();

    // Attach gestures: gestures.js must call these callbacks.
    if (VT.gestures && VT.gestures.attachChartGestures) {
      VT.gestures.attachChartGestures(canvas, {
        getRange: () => ({ min: view.vMin, max: view.vMax }),
        setRange: (min, max) => { view.vMin = min; view.vMax = max; clampViewToData(); render(); },
        zoom: onZoom,
        pan: onPan,
        clampSpan: (span) => clamp(span, view.minSpan, view.maxSpan),
      });
    }

    render();
  }

  function onDataChanged() {
    // Keep current zoom level if possible, but update base bounds.
    const recsAsc = getAllAsc();
    const { baseMin, baseMax } = computeBaseBounds(recsAsc);
    view.baseMin = baseMin;
    view.baseMax = baseMax;

    // If current range is empty (no vMin/vMax yet), reset default.
    if (!Number.isFinite(view.vMin) || !Number.isFinite(view.vMax) || view.vMax <= view.vMin) {
      setDefaultRange();
    } else {
      // If user has panned beyond new bounds, clamp.
      clampViewToData();
      updateRangeLabel();
    }
    render();
  }

  VT.chart.init = init;
  VT.chart.render = render;
  VT.chart.setDefaultRange = setDefaultRange;
  VT.chart.getVisibleRange = getVisibleRange;
  VT.chart.getVisibleRecords = getVisibleRecords;
  VT.chart.onDataChanged = onDataChanged;

})();
 
/*
Vitals Tracker (Modular) — js/chart.js (EOF)
App Version: v2.001
Notes:
- Gestures are horizontal-only by design; canvas has touch-action:none so the chart consumes gestures.
- Next expected file: js/export.js
*/
