/* File: js/chart.js */
/*
Vitals Tracker — Charts (Canvas)

App Version Authority: js/version.js

LATEST CHANGES (per user instructions ONLY)
- Fix X-axis label clipping/near-invisibility by correcting DPR handling:
  - Canvas is sized in device pixels, but ALL drawing is done in CSS pixels via ctx.setTransform(dpr,...)
  - Fonts/labels render at intended size and no longer appear as clipped dots
- X-axis labels (Day + Date, 2 rows) remain reserved space and forced to render with thinning.
- Day bands remain fixed to calendar days, 20% opacity, overlaying HTN bands.
- Y-axis remains STATIC for the session based on FULL dataset max (no jumping on pan/zoom).
- Pinch zoom remains SMOOTH (continuous float days).
*/

(function () {
  "use strict";

  const ID_CANVAS  = "chartCanvas";
  const ID_LEGEND  = "chartLegend";
  const ID_LOADING = "chartsLoading";

  const MS_DAY = 86400000;

  const STYLE = Object.freeze({
    axes: "rgba(255,255,255,0.22)",
    grid: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.78)",
    textMuted: "rgba(255,255,255,0.58)",

    lineSys: "rgba(175,210,255,0.98)",
    lineDia: "rgba(240,240,240,0.88)",
    lineHr:  "rgba(120,235,170,0.90)",

    // Alternating day stripes (OVERLAY HTN bands)
    dayA: "rgba(0,0,0,0.00)",
    dayB: "rgba(0,0,0,0.20)",

    // BP category bands (SYSTOLIC)
    bpBands: [
      { from: 0,   to: 120, rgb: [ 40, 120, 210], label: "Normal <120" },               // blue
      { from: 120, to: 130, rgb: [125,  80, 180], label: "Elevated 120–129" },          // purple
      { from: 130, to: 140, rgb: [245, 200,  55], label: "Stage 1 HTN 130–139" },       // yellow
      { from: 140, to: 180, rgb: [210,  70,  80], label: "Stage 2 HTN 140–179" },       // red
      { from: 180, to: 999, rgb: [135,  25,  35], label: "Hypertensive Crisis ≥180" }   // dark red
    ]
  });

  const STATE = {
    minDays: 1,
    maxDays: 14,
    days: 7,               // continuous float
    centerMs: null,
    dataMinMs: null,
    dataMaxMs: null,
    bandOpacity: 0.60,
    yMaxStatic: null
  };

  const GESTURE = {
    active: false,
    isPinch: false,
    startDays: 7,
    startDist: 0,
    lastMidX: 0,
    lastPanX: 0
  };

  function $(id) { return document.getElementById(id); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rgba(rgb, a) {
    const r = rgb[0] | 0, g = rgb[1] | 0, b = rgb[2] | 0;
    return `rgba(${r},${g},${b},${clamp(a,0,1)})`;
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

    const wPx = Math.max(1, Math.floor(rect.width * dpr));
    const hPx = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== wPx || canvas.height !== hPx) {
      canvas.width = wPx;
      canvas.height = hPx;
    }

    return { dpr, rectW: rect.width, rectH: rect.height, wPx, hPx };
  }

  function clear(ctx, w, h) { ctx.clearRect(0, 0, w, h); }

  function layout(w, h) {
    const padL = 78;
    const padR = 20;
    const padT = 16;

    // Reserve enough space so 2-row X labels never clip.
    const padB = 118;

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

  function computeDatasetBounds(data) {
    if (!data.length) return { min: null, max: null };
    return { min: data[0].ts, max: data[data.length - 1].ts };
  }

  function clampCenterToData() {
    if (!Number.isFinite(STATE.dataMinMs) || !Number.isFinite(STATE.dataMaxMs)) return;

    const span = STATE.days * MS_DAY;
    const half = span / 2;

    if ((STATE.dataMaxMs - STATE.dataMinMs) <= span) {
      STATE.centerMs = (STATE.dataMinMs + STATE.dataMaxMs) / 2;
      return;
    }

    const minC = STATE.dataMinMs + half;
    const maxC = STATE.dataMaxMs - half;

    if (!Number.isFinite(STATE.centerMs)) STATE.centerMs = STATE.dataMaxMs;
    STATE.centerMs = clamp(STATE.centerMs, minC, maxC);
  }

  function computeWindow(data) {
    if (!data.length) return { windowed: [], start: null, end: null };

    const b = computeDatasetBounds(data);
    STATE.dataMinMs = b.min;
    STATE.dataMaxMs = b.max;

    if (!Number.isFinite(STATE.centerMs)) STATE.centerMs = STATE.dataMaxMs;
    clampCenterToData();

    const span = STATE.days * MS_DAY;
    const half = span / 2;

    let start = STATE.centerMs - half;
    let end   = STATE.centerMs + half;

    const min = STATE.dataMinMs;
    const max = STATE.dataMaxMs;

    if (Number.isFinite(min) && Number.isFinite(max)) {
      if ((max - min) <= span) {
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

  function computeGlobalYMaxOnce(data) {
    if (STATE.yMaxStatic != null) return;

    let maxV = -Infinity;
    for (const r of data) {
      if (typeof r.sys === "number") maxV = Math.max(maxV, r.sys);
      if (typeof r.dia === "number") maxV = Math.max(maxV, r.dia);
      if (typeof r.hr  === "number") maxV = Math.max(maxV, r.hr);
    }

    if (!Number.isFinite(maxV)) {
      STATE.yMaxStatic = 180;
      return;
    }

    const maxRounded = Math.ceil((maxV + 10) / 10) * 10;
    STATE.yMaxStatic = Math.max(60, maxRounded);
  }

  function computeYBoundsStatic() {
    return { min: 40, max: (STATE.yMaxStatic != null ? STATE.yMaxStatic : 180) };
  }

  function startOfDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dayIndexUTC(midnightLocalMs) {
    return Math.floor(midnightLocalMs / MS_DAY);
  }

  function drawDayStripes(ctx, start, end, L) {
    const first = startOfDay(start);
    let t = first;

    while (t < end + MS_DAY) {
      const a = Math.max(start, t);
      const b = Math.min(end, t + MS_DAY);

      const x1 = xScale(a, start, end, L);
      const x2 = xScale(b, start, end, L);

      const idx = dayIndexUTC(t);
      const striped = (idx % 2) !== 0;

      ctx.fillStyle = striped ? STYLE.dayB : STYLE.dayA;
      ctx.fillRect(x1, L.plotY, (x2 - x1), L.plotH);

      t += MS_DAY;
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

  function fmtDay(d) {
    return d.toLocaleDateString([], { weekday: "short" });
  }

  function fmtMD(d) {
    return d.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
  }

  function buildXTicks(start, end, L, minPx) {
    const spanMs = end - start;
    if (spanMs <= 0) return [];

    const firstDay = startOfDay(start);
    const lastDay  = startOfDay(end);

    const ticks = [];
    for (let t = firstDay; t <= lastDay + MS_DAY; t += MS_DAY) {
      const x = xScale(t, start, end, L);
      ticks.push({ t, x });
    }

    if (ticks.length <= 1) return ticks;

    const kept = [];
    let lastX = -Infinity;

    for (const tick of ticks) {
      if ((tick.x - lastX) >= minPx) {
        kept.push(tick);
        lastX = tick.x;
      }
    }

    const first = ticks[0];
    const last  = ticks[ticks.length - 1];

    function hasNear(x) {
      for (const k of kept) {
        if (Math.abs(k.x - x) < (minPx * 0.45)) return true;
      }
      return false;
    }

    if (!hasNear(first.x)) kept.unshift(first);
    if (!hasNear(last.x)) kept.push(last);

    if (kept.length === 1 && ticks.length >= 2) kept.push(last);

    kept.sort((a, b) => a.x - b.x);
    return kept;
  }

  function drawGridAndAxes(ctx, bounds, L, start, end, sized) {
    const fontY = 20;
    const fontX = 18;

    // Y grid + labels
    ctx.strokeStyle = STYLE.grid;
    ctx.lineWidth = 1;

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = `800 ${fontY}px system-ui`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const span = bounds.max - bounds.min;
    const step = (span <= 120) ? 10 : 20;

    for (let v = bounds.min; v <= bounds.max; v += step) {
      const y = yScale(v, bounds, L);

      ctx.beginPath();
      ctx.moveTo(L.plotX, y);
      ctx.lineTo(L.plotX + L.plotW, y);
      ctx.stroke();

      ctx.fillText(String(v), L.plotX - 14, y);
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

    // X labels (day row + date row)
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = `900 ${fontX}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const yText1 = L.plotY + L.plotH + 10;
    const yText2 = yText1 + 24;

    const minPx = 84; // CSS px now (DPR corrected by transform)
    const ticks = buildXTicks(start, end, L, minPx);

    for (const tick of ticks) {
      const d = new Date(tick.t);
      ctx.fillText(fmtDay(d), tick.x, yText1);
      ctx.fillText(fmtMD(d),  tick.x, yText2);
    }
  }

  function drawLines(ctx, data, bounds, start, end, L) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.plotX, L.plotY, L.plotW, L.plotH);
    ctx.clip();

    ctx.lineWidth = 5;
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

    const pad = 8;
    const w = 178;
    const h = pad * 2 + items.length * lineH;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    roundRect(ctx, x0 - pad, y0 - pad, w, h, 12, true, true);

    ctx.font = `900 ${font}px system-ui`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    let y = y0 + 1;
    for (const it of items) {
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + 24, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillText(it.label, x0 + 34, y);

      y += lineH;
    }

    ctx.restore();
  }

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
        el.style.fontWeight = "900";
        el.style.letterSpacing = ".2px";
        el.style.color = "rgba(255,255,255,0.62)";
        el.style.fontSize = "18px";
        el.style.userSelect = "none";
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

  // ===== Tight BP legend + slider (unchanged behavior) =====
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
    legendEl.style.gap = "8px";
    legendEl.style.paddingTop = "8px";

    const bandBox = document.createElement("div");
    bandBox.id = "bpBandsLegend";
    bandBox.style.display = "grid";
    bandBox.style.gap = "6px";
    bandBox.style.padding = "8px 10px";
    bandBox.style.border = "1px solid rgba(255,255,255,0.14)";
    bandBox.style.borderRadius = "16px";
    bandBox.style.background = "rgba(0,0,0,0.06)";

    const bandTitle = document.createElement("div");
    bandTitle.textContent = "Blood Pressure Bands (Systolic)";
    bandTitle.style.fontWeight = "900";
    bandTitle.style.letterSpacing = ".2px";
    bandTitle.style.color = "rgba(255,255,255,0.66)";
    bandTitle.style.fontSize = "12px";
    bandTitle.style.marginBottom = "0px";

    const bandList = document.createElement("div");
    bandList.style.display = "grid";
    bandList.style.gap = "4px";

    const topDown = STYLE.bpBands.slice().reverse();

    function tightRow(label, rgb) {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "12px 1fr";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.padding = "4px 8px";
      row.style.border = "1px solid rgba(255,255,255,0.10)";
      row.style.borderRadius = "12px";
      row.style.background = "rgba(0,0,0,0.04)";

      const sw = document.createElement("span");
      sw.className = "bpBandSwatch";
      sw.style.width = "12px";
      sw.style.height = "8px";
      sw.style.borderRadius = "6px";
      sw.style.background = rgba(rgb, clamp(STATE.bandOpacity, 0, 1));
      sw.style.border = "1px solid rgba(255,255,255,0.10)";

      const tx = document.createElement("span");
      tx.textContent = label;
      tx.style.color = "rgba(255,255,255,0.68)";
      tx.style.fontSize = "12px";
      tx.style.fontWeight = "900";
      tx.style.letterSpacing = ".12px";
      tx.style.lineHeight = "1.05";

      row.appendChild(sw);
      row.appendChild(tx);
      return row;
    }

    for (const b of topDown) {
      bandList.appendChild(tightRow(b.label, b.rgb));
    }

    bandBox.appendChild(bandTitle);
    bandBox.appendChild(bandList);

    const sliderWrap = document.createElement("div");
    sliderWrap.style.display = "grid";
    sliderWrap.style.gridTemplateColumns = "auto 1fr auto";
    sliderWrap.style.alignItems = "center";
    sliderWrap.style.gap = "10px";
    sliderWrap.style.padding = "8px 10px";
    sliderWrap.style.border = "1px solid rgba(255,255,255,0.14)";
    sliderWrap.style.borderRadius = "16px";
    sliderWrap.style.background = "rgba(0,0,0,0.08)";

    const lbl = document.createElement("div");
    lbl.textContent = "Bands";
    lbl.style.fontWeight = "900";
    lbl.style.letterSpacing = ".2px";
    lbl.style.color = "rgba(255,255,255,0.74)";
    lbl.style.fontSize = "13px";

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
    pct.style.fontSize = "13px";

    slider.addEventListener("input", function () {
      const v = clamp(Number(slider.value) / 100, 0, 1);
      STATE.bandOpacity = v;
      pct.textContent = `${Math.round(v * 100)}%`;
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

    const swatches = legendEl.querySelectorAll(".bpBandSwatch");
    const topDown = STYLE.bpBands.slice().reverse();
    for (let i = 0; i < swatches.length && i < topDown.length; i++) {
      swatches[i].style.background = rgba(topDown[i].rgb, op);
    }
  }

  let _lastSized = null;
  let _lastWin = null;

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
    _lastSized = sized;

    // Draw in CSS pixels (fixes tiny/clipped labels on high-DPR screens)
    const dpr = sized.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = sized.rectW;
    const h = sized.rectH;

    const L = layout(w, h);

    clear(ctx, w, h);

    if (!data.length) {
      ctx.fillStyle = STYLE.textMuted;
      ctx.font = "16px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("No data to display.", L.plotX, L.plotY);
      _lastWin = null;
      return;
    }

    computeGlobalYMaxOnce(data);

    const win = computeWindow(data);
    const windowed = win.windowed;
    const start = win.start;
    const end = win.end;

    _lastWin = { start, end, L };

    if (!windowed.length || start == null || end == null || end <= start) {
      ctx.fillStyle = STYLE.textMuted;
      ctx.font = "16px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("No data in current window.", L.plotX, L.plotY);
      return;
    }

    ensureRangeLabel(canvas, start, end);

    const bounds = computeYBoundsStatic();

    // HTN bands first, then day stripes OVERLAY (per instruction)
    drawBPBands(ctx, bounds, L);
    drawDayStripes(ctx, start, end, L);

    drawGridAndAxes(ctx, bounds, L, start, end, sized);
    drawLines(ctx, windowed, bounds, start, end, L);
    drawOnChartSeriesLegend(ctx, L);
  }

  function onShow() { render(); }

  function setDays(d) {
    STATE.days = clamp(d, STATE.minDays, STATE.maxDays);
    clampCenterToData();
    render();
  }

  function panBy(ms) {
    STATE.centerMs = (Number.isFinite(STATE.centerMs) ? STATE.centerMs : Date.now()) + ms;
    clampCenterToData();
    render();
  }

  function getTouches(e) {
    const t = [];
    if (e.touches && e.touches.length) {
      for (let i = 0; i < e.touches.length; i++) t.push(e.touches[i]);
    } else if (e.changedTouches && e.changedTouches.length) {
      for (let i = 0; i < e.changedTouches.length; i++) t.push(e.changedTouches[i]);
    }
    return t;
  }

  function dist2(a, b) {
    const dx = (a.clientX - b.clientX);
    const dy = (a.clientY - b.clientY);
    return Math.sqrt(dx*dx + dy*dy);
  }

  function midX(a, b) {
    return (a.clientX + b.clientX) / 2;
  }

  function attachGestures() {
    const canvas = $(ID_CANVAS);
    if (!canvas || canvas.dataset?.vtGestures === "1") return;
    if (canvas.dataset) canvas.dataset.vtGestures = "1";

    const onStart = (e) => {
      const touches = getTouches(e);
      if (!touches.length) return;

      GESTURE.active = true;

      if (touches.length >= 2) {
        GESTURE.isPinch = true;
        GESTURE.startDays = STATE.days;
        GESTURE.startDist = dist2(touches[0], touches[1]);
        GESTURE.lastMidX = midX(touches[0], touches[1]);
      } else {
        GESTURE.isPinch = false;
        GESTURE.lastPanX = touches[0].clientX;
      }

      try { e.preventDefault(); } catch (_) {}
    };

    const onMove = (e) => {
      if (!GESTURE.active) return;

      const touches = getTouches(e);
      if (!touches.length) return;

      if (GESTURE.isPinch && touches.length >= 2) {
        const d = dist2(touches[0], touches[1]);
        const ratio = (d > 0 && GESTURE.startDist > 0) ? (GESTURE.startDist / d) : 1;

        const targetDays = clamp(GESTURE.startDays * ratio, STATE.minDays, STATE.maxDays);

        if (Math.abs(targetDays - STATE.days) > 0.0005) {
          STATE.days = targetDays;
          clampCenterToData();
        }

        const mx = midX(touches[0], touches[1]);
        const dx = mx - GESTURE.lastMidX;
        GESTURE.lastMidX = mx;

        if (_lastWin && _lastWin.start != null && _lastWin.end != null && _lastSized) {
          const rectW = (_lastSized.rectW || 1);
          const spanMs = (_lastWin.end - _lastWin.start) || 1;
          const msPerPx = spanMs / rectW;
          STATE.centerMs = (Number.isFinite(STATE.centerMs) ? STATE.centerMs : Date.now()) - (dx * msPerPx);
          clampCenterToData();
        }

        render();
        try { e.preventDefault(); } catch (_) {}
        return;
      }

      if (!GESTURE.isPinch && touches.length === 1) {
        const x = touches[0].clientX;
        const dx = x - GESTURE.lastPanX;
        GESTURE.lastPanX = x;

        if (_lastWin && _lastWin.start != null && _lastWin.end != null && _lastSized) {
          const rectW = (_lastSized.rectW || 1);
          const spanMs = (_lastWin.end - _lastWin.start) || 1;
          const msPerPx = spanMs / rectW;

          const ms = -(dx * msPerPx);
          STATE.centerMs = (Number.isFinite(STATE.centerMs) ? STATE.centerMs : Date.now()) + ms;
          clampCenterToData();
          render();
        }

        try { e.preventDefault(); } catch (_) {}
      }
    };

    const onEnd = (e) => {
      const touches = getTouches(e);
      if (touches.length === 0) {
        GESTURE.active = false;
        GESTURE.isPinch = false;
      } else if (touches.length === 1) {
        GESTURE.isPinch = false;
        GESTURE.lastPanX = touches[0].clientX;
      }
      try { e.preventDefault(); } catch (_) {}
    };

    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove",  onMove,  { passive: false });
    canvas.addEventListener("touchend",   onEnd,   { passive: false });
    canvas.addEventListener("touchcancel",onEnd,   { passive: false });
  }

  window.VTChart = { onShow, setDays, panBy };

  window.addEventListener("resize", function () {
    try { render(); } catch (_) {}
  }, { passive: true });

  window.addEventListener("load", function () {
    try { attachGestures(); } catch (_) {}
  }, { passive: true });

})();
