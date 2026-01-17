/*
Vitals Tracker (Modular) — js/chart.js
App Version: v2.001
Purpose:
- Charts panel rendering + interactions:
  - Default view: most recent 7 days (from available data), not “selected week”.
  - Zoom: min 1 day, max 14 days.
  - Pan: horizontal only across time.
  - Dynamic Y-axis based on visible data.
  - Hypertension bands (systolic-focused) as subtle horizontal backgrounds.
  - Visible-range label (replaces date-range selector UI).
  - Export button exports ONLY visible range.

Critical UX Requirements:
- No vertical chart panning.
- When interacting with the chart (pinch/drag), the panel should NOT scroll; gestures are captured by the canvas.
- Scrolling above/below the chart remains panel scroll, but chart gestures should not scroll the panel.

Latest Update (v2.001):
- Initial modular chart implementation with 7–14 day time window rules and hypertension bands.
*/

import { $, clamp, fmtDateTime, startOfDay, mmddFromTs, dowShortFromTs } from "./utils.js";
import { loadRecords } from "./storage.js";
import { exportChartsVisibleReport } from "./reports.js";

/* -----------------------------
   Chart state (time window)
------------------------------ */
const DAY_MS = 24*60*60*1000;

export const chartView = {
  baseMin: 0,
  baseMax: 0,
  viewMin: 0,
  viewMax: 0,
  minSpan: 1*DAY_MS,
  maxSpan: 14*DAY_MS,
  pinch: null,
  pan: null
};

function getDataBounds(){
  const recs = loadRecords();
  if(!recs.length){
    const now = Date.now();
    return { min: now - 7*DAY_MS, max: now };
  }
  const min = recs[recs.length-1].ts; // records are sorted desc in storage, but loadRecords returns desc; last is oldest
  const max = recs[0].ts;
  return { min, max };
}

function ensureBaseBounds(){
  const { min, max } = getDataBounds();
  // Add small padding so panning feels natural at edges
  const pad = 2*60*60*1000;
  chartView.baseMin = min - pad;
  chartView.baseMax = max + pad;

  // sanity
  if(chartView.baseMax <= chartView.baseMin){
    chartView.baseMax = chartView.baseMin + 1;
  }
}

function setDefaultViewMostRecent7Days(){
  ensureBaseBounds();
  const max = chartView.baseMax;
  const span = 7*DAY_MS;
  chartView.viewMax = max;
  chartView.viewMin = max - span;
  clampViewToBase();
}

function clampViewToBase(){
  const baseMin = chartView.baseMin, baseMax = chartView.baseMax;
  let vMin = chartView.viewMin, vMax = chartView.viewMax;

  let span = vMax - vMin;
  span = Math.max(chartView.minSpan, Math.min(span, chartView.maxSpan));

  const mid = (vMin + vMax)/2;
  vMin = mid - span/2;
  vMax = mid + span/2;

  if(vMin < baseMin){ vMin = baseMin; vMax = baseMin + span; }
  if(vMax > baseMax){ vMax = baseMax; vMin = baseMax - span; }

  chartView.viewMin = vMin;
  chartView.viewMax = vMax;
}

function recordsInView(){
  const recsAsc = loadRecords().slice().reverse(); // asc
  const a = chartView.viewMin;
  const b = chartView.viewMax;
  return recsAsc.filter(r => r.ts >= a && r.ts <= b);
}

/* -----------------------------
   Hypertension bands (systolic)
   Categories (adult, common clinical cutoffs):
   - Hypotensive: < 90
   - Normal: 90–119
   - Elevated: 120–129
   - HTN Stage 1: 130–139
   - HTN Stage 2: >= 140
   (These are systolic-focused visual cues; not a diagnosis tool.)
------------------------------ */
const BANDS = [
  { name:"Hypotensive", min:-Infinity, max: 89,  fill:"rgba(140,180,255,.08)" },
  { name:"Normal",      min: 90,       max: 119, fill:"rgba(120,220,180,.07)" },
  { name:"Elevated",    min: 120,      max: 129, fill:"rgba(255,235,140,.07)" },
  { name:"HTN Stage 1", min: 130,      max: 139, fill:"rgba(255,180,120,.07)" },
  { name:"HTN Stage 2", min: 140,      max: Infinity, fill:"rgba(255,120,120,.07)" }
];

