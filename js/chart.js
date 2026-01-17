/*
Vitals Tracker (Modular) — js/chart.js
App Version: v2.001

Purpose:
- Renders the Charts canvas with:
  - Default view = most recent 7 days (ending at latest reading; fallback to “now”).
  - Zoom: min 1 day, max 14 days.
  - Pan: horizontal across time (clamped to available data range).
  - Dynamic Y-axis labels based on visible data.
  - Hypertension bands (systolic-focused) that are obvious but not distracting.
  - Visible-range label (auto-updates on default/zoom/pan).
- Exports ONLY the currently visible date range on the chart.

Latest Update (v2.001):
- Removed dependency on week selector (v1 behavior replaced).
- Implemented hypertension bands + visible range label + visible-only export wiring.
*/

import { chartView, setChartBaseAndClamp, setChartSpan, panChartByFraction } from "./state.js";
import { loadRecords } from "./storage.js";
import { fmtDateTime, clamp, startOfDay, endOfDay } from "./utils.js";
import { exportChartsVisibleReport } from "./reports.js";

/* -----------------------------
   Clinical bands (systolic-focused)
   -----------------------------
   Reference ranges (common clinical categorization; simplified for visual cue):
   - Hypotensive: < 90
   - Normal: 90–119
   - Elevated: 120–129
   - HTN Stage 1: 130–139
   - HTN Stage 2: 140–179
   - Hypertensive crisis: >= 180
*/
const SYS_BANDS = [
  { name:"Hypotensive",  lo:-Infinity, hi: 90,  fill:"rgba(120,220,180,.10)" },
  { name:"Normal",       lo: 90,       hi: 120, fill:"rgba(255,255,255,.06)" },
  { name:"Elevated",     lo: 120,      hi: 130, fill:"rgba(255,220,120,.10)" },
  { name:"HTN Stage 1",  lo: 130,      hi: 140, fill:"rgba(255,170,90,.12)" },
  { name:"HTN Stage 2",  lo: 140,      hi: 180, fill:"rgba(255,110,110,.12)" },
  { name:"Crisis",       lo: 180,      hi: Infinity, fill:"rgba(255,80,120,.14)" }
];

function pickVisibleRecordsAscending(){
  // chart renders best in ascending time
  const all = loadRecords().slice().reverse();
  const a = chartView.viewMin;
  const b = chartView.viewMax;
  return all.filter(r => r.ts >= a && r.ts <= b);
}

function computeBaseFromData(){
  const recs = loadRecords();
  if(!recs.length){
    const now = Date.now();
    const baseMin = startOfDay(now - 14*24*60*60*1000);
    const baseMax = endOfDay(now);
    setChartBaseAndClamp(baseMin, baseMax, true);
    return;
  }
  const minTs = recs[recs.length - 1].ts; // since recs newest-first
  const maxTs = recs[0].ts;

  const baseMin = startOfDay(minTs);
  const baseMax = endOfDay(maxTs);

  setChartBaseAndClamp(baseMin, baseMax, false);
}

function setDefaultMostRecent7Days(){
  const recs = loadRecords();
  const endTs = recs.length ? recs[0].ts : Date.now();
  const span = 7 * 24 * 60 * 60 * 1000;

  // Ensure base is computed before view set.
  computeBaseFromData();

  chartView.viewMax = endTs;
  chartView.viewMin = endTs - span;

  // clamp to base and enforce span bounds
  setChartSpan(span, false);
}

function yTo(v, yMin, yMax, pad, H){
  const span = H - pad.t - pad.b;
  const t = (v - yMin) / ((yMax - yMin) || 1);
  return pad.t + span * (1 - t);
}

function xFromTs(ts, tMin, tMax, pad, W){
  const span = W - pad.l - pad.r;
  const denom = (tMax - tMin) || 1;
  const u = (ts - tMin) / denom;
  return pad.l + span * u;
}

