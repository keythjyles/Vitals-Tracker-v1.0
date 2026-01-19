/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 8 of 9 (P0)
Prev file: js/chart.js (File 7 of 9)
Next file: js/add.js (File 9 of 9)
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
      const rows = window.VTStore.getAll();
      return Array.isArray(rows) ? rows : [];
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
    right.textContent = r.notes ? String(r.notes) : "";

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function render() {
    if (loadingEl) loadingEl.style.display = "none";

    const data = getData().slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    clear();

    if (!data.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    data.forEach(r => {
      listEl.appendChild(renderRow(r));
    });
  }

  // panels.js calls VTLog.onShow() when Log becomes active
  function onShow() {
    try { render(); } catch (_) {}
  }

  // Initial render (safe if hidden)
  onShow();

  window.VTLog = Object.freeze({
    onShow,
    render
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 8 of 9 (P0)
Prev file: js/chart.js (File 7 of 9)
Next file: js/add.js (File 9 of 9)
*/
