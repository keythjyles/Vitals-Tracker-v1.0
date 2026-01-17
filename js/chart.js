/*
Vitals Tracker (Modular) — js/chart.js
App Version: v2.001

Purpose:
- Owns the Charts screen rendering and chart window state:
  - Default view: most recent 7 days (if data exists), otherwise last 7 days ending “now”.
  - Zoom: min 1 day, max 14 days.
  - Pan: horizontal only, constrained to data/time base.
  - Dynamic Y-axis labels based on visible data.
  - Hypertension bands (systolic-focused) as unobtrusive but obvious context.

Key Requirements Implemented:
- Remove week selector UI (v1 concept). Charts always show a rolling time window.
- Visible range label updates automatically (used by UI and exports).
- Export must include only visible date range (ui.js uses getVisibleRecords()).
- Chart touch handling is delegated to gestures.js:
  - Chart owns the gesture area (prevents panel scroll while interacting with the chart).

Latest Update (v2.001):
- First modular chart implementation with:
  - Rolling range model (viewMin/viewMax).
  - Hypertension bands (systolic categories).
  - Alternating day bands for orientation.
*/

import { loadRecords } from "./state.js";
import { clamp, startOfDay, fmtShortDate, fmtRangeLabel, DAY_MS } from "./utils.js";
import { chartView, setChartViewWindow } from "./gestures.js"; // gestures owns pan/zoom math

let canvas = null;
let ctx = null;

// Internal render options
const PAD = { l:62, r:18, t:18, b:92 };

const SERIES = {
  sys: { label:"Systolic", color:"rgba(79,140,255,.98)" },
  dia: { label:"Diastolic", color:"rgba(216,224,240,.88)" },
  hr:  { label:"Heart Rate", color:"rgba(120,220,180,.92)" }
};

// Hypertension “bands” (systolic-focused, adult general)
const BP_BANDS = [
  { name:"Hypotensive", min:-Infinity, max:90,    fill:"rgba(120,220,180,.10)" },
  { name:"Normal",      min:90,       max:120,   fill:"rgba(235,245,255,.06)" },
  { name:"Elevated",    min:120,      max:130,   fill:"rgba(255,220,120,.10)" },
  { name:"HTN Stage 1", min:130,      max:140,   fill:"rgba(255,170,90,.12)" },
  { name:"HTN Stage 2", min:140,      max:180,   fill:"rgba(255,110,110,.14)" },
  { name:"Crisis",      min:180,      max: Infinity, fill:"rgba(255,60,60,.16)" }
];

function xFromTs(ts, tMin, tMax, W){
  const span = (W - PAD.l - PAD.r);
  const denom = (tMax - tMin) || 1;
  const u = (ts - tMin) / denom;
  return PAD.l + span * u;
}

function yFromVal(v, yMin, yMax, H){
  const span = (H - PAD.t - PAD.b);
  const t = (v - yMin) / (yMax - yMin || 1);
  return PAD.t + span * (1 - t);
}

function computeYDomain(records){
  // dynamic based on visible data (sys/dia/hr)
  const vals = [];
  for(const r of records){
    if(r.sys != null) vals.push(r.sys);
    if(r.dia != null) vals.push(r.dia);
    if(r.hr  != null) vals.push(r.hr);
  }
  if(!vals.length) return { yMin:40, yMax:180 };

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const padV = Math.max(8, Math.round((maxV - minV) * 0.12));
  return { yMin: (minV - padV), yMax: (maxV + padV) };
}

function drawFrame(W,H){
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(235,245,255,.12)";
  ctx.fillStyle = "rgba(255,255,255,.02)";
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(0,0,W,H,22);
  else ctx.rect(0,0,W,H);
  ctx.fill();
  ctx.stroke();
}

function clipPlot(W,H){
  const x0 = PAD.l, y0 = PAD.t;
  const w = (W - PAD.l - PAD.r);
  const h = (H - PAD.t - PAD.b);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0,y0,w,h);
  ctx.clip();
  return { x0,y0,w,h };
}

function restoreClip(){
  ctx.restore();
}