function computeYRange(recs){
  const values = [];
  for(const r of recs){
    if(r.sys != null) values.push(r.sys);
    if(r.dia != null) values.push(r.dia);
    if(r.hr  != null) values.push(r.hr);
  }

  // If no data visible, keep a safe “clinical” window.
  if(!values.length){
    return { yMin: 60, yMax: 190 };
  }

  let minV = Math.min(...values);
  let maxV = Math.max(...values);

  // Add padding proportional to spread, but keep reasonable minimum padding.
  const spread = Math.max(1, maxV - minV);
  const padV = Math.max(8, Math.round(spread * 0.12));

  let yMin = minV - padV;
  let yMax = maxV + padV;

  // Keep enough room to display the band context even if data is narrow.
  // This helps the bands stay informative without forcing an overly wide axis.
  yMin = Math.min(yMin, 80);
  yMax = Math.max(yMax, 180);

  // Avoid silly tiny ranges.
  if((yMax - yMin) < 40){
    const mid = (yMax + yMin) / 2;
    yMin = mid - 20;
    yMax = mid + 20;
  }

  // Clamp to sane absolute limits for readability.
  yMin = clamp(Math.floor(yMin), 30, 260);
  yMax = clamp(Math.ceil(yMax),  60, 300);

  // Ensure ordering
  if(yMax <= yMin) yMax = yMin + 40;

  return { yMin, yMax };
}

function drawAxesAndGrid(ctx, W, H, pad, yMin, yMax){
  // Outer frame
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(235,245,255,.12)";
  ctx.fillStyle = "rgba(255,255,255,.02)";
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(0,0,W,H,22); else ctx.rect(0,0,W,H);
  ctx.fill();
  ctx.stroke();

  // Grid + y labels
  ctx.font = "16px system-ui,Segoe UI,Roboto";
  ctx.fillStyle = "rgba(235,245,255,.60)";
  ctx.strokeStyle = "rgba(235,245,255,.10)";
  ctx.lineWidth = 1;

  const ticks = 5;
  for(let i=0;i<=ticks;i++){
    const y = pad.t + (H - pad.t - pad.b) * (i/ticks);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();

    const val = Math.round(yMax - (yMax-yMin)*(i/ticks));
    ctx.fillText(String(val), 16, y+6);
  }
}

function clipPlot(ctx, pad, W, H){
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, (W - pad.l - pad.r), (H - pad.t - pad.b));
  ctx.clip();
}

function unclipPlot(ctx){
  ctx.restore();
}

function drawHypertensionBands(ctx, pad, W, H, yMin, yMax){
  // Only meaningful if the y-range overlaps typical BP values.
  clipPlot(ctx, pad, W, H);

  const yPlotTop = pad.t;
  const yPlotBot = H - pad.b;

  for(const b of SYS_BANDS){
    const lo = b.lo === -Infinity ? yMin : b.lo;
    const hi = b.hi === Infinity  ? yMax : b.hi;

    const loClamped = clamp(lo, yMin, yMax);
    const hiClamped = clamp(hi, yMin, yMax);
    if(hiClamped <= loClamped) continue;

    const yHi = yTo(hiClamped, yMin, yMax, pad, H);
    const yLo = yTo(loClamped, yMin, yMax, pad, H);

    const bandTop = clamp(yHi, yPlotTop, yPlotBot);
    const bandBot = clamp(yLo, yPlotTop, yPlotBot);
    if(bandBot <= bandTop) continue;

    ctx.fillStyle = b.fill;
    ctx.fillRect(pad.l, bandTop, (W - pad.l - pad.r), (bandBot - bandTop));
  }

  unclipPlot(ctx);
}

function drawSeries(ctx, recs, pick, tMin, tMax, yMin, yMax, pad, W, H, stroke){
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  let started = false;

  for(const r of recs){
    const v = pick(r);
    if(v == null){ started = false; continue; }
    const x = xFromTs(r.ts, tMin, tMax, pad, W);
    const y = yTo(v, yMin, yMax, pad, H);
    if(!started){ ctx.moveTo(x,y); started = true; }
    else ctx.lineTo(x,y);
  }
  ctx.stroke();
}

function drawLegend(ctx, pad){
  // Upper-left
  let x = pad.l + 10;
  let y = pad.t + 26;

  ctx.font = "22px system-ui,Segoe UI,Roboto";
  ctx.textAlign = "start";

  function item(label, color){
    ctx.fillStyle = color;
    ctx.fillRect(x, y-14, 26, 8);
    ctx.fillStyle = "rgba(235,245,255,.88)";
    ctx.fillText(label.split("").join(" "), x+38, y-6);
    y += 32;
  }

  item("Systolic",   "rgba(79,140,255,.98)");
  item("Diastolic",  "rgba(216,224,240,.88)");
  item("Heart Rate", "rgba(120,220,180,.92)");
}

