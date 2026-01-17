/* ------------------------------------------------------------
   Vitals Tracker — js/chart.js
   Mode: READ-ONLY
   Purpose: Render basic BP/HR chart from legacy/localStorage data
   Notes: No writes. Uses time spacing. Minimal but functional.
   ------------------------------------------------------------ */

(function () {
  "use strict";

  const NS = (window.VT = window.VT || {});
  const CH = (NS.chart = NS.chart || {});

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (children || []).forEach((c) => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }

  function safeJSONParse(s) { try { return JSON.parse(s); } catch { return null; } }

  function num(v) {
    if (v === 0) return 0;
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function normalizeRecord(r) {
    if (!r || typeof r !== "object") return null;

    const ts =
      r.ts || r.timestamp || r.time || r.datetime || r.dateTime || r.createdAt || r.created ||
      r.iso || r.when || r.at || null;

    let t = null;
    if (typeof ts === "number") t = ts;
    else if (typeof ts === "string") {
      const d = Date.parse(ts);
      if (!Number.isNaN(d)) t = d;
    }

    const sys = num(
      r.sys ?? r.systolic ?? r.sbp ?? (r.bp && (r.bp.sys ?? r.bp.systolic))
    );
    const dia = num(
      r.dia ?? r.diastolic ?? r.dbp ?? (r.bp && (r.bp.dia ?? r.bp.diastolic))
    );
    const hr = num(r.hr ?? r.heartRate ?? r.pulse);

    if (!t) return null;
    return { t, sys, dia, hr };
  }

  async function readAllRecordsReadOnly() {
    const S = NS.storage;
    try {
      if (S && typeof S.readAll === "function") {
        const raw = await S.readAll();
        return Array.isArray(raw) ? raw : [];
      }
      if (S && typeof S.getAllReadOnly === "function") {
        const raw = await S.getAllReadOnly();
        return Array.isArray(raw) ? raw : [];
      }
      if (S && typeof S.getAll === "function") {
        const raw = await S.getAll();
        return Array.isArray(raw) ? raw : [];
      }
    } catch {}

    const keysToTry = [
      "vitals_tracker_records",
      "vitals_tracker_records_v1",
      "vitals_tracker_records_v1_18",
      "vitals_tracker_records_v1_19",
      "vitals_tracker_records_v1_19B",
      "vitals_tracker_records_v1_19B44"
    ];

    for (const k of keysToTry) {
      const s = localStorage.getItem(k);
      if (!s) continue;
      const parsed = safeJSONParse(s);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.records)) return parsed.records;
    }
    return [];
  }

  function getRootPanelContainer() {
    return (
      document.querySelector("[data-panel='charts']") ||
      document.querySelector("[data-panel='chart']") ||
      document.querySelector("#panel-charts") ||
      document.querySelector("#chartsPanel") ||
      document.querySelector("#charts-panel") ||
      document.querySelector(".panel.is-charts") ||
      document.querySelector(".panel[data-name='Charts']") ||
      document.querySelector(".panel[data-name='charts']") ||
      document.querySelector(".panel[data-panel='charts']") ||
      document.querySelector(".panel.active") ||
      document.querySelector(".panel.is-active") ||
      document.querySelector(".panel")
    );
  }

  function fmtShort(ms) {
    const d = new Date(ms);
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    let hh = d.getHours();
    const ampm = hh >= 12 ? "P" : "A";
    hh = hh % 12; if (hh === 0) hh = 12;
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}${ampm}`;
  }

  function buildUI(container) {
    const wrap = el("div", { style: "padding:14px; max-width:980px;" });
    const title = el("div", { style: "font-weight:700; font-size:18px; margin:4px 0 10px 0;" }, ["Charts (Read-Only)"]);
    const meta = el("div", { style: "opacity:.75; font-size:13px; margin:6px 0 10px 0;" }, ["Loading…"]);

    const canvas = el("canvas", {
      width: 900,
      height: 420,
      style:
        "width:100%; max-width:980px; height:auto; border-radius:16px; border:1px solid rgba(255,255,255,.14); background:rgba(0,0,0,.14);"
    });

    const hint = el("div", { style: "opacity:.7; font-size:12px; margin-top:8px;" }, [
      "Time-spaced plot. Sys/Dia are drawn when present; HR drawn when present."
    ]);

    try { container.innerHTML = ""; } catch {}
    wrap.appendChild(title);
    wrap.appendChild(meta);
    wrap.appendChild(canvas);
    wrap.appendChild(hint);
    container.appendChild(wrap);

    return { meta, canvas };
  }

  function drawSeries(ctx, pts, x0, y0, w, h) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Layout
    const padL = 50, padR = 16, padT = 18, padB = 40;
    const iw = ctx.canvas.width - padL - padR;
    const ih = ctx.canvas.height - padT - padB;

    // Axes bounds
    const times = pts.map(p => p.t);
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);

    // Value bounds from available sys/dia/hr
    const vals = [];
    for (const p of pts) {
      if (p.sys != null) vals.push(p.sys);
      if (p.dia != null) vals.push(p.dia);
      if (p.hr != null) vals.push(p.hr);
    }
    let vMin = Math.min(...vals);
    let vMax = Math.max(...vals);
    if (!Number.isFinite(vMin) || !Number.isFinite(vMax)) { vMin = 0; vMax = 1; }
    // padding
    const pad = Math.max(5, (vMax - vMin) * 0.08);
    vMin -= pad; vMax += pad;

    function x(t) {
      if (tMax === tMin) return padL + iw / 2;
      return padL + ((t - tMin) / (tMax - tMin)) * iw;
    }
    function y(v) {
      return padT + (1 - (v - vMin) / (vMax - vMin)) * ih;
    }

    // Grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = padT + (ih * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + iw, yy);
      ctx.stroke();
    }
    ctx.restore();

    // Y labels (left)
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.70)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    for (let i = 0; i <= 4; i++) {
      const vv = vMax - ((vMax - vMin) * i) / 4;
      const yy = padT + (ih * i) / 4;
      ctx.fillText(String(Math.round(vv)), 8, yy + 4);
    }
    ctx.restore();

    // X labels (3 ticks)
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const ticks = [tMin, tMin + (tMax - tMin) / 2, tMax];
    ticks.forEach((tt, i) => {
      const xx = x(tt);
      const label = fmtShort(tt);
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, xx - tw / 2, padT + ih + 28);
    });
    ctx.restore();

    // Draw series helper
    function drawLine(key, stroke, dot) {
      const points = pts.filter(p => p[key] != null);
      if (points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x(points[0].t), y(points[0][key]));
      for (let i = 1; i < points.length; i++) ctx.lineTo(x(points[i].t), y(points[i][key]));
      ctx.stroke();

      // dots
      ctx.fillStyle = dot;
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(x(p.t), y(p[key]), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Colors are subtle and system-safe (no themes). Still readable.
    drawLine("sys", "rgba(80,160,255,.95)", "rgba(80,160,255,1)");
    drawLine("dia", "rgba(160,220,255,.85)", "rgba(160,220,255,1)");
    drawLine("hr",  "rgba(255,180,80,.85)",  "rgba(255,180,80,1)");

    // Frame
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, iw, ih);
    ctx.restore();
  }

  async function render() {
    const container = getRootPanelContainer();
    if (!container) return;

    const ui = buildUI(container);

    const raw = await readAllRecordsReadOnly();
    const pts = raw.map(normalizeRecord).filter(Boolean).sort((a, b) => a.t - b.t);

    if (!pts.length) {
      ui.meta.textContent = "No chartable records found (read-only).";
      return;
    }

    ui.meta.textContent = `Plotting ${pts.length} records (read-only).`;

    const ctx = ui.canvas.getContext("2d");
    // Scale for device pixel ratio
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const cssW = ui.canvas.clientWidth || 900;
    const cssH = Math.round(cssW * (420 / 900));
    ui.canvas.width = Math.round(cssW * dpr);
    ui.canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawSeries(ctx, pts);
  }

  CH.render = render;
  CH.init = render;

  document.addEventListener("vt:show:charts", render);
  document.addEventListener("vt:panel:charts", render);

})();
