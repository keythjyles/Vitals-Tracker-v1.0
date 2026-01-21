/* 
Vitals Tracker — BOF (Prime Pass Header)
File: js/log.js
App Version Authority: js/version.js
Prime Pass: File 12 of 23
Prev: js/chart.js
Next: js/panels.js
FileEditId: 0
Edited: 2026-01-21

NEXT FILE TO FETCH/PASTE (THIS RUN ONLY): js/panels.js

HUMAN/AI DRIFT CONTROL (READ THIS ONCE; THEN IGNORE)
Beacon: focus on this pasted file only. Follow only the current instruction and this file’s embedded prompts.
Prime Pass rule: DO NOT change functional code. Update header/footer only.
Persist these Prime Pass rules in comments until the user changes them.
On every subsequent full-file edit of this file, increment FileEditId by +1.

Role / Ownership
- Log panel rendering + row layout + Edit link behavior wiring.
- Must remain purely behavioral/UI for Log panel only.

Implemented (facts only)
- Log list rendering with severity coloring.
- Edit link dispatches vt:editRecord and attempts Add panel open/prefill.
- Notes wrapping enabled with safe long-word wrapping.

Drift locks (do not change without intentional decision)
- No swipe/gesture/panel engine changes.
- No chart changes.
- No storage/store changes.
------------------------------------------------------------ */

