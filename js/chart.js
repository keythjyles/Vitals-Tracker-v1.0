/*
Vitals Tracker (Modular) — js/chart.js
App Version: v2.001
Purpose:
- Renders the BP/HR time-series chart for the currently visible chart range.
- Dynamic Y-axis labels based on visible data.
- Hypertension (systolic-focused) horizontal bands (informative, not distracting).
- Provides a live visible-range label (replaces any date selector UI).
- Exports only the visible date range (handled by export module; this module provides the range + filtered records).

Latest Update (v2.001):
- Added systolic hypertension bands (Hypotensive/Normal/Elevated/Stage 1/Stage 2/Crisis).
- Added dynamic Y-axis scaling derived from records in current view.
- Added visible range label formatter (auto-updates after zoom/pan/default).
*/

import { state, DAY_MS, startOfDay } from "./state.js";
import { loadRecords } from "./storage.js";

/* ---------- Helpers ---------- */

function fmtDateShort(ts){
  return new Intl.DateTimeFormat(undefined, { month:"short", day:"2-digit", year:"numeric" }).format(new Date(ts));
}

function fmtDateTimeShort(ts){
  return new Intl.DateTimeFormat(undefined, {
    month:"2-digit", day:"2-digit", year:"numeric",
    hour:"2-digit", minute:"2-digit"
  }).format(new Date(ts));
}

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

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

/* ---------- Public API ---------- */

export function getVisibleRangeLabel(){
  const a = state.chart.viewMin;
  const b = state.chart.viewMax;

  const aD = startOfDay(a);
  const bD = startOfDay(b);

  const sameDay = aD === bD;
  if (sameDay){
    return `${fmtDateShort(a)} (visible)`;
  }
  return `${fmtDateShort(a)} – ${fmtDateShort(b)} (visible)`;
}

export function getRecordsInVisibleRange(){
  const all = loadRecords().slice().reverse(); // chronological
  const a = state.chart.viewMin;
  const b = state.chart.viewMax;
  return all.filter(r => r.ts >= a && r.ts <= b);
}

/* ---------- Bands (systolic-focused) ---------- */
/*
Bands chosen to be clinically recognizable.
These are systolic cutoffs (mmHg):
- Hypotensive: < 90
- Normal: 90–119
- Elevated: 120–129
- HTN Stage 1: 130–139
- HTN Stage 2: 140–179
- Crisis: >= 180
*/
const SYSTOLIC_BANDS = [
  { name: "Hypotensive", min: -Infinity, max: 89,  fill: "rgba(120,220,180,.06)" },
  { name: "Normal",      min: 90,        max: 119, fill: "rgba(235,245,255,.05)" },
  { name: "Elevated",    min: 120,       max: 129, fill: "rgba(47,120,255,.07)" },
  { name: "HTN Stage 1", min: 130,       max: 139, fill: "rgba(255,220,120,.07)" },
  { name: "HTN Stage 2", min: 140,       max: 179, fill: "rgba(255,150,80,.08)" },
  { name: "Crisis",      min: 180,       max: Infinity, fill: "rgba(255,80,80,.10)" }
];

function drawHypertensionBands(ctx, yMin, yMax, pad, W, H){
  const plotX0 = pad.l;
  const plotX1 = W - pad.r;
  const plotY0 = pad.t;
  const plotY1 = H - pad.b;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotX0, plotY0, plotX1-plotX0, plotY1-plotY0);
  ctx.clip();

  for (const b of SYSTOLIC_BANDS){
    const bandMin = Math.max(b.min, yMin);
    const bandMax = Math.min(b.max, yMax);
    if (bandMax < yMin || bandMin > yMax) continue;
    if (bandMax <= bandMin) continue;

    const y1 = yTo(bandMax, yMin, yMax, pad, H);
    const y0 = yTo(bandMin, yMin, yMax, pad, H);

    ctx.fillStyle = b.fill;
    ctx.fillRect(plotX0, y1, plotX1-plotX0, (y0 - y1));
  }

  ctx.restore();
}

/* ---------- Series drawing (time-based, breaks across multi-day gaps) ---------- */

function drawSeries(ctx, recs, pick, tMin, tMax, yMin, yMax, pad, W, H, color){
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  let started = false;
  let prevTs = null;

  ctx.beginPath();
  for (const r of recs){
    const v = pick(r);
    if (v == null){
      started = false;
      prevTs = r.ts;
      continue;
    }

    if (prevTs != null){
      const prevDay = startOfDay(prevTs);
      const curDay  = startOfDay(r.ts);
      if (curDay - prevDay > DAY_MS){
        started = false;
      }
    }

    const x = xFromTs(r.ts, tMin, tMax, pad, W);
    const y = yTo(v, yMin, yMax, pad, H);

    if (!started){
      ctx.moveTo(x,y);
      started = true;
    } else {
      ctx.lineTo(x,y);
    }

    prevTs = r.ts;
  }
  ctx.stroke();
}

/* ---------- Main render ---------- */

