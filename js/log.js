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
    if (!window.VTStore || typeof window.VTStore.getAll !== "function") {
      return [];
    }
    return window.VTStore.getAll() || [];
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
    if (r.notes) {
      right.textContent = r.notes;
    }

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

    data.forEach(r => {
      listEl.appendChild(renderRow(r));
    });
  }

  // React to panel changes so Log refreshes when opened
  document.addEventListener("vt:panelChanged", function (e) {
    if (e.detail && e.detail.active === "log") {
      render();
    }
  });

  // Initial render (safe if hidden)
  try {
    render();
  } catch (_) {}

  window.VTLog = {
    render
  };

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
