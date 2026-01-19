/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 8 of 9 (P0)
Prev file: js/chart.js (File 7 of 9)
Next file: js/add.js (File 9 of 9)

v2.025f — Change Log (THIS FILE ONLY)
1) Guarantees Log re-renders when Log panel becomes active.
2) Adds defensive normalization for record field names (ts/sys/dia/hr/notes).
3) No delete/edit changes here (UI wiring handled in add.js + store.js later).

ANTI-DRIFT: No swipe logic here.
*/

(function () {
  "use strict";

  const listEl = document.getElementById("logList");
  const emptyEl = document.getElementById("logEmpty");
  const loadingEl = document.getElementById("logLoading");

  if (!listEl) return;

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

  function getData() {
    try {
      if (!window.VTStore || typeof window.VTStore.getAll !== "function") return [];
      const raw = window.VTStore.getAll() || [];
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

  function renderRow(r) {
    const row = document.createElement("div");
    row.className = "logRow";

    const left = document.createElement("div");
    left.className = "logMain";

    const title = document.createElement("div");
    title.className = "logTitle";
    title.textContent = `${r.sys ?? "--"}/${r.dia ?? "--"}  •  HR ${r.hr ?? "--"}`;

    const sub = document.createElement("div");
    sub.className = "logSub";
    sub.textContent = fmtTs(r.ts);

    left.appendChild(title);
    left.appendChild(sub);

    const right = document.createElement("div");
    right.className = "logMeta";
    right.textContent = clampStr(r.notes, 140);

    row.appendChild(left);
    row.appendChild(right);

    return row;
  }

  function render() {
    if (loadingEl) loadingEl.style.display = "none";

    const data = getData().slice().sort((a, b) => b.ts - a.ts);
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

  // Fallback: if app doesn't emit events yet, allow manual refresh
  window.VTLog = {
    render,
    onShow: render
  };

  // Safe initial render (even if hidden)
  try { render(); } catch (_) {}

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/log.js
Pass: Render Recovery + Swipe Feel
Pass order: File 8 of 9 (P0)
Prev file: js/chart.js (File 7 of 9)
Next file: js/add.js (File 9 of 9)
*/
