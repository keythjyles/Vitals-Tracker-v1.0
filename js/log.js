/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Base: v2.027a
Pass: Log Wiring + Severity Rendering (P1-L2)
Pass order: Log file (standalone fix)

Changes (THIS FILE ONLY)
1) Log renders with VTStore.getAll() whether sync OR async (Promise).
2) Adds an "Edit" blue hyperlink per row (minimal; emits vt:logEditRequest).
3) BP + HR values render in band-matched colors when in danger zones.
4) Keeps existing defensive normalization and safe fallback styles.
ANTI-DRIFT: No swipe logic here.
*/

(function () {
  "use strict";

  const listEl = document.getElementById("logList");
  const emptyEl = document.getElementById("logEmpty");
  const loadingEl = document.getElementById("logLoading");

  if (!listEl) return;

  let renderSeq = 0;

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

    // Preserve a stable reference for edit requests (prefer id, else ts)
    const id = (r?.id ?? r?._id ?? r?.key ?? null);

    return { id, ts, sys, dia, hr, notes, _raw: r };
  }

  function fmtTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch (_) {
      return "";
    }
  }

  function isPromise(x) {
    return !!x && (typeof x === "object" || typeof x === "function") && typeof x.then === "function";
  }

  async function getDataAsync() {
    try {
      if (!window.VTStore || typeof window.VTStore.getAll !== "function") return [];
      const got = window.VTStore.getAll();
      const raw = isPromise(got) ? await got : got;
      const arr = Array.isArray(raw) ? raw : [];
      const norm = [];
      for (const r of arr) {
        const n = normalize(r);
        if (n.ts == null) continue;
        norm.push(n);
      }
      return norm;
    } catch (_) {
      return [];
    }
  }

  // Band colors (match chart scheme)
  const BAND = Object.freeze({
    crisis: "rgba(120,20,32,0.95)",   // dark red
    stage2: "rgba(190,60,75,0.95)",   // red
    stage1: "rgba(200,160,40,0.95)",  // yellow
    elevated: "rgba(140,95,200,0.95)",// purple
    normal: "rgba(60,130,220,0.95)"   // blue
  });

  function bpBandColor(sys, dia) {
    // Use the WORST of systolic and diastolic classification
    // Systolic bands per your ledger: <120 blue, 120-129 purple, 130-139 yellow, 140-179 red, >=180 dark red
    // Diastolic bands (clinical): <80 blue, 80-89 yellow, 90-119 red, >=120 dark red
    function sysLevel(v) {
      if (v == null) return 0;
      if (v >= 180) return 4;
      if (v >= 140) return 3;
      if (v >= 130) return 2;
      if (v >= 120) return 1;
      return 0;
    }
    function diaLevel(v) {
      if (v == null) return 0;
      if (v >= 120) return 4;
      if (v >= 90) return 3;
      if (v >= 80) return 2;
      // we treat 70-79 as normal (blue) to avoid over-labeling
      return 0;
    }
    const lvl = Math.max(sysLevel(sys), diaLevel(dia));
    if (lvl >= 4) return BAND.crisis;
    if (lvl === 3) return BAND.stage2;
    if (lvl === 2) return BAND.stage1;
    if (lvl === 1) return BAND.elevated;
    return BAND.normal;
  }

  function hrBandColor(hr) {
    // Practical, non-alarming bands; still uses your 5-color palette.
    // Normal: 60–99 (blue)
    // Elevated: 100–109 or 55–59 (purple)
    // Stage 1: 110–129 or 50–54 (yellow)
    // Stage 2: 130–149 or 45–49 (red)
    // Crisis: >=150 or <=44 (dark red)
    if (hr == null) return "rgba(235,245,255,0.86)";
    if (hr >= 150 || hr <= 44) return BAND.crisis;
    if (hr >= 130 || hr <= 49) return BAND.stage2;
    if (hr >= 110 || hr <= 54) return BAND.stage1;
    if (hr >= 100 || hr <= 59) return BAND.elevated;
    return BAND.normal;
  }

  function applyRowFallbackStyles(row, head, title, sub, notes, edit) {
    // Minimal safety nets (do not override if CSS exists)
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
      head.style.alignItems = "baseline";
      head.style.justifyContent = "space-between";
      head.style.gap = "10px";
    } catch (_) {}

    try {
      title.style.fontWeight = "800";
      title.style.letterSpacing = ".1px";
      title.style.color = "rgba(255,255,255,0.86)";
      title.style.fontSize = "14px";
      title.style.lineHeight = "1.15";
    } catch (_) {}

    try {
      edit.style.fontSize = "13px";
      edit.style.fontWeight = "700";
      edit.style.textDecoration = "underline";
      edit.style.color = "rgba(60,130,220,0.95)"; // blue hyperlink
      edit.style.cursor = "pointer";
      edit.style.whiteSpace = "nowrap";
      edit.style.userSelect = "none";
      edit.style.webkitUserSelect = "none";
    } catch (_) {}

    try {
      sub.style.color = "rgba(255,255,255,0.56)";
      sub.style.fontSize = "12px";
      sub.style.marginTop = "2px";
    } catch (_) {}

    try {
      notes.style.color = "rgba(255,255,255,0.66)";
      notes.style.fontSize = "12px";
      notes.style.lineHeight = "1.25";
    } catch (_) {}
  }

  function emitEditRequest(rec) {
    try {
      const detail = {
        // prefer id; fall back to ts
        id: rec.id ?? null,
        ts: rec.ts ?? null,
        record: rec._raw ?? null
      };
      document.dispatchEvent(new CustomEvent("vt:logEditRequest", { detail }));
    } catch (_) {}
  }

  function renderRow(r) {
    const row = document.createElement("div");
    row.className = "logRow";

    const head = document.createElement("div");
    head.className = "logHead";

    const title = document.createElement("div");
    title.className = "logTitle";

    const sysTxt = (r.sys ?? "--");
    const diaTxt = (r.dia ?? "--");
    const hrTxt = (r.hr ?? "--");

    // Build title with per-part coloring
    const bpColor = bpBandColor(r.sys, r.dia);
    const hrColor = hrBandColor(r.hr);

    // Title structure: BP ####/###  •  HR ##
    title.innerHTML = `
      <span class="logBP" style="color:${bpColor}">BP ${sysTxt}/${diaTxt}</span>
      <span style="color:rgba(235,245,255,0.72)">  •  </span>
      <span class="logHR" style="color:${hrColor}">HR ${hrTxt}</span>
    `;

    const edit = document.createElement("a");
    edit.className = "logEdit";
    edit.href = "#";
    edit.textContent = "Edit";
    edit.addEventListener("click", function (e) {
      try { e.preventDefault(); } catch (_) {}
      emitEditRequest(r);
    });

    head.appendChild(title);
    head.appendChild(edit);

    const sub = document.createElement("div");
    sub.className = "logSub";
    sub.textContent = fmtTs(r.ts);

    const notes = document.createElement("div");
    notes.className = "logMeta";
    notes.textContent = clampStr(r.notes, 220);

    row.appendChild(head);
    row.appendChild(sub);
    row.appendChild(notes);

    // Fallback styling (safe)
    applyRowFallbackStyles(row, head, title, sub, notes, edit);

    return row;
  }

  async function render() {
    const mySeq = ++renderSeq;

    try {
      if (loadingEl) loadingEl.style.display = "";
    } catch (_) {}

    let data = [];
    try {
      data = await getDataAsync();
    } catch (_) {
      data = [];
    }

    // If another render started after this one, abort to avoid flicker
    if (mySeq !== renderSeq) return;

    try {
      if (loadingEl) loadingEl.style.display = "none";
    } catch (_) {}

    data = data.slice().sort((a, b) => b.ts - a.ts);
    clear();

    if (!data.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    for (const r of data) {
      listEl.appendChild(renderRow(r));
    }
  }

  // Preferred: panels router emits vt:panelChanged
  document.addEventListener("vt:panelChanged", function (e) {
    try {
      if (e?.detail?.active === "log") render();
    } catch (_) {}
  });

  // Refresh after saves (add.js calls VTLog.onShow)
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
Pass: Log Wiring + Severity Rendering (P1-L2)
*/