/* -----------------------------
   Drawing helpers
------------------------------ */
function xFromTs(ts, tMin, tMax, pad, W){
  const span = W - pad.l - pad.r;
  const denom = (tMax - tMin) || 1;
  const u = (ts - tMin) / denom;
  return pad.l + span * u;
}

function yTo(v, yMin, yMax, pad, H){
  const span = H - pad.t - pad.b;
  const t = (v - yMin) / ((yMax - yMin) || 1);
  return pad.t + span * (1 - t);
}

function drawSeriesTimed(ctx, recs, pick, tMin, tMax, yMin, yMax, pad, W, H, color){
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  let started = false;
  let prevTs = null;

  ctx.beginPath();
  for(const r of recs){
    const v = pick(r);
    if(v == null){
      started = false;
      prevTs = r.ts;
      continue;
    }

    // break line across multi-day gaps (keeps visual honest)
    if(prevTs != null){
      const prevDay = startOfDay(prevTs);
      const curDay  = startOfDay(r.ts);
      if(curDay - prevDay > DAY_MS) started = false;
    }

    const x = xFromTs(r.ts, tMin, tMax, pad, W);
    const y = yTo(v, yMin, yMax, pad, H);

    if(!started){
      ctx.moveTo(x,y);
      started = true;
    }else{
      ctx.lineTo(x,y);
    }
    prevTs = r.ts;
  }
  ctx.stroke();
}

/* -----------------------------
   Range label (visible window)
------------------------------ */
export function updateChartRangeLabel(){
  const a = fmtDateTime(chartView.viewMin);
  const b = fmtDateTime(chartView.viewMax);
  const el = $("chartRangeLabel");
  if(el) el.textContent = `${a}  →  ${b}`;
}

