/* File: js/log.js */
/*
Vitals Tracker — Log Renderer
Copyright (c) 2026 Wendell K. Jiles.
All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns Log list rendering ONLY.
- Reads data from VTStore.
- Displays chronological readings.
- Does NOT manage panels (panels.js).
- Does NOT manage gestures (gestures.js).
- Does NOT mutate data (store.js/storage.js own that).

v2.023f — Change Log (THIS FILE ONLY)
1) Guaranteed render on every onShow().
2) Removes permanent "Loading..." state.
3) Deterministic empty-state message.
4) Defensive against missing fields.
5) Zero swipe or gesture assumptions.

Schema position:
File 6 of 10
*/

(function (global) {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function clearLoading() {
    const el = $("logLoading");
    if (el) el.style.display = "none";
  }

  function getContainer() {
    return $("logList") || $("panelLog");
  }

  function getData() {
    if (!global.VTStore?.getAll) return [];
    return global.VTStore.getAll() || [];
  }

  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch (_) {
      return "";
    }
  }

  function makeRow(r) {
    const div = document.createElement("div");
    div.className = "log-row";

    const when = document.createElement("div");
    when.className = "log-when";
    when.textContent = fmtDate(r.ts);

    const vals = document.createElement("div");
    vals.className = "log-values";

    const parts = [];
    if (r.sys && r.dia) parts.push(`${r.sys}/${r.dia}`);
    if (r.hr) parts.push(`HR ${r.hr}`);
    if (r.note) parts.push(r.note);

    vals.textContent = parts.join(" • ");

    div.appendChild(when);
    div.appendChild(vals);
    return div;
  }

  function render() {
    const container = getContainer();
    if (!container) return;

    clearLoading();

    // Clear existing rows (preserve header if present)
    container.querySelectorAll(".log-row").forEach(el => el.remove());
    container.querySelectorAll(".log-empty").forEach(el => el.remove());

    const data = getData();
    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "log-empty";
      empty.textContent = "No readings recorded yet.";
      container.appendChild(empty);
      return;
    }

    // Newest first
    const sorted = data.slice().sort((a, b) => b.ts - a.ts);

    for (const r of sorted) {
      if (!r.ts) continue;
      container.appendChild(makeRow(r));
    }
  }

  function onShow() {
    render();
  }

  // Public API
  global.VTLog = Object.freeze({
    onShow,
    render
  });

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.023f (deterministic log render)
Schema order: File 6 of 10
*/
