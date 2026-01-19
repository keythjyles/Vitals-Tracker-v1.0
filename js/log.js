/* File: js/log.js */
/*
Vitals Tracker — Log Renderer (Read-Only, Stabilization Phase)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns rendering of the Log panel list.
- Reads records ONLY via VTStorage.getAllRecords().
- Read-only in v2.023c (no edit/delete yet).
- Emits no navigation events; purely visual + lifecycle aware.

v2.023c — Change Log (THIS FILE ONLY)
1) Restores basic Log rendering so data presence is visible.
2) Adds VTLog.onShow() lifecycle hook (mirrors VTChart.onShow()).
3) Displays clear empty-state messaging when no records exist.
4) Defensive against missing storage, malformed records, or partial fields.
5) Accessibility-oriented: simple vertical list, high contrast text.

ANTI-DRIFT RULES
- Do NOT write to storage here.
- Do NOT add chart logic here.
- Editing/deleting records will be handled later by add.js / ui.js.

Schema position:
File 10 of 10

Previous file:
File 9 — js/panels.js
*/

(function () {
  "use strict";

  const LOG_CONTAINER_ID = "logCard";
  const LOG_NOTE_ID = "logTopNote";

  function el(id) {
    return document.getElementById(id);
  }

  function fmtTs(ts) {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleString();
    } catch (_) {
      return "—";
    }
  }

  function extractTs(r) {
    return r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? r?.createdAt ?? r?.created_at ?? r?.iso ?? null;
  }

  function extractBP(r) {
    const sys = r?.sys ?? r?.systolic ?? r?.bp?.sys ?? r?.bp?.systolic ?? null;
    const dia = r?.dia ?? r?.diastolic ?? r?.bp?.dia ?? r?.bp?.diastolic ?? null;
    if (sys == null && dia == null) return null;
    return `${sys ?? "—"}/${dia ?? "—"}`;
  }

  function extractHR(r) {
    return r?.hr ?? r?.heartRate ?? r?.pulse ?? r?.vitals?.hr ?? r?.vitals?.pulse ?? null;
  }

  function clearContainer(c) {
    while (c.firstChild) c.removeChild(c.firstChild);
  }

  async function renderLog() {
    const container = el(LOG_CONTAINER_ID);
    const note = el(LOG_NOTE_ID);
    if (!container) return;

    clearContainer(container);

    let records = [];
    try {
      if (window.VTStorage && VTStorage.getAllRecords) {
        records = await VTStorage.getAllRecords();
      }
    } catch (_) {
      records = [];
    }

    if (!Array.isArray(records) || records.length === 0) {
      if (note) note.textContent = "No records found.";
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.style.padding = "8px";
      empty.textContent = "Add readings to see them listed here.";
      container.appendChild(empty);
      return;
    }

    // Sort newest first
    records.sort((a, b) => {
      const ta = new Date(extractTs(a) || 0).getTime();
      const tb = new Date(extractTs(b) || 0).getTime();
      return tb - ta;
    });

    if (note) note.textContent = `${records.length} record${records.length === 1 ? "" : "s"}`;

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "10px";

    for (const r of records) {
      const row = document.createElement("div");
      row.style.border = "1px solid rgba(235,245,255,.16)";
      row.style.borderRadius = "14px";
      row.style.padding = "10px";
      row.style.background = "rgba(0,0,0,.18)";

      const ts = document.createElement("div");
      ts.className = "small";
      ts.style.color = "rgba(235,245,255,.58)";
      ts.textContent = fmtTs(extractTs(r));

      const main = document.createElement("div");
      main.style.display = "flex";
      main.style.flexWrap = "wrap";
      main.style.gap = "12px";
      main.style.marginTop = "4px";
      main.style.fontWeight = "900";

      const bp = extractBP(r);
      if (bp) {
        const b = document.createElement("div");
        b.textContent = `BP ${bp}`;
        main.appendChild(b);
      }

      const hr = extractHR(r);
      if (hr != null) {
        const h = document.createElement("div");
        h.textContent = `HR ${hr}`;
        main.appendChild(h);
      }

      row.appendChild(ts);
      row.appendChild(main);
      list.appendChild(row);
    }

    container.appendChild(list);
  }

  function onShow() {
    renderLog();
  }

  // ---- Expose lifecycle hook ----
  window.VTLog = {
    onShow
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version: v2.023c
Base: v2.021
Touched in v2.023c: js/log.js (log visibility restored)
Schema order: File 10 of 10
*/
