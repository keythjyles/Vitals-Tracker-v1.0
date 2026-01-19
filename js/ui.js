/* File: js/ui.js */
/*
Vitals Tracker — UI Layer (Buttons + Home Pull-Refresh + Log Render)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

CURRENT UPGRADE — FILE TOUCH ORDER (LOCKED)
1) index.html
2) js/version.js
3) js/app.js
4) js/storage.js
5) js/store.js
6) js/state.js
7) js/chart.js
8) js/gestures.js
9) js/panels.js
10) js/ui.js    <-- THIS FILE

FILE ROLE (LOCKED)
- Owns UI-only behaviors:
  - Install button wiring (beforeinstallprompt)
  - Clear Data button wiring (localStorage + IndexedDB delete)
  - Exit button wiring (frozen known-good handler)
  - Home pull-to-refresh behavior (Home only; not charts/log)
  - Log rendering (minimal, reliable, no fancy UX) from VTStore.getAll()

v2.025h — Change Log (THIS FILE ONLY)
1) Restores Home pull-to-refresh (Home only).
2) Restores Install/Clear/Exit button wiring reliably.
3) Restores Log rendering so Log is not blank:
   - Populates #logCard with readable rows
   - Updates #logTopNote with record count + date range
4) Listens for "vt:panelChanged" to refresh Charts (via VTChart.onShow) and Log (via renderLog).

ANTI-DRIFT RULES
- Do NOT implement panel rotation swipe here (gestures.js owns that).
- Do NOT implement panel show/hide rules here (panels.js owns that).
- Do NOT implement chart drawing or chart gestures here (chart.js owns that).
- Do NOT write to storage beyond:
  - Clear Data (explicit user action)
- Do NOT hard-code version strings here (js/version.js wins).

Schema position:
File 10 of 10

Former file:
File 9 — js/panels.js

Next file:
(End of current 10-file stabilization pass)
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function vStr() {
    try { return window.VTVersion?.getVersionString?.() || "v?.???"; }
    catch (_) { return "v?.???"; }
  }

  /* =========================
     Install Button (PWA)
  ========================= */

  let deferredPrompt = null;

  function initInstall() {
    const btn = $("btnInstall");
    if (!btn) return;

    btn.disabled = true;

    window.addEventListener("beforeinstallprompt", (e) => {
      try {
        e.preventDefault();
        deferredPrompt = e;
        btn.disabled = false;
      } catch (_) {}
    });

    btn.addEventListener("click", async () => {
      try {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch (_) {
        // no-op
      } finally {
        deferredPrompt = null;
        btn.disabled = true;
      }
    });
  }

  /* =========================
     Clear Data (Explicit)
  ========================= */

  function initClearData() {
    const btn = $("btnClearData");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const ok = confirm("Clear all local data on this device?");
      if (!ok) return;

      // localStorage
      try { localStorage.clear(); } catch (_) {}

      // IndexedDB (best-effort; delete common names)
      try {
        if (window.indexedDB) {
          const dbNames = ["vitals_tracker_db", "VitalsTrackerDB", "vitals_tracker", "VT_DB"];
          for (const name of dbNames) {
            try { indexedDB.deleteDatabase(name); } catch (_) {}
          }
        }
      } catch (_) {}

      alert("Local data clear requested. Reloading now.");
      try { location.reload(); } catch (_) {}
    });
  }

  /* =========================
     Exit Button (FROZEN)
  ========================= */

  function initExit() {
    const btn = $("btnExit");
    if (!btn) return;

    // Known-good frozen behavior: window.close() + delayed alert fallback
    btn.addEventListener("click", () => {
      try {
        window.close();
        setTimeout(() => {
          alert("If the app did not close, use your device Back/Home button.");
        }, 300);
      } catch (_) {
        alert("Use your device Back/Home button to exit.");
      }
    });
  }

  /* =========================
     Home Pull-to-Refresh
     (Home only; does not
      interfere with swipe)
  ========================= */

  function initPullToRefresh() {
    const home = $("panelHome");
    const indicator = $("pullIndicator");
    const homeCard = $("homeCard");

    if (!home || !indicator) return;

    let startY = null;
    let armed = false;

    function canStart() {
      // Only when Home is active, and scrolled to top (if card scrolls)
      try {
        if (!home.classList.contains("active")) return false;
        if (homeCard && homeCard.scrollTop > 0) return false;
      } catch (_) {}
      return true;
    }

    home.addEventListener("touchstart", (e) => {
      try {
        if (!canStart()) return;
        if (!e.touches || e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        armed = false;
      } catch (_) {}
    }, { passive: true });

    home.addEventListener("touchmove", (e) => {
      try {
        if (startY == null) return;
        if (!e.touches || e.touches.length !== 1) return;

        const dy = e.touches[0].clientY - startY;
        if (dy <= 0) return;

        const h = Math.min(56, Math.floor(dy / 2));
        indicator.style.height = h + "px";
        armed = (h >= 40);
      } catch (_) {}
    }, { passive: true });

    home.addEventListener("touchend", () => {
      try {
        if (startY == null) return;
        const doReload = armed;

        startY = null;
        armed = false;
        indicator.style.height = "0px";

        if (doReload) {
          try { location.reload(); } catch (_) {}
        }
      } catch (_) {}
    }, { passive: true });
  }

  /* =========================
     Log Rendering (Minimal)
  ========================= */

  function parseTs(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return (v > 1e12 ? v : v * 1000);
    if (typeof v === "string") {
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }

  function extractTs(r) {
    return r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? r?.createdAt ?? r?.created_at ?? r?.iso ?? null;
  }

  function safeNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function extractBP(r) {
    const sys = safeNum(r?.sys ?? r?.systolic ?? r?.sbp ?? r?.SBP ?? (r?.bp && (r.bp.sys ?? r.bp.systolic)));
    const dia = safeNum(r?.dia ?? r?.diastolic ?? r?.dbp ?? r?.DBP ?? (r?.bp && (r.bp.dia ?? r.bp.diastolic)));
    return { sys, dia };
  }

  function extractHR(r) {
    return safeNum(r?.hr ?? r?.heartRate ?? r?.pulse ?? r?.HR ?? (r?.vitals && (r.vitals.hr ?? r.vitals.pulse)));
  }

  async function loadRecords() {
    try {
      if (window.VTStore?.init) await window.VTStore.init();
    } catch (_) {}

    try {
      if (window.VTStore?.getAll) return window.VTStore.getAll() || [];
    } catch (_) {}

    try {
      if (window.VTStorage?.getAllRecords) return await window.VTStorage.getAllRecords() || [];
    } catch (_) {}

    return [];
  }

  function formatWhen(ms) {
    try {
      const d = new Date(ms);
      const date = d.toLocaleDateString();
      const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${date} ${time}`;
    } catch (_) {
      return "";
    }
  }

  async function renderLog() {
    const panel = $("panelLog");
    if (!panel) return;

    const top = $("logTopNote");
    const card = $("logCard");

    if (!card) return;

    const raw = await loadRecords();

    const rows = [];
    for (const r of raw) {
      const ts = parseTs(extractTs(r));
      if (ts == null) continue;
      const bp = extractBP(r);
      const hr = extractHR(r);
      rows.push({
        ts,
        sys: bp.sys,
        dia: bp.dia,
        hr,
        note: (typeof r?.note === "string" ? r.note : (typeof r?.notes === "string" ? r.notes : ""))
      });
    }
    rows.sort((a, b) => b.ts - a.ts);

    if (top) {
      if (!rows.length) {
        top.textContent = `No records yet. (${vStr()})`;
      } else {
        const newest = rows[0].ts;
        const oldest = rows[rows.length - 1].ts;
        const a = new Date(oldest).toLocaleDateString();
        const b = new Date(newest).toLocaleDateString();
        top.textContent = `${rows.length} record(s) • ${a} → ${b} • ${vStr()}`;
      }
    }

    // Remove any previous render container (keep #logTopNote intact)
    let existing = $("logList");
    if (existing) existing.remove();

    const list = document.createElement("div");
    list.id = "logList";
    list.style.marginTop = "12px";
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "10px";

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.style.color = "rgba(235,245,255,0.62)";
      empty.style.fontWeight = "800";
      empty.style.letterSpacing = ".2px";
      empty.textContent = "Add a reading to start your log.";
      list.appendChild(empty);
      card.appendChild(list);
      return;
    }

    for (const it of rows) {
      const row = document.createElement("div");
      row.style.border = "1px solid rgba(235,245,255,0.16)";
      row.style.borderRadius = "16px";
      row.style.padding = "12px";
      row.style.background = "rgba(0,0,0,0.14)";

      const when = document.createElement("div");
      when.style.display = "flex";
      when.style.justifyContent = "space-between";
      when.style.gap = "10px";
      when.style.alignItems = "baseline";

      const left = document.createElement("div");
      left.style.fontWeight = "950";
      left.style.letterSpacing = ".2px";
      left.textContent = formatWhen(it.ts);

      const right = document.createElement("div");
      right.style.color = "rgba(235,245,255,0.72)";
      right.style.fontWeight = "900";
      right.style.letterSpacing = ".2px";

      const bpTxt = (it.sys != null && it.dia != null) ? `${it.sys}/${it.dia}` : (it.sys != null ? `${it.sys}/—` : "—/—");
      const hrTxt = (it.hr != null) ? ` HR ${it.hr}` : "";
      right.textContent = `BP ${bpTxt}${hrTxt}`;

      when.appendChild(left);
      when.appendChild(right);

      const note = document.createElement("div");
      note.style.marginTop = "6px";
      note.style.color = "rgba(235,245,255,0.58)";
      note.style.fontSize = "13px";
      note.style.lineHeight = "1.25";
      note.textContent = (it.note || "").trim() ? it.note.trim() : "";

      row.appendChild(when);
      if (note.textContent) row.appendChild(note);

      list.appendChild(row);
    }

    card.appendChild(list);
  }

  /* =========================
     Panel Change Listener
  ========================= */

  function initPanelListeners() {
    document.addEventListener("vt:panelChanged", (e) => {
      const active = e?.detail?.active;

      if (active === "charts") {
        try { window.VTChart?.onShow?.(); } catch (_) {}
      }

      if (active === "log") {
        renderLog();
      }
    });
  }

  /* =========================
     Boot
  ========================= */

  function init() {
    initInstall();
    initClearData();
    initExit();
    initPullToRefresh();
    initPanelListeners();

    // If Log is already active on load, render immediately.
    try {
      const log = $("panelLog");
      if (log && log.classList.contains("active")) renderLog();
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose minimal API (optional)
  window.VTUI = Object.freeze({
    renderLog
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/ui.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.025h (pull-to-refresh + log render + button wiring + vt:panelChanged listener)
Schema order: File 10 of 10
Former: js/panels.js (File 9)
Next: End of pass
*/
