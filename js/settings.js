/* File: js/settings.js */
/*
Purpose of this header: verification metadata for this edit (not instructions).
Edited: 2026-01-20
Change focus: create Settings module to store/manage medication name list for Add/Edit prefill.
*/

(function () {
  "use strict";

  const LS_KEY = "vt_settings_v1";

  const DEFAULTS = Object.freeze({
    medNames: []
  });

  let cache = null;

  function safeParse(json) {
    try { return JSON.parse(json); } catch (_) { return null; }
  }

  function load() {
    if (cache) return cache;
    const raw = localStorage.getItem(LS_KEY);
    const obj = raw ? safeParse(raw) : null;
    const merged = {
      medNames: Array.isArray(obj && obj.medNames) ? obj.medNames.slice() : []
    };
    merged.medNames = normalizeList(merged.medNames);
    cache = merged;
    return cache;
  }

  function save() {
    try {
      const s = load();
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch (_) {}
  }

  function normalizeOne(s) {
    return String(s || "").trim();
  }

  function normalizeList(arr) {
    const out = [];
    const seen = new Set();
    for (const x of (arr || [])) {
      const v = normalizeOne(x);
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    out.sort((a,b) => a.localeCompare(b));
    return out;
  }

  function getMedNames() {
    const s = load();
    return s.medNames.slice();
  }

  function addMedName(name) {
    const v = normalizeOne(name);
    if (!v) return false;
    const s = load();
    s.medNames.push(v);
    s.medNames = normalizeList(s.medNames);
    save();
    notify();
    return true;
  }

  function removeMedName(name) {
    const v = normalizeOne(name);
    if (!v) return false;
    const s = load();
    const key = v.toLowerCase();
    s.medNames = (s.medNames || []).filter(x => String(x).toLowerCase() !== key);
    save();
    notify();
    return true;
  }

  function notify() {
    try {
      document.dispatchEvent(new CustomEvent("vt:settingsChanged", { detail: { when: Date.now() } }));
    } catch (_) {}
  }

  // --- UI wiring for panelSettings (best-effort; safe no-op if elements missing)
  function $(id){ return document.getElementById(id); }

  function renderMedList() {
    const host = $("medNameListSetting");
    if (!host) return;

    const meds = getMedNames();
    host.innerHTML = "";

    if (!meds.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No medication names saved yet.";
      host.appendChild(empty);
      return;
    }

    meds.forEach(name => {
      const row = document.createElement("div");
      row.className = "settingsItem";

      const left = document.createElement("div");
      left.className = "settingsItemName";
      left.textContent = name;

      const btn = document.createElement("button");
      btn.className = "settingsItemBtn danger";
      btn.type = "button";
      btn.textContent = "Remove";
      btn.addEventListener("click", function () {
        removeMedName(name);
        renderMedList();
      });

      row.appendChild(left);
      row.appendChild(btn);
      host.appendChild(row);
    });
  }

  function bindOnce(el, key, handler, opts) {
    if (!el) return;
    const k = `vtBound_${key}`;
    try {
      if (el.dataset && el.dataset[k] === "1") return;
      if (el.dataset) el.dataset[k] = "1";
    } catch (_) {}
    el.addEventListener("click", handler, opts || false);
  }

  function bindUI() {
    const inName = $("inMedNameSetting");
    const btnAdd = $("btnAddMedNameSetting");

    bindOnce(btnAdd, "addMedNameSetting", function () {
      const v = inName ? String(inName.value || "").trim() : "";
      if (!v) return;
      addMedName(v);
      if (inName) inName.value = "";
      renderMedList();
    });

    // Enter key adds too
    if (inName) {
      inName.addEventListener("keydown", function (e) {
        if (e && e.key === "Enter") {
          try { e.preventDefault(); } catch (_) {}
          const v = String(inName.value || "").trim();
          if (!v) return;
          addMedName(v);
          inName.value = "";
          renderMedList();
        }
      });
    }

    renderMedList();
  }

  // Public API
  window.VTSettings = Object.freeze({
    getMedNames: getMedNames,
    addMedName: addMedName,
    removeMedName: removeMedName
  });

  // React to changes
  document.addEventListener("vt:settingsChanged", function () {
    renderMedList();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUI, { passive: true });
  } else {
    bindUI();
  }

})();