export function renderChart(canvasEl){
  const ctx = canvasEl.getContext("2d");
  const W = canvasEl.width, H = canvasEl.height;

  ctx.clearRect(0,0,W,H);

  const pad = { l:62, r:18, t:18, b:92 };
  const plotX0 = pad.l;
  const plotX1 = W - pad.r;
  const plotY0 = pad.t;
  const plotY1 = H - pad.b;

  /* subtle canvas frame */
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(235,245,255,.12)";
  ctx.fillStyle = "rgba(255,255,255,.02)";
  if (ctx.roundRect){
    ctx.beginPath();
    ctx.roundRect(0,0,W,H,22);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(0,0,W,H);
    ctx.strokeRect(0,0,W,H);
  }

  const tMin = state.chart.viewMin;
  const tMax = state.chart.viewMax;

  const recs = getRecordsInVisibleRange();

  /* dynamic Y scale based on visible records */
  let values = [];
  if (recs.length){
    for (const r of recs){
      if (r.sys != null) values.push(r.sys);
      if (r.dia != null) values.push(r.dia);
      if (r.hr  != null) values.push(r.hr);
    }
  }

  let yMin = 40, yMax = 180;
  if (values.length){
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const padV = Math.max(8, Math.round((maxV - minV) * 0.12));
    yMin = minV - padV;
    yMax = maxV + padV;
  }

  /* clip to plot and draw bands first (behind everything) */
  drawHypertensionBands(ctx, yMin, yMax, pad, W, H);

  /* horizontal grid + Y labels */
  ctx.font = "16px system-ui,Segoe UI,Roboto";
  ctx.fillStyle = "rgba(235,245,255,.60)";
  ctx.strokeStyle = "rgba(235,245,255,.10)";
  ctx.lineWidth = 1;

  const ticks = 5;
  for (let i=0;i<=ticks;i++){
    const y = pad.t + (H - pad.t - pad.b) * (i/ticks);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();

    const val = Math.round(yMax - (yMax - yMin) * (i/ticks));
    ctx.fillText(String(val), 16, y+6);
  }

  /* day tick labels along bottom, based on visible span */
  ctx.fillStyle = "rgba(235,245,255,.90)";
  ctx.font = "20px system-ui,Segoe UI,Roboto";
  ctx.textAlign = "center";

  const yDow = H - 44;
  const yDate = H - 22;

  const spanMs = (tMax - tMin) || 1;
  const daysVisible = Math.max(1, Math.ceil(spanMs / DAY_MS));

  /* label at most 7-ish points to avoid clutter */
  const labelCount = clamp(daysVisible, 2, 7);

  for (let i=0;i<labelCount;i++){
    const u = (labelCount === 1) ? 0.5 : i/(labelCount-1);
    const ts = tMin + u * spanMs;
    const dayStart = startOfDay(ts);
    const x = xFromTs(ts, tMin, tMax, pad, W);

    const dow = new Intl.DateTimeFormat(undefined, { weekday:"short" }).format(new Date(dayStart));
    const md  = new Intl.DateTimeFormat(undefined, { month:"2-digit", day:"2-digit" }).format(new Date(dayStart));

    ctx.fillStyle = "rgba(235,245,255,.90)";
    ctx.font = "20px system-ui,Segoe UI,Roboto";
    ctx.fillText(dow, x, yDow);

    ctx.fillStyle = "rgba(235,245,255,.70)";
    ctx.font = "16px system-ui,Segoe UI,Roboto";
    ctx.fillText(md, x, yDate);
  }

  ctx.textAlign = "start";

  /* series */
  if (recs.length){
    drawSeries(ctx, recs, r=>r.sys, tMin, tMax, yMin, yMax, pad, W, H, "rgba(79,140,255,.98)");
    drawSeries(ctx, recs, r=>r.dia, tMin, tMax, yMin, yMax, pad, W, H, "rgba(216,224,240,.88)");
    drawSeries(ctx, recs, r=>r.hr , tMin, tMax, yMin, yMax, pad, W, H, "rgba(120,220,180,.92)");
  } else {
    ctx.fillStyle = "rgba(235,245,255,.46)";
    ctx.font = "18px system-ui,Segoe UI,Roboto";
    ctx.fillText("No readings in this view.", pad.l + 12, pad.t + 34);
  }

  /* legend */
  const lx = pad.l + 10;
  let ly = pad.t + 26;

  ctx.font = "22px system-ui,Segoe UI,Roboto";
  function legend(label, color){
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly-14, 26, 8);
    ctx.fillStyle = "rgba(235,245,255,.88)";
    ctx.fillText(label.split("").join(" "), lx+38, ly-6);
    ly += 32;
  }
  legend("Systolic", "rgba(79,140,255,.98)");
  legend("Diastolic", "rgba(216,224,240,.88)");
  legend("Heart Rate", "rgba(120,220,180,.92)");

  /* subtle band key (small) – keep non-distracting */
  ctx.fillStyle = "rgba(235,245,255,.46)";
  ctx.font = "14px system-ui,Segoe UI,Roboto";
  ctx.fillText("Systolic bands: hypo • normal • elevated • HTN1 • HTN2 • crisis", pad.l + 10, pad.t + 124);
}

/* ---------- Report helpers for export module ---------- */

export function buildChartsExportContext(){
  const a = state.chart.viewMin;
  const b = state.chart.viewMax;

  const rangeLabel = `${fmtDateTimeShort(a)} to ${fmtDateTimeShort(b)}`;

  const reviewerNotes =
    "Reviewer notes:\n" +
    "- Readings are patient-entered at the time they were measured.\n" +
    "- Chart export includes only the visible date/time range shown on-screen.\n" +
    "- Clusters of readings may indicate symptomatic episodes; gaps often indicate stability or fewer checks.\n" +
    "- Consider BP/HR trends alongside notes/symptoms for temporal correlation.";

  return { rangeLabel, reviewerNotes };
}

/*
Vitals Tracker (Modular) — js/chart.js (EOF)
App Version: v2.001
Notes:
- Hypertension bands are systolic-focused and intentionally subtle.
- Y-axis labels dynamically scale to visible data.
- Visible range label comes from getVisibleRangeLabel().
- Next expected file: js/export.js (clipboard/share/save + PDF export flow)
*/