function drawAlternatingDayBands(tMin, tMax, W, H){
  const { x0,y0,w,h } = clipPlot(W,H);

  const firstDay = startOfDay(tMin);
  // include one day prior to ensure full coverage at the left edge
  const start = firstDay - DAY_MS;

  for(let i=0;i<32;i++){
    const dayStart = start + i*DAY_MS;
    const dayEnd = dayStart + DAY_MS;

    const a = Math.max(dayStart, tMin);
    const b = Math.min(dayEnd, tMax);
    if(b <= a) continue;

    let px0 = xFromTs(a, tMin, tMax, W);
    let px1 = xFromTs(b, tMin, tMax, W);
    px0 = Math.max(px0, x0);
    px1 = Math.min(px1, x0 + w);
    if(px1 <= px0) continue;

    ctx.fillStyle = (i % 2 === 0)
      ? "rgba(255,255,255,.06)"
      : "rgba(47,120,255,.10)";

    ctx.fillRect(px0, y0, px1-px0, h);
  }

  restoreClip();
}

function drawHypertensionBands(yMin, yMax, W, H){
  // horizontal bands across plot based on systolic cut points
  const { x0,y0,w,h } = clipPlot(W,H);

  for(const band of BP_BANDS){
    const topVal = band.max;
    const botVal = band.min;

    // map to y, clamp to plot
    const yTop = yFromVal(topVal, yMin, yMax, H);
    const yBot = yFromVal(botVal, yMin, yMax, H);

    const yy0 = clamp(Math.min(yTop, yBot), y0, y0 + h);
    const yy1 = clamp(Math.max(yTop, yBot), y0, y0 + h);

    if(yy1 <= yy0) continue;

    ctx.fillStyle = band.fill;
    ctx.fillRect(x0, yy0, w, yy1-yy0);
  }

  // label a few key band names at left (subtle, not distracting)
  ctx.font = "13px system-ui,Segoe UI,Roboto";
  ctx.fillStyle = "rgba(235,245,255,.42)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const labelBands = ["Normal","Elevated","HTN Stage 1","HTN Stage 2"];
  for(const name of labelBands){
    const b = BP_BANDS.find(x=>x.name===name);
    if(!b) continue;
    const mid = (Math.max(b.min, yMin) + Math.min(b.max, yMax)) / 2;
    const y = yFromVal(mid, yMin, yMax, H);
    if(y < y0 || y > y0 + h) continue;
    ctx.fillText(name, x0 + 8, y);
  }

  restoreClip();
}

function drawYAxis(yMin, yMax, W, H){
  ctx.font = "16px system-ui,Segoe UI,Roboto";
  ctx.fillStyle = "rgba(235,245,255,.60)";
  ctx.strokeStyle = "rgba(235,245,255,.10)";
  ctx.lineWidth = 1;

  const ticks = 5;
  for(let i=0;i<=ticks;i++){
    const y = PAD.t + (H - PAD.t - PAD.b) * (i/ticks);
    ctx.beginPath();
    ctx.moveTo(PAD.l, y);
    ctx.lineTo(W - PAD.r, y);
    ctx.stroke();

    const val = Math.round(yMax - (yMax-yMin)*(i/ticks));
    ctx.fillText(String(val), 16, y+6);
  }
}

function drawXAxisLabels(tMin, tMax, W, H){
  // label days (and times if zoomed tight)
  const rangeMs = (tMax - tMin);
  const showTime = rangeMs <= (18 * 60 * 60 * 1000);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const yDow = H - 44;
  const yDate = H - 22;

  // label at most 7 day centers for clarity
  const firstDay = startOfDay(tMin);
  for(let i=0;i<16;i++){
    const dayStart = firstDay + i*DAY_MS;
    const dayCenter = dayStart + DAY_MS/2;
    if(dayCenter < tMin) continue;
    if(dayCenter > tMax) break;

    const x = xFromTs(dayCenter, tMin, tMax, W);
    const d = new Date(dayStart);
    const dow = d.toLocaleDateString(undefined, { weekday:"short" });
    const md = d.toLocaleDateString(undefined, { month:"2-digit", day:"2-digit" });

    ctx.fillStyle = "rgba(235,245,255,.90)";
    ctx.font = "20px system-ui,Segoe UI,Roboto";
    ctx.fillText(dow, x, yDow);

    ctx.fillStyle = "rgba(235,245,255,.70)";
    ctx.font = "16px system-ui,Segoe UI,Roboto";
    ctx.fillText(md, x, yDate);
  }

  if(showTime){
    ctx.fillStyle = "rgba(235,245,255,.56)";
    ctx.font = "14px system-ui,Segoe UI,Roboto";
    ctx.textAlign = "left";

    const labelCount = 4;
    for(let i=0;i<labelCount;i++){
      const ts = tMin + rangeMs * (i/(labelCount-1 || 1));
      const x = xFromTs(ts, tMin, tMax, W);

      const d = new Date(ts);
      const lab = d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });

      const maxX = W - PAD.r - 2;
      const minX = PAD.l + 2;
      let tx = x - 18;
      if(tx < minX) tx = minX;
      if(tx > maxX - 54) tx = maxX - 54;

      ctx.fillText(lab, tx, H - 66);
    }
  }

  ctx.textAlign = "start";
}

