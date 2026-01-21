/* 
Vitals Tracker — BOF (Prime Pass Header)

NEXT FILE TO FETCH (PP-20260121-001): js/storage.js


Beacon Drift Control Note (for this Prime Pass run only; ends at the next divider)
- Beacon, focus on THIS pasted file and THIS chat message only.
- Follow only the instructions/prompts inside THIS paste and THIS message.
- Do NOT use or “blend” prior chat messages for decisions in this step.
End Beacon Drift Control Note
------------------------------------------------------------

File: js/utils.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 5 of 23
Prev (this run): css/app.css (manifest skipped)
Next (this run): js/storage.js
FileEditId: 1
Edited: 2026-01-21

Role / Ownership
- Shared utilities: formatting, parsing, escaping, and small DOM helpers
- Used by UI modules and export/report logic

Implemented (facts only)
- DOM helper: $(id)
- Safe HTML escaping via escapeHtml()
- Consistent timestamp formatting helpers (fmtDateTime, fmtTimeCommaDate, dowShortFromTs, mmddFromTs)
- Date field parsing (parseDateField) and end-of-day clamp (clampEndOfDay)
- ISO week helper (getISOWeekInputValueFromDate)

Drift locks (do not change without intentional decision)
- Keep output formatting stable (export/report text depends on it)
- Keep functions small and dependency-light

Developer prompts (for future work; not instructions)
- Prefer adding new helpers here only when used by 2+ modules
- Keep locale-sensitive formatting consistent across exports and UI
------------------------------------------------------------ */

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
Vitals Tracker — EOF (Prime Pass Footer)
File: js/utils.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 5 of 23
Prev (this run): css/app.css (manifest skipped)
Next (this run): js/storage.js
FileEditId: 1
Edited: 2026-01-21

Implementation Fetch Aid (ONE-TIME ONLY; NOT A MASTER ORDER)
Meaning:
- This block exists ONLY to tell the human operator which file to paste NEXT during this one run.
- This is NOT an instruction set, NOT a schema, and NOT an ordering guarantee.
- Future AI/editors MUST IGNORE this block once PP-20260121-001 is complete.

Current file (pasted/edited in this step): js/utils.js
Next file to fetch/paste (this run): js/storage.js

Acceptance checks
- App still boots; no import path changes introduced.
- fmtDateTime output remains stable for report exports.
*/ 