function setRangeLabel(){
  const el = document.getElementById("chartRangeLabel");
  if(!el) return;
  el.textContent = `${fmtDateTime(chartView.viewMin)} to ${fmtDateTime(chartView.viewMax)}`;
}

export function renderChart(){
  const canvas = document.getElementById("chart");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const recs = pickVisibleRecordsAscending();
  const { yMin, yMax } = computeYRange(recs);

  // Plot padding
  const pad = { l:62, r:18, t:18, b:92 };

  ctx.clearRect(0,0,W,H);

  // Clinical bands first (under everything)
  drawHypertensionBands(ctx, pad, W, H, yMin, yMax);

  // Axes/grid above bands
  drawAxesAndGrid(ctx, W, H, pad, yMin, yMax);

  // Series on top
  const tMin = chartView.viewMin;
  const tMax = chartView.viewMax;

  if(recs.length){
    clipPlot(ctx, pad, W, H);
    drawSeries(ctx, recs, r=>r.sys, tMin, tMax, yMin, yMax, pad, W, H, "rgba(79,140,255,.98)");
    drawSeries(ctx, recs, r=>r.dia, tMin, tMax, yMin, yMax, pad, W, H, "rgba(216,224,240,.88)");
    drawSeries(ctx, recs, r=>r.hr,  tMin, tMax, yMin, yMax, pad, W, H, "rgba(120,220,180,.92)");
    unclipPlot(ctx);

    drawLegend(ctx, pad);
  }else{
    ctx.fillStyle = "rgba(235,245,255,.46)";
    ctx.font = "18px system-ui,Segoe UI,Roboto";
    ctx.fillText("No readings in this view.", pad.l + 12, pad.t + 34);
  }

  // X-axis labels: show start/end timestamps (kept succinct)
  ctx.fillStyle = "rgba(235,245,255,.60)";
  ctx.font = "14px system-ui,Segoe UI,Roboto";
  ctx.textAlign = "left";
  ctx.fillText(fmtDateTime(tMin), pad.l, H - 56);

  ctx.textAlign = "right";
  ctx.fillText(fmtDateTime(tMax), W - pad.r, H - 56);

  ctx.textAlign = "start";

  setRangeLabel();
}

export function initChartView(){
  // base + default view (most recent 7 days)
  computeBaseFromData();
  setDefaultMostRecent7Days();

  // Enforce zoom bounds: 1–14 days
  chartView.minSpan = 1 * 24*60*60*1000;
  chartView.maxSpan = 14 * 24*60*60*1000;

  renderChart();
}

export function zoomChart(scaleFactor, centerTs){
  // scaleFactor > 1 => zoom in (smaller span)
  // scaleFactor < 1 => zoom out (larger span)
  const span = (chartView.viewMax - chartView.viewMin) || (7*24*60*60*1000);
  let newSpan = span / (scaleFactor || 1);
  newSpan = clamp(newSpan, chartView.minSpan, chartView.maxSpan);

  const c = Number.isFinite(centerTs) ? centerTs : (chartView.viewMin + chartView.viewMax)/2;
  chartView.viewMin = c - newSpan/2;
  chartView.viewMax = c + newSpan/2;

  setChartSpan(newSpan, true);
  renderChart();
}

export function panChartByPixels(dxPx){
  // Convert pixels to fraction of visible span based on canvas draw width
  const canvas = document.getElementById("chart");
  if(!canvas) return;

  const padL = 62;
  const padR = 18;
  const plotW = Math.max(1, canvas.getBoundingClientRect().width - (padL + padR));

  const frac = dxPx / plotW; // positive dx => pan right (older data to left)
  panChartByFraction(frac);
  renderChart();
}

export function exportVisibleChartRange(){
  const recs = pickVisibleRecordsAscending();
  exportChartsVisibleReport(recs, { viewMin: chartView.viewMin, viewMax: chartView.viewMax });
}

/*
Vitals Tracker (Modular) — js/chart.js (EOF)
App Version: v2.001
Wiring expectations in index.html / charts panel:
- <div id="chartRangeLabel"></div> (or span) exists and is not editable.
- Export button calls exportVisibleChartRange().
- Gestures module should call:
  - zoomChart(scale, centerTs)
  - panChartByPixels(dx)
  - renderChart() after clamps
*/
