/* File: js/chart.js */
/*
Vitals Tracker - Charts Renderer

Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.025e

FILE ROLE (LOCKED)
- Owns chart rendering only (canvas draw, axes, bands, legend).
- Must NOT own panel switching (panels.js).
- Must NOT own gesture capture (gestures.js).
- Must read data through VTStore (store.js).

CURRENT FIX SCOPE (Render Recovery)
- Ensure chart renders when Charts panel becomes visible (VTChart.onShow()).
- Default view: most recent 7 days of data.
- Zoom range: min 1 day, max 14 days.
- Pan clamp: cannot pan beyond dataset start/end.
- Y scale: start at 40. End at (highest reading in view + 10), capped at 250.
- Hypertension bands shown behind series.
- Legend is color-coded to match bands (as chips).

Pass: Render Recovery + Swipe Feel
Pass order: File 6 of 9
Prev file: js/gestures.js (File 5 of 9)
Next file: js/log.js (File 7 of 9)
*/

(function () {
  "use strict";

  var canvas = null;
  var ctx = null;

  // View state
  var viewDays = 7;           // default
  var minDays = 1;
  var maxDays = 14;

  var viewEndMs = 0;          // right edge of view (ms)
  var datasetMinMs = 0;
  var datasetMaxMs = 0;

  // Render flags
  var inited = false;

  function $(id) { return document.getElementById(id); }

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function msDays(d) { return d * 24 * 60 * 60 * 1000; }

  function safeGetRecords() {
    try {
      if (window.VTStore && typeof window.VTStore.getAll === "function") {
        return window.VTStore.getAll();
      }
    } catch (_) {}
    return [];
  }

  function normalizeRecord(r) {
    // Expecting store records to carry a timestamp. Support common keys.
    var t = r && (r.ts || r.time || r.timestamp || r.date || r.datetime);
    var ms = 0;

    if (typeof t === "number") ms = t;
    else if (typeof t === "string") {
      var p = Date.parse(t);
      if (!isNaN(p)) ms = p;
    }

    // Some stores use "created" or "createdAt"
    if (!ms && r && typeof r.createdAt === "number") ms = r.createdAt;
    if (!ms && r && typeof r.created === "number") ms = r.created;

    // BP fields
    var sys = (r && (r.sys != null ? r.sys : r.systolic)) ;
    var dia = (r && (r.dia != null ? r.dia : r.diastolic)) ;
    var hr  = (r && (r.hr  != null ? r.hr  : r.heartRate)) ;

    sys = sys != null ? Number(sys) : null;
    dia = dia != null ? Number(dia) : null;
    hr  = hr  != null ? Number(hr)  : null;

    if (isNaN(sys)) sys = null;
    if (isNaN(dia)) dia = null;
    if (isNaN(hr))  hr  = null;

    return {
      ms: ms,
      sys: sys,
      dia: dia,
      hr: hr
    };
  }

  function computeDatasetBounds(points) {
    datasetMinMs = 0;
    datasetMaxMs = 0;

    if (!points.length) return;

    datasetMinMs = points[0].ms;
    datasetMaxMs = points[0].ms;

    for (var i = 1; i < points.length; i++) {
      var m = points[i].ms;
      if (m < datasetMinMs) datasetMinMs = m;
      if (m > datasetMaxMs) datasetMaxMs = m;
    }
  }

  function setLoading(text) {
    var el = $("chartsLoading");
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "" : "none";
  }

  function ensureCanvas() {
    canvas = $("chartCanvas");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    return !!ctx;
  }

  function resizeCanvasToCSS() {
    if (!canvas) return;

    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));

    // Device pixel ratio for crisp lines
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Band colors (must match legend chips)
  var bands = [
    { name: "HTN2", min: 140, max: 250, color: "rgba(150,60,70,0.40)" },
    { name: "HTN1", min: 130, max: 139, color: "rgba(140,120,60,0.35)" },
    { name: "Elev", min: 120, max: 129, color: "rgba(70,95,140,0.30)" },
    { name: "Opt",  min:  90, max: 119, color: "rgba(60,120,95,0.25)" },
    { name: "Low",  min:   0, max:  89, color: "rgba(85,70,120,0.22)" }
  ];

  function renderLegend() {
    var host = $("chartLegend");
    if (!host) return;

    // Single legend only (avoid duplication).
    host.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "legendWrap";

    function chip(label, rgba) {
      var c = document.createElement("div");
      c.className = "legendChip";
      var sw = document.createElement("span");
      sw.className = "legendSwatch";
      sw.style.background = rgba;
      var tx = document.createElement("span");
      tx.className = "legendText";
      tx.textContent = label;
      c.appendChild(sw);
      c.appendChild(tx);
      return c;
    }

    wrap.appendChild(chip("HTN2 \u2265140", bands[0].color));
    wrap.appendChild(chip("HTN1 130-139", bands[1].color));
    wrap.appendChild(chip("Elev 120-129", bands[2].color));
    wrap.appendChild(chip("Opt 90-119", bands[3].color));
    wrap.appendChild(chip("Low <90", bands[4].color));

    host.appendChild(wrap);
  }

  function getViewStartMs() {
    return viewEndMs - msDays(viewDays);
  }

  function clampViewToDataset() {
    // If no dataset bounds, keep viewEndMs as "now"
    if (!datasetMinMs || !datasetMaxMs) return;

    var span = msDays(viewDays);

    // Clamp viewEndMs so [start,end] stays within dataset range.
    var minEnd = datasetMinMs + span;
    var maxEnd = datasetMaxMs;

    if (minEnd > maxEnd) {
      // Dataset shorter than span: pin to datasetMax
      viewEndMs = datasetMaxMs;
      return;
    }

    viewEndMs = clamp(viewEndMs, minEnd, maxEnd);
  }

  function buildPointsInView(allPoints) {
    var start = getViewStartMs();
    var end = viewEndMs;

    var pts = [];
    for (var i = 0; i < allPoints.length; i++) {
      var p = allPoints[i];
      if (p.ms >= start && p.ms <= end) pts.push(p);
    }
    return pts;
  }

  function computeYScale(pointsInView) {
    var maxVal = 40;

    for (var i = 0; i < pointsInView.length; i++) {
      var p = pointsInView[i];
      if (p.sys != null && p.sys > maxVal) maxVal = p.sys;
      if (p.dia != null && p.dia > maxVal) maxVal = p.dia;
      if (p.hr  != null && p.hr  > maxVal) maxVal = p.hr;
    }

    var yMin = 40;
    var yMax = Math.min(250, Math.ceil(maxVal + 10));
    if (yMax < yMin + 10) yMax = yMin + 10;

    return { yMin: yMin, yMax: yMax };
  }

  function xForMs(ms, startMs, endMs, plotX, plotW) {
    var t = (ms - startMs) / Math.max(1, (endMs - startMs));
    return plotX + t * plotW;
  }

  function yForVal(v, yMin, yMax, plotY, plotH) {
    var t = (v - yMin) / Math.max(1, (yMax - yMin));
    // invert y
    return plotY + (1 - t) * plotH;
  }

  function clear() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawBands(yMin, yMax, plotX, plotY, plotW, plotH) {
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var bMin = clamp(b.min, yMin, yMax);
      var bMax = clamp(b.max, yMin, yMax);
      if (bMax <= yMin || bMin >= yMax) continue;

      var yTop = yForVal(bMax, yMin, yMax, plotY, plotH);
      var yBot = yForVal(bMin, yMin, yMax, plotY, plotH);

      ctx.fillStyle = b.color;
      ctx.fillRect(plotX, yTop, plotW, (yBot - yTop));
    }
  }

  function drawSeries(points, key, strokeStyle, startMs, endMs, yMin, yMax, plotX, plotY, plotW, plotH) {
    var first = true;

    ctx.lineWidth = 1.25;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var v = p[key];
      if (v == null) continue;

      var x = xForMs(p.ms, startMs, endMs, plotX, plotW);
      var y = yForVal(v, yMin, yMax, plotY, plotH);

      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  function drawAxes(yMin, yMax, plotX, plotY, plotW, plotH) {
    // Border box
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(235,245,255,0.22)";
    ctx.strokeRect(plotX, plotY, plotW, plotH);

    // Simple left labels (min/max only)
    ctx.fillStyle = "rgba(235,245,255,0.70)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(String(yMax), plotX + 6, plotY + 6);
    ctx.textBaseline = "bottom";
    ctx.fillText(String(yMin), plotX + 6, plotY + plotH - 6);
  }

  function render() {
    if (!ensureCanvas()) return;

    resizeCanvasToCSS();
    clear();

    var recs = safeGetRecords();
    var points = [];

    for (var i = 0; i < recs.length; i++) {
      var p = normalizeRecord(recs[i]);
      if (!p.ms) continue;
      points.push(p);
    }

    if (!points.length) {
      setLoading("No readings yet.");
      renderLegend(); // still show legend
      return;
    }

    points.sort(function (a, b) { return a.ms - b.ms; });

    computeDatasetBounds(points);

    // Default view end: datasetMax (most recent point)
    if (!viewEndMs) viewEndMs = datasetMaxMs;

    // Clamp and build view
    viewDays = clamp(viewDays, minDays, maxDays);
    clampViewToDataset();

    var startMs = getViewStartMs();
    var endMs = viewEndMs;

    var viewPts = buildPointsInView(points);
    var ys = computeYScale(viewPts);

    setLoading(""); // hide
    renderLegend();

    // Plot padding
    var padL = 12;
    var padR = 12;
    var padT = 12;
    var padB = 12;

    var plotX = padL;
    var plotY = padT;
    var plotW = Math.max(1, Math.floor(canvas.getBoundingClientRect().width) - padL - padR);
    var plotH = Math.max(1, Math.floor(canvas.getBoundingClientRect().height) - padT - padB);

    // Bands behind
    drawBands(ys.yMin, ys.yMax, plotX, plotY, plotW, plotH);

    // Axes
    drawAxes(ys.yMin, ys.yMax, plotX, plotY, plotW, plotH);

    // Series
    // Systolic: light
    drawSeries(viewPts, "sys", "rgba(235,245,255,0.85)", startMs, endMs, ys.yMin, ys.yMax, plotX, plotY, plotW, plotH);
    // Diastolic: slightly dimmer
    drawSeries(viewPts, "dia", "rgba(235,245,255,0.62)", startMs, endMs, ys.yMin, ys.yMax, plotX, plotY, plotW, plotH);
    // HR: greenish tint (still in palette, subtle)
    drawSeries(viewPts, "hr", "rgba(170,235,210,0.70)", startMs, endMs, ys.yMin, ys.yMax, plotX, plotY, plotW, plotH);
  }

  function onShow() {
    // Called whenever Charts panel becomes visible
    try {
      // If store exists but not initialized, init here as a safety net
      if (window.VTStore && typeof window.VTStore.init === "function") {
        // init() is idempotent in store.js (must be)
        window.VTStore.init();
      }
    } catch (_) {}

    // Reset view end to most recent point each time (default to "current 7 days")
    try {
      var recs = safeGetRecords();
      var maxMs = 0;
      for (var i = 0; i < recs.length; i++) {
        var p = normalizeRecord(recs[i]);
        if (p.ms && p.ms > maxMs) maxMs = p.ms;
      }
      if (maxMs) viewEndMs = maxMs;
    } catch (_) {}

    render();
  }

  function setDays(days) {
    viewDays = clamp(Number(days || 7), minDays, maxDays);
    clampViewToDataset();
    render();
  }

  function panDays(deltaDays) {
    var d = Number(deltaDays || 0);
    if (!d) return;
    viewEndMs = viewEndMs + msDays(d);
    clampViewToDataset();
    render();
  }

  function init() {
    if (inited) return;
    inited = true;

    ensureCanvas();
    renderLegend();

    // Basic responsiveness
    window.addEventListener("resize", function () {
      try { render(); } catch (_) {}
    });

    // Optional: wheel zoom for desktop testing (no effect on mobile)
    canvas = $("chartCanvas");
    if (canvas) {
      canvas.addEventListener("wheel", function (e) {
        try {
          var dir = e.deltaY > 0 ? 1 : -1;
          var next = clamp(viewDays + dir, minDays, maxDays);
          if (next !== viewDays) {
            viewDays = next;
            clampViewToDataset();
            render();
          }
          e.preventDefault();
        } catch (_) {}
      }, { passive: false });
    }
  }

  window.VTChart = {
    init: init,
    onShow: onShow,
    setDays: setDays,
    panDays: panDays
  };

})();

/*
Vitals Tracker - EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version Authority: js/version.js
Pass: Render Recovery + Swipe Feel
Pass order: File 6 of 9
Prev file: js/gestures.js (File 5 of 9)
Next file: js/log.js (File 7 of 9)
*/
