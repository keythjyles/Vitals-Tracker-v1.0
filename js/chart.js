/* File: js/chart.js */
/*
Vitals Tracker — Chart Engine (Canvas Rendering + Chart View)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023b
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL chart drawing on #chartCanvas.
- Owns chart lifecycle hooks (onShow/onDataChanged/onResize).
- Reads data ONLY via VTStore (read-only for now).
- Uses VTState for view window (days/center) and dirty flag.
- Does NOT own panel routing or swipe carousel.

v2.023b — Change Log (THIS FILE ONLY)
1) Restores a working, self-contained chart renderer that draws:
   - Alternating day bands
   - Systolic/Diastolic polyline
   - Optional HR polyline (if present)
   - Safe label text in #chartsTopNote
2) Implements robust data normalization:
   - Accepts multiple record shapes: {ts,sys,dia,hr,notes} and legacy keys
   - Tolerant of string timestamps and numeric strings
3) Implements resilient time windowing:
   - Uses VTState chartWindowDays + chartCenterMs
   - If center is null, centers on newest record
4) Does NOT implement pinch/zoom/pan yet (that belongs to gestures.js later).
5) Exposes window.VTChart with onShow(), onDataChanged(), onResize().

ANTI-DRIFT RULES
- Do NOT attach global swipe listeners here.
- Do NOT write to storage here.
- Do NOT rename canvas IDs.

Schema position:
File 7 of 10

Previous file:
File 6 — js/state.js

Next file:
File 8 — js/gestures.js
*/