function drawSeries(records, pick, tMin, tMax, yMin, yMax, W, H, color){
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  let started = false;
  let prevTs = null;

  ctx.beginPath();
  for(const r of records){
    const v = pick(r);
    if(v == null){ started = false; prevTs = r.ts; continue; }

    // break if gap > 1 day to avoid implying continuous sampling
    if(prevTs != null){
      const prevDay = startOfDay(prevTs);
      const curDay  = startOfDay(r.ts);
      if(curDay - prevDay > DAY_MS) started = false;
    }

    const x = xFromTs(r.ts, tMin, tMax, W);
    const y = yFromVal(v, yMin, yMax, H);

    if(!started){ ctx.moveTo(x,y); started = true; }
    else ctx.lineTo(x,y);

    prevTs = r.ts;
  }
  ctx.stroke();
}

function drawLegend(W,H){
  const lx = PAD.l + 10;
  let ly = PAD.t + 26;

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

  legend("Systolic", SERIES.sys.color);
  legend("Diastolic", SERIES.dia.color);
  legend("Heart Rate", SERIES.hr.color);
}

export function initChart(canvasId="chart"){
  canvas = document.getElementById(canvasId);
  if(!canvas) throw new Error("chart.js: canvas not found");
  ctx = canvas.getContext("2d");

  // ensure we have a default window immediately
  ensureDefaultWindow();
}

export function ensureDefaultWindow(){
  const recs = loadRecords().slice().reverse();
  const now = Date.now();

  // default is most recent 7 days; anchor to last record if present
  const anchor = recs.length ? recs[recs.length-1].ts : now;
  const end = anchor;
  const start = end - (7*DAY_MS);

  setChartViewWindow({ viewMin:start, viewMax:end, clampToData:true });
}

export function setDefaultToMostRecent7Days(){
  ensureDefaultWindow();
}

export function getVisibleRangeLabel(){
  const a = chartView.viewMin;
  const b = chartView.viewMax;
  return fmtRangeLabel(a,b);
}

export function getVisibleRecords(){
  const all = loadRecords().slice().reverse();
  const a = chartView.viewMin;
  const b = chartView.viewMax;
  return all.filter(r => r.ts >= a && r.ts <= b);
}

export function renderChart(){
  if(!canvas || !ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  const tMin = chartView.viewMin;
  const tMax = chartView.viewMax;

  const recs = getVisibleRecords();

  ctx.clearRect(0,0,W,H);

  drawFrame(W,H);

  // orientation bands (days)
  drawAlternatingDayBands(tMin, tMax, W, H);

  const { yMin, yMax } = computeYDomain(recs);

  // clinical context bands (systolic-focused)
  drawHypertensionBands(yMin, yMax, W, H);

  // y-axis grid + labels
  drawYAxis(yMin, yMax, W, H);

  // series
  if(recs.length){
    // plot clip
    const clip = clipPlot(W,H);
    drawSeries(recs, r=>r.sys, tMin, tMax, yMin, yMax, W, H, SERIES.sys.color);
    drawSeries(recs, r=>r.dia, tMin, tMax, yMin, yMax, W, H, SERIES.dia.color);
    drawSeries(recs, r=>r.hr,  tMin, tMax, yMin, yMax, W, H, SERIES.hr.color);
    restoreClip();
  }else{
    ctx.fillStyle = "rgba(235,245,255,.46)";
    ctx.font = "18px system-ui,Segoe UI,Roboto";
    ctx.fillText("No readings in this view.", PAD.l + 12, PAD.t + 34);
  }

  // x labels
  drawXAxisLabels(tMin, tMax, W, H);

  // legend
  drawLegend(W,H);
}

export function onChartResized(){
  // simply re-render; gestures will already have clamped window
  renderChart();
}

/*
Vitals Tracker (Modular) — js/chart.js (EOF)
App Version: v2.001
Integration:
- ui.js should:
  - call initChart("chart")
  - call renderChart() whenever entering Charts panel and after pan/zoom callbacks
  - display getVisibleRangeLabel() in place of the old week selector
  - use getVisibleRecords() for “Export (Charts)” so only visible date range is exported
Clinical visuals:
- Hypertension bands are a background context layer; they do not replace clinical interpretation.
- Categories are systolic-oriented and intended as quick visual cues.
*/
