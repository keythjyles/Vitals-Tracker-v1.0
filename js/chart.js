/*
Vitals Tracker (Modular) — js/chart.js
App Version: v2.001
Purpose:
- Render the Charts canvas with:
  - Default view = most recent 7 days.
  - Zoom: 1 day min, 14 days max.
  - Pan horizontally only (gestures owned by chart).
  - Dynamic Y-axis labels based on visible data (not fixed).
  - Hypertension bands (systolic-focused): Hypotensive, Normal, Elevated, HTN Stage 1, HTN Stage 2.
- Remove the week selector UI (handled in index UI); replace with a visible range label that updates
  on default/zoom/pan.
- Export on Charts exports ONLY visible date range of the chart (handled by export module but uses chartView).

Latest Update (v2.001):
- Initial modular chart renderer created.
- Implements dynamic y scaling, alternating day bands, and systolic hypertension bands (subtle but obvious).
- Provides getVisibleRangeLabel() for UI label replacement.
*/

import { loadRecords } from "./storage.js";
import { chartView, DAY_MS, startOfDay, clampViewToBase, applyDefaultChartWindowIfNeeded } from "./state.js";
import { dowShortFromTs, mmddFromTs, fmtDateTime, fmtShortDate, clamp } from "./utils.js";

/* ---------------- Hypertension bands (systolic-focused) ----------------
   These are visual cues, not diagnosis. Cutoffs aligned with common clinical categories.
   Systolic ranges (mmHg):
   - Hypotensive: < 90
   - Normal: 90–119
   - Elevated: 120–129
   - HTN Stage 1: 130–139
   - HTN Stage 2: >= 140
*/
const SYSTOLIC_BANDS = [
  { name:"Hypotensive", min:-Infinity, max: 89,  fill:"rgba(120,220,180,.10)" },
  { name:"Normal",      min:  90,      max:119,  fill:"rgba(235,245,255,.08)" },
  { name:"Elevated",    min: 120,      max:129,  fill:"rgba(255,210,120,.10)" },
  { name:"HTN Stage 1", min: 130,      max:139,  fill:"rgba(255,160,120,.12)" },
  { name:"HTN Stage 2", min: 140,      max:Infinity, fill:"rgba(255,90,90,.12)" }
];

function recordsInView(){
  const all = loadRecords().slice().reverse(); // oldest -> newest for drawing continuity
  const a = chartView.viewMin;
  const b = chartView.viewMax;
  return all.filter(r => r.ts >= a && r.ts <= b);
}

function xFromTs(ts, tMin, tMax, pad, W){
  const span = W - pad.l - pad.r;
  const denom = (tMax - tMin) || 1;
  const u = (ts - tMin) / denom;
  return pad.l + span * u;
}

function yTo(v, yMin, yMax, pad, H){
  const span = H - pad.t - pad.b;
  const t = (v - yMin) / (yMax - yMin || 1);
  return pad.t + span * (1 - t);
}