/* -----------------------------
   Render
------------------------------ */
export function renderCharts(){
  ensureBaseBounds();

  if(!chartView.viewMin || !chartView.viewMax){
    setDefaultViewMostRecent7Days();
  }else{
    clampViewToBase();
  }

  updateChartRangeLabel();

  const canvas = $("chart");
  const ctx = canvas.getContext("2d");
  const recs = recordsInView();

  ctx.clearRect(0,0,canvas.width,canvas.height);

  const W = canvas.width, H = canvas.height;
  const pad = { l:62, r:18, t:18, b:92 };
  const plotX0 = pad.l;
  const plotX1 = W - pad.r;
  const plotY0 = pad.t;
  const plotY1 = H - pad.b;

  // frame
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(235,245,255,.12)";
  ctx.fillStyle = "rgba(255,255,255,.02)";
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(0,0,W,H,22);
  else ctx.rect(0,0,W,H);
  ctx.fill();
  ctx.stroke();

  // Y bounds from visible data
  let all = [];
  if(recs.length){
    all = recs.flatMap(r => [r.sys, r.dia, r.hr]).filter(v => v != null);
  }
  let yMin = 40, yMax = 180;
  if(all.length){
    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const padV = Math.max(8, Math.round((maxV - minV) * 0.12));
    yMin = minV - padV;
    yMax = maxV + padV;
  }

  const tMin = chartView.viewMin;
  const tMax = chartView.viewMax;

  // Clip plot region
  ctx.save();
  ctx.beginPath();
  ctx.rect(plotX0, plotY0, plotX1-plotX0, plotY1-plotY0);
  ctx.clip();

  // Hypertension bands (systolic-focused) - subtle, not distracting
  for(const band of BANDS){
    const b0 = Math.max(band.min, yMin);
    const b1 = Math.min(band.max, yMax);
    if(b1 < yMin || b0 > yMax) continue;

    const yTop = yTo(b1, yMin, yMax, pad, H);
    const yBot = yTo(b0, yMin, yMax, pad, H);
    const h = Math.max(0, yBot - yTop);

    ctx.fillStyle = band.fill;
    ctx.fillRect(plotX0, yTop, plotX1-plotX0, h);
  }

  // Day bands (alternating) based on calendar days in visible window
  const firstDay = startOfDay(tMin);
  const lastDay  = startOfDay(tMax) + DAY_MS;
  let dayIndex = 0;
  for(let d = firstDay; d < lastDay; d += DAY_MS){
    const bandStart = d;
    const bandEnd = d + DAY_MS;

    const a = Math.max(bandStart, tMin);
    const b = Math.min(bandEnd,   tMax);
    if(b <= a) { dayIndex++; continue; }

    let x0 = xFromTs(a, tMin, tMax, pad, W);
    let x1 = xFromTs(b, tMin, tMax, pad, W);
    x0 = Math.max(x0, plotX0);
    x1 = Math.min(x1, plotX1);
    if(x1 <= x0) { dayIndex++; continue; }

    ctx.fillStyle = (dayIndex % 2 === 0)
      ? "rgba(255,255,255,.10)"
      : "rgba(47,120,255,.18)";
    ctx.fillRect(x0, plotY0, x1-x0, plotY1-plotY0);
    dayIndex++;
  }

  ctx.restore();

  // Grid + Y labels
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

  // X labels: show day-of-week + MM/DD at day centers that fall in view
  ctx.fillStyle = "rgba(235,245,255,.90)";
  ctx.font = "20px system-ui,Segoe UI,Roboto";
  ctx.textAlign = "center";
  const yDow = H - 44;
  const yDate = H - 22;

  for(let d = startOfDay(tMin); d <= startOfDay(tMax); d += DAY_MS){
    const center = d + (DAY_MS/2);
    if(center < tMin || center > tMax) continue;
    const x = xFromTs(center, tMin, tMax, pad, W);

    ctx.fillText(dowShortFromTs(d), x, yDow);

    ctx.fillStyle = "rgba(235,245,255,.70)";
    ctx.font = "16px system-ui,Segoe UI,Roboto";
    ctx.fillText(mmddFromTs(d), x, yDate);

    ctx.fillStyle = "rgba(235,245,255,.90)";
    ctx.font = "20px system-ui,Segoe UI,Roboto";
  }
  ctx.textAlign = "start";

  // Series
  const recsAsc = recordsInView();
  if(recsAsc.length){
    drawSeriesTimed(ctx, recsAsc, r=>r.sys, tMin, tMax, yMin, yMax, pad, W, H, "rgba(79,140,255,.98)");
    drawSeriesTimed(ctx, recsAsc, r=>r.dia, tMin, tMax, yMin, yMax, pad, W, H, "rgba(216,224,240,.88)");
    drawSeriesTimed(ctx, recsAsc, r=>r.hr , tMin, tMax, yMin, yMax, pad, W, H, "rgba(120,220,180,.92)");
  }else{
    ctx.fillStyle = "rgba(235,245,255,.46)";
    ctx.font = "18px system-ui,Segoe UI,Roboto";
    ctx.fillText("No readings in this view.", pad.l + 12, pad.t + 34);
  }

  // Legend
  const lx = pad.l + 10;
  let ly = pad.t + 26;
  ctx.font = "22px system-ui,Segoe UI,Roboto";
  ctx.textAlign = "start";

  function legend(text, color){
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly-14, 26, 8);
    ctx.fillStyle = "rgba(235,245,255,.88)";
    const spaced = text.split("").join(" ");
    ctx.fillText(spaced, lx+38, ly-6);
    ly += 32;
  }
  legend("Systolic", "rgba(79,140,255,.98)");
  legend("Diastolic", "rgba(216,224,240,.88)");
  legend("Heart Rate", "rgba(120,220,180,.92)");
}

