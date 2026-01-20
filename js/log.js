/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Base: v2.028a
Pass: Log Panel Recovery + Row UX (P0-LR1)
Pass order: Log fix (focused)

GOALS (THIS FILE ONLY)
1) Log must reliably show records (even when VTStore init is async).
2) Log must re-render when Log becomes active.
3) Log panel Add button must open Add panel.
4) Each row gets a blue "Edit" hyperlink (future edit wiring).
5) BP and HR values colorize based on danger bands (conservative rules).

ANTI-DRIFT
- No swipe logic.
- No chart logic.
- No schema expansion (meds/distress later).
*/

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

  function setEmpty(on) {
    if (!emptyEl) return;
    emptyEl.hidden = !on;
  }

  // ===== Danger band colors (aligned to chart palette intent) =====
  // Sys bands: <120 blue, 120-129 purple, 130-139 yellow, 140-179 red, >=180 dark red
  function sysLevel(sys) {
    if (sys == null) return null;
    if (sys >= 180) return "crisis";
    if (sys >= 140) return "stage2";
    if (sys >= 130) return "stage1";
    if (sys >= 120) return "elev";
    return "normal";
  }

  // Dia bands (conservative): <80 blue, 80-89 yellow, 90-119 red, >=120 dark red
  function diaLevel(dia) {
    if (dia == null) return null;
    if (dia >= 120) return "crisis";
    if (dia >= 90) return "stage2";
    if (dia >= 80) return "stage1";
    return "normal";
  }

  // HR (conservative): only flag clearly abnormal extremes.
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
    // Dark red, red, yellow, purple, blue (as requested).
    // Using opaque text colors suitable for dark UI.
    switch (level) {
      case "crisis": return "rgba(160,50,60,0.98)";  // dark red
      case "stage2": return "rgba(210,80,90,0.98)";  // red
      case "stage1": return "rgba(210,170,60,0.98)"; // yellow
      case "elev":   return "rgba(140,110,220,0.98)";// purple
      case "normal": return "rgba(80,150,240,0.98)"; // blue
      default:       return "";                      // default text
    }
  }

  function applyRowFallbackStyles(row, title, sub, meta, editLink) {
    // Minimal safety nets (CSS wins if present)
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
      title.style.fontWeight = "800";
      title.style.letterSpacing = ".1px";
      title.style.color = "rgba(255,255,255,0.86)";
      title.style.fontSize = "14px";
    } catch (_) {}

    try {
      sub.style.color = "rgba(255,255,255,0.56)";
      sub.style.fontSize = "12px";
    } catch (_) {}

    try {
      meta.style.color = "rgba(255,255,255,0.66)";
      meta.style.fontSize = "12px";
      meta.style.lineHeight = "1.25";
    } catch (_) {}

    try {
      editLink.style.color = "rgba(80,150,240,0.98)";
      editLink.style.textDecoration = "underline";
      editLink.style.fontWeight = "700";
      editLink.style.fontSize = "13px";
    } catch (_) {}
  }

  function makeEditLink(record) {
    const a = document.createElement("a");
    a.href = "#";
    a.className = "logEditLink";
    a.textContent = "Edit";

    a.addEventListener("click", function (e) {
      try { e.preventDefault(); } catch (_) {}

      // Future: add.js can listen for this event to open an edit modal.
      try {
        document.dispatchEvent(new CustomEvent("vt:editRecord", { detail: { record: record.raw || record } }));
        return;
      } catch (_) {}

      // Hard fallback (should be rare)
      try { alert("Edit is not available in this build."); } catch (_) {}
    });

    return a;
  }

  function renderRow(r) {
    const row = document.createElement("div");
    row.className = "logRow";

    const title = document.createElement("div");
    title.className = "logTitle";

    const sub = document.createElement("div");
    sub.className = "logSub";
    sub.textContent = fmtTs(r.ts);

    const meta = document.createElement("div");
    meta.className = "logMeta";
    meta.textContent = clampStr(r.notes, 180);

    const editLink = makeEditLink(r);

    // Title content with colored BP / HR segments
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
    if (hrColor && hrL !== "normal") hrSpan.style.color = hrColor; // only color HR when clearly abnormal

    const right = document.createElement("div");
    right.className = "logRight";
    right.style.display = "flex";
    right.style.gap = "10px";
    right.style.alignItems = "baseline";
    right.style.justifyContent = "space-between";

    const rightLeft = document.createElement("div");
    rightLeft.style.display = "grid";
    rightLeft.style.gap = "2px";
    rightLeft.appendChild(sub);
    rightLeft.appendChild(meta);

    const rightRight = document.createElement("div");
    rightRight.style.display = "flex";
    rightRight.style.justifyContent = "flex-end";
    rightRight.style.alignItems = "center";
    rightRight.appendChild(editLink);

    // Title row
    title.appendChild(bpSpan);
    title.appendChild(dot);
    title.appendChild(hrSpan);

    row.appendChild(title);
    row.appendChild(rightLeft);
    row.appendChild(rightRight);

    applyRowFallbackStyles(row, title, sub, meta, editLink);

    return row;
  }

  async function getDataAsync() {
    try {
      if (!window.VTStore) return [];
      if (typeof window.VTStore.init === "function") {
        // IMPORTANT: wait for async init so cache is populated.
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
    // Simple signature to avoid redundant re-render loops.
    try {
      if (!arr || !arr.length) return "0";
      const first = arr[0];
      const last = arr[arr.length - 1];
      return `${arr.length}|${first.ts}|${last.ts}`;
    } catch (_) {
      return "";
    }
  }

  async function render() {
    if (renderInFlight) return;
    renderInFlight = true;

    try {
      setLoading(true);

      const data = (await getDataAsync()).slice().sort((a, b) => b.ts - a.ts);

      const sig = makeSig(data);
      if (sig && sig === lastRenderSig) {
        // Still ensure loading/empty flags are correct.
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
    // 1) Primary: panels router event
    document.addEventListener("vt:panelChanged", function (e) {
      try {
        if (e && e.detail && e.detail.active === "log") render();
      } catch (_) {}
    });

    // 2) Secondary: visibility poll safety net
    startVisibilityPoll();

    // 3) Add button on Log panel opens Add
    if (btnAdd) {
      btnAdd.addEventListener("click", function (e) {
        try { e.preventDefault(); } catch (_) {}
        openAddFromLog();
      });
    }

    // API hook for other modules
    window.VTLog = Object.freeze({
      render: render,
      onShow: render
    });

    // Initial render (safe)
    try { render(); } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { passive: true });
  } else {
    bind();
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Base: v2.028a
Pass: Log Panel Recovery + Row UX (P0-LR1)
*/
