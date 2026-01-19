/* File: js/log.js */
/*
Vitals Tracker — Log Module (Robust Renderer)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ONLY the Log panel rendering + interactions (list, filters, selection).
- Must NOT own storage implementation details (storage.js/store.js own that).
- Must NOT own panel routing (panels.js/app.js own that).

v2.025e — Change Log (THIS FILE ONLY)
1) Fixes "Log stuck on Loading..." by guaranteeing a render pass even if store APIs differ.
2) Defensive adapter layer: works with VTStore.getAll/getRecords/getState or VTStorage fallback.
3) Non-blocking: errors render a visible message instead of silent failure.
4) Provides VTLog.onShow() so app.js can refresh Log every time it opens.

Schema position:
File 7 of 10
Prev file: File 6 — js/gestures.js (swipe/pull)
Next file: File 8 — js/panels.js (panel show/hide + nav)
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function qFirst(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findLogRoot() {
    // Panel root (try common IDs)
    return $("panelLog") || $("logPanel") || qFirst(["[data-panel='log']", ".panel-log"]);
  }

  function findListHost(root) {
    if (!root) return null;

    // Try explicit known IDs first
    const byId =
      $("logList") ||
      $("logItems") ||
      $("logContainer") ||
      $("logEntries") ||
      $("listLog");

    if (byId) return byId;

    // Otherwise search inside panel
    const inside = root.querySelector(
      "#logList,#logItems,#logContainer,#logEntries,#listLog,.logList,.log-items,.log-list,[data-log-list]"
    );
    if (inside) return inside;

    // As a last resort: create a host below the header card
    const created = document.createElement("div");
    created.id = "logList";
    created.style.marginTop = "14px";
    root.appendChild(created);
    return created;
  }

  function findLoadingLabel(root) {
    if (!root) return null;
    // Prefer an element that literally says "Loading..."
    const candidates = root.querySelectorAll("*");
    for (const el of candidates) {
      if ((el.textContent || "").trim() === "Loading...") return el;
    }
    return null;
  }

  function fmt2(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "--";
    return String(Math.round(x));
  }

  function fmtDateTime(ts) {
    const t = Number(ts);
    if (!Number.isFinite(t)) return "";
    const d = new Date(t);
    // Compact, stable, local time
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    let hh = d.getHours();
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12; if (hh === 0) hh = 12;
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yy}-${mm}-${dd} ${hh}:${mi} ${ampm}`;
  }

  function getRecordTime(rec) {
    // Accept multiple schemas
    return rec?.ts ?? rec?.time ?? rec?.timestamp ?? rec?.dateMs ?? rec?.createdAt ?? rec?.created_at ?? null;
  }

  function getBP(rec) {
    const sys = rec?.sys ?? rec?.systolic ?? rec?.bpSystolic ?? rec?.bp?.sys ?? rec?.bp?.systolic ?? null;
    const dia = rec?.dia ?? rec?.diastolic ?? rec?.bpDiastolic ?? rec?.bp?.dia ?? rec?.bp?.diastolic ?? null;
    return { sys, dia };
  }

  function getHR(rec) {
    return rec?.hr ?? rec?.heartRate ?? rec?.pulse ?? rec?.bpm ?? null;
  }

  function getNotes(rec) {
    return rec?.notes ?? rec?.note ?? rec?.comment ?? "";
  }

  async function fetchRecords() {
    // Preferred: VTStore APIs (various versions)
    try {
      const S = window.VTStore;
      if (S) {
        if (typeof S.getAll === "function") {
          const rows = await S.getAll();
          if (Array.isArray(rows)) return rows;
        }
        if (typeof S.getRecords === "function") {
          const rows = await S.getRecords();
          if (Array.isArray(rows)) return rows;
        }
        if (typeof S.getState === "function") {
          const st = S.getState();
          const rows = st?.records || st?.items || st?.data;
          if (Array.isArray(rows)) return rows;
        }
        // Some stores keep data at S.records
        if (Array.isArray(S.records)) return S.records;
      }
    } catch (_) {}

    // Fallback: VTStorage
    try {
      const ST = window.VTStorage;
      if (ST) {
        if (typeof ST.getAll === "function") {
          const rows = await ST.getAll();
          if (Array.isArray(rows)) return rows;
        }
        if (typeof ST.loadAll === "function") {
          const rows = await ST.loadAll();
          if (Array.isArray(rows)) return rows;
        }
      }
    } catch (_) {}

    // Hard fallback: try localStorage common keys
    try {
      const keys = [
        "vitals_tracker_records_v1",
        "vitals_tracker_records",
        "vt_records",
        "VT_RECORDS",
        "vitalsTrackerRecords"
      ];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.records)) return parsed.records;
      }
    } catch (_) {}

    return [];
  }

  function buildRow(rec) {
    const { sys, dia } = getBP(rec);
    const hr = getHR(rec);
    const notes = getNotes(rec);
    const ts = getRecordTime(rec);

    const outer = document.createElement("div");
    outer.className = "vt-log-row";
    outer.style.border = "1px solid rgba(235,245,255,.16)";
    outer.style.borderRadius = "18px";
    outer.style.padding = "12px 12px";
    outer.style.margin = "10px 0";
    outer.style.background = "rgba(12,21,40,.35)";
    outer.style.backdropFilter = "blur(8px)";

    const top = document.createElement("div");
    top.style.display = "flex";
    top.style.alignItems = "baseline";
    top.style.justifyContent = "space-between";
    top.style.gap = "10px";

    const dt = document.createElement("div");
    dt.style.fontSize = "14px";
    dt.style.opacity = "0.9";
    dt.textContent = fmtDateTime(ts);

    const vit = document.createElement("div");
    vit.style.fontSize = "14px";
    vit.style.opacity = "0.95";
    const bpText = (sys != null && dia != null) ? `${fmt2(sys)}/${fmt2(dia)}` : "--/--";
    const hrText = (hr != null) ? `${fmt2(hr)}` : "--";
    vit.textContent = `BP ${bpText}  •  HR ${hrText}`;

    top.appendChild(dt);
    top.appendChild(vit);

    outer.appendChild(top);

    if (notes && String(notes).trim().length) {
      const n = document.createElement("div");
      n.style.marginTop = "8px";
      n.style.fontSize = "13px";
      n.style.opacity = "0.75";
      n.textContent = String(notes).trim();
      outer.appendChild(n);
    }

    return outer;
  }

  async function render() {
    const root = findLogRoot();
    if (!root) return;

    const loading = findLoadingLabel(root);
    const host = findListHost(root);

    // Always clear "Loading..." once we attempt to render
    if (loading) loading.style.display = "none";

    if (!host) return;

    // Prevent duplicate renders stacking forever
    host.innerHTML = "";

    let rows = [];
    try {
      rows = await fetchRecords();
    } catch (err) {
      const msg = document.createElement("div");
      msg.style.padding = "12px";
      msg.style.opacity = "0.9";
      msg.textContent = "Log failed to load records.";
      host.appendChild(msg);
      return;
    }

    // Sort newest first (stable)
    rows = rows.slice().sort((a, b) => {
      const ta = Number(getRecordTime(a) || 0);
      const tb = Number(getRecordTime(b) || 0);
      return tb - ta;
    });

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.style.padding = "14px";
      empty.style.opacity = "0.8";
      empty.textContent = "No readings yet.";
      host.appendChild(empty);
      return;
    }

    // Render list
    for (const rec of rows) {
      host.appendChild(buildRow(rec));
    }
  }

  // Public API
  window.VTLog = Object.freeze({
    onShow: render,
    render
  });

  // Auto-render once on load if panel is active
  try {
    const p = $("panelLog");
    if (p && p.classList.contains("active")) {
      render();
    }
  } catch (_) {}

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.025e (unstick log + robust render)
Schema order: File 7 of 10
Prev: js/gestures.js
Next: js/panels.js
*/
```0