(function () {
  "use strict";

  const panelEl = document.getElementById("panelLog");
  const listEl = document.getElementById("logList");
  const emptyEl = document.getElementById("logEmpty");
  const loadingEl = document.getElementById("logLoading");

  const btnAdd = document.getElementById("btnAddFromLog");

  if (!listEl) return;

  let renderInFlight = false;
  let lastRenderSig = "";
  let visPollTimer = 0;
  let lastVisActive = false;

  function safeText(v) {
    try { return (v == null) ? "" : String(v); } catch (_) { return ""; }
  }

  function parseTs(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
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
    if (!r || typeof r !== "object") return { ts: null, sys: null, dia: null, hr: null, notes: "", raw: r };

    const ts =
      parseTs(r.ts) ??
      parseTs(r.time) ??
      parseTs(r.timestamp) ??
      parseTs(r.date) ??
      parseTs(r.createdAt) ??
      parseTs(r.created_at) ??
      parseTs(r.iso);

    const sys =
      num(r.sys) ??
      num(r.systolic) ??
      num(r.sbp) ??
      num(r.SBP) ??
      num(r.bp?.sys) ??
      num(r.bp?.systolic);

    const dia =
      num(r.dia) ??
      num(r.diastolic) ??
      num(r.dbp) ??
      num(r.DBP) ??
      num(r.bp?.dia) ??
      num(r.bp?.diastolic);

    const hr =
      num(r.hr) ??
      num(r.heartRate) ??
      num(r.pulse) ??
      num(r.HR) ??
      num(r.vitals?.hr) ??
      num(r.vitals?.pulse);

    const notes = safeText(r.notes ?? r.note ?? r.comment ?? r.memo ?? "");

    return { ts, sys, dia, hr, notes, raw: r };
  }

  function fmtTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch (_) {
      return "";
    }
  }

  function clear() {
    listEl.innerHTML = "";
  }

  function setLoading(on) {
    if (!loadingEl) return;
    loadingEl.style.display = on ? "" : "none";
  }

  function setEmpty(on, msg) {
    if (!emptyEl) return;
    emptyEl.hidden = !on;
    if (on) emptyEl.textContent = msg || "No readings yet.";
  }

  function sysLevel(sys) {
    if (sys == null) return null;
    if (sys >= 180) return "crisis";
    if (sys >= 140) return "stage2";
    if (sys >= 130) return "stage1";
    if (sys >= 120) return "elev";
    return "normal";
  }

  function diaLevel(dia) {
    if (dia == null) return null;
    if (dia >= 120) return "crisis";
    if (dia >= 90) return "stage2";
    if (dia >= 80) return "stage1";
    return "normal";
  }

  function hrLevel(hr) {
    if (hr == null) return null;
    if (hr >= 120) return "stage2";
    if (hr <= 45) return "elev";
    return "normal";
  }

  function worstLevel(a, b) {
    const rank = { crisis: 5, stage2: 4, stage1: 3, elev: 2, normal: 1 };
    const ra = rank[a] || 0;
    const rb = rank[b] || 0;
    return (ra >= rb) ? a : b;
  }

  function colorForLevel(level) {
    switch (level) {
      case "crisis": return "rgba(160,50,60,0.98)";   // dark red
      case "stage2": return "rgba(210,80,90,0.98)";   // red
      case "stage1": return "rgba(210,170,60,0.98)";  // yellow
      case "elev":   return "rgba(140,110,220,0.98)"; // purple
      case "normal": return "rgba(80,150,240,0.98)";  // blue
      default:       return "";
    }
  }

  function applyRowFallbackStyles(row, headRow, tsEl, notesEl, editLink, leftReadings) {
    // Card
    try {
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr";
      row.style.gap = "8px";
      row.style.padding = "12px 12px";
      row.style.border = "1px solid rgba(255,255,255,0.12)";
      row.style.borderRadius = "16px";
      row.style.background = "rgba(0,0,0,0.12)";
    } catch (_) {}

    // Header row (readings + edit)
    try {
      headRow.style.display = "flex";
      headRow.style.alignItems = "center";
      headRow.style.justifyContent = "space-between";
      headRow.style.gap = "10px";
    } catch (_) {}

    try {
      leftReadings.style.fontWeight = "800";
      leftReadings.style.letterSpacing = ".1px";
      leftReadings.style.color = "rgba(255,255,255,0.86)";
      leftReadings.style.fontSize = "14px";
      leftReadings.style.display = "inline-flex";
      leftReadings.style.alignItems = "baseline";
      leftReadings.style.flexWrap = "wrap";
      leftReadings.style.gap = "0px";
    } catch (_) {}

    // Timestamp
    try {
      tsEl.style.color = "rgba(255,255,255,0.56)";
      tsEl.style.fontSize = "12px";
    } catch (_) {}

    // Notes wrap
    try {
      notesEl.style.color = "rgba(255,255,255,0.66)";
      notesEl.style.fontSize = "12px";
      notesEl.style.lineHeight = "1.25";
      notesEl.style.whiteSpace = "normal";
      notesEl.style.overflowWrap = "anywhere";
      notesEl.style.wordBreak = "break-word";
    } catch (_) {}

    // Edit link
    try {
      editLink.style.color = "rgba(80,150,240,0.98)";
      editLink.style.textDecoration = "underline";
      editLink.style.fontWeight = "700";
      editLink.style.fontSize = "13px";
      editLink.style.flex = "0 0 auto";
      editLink.style.marginLeft = "10px";
    } catch (_) {}
  }

  function openEditPrefilled(payload) {
    // payload should include original ts
    try {
      if (window.VTPanels && typeof window.VTPanels.openAdd === "function") {
        // Best-effort: pass data; openAdd may ignore args if not supported.
        window.VTPanels.openAdd({ mode: "edit", record: payload });
        return true;
      }
    } catch (_) {}

    try {
      if (window.VTPanels && typeof window.VTPanels.go === "function") {
        window.VTPanels.go("add", true);
        // Fire event so Add panel can prefill even if go() is used.
        try { document.dispatchEvent(new CustomEvent("vt:editRecord", { detail: { record: payload } })); } catch (_) {}
        return true;
      }
    } catch (_) {}

    return false;
  }

  function makeEditLink(recordNorm) {
    const a = document.createElement("a");
    a.href = "#";
    a.className = "logEditLink";
    a.textContent = "Edit";

    a.addEventListener("click", function (e) {
      try { e.preventDefault(); } catch (_) {}

      // Build a canonical payload that preserves the original timestamp.
      // IMPORTANT: We never generate a new time here.
      const payload = {
        ts: recordNorm.ts,
        sys: recordNorm.sys,
        dia: recordNorm.dia,
        hr: recordNorm.hr,
        notes: recordNorm.notes,
        // Also include raw for maximum compatibility with existing listeners.
        raw: recordNorm.raw || null
      };

      // 1) Always dispatch compatibility event (existing app behavior).
      try {
        document.dispatchEvent(new CustomEvent("vt:editRecord", { detail: { record: payload } }));
      } catch (_) {}

      // 2) Attempt to open the add/edit panel prefilled.
      const opened = openEditPrefilled(payload);
      if (opened) return;

      // Fallback
      try { alert("Edit is not available in this build."); } catch (_) {}
    });

    return a;
  }

  function renderRow(r) {
    const row = document.createElement("div");
    row.className = "logRow";

    // Header row: readings (left) + edit (right)
    const headRow = document.createElement("div");
    headRow.className = "logHeadRow";

    const leftReadings = document.createElement("div");
    leftReadings.className = "logTitle";

    const editLink = makeEditLink(r);

    const sysText = (r.sys == null) ? "--" : String(r.sys);
    const diaText = (r.dia == null) ? "--" : String(r.dia);
    const hrText  = (r.hr  == null) ? "--" : String(r.hr);

    const sysL = sysLevel(r.sys);
    const diaL = diaLevel(r.dia);
    const bpL = worstLevel(sysL, diaL);
    const hrL = hrLevel(r.hr);

    const bpColor = colorForLevel(bpL);
    const hrColor = colorForLevel(hrL);

    const bpSpan = document.createElement("span");
    bpSpan.textContent = `BP ${sysText}/${diaText}`;
    if (bpColor) bpSpan.style.color = bpColor;

    const dot = document.createElement("span");
    dot.textContent = "  •  ";
    dot.style.color = "rgba(255,255,255,0.52)";

    const hrSpan = document.createElement("span");
    hrSpan.textContent = `HR ${hrText}`;
    if (hrColor && hrL !== "normal") hrSpan.style.color = hrColor;

    leftReadings.appendChild(bpSpan);
    leftReadings.appendChild(dot);
    leftReadings.appendChild(hrSpan);

    headRow.appendChild(leftReadings);
    headRow.appendChild(editLink);

    // Timestamp
    const tsEl = document.createElement("div");
    tsEl.className = "logSub";
    tsEl.textContent = fmtTs(r.ts);

    // Notes (wrap)
    const notesEl = document.createElement("div");
    notesEl.className = "logMeta";
    notesEl.textContent = safeText(r.notes);

    row.appendChild(headRow);
    row.appendChild(tsEl);
    row.appendChild(notesEl);

    applyRowFallbackStyles(row, headRow, tsEl, notesEl, editLink, leftReadings);

    return row;
  }

  async function getDataAsync() {
    try {
      if (!window.VTStore) return [];
      if (typeof window.VTStore.init === "function") {
        await window.VTStore.init();
      }
      if (typeof window.VTStore.getAll !== "function") return [];

      const raw = window.VTStore.getAll() || [];
      if (!Array.isArray(raw)) return [];

      const norm = [];
      for (const rr of raw) {
        const n = normalize(rr);
        if (n.ts == null) continue;
        norm.push(n);
      }
      return norm;
    } catch (_) {
      return [];
    }
  }

  function makeSig(arr) {
    try {
      if (!arr || !arr.length) return "0";
      const first = arr[0];
      const last = arr[arr.length - 1];
      return `${arr.length}|${first.ts}|${last.ts}`;
    } catch (_) {
      return "";
    }
  }

  function openAddFromLog() {
    try {
      if (window.VTPanels && typeof window.VTPanels.openAdd === "function") {
        window.VTPanels.openAdd();
        return;
      }
      if (window.VTPanels && typeof window.VTPanels.go === "function") {
        window.VTPanels.go("add", true);
        return;
      }
    } catch (_) {}
  }

  async function render() {
    if (renderInFlight) return;
    renderInFlight = true;

    try {
      setLoading(true);

      const data = (await getDataAsync()).slice().sort((a, b) => b.ts - a.ts);

      const sig = makeSig(data);
      if (sig && sig === lastRenderSig) {
        setLoading(false);
        setEmpty(!data.length);
        return;
      }
      lastRenderSig = sig;

      clear();

      if (!data.length) {
        setLoading(false);
        setEmpty(true);
        return;
      }

      setEmpty(false);

      for (const r of data) {
        listEl.appendChild(renderRow(r));
      }

      setLoading(false);
    } finally {
      renderInFlight = false;
    }
  }

  function startVisibilityPoll() {
    if (visPollTimer) return;
    visPollTimer = window.setInterval(() => {
      try {
        const active = !!panelEl && panelEl.classList.contains("active");
        if (active && !lastVisActive) {
          lastVisActive = true;
          render();
        }
        if (!active) lastVisActive = false;
      } catch (_) {}
    }, 350);
  }

  function bind() {
    document.addEventListener("vt:panelChanged", function (e) {
      try {
        if (e && e.detail && e.detail.active === "log") render();
      } catch (_) {}
    });

    startVisibilityPoll();

    if (btnAdd) {
      btnAdd.addEventListener("click", function (e) {
        try { e.preventDefault(); } catch (_) {}
        openAddFromLog();
      });
    }

    window.VTLog = Object.freeze({
      render: render,
      onShow: render
    });

    try { render(); } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { passive: true });
  } else {
    bind();
  }

})();

/*
Vitals Tracker — EOF (Prime Pass Footer)
File: js/log.js
App Version Authority: js/version.js
Prime Pass: File 12 of 23
Prev: js/chart.js
Next: js/panels.js
FileEditId: 0
Edited: 2026-01-21

Implementation Fetch Directive (ONE-TIME ONLY; NOT A MASTER ORDER)
ImplementationId: PP-20260121-001
Meaning:
- This block exists ONLY to tell the human operator which file to paste NEXT during this one implementation run.
- This is NOT an instruction set, NOT a schema, and NOT an ordering guarantee.
- Future AI must IGNORE this block entirely except as historical log text.

Current file (pasted/edited in this step): js/log.js

NEXT FILE TO FETCH/PASTE (THIS RUN ONLY): js/panels.js
*/
