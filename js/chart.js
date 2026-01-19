/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/chart.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 7 of 9 (P0)
Prev file: js/gestures.js (File 6 of 9)
Next file: js/log.js (File 8 of 9)
*/

(function () {
  "use strict";

  const canvas = document.getElementById("chartCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const legendEl = document.getElementById("chartLegend");
  const loadingEl = document.getElementById("chartsLoading");

  const STATE = {
    minDays: 1,
    maxDays: 14,
    days: 7,
    center: Date.now()
  };

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function getData() {
    if (!window.VTStore || !window.VTStore.getAll) return [];
    return window.VTStore.getAll() || [];
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function computeWindow(data) {
    if (!data.length) return [];

    const sorted = data.slice().sort((a, b) => a.ts - b.ts);
    const half = (STATE.days * 86400000) / 2;
    const start = STATE.center - half;
    const end = STATE.center + half;

    return sorted.filter(r => r.ts >= start && r.ts <= end);
  }

  function computeYBounds(data) {
    let min = 40;
    let max = 140;

    data.forEach(r => {
      if (typeof r.sys === "number") {
        min = Math.min(min, r.sys);
        max = Math.max(max, r.sys);
      }
      if (typeof r.dia === "number") {
        min = Math.min(min, r.dia);
        max = Math.max(max, r.dia);
      }
    });

    min = 40;
    max = clamp(max + 10, 60, 250);
    return { min, max };
  }

  function yScale(val, bounds) {
    const pad = 30;
    const h = canvas.height - pad * 2;
    return pad + (1 - (val - bounds.min) / (bounds.max - bounds.min)) * h;
  }

  function xScale(ts, start, end) {
    const pad = 40;
    const w = canvas.width - pad * 2;
    return pad + ((ts - start) / (end - start)) * w;
  }

  function drawBands(bounds) {
    const bands = [
      { from: 180, color: "rgba(220,60,60,0.35)", label: "Hypertensive Crisis" },
      { from: 140, color: "rgba(220,140,60,0.35)", label: "Stage 2 HTN" },
      { from: 130, color: "rgba(220,200,60,0.35)", label: "Stage 1 HTN" },
      { from: 120, color: "rgba(120,200,120,0.25)", label: "Elevated" }
    ];

    bands.forEach(b => {
      if (bounds.max < b.from) return;
      const y = yScale(b.from, bounds);
      ctx.fillStyle = b.color;
      ctx.fillRect(0, y, canvas.width, canvas.height - y);
    });

    if (legendEl) {
      legendEl.innerHTML = bands.map(b =>
        `<div class="legendRow">
           <span class="legendSwatch" style="background:${b.color}"></span>
           <span>${b.label}</span>
         </div>`
      ).join("");
    }
  }

  function drawAxes(bounds, start, end) {
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(40, 30);
    ctx.lineTo(40, canvas.height - 30);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "12px system-ui";

    const step = 20;
    for (let v = bounds.min; v <= bounds.max; v += step) {
      const y = yScale(v, bounds);
      ctx.fillText(v.toString(), 6, y + 4);
    }
  }

  function drawLines(data, bounds, start, end) {
    ctx.lineWidth = 2;

    function drawKey(key, color) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      let started = false;

      data.forEach(r => {
        if (typeof r[key] !== "number") return;
        const x = xScale(r.ts, start, end);
        const y = yScale(r[key], bounds);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    drawKey("sys", "#ff7676");
    drawKey("dia", "#76baff");
  }

  function render() {
    if (loadingEl) loadingEl.style.display = "none";

    const data = getData();
    clear();

    if (!data.length) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("No data to display.", 60, 80);
      return;
    }

    const windowed = computeWindow(data);
    if (!windowed.length) return;

    const bounds = computeYBounds(windowed);
    const start = Math.min(...windowed.map(r => r.ts));
    const end = Math.max(...windowed.map(r => r.ts));

    drawBands(bounds);
    drawAxes(bounds, start, end);
    drawLines(windowed, bounds, start, end);
  }

  function onShow() {
    render();
  }

  function setDays(d) {
    STATE.days = clamp(d, STATE.minDays, STATE.maxDays);
    render();
  }

  function panBy(ms) {
    STATE.center += ms;
    render();
  }

  window.VTChart = {
    onShow,
    setDays,
    panBy
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/chart.js
Pass: Render Recovery + Swipe Feel
Pass order: File 7 of 9 (P0)
Prev file: js/gestures.js (File 6 of 9)
Next file: js/log.js (File 8 of 9)
*/