(function () {
  "use strict";

  const VERSION = "v2.023b";
  const TZ = "America/Chicago";
  const MS_DAY = 86400000;

  /* ===== DOM (owned by chart engine) ===== */
  function el(id) { return document.getElementById(id); }
  const chartsTopNote = () => el("chartsTopNote");
  const canvasWrap = () => el("canvasWrap");
  const chartCanvas = () => el("chartCanvas");

  let ctx = null;
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;

  /* ===== Formatters (Central Time) ===== */
  const fmtYMDParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const fmtTimeCT = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  function fmtCTDateOnly(ms) {
    if (!Number.isFinite(ms)) return "—";
    try {
      const parts = fmtYMDParts.formatToParts(new Date(ms));
      const map = {};
      for (const p of parts) map[p.type] = p.value;
      return `${map.year}-${map.month}-${map.day}`;
    } catch (_) {
      return "—";
    }
  }

  function fmtCTDateTime(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    return `${fmtCTDateOnly(ms)} ${fmtTimeCT.format(new Date(ms))}`;
  }

  function ctParts(ms) {
    const parts = fmtYMDParts.formatToParts(new Date(ms));
    const get = (t) => parts.find((p) => p.type === t)?.value || "";
    return { y: +get("year"), m: +get("month"), d: +get("day") };
  }

  function ctDayKey(ms) {
    const p = ctParts(ms);
    return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  }

  /* ===== Data normalization ===== */

  function safeNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function extractTs(r) {
    const v = r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? r?.createdAt ?? r?.created_at ?? r?.iso ?? null;
    if (v == null) return null;
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  function extractBP(r) {
    const sys = safeNum(r?.sys ?? r?.systolic ?? (r?.bp && (r.bp.sys ?? r.bp.systolic)));
    const dia = safeNum(r?.dia ?? r?.diastolic ?? (r?.bp && (r.bp.dia ?? r.bp.diastolic)));
    return { sys, dia };
  }

  function extractHR(r) {
    return safeNum(r?.hr ?? r?.heartRate ?? r?.pulse ?? (r?.vitals && (r.vitals.hr ?? r.vitals.pulse)));
  }

  function normalizeRecords(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const r of raw) {
      const t = extractTs(r);
      if (!t) continue;
      const bp = extractBP(r);
      const hr = extractHR(r);
      // Require at least one value to plot (bp or hr)
      if (bp.sys == null && bp.dia == null && hr == null) continue;
      out.push({ t, sys: bp.sys, dia: bp.dia, hr });
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  /* ===== Canvas setup ===== */

  function setupCanvas() {
    const c = chartCanvas();
    if (!c) return false;

    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = c.getBoundingClientRect();
    cssW = Math.max(280, Math.floor(rect.width));
    cssH = Math.max(220, Math.floor(rect.height));

    c.width = Math.floor(cssW * dpr);
    c.height = Math.floor(cssH * dpr);

    ctx = c.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return false;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return true;
  }

  function clear() {
    if (!ctx) return;
    ctx.clearRect(0, 0, cssW, cssH);
  }

  /* ===== Coordinate mapping ===== */

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function computeYDomain(points) {
    // Default domain (BP)
    let minV = 40;
    let maxV = 200;

    for (const p of points) {
      if (p.sys != null) maxV = Math.max(maxV, p.sys);
      if (p.dia != null) maxV = Math.max(maxV, p.dia);
      if (p.sys != null) minV = Math.min(minV, p.sys);
      if (p.dia != null) minV = Math.min(minV, p.dia);
    }

    // pad + clamp
    minV = Math.max(30, Math.floor(minV - 10));
    maxV = Math.min(260, Math.ceil(maxV + 10));
    if (maxV - minV < 40) maxV = minV + 40;
    return { minV, maxV };
  }

  function computeHRDomain(points) {
    let minV = 40;
    let maxV = 140;
    let seen = false;

    for (const p of points) {
      if (p.hr != null) {
        seen = true;
        minV = Math.min(minV, p.hr);
        maxV = Math.max(maxV, p.hr);
      }
    }

    if (!seen) return null;
    minV = Math.max(30, Math.floor(minV - 8));
    maxV = Math.min(220, Math.ceil(maxV + 8));
    if (maxV - minV < 25) maxV = minV + 25;
    return { minV, maxV };
  }

  function mapX(t, t0, t1, left, right) {
    const u = (t - t0) / (t1 - t0 || 1);
    return left + u * (right - left);
  }

  function mapY(v, v0, v1, top, bot) {
    const u = (v - v0) / (v1 - v0 || 1);
    return bot - u * (bot - top);
  }

  /* ===== Drawing primitives ===== */

  function strokeLine(points, getter, t0, t1, left, right, top, bot) {
    if (!ctx) return;
    let started = false;
    ctx.beginPath();
    for (const p of points) {
      const v = getter(p);
      if (v == null) continue;
      const x = mapX(p.t, t0, t1, left, right);
      const y = mapY(v, getter._min, getter._max, top, bot);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (started) ctx.stroke();
  }

  function drawDayBands(t0, t1, left, right, top, bot) {
    if (!ctx) return;
    // Find CT midnight for t0 day
    const firstKey = ctDayKey(t0);
    const firstMs = new Date(firstKey + "T00:00:00").getTime(); // local parse; acceptable for visual bands
    // Step day by day in MS_DAY; if parse drift, bands still show alternating pattern.
    let dayStart = Number.isFinite(firstMs) ? firstMs : (t0 - (t0 % MS_DAY));

    let i = 0;
    while (dayStart < t1 + MS_DAY) {
      const dayEnd = dayStart + MS_DAY;
      const x0 = mapX(dayStart, t0, t1, left, right);
      const x1 = mapX(dayEnd, t0, t1, left, right);

      ctx.fillStyle = (i % 2 === 0) ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.03)";
      ctx.fillRect(x0, top, x1 - x0, bot - top);

      i++;
      dayStart = dayEnd;
    }
  }

  function drawFrame(left, right, top, bot) {
    if (!ctx) return;
    ctx.strokeStyle = "rgba(235,245,255,.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, (right - left) - 1, (bot - top) - 1);
  }

  function drawGridY(minV, maxV, left, right, top, bot) {
    if (!ctx) return;
    const steps = 5;
    ctx.lineWidth = 1;
    for (let i = 0; i <= steps; i++) {
      const v = minV + (i / steps) * (maxV - minV);
      const y = mapY(v, minV, maxV, top, bot);
      ctx.strokeStyle = "rgba(235,245,255,.08)";
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
  }

  function drawLabel(text) {
    const n = chartsTopNote();
    if (n) n.textContent = text;
  }

  /* ===== Main render ===== */

  function getData() {
    // Prefer VTStore (this is our current target)
    try {
      if (window.VTStore && typeof window.VTStore.getRecords === "function") {
        return window.VTStore.getRecords();
      }
    } catch (_) {}

    // Fallback: try storage module if it exposes something similar
    try {
      if (window.VTStorage && typeof window.VTStorage.getRecords === "function") {
        return window.VTStorage.getRecords();
      }
    } catch (_) {}

    return [];
  }

  function computeWindow(points) {
    const days = (window.VTState && window.VTState.getChartWindowDays)
      ? window.VTState.getChartWindowDays()
      : 7;

    let center = (window.VTState && window.VTState.getChartCenterMs)
      ? window.VTState.getChartCenterMs()
      : null;

    if (!Number.isFinite(center) || center == null) {
      center = points.length ? points[points.length - 1].t : Date.now();
      try {
        window.VTState && window.VTState.setChartCenterMs && window.VTState.setChartCenterMs(center);
      } catch (_) {}
    }

    const half = (days * MS_DAY) / 2;
    const t0 = center - half;
    const t1 = center + half;

    return { days, center, t0, t1 };
  }

  function filterToWindow(points, t0, t1) {
    // include points slightly outside for line continuity
    const pad = MS_DAY * 0.25;
    const a = t0 - pad;
    const b = t1 + pad;
    return points.filter(p => p.t >= a && p.t <= b);
  }

  function render() {
    const ok = setupCanvas();
    if (!ok) {
      drawLabel("Chart unavailable (canvas not ready).");
      return;
    }

    const raw = getData();
    const pointsAll = normalizeRecords(raw);

    if (!pointsAll.length) {
      clear();
      drawLabel("No records to chart.");
      return;
    }

    const { t0, t1, days } = computeWindow(pointsAll);
    const points = filterToWindow(pointsAll, t0, t1);

    // Layout
    const pad = 10;
    const left = pad;
    const right = cssW - pad;
    const top = pad;
    const bot = cssH - pad;

    clear();

    // Background/day bands + frame
    drawDayBands(t0, t1, left, right, top, bot);
    drawFrame(left, right, top, bot);

    // Domains
    const bpDom = computeYDomain(points);
    const hrDom = computeHRDomain(points);

    // Grid (based on BP)
    drawGridY(bpDom.minV, bpDom.maxV, left, right, top, bot);

    // BP lines
    ctx.lineWidth = 2;

    // Systolic
    ctx.strokeStyle = "rgba(235,245,255,.88)";
    const getSys = (p) => p.sys;
    getSys._min = bpDom.minV;
    getSys._max = bpDom.maxV;
    strokeLine(points, getSys, t0, t1, left, right, top, bot);

    // Diastolic
    ctx.strokeStyle = "rgba(235,245,255,.55)";
    const getDia = (p) => p.dia;
    getDia._min = bpDom.minV;
    getDia._max = bpDom.maxV;
    strokeLine(points, getDia, t0, t1, left, right, top, bot);

    // HR line (if present) — mapped to BP domain visually for now (simple & stable)
    // Later: dual-axis or scaled overlay, but keep it readable now.
    if (hrDom) {
      ctx.strokeStyle = "rgba(120,180,255,.60)";
      ctx.lineWidth = 2;
      const getHr = (p) => p.hr;
      // Map HR into BP domain range so it is visible without second axis.
      const hrMin = hrDom.minV, hrMax = hrDom.maxV;
      getHr._min = hrMin;
      getHr._max = hrMax;

      // Draw HR using its own domain but same canvas space (works fine as overlay)
      // We reuse strokeLine; it will map using getHr._min/_max.
      strokeLine(points, getHr, t0, t1, left, right, top, bot);
    }

    // Label
    const newest = pointsAll[pointsAll.length - 1].t;
    drawLabel(`Window: ${days}d • Newest: ${fmtCTDateTime(newest)}`);

    try {
      window.VTState && window.VTState.markChartClean && window.VTState.markChartClean();
    } catch (_) {}
  }

  /* ===== Public API ===== */

  function onShow() {
    // Called when charts panel is shown
    render();
  }

  function onDataChanged() {
    // Called when store reloads or records change
    try { window.VTState && window.VTState.setChartCenterMs && window.VTState.setChartCenterMs(null); } catch (_) {}
    render();
  }

  function onResize() {
    render();
  }

  // Expose
  window.VTChart = {
    VERSION,
    onShow,
    onDataChanged,
    onResize,
    render,
  };

  // Optional: redraw on resize
  window.addEventListener("resize", () => {
    // Avoid excessive redraw if not on charts, but safe to run.
    try {
      if (window.VTState && window.VTState.getActivePanel && window.VTState.getActivePanel() !== "charts") return;
    } catch (_) {}
    onResize();
  });
})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version: v2.023b
Base: v2.021
Touched in v2.023b: js/chart.js
Schema order: File 7 of 10
Next planned file: js/gestures.js (File 8)
*/