/* -----------------------------
   Gestures: horizontal pan/zoom only
------------------------------ */
export function attachChartGestures(){
  const canvas = $("chart");

  function plotBounds(){
    const rect = canvas.getBoundingClientRect();
    const padL = 62;
    const padR = 18;
    const plotW = Math.max(1, rect.width - (padL + padR));
    return { rect, padL, padR, plotW };
  }

  function screenXToTs(screenX){
    const { rect, padL, plotW } = plotBounds();
    const xIn = clamp(screenX - rect.left - padL, 0, plotW);
    const u = xIn / plotW;
    return chartView.viewMin + u * (chartView.viewMax - chartView.viewMin);
  }

  function dist2(t1, t2){
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }
  function pinchCenterX(t1, t2){ return (t1.clientX + t2.clientX) / 2; }

  // Touch gestures
  canvas.addEventListener("touchstart", (e) => {
    if(e.touches.length === 2){
      e.preventDefault();

      const d = dist2(e.touches[0], e.touches[1]);
      const cx = pinchCenterX(e.touches[0], e.touches[1]);
      const centerTs = screenXToTs(cx);

      chartView.pinch = {
        dist: d,
        viewMin: chartView.viewMin,
        viewMax: chartView.viewMax,
        centerTs
      };
      chartView.pan = null;
      return;
    }

    if(e.touches.length === 1){
      e.preventDefault();
      chartView.pan = {
        x0: e.touches[0].clientX,
        viewMin: chartView.viewMin,
        viewMax: chartView.viewMax
      };
      chartView.pinch = null;
    }
  }, { passive:false });

  canvas.addEventListener("touchmove", (e) => {
    if(chartView.pinch && e.touches.length === 2){
      e.preventDefault();

      const p = chartView.pinch;
      const newDist = dist2(e.touches[0], e.touches[1]);
      const scale = newDist / (p.dist || 1);

      const startSpan = p.viewMax - p.viewMin;
      let newSpan = startSpan / (scale || 1);
      newSpan = clamp(newSpan, chartView.minSpan, chartView.maxSpan);

      let vMin = p.centerTs - newSpan/2;
      let vMax = p.centerTs + newSpan/2;

      chartView.viewMin = vMin;
      chartView.viewMax = vMax;
      clampViewToBase();
      renderCharts();
      return;
    }

    if(chartView.pan && e.touches.length === 1){
      e.preventDefault();

      const { plotW } = plotBounds();
      const dx = e.touches[0].clientX - chartView.pan.x0;

      const span = (chartView.pan.viewMax - chartView.pan.viewMin) || 1;
      const dt = -dx * (span / Math.max(1, plotW));

      chartView.viewMin = chartView.pan.viewMin + dt;
      chartView.viewMax = chartView.pan.viewMax + dt;
      clampViewToBase();
      renderCharts();
    }
  }, { passive:false });

  function endGestures(){
    chartView.pinch = null;
    chartView.pan = null;
  }
  canvas.addEventListener("touchend", endGestures, { passive:true });
  canvas.addEventListener("touchcancel", endGestures, { passive:true });

  // Ensure wheel/trackpad doesn't scroll the page when over chart; do nothing (no vertical zoom)
  canvas.addEventListener("wheel", (e) => {
    // Prevent panel scroll when cursor is on chart
    e.preventDefault();
  }, { passive:false });
}

/* -----------------------------
   Export visible range
------------------------------ */
export function wireChartsExportButton(){
  $("btnExportCharts").addEventListener("click", () => {
    const recsAsc = loadRecords().slice().reverse();
    const a = chartView.viewMin;
    const b = chartView.viewMax;
    const recs = recsAsc.filter(r => r.ts >= a && r.ts <= b);

    exportChartsVisibleReport(recs, { viewMin: a, viewMax: b });
  });
}

/*
Vitals Tracker (Modular) — js/chart.js (EOF)
App Version: v2.001
Notes:
- Default view = most recent 7 days of available data.
- Zoom limits: 1 day to 14 days.
- Pan is horizontal only; gestures captured by the canvas to prevent panel scroll.
- Next expected file: js/app.js (wiring panels, swipe carousel, pull-to-refresh, and module initialization)
*/
