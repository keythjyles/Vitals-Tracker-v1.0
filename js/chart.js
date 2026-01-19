/* File: js/chart.js */
/*
Vitals Tracker — Charts Renderer (LOCKED ROLE)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns chart rendering only (canvas draw).
- May format legend for chart/bands (presentation).
- Must NOT own storage, swipe, or panel routing logic.
- Exposes window.VTChart with init()/onShow().

v2.025f — Change Log (THIS FILE ONLY)
1) Makes canvas sizing robust (auto-finds canvas; sizes to container).
2) Enforces Y-range rule: min=40, max=min(250, maxReading+10) with headroom.
3) Improves plot-area utilization (reduced padding; larger drawable region).
4) Adds band legend that is COLOR-CODED to match the bands (no drift).
5) Keeps drawing resilient even if some DOM ids differ between builds.

Schema position:
File 7 of 10
*/

(function (global) {
  "use strict";

  const VTChart = {};
  const DAY_MS = 24 * 60 * 60 * 1000;

  // ---- Band definitions (systolic lens) ----
  // Keep these aligned with your UI language.
  const BANDS = Object.freeze([
    { key: "HTN2", label: "HTN2 ≥140", min: 140, max: 1000, rgba: "rgba(160, 60, 70, 0.42)" },
    { key: "HTN1", label: "HTN1 130–139", min: 130, max: 139.999, rgba: "rgba(160, 120, 60, 0.32)" },
    { key: "ELEV", label: "Elev 120–129", min: 120, max: 129.999, rgba: "rgba(90, 120, 170, 0.24)" },
    { key: "OPT",  label: "Opt 90–119",  min: 90,  max: 119.999, rgba: "rgba(70, 140, 110, 0.22)" },
    { key: "LOW",  label: "Low <90",     min: -1000, max: 89.999, rgba: "rgba(90, 80, 140, 0.22)" }
  ]);

  // Line colors (match your current look)
  const LINE = Object.freeze({
    sys: "rgba(195, 225, 255, 0.88)",
    dia: "rgba(235, 235, 235, 0.78)",
    hr:  "rgba(120, 230, 170, 0.78)"
  });

  // Internal state
  let _inited = false;

  function qs(root, sel) {
    try { return (root || document).querySelector(sel); } catch (_) { return null; }
  }
  function qsa(root, sel) {
    try { return Array.from((root || document).querySelectorAll(sel) || []); } catch (_) { return []; }
  }

  function getChartsPanel() {
    return document.getElementById("panelCharts") || qs(document, '[data-panel="charts"]') || qs(document, ".panel.charts") || null;
  }

  function getCanvas() {
    const panel = getChartsPanel();

    // Prefer explicit ids if present
    const byId =
      document.getElementById("chartCanvas") ||
      document.getElementById("chartsCanvas") ||
      document.getElementById("canvasCharts");

    if (byId) return byId;

    // Otherwise, first canvas inside charts panel
    if (panel) {
      const c = qs(panel, "canvas");
      if (c) return c;
    }

    // Last resort: any canvas
    const any = qs(document, "canvas");
    return any || null;
  }

  function getLegendHost() {
    // Prefer an existing legend container if present.
    const panel = getChartsPanel();
    const byId =
      document.getElementById("chartLegend") ||
      document.getElementById("chartLegendText") ||
      document.getElementById("legendText");

    if (byId) return byId;

    if (!panel) return null;

    // Try to find a place under the chart frame
    const frames = qsa(panel, ".chartFrame, .chart-frame, .chartCard, .chart-card, .innerCard, .inner-card");
    if (frames.length) {
      // If the last element already looks like a legend row, reuse it.
      const existing = qs(frames[0], ".vtLegendRow");
      if (existing) return existing;

      const div = document.createElement("div");
      div.className = "vtLegendRow";
      div.style.marginTop = "10px";
      div.style.padding = "10px 12px";
      div.style.borderRadius = "16px";
      div.style.border = "1px solid rgba(235,245,255,.14)";
      div.style.background = "rgba(12,21,40,.35)";
      div.style.color = "rgba(235,245,255,.70)";
      div.style.fontSize = "14px";
      div.style.lineHeight = "1.25";
      frames[0].appendChild(div);
      return div;
    }

    // Fallback: create at bottom of panel
    const div = document.createElement("div");
    div.className = "vtLegendRow";
    div.style.marginTop = "12px";
    div.style.padding = "10px 12px";
    div.style.borderRadius = "16px";
    div.style.border = "1px solid rgba(235,245,255,.14)";
    div.style.background = "rgba(12,21,40,.35)";
    div.style.color = "rgba(235,245,255,.70)";
    div.style.fontSize = "14px";
    div.style.lineHeight = "1.25";
    panel.appendChild(div);
    return div;
  }

  function renderBandLegend() {
    const host = getLegendHost();
    if (!host) return;

    // Build color-coded legend pills to match band colors (same rgba).
    // Keep it compact and readable.
    const parts = BANDS.map(b => {
      // create inline "pill" using a span with background matching band
      const bg = b.rgba;
      const border = "rgba(235,245,255,.14)";
      const text = "rgba(235,245,255,.78)";

      return `<span style="
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:6px 10px;
        margin:4px 6px 0 0;
        border-radius:999px;
        border:1px solid ${border};
        background:${bg};
        color:${text};
        white-space:nowrap;
      ">
        <span style="
          width:10px;height:10px;border-radius:3px;
          background:${bg};
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.22);
        "></span>
        <span>${escapeHtml(b.label)}</span>
      </span>`;
    });

    host.innerHTML = `<div style="display:flex;flex-wrap:wrap;align-items:center;">
      ${parts.join("")}
    </div>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---- Data access ----
  function getRecords() {
    // Preferred: VTStore API
    try {
      if (global.VTStore && typeof global.VTStore.getAll === "function") {
        return global.VTStore.getAll() || [];
      }
    } catch (_) {}

    // Fallback: VTState or global store array
    try {
      if (global.VTState && Array.isArray(global.VTState.records)) return global.VTState.records;
    } catch (_) {}

    try {
      if (Array.isArray(global.VTRecords)) return global.VTRecords;
    } catch (_) {}

    return [];
  }

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function parseTime(rec) {
    // Support common keys used across builds
    const t = rec?.ts ?? rec?.time ?? rec?.dateTime ?? rec?.datetime ?? rec?.createdAt ?? rec?.at ?? null;
    if (t == null) return null;
    const d = new Date(t);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  function extractSeries(records) {
    const pts = [];
    for (const r of records || []) {
      const t = parseTime(r);
      if (!t) continue;

      const sys = toNum(r.sys ?? r.systolic ?? r.bpSys ?? r.sbp);
      const dia = toNum(r.dia ?? r.diastolic ?? r.bpDia ?? r.dbp);
      const hr  = toNum(r.hr ?? r.heartRate ?? r.pulse);

      // Keep records if any metric exists
      if (sys == null && dia == null && hr == null) continue;

      pts.push({ t, sys, dia, hr });
    }

    pts.sort((a, b) => a.t - b.t);
    return pts;
  }

  function getDefaultWindow(pts) {
    // Default should be current 7 days, but must respect dataset range.
    if (!pts.length) return null;

    const lastT = pts[pts.length - 1].t;
    const end = lastT;
    const start = end - (7 * DAY_MS);

    // Clamp to dataset start
    const dsStart = pts[0].t;
    return {
      start: Math.max(start, dsStart),
      end: end
    };
  }

  // ---- Canvas sizing ----
  function sizeCanvasToContainer(canvas) {
    if (!canvas) return false;

    // We want to size to the canvas parent content box.
    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();

    // Reserve a bit of height for padding inside the frame (but keep plot tall).
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    const dpr = Math.max(1, Math.min(3, global.devicePixelRatio || 1));

    // Avoid thrashing: only resize when materially different
    const targetW = Math.floor(w * dpr);
    const targetH = Math.floor(h * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }
    return true;
  }

  // ---- Rendering ----
  function drawChart(canvas, pts, view) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure sizing
    sizeCanvasToContainer(canvas);

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // If empty, show message
    if (!pts.length) {
      ctx.save();
      ctx.fillStyle = "rgba(235,245,255,.42)";
      ctx.font = `${Math.floor(Math.max(16, H * 0.06))}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No readings yet.", W / 2, H / 2);
      ctx.restore();
      return;
    }

    // View window
    const v = view || getDefaultWindow(pts) || { start: pts[0].t, end: pts[pts.length - 1].t };
    const t0 = v.start;
    const t1 = Math.max(v.end, v.start + 60 * 1000);

    // Determine max reading in dataset for y-scale (within view window)
    let maxVal = 0;
    for (const p of pts) {
      if (p.t < t0 || p.t > t1) continue;
      if (p.sys != null) maxVal = Math.max(maxVal, p.sys);
      if (p.dia != null) maxVal = Math.max(maxVal, p.dia);
      if (p.hr != null)  maxVal = Math.max(maxVal, p.hr);
    }
    if (!Number.isFinite(maxVal) || maxVal <= 0) maxVal = 180;

    // Y scale rule requested:
    const yMin = 40;
    const yMax = Math.min(250, Math.ceil(maxVal + 10));

    // Layout: maximize plot area (less padding)
    // Keep some room for left labels, but not excessive.
    const padL = Math.floor(W * 0.11);      // ~11% for y labels
    const padR = Math.floor(W * 0.04);
    const padT = Math.floor(H * 0.06);      // reduced
    const padB = Math.floor(H * 0.12);      // reduced but allows x labels

    const plotX0 = padL;
    const plotY0 = padT;
    const plotX1 = W - padR;
    const plotY1 = H - padB;
    const plotW = Math.max(1, plotX1 - plotX0);
    const plotH = Math.max(1, plotY1 - plotY0);

    // Helpers
    const xForT = (t) => plotX0 + ((t - t0) / (t1 - t0)) * plotW;
    const yForV = (val) => plotY1 - ((val - yMin) / (yMax - yMin)) * plotH;

    // Background bands (color-coded)
    // Draw in order bottom->top by actual y extents in view scale.
    drawBands(ctx, plotX0, plotY0, plotW, plotH, yMin, yMax);

    // Alternating day overlays (subtle vertical bands)
    drawDayBands(ctx, plotX0, plotY0, plotW, plotH, t0, t1);

    // Grid lines + axis labels
    drawGrid(ctx, plotX0, plotY0, plotW, plotH, yMin, yMax);

    // Series lines
    drawSeries(ctx, pts, t0, t1, xForT, yForV);

    // X-axis labels (sparse, readable)
    drawXAxisLabels(ctx, plotX0, plotY1, plotW, plotH, t0, t1);

    // Border / frame hint
    ctx.save();
    ctx.strokeStyle = "rgba(235,245,255,.12)";
    ctx.lineWidth = Math.max(1, Math.floor(W * 0.0018));
    roundRect(ctx, plotX0, plotY0, plotW, plotH, Math.floor(Math.min(plotW, plotH) * 0.045));
    ctx.stroke();
    ctx.restore();
  }

  function drawBands(ctx, x0, y0, w, h, yMin, yMax) {
    ctx.save();
    for (const b of BANDS) {
      // Convert band range into y-space; clamp to chart bounds
      const bandMin = Math.max(yMin, b.min);
      const bandMax = Math.min(yMax, b.max);
      if (bandMax <= yMin || bandMin >= yMax) continue;

      const yTop = y0 + (1 - (bandMax - yMin) / (yMax - yMin)) * h;
      const yBot = y0 + (1 - (bandMin - yMin) / (yMax - yMin)) * h;

      ctx.fillStyle = b.rgba;
      ctx.fillRect(x0, yTop, w, Math.max(0, yBot - yTop));
    }
    ctx.restore();
  }

  function drawDayBands(ctx, x0, y0, w, h, t0, t1) {
    // Subtle alternating day columns; do NOT fight the colored BP bands.
    const startDay = floorToLocalDay(t0);
    const endDay = floorToLocalDay(t1) + DAY_MS;

    let i = 0;
    for (let d = startDay; d < endDay; d += DAY_MS) {
      const a = Math.max(t0, d);
      const b = Math.min(t1, d + DAY_MS);
      if (b <= a) continue;

      const xa = x0 + ((a - t0) / (t1 - t0)) * w;
      const xb = x0 + ((b - t0) / (t1 - t0)) * w;

      // Alternating overlay
      const overlay = (i % 2 === 0)
        ? "rgba(0,0,0,0.00)"
        : "rgba(0,0,0,0.08)"; // subtle darken

      ctx.save();
      ctx.fillStyle = overlay;
      ctx.fillRect(xa, y0, Math.max(0, xb - xa), h);
      ctx.restore();

      i++;
    }
  }

  function drawGrid(ctx, x0, y0, w, h, yMin, yMax) {
    ctx.save();
    ctx.strokeStyle = "rgba(235,245,255,.12)";
    ctx.fillStyle = "rgba(235,245,255,.56)";
    ctx.lineWidth = 1;

    // Y ticks: choose a step that keeps ~6–8 lines
    const span = yMax - yMin;
    let step = 20;
    if (span <= 100) step = 10;
    if (span >= 160) step = 20;

    ctx.font = `${Math.max(20, Math.floor(h * 0.06))}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let v = yMin; v <= yMax; v += step) {
      const yy = y0 + (1 - (v - yMin) / (yMax - yMin)) * h;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + w, yy);
      ctx.stroke();

      // label
      ctx.fillText(String(v), x0 - 10, yy);
    }

    ctx.restore();
  }

  function drawSeries(ctx, pts, t0, t1, xForT, yForV) {
    // Build paths for each series
    drawPath(ctx, pts, t0, t1, (p) => p.sys, xForT, yForV, LINE.sys, 3);
    drawPath(ctx, pts, t0, t1, (p) => p.dia, xForT, yForV, LINE.dia, 2);
    drawPath(ctx, pts, t0, t1, (p) => p.hr,  xForT, yForV, LINE.hr,  2);
  }

  function drawPath(ctx, pts, t0, t1, getV, xForT, yForV, strokeStyle, baseWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = Math.max(2, baseWidth);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    let started = false;
    ctx.beginPath();

    for (const p of pts) {
      if (p.t < t0 || p.t > t1) continue;
      const v = getV(p);
      if (v == null) continue;

      const x = xForT(p.t);
      const y = yForV(v);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (started) ctx.stroke();
    ctx.restore();
  }

  function drawXAxisLabels(ctx, x0, yAxis, w, h, t0, t1) {
    // Labels: show ~5 evenly spaced day markers, always aligned to day boundaries when possible.
    ctx.save();
    ctx.fillStyle = "rgba(235,245,255,.62)";
    ctx.font = `${Math.max(20, Math.floor(h * 0.065))}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const days = Math.max(1, Math.round((t1 - t0) / DAY_MS));
    const targetTicks = Math.min(6, Math.max(4, days));
    const stepDays = Math.max(1, Math.round(days / (targetTicks - 1)));

    const firstDay = floorToLocalDay(t0);
    let tick = firstDay;

    // Start near t0
    while (tick < t0) tick += DAY_MS;

    const labels = [];
    for (let d = tick; d <= t1 + 1; d += stepDays * DAY_MS) {
      if (d < t0 || d > t1) continue;
      labels.push(d);
    }

    // Ensure at least 2 labels
    if (labels.length < 2) {
      labels.length = 0;
      labels.push(t0, t1);
    }

    for (const t of labels) {
      const x = x0 + ((t - t0) / (t1 - t0)) * w;
      const d = new Date(t);
      const dow = d.toLocaleDateString(undefined, { weekday: "short" });
      const md = d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
      ctx.fillText(`${dow}\n${md}`, x, yAxis + 8);
    }

    ctx.restore();
  }

  function floorToLocalDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // ---- Public API ----
  VTChart.init = function init() {
    if (_inited) return;
    _inited = true;

    // Render legend immediately (color-coded to bands)
    try { renderBandLegend(); } catch (_) {}

    // Keep canvas responsive to layout changes
    try {
      const c = getCanvas();
      if (!c) return;
      const ro = new ResizeObserver(() => {
        try { VTChart.onShow(); } catch (_) {}
      });
      ro.observe(c.parentElement || c);
    } catch (_) {
      // ok if ResizeObserver unsupported
    }
  };

  VTChart.onShow = function onShow() {
    // Ensure initialized
    if (!_inited) VTChart.init();

    const canvas = getCanvas();
    if (!canvas) return;

    // Legend may need to be re-created if DOM changed
    try { renderBandLegend(); } catch (_) {}

    const pts = extractSeries(getRecords());
    const view = getDefaultWindow(pts);

    drawChart(canvas, pts, view);
  };

  // Expose
  global.VTChart = VTChart;

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.025f (legend color-coded to bands + improved sizing)
Schema order: File 7 of 10
*/
