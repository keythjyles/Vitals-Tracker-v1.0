/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 7 of 9 (P0)
Prev file: js/gestures.js (File 6 of 9)
Next file: js/log.js (File 8 of 9)

v2.026a — Change Log (THIS FILE ONLY)
1) Bands opacity defaults to 60% (0.60).
2) Adds a slider (below chart, inside legend area) to control band opacity live (0–100%).
3) Legend/ledger always present: slider + band explanations.
4) Tightens rendering: responsive canvas sizing, stable y-bounds rules, non-colliding X labels.
5) Ensures canvas fills chartWrap via JS (no CSS dependency).

ANTI-DRIFT: No panel swipe logic here.
*/

(function () {
  "use strict";

  const ID_CANVAS  = "chartCanvas";
  const ID_LEGEND  = "chartLegend";
  const ID_LOADING = "chartsLoading";

  const MS_DAY = 86400000;

  // ===== Visual config (stable) =====
  const STYLE = Object.freeze({
    axes: "rgba(255,255,255,0.30)",
    grid: "rgba(255,255,255,0.12)",
    text: "rgba(255,255,255,0.72)",
    textMuted: "rgba(255,255,255,0.58)",
    lineSys: "#ff7676",
    lineDia: "#76baff",

    // Bands expressed as RGB so we can apply live opacity.
    bands: [
      { from: 180, rgb: [220,  60,  60], label: "Hypertensive Crisis ≥180" },
      { from: 140, rgb: [220, 140,  60], label: "Stage 2 HTN 140–179" },
      { from: 130, rgb: [220, 200,  60], label: "Stage 1 HTN 130–139" },
      { from: 120, rgb: [120, 200, 120], label: "Elevated 120–129" }
    ]
  });

  // ===== Runtime state =====
  const STATE = {
    minDays: 1,
    maxDays: 14,
    days: 7,

    // center is ms
    centerMs: null,

    // dataset bounds (ms)
    dataMinMs: null,
    dataMaxMs: null,

    // band opacity (0..1). Default 60%.
    bandOpacity: 0.60
  };

  function $(id) { return document.getElementById(id); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rgba(rgb, a) {
    const r = rgb[0] | 0, g = rgb[1] | 0, b = rgb[2] | 0;
    const aa = clamp(a, 0, 1);
    return `rgba(${r},${g},${b},${aa})`;
  }

  function parseTs(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) {
      return (v > 1e12) ? v : Math.round(v * 1000); // seconds -> ms
    }
    if (typeof v === "string") {
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function extractFromRecord(r) {
    const ts =
      parseTs(r?.ts) ??
      parseTs(r?.time) ??
      parseTs(r?.timestamp) ??
      parseTs(r?.date) ??
      parseTs(r?.createdAt) ??
      parseTs(r?.created_at) ??
      parseTs(r?.iso);

    const sys =
      num(r?.sys) ??
      num(r?.systolic) ??
      num(r?.sbp) ??
      num(r?.SBP) ??
      num(r?.bp?.sys) ??
      num(r?.bp?.systolic);

    const dia =
      num(r?.dia) ??
      num(r?.diastolic) ??
      num(r?.dbp) ??
      num(r?.DBP) ??
      num(r?.bp?.dia) ??
      num(r?.bp?.diastolic);

    const hr =
      num(r?.hr) ??
      num(r?.heartRate) ??
      num(r?.pulse) ??
      num(r?.HR) ??
      num(r?.vitals?.hr) ??
      num(r?.vitals?.pulse);

    return { ts, sys, dia, hr };
  }

  function getRawData() {
    try {
      if (window.VTStore && typeof window.VTStore.getAll === "function") {
        return window.VTStore.getAll() || [];
      }
    } catch (_) {}
    return [];
  }

  function normalizeData(raw) {
    const out = [];
    for (const r of raw || []) {
      const e = extractFromRecord(r);
      if (e.ts == null) continue;
      if (e.sys == null && e.dia == null && e.hr == null) continue;
      out.push({ ts: e.ts, sys: e.sys, dia: e.dia, hr: e.hr });
    }
    out.sort((a, b) => a.ts - b.ts);
    return out;
  }

  function computeDatasetBounds(data) {
    if (!data.length) return { min: null, max: null };
    return { min: data[0].ts, max: data[data.length - 1].ts };
  }

  function niceCeil10(n) { return Math.ceil(n / 10) * 10; }

  // Y-axis rule: start at 40; end = min(250, maxReading+10) with nice rounding.
  function computeYBounds(data) {
    let maxV = 0;
    for (const r of data) {
      if (r.sys != null) maxV = Math.max(maxV, r.sys);
      if (r.dia != null) maxV = Math.max(maxV, r.dia);
      if (r.hr != null)  maxV = Math.max(maxV, r.hr);
    }
    const min = 40;
    const capped = Math.min(250, (maxV || 0) + 10);
    const max = Math.max(80, niceCeil10(capped));
    return { min, max };
  }

  // Default viewport: newest 7 days. Pan/center clamps to dataset.
  function computeWindow(data) {
    if (!data.length) return { windowed: [], start: null, end: null };

    const b = computeDatasetBounds(data);
    STATE.dataMinMs = b.min;
    STATE.dataMaxMs = b.max;

    if (!Number.isFinite(STATE.centerMs)) STATE.centerMs = STATE.dataMaxMs;

    const span = STATE.days * MS_DAY;
    const half = span / 2;

    let start = STATE.centerMs - half;
    let end = STATE.centerMs + half;

    if (Number.isFinite(STATE.dataMinMs) && Number.isFinite(STATE.dataMaxMs)) {
      const min = STATE.dataMinMs;
      const max = STATE.dataMaxMs;

      if ((max - min) < span) {
        start = min;
        end = max;
      } else {
        if (start < min) { start = min; end = start + span; }
        if (end > max)   { end = max; start = end - span; }
      }
    }

    const windowed = data.filter(r => r.ts >= start && r.ts <= end);
    return { windowed, start, end };
  }

  function ensureCanvasFillsWrap(canvas) {
    // Ensure the canvas has CSS size so getBoundingClientRect reflects intended layout.
    try {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      // Prevent browser scroll/pinch behaviors on the canvas surface itself.
      // (Panel swipe is already blocked for chart region in gestures.js)
      canvas.style.touchAction = "none";
    } catch (_) {}
  }

  function sizeToCSS(canvas) {
    ensureCanvasFillsWrap(canvas);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();

    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h, dpr };
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  function layout(w, h) {
    return {
      padL: 40,
      padR: 20,
      padT: 30,
      padB: 42,
      plotX: 40,
      plotY: 30,
      plotW: Math.max(10, w - 40 - 20),
      plotH: Math.max(10, h - 30 - 42)
    };
  }

  function yScale(val, bounds, L) {
    const ph = L.plotH;
    return L.plotY + (1 - (val - bounds.min) / (bounds.max - bounds.min)) * ph;
  }

  function xScale(ts, start, end, L) {
    if (end === start) return L.plotX;
    return L.plotX + ((ts - start) / (end - start)) * L.plotW;
  }

  function drawBands(ctx, w, h, bounds, L, legendEl) {
    const opacity = clamp(STATE.bandOpacity, 0, 1);

    // Bands are visual aids; paint behind everything.
    for (const b of STYLE.bands) {
      if (bounds.max < b.from) continue;
      const y = yScale(b.from, bounds, L);
      ctx.fillStyle = rgba(b.rgb, opacity);
      ctx.fillRect(0, y, w, h - y);
    }

    ensureLegendUI(legendEl);
  }

  function drawAxes(ctx, w, h, bounds, L, start, end) {
    ctx.strokeStyle = STYLE.grid;
    ctx.lineWidth = 1;

    // Horizontal grid + Y labels
    ctx.fillStyle = STYLE.text;
    ctx.font = "12px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const span = bounds.max - bounds.min;
    const step = span <= 100 ? 10 : 20;

    for (let v = bounds.min; v <= bounds.max; v += step) {
      const y = yScale(v, bounds, L);

      ctx.beginPath();
      ctx.moveTo(L.plotX, y);
      ctx.lineTo(L.plotX + L.plotW, y);
      ctx.stroke();

      ctx.fillText(String(v), 6, y);
    }

    // Axes lines
    ctx.strokeStyle = STYLE.axes;

    // Y axis
    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY);
    ctx.lineTo(L.plotX, L.plotY + L.plotH);
    ctx.stroke();

    // X axis
    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY + L.plotH);
    ctx.lineTo(L.plotX + L.plotW, L.plotY + L.plotH);
    ctx.stroke();

    // X labels: start / mid / end (drop mid if it collides)
    ctx.fillStyle = STYLE.textMuted;
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const yText = L.plotY + L.plotH + 10;
    const tMid = start + (end - start) / 2;

    const labels = [
      { t: start, text: fmtTick(start, true) },
      { t: tMid,  text: fmtTick(tMid, false) },
      { t: end,   text: fmtTick(end, true) }
    ];

    const wStart = ctx.measureText(labels[0].text).width;
    const wMid   = ctx.measureText(labels[1].text).width;
    const wEnd   = ctx.measureText(labels[2].text).width;

    const xStart = xScale(labels[0].t, start, end, L);
    const xMid   = xScale(labels[1].t, start, end, L);
    const xEnd   = xScale(labels[2].t, start, end, L);

    const gapMin = 10;

    const startRight = xStart + wStart / 2;
    const midLeft    = xMid - wMid / 2;
    const midRight   = xMid + wMid / 2;
    const endLeft    = xEnd - wEnd / 2;

    const midFits = (midLeft > startRight + gapMin) && (endLeft > midRight + gapMin);

    ctx.fillText(labels[0].text, xStart, yText);
    if (midFits) ctx.fillText(labels[1].text, xMid, yText);
    ctx.fillText(labels[2].text, xEnd, yText);
  }

  function fmtTick(ms, includeDate) {
    try {
      const d = new Date(ms);
      const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (!includeDate) return time;
      const date = d.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
      return `${date} ${time}`;
    } catch (_) {
      return "";
    }
  }

  function drawLines(ctx, data, bounds, start, end, L) {
    ctx.lineWidth = 2;

    function drawKey(key, color) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      let started = false;

      for (const r of data) {
        const v = r[key];
        if (typeof v !== "number") continue;
        const x = xScale(r.ts, start, end, L);
        const y = yScale(v, bounds, L);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
      if (started) ctx.stroke();
    }

    drawKey("sys", STYLE.lineSys);
    drawKey("dia", STYLE.lineDia);
  }

  // ===== Legend UI (slider + ledger) =====
  function ensureLegendUI(legendEl) {
    if (!legendEl) return;

    // Build once; then update values/colors on each render.
    if (legendEl.dataset && legendEl.dataset.vtLegendBuilt === "1") {
      updateLegendUI(legendEl);
      return;
    }
    if (legendEl.dataset) legendEl.dataset.vtLegendBuilt = "1";

    // Container styling (safe inline)
    legendEl.style.display = "grid";
    legendEl.style.gridTemplateColumns = "1fr";
    legendEl.style.gap = "10px";
    legendEl.style.paddingTop = "10px";

    // Slider block (below chart)
    const sliderWrap = document.createElement("div");
    sliderWrap.className = "bandOpacityWrap";
    sliderWrap.style.display = "grid";
    sliderWrap.style.gridTemplateColumns = "auto 1fr auto";
    sliderWrap.style.alignItems = "center";
    sliderWrap.style.gap = "10px";
    sliderWrap.style.padding = "10px 12px";
    sliderWrap.style.border = "1px solid rgba(255,255,255,0.14)";
    sliderWrap.style.borderRadius = "12px";
    sliderWrap.style.background = "rgba(0,0,0,0.10)";

    const lbl = document.createElement("div");
    lbl.textContent = "Bands";
    lbl.style.fontWeight = "800";
    lbl.style.letterSpacing = ".2px";
    lbl.style.color = "rgba(255,255,255,0.78)";
    lbl.style.fontSize = "12px";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = String(Math.round(clamp(STATE.bandOpacity, 0, 1) * 100));
    slider.id = "bandOpacitySlider";
    slider.style.width = "100%";

    const pct = document.createElement("div");
    pct.id = "bandOpacityValue";
    pct.textContent = `${slider.value}%`;
    pct.style.fontWeight = "800";
    pct.style.color = "rgba(255,255,255,0.72)";
    pct.style.fontSize = "12px";

    slider.addEventListener("input", function () {
      const v = clamp(Number(slider.value) / 100, 0, 1);
      STATE.bandOpacity = v;
      pct.textContent = `${Math.round(v * 100)}%`;
      try { render(); } catch (_) {}
    }, { passive: true });

    sliderWrap.appendChild(lbl);
    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(pct);

    // Ledger list
    const ledger = document.createElement("div");
    ledger.id = "bandLedger";
    ledger.style.display = "grid";
    ledger.style.gap = "8px";

    legendEl.innerHTML = "";
    legendEl.appendChild(sliderWrap);
    legendEl.appendChild(ledger);

    updateLegendUI(legendEl);
  }

  function updateLegendUI(legendEl) {
    if (!legendEl) return;

    const slider = legendEl.querySelector("#bandOpacitySlider");
    const pct = legendEl.querySelector("#bandOpacityValue");
    const ledger = legendEl.querySelector("#bandLedger");

    const op = clamp(STATE.bandOpacity, 0, 1);
    if (slider) slider.value = String(Math.round(op * 100));
    if (pct) pct.textContent = `${Math.round(op * 100)}%`;

    if (!ledger) return;

    ledger.innerHTML = "";
    for (const b of STYLE.bands) {
      const row = document.createElement("div");
      row.className = "legendRow";
      row.style.display = "grid";
      row.style.gridTemplateColumns = "16px 1fr";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.padding = "8px 10px";
      row.style.border = "1px solid rgba(255,255,255,0.12)";
      row.style.borderRadius = "999px";
      row.style.background = "rgba(0,0,0,0.08)";

      const sw = document.createElement("span");
      sw.className = "legendSwatch";
      sw.style.width = "16px";
      sw.style.height = "10px";
      sw.style.borderRadius = "4px";
      sw.style.border = "1px solid rgba(255,255,255,0.14)";
      sw.style.background = rgba(b.rgb, op);

      const tx = document.createElement("span");
      tx.textContent = b.label;
      tx.style.color = "rgba(255,255,255,0.72)";
      tx.style.fontSize = "12px";
      tx.style.fontWeight = "800";
      tx.style.letterSpacing = ".15px";

      row.appendChild(sw);
      row.appendChild(tx);
      ledger.appendChild(row);
    }
  }

  function render() {
    const canvas = $(ID_CANVAS);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const legendEl = $(ID_LEGEND);
    const loadingEl = $(ID_LOADING);

    // Always keep legend UI alive (even if no data)
    ensureLegendUI(legendEl);

    const raw = getRawData();
    const data = normalizeData(raw);

    const sized = sizeToCSS(canvas);
    const w = sized.w, h = sized.h;
    const L = layout(w, h);

    clear(ctx, w, h);

    if (loadingEl) loadingEl.style.display = "none";

    if (!data.length) {
      ctx.fillStyle = STYLE.textMuted;
      ctx.font = "14px system-ui";
      ctx.fillText("No data to display.", 60, 80);
      return;
    }

    const win = computeWindow(data);
    const windowed = win.windowed;
    const start = win.start;
    const end = win.end;

    if (!windowed.length || start == null || end == null || end <= start) {
      ctx.fillStyle = STYLE.textMuted;
      ctx.font = "14px system-ui";
      ctx.fillText("No data in current window.", 60, 80);
      return;
    }

    const bounds = computeYBounds(windowed);

    drawBands(ctx, w, h, bounds, L, legendEl);
    drawAxes(ctx, w, h, bounds, L, start, end);
    drawLines(ctx, windowed, bounds, start, end, L);
  }

  function onShow() {
    render();
  }

  function setDays(d) {
    STATE.days = clamp(d, STATE.minDays, STATE.maxDays);
    render();
  }

  function panBy(ms) {
    STATE.centerMs = (Number.isFinite(STATE.centerMs) ? STATE.centerMs : Date.now()) + ms;

    if (Number.isFinite(STATE.dataMinMs) && Number.isFinite(STATE.dataMaxMs)) {
      const span = STATE.days * MS_DAY;
      const half = span / 2;
      const minC = STATE.dataMinMs + half;
      const maxC = STATE.dataMaxMs - half;
      STATE.centerMs = clamp(STATE.centerMs, minC, maxC);
    }

    render();
  }

  // Public API (do not expand without approval)
  window.VTChart = {
    onShow,
    setDays,
    panBy
  };

  // Re-render on resize
  window.addEventListener("resize", function () {
    try { render(); } catch (_) {}
  }, { passive: true });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 7 of 9 (P0)
Prev file: js/gestures.js (File 6 of 9)
Next file: js/log.js (File 8 of 9)
*/
