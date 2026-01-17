/*
Vitals Tracker (Modular) — js/state.js
App Version: v2.001
Purpose:
- Centralized app state for navigation, filters, edit context, and charts.
- Keeps UI modules and gesture modules loosely coupled.
- Defines chart view constraints (horizontal-only pan/zoom).

Latest Update (v2.001):
- Introduced unified state object for: active panel, add/edit mode, log filters.
- Chart view model supports horizontal-only zoom/pan with:
  - default span 7 days
  - min span 1 day
  - max span 14 days
  - view range computed from baseMin/baseMax
*/

export const DAY_MS = 24 * 60 * 60 * 1000;

export const PANELS = ["home", "log", "charts"];

/* Global app state */
export const state = {
  /* navigation */
  activeIndex: 0,
  isAddOpen: false,
  returnPanel: "home",

  /* add/edit */
  editTs: null,

  /* log filters */
  log: {
    search: "",
    fromDate: "",
    toDate: ""
  },

  /* chart view (horizontal only) */
  chart: {
    /* base = overall range we allow panning within */
    baseMin: 0,
    baseMax: 0,

    /* visible range */
    viewMin: 0,
    viewMax: 0,

    /* zoom constraints */
    minSpan: 1 * DAY_MS,   // 1 day
    maxSpan: 14 * DAY_MS,  // 14 days

    /* default span */
    defaultSpan: 7 * DAY_MS,

    /* gesture tracking */
    pinch: null,
    pan: null
  },

  /* export scratch */
  export: {
    printToken: null
  }
};

export function clamp(n, a, b){
  return Math.max(a, Math.min(b, n));
}

export function startOfDay(ts){
  const d = new Date(ts);
  d.setHours(0,0,0,0);
  return d.getTime();
}

export function endOfDay(ts){
  const d = new Date(ts);
  d.setHours(23,59,59,999);
  return d.getTime();
}

/* Set chart base to a window that can hold up to 14 days and defaults to last 7 days */
export function setChartBaseToMostRecent(records){
  const now = Date.now();
  const latestTs = records && records.length ? Math.max(...records.map(r => r.ts)) : now;

  const baseMax = endOfDay(latestTs);
  const baseMin = baseMax - (state.chart.maxSpan) + 1;

  state.chart.baseMin = baseMin;
  state.chart.baseMax = baseMax;

  /* default visible = last 7 days ending at baseMax */
  const span = state.chart.defaultSpan;
  state.chart.viewMax = baseMax;
  state.chart.viewMin = baseMax - span + 1;

  clampChartViewToBase();
}

export function clampChartViewToBase(){
  const c = state.chart;

  const baseMin = c.baseMin;
  const baseMax = c.baseMax;

  let vMin = c.viewMin;
  let vMax = c.viewMax;

  /* normalize span */
  let span = vMax - vMin;
  span = Math.max(c.minSpan, Math.min(span, c.maxSpan));

  const mid = (vMin + vMax) / 2;
  vMin = mid - span/2;
  vMax = mid + span/2;

  if (vMin < baseMin){
    vMin = baseMin;
    vMax = baseMin + span;
  }
  if (vMax > baseMax){
    vMax = baseMax;
    vMin = baseMax - span;
  }

  c.viewMin = vMin;
  c.viewMax = vMax;
}

/*
Vitals Tracker (Modular) — js/state.js (EOF)
App Version: v2.001
Notes:
- Chart zoom/pan is constrained horizontally only.
- Default chart view = most recent 7 days, pan within 14-day base.
- Next expected file: js/gestures.js
*/
