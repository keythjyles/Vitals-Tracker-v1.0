/* File: js/log.js */
/*
Vitals Tracker - Log Renderer

Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.025e

FILE ROLE (LOCKED)
- Owns Log list rendering only (rows/cards, filters UI hookup, empty states).
- Must NOT own storage implementation (store.js/storage.js).
- Must NOT own panel navigation (panels.js).
- Must NOT implement swipe logic (gestures.js).

CURRENT FIX SCOPE (Render Recovery)
- Ensure Log renders when Log panel becomes visible (VTLog.onShow()).
- Avoid duplicated event bindings (idempotent init).
- Use VTStore as the data source.
- Show sane empty-state if no records.
- Keep it resilient to minor schema differences (sys/dia/hr keys).

Pass: Render Recovery + Swipe Feel
Pass order: File 7 of 9
Prev file: js/chart.js (File 6 of 9)
Next file: js/store.js (File 8 of 9)
*/

(function () {
  "use strict";

  var inited = false;

  function $(id) { return document.getElementById(id); }

  function setLoading(text) {
    var el = $("logLoading");
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "" : "none";
  }

  function safeGetAll() {
    try {
      if (window.VTStore && typeof window.VTStore.getAll === "function") {
        return window.VTStore.getAll();
      }
    } catch (_) {}
    return [];
  }

  function norm(r) {
    // timestamp
    var t = r && (r.ts || r.time || r.timestamp || r.date || r.datetime);
    var ms = 0;
    if (typeof t === "number") ms = t;
    else if (typeof t === "string") {
      var p = Date.parse(t);
      if (!isNaN(p)) ms = p;
    }
    if (!ms && r && typeof r.createdAt === "number") ms = r.createdAt;
    if (!ms && r && typeof r.created === "number") ms = r.created;

    var sys = (r && (r.sys != null ? r.sys : r.systolic));
    var dia = (r && (r.dia != null ? r.dia : r.diastolic));
    var hr = (r && (r.hr != null ? r.hr : r.heartRate));

    sys = sys != null ? Number(sys) : null;
    dia = dia != null ? Number(dia) : null;
    hr = hr != null ? Number(hr) : null;

    if (isNaN(sys)) sys = null;
    if (isNaN(dia)) dia = null;
    if (isNaN(hr)) hr = null;

    var notes = r && (r.notes || r.note || "");
    var symptoms = r && (r.symptoms || r.symptom || r.sx || "");

    return {
      ms: ms,
      sys: sys,
      dia: dia,
      hr: hr,
      notes: (notes == null ? "" : String(notes)),
      symptoms: symptoms
    };
  }

  function fmtDate(ms) {
    try {
      var d = new Date(ms);
      return d.toLocaleString();
    } catch (_) {
      return "";
    }
  }

  function clearList(host) {
    while (host.firstChild) host.removeChild(host.firstChild);
  }

  function rowEl(p) {
    var card = document.createElement("div");
    card.className = "logRow";

    var top = document.createElement("div");
    top.className = "logRowTop";

    var dt = document.createElement("div");
    dt.className = "logRowDate";
    dt.textContent = p.ms ? fmtDate(p.ms) : "(no date)";

    var bp = document.createElement("div");
    bp.className = "logRowBP";
    if (p.sys != null && p.dia != null) bp.textContent = p.sys + "/" + p.dia;
    else if (p.sys != null) bp.textContent = String(p.sys);
    else bp.textContent = "--";

    var hr = document.createElement("div");
    hr.className = "logRowHR";
    hr.textContent = (p.hr != null ? ("HR " + p.hr) : "HR --");

    top.appendChild(dt);
    top.appendChild(bp);
    top.appendChild(hr);

    var mid = document.createElement("div");
    mid.className = "logRowMid";

    var sx = document.createElement("div");
    sx.className = "logRowSx";
    sx.textContent = p.symptoms ? String(p.symptoms) : "";

    var nt = document.createElement("div");
    nt.className = "logRowNotes";
    nt.textContent = p.notes ? p.notes : "";

    if (sx.textContent) mid.appendChild(sx);
    if (nt.textContent) mid.appendChild(nt);

    card.appendChild(top);
    if (mid.childNodes.length) card.appendChild(mid);

    // Optional edit hook (future): tap to edit
    card.addEventListener("click", function () {
      try {
        if (window.VTUI && typeof window.VTUI.openEditForTimestamp === "function" && p.ms) {
          window.VTUI.openEditForTimestamp(p.ms);
        }
      } catch (_) {}
    });

    return card;
  }

  function render() {
    var host = $("logList");
    if (!host) return;

    var recs = safeGetAll();
    var pts = [];

    for (var i = 0; i < recs.length; i++) {
      var p = norm(recs[i]);
      if (!p.ms) continue;
      pts.push(p);
    }

    pts.sort(function (a, b) { return b.ms - a.ms; }); // newest first

    clearList(host);

    if (!pts.length) {
      setLoading("No readings yet.");
      return;
    }

    setLoading("");

    for (var j = 0; j < pts.length; j++) {
      host.appendChild(rowEl(pts[j]));
    }
  }

  function onShow() {
    // Safety net: ensure store init if needed
    try {
      if (window.VTStore && typeof window.VTStore.init === "function") {
        window.VTStore.init();
      }
    } catch (_) {}

    render();
  }

  function init() {
    if (inited) return;
    inited = true;

    // Re-render on resize only if you want; log is DOM, so usually fine.
    window.addEventListener("resize", function () {
      try { render(); } catch (_) {}
    });
  }

  window.VTLog = {
    init: init,
    onShow: onShow,
    render: render
  };

})();

/*
Vitals Tracker - EOF Version/Detail Notes (REQUIRED)
File: js/log.js
App Version Authority: js/version.js
Pass: Render Recovery + Swipe Feel
Pass order: File 7 of 9
Prev file: js/chart.js (File 6 of 9)
Next file: js/store.js (File 8 of 9)
*/