function drawSeriesTimedWithDayGaps(ctx, recs, pick, tMin, tMax, yMin, yMax, pad, W, H, color){
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

    if(prevTs != null){
      const prevDay = startOfDay(prevTs);
      const curDay  = startOfDay(r.ts);
      if(curDay - prevDay > DAY_MS) started = false; // gap breaks line
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

function computeDynamicY(recs){
  // Use only visible data (sys/dia/hr). Dynamic ticks should reflect what reviewer sees.
  const all = recs.flatMap(r => [r.sys, r.dia, r.hr]).filter(v => v != null);
  if(all.length === 0) return { yMin:40, yMax:180 };

  const minV = Math.min(...all);
  const maxV = Math.max(...all);

  const padV = Math.max(8, Math.round((maxV - minV) * 0.12));
  let yMin = minV - padV;
  let yMax = maxV + padV;

  // Keep a sane floor/ceiling in case of sparse data.
  yMin = Math.floor(yMin / 5) * 5;
  yMax = Math.ceil(yMax / 5) * 5;

  if(yMax - yMin < 20){
    yMin -= 10;
    yMax += 10;
  }

  return { yMin, yMax };
}

/* Visible range label for replacement of week selector */
export function getVisibleRangeLabel(){
  const a = new Date(chartView.viewMin);
  const b = new Date(chartView.viewMax);
  return `${fmtShortDate(a)} to ${fmtShortDate(b)}`;
}

/* Sets base bounds to allow pan across all data, while view clamps to that base.
   Base is: from earliest record day start to latest record day end (or last 14 days fallback).
*/
export function updateChartBaseToData(){
  const recs = loadRecords();
  if(recs.length === 0){
    const now = Date.now();
    const end = now;
    const start = now - 14*DAY_MS;
    chartView.baseMin = startOfDay(start);
    chartView.baseMax = startOfDay(end) + DAY_MS - 1;
    return;
  }
  const newest = recs[0].ts;
  const oldest = recs[recs.length-1].ts;
  chartView.baseMin = startOfDay(oldest);
  chartView.baseMax = startOfDay(newest) + DAY_MS - 1;
}

/* Default view: most recent 7 days (or less if dataset smaller) */
export function setDefaultRecent7DaysView(){
  updateChartBaseToData();
  const end = chartView.baseMax;
  const start = end - (7*DAY_MS) + 1;
  chartView.viewMin = Math.max(chartView.baseMin, start);
  chartView.viewMax = end;
  clampViewToBase();
}

export function renderChart(canvasEl){
  // Ensure base/view exist and comply with your v2 rules.
  updateChartBaseToData();
  applyDefaultChartWindowIfNeeded(); // if view not set, sets recent 7 days
  clampViewToBase();

  const ctx = canvasEl.getContext("2d");
  const W = canvasEl.width;
  const H = canvasEl.height;

  const pad = { l:62, r:18, t:18, b:92 };
  const plotX0 = pad.l;
  const plotX1 = W - pad.r;
  const plotY0 = pad.t;
  const plotY1 = H - pad.b;

  const tMin = chartView.viewMin;
  const tMax = chartView.viewMax;

  const recs = recordsInView();
  const { yMin, yMax } = computeDynamicY(recs);

  ctx.clearRect(0,0,W,H);

  // Panel background + border
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(235,245,255,.12)";
  ctx.fillStyle = "rgba(255,255,255,.02)";
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(0,0,W,H,22);
  else ctx.rect(0,0,W,H);
  ctx.fill();
  ctx.stroke();

  // Clip plot region
  ctx.save();
  ctx.beginPath();
  ctx.rect(plotX0, plotY0, plotX1-plotX0, plotY1-plotY0);
  ctx.clip();

  // Alternating day bands in visible window (immediately obvious, not distracting)
  const firstDay = startOfDay(tMin);
  const lastDay = startOfDay(tMax);
  const dayCount = Math.floor((lastDay - firstDay) / DAY_MS) + 1;

  for(let i=0;i<dayCount;i++){
    const bandStart = firstDay + i*DAY_MS;
    const bandEnd = bandStart + DAY_MS;

    const a = Math.max(bandStart, tMin);
    const b = Math.min(bandEnd,   tMax);
    if(b <= a) continue;

    let x0 = xFromTs(a, tMin, tMax, pad, W);
    let x1 = xFromTs(b, tMin, tMax, pad, W);
    x0 = Math.max(x0, plotX0);
    x1 = Math.min(x1, plotX1);
    if(x1 <= x0) continue;

    ctx.fillStyle = (i % 2 === 0) ? "rgba(255,255,255,.12)" : "rgba(47,120,255,.22)";
    ctx.fillRect(x0, plotY0, (x1-x0), (plotY1-plotY0));
  }

  // Hypertension bands (systolic-focused) drawn as horizontal ranges across plot
  // Keep subtle but clear: low-opacity fills.
  for(const band of SYSTOLIC_BANDS){
    const yA = band.max === Infinity ? yMin : band.max;
    const yB = band.min === -Infinity ? yMin : band.min;

    // Convert to y pixels; because yTo expects within yMin..yMax, clamp band edges.
    const topVal = clamp(band.max === Infinity ? yMax : band.max, yMin, yMax);
    const botVal = clamp(band.min === -Infinity ? yMin : band.min, yMin, yMax);

    // If band lies outside visible y range, skip.
    if(topVal < yMin && botVal < yMin) continue;
    if(topVal > yMax && botVal > yMax) continue;

    const yTop = yTo(topVal, yMin, yMax, pad, H);
    const yBot = yTo(botVal, yMin, yMax, pad, H);

    const y0 = Math.min(yTop, yBot);
    const y1 = Math.max(yTop, yBot);

    ctx.fillStyle = band.fill;
    ctx.fillRect(plotX0, y0, (plotX1-plotX0), (y1-y0));
  }

  ctx.restore();

  // Grid + Y-axis labels (dynamic)
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

  // X-axis day labels
  ctx.fillStyle = "rgba(235,245,255,.90)";
  ctx.font = "20px system-ui,Segoe UI,Roboto";
  ctx.textAlign = "center";

  const yDow = H - 44;
  const yDate = H - 22;

  // Label days visible; use noon for center.
  const labelFirst = startOfDay(tMin);
  const labelLast  = startOfDay(tMax);
  const labelDays  = Math.floor((labelLast - labelFirst)/DAY_MS) + 1;

  for(let i=0;i<labelDays;i++){
    const dayStart = labelFirst + i*DAY_MS;
    const dayCenter = dayStart + (DAY_MS/2);
    if(dayCenter < tMin || dayCenter > tMax) continue;

    const x = xFromTs(dayCenter, tMin, tMax, pad, W);
    ctx.fillText(dowShortFromTs(dayStart), x, yDow);

    ctx.fillStyle = "rgba(235,245,255,.70)";
    ctx.font = "16px system-ui,Segoe UI,Roboto";
    ctx.fillText(mmddFromTs(dayStart), x, yDate);

    ctx.fillStyle = "rgba(235,245,255,.90)";
    ctx.font = "20px system-ui,Segoe UI,Roboto";
  }

  ctx.textAlign = "start";

  // Series
  if(recs.length){
    drawSeriesTimedWithDayGaps(ctx, recs, r=>r.sys, tMin, tMax, yMin, yMax, pad, W, H, "rgba(79,140,255,.98)");
    drawSeriesTimedWithDayGaps(ctx, recs, r=>r.dia, tMin, tMax, yMin, yMax, pad, W, H, "rgba(216,224,240,.88)");
    drawSeriesTimedWithDayGaps(ctx, recs, r=>r.hr,  tMin, tMax, yMin, yMax, pad, W, H, "rgba(120,220,180,.92)");
  }else{
    ctx.fillStyle = "rgba(235,245,255,.46)";
    ctx.font = "18px system-ui,Segoe UI,Roboto";
    ctx.fillText("No readings in this view.", pad.l + 12, pad.t + 34);
  }

  // Legend
  const lx = pad.l + 10;
  let ly = pad.t + 26;

  ctx.font = "22px system-ui,Segoe UI,Roboto";
  ctx.fillStyle = "rgba(235,245,255,.88)";

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

/*
Vitals Tracker (Modular) — js/chart.js (EOF)
App Version: v2.001
Notes:
- Hypertension bands are systolic-focused and rendered across the plot as low-opacity horizontal zones.
- Y-axis labels are computed from visible data only (dynamic).
- Default view + pan/zoom behavior depends on state.js + gestures.js.
- Next expected file: js/export.js (exports only visible range; adds reviewer-focused capture method + significance; PDF export without generic popups)
*/
