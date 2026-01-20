/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Log Row Severity Colors (P0-L2)
Pass order: File 8 of 9 (P0)
Prev file: js/chart.js (File 7 of 9)
Next file: js/add.js (File 9 of 9)

v2.026a — Change Log (THIS FILE ONLY)
1) Renders “Edit” as a blue hyperlink-style text link (visual only; no wiring here).
2) Colors BP and HR values when they fall into defined danger/severity zones.
   - BP uses systolic bands aligned with chart ledger colors.
   - HR uses common clinical thresholds (constants below; easy to adjust later).
3) Guarantees Log re-renders when Log panel becomes active.
4) Defensive normalization for record field names (ts/sys/dia/hr/notes).
5) Lightweight DOM-safe styling fallback if CSS classes are missing (does not override if present).
6) No swipe logic here. No edit/delete wiring here.

ANTI-DRIFT: No swipe logic. No add/edit/delete orchestration in this file.
*/

(function () {
  "use strict";

  const listEl = document.getElementById("logList");
  const emptyEl = document.getElementById("logEmpty");
  const loadingEl = document.getElementById("logLoading");

  if (!listEl) return;

  // ===== Severity color constants (match chart ledger palette) =====
  const COLORS = Object.freeze({
    blue:      "rgba(45,115,205,1)",   // Normal
    purple:    "rgba(125,80,180,1)",   // Elevated
    yellow:    "rgba(245,200,55,1)",   // Stage 1 / caution
    red:       "rgba(210,70,80,1)",    // Stage 2 / high
    darkRed:   "rgba(135,25,35,1)",    // Crisis / extreme
    linkBlue:  "#4aa3ff"               // Edit hyperlink color
  });

  // BP severity is based on SYSTOLIC to mirror the chart bands/ledger.
  function bpSeverityColor(sys) {
    if (typeof sys !== "number") return null;
    if (sys >= 180) return COLORS.darkRed;
    if (sys >= 140) return COLORS.red;
    if (sys >= 130) return COLORS.yellow;
    if (sys >= 120) return COLORS.purple;
    return COLORS.blue;
  }

  /*
    HR thresholds (adjustable):
    - >=140: dark red (very high)
    - 120–139: red (high)
    - 100–119: yellow (elevated)
    - 50–59: purple (low)
    - <50: blue (very low)  [kept blue to remain consistent with 5-color set]
    - 60–99: no color (normal)
  */
  function hrSeverityColor(hr) {
    if (typeof hr !== "number") return null;
    if (hr >= 140) return COLORS.darkRed;
    if (hr >= 120) return COLORS.red;
    if (hr >= 100) return COLORS.yellow;
    if (hr < 50) return COLORS.blue;
    if (hr < 60) return COLORS.purple;
    return null; // normal
  }

  function clear() {
    listEl.innerHTML = "";
  }

  function clampStr(s, max) {
    try {
      if (s == null) return "";
      const t = String(s);
      if (!max) return t;
      return t.length > max ? (t.slice(0, max - 1) + "…") : t;
    } catch (_) {
      return "";
    }
  }

  function parseTs(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) {
      return (v > 1e12) ? v : Math.round(v * 1000);
    }
    if (typeof v === "string") {
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function normalize(r) {
    const ts =
      parseTs(r?.ts) ??
      parseTs(r?.time) ??
      parseTs(r?.timestamp) ??
      parseTs(r?.date) ??
      parseTs(r?.createdAt) ??
      parseTs(r?.created_at) ??
      parseTs(r?.iso);

    const sys =
      num(r?.sys) ??
      num(r?.systolic) ??
      num(r?.sbp) ??
      num(r?.SBP) ??
      num(r?.bp?.sys) ??
      num(r?.bp?.systolic);

    const dia =
      num(r?.dia) ??
      num(r?.diastolic) ??
      num(r?.dbp) ??
      num(r?.DBP) ??
      num(r?.bp?.dia) ??
      num(r?.bp?.diastolic);

    const hr =
      num(r?.hr) ??
      num(r?.heartRate) ??
      num(r?.pulse) ??
      num(r?.HR) ??
      num(r?.vitals?.hr) ??
      num(r?.vitals?.pulse);

    const notes = (r?.notes ?? r?.note ?? r?.comment ?? r?.memo ?? "");

    // Future fields (distress/meds) will be added later; do not invent schema here.
    return { ts, sys, dia, hr, notes };
  }

  function fmtTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch (_) {
      return "";
    }
  }

  async function getDataAsync() {
    try {
      if (!window.VTStore || typeof window.VTStore.getAll !== "function") return [];
      const res = window.VTStore.getAll();
      const raw = (res && typeof res.then === "function") ? await res : (res || []);
      const norm = [];
      for (const r of raw) {
        const n = normalize(r);
        if (n.ts == null) continue;
        norm.push(n);
      }
      return norm;
    } catch (_) {
      return [];
    }
  }

  function applyRowFallbackStyles(row, head, tsEl, editEl, left, title, sub, right) {
    // If your CSS defines these classes, it will win. These are minimal safety nets.
    try {
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr";
      row.style.gap = "8px";
      row.style.padding = "12px 12px";
      row.style.border = "1px solid rgba(255,255,255,0.12)";
      row.style.borderRadius = "16px";
      row.style.background = "rgba(0,0,0,0.12)";
    } catch (_) {}

    try {
      head.style.display = "flex";
      head.style.alignItems = "center";
      head.style.justifyContent = "space-between";
      head.style.gap = "10px";
    } catch (_) {}

    try {
      tsEl.style.color = "rgba(255,255,255,0.56)";
      tsEl.style.fontSize = "12px";
      tsEl.style.fontWeight = "700";
    } catch (_) {}

    try {
      editEl.style.color = COLORS.linkBlue;
      editEl.style.fontSize = "12px";
      editEl.style.fontWeight = "800";
      editEl.style.textDecoration = "none";
    } catch (_) {}

    try {
      left.style.display = "grid";
      left.style.gap = "2px";
    } catch (_) {}

    try {
      title.style.fontWeight = "800";
      title.style.letterSpacing = ".1px";
      title.style.color = "rgba(255,255,255,0.86)";
      title.style.fontSize = "14px";
      title.style.display = "flex";
      title.style.flexWrap = "wrap";
      title.style.gap = "8px";
      title.style.alignItems = "baseline";
    } catch (_) {}

    try {
      sub.style.color = "rgba(255,255,255,0.56)";
      sub.style.fontSize = "12px";
    } catch (_) {}

    try {
      right.style.color = "rgba(255,255,255,0.66)";
      right.style.fontSize = "12px";
      right.style.lineHeight = "1.25";
    } catch (_) {}
  }

  function makeSpan(text, color) {
    const s = document.createElement("span");
    s.textContent = text;
    if (color) s.style.color = color;
    return s;
  }

  function renderRow(r) {
    const row = document.createElement("div");
    row.className = "logRow";

    // Header line: timestamp (left) + Edit link (right)
    const head = document.createElement("div");
    head.className = "logHead";

    const tsEl = document.createElement("div");
    tsEl.className = "logTs";
    tsEl.textContent = fmtTs(r.ts);

    const editEl = document.createElement("a");
    editEl.className = "logEdit";
    editEl.href = "javascript:void(0)";
    editEl.textContent = "Edit";
    // Visual only; wiring handled later (add.js/store.js)
    editEl.setAttribute("role", "link");
    editEl.setAttribute("aria-label", "Edit this entry");

    head.appendChild(tsEl);
    head.appendChild(editEl);

    const left = document.createElement("div");
    left.className = "logMain";

    const title = document.createElement("div");
    title.className = "logTitle";

    const sys = (typeof r.sys === "number") ? r.sys : null;
    const dia = (typeof r.dia === "number") ? r.dia : null;
    const hr  = (typeof r.hr === "number")  ? r.hr  : null;

    const bpColor = bpSeverityColor(sys);
    const hrColor = hrSeverityColor(hr);

    const bpText = `${sys ?? "--"}/${dia ?? "--"}`;
    const hrText = `HR ${hr ?? "--"}`;

    // BP label (colored when in severity zone; BP uses systolic severity)
    title.appendChild(makeSpan("BP", null));
    title.appendChild(makeSpan(bpText, bpColor));

    // Separator
    title.appendChild(makeSpan("•", "rgba(255,255,255,0.42)"));

    // HR label (colored when in severity zone)
    title.appendChild(makeSpan(hrText, hrColor));

    const sub = document.createElement("div");
    sub.className = "logSub";
    sub.textContent = ""; // reserved for future (symptoms/distress/meds lines). Keep minimal now.

    left.appendChild(title);
    if (sub.textContent) left.appendChild(sub);

    const right = document.createElement("div");
    right.className = "logMeta";
    right.textContent = clampStr(r.notes, 220);

    row.appendChild(head);
    row.appendChild(left);
    row.appendChild(right);

    // Fallback styling (safe)
    applyRowFallbackStyles(row, head, tsEl, editEl, left, title, sub, right);

    // Ensure hyperlink behavior feels correct even without CSS
    try {
      editEl.addEventListener("mouseover", function () {
        editEl.style.textDecoration = "underline";
      }, { passive: true });
      editEl.addEventListener("mouseout", function () {
        editEl.style.textDecoration = "none";
      }, { passive: true });
    } catch (_) {}

    return row;
  }

  let _rendering = false;

  async function render() {
    if (_rendering) return;
    _rendering = true;

    try {
      if (loadingEl) loadingEl.style.display = "";
      if (emptyEl) emptyEl.hidden = true;

      const data = (await getDataAsync()).slice().sort((a, b) => b.ts - a.ts);
      clear();

      if (!data.length) {
        if (emptyEl) emptyEl.hidden = false;
        return;
      }

      for (const r of data) {
        listEl.appendChild(renderRow(r));
      }
    } catch (_) {
      // swallow by design
    } finally {
      try { if (loadingEl) loadingEl.style.display = "none"; } catch (_) {}
      _rendering = false;
    }
  }

  // Preferred: panels router emits vt:panelChanged
  document.addEventListener("vt:panelChanged", function (e) {
    try {
      if (e?.detail?.active === "log") render();
    } catch (_) {}
  });

  // Fallback API for panels.js hooks
  window.VTLog = Object.freeze({
    render,
    onShow: render
  });

  // Safe initial render (even if hidden)
  try { render(); } catch (_) {}

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/log.js
Pass: Log Row Severity Colors (P0-L2)
Pass order: File 8 of 9 (P0)
Prev file: js/chart.js (File 7 of 9)
Next file: js/add.js (File 9 of 9)
*/
