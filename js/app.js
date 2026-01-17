/* ===========================
   File: /js/app.js
   Vitals Tracker — v2.011

   Purpose
   - Function-first UI controller for the modular shell.
   - Read-only import of existing records (no overwrites).
   - Log: Central Time timestamps + “Load next 25”.
   - Charts: Central Time axis, 4-hour labels.
   - Charts interaction (your requirement):
     * NO up/down zoom.
     * Pinch horizontally only: zoom between 14 days (max) and 2 days (min).
     * Pan left/right across the available data while zoomed in.
     * Chart shows whatever window you’ve pinched to; you pan within the data extent.

   Latest update (v2.011)
   - Replaced panel-zoom behavior with chart-only horizontal pinch-zoom + pan.
   - Chart window clamps to 2–14 days; panning clamps to available data.
   - X-axis tick labels every 4 hours, in Central Time.
=========================== */

(() => {
  "use strict";

  const APP_VERSION = "v2.011";
  const TZ = "America/Chicago";
  const MS_HOUR = 60 * 60 * 1000;
  const MS_DAY = 24 * MS_HOUR;

  // Chart window constraints (span of time visible)
  const WINDOW_MAX_DAYS = 14;
  const WINDOW_MIN_DAYS = 2;
  const WINDOW_MAX_MS = WINDOW_MAX_DAYS * MS_DAY;
  const WINDOW_MIN_MS = WINDOW_MIN_DAYS * MS_DAY;

  // Pagination
  const LOG_PAGE = 25;

  // Selectors (must match your index.html)
  const SEL = {
    chartCanvas: "#chartCanvas",
    logList: "#logList",
    logFooter: "#logFooter",
    statusLine: "#statusLine",
  };

  const $ = (q) => document.querySelector(q);
  const elCanvas = $(SEL.chartCanvas);
  const elLogList = $(SEL.logList);
  const elLogFooter = $(SEL.logFooter);
  const elStatus = $(SEL.statusLine);

  function setStatus(msg) {
    if (elStatus) elStatus.textContent = msg;
  }

  // Central Time formatters
  const fmtCTShort = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const fmtHourCT = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  function toDateSafe(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === "number") return new Date(v);
    if (typeof v === "string") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function formatCTShort(v) {
    const d = toDateSafe(v);
    return d ? fmtCTShort.format(d) : "—";
  }

  function getHMCT(dateObj) {
    const parts = fmtHourCT.formatToParts(dateObj);
    const hh = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
    const mm = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
    return { h: isNaN(hh) ? 0 : hh, m: isNaN(mm) ? 0 : mm };
  }

  // Storage read-only bridge (must already exist in your modular build)
  async function loadRecordsReadOnly() {
    if (!window.VT_STORAGE || typeof window.VT_STORAGE.getAllRecordsReadOnly !== "function") {
      return { ok: false, records: [], error: "Storage bridge missing (VT_STORAGE.getAllRecordsReadOnly)." };
    }
    try {
      const recs = await window.VT_STORAGE.getAllRecordsReadOnly();
      if (!Array.isArray(recs)) return { ok: false, records: [], error: "Storage returned non-array." };
      return { ok: true, records: recs };
    } catch (e) {
      return { ok: false, records: [], error: String(e?.message || e) };
    }
  }

  function isFiniteNumber(v) {
    if (v === null || v === undefined || v === "") return false;
    const n = Number(v);
    return Number.isFinite(n);
  }

  function getRecordTimestamp(r) {
    const d =
      toDateSafe(r?.ts) ||
      toDateSafe(r?.timestamp) ||
      toDateSafe(r?.time) ||
      toDateSafe(r?.date) ||
      toDateSafe(r?.createdAt) ||
      toDateSafe(r?.updatedAt);
    return d ? d.getTime() : null;
  }

  function normalizeRecords(raw) {
    const out = [];
    for (const r of raw) {
      const t = getRecordTimestamp(r);
      if (t == null) continue;

      const sys = (r?.sys ?? r?.systolic ?? r?.bpSys ?? null);
      const dia = (r?.dia ?? r?.diastolic ?? r?.bpDia ?? null);
      const hr  = (r?.hr  ?? r?.heartRate ?? r?.pulse ?? null);

      out.push({
        _raw: r,
        t,
        sys: isFiniteNumber(sys) ? Number(sys) : null,
        dia: isFiniteNumber(dia) ? Number(dia) : null,
        hr:  isFiniteNumber(hr)  ? Number(hr)  : null,
        notes: (r?.notes ?? r?.note ?? r?.text ?? "").toString(),
      });
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  // ---------- Log render ----------
  let logOffset = 0;

  function clearNode(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function shortNotes(s) {
    if (!s) return "";
    const t = s.trim();
    if (!t) return "";
    return t.length > 60 ? t.slice(0, 57) + "…" : t;
  }

  function makeDiv(cls, text) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  function renderLog(recordsDesc) {
    if (!elLogList || !elLogFooter) return;

    clearNode(elLogList);
    clearNode(elLogFooter);

    if (!recordsDesc.length) {
      elLogList.appendChild(makeDiv("muted", "No records detected (read-only)."));
      return;
    }

    const slice = recordsDesc.slice(logOffset, logOffset + LOG_PAGE);

    for (const r of slice) {
      const card = document.createElement("div");
      card.className = "ro-card";

      const top = document.createElement("div");
      top.className = "ro-top";

      const bp = (r.sys != null && r.dia != null) ? `${r.sys}/${r.dia}` : (r.sys != null ? `${r.sys}/—` : "—/—");
      top.appendChild(makeDiv("ro-bp", bp));

      if (r.hr != null) top.appendChild(makeDiv("ro-hr", `HR ${r.hr}`));

      card.appendChild(top);
      card.appendChild(makeDiv("ro-when", `${formatCTShort(r.t)} • ${shortNotes(r.notes)}`));

      elLogList.appendChild(card);
    }

    const remaining = recordsDesc.length - (logOffset + LOG_PAGE);

    const footer = document.createElement("div");
    footer.className = "ro-footer";

    footer.appendChild(makeDiv("muted", `Showing ${Math.min(logOffset + LOG_PAGE, recordsDesc.length)} of ${recordsDesc.length} records (read-only).`));

    if (remaining > 0) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ro-loadmore";
      btn.textContent = `Load next ${Math.min(LOG_PAGE, remaining)}…`;
      btn.addEventListener("click", () => {
        logOffset += LOG_PAGE;
        renderLog(recordsDesc);
      }, { passive: true });
      footer.appendChild(btn);
    }

    elLogFooter.appendChild(footer);
  }

  // ---------- Charts: horizontal pinch-zoom + pan ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Global chart state
  const chartState = {
    // Data extents (ms)
    dataMin: 0,
    dataMax: 0,

    // Current visible window (ms)
    winStart: 0,
    winEnd: 0,

    // Interaction
    pointers: new Map(),
    pinch: null,
    lastPan: null,
  };

  function setInitialWindowToLast14Days() {
    const end = chartState.dataMax;
    const start = Math.max(chartState.dataMin, end - WINDOW_MAX_MS);
    chartState.winStart = start;
    chartState.winEnd = end;
    clampWindowToData();
  }

  function clampWindowToData() {
    const span = chartState.winEnd - chartState.winStart;
    const clampedSpan = clamp(span, WINDOW_MIN_MS, WINDOW_MAX_MS);

    // Keep center constant when clamping span
    const center = (chartState.winStart + chartState.winEnd) / 2;
    let start = center - clampedSpan / 2;
    let end = center + clampedSpan / 2;

    // Clamp to data bounds
    if (start < chartState.dataMin) {
      start = chartState.dataMin;
      end = start + clampedSpan;
    }
    if (end > chartState.dataMax) {
      end = chartState.dataMax;
      start = end - clampedSpan;
    }

    chartState.winStart = start;
    chartState.winEnd = end;
  }

  function windowSpan() {
    return Math.max(1, chartState.winEnd - chartState.winStart);
  }

  function msPerPixel(plotW) {
    return windowSpan() / Math.max(1, plotW);
  }

  function filterByWindow(recordsAsc) {
    const a = chartState.winStart;
    const b = chartState.winEnd;
    // recordsAsc is sorted
    const out = [];
    for (const r of recordsAsc) {
      if (r.t < a) continue;
      if (r.t > b) break;
      out.push(r);
    }
    return out;
  }

  function renderChart(recordsAsc) {
    if (!elCanvas) return;
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    // DPR scaling
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const cssW = elCanvas.clientWidth || 300;
    const cssH = elCanvas.clientHeight || 300;
    elCanvas.width = Math.floor(cssW * dpr);
    elCanvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssW, cssH);

    const padL = 44, padR = 10, padT = 10, padB = 26;
    const plotX = padL, plotY = padT;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    // frame
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(plotX, plotY, plotW, plotH);
    ctx.restore();

    if (!recordsAsc.length || !(chartState.dataMax > chartState.dataMin)) {
      drawText(ctx, "No records detected (read-only).", plotX + 8, plotY + 14, 14, 0.6);
      return;
    }

    // Clamp window defensively
    clampWindowToData();

    const visible = filterByWindow(recordsAsc);
    if (!visible.length) {
      drawText(ctx, "No records in this window.", plotX + 8, plotY + 14, 14, 0.6);
      drawWindowHint(ctx, plotX, plotY, plotW, plotH);
      drawXAxisTicksCT(ctx, plotX, plotY, plotW, plotH, chartState.winStart, chartState.winEnd);
      return;
    }

    // Y range based on visible values
    let yMin = Infinity, yMax = -Infinity;
    for (const r of visible) {
      for (const v of [r.sys, r.dia, r.hr]) {
        if (v == null) continue;
        yMin = Math.min(yMin, v);
        yMax = Math.max(yMax, v);
      }
    }
    if (!isFinite(yMin) || !isFinite(yMax)) {
      drawText(ctx, "No plottable values (Sys/Dia/HR).", plotX + 8, plotY + 14, 14, 0.6);
      drawWindowHint(ctx, plotX, plotY, plotW, plotH);
      drawXAxisTicksCT(ctx, plotX, plotY, plotW, plotH, chartState.winStart, chartState.winEnd);
      return;
    }

    const yPad = Math.max(5, (yMax - yMin) * 0.08);
    yMin -= yPad;
    yMax += yPad;

    const tMin = chartState.winStart;
    const tMax = chartState.winEnd;

    const xOf = (t) => plotX + ((t - tMin) / Math.max(1, (tMax - tMin))) * plotW;
    const yOf = (v) => plotY + (1 - ((v - yMin) / Math.max(1, (yMax - yMin)))) * plotH;

    // Y grid (3 bands)
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const y = plotY + (plotH * i / 3);
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
    }
    ctx.restore();

    // Y labels
    drawText(ctx, `${Math.round(yMax)}`, 8, plotY + 6, 12, 0.55);
    drawText(ctx, `${Math.round((yMax + yMin) / 2)}`, 8, plotY + plotH / 2 - 6, 12, 0.55);
    drawText(ctx, `${Math.round(yMin)}`, 8, plotY + plotH - 6, 12, 0.55);

    // X ticks in CT (every 4 hours)
    drawXAxisTicksCT(ctx, plotX, plotY, plotW, plotH, tMin, tMax);

    // Plot
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#9fd0ff";
    ctx.globalAlpha = 0.85;
    plotLine(ctx, visible, r => r.sys, xOf, yOf);

    ctx.globalAlpha = 0.70;
    plotLine(ctx, visible, r => r.dia, xOf, yOf);

    ctx.globalAlpha = 0.45;
    plotLine(ctx, visible, r => r.hr, xOf, yOf);
    ctx.restore();

    drawWindowHint(ctx, plotX, plotY, plotW, plotH);
  }

  function drawWindowHint(ctx, plotX, plotY, plotW, plotH) {
    const spanDays = (windowSpan() / MS_DAY);
    const msg = `${spanDays.toFixed(1)} days (pinch: 2–14, pan: left/right)`;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 11px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(msg, plotX + plotW, plotY + plotH + 2);
    ctx.restore();
  }

  function plotLine(ctx, records, getV, xOf, yOf) {
    let started = false;
    ctx.beginPath();
    for (const r of records) {
      const v = getV(r);
      if (v == null) { started = false; continue; }
      const x = xOf(r.t);
      const y = yOf(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    if (started) ctx.stroke();

    // points
    ctx.save();
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha + 0.10);
    ctx.fillStyle = "#9fd0ff";
    for (const r of records) {
      const v = getV(r);
      if (v == null) continue;
      ctx.beginPath();
      ctx.arc(xOf(r.t), yOf(v), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawText(ctx, text, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${size}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawXAxisTicksCT(ctx, plotX, plotY, plotW, plotH, tMin, tMax) {
    const span = Math.max(1, tMax - tMin);

    // Step hourly; label every 4 hours at :00 (CT)
    const step = MS_HOUR;

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `600 11px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

    for (let t = tMin; t <= tMax; t += step) {
      const d = new Date(t);
      const { h, m } = getHMCT(d);
      if (m !== 0) continue;
      if (h % 4 !== 0) continue;

      const x = plotX + ((t - tMin) / span) * plotW;

      ctx.beginPath();
      ctx.moveTo(x, plotY + plotH);
      ctx.lineTo(x, plotY + plotH + 6);
      ctx.stroke();

      ctx.globalAlpha = 0.55;
      const label = `${String(h).padStart(2, "0")}:00`;
      ctx.fillText(label, x, plotY + plotH + 8);
      ctx.globalAlpha = 0.35;
    }

    ctx.restore();
  }

  function attachChartGestures(recordsAsc) {
    if (!elCanvas) return;

    // Important: we only want chart gestures, not vertical page zoom.
    // So: prevent default on relevant pointer moves while interacting with the canvas.
    elCanvas.style.touchAction = "none";

    const getPlotGeometry = () => {
      // Must match renderChart padding
      const cssW = elCanvas.clientWidth || 300;
      const cssH = elCanvas.clientHeight || 300;
      const padL = 44, padR = 10, padT = 10, padB = 26;
      const plotX = padL, plotY = padT;
      const plotW = cssW - padL - padR;
      const plotH = cssH - padT - padB;
      return { cssW, cssH, plotX, plotY, plotW, plotH };
    };

    function dataSpanClampToExtent() {
      // keep window inside data
      clampWindowToData();
      renderChart(recordsAsc);
    }

    function startPinch() {
      const pts = Array.from(chartState.pointers.values());
      if (pts.length !== 2) return null;
      const distX = Math.abs(pts[0].x - pts[1].x);
      const midX = (pts[0].x + pts[1].x) / 2;
      return {
        startDistX: Math.max(1, distX),
        startSpan: windowSpan(),
        startWinStart: chartState.winStart,
        startWinEnd: chartState.winEnd,
        midX,
      };
    }

    function clientXToTime(clientX) {
      const { plotX, plotW } = getPlotGeometry();
      const rect = elCanvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const frac = clamp((x - plotX) / Math.max(1, plotW), 0, 1);
      return chartState.winStart + frac * windowSpan();
    }

    elCanvas.addEventListener("pointerdown", (e) => {
      elCanvas.setPointerCapture(e.pointerId);
      chartState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (chartState.pointers.size === 1) {
        chartState.lastPan = { x: e.clientX };
      } else if (chartState.pointers.size === 2) {
        chartState.pinch = startPinch();
        chartState.lastPan = null;
      }
    }, { passive: false });

    elCanvas.addEventListener("pointermove", (e) => {
      if (!chartState.pointers.has(e.pointerId)) return;

      // update pointer
      chartState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (chartState.pointers.size === 1 && chartState.lastPan) {
        // Pan: drag left/right changes winStart/winEnd
        const { plotW } = getPlotGeometry();
        const dx = e.clientX - chartState.lastPan.x; // + right
        chartState.lastPan.x = e.clientX;

        // Move window opposite of finger direction (drag right reveals earlier)
        const deltaMs = -dx * msPerPixel(plotW);
        chartState.winStart += deltaMs;
        chartState.winEnd += deltaMs;

        dataSpanClampToExtent();
      } else if (chartState.pointers.size === 2) {
        // Horizontal pinch zoom only, anchored around the midpoint time.
        const pts = Array.from(chartState.pointers.values());
        const distX = Math.abs(pts[0].x - pts[1].x);

        if (!chartState.pinch) chartState.pinch = startPinch();
        if (!chartState.pinch) return;

        // Ratio: bigger distX => zoom in (smaller time span)
        // We compute newSpan = startSpan * (startDistX / distX)
        const ratio = chartState.pinch.startDistX / Math.max(1, distX);
        let newSpan = chartState.pinch.startSpan * ratio;
        newSpan = clamp(newSpan, WINDOW_MIN_MS, WINDOW_MAX_MS);

        // Anchor time at current midpoint between the two fingers
        const midClientX = (pts[0].x + pts[1].x) / 2;
        const anchorT = clientXToTime(midClientX);

        chartState.winStart = anchorT - newSpan / 2;
        chartState.winEnd = anchorT + newSpan / 2;

        dataSpanClampToExtent();
      }

      e.preventDefault();
    }, { passive: false });

    function endPointer(e) {
      if (chartState.pointers.has(e.pointerId)) chartState.pointers.delete(e.pointerId);
      if (chartState.pointers.size < 2) chartState.pinch = null;
      if (chartState.pointers.size !== 1) chartState.lastPan = null;
      else {
        const only = Array.from(chartState.pointers.values())[0];
        chartState.lastPan = only ? { x: only.x } : null;
      }
    }

    elCanvas.addEventListener("pointerup", endPointer, { passive: true });
    elCanvas.addEventListener("pointercancel", endPointer, { passive: true });
  }

  // ---------- Boot ----------
  async function boot() {
    setStatus(`BOOT OK ${APP_VERSION}`);

    const { ok, records: raw, error } = await loadRecordsReadOnly();
    if (!ok) {
      setStatus(`BOOT ${APP_VERSION} — ${error}`);
      if (elLogList) elLogList.textContent = "Storage not available (read-only).";
      return;
    }

    const recordsAsc = normalizeRecords(raw);
    const recordsDesc = [...recordsAsc].sort((a, b) => b.t - a.t);

    if (recordsAsc.length) {
      chartState.dataMin = recordsAsc[0].t;
      chartState.dataMax = recordsAsc[recordsAsc.length - 1].t;
      setInitialWindowToLast14Days();
    } else {
      chartState.dataMin = 0;
      chartState.dataMax = 0;
      chartState.winStart = 0;
      chartState.winEnd = 0;
    }

    logOffset = 0;
    renderLog(recordsDesc);
    renderChart(recordsAsc);
    attachChartGestures(recordsAsc);

    if (recordsAsc.length) setStatus(`BOOT OK ${APP_VERSION} — ${recordsAsc.length} records`);
    else setStatus(`BOOT OK ${APP_VERSION} — no records`);

    window.addEventListener("resize", () => renderChart(recordsAsc), { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { passive: true });
  } else {
    boot();
  }

})();

/* ===========================
   File: /js/app.js
   End of file — v2.011
   Notes
   - Chart gestures apply ONLY to the chart canvas:
     pinch left/right to zoom 2–14 days; drag left/right to pan.
   - No vertical pinch zoom is implemented.
=========================== */
