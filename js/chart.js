/* File: js/chart.js */
/*
Vitals Tracker — Chart Renderer
Copyright (c) 2026 Wendell K. Jiles.
All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns chart rendering ONLY.
- Reads data from VTStore.
- Draws BP + HR time series.
- Does NOT manage panels (panels.js).
- Does NOT manage gestures (gestures.js).
- Does NOT manage state persistence (state.js).

v2.023g — Change Log (THIS FILE ONLY)
1) Guaranteed render on every onShow().
2) Deterministic Y-axis:
   - Min = 40
   - Max = min(250, highestValue + 10)
3) Default window = most recent 7 days.
4) Hard clamp: zoom min 1 day, max 14 days.
5) Removed swipe assumptions entirely (pan/zoom only via state).
6) Eliminated orphan "Loading..." behavior.

Schema position:
File 5 of 10
*/

(function (global) {
  "use strict";

  const DAY_MS = 86400000;
  const MIN_Y = 40;
  const MAX_Y_CAP = 250;

  let canvas, ctx;
  let currentRange = 7 * DAY_MS;

  function $(id) {
    return document.getElementById(id);
  }

  function clearLoading() {
    const el = $("chartsLoading");
    if (el) el.style.display = "none";
  }

  function ensureCanvas() {
    canvas = $("chartsCanvas");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    resizeCanvas();
    return true;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
  }

  function getData() {
    if (!global.VTStore?.getAll) return [];
    return global.VTStore.getAll() || [];
  }

  function computeWindow(data) {
    if (!data.length) return null;
    const maxT = Math.max(...data.map(r => r.ts));
    const minT = maxT - currentRange;
    return { minT, maxT };
  }

  function filterWindow(data, win) {
    return data.filter(r => r.ts >= win.minT && r.ts <= win.maxT);
  }

  function computeYBounds(data) {
    let max = MIN_Y;
    for (const r of data) {
      if (r.sys) max = Math.max(max, r.sys);
      if (r.dia) max = Math.max(max, r.dia);
      if (r.hr) max = Math.max(max, r.hr);
    }
    max = Math.min(MAX_Y_CAP, max + 10);
    return { min: MIN_Y, max };
  }

  function scaleX(ts, win, w) {
    return ((ts - win.minT) / (win.maxT - win.minT)) * w;
  }

  function scaleY(v, yb, h) {
    return h - ((v - yb.min) / (yb.max - yb.min)) * h;
  }

  function drawAxes(yb) {
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, scaleY(yb.min, yb, canvas.height));
    ctx.lineTo(canvas.width, scaleY(yb.min, yb, canvas.height));
    ctx.stroke();
  }

  function drawSeries(data, win, yb, key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;

    for (const r of data) {
      if (!r[key]) continue;
      const x = scaleX(r.ts, win, canvas.width);
      const y = scaleY(r[key], yb, canvas.height);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  function render() {
    if (!ensureCanvas()) return;

    clearLoading();
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = getData();
    if (!data.length) return;

    const win = computeWindow(data);
    if (!win) return;

    const visible = filterWindow(data, win);
    if (!visible.length) return;

    const yb = computeYBounds(visible);

    drawAxes(yb);
    drawSeries(visible, win, yb, "sys", "#9ad7ff");
    drawSeries(visible, win, yb, "dia", "#ffffff");
    drawSeries(visible, win, yb, "hr", "#7cffb2");
  }

  function clampDays(days) {
    return Math.max(1, Math.min(14, days));
  }

  function setRangeDays(days) {
    currentRange = clampDays(days) * DAY_MS;
    render();
  }

  function onShow() {
    // Always re-render on panel activation
    setRangeDays(7);
  }

  // Public API
  global.VTChart = Object.freeze({
    onShow,
    setRangeDays,
    render
  });

  window.addEventListener("resize", () => {
    if (canvas) resizeCanvas();
  });

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.023g (deterministic render + scaling reset)
Schema order: File 5 of 10
*/
