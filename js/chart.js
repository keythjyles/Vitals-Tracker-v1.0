/* File: js/chart.js */
/*
Vitals Tracker — Charts (Canvas)

App Version Authority: js/version.js

GOAL (per user request)
- Make chart match the v2.025-style example:
  - Subtle alternating DAY vertical bands (background stripes)
  - BP category horizontal bands (colored) with adjustable opacity slider
  - Legend for Systolic / Diastolic / Heart Rate
  - “Loading…” element hidden once rendered
  - Pull data from VTStore first, then VTStorage fallbacks, then localStorage best-effort

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

  // ====== LOOK & FEEL (matches the example vibe) ======
  const STYLE = Object.freeze({
    // Chart chrome
    axes: "rgba(255,255,255,0.22)",
    grid: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.70)",
    textMuted: "rgba(255,255,255,0.52)",

    // Series colors (example-like)
    lineSys: "rgba(170,205,255,0.95)", // light blue
    lineDia: "rgba(235,235,235,0.82)", // light gray
    lineHr:  "rgba(120,230,160,0.82)", // green

    // Alternating day bands (vertical stripes)
    dayA: "rgba(0,0,0,0.00)",
    dayB: "rgba(0,0,0,0.10)",

    // BP category horizontal bands (example-like palette)
    // Order: lowest -> highest so we can paint ranges cleanly.
    bpBands: [
      { from: 0,   to: 120, rgb: [ 60, 110,  90], label: "Normal <120" },          // deep green
      { from: 120, to: 130, rgb: [120, 120,  60], label: "Elevated 120–129" },     // olive
      { from: 130, to: 140, rgb: [160, 120,  60], label: "Stage 1 130–139" },      // brown/orange
      { from: 140, to: 160, rgb: [ 90,  80, 150], label: "Stage 2 140–159" },      // purple
      { from: 160, to: 999, rgb: [150,  60,  70], label: "Stage 2 ≥160" }          // maroon
    ]
  });

  // ===== Runtime state =====
  const STATE = {
    // time window
    minDays: 1,
    maxDays: 14,
    days: 7,
    centerMs: null,
    dataMinMs: null,
    dataMaxMs: null,

    // bands
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
        // Some builds have async, some sync — support both.
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

      const fns = [
        "getAll",
        "getAllRecords",
        "loadAll",
        "readAll",
        "exportAll",
        "getRecords"
      ];

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

    let score = 0;
    let checked = 0;

    for (let i = 0; i < arr.length; i++) {
      const r = arr[i];
      if (!r || typeof r !== "object") continue;
      checked++;
      const e = extractFromRecord(r);
      if (e.ts != null) score += 2;
      if (e.sys != null) score += 2;
      if (e.dia != null) score += 2;
      if (e.hr != null)  score += 1;
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
    return { w, h };
  }

  function clear(ctx, w, h) { ctx.clearRect(0, 0, w, h); }

  function layout(w, h) {
    // Leave space for y labels and x labels like the example
    const padL = 48;
    const padR = 18;
    const padT = 18;
    const padB = 44;

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
    // Example-like grid: 10s or 20s
    if (span <= 60) return 10;
    if (span <= 120) return 10;
    return 20;
  }

  function computeYBounds(windowed) {
    // Match the example: include sys/dia/hr in one scale BUT keep it tight.
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

    // Padding like the example (keeps lines centered, not “all the way up”)
    const pad = 8;
    minV = Math.max(40, Math.floor((minV - pad) / 10) * 10);
    maxV = Math.min(200, Math.ceil((maxV + pad) / 10) * 10);

    // Ensure a minimum range so grid doesn’t look cramped
    if ((maxV - minV) < 60) {
      const mid = (minV + maxV) / 2;
      minV = Math.max(40, Math.floor((mid - 30) / 10) * 10);
      maxV = Math.min(200, Math.ceil((mid + 30) / 10) * 10);
    }

    return { min: minV, max: maxV };
  }

  // ===== Drawing: vertical day stripes + horizontal BP bands =====
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

    // Draw only within plot area, clipped
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.plotX, L.plotY, L.plotW, L.plotH);
    ctx.clip();

    for (const b of STYLE.bpBands) {
      // Convert band y-range to pixels
      const yTop = yScale(Math.min(bounds.max, b.to), bounds, L);
      const yBot = yScale(Math.max(bounds.min, b.from), bounds, L);

      // If completely outside current y-range, skip
      const top = Math.min(yTop, yBot);
      const bot = Math.max(yTop, yBot);
      if (bot < L.plotY || top > (L.plotY + L.plotH)) continue;

      ctx.fillStyle = rgba(b.rgb, op);
      ctx.fillRect(L.plotX, top, L.plotW, bot - top);
    }

    ctx.restore();
  }

  function drawGridAndAxes(ctx, bounds, L, start, end) {
    // Horizontal grid lines + y labels like example
    ctx.strokeStyle = STYLE.grid;
    ctx.lineWidth = 1;

    ctx.fillStyle = STYLE.textMuted;
    ctx.font = "12px system-ui";
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

      ctx.fillText(String(v), L.plotX - 10, y);
    }

    // Axes lines
    ctx.strokeStyle = STYLE.axes;

    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY);
    ctx.lineTo(L.plotX, L.plotY + L.plotH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY + L.plotH);
    ctx.lineTo(L.plotX + L.plotW, L.plotY + L.plotH);
    ctx.stroke();

    // X labels: Wed 01/07 style (sample-like)
    ctx.fillStyle = STYLE.textMuted;
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const yText = L.plotY + L.plotH + 10;

    // Place 4 ticks across window, aligned to day boundaries
    const spanMs = end - start;
    const approxTicks = 4;

    for (let i = 1; i <= approxTicks; i++) {
      const t = start + (spanMs * i) / (approxTicks + 1);
      const d = new Date(t);

      const day = d.toLocaleDateString([], { weekday: "short" });
      const md  = d.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
      const label = `${day}\n${md}`;

      const x = xScale(t, start, end, L);

      // two-line label
      const lines = label.split("\n");
      ctx.fillText(lines[0], x, yText);
      ctx.fillText(lines[1], x, yText + 14);
    }
  }

  function drawLines(ctx, data, bounds, start, end, L) {
    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.plotX, L.plotY, L.plotW, L.plotH);
    ctx.clip();

    ctx.lineWidth = 3;
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

  // ===== Legend UI (slider + series legend) =====
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

    // Slider wrap (Bands opacity)
    const sliderWrap = document.createElement("div");
    sliderWrap.style.display = "grid";
    sliderWrap.style.gridTemplateColumns = "auto 1fr auto";
    sliderWrap.style.alignItems = "center";
    sliderWrap.style.gap = "10px";
    sliderWrap.style.padding = "10px 12px";
    sliderWrap.style.border = "1px solid rgba(255,255,255,0.14)";
    sliderWrap.style.borderRadius = "12px";
    sliderWrap.style.background = "rgba(0,0,0,0.08)";

    const lbl = document.createElement("div");
    lbl.textContent = "Bands";
    lbl.style.fontWeight = "800";
    lbl.style.letterSpacing = ".2px";
    lbl.style.color = "rgba(255,255,255,0.76)";
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
    pct.style.color = "rgba(255,255,255,0.70)";
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

    // Series legend (Systolic/Diastolic/Heart Rate)
    const series = document.createElement("div");
    series.id = "seriesLegend";
    series.style.display = "grid";
    series.style.gap = "8px";

    function seriesRow(name, color) {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "22px 1fr";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.padding = "8px 10px";
      row.style.border = "1px solid rgba(255,255,255,0.12)";
      row.style.borderRadius = "999px";
      row.style.background = "rgba(0,0,0,0.06)";

      const sw = document.createElement("span");
      sw.style.width = "22px";
      sw.style.height = "4px";
      sw.style.borderRadius = "999px";
      sw.style.background = color;

      const tx = document.createElement("span");
      tx.textContent = name;
      tx.style.color = "rgba(255,255,255,0.70)";
      tx.style.fontSize = "12px";
      tx.style.fontWeight = "800";
      tx.style.letterSpacing = ".15px";

      row.appendChild(sw);
      row.appendChild(tx);
      return row;
    }

    series.appendChild(seriesRow("Systolic", STYLE.lineSys));
    series.appendChild(seriesRow("Diastolic", STYLE.lineDia));
    series.appendChild(seriesRow("Heart Rate", STYLE.lineHr));

    legendEl.appendChild(series);
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

    // Hide "Loading..." once we start rendering for real
    if (loadingEl) loadingEl.style.display = "none";

    const raw = await getRawDataMultiSource();
    const data = normalizeData(raw);

    const sized = sizeToCSS(canvas);
    const w = sized.w, h = sized.h;
    const L = layout(w, h);

    clear(ctx, w, h);

    if (!data.length) {
      ctx.fillStyle = STYLE.textMuted;
      ctx.font = "14px system-ui";
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
      ctx.font = "14px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("No data in current window.", L.plotX, L.plotY);
      return;
    }

    const bounds = computeYBounds(windowed);

    // Background stripes + BP bands (example look)
    drawDayStripes(ctx, start, end, L);
    drawBPBands(ctx, bounds, L);

    // Grid & axes, then lines
    drawGridAndAxes(ctx, bounds, L, start, end);
    drawLines(ctx, windowed, bounds, start, end, L);
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
