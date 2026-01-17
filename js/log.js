/* ------------------------------------------------------------
   Vitals Tracker — js/log.js
   Mode: READ-ONLY (legacy/localStorage compatible)
   Purpose: Render Log list + simple search/filter without writes
   ------------------------------------------------------------ */

(function () {
  "use strict";

  const NS = (window.VT = window.VT || {});
  const LOG = (NS.log = NS.log || {});

  // ---- Utilities ----
  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (children || []).forEach((c) => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }

  function safeJSONParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function normalizeRecord(r) {
    if (!r || typeof r !== "object") return null;

    // Timestamp normalization
    const ts =
      r.ts || r.timestamp || r.time || r.datetime || r.dateTime || r.createdAt || r.created ||
      r.iso || r.when || r.at || null;

    let t = null;
    if (typeof ts === "number") t = ts;
    else if (typeof ts === "string") {
      const d = Date.parse(ts);
      if (!Number.isNaN(d)) t = d;
    }

    // BP normalization
    const sys = num(
      r.sys ?? r.systolic ?? r.sbp ?? r.SYS ?? r.Systolic ?? (r.bp && r.bp.sys) ?? (r.bp && r.bp.systolic)
    );
    const dia = num(
      r.dia ?? r.diastolic ?? r.dbp ?? r.DIA ?? r.Diastolic ?? (r.bp && r.bp.dia) ?? (r.bp && r.bp.diastolic)
    );

    // HR normalization
    const hr = num(r.hr ?? r.heartRate ?? r.pulse ?? r.HR ?? r.Pulse);

    const symptoms = normalizeSymptoms(r.symptoms ?? r.symptom ?? r.sx ?? r.Symptoms);
    const notes = (r.notes ?? r.note ?? r.comment ?? r.comments ?? "").toString();

    // Keep original too
    return {
      _raw: r,
      t,
      sys,
      dia,
      hr,
      symptoms,
      notes
    };
  }

  function normalizeSymptoms(s) {
    if (!s) return [];
    if (Array.isArray(s)) return s.map(String).filter(Boolean);
    if (typeof s === "string") {
      // allow comma/pipe/newline separated
      return s.split(/[,|;\n]+/g).map((x) => x.trim()).filter(Boolean);
    }
    if (typeof s === "object") {
      // allow map of {name:true}
      return Object.keys(s).filter((k) => !!s[k]).map(String);
    }
    return [];
  }

  function num(v) {
    if (v === 0) return 0;
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function fmtDateTime(ms) {
    if (!ms || !Number.isFinite(ms)) return "—";
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    let hh = d.getHours();
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12; if (hh === 0) hh = 12;
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${String(hh).padStart(2, "0")}:${mi} ${ampm}`;
  }

  function getRootPanelContainer() {
    // Try common containers used in your app shell
    return (
      document.querySelector("[data-panel='log']") ||
      document.querySelector("#panel-log") ||
      document.querySelector("#logPanel") ||
      document.querySelector("#log-panel") ||
      document.querySelector(".panel.is-log") ||
      document.querySelector(".panel[data-name='Log']") ||
      document.querySelector(".panel[data-name='log']") ||
      document.querySelector(".panel[data-panel='log']") ||
      // fallback: active/visible panel
      document.querySelector(".panel.active") ||
      document.querySelector(".panel.is-active") ||
      document.querySelector(".panel")
    );
  }

  // ---- Data access (READ ONLY) ----
  async function readAllRecordsReadOnly() {
    // Prefer storage bridge if present
    const S = NS.storage;

    try {
      if (S && typeof S.readAll === "function") {
        const raw = await S.readAll();
        return Array.isArray(raw) ? raw : [];
      }
      if (S && typeof S.getAllReadOnly === "function") {
        const raw = await S.getAllReadOnly();
        return Array.isArray(raw) ? raw : [];
      }
      if (S && typeof S.getAll === "function") {
        const raw = await S.getAll();
        return Array.isArray(raw) ? raw : [];
      }
      if (S && typeof S.peekLegacy === "function") {
        const raw = await S.peekLegacy();
        return Array.isArray(raw) ? raw : [];
      }
    } catch (e) {
      // fall through to localStorage direct
    }

    // Direct legacy localStorage fallback (your screenshot shows vitals_tracker_records*)
    const keysToTry = [
      "vitals_tracker_records",
      "vitals_tracker_records_v1",
      "vitals_tracker_records_v1_18",
      "vitals_tracker_records_v1_19",
      "vitals_tracker_records_v1_19B",
      "vitals_tracker_records_v1_19B44"
    ];

    for (const k of keysToTry) {
      const s = localStorage.getItem(k);
      if (!s) continue;
      const parsed = safeJSONParse(s);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.records)) return parsed.records;
    }

    return [];
  }

  // ---- Rendering ----
  function buildUI(container) {
    // Create a minimal, readable Log UI
    const wrap = el("div", { class: "vt-log-ro", style: "padding:14px; max-width:900px;" });

    const title = el("div", {
      class: "vt-log-title",
      style: "font-weight:700; font-size:18px; margin:4px 0 10px 0;"
    }, ["Log (Read-Only)"]);

    const controls = el("div", {
      class: "vt-log-controls",
      style: "display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:10px;"
    });

    const q = el("input", {
      type: "search",
      placeholder: "Search notes/symptoms…",
      style:
        "flex:1 1 220px; min-width:220px; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.18); color:inherit;"
    });

    const dateFrom = el("input", {
      type: "date",
      style:
        "padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.18); color:inherit;"
    });

    const dateTo = el("input", {
      type: "date",
      style:
        "padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.18); color:inherit;"
    });

    const meta = el("div", { style: "opacity:.75; font-size:13px; margin:6px 0 10px 0;" }, ["Loading…"]);

    const list = el("div", { class: "vt-log-list", style: "display:flex; flex-direction:column; gap:10px;" });

    controls.appendChild(q);
    controls.appendChild(dateFrom);
    controls.appendChild(dateTo);

    wrap.appendChild(title);
    wrap.appendChild(controls);
    wrap.appendChild(meta);
    wrap.appendChild(list);

    // Mount: try to clear any placeholder content that blocks view
    try { container.innerHTML = ""; } catch {}
    container.appendChild(wrap);

    return { wrap, q, dateFrom, dateTo, meta, list };
  }

  function recordCard(r) {
    const dt = fmtDateTime(r.t);
    const bp = (r.sys != null && r.dia != null) ? `${r.sys}/${r.dia}` : "—";
    const hr = (r.hr != null) ? `${r.hr}` : "—";
    const sx = (r.symptoms && r.symptoms.length) ? r.symptoms.join(", ") : "—";
    const notes = (r.notes || "").trim() || "—";

    return el("div", {
      class: "vt-log-card",
      style:
        "border:1px solid rgba(255,255,255,.14); border-radius:16px; padding:12px 12px; background:rgba(0,0,0,.14);"
    }, [
      el("div", { style: "display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:8px;" }, [
        el("div", { style: "font-weight:700;" , text: dt }),
        el("div", { style: "opacity:.85; font-weight:700;" , text: `BP ${bp}  •  HR ${hr}` })
      ]),
      el("div", { style: "opacity:.85; font-size:13px; margin-bottom:6px;" }, [
        el("span", { style: "font-weight:700;" , text: "Symptoms: " }),
        el("span", { text: sx })
      ]),
      el("div", { style: "opacity:.85; font-size:13px;" }, [
        el("span", { style: "font-weight:700;" , text: "Notes: " }),
        el("span", { text: notes })
      ])
    ]);
  }

  function applyFilters(rows, q, fromVal, toVal) {
    const query = (q || "").trim().toLowerCase();
    let fromMs = null, toMs = null;

    if (fromVal) {
      const d = Date.parse(fromVal + "T00:00:00");
      if (!Number.isNaN(d)) fromMs = d;
    }
    if (toVal) {
      const d = Date.parse(toVal + "T23:59:59");
      if (!Number.isNaN(d)) toMs = d;
    }

    return rows.filter((r) => {
      if (!r) return false;
      if (fromMs != null && (r.t == null || r.t < fromMs)) return false;
      if (toMs != null && (r.t == null || r.t > toMs)) return false;

      if (!query) return true;

      const hay = [
        r.notes || "",
        (r.symptoms || []).join(" "),
        (r.sys != null && r.dia != null) ? `${r.sys}/${r.dia}` : "",
        (r.hr != null) ? `${r.hr}` : ""
      ].join(" ").toLowerCase();

      return hay.includes(query);
    });
  }

  async function render() {
    const container = getRootPanelContainer();
    if (!container) return;

    const ui = buildUI(container);

    let raw = await readAllRecordsReadOnly();
    let norm = raw.map(normalizeRecord).filter(Boolean);
    norm.sort((a, b) => (b.t || 0) - (a.t || 0));

    function update() {
      const filtered = applyFilters(norm, ui.q.value, ui.dateFrom.value, ui.dateTo.value);
      ui.meta.textContent = `Showing ${filtered.length} of ${norm.length} entries (read-only).`;
      ui.list.innerHTML = "";
      if (!filtered.length) {
        ui.list.appendChild(el("div", { style: "opacity:.75; padding:10px 2px;" }, ["No matching entries."]));
        return;
      }
      const frag = document.createDocumentFragment();
      for (const r of filtered) frag.appendChild(recordCard(r));
      ui.list.appendChild(frag);
    }

    ui.q.addEventListener("input", update);
    ui.dateFrom.addEventListener("change", update);
    ui.dateTo.addEventListener("change", update);

    update();
  }

  // Public API expected by other modules
  LOG.render = render;
  LOG.init = render;

  // Auto-render when log panel becomes active
  function tryAuto() {
    // If your panels system dispatches events, we listen.
    // Fallback: if user navigates to Log, our code can be called by app.js too.
    render();
  }

  document.addEventListener("vt:show:log", tryAuto);
  document.addEventListener("vt:panel:log", tryAuto);

  // Safe no-op unless this file is loaded while Log is visible
  // (If not visible, render() will still mount into the active panel fallback.)
})();
