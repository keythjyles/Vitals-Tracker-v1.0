/* File: js/chart.js */
/*
Vitals Tracker — Charts (Canvas)

App Version Authority: js/version.js

GOAL (per user request)
- Match the v2.021-style chart presentation:
  1) BP background bands in correct order with better colors:
     - Hypertensive Crisis (>=180) = red (better red)
     - Stage 2 (140–179) = brighter yellow
     - Stage 1 (130–139) = blue
     - Elevated (120–129) = purple
     - Normal (<120) = green (base)
  2) Series legend (Systolic / Diastolic / Heart Rate) ON the graph.
  3) A BP-band legend UNDER the chart (corresponding to accepted stages).
  4) Thicker chart lines.
  5) Larger axis labels.
  6) Date range displayed ABOVE the chart.

NOTES
- This file does NOT write to storage.
- This file does NOT own swipe logic/panels.
*/

(function () {
  "use strict";

  const ID_CANVAS  = "chartCanvas";
  const ID_LEGEND  = "chartLegend";
  const ID_LOADING = "chartsLoading";

  const MS_DAY = 86400000;

  // ====== LOOK & FEEL ======
  const STYLE = Object.freeze({
    // Chart chrome
    axes: "rgba(255,255,255,0.22)",
    grid: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.78)",
    textMuted: "rgba(255,255,255,0.58)",

    // Series colors (kept close to the example)
    lineSys: "rgba(175,210,255,0.98)", // light blue
    lineDia: "rgba(240,240,240,0.88)", // light gray
    lineHr:  "rgba(120,235,170,0.90)", // green

    // Alternating day bands (vertical stripes)
    dayA: "rgba(0,0,0,0.00)",
    dayB: "rgba(0,0,0,0.10)",

    // BP category horizontal bands (accepted systolic stages)
    // Order matters: bottom -> top for painting.
    bpBands: [
      { from: 0,   to: 120, rgb: [ 35, 115,  85], label: "Normal <120" },                 // green
      { from: 120, to: 130, rgb: [120,  75, 165], label: "Elevated 120–129" },            // purple
      { from: 130, to: 140, rgb: [ 40, 115, 190], label: "Stage 1 HTN 130–139" },         // blue
      { from: 140, to: 180, rgb: [235, 185,  40], label: "Stage 2 HTN 140–179" },         // brighter yellow
      { from: 180, to: 999, rgb: [200,  55,  70], label: "Hypertensive Crisis ≥180" }     // better red
    ]
  });

  // ===== Runtime state =====
  const STATE = {
    minDays: 1,
    maxDays: 14,
    days: 7,
    centerMs: null,
    dataMinMs: null,
    dataMaxMs: null,
    bandOpacity: 0.60
  };

  function $(id) { return document.getElementById(id); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rgba(rgb, a) {
    const r = rgb[0] | 0, g = rgb[1] | 0, b = rgb[2] | 0;
    return `rgba(${r},${g},${b},${clamp(a,0,1)})`;
  }

  // ===== Data extraction (tolerant) =====
  function parseTs(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) {
      return (v > 1e12) ? v : Math.round(v * 1000);
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

  function safeArray(v) { return Array.isArray(v) ? v : []; }

  async function getFromVTStore() {
    try {
      if (window.VTStore && typeof window.VTStore.getAll === "function") {
        const res = window.VTStore.getAll();
        const arr = (res && typeof res.then === "function") ? await res : res;
        return safeArray(arr);
      }
    } catch (_) {}
    return [];
  }

  async function getFromVTStorage() {
    try {
      const s = window.VTStorage;
      if (!s) return [];
      const fns = ["getAll","getAllRecords","loadAll","readAll","exportAll","getRecords"];
      for (const fn of fns) {
        if (typeof s[fn] === "function") {
          const res = s[fn]();
          const arr = (res && typeof res.then === "function") ? await res : res;
          if (Array.isArray(arr) && arr.length) return arr;
        }
      }
    } catch (_) {}
    return [];
  }

  function isPlausibleVitalsArray(arr) {
    if (!Array.isArray(arr) || arr.length < 1) return 0;
    let score = 0, checked = 0;
    for (let i = 0; i < arr.length; i++) {
      const r = arr[i];
      if (!r || typeof r !== "object") continue;
      checked++;
      const e = extractFromRecord(r);
      if (e.ts != null) score += 2;
      if (e.sys != null) score += 2;
      if (e.dia != null) score += 2;
      if (e.hr  != null) score += 1;
      if (checked >= 60) break;
    }
    score += Math.min(200, Math.floor(arr.length / 5));
    return score;
  }

  function getFromLocalStorageScan() {
    try {
      if (!window.localStorage) return [];
      let best = [];
      let bestScore = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;

        const lk = k.toLowerCase();
        if (!(lk.includes("vital") || lk.includes("bp") || lk.includes("pressure") || lk.includes("tracker") || lk.includes("record") || lk.includes("log"))) {
          continue;
        }

        let raw = null;
        try { raw = localStorage.getItem(k); } catch (_) {}
        if (!raw || raw.length < 2) continue;

        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) { continue; }

        let candidate = null;
        if (Array.isArray(parsed)) candidate = parsed;
        else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.records)) candidate = parsed.records;
          else if (Array.isArray(parsed.data)) candidate = parsed.data;
          else if (Array.isArray(parsed.items)) candidate = parsed.items;
        }
        if (!candidate) continue;

        const sc = isPlausibleVitalsArray(candidate);
        if (sc > bestScore) {
          bestScore = sc;
          best = candidate;
        }
      }
      return best;
    } catch (_) {
      return [];
    }
  }

  async function getRawDataMultiSource() {
    const a = await getFromVTStore();
    if (a && a.length) return a;

    const b = await getFromVTStorage();
    if (b && b.length) return b;

    const c = getFromLocalStorageScan();
    if (c && c.length) return c;

    return [];
  }

  // ===== Canvas sizing/layout =====
  function ensureCanvasFillsWrap(canvas) {
    try {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
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

  function clear(ctx, w, h) { ctx.clearRect(0, 0, w, h); }

  function layout(w, h) {
    const padL = 62;  // larger for bigger y labels
    const padR = 20;
    const padT = 16;
    const padB = 58;  // larger for bigger x labels

    return {
      padL, padR, padT, padB,
      plotX: padL,
      plotY: padT,
      plotW: Math.max(10, w - padL - padR),
      plotH: Math.max(10, h - padT - padB)
    };
  }

  function yScale(val, bounds, L) {
    const denom = (bounds.max - bounds.min) || 1;
    return L.plotY + (1 - (val - bounds.min) / denom) * L.plotH;
  }

  function xScale(ts, start, end, L) {
    if (end === start) return L.plotX;
    return L.plotX + ((ts - start) / (end - start)) * L.plotW;
  }

  // ===== Bounds/window =====
  function computeDatasetBounds(data) {
    if (!data.length) return { min: null, max: null };
    return { min: data[0].ts, max: data[data.length - 1].ts };
  }

  function computeWindow(data) {
    if (!data.length) return { windowed: [], start: null, end: null };

    const b = computeDatasetBounds(data);
    STATE.dataMinMs = b.min;
    STATE.dataMaxMs = b.max;

    if (!Number.isFinite(STATE.centerMs)) STATE.centerMs = STATE.dataMaxMs;

    const span = STATE.days * MS_DAY;
    const half = span / 2;

    let start = STATE.centerMs - half;
    let end   = STATE.centerMs + half;

    const min = STATE.dataMinMs;
    const max = STATE.dataMaxMs;

    if (Number.isFinite(min) && Number.isFinite(max)) {
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

  function niceStep(span) {
    if (span <= 60) return 10;
    if (span <= 120) return 10;
    return 20;
  }

  function computeYBounds(windowed) {
    let minV = Infinity;
    let maxV = -Infinity;

    for (const r of windowed) {
      if (typeof r.sys === "number") { minV = Math.min(minV, r.sys); maxV = Math.max(maxV, r.sys); }
      if (typeof r.dia === "number") { minV = Math.min(minV, r.dia); maxV = Math.max(maxV, r.dia); }
      if (typeof r.hr  === "number") { minV = Math.min(minV, r.hr);  maxV = Math.max(maxV, r.hr); }
    }

    if (!Number.isFinite(minV) || !Number.isFinite(maxV)) {
      return { min: 40, max: 180 };
    }

    const pad = 10;
    minV = Math.max(40, Math.floor((minV - pad) / 10) * 10);
    maxV = Math.min(200, Math.ceil((maxV + pad) / 10) * 10);

    if ((maxV - minV) < 60) {
      const mid = (minV + maxV) / 2;
      minV = Math.max(40, Math.floor((mid - 30) / 10) * 10);
      maxV = Math.min(200, Math.ceil((mid + 30) / 10) * 10);
    }

    return { min: minV, max: maxV };
  }

  // ===== Drawing helpers =====
  function startOfDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function drawDayStripes(ctx, start, end, L) {
    const first = startOfDay(start);
    let t = first;
    let i = 0;

    while (t < end + MS_DAY) {
      const a = Math.max(start, t);
      const b = Math.min(end, t + MS_DAY);

      const x1 = xScale(a, start, end, L);
      const x2 = xScale(b, start, end, L);

      ctx.fillStyle = (i % 2 === 0) ? STYLE.dayA : STYLE.dayB;
      ctx.fillRect(x1, L.plotY, (x2 - x1), L.plotH);

      t += MS_DAY;
      i++;
    }
  }

  function drawBPBands(ctx, bounds, L) {
    const op = clamp(STATE.bandOpacity, 0, 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(L.plotX, L.plotY, L.plotW, L.plotH);
    ctx.clip();

    for (const b of STYLE.bpBands) {
      const yTop = yScale(Math.min(bounds.max, b.to), bounds, L);
      const yBot = yScale(Math.max(bounds.min, b.from), bounds, L);

      const top = Math.min(yTop, yBot);
      const bot = Math.max(yTop, yBot);

      if (bot < L.plotY || top > (L.plotY + L.plotH)) continue;

      ctx.fillStyle = rgba(b.rgb, op);
      ctx.fillRect(L.plotX, top, L.plotW, bot - top);
    }

    ctx.restore();
  }

  function drawGridAndAxes(ctx, bounds, L, start, end) {
    // Larger labels (accessibility)
    const fontY = 16;
    const fontX = 16;

    // Horizontal grid lines + y labels
    ctx.strokeStyle = STYLE.grid;
    ctx.lineWidth = 1;

    ctx.fillStyle = STYLE.textMuted;
    ctx.font = `${fontY}px system-ui`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const span = bounds.max - bounds.min;
    const step = niceStep(span);

    for (let v = bounds.min; v <= bounds.max; v += step) {
      const y = yScale(v, bounds, L);

      ctx.beginPath();
      ctx.moveTo(L.plotX, y);
      ctx.lineTo(L.plotX + L.plotW, y);
      ctx.stroke();

      ctx.fillText(String(v), L.plotX - 12, y);
    }

    // Axes
    ctx.strokeStyle = STYLE.axes;

    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY);
    ctx.lineTo(L.plotX, L.plotY + L.plotH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY + L.plotH);
    ctx.lineTo(L.plotX + L.plotW, L.plotY + L.plotH);
    ctx.stroke();

    // X labels (bigger)
    ctx.fillStyle = STYLE.textMuted;
    ctx.font = `${fontX}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const yText = L.plotY + L.plotH + 10;
    const spanMs = end - start;
    const approxTicks = 4;

    for (let i = 1; i <= approxTicks; i++) {
      const t = start + (spanMs * i) / (approxTicks + 1);
      const d = new Date(t);

      const day = d.toLocaleDateString([], { weekday: "short" });
      const md  = d.toLocaleDateString([], { month: "2-digit", day: "2-digit" });

      const x = xScale(t, start, end, L);

      ctx.fillText(day, x, yText);
      ctx.fillText(md,  x, yText + 18);
    }
  }

  function drawLines(ctx, data, bounds, start, end, L) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.plotX, L.plotY, L.plotW, L.plotH);
    ctx.clip();

    // Slightly thicker lines (user request)
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

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
    drawKey("hr",  STYLE.lineHr);

    ctx.restore();
  }

  // Series legend ON chart (top-left inside plot)
  function drawOnChartSeriesLegend(ctx, L) {
    const x0 = L.plotX + 14;
    const y0 = L.plotY + 14;

    const items = [
      { label: "Systolic",  color: STYLE.lineSys },
      { label: "Diastolic", color: STYLE.lineDia },
      { label: "Heart Rate",color: STYLE.lineHr  }
    ];

    const font = 16;
    const lineH = 22;

    // Backplate like the example (subtle)
    const pad = 10;
    const w = 190;
    const h = pad * 2 + items.length * lineH;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    roundRect(ctx, x0 - pad, y0 - pad, w, h, 12, true, true);

    ctx.font = `800 ${font}px system-ui`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.74)";

    let y = y0 + 2;
    for (const it of items) {
      // swatch
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + 24, y);
      ctx.stroke();

      // label
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillText(it.label, x0 + 34, y);

      y += lineH;
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // ===== Date range label ABOVE chart (DOM) =====
  function ensureRangeLabel(canvas, start, end) {
    try {
      if (!canvas || start == null || end == null) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      let el = parent.querySelector("#chartRangeLabel");
      if (!el) {
        el = document.createElement("div");
        el.id = "chartRangeLabel";
        el.style.width = "100%";
        el.style.textAlign = "center";
        el.style.padding = "6px 8px 10px 8px";
        el.style.fontWeight = "800";
        el.style.letterSpacing = ".2px";
        el.style.color = "rgba(255,255,255,0.62)";
        el.style.fontSize = "18px";
        el.style.userSelect = "none";
        // Insert above canvas
        parent.insertBefore(el, canvas);
      }

      const a = new Date(start);
      const b = new Date(end);

      const fmt = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
      };

      el.textContent = `${fmt(a)} \u2192 ${fmt(b)}`;
    } catch (_) {}
  }

  // ===== Legend UI under chart: BP bands + slider =====
  function ensureLegendUI(legendEl) {
    if (!legendEl) return;

    if (legendEl.dataset && legendEl.dataset.vtLegendBuilt === "1") {
      updateLegendUI(legendEl);
      return;
    }
    if (legendEl.dataset) legendEl.dataset.vtLegendBuilt = "1";

    legendEl.innerHTML = "";
    legendEl.style.display = "grid";
    legendEl.style.gridTemplateColumns = "1fr";
    legendEl.style.gap = "10px";
    legendEl.style.paddingTop = "10px";

    // BP Bands legend (under chart)
    const bandBox = document.createElement("div");
    bandBox.id = "bpBandsLegend";
    bandBox.style.display = "grid";
    bandBox.style.gap = "10px";
    bandBox.style.padding = "10px 12px";
    bandBox.style.border = "1px solid rgba(255,255,255,0.14)";
    bandBox.style.borderRadius = "16px";
    bandBox.style.background = "rgba(0,0,0,0.06)";

    const bandTitle = document.createElement("div");
    bandTitle.textContent = "Blood Pressure Bands (Systolic)";
    bandTitle.style.fontWeight = "900";
    bandTitle.style.letterSpacing = ".2px";
    bandTitle.style.color = "rgba(255,255,255,0.72)";
    bandTitle.style.fontSize = "14px";

    const bandList = document.createElement("div");
    bandList.style.display = "grid";
    bandList.style.gap = "8px";

    // Display in TOP->BOTTOM order like the user called out (red -> yellow -> blue -> purple -> green)
    const topDown = STYLE.bpBands.slice().reverse();

    function bandRow(label, rgb) {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "20px 1fr";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.padding = "10px 10px";
      row.style.border = "1px solid rgba(255,255,255,0.10)";
      row.style.borderRadius = "999px";
      row.style.background = "rgba(0,0,0,0.04)";

      const sw = document.createElement("span");
      sw.style.width = "18px";
      sw.style.height = "12px";
      sw.style.borderRadius = "6px";
      sw.style.background = rgba(rgb, clamp(STATE.bandOpacity, 0, 1));
      sw.style.border = "1px solid rgba(255,255,255,0.10)";

      const tx = document.createElement("span");
      tx.textContent = label;
      tx.style.color = "rgba(255,255,255,0.70)";
      tx.style.fontSize = "14px";
      tx.style.fontWeight = "900";
      tx.style.letterSpacing = ".15px";

      row.appendChild(sw);
      row.appendChild(tx);
      return row;
    }

    for (const b of topDown) {
      bandList.appendChild(bandRow(b.label, b.rgb));
    }

    bandBox.appendChild(bandTitle);
    bandBox.appendChild(bandList);

    // Slider wrap (Bands opacity)
    const sliderWrap = document.createElement("div");
    sliderWrap.style.display = "grid";
    sliderWrap.style.gridTemplateColumns = "auto 1fr auto";
    sliderWrap.style.alignItems = "center";
    sliderWrap.style.gap = "10px";
    sliderWrap.style.padding = "10px 12px";
    sliderWrap.style.border = "1px solid rgba(255,255,255,0.14)";
    sliderWrap.style.borderRadius = "16px";
    sliderWrap.style.background = "rgba(0,0,0,0.08)";

    const lbl = document.createElement("div");
    lbl.textContent = "Bands";
    lbl.style.fontWeight = "900";
    lbl.style.letterSpacing = ".2px";
    lbl.style.color = "rgba(255,255,255,0.76)";
    lbl.style.fontSize = "14px";

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
    pct.style.fontWeight = "900";
    pct.style.color = "rgba(255,255,255,0.70)";
    pct.style.fontSize = "14px";

    slider.addEventListener("input", function () {
      const v = clamp(Number(slider.value) / 100, 0, 1);
      STATE.bandOpacity = v;
      pct.textContent = `${Math.round(v * 100)}%`;
      // Update swatches in the BP band legend
      try { updateLegendUI(legendEl); } catch (_) {}
      try { render(); } catch (_) {}
    }, { passive: true });

    sliderWrap.appendChild(lbl);
    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(pct);

    legendEl.appendChild(bandBox);
    legendEl.appendChild(sliderWrap);

    updateLegendUI(legendEl);
  }

  function updateLegendUI(legendEl) {
    if (!legendEl) return;

    const slider = legendEl.querySelector("#bandOpacitySlider");
    const pct = legendEl.querySelector("#bandOpacityValue");
    const op = clamp(STATE.bandOpacity, 0, 1);

    if (slider) slider.value = String(Math.round(op * 100));
    if (pct) pct.textContent = `${Math.round(op * 100)}%`;

    // Update band swatches to match opacity
    const bandLegend = legendEl.querySelector("#bpBandsLegend");
    if (bandLegend) {
      const swatches = bandLegend.querySelectorAll("span");
      // swatches include only our colored rectangles (first span of each row)
      // safest: rebuild those rectangles’ background by mapping rows in order
      const rows = bandLegend.querySelectorAll("div > div");
      // rows selects many; instead, target pills:
      const pills = bandLegend.querySelectorAll("div[style*='border-radius: 999px']");
      if (pills && pills.length) {
        const topDown = STYLE.bpBands.slice().reverse();
        for (let i = 0; i < pills.length && i < topDown.length; i++) {
          const pill = pills[i];
          const sw = pill.querySelector("span");
          if (!sw) continue;
          sw.style.background = rgba(topDown[i].rgb, op);
        }
      }
    }
  }

  // ===== Render =====
  async function render() {
    const canvas = $(ID_CANVAS);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const legendEl = $(ID_LEGEND);
    const loadingEl = $(ID_LOADING);

    ensureLegendUI(legendEl);

    if (loadingEl) loadingEl.style.display = "none";

    const raw = await getRawDataMultiSource();
    const data = normalizeData(raw);

    const sized = sizeToCSS(canvas);
    const w = sized.w, h = sized.h;
    const L = layout(w, h);

    clear(ctx, w, h);

    if (!data.length) {
      ctx.fillStyle = STYLE.textMuted;
      ctx.font = "16px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("No data to display.", L.plotX, L.plotY);
      return;
    }

    const win = computeWindow(data);
    const windowed = win.windowed;
    const start = win.start;
    const end = win.end;

    if (!windowed.length || start == null || end == null || end <= start) {
      ctx.fillStyle = STYLE.textMuted;
      ctx.font = "16px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("No data in current window.", L.plotX, L.plotY);
      return;
    }

    // Date range label above the chart
    ensureRangeLabel(canvas, start, end);

    const bounds = computeYBounds(windowed);

    // Background stripes + BP bands
    drawDayStripes(ctx, start, end, L);
    drawBPBands(ctx, bounds, L);

    // Grid + axes + lines + on-chart series legend
    drawGridAndAxes(ctx, bounds, L, start, end);
    drawLines(ctx, windowed, bounds, start, end, L);
    drawOnChartSeriesLegend(ctx, L);
  }

  function onShow() { render(); }

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

  window.VTChart = { onShow, setDays, panBy };

  window.addEventListener("resize", function () {
    try { render(); } catch (_) {}
  }, { passive: true });

})();
