/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version Authority: js/version.js
Base: v2.028a
Pass: Chart Display Recovery (P0-C1)
Pass order: File 1 of 1 (P0-C1)

FIX (CHART DISPLAY ONLY)
- Chart MUST "fire" (render runs) and MUST never hang on "Loading..."
- Adds strict render triggers:
  1) DOM ready initial render
  2) vt:panelChanged => active === "charts"
  3) window resize
- Data fallback order:
  1) VTStore.getAll()
  2) VTStorage.getAllRecords()/getAll()/exportAll()/readAll()
  3) DIRECT canonical localStorage keys (no heuristics): vitals_tracker_records_v1 (+ a few legacy keys)
  4) best-effort localStorage scan (only if still empty)
- No swipe logic.
- No storage writes here.

PATCH (DISPLAY BUG)
- Fix DPR scaling so labels are not “huge” on high-DPR phones:
  - Canvas backing store uses device pixels
  - Drawing uses CSS pixels via ctx.setTransform(dpr,...)
  - Layout/labels computed in CSS pixels
*/

(function () {
  "use strict";

  const ID_CANVAS  = "chartCanvas";
  const ID_LEGEND  = "chartLegend";
  const ID_LOADING = "chartsLoading";

  const MS_DAY = 86400000;

  // Canonical keys (v1.19 lineage)
  const LS_KEYS_DIRECT = [
    "vitals_tracker_records_v1",
    "vitals_tracker_records",
    "vitals_records",
    "vt_records",
    "vitalsTrackerRecords"
  ];

  const STYLE = Object.freeze({
    axes: "rgba(255,255,255,0.30)",
    grid: "rgba(255,255,255,0.12)",
    text: "rgba(255,255,255,0.72)",
    textMuted: "rgba(255,255,255,0.58)",
    lineSys: "#ff7676",
    lineDia: "#76baff",
    bands: [
      { from: 180, rgb: [220,  60,  60], label: "Hypertensive Crisis ≥180" },
      { from: 140, rgb: [220, 140,  60], label: "Stage 2 HTN 140–179" },
      { from: 130, rgb: [220, 200,  60], label: "Stage 1 HTN 130–139" },
      { from: 120, rgb: [120, 200, 120], label: "Elevated 120–129" }
    ]
  });

  const STATE = {
    minDays: 1,
    maxDays: 14,
    days: 7,
    centerMs: null,
    dataMinMs: null,
    dataMaxMs: null,
    bandOpacity: 0.60,
    _rendering: false
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

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  async function getFromVTStore() {
    try {
      if (window.VTStore && typeof window.VTStore.getAll === "function") {
        const res = await window.VTStore.getAll();
        return safeArray(res);
      }
    } catch (_) {}
    return [];
  }

  async function getFromVTStorage() {
    try {
      const s = window.VTStorage;
      if (!s) return [];
      const fns = ["getAllRecords", "getAll", "readAll", "exportAll", "getRecords"];
      for (const fn of fns) {
        if (typeof s[fn] === "function") {
          const res = await s[fn]();
          if (Array.isArray(res) && res.length) return res;
        }
      }
    } catch (_) {}
    return [];
  }

  function getFromLocalStorageDirectKeys() {
    try {
      if (!window.localStorage) return [];
      for (const k of LS_KEYS_DIRECT) {
        let raw = null;
        try { raw = localStorage.getItem(k); } catch (_) {}
        if (!raw) continue;

        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) { continue; }

        let arr = null;
        if (Array.isArray(parsed)) arr = parsed;
        else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.records)) arr = parsed.records;
          else if (Array.isArray(parsed.data)) arr = parsed.data;
          else if (Array.isArray(parsed.items)) arr = parsed.items;
        }

        if (Array.isArray(arr) && arr.length) return arr;
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
      if (r == null || typeof r !== "object") continue;
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
    // 1) VTStore (preferred)
    const a = await getFromVTStore();
    if (a && a.length) return a;

    // 2) VTStorage
    const b = await getFromVTStorage();
    if (b && b.length) return b;

    // 3) Direct canonical keys (NO heuristics)
    const c = getFromLocalStorageDirectKeys();
    if (c && c.length) return c;

    // 4) Best-effort scan
    const d = getFromLocalStorageScan();
    if (d && d.length) return d;

    return [];
  }

  function computeDatasetBounds(data) {
    if (!data.length) return { min: null, max: null };
    return { min: data[0].ts, max: data[data.length - 1].ts };
  }

  function niceCeil10(n) { return Math.ceil(n / 10) * 10; }

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
    try {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.touchAction = "none";
    } catch (_) {}
  }

  // Canvas backing store uses device px; drawing uses CSS px via setTransform(dpr,...)
  function sizeToCSS(canvas, ctx) {
    ensureCanvasFillsWrap(canvas);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();

    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);

    const wPx = Math.max(1, Math.floor(cssW * dpr));
    const hPx = Math.max(1, Math.floor(cssH * dpr));

    if (canvas.width !== wPx || canvas.height !== hPx) {
      canvas.width = wPx;
      canvas.height = hPx;
    }

    if (ctx && typeof ctx.setTransform === "function") {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px
    }

    return { dpr, cssW, cssH, wPx, hPx };
  }

  function clear(ctx, cssW, cssH) {
    ctx.clearRect(0, 0, cssW, cssH);
  }

  function layout(cssW, cssH) {
    // Keep prior compact look; slightly larger bottom pad so x-labels never clip.
    const padL = 40;
    const padR = 20;
    const padT = 30;
    const padB = 54;

    return {
      padL, padR, padT, padB,
      plotX: padL,
      plotY: padT,
      plotW: Math.max(10, cssW - padL - padR),
      plotH: Math.max(10, cssH - padT - padB)
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

  function drawBands(ctx, bounds, L) {
    const opacity = clamp(STATE.bandOpacity, 0, 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(L.plotX, L.plotY, L.plotW, L.plotH);
    ctx.clip();

    for (const b of STYLE.bands) {
      if (bounds.max < b.from) continue;
      const y = yScale(b.from, bounds, L);
      ctx.fillStyle = rgba(b.rgb, opacity);
      ctx.fillRect(L.plotX, y, L.plotW, (L.plotY + L.plotH) - y);
    }

    ctx.restore();
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

  function drawAxes(ctx, bounds, L, start, end, cssH) {
    ctx.strokeStyle = STYLE.grid;
    ctx.lineWidth = 1;

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

    ctx.strokeStyle = STYLE.axes;
    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY);
    ctx.lineTo(L.plotX, L.plotY + L.plotH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(L.plotX, L.plotY + L.plotH);
    ctx.lineTo(L.plotX + L.plotW, L.plotY + L.plotH);
    ctx.stroke();

    ctx.fillStyle = STYLE.textMuted;
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Hard clamp so x labels never clip at bottom on any device
    let yText = L.plotY + L.plotH + 10;
    const bottomMargin = 4;
    const fontH = 11;
    const maxYTop = (cssH - bottomMargin - fontH);
    if (yText > maxYTop) yText = Math.max(L.plotY + L.plotH + 2, maxYTop);

    const tMid = start + (end - start) / 2;

    const labels = [
      { t: start, text: fmtTick(start, true) },
      { t: tMid,  text: fmtTick(tMid, false) },
      { t: end,   text: fmtTick(end, true) }
    ];

    const xStart = xScale(labels[0].t, start, end, L);
    const xMid   = xScale(labels[1].t, start, end, L);
    const xEnd   = xScale(labels[2].t, start, end, L);

    const wStart = ctx.measureText(labels[0].text).width;
    const wMid   = ctx.measureText(labels[1].text).width;
    const wEnd   = ctx.measureText(labels[2].text).width;

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

  function ensureLegendUI(legendEl) {
    if (!legendEl) return;

    if (legendEl.dataset && legendEl.dataset.vtLegendBuilt === "1") return;
    if (legendEl.dataset) legendEl.dataset.vtLegendBuilt = "1";

    legendEl.style.display = "grid";
    legendEl.style.gridTemplateColumns = "1fr";
    legendEl.style.gap = "10px";
    legendEl.style.paddingTop = "10px";

    // If the DOM already has your slider + legend, do not rebuild.
    // (This keeps your existing UI intact.)
  }

  async function render() {
    if (STATE._rendering) return;
    STATE._rendering = true;

    const canvas = $(ID_CANVAS);
    const loadingEl = $(ID_LOADING);
    const legendEl = $(ID_LEGEND);

    let killTimer = null;
    try {
      if (loadingEl) loadingEl.style.display = "";

      killTimer = setTimeout(() => {
        try { if (loadingEl) loadingEl.style.display = "none"; } catch (_) {}
      }, 1500);

      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // ensure consistent look
      try { ctx.imageSmoothingEnabled = true; } catch (_) {}

      ensureLegendUI(legendEl);

      const raw = await getRawDataMultiSource();
      const data = normalizeData(raw);

      const sized = sizeToCSS(canvas, ctx);
      const cssW = sized.cssW, cssH = sized.cssH;

      const L = layout(cssW, cssH);

      clear(ctx, cssW, cssH);

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

      drawBands(ctx, bounds, L);
      drawAxes(ctx, bounds, L, start, end, cssH);
      drawLines(ctx, windowed, bounds, start, end, L);

    } catch (_) {
      // never hang on Loading
    } finally {
      if (killTimer) { try { clearTimeout(killTimer); } catch (_) {} }
      try { if (loadingEl) loadingEl.style.display = "none"; } catch (_) {}
      STATE._rendering = false;
    }
  }

  function onShow() { render(); }
  function setDays(d) { STATE.days = clamp(d, STATE.minDays, STATE.maxDays); render(); }
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

  // Render triggers (this is what makes the chart "fire")
  function bindRenderTriggers(){
    // 1) initial render when DOM is ready
    try { render(); } catch (_) {}

    // 2) when Charts panel becomes active
    document.addEventListener("vt:panelChanged", function (e) {
      try {
        if (e?.detail?.active === "charts") render();
      } catch (_) {}
    });

    // 3) resize
    window.addEventListener("resize", function () {
      try { render(); } catch (_) {}
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindRenderTriggers, { passive: true });
  } else {
    bindRenderTriggers();
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version Authority: js/version.js
Base: v2.028a
Pass: Chart Display Recovery (P0-C1)
Pass order: File 1 of 1 (P0-C1)
*/
```0
