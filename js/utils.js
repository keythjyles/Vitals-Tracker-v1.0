/*
Vitals Tracker (Modular) — js/utils.js
App Version: v2.001
Purpose:
- Shared utilities: formatting, parsing, escaping, and small DOM helpers.
- Used by UI panels and export/report logic.
- Keeps output consistent with v1 export formatting style.

Latest Update (v2.001):
- Initial utilities module created for:
  - Date/time formatting
  - ISO week helpers
  - Date input parsing
  - HTML escaping
*/

import { DAY_MS } from "./state.js";

export const $ = (id) => document.getElementById(id);

export function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function fmtDateTime(ts){
  const d = new Date(ts);
  return new Intl.DateTimeFormat(undefined, {
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit"
  }).format(d);
}

export function fmtTimeCommaDate(ts){
  const d = new Date(ts);
  const time = new Intl.DateTimeFormat(undefined, {
    hour:"2-digit", minute:"2-digit", second:"2-digit"
  }).format(d);
  const date = new Intl.DateTimeFormat(undefined, {
    month:"2-digit", day:"2-digit", year:"numeric"
  }).format(d);
  return `${time}, ${date}`;
}

export function dowShortFromTs(ts){
  return new Intl.DateTimeFormat(undefined, { weekday:"short" }).format(new Date(ts));
}

export function mmddFromTs(ts){
  return new Intl.DateTimeFormat(undefined, { month:"2-digit", day:"2-digit" }).format(new Date(ts));
}

export function parseDateField(v){
  if(!v) return null;
  const [y,m,d] = v.split("-").map(Number);
  if(!y || !m || !d) return null;
  return new Date(y, m-1, d, 0, 0, 0, 0).getTime();
}

export function clampEndOfDay(ts){
  const d = new Date(ts);
  d.setHours(23,59,59,999);
  return d.getTime();
}

/* ISO week helpers (kept for potential future selector or labels) */
export function getISOWeekInputValueFromDate(d){
  const date = new Date(d.getTime());
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const weekYear = date.getFullYear();

  const week1 = new Date(weekYear, 0, 4);
  week1.setHours(0,0,0,0);
  const week1Thursday = new Date(week1.getTime());
  week1Thursday.setDate(week1Thursday.getDate() + 3 - ((week1Thursday.getDay() + 6) % 7));

  const diffDays = Math.round((date - week1Thursday) / DAY_MS);
  const weekNo = 1 + Math.floor(diffDays / 7);

  return `${weekYear}-W${String(weekNo).padStart(2,"0")}`;
}

/*
Vitals Tracker (Modular) — js/utils.js (EOF)
App Version: v2.001
Notes:
- Utilities are intentionally small and stable to avoid drift.
- Next expected file: js/gestures.js (carousel swipe + pull-to-refresh + chart horizontal pan/zoom)
*/
