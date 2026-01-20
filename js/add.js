/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/add.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 9 of 9 (P0)
Prev file: js/log.js (File 8 of 9)
Next file: (end of pass)

FILE ROLE (LOCKED)
- Owns ONLY the Add Reading panel UI + Save action (minimal schema: ts/sys/dia/hr/notes).
- Must NOT implement swipe/rotation.
- Must NOT implement delete (future pass).
- Edit support is LIMITED to: open + prefill + update-if-available; otherwise warn.

v2.026a — Change Log (THIS FILE ONLY)
1) Carries forward Add panel UI + Save action (no swipe changes).
2) Maintains cosmetic softening + single-form enforcement.
3) Maintains Home routing via panels.js closeAdd() when available.

v2.026a+ (THIS FILE ONLY)
4) Adds EDIT mode support for Log “Edit” hyperlink:
   - VTAdd.openEdit({ id | ts | record }) opens Add panel and pre-fills.
   - Save performs update ONLY if VTStore update method exists; otherwise warns.
   - Dosage remains in notes (no dosage field).
*/

(function () {
  "use strict";

  const btnSave = document.getElementById("btnSaveReading");
  const btnHome = document.getElementById("btnHomeFromAdd");
  const bodyEl = document.getElementById("addBody");
  const cardEl = document.getElementById("addCard");

  let saving = false;

  // Edit mode state (no schema changes)
  const EDIT = {
    active: false,
    key: null,      // { id } or { ts } or best-effort key
    original: null  // normalized record snapshot
  };

  function safeAlert(msg) {
    try { alert(msg); } catch (_) {}
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

  function ensureStoreReady() {
    return !!(window.VTStore &&
      typeof window.VTStore.init === "function" &&
      typeof window.VTStore.add === "function");
  }

  async function initStoreIfNeeded() {
    try {
      if (window.VTStore && typeof window.VTStore.init === "function") {
        await window.VTStore.init();
      }
    } catch (_) {}
  }

  function nowTs() {
    return Date.now();
  }

  function defaultRecord() {
    return {
      ts: nowTs(),
      sys: null,
      dia: null,
      hr: null,
      notes: ""
    };
  }

  function softenAddCard() {
    // Purely cosmetic. Does not depend on CSS presence.
    if (!cardEl) return;
    try {
      cardEl.style.background = "rgba(0,0,0,0.14)";
      cardEl.style.border = "1px solid rgba(255,255,255,0.12)";
      cardEl.style.boxShadow = "inset 0 0 0 1px rgba(235,245,255,.08)";
      cardEl.style.backdropFilter = "blur(6px)";
      cardEl.style.webkitBackdropFilter = "blur(6px)";
    } catch (_) {}
  }

  function ensureFormPresent() {
    if (!bodyEl) return;

    // If already built, do nothing.
    if (document.getElementById("addForm")) return;

    const form = document.createElement("div");
    form.id = "addForm";
    form.className = "addForm";

    form.innerHTML = `
      <div class="addGrid">
        <label class="addField">
          <div class="addLabel">Systolic</div>
          <input id="inSys" inputmode="numeric" class="addInput" placeholder="e.g., 132" />
        </label>

        <label class="addField">
          <div class="addLabel">Diastolic</div>
          <input id="inDia" inputmode="numeric" class="addInput" placeholder="e.g., 84" />
        </label>

        <label class="addField">
          <div class="addLabel">Heart Rate</div>
          <input id="inHr" inputmode="numeric" class="addInput" placeholder="e.g., 74" />
        </label>

        <label class="addField addNotes">
          <div class="addLabel">Notes</div>
          <textarea id="inNotes" class="addTextArea" placeholder="Symptoms, meds, context..."></textarea>
        </label>
      </div>
    `;

    // Insert form at top of card so Save stays below it.
    if (cardEl) {
      cardEl.insertBefore(form, cardEl.firstChild);
    } else {
      bodyEl.appendChild(form);
    }

    // Further soften form controls (safe, minimal)
    try {
      const inputs = form.querySelectorAll("input,textarea");
      inputs.forEach(el => {
        el.style.background = "rgba(8,12,20,0.45)";
        el.style.borderColor = "rgba(235,245,255,0.16)";
      });
    } catch (_) {}
  }

  function readNumber(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const raw = String(el.value || "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function readText(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return String(el.value || "").trim();
  }

  function writeNumber(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      el.value = (v == null || v === "") ? "" : String(v);
    } catch (_) {}
  }

  function writeText(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      el.value = (v == null) ? "" : String(v);
    } catch (_) {}
  }

  function clearInputs() {
    const ids = ["inSys", "inDia", "inHr", "inNotes"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }
  }

  function setSaveEnabled(on) {
    if (!btnSave) return;
    try {
      btnSave.disabled = !on;
      btnSave.style.opacity = on ? "" : "0.65";
    } catch (_) {}
  }

  function setSaveLabelEditing(isEditing) {
    if (!btnSave) return;
    try {
      btnSave.textContent = isEditing ? "Save Changes" : "Save";
    } catch (_) {}
  }

  function setHeaderEditing(isEditing) {
    try {
      const title = document.querySelector("#panelAdd .screenTitle");
      if (!title) return;
      title.textContent = isEditing ? "Edit Reading" : "Add Reading";
    } catch (_) {}
  }

  function normalizeRecord(r) {
    // Be tolerant: accept {ts/sys/dia/hr/notes} or nested structures.
    const ts = (r && typeof r.ts === "number") ? r.ts : null;
    const sys = (r && typeof r.sys === "number") ? r.sys : (r && typeof r.systolic === "number" ? r.systolic : null);
    const dia = (r && typeof r.dia === "number") ? r.dia : (r && typeof r.diastolic === "number" ? r.diastolic : null);
    const hr  = (r && typeof r.hr  === "number") ? r.hr  : (r && typeof r.heartRate === "number" ? r.heartRate : null);
    const notes = (r && (r.notes ?? r.note ?? r.comment ?? r.memo)) ?? "";
    return { ts, sys, dia, hr, notes: String(notes || "") };
  }

  async function getAllRecords() {
    try {
      if (!window.VTStore || typeof window.VTStore.getAll !== "function") return [];
      const res = window.VTStore.getAll();
      const arr = (res && typeof res.then === "function") ? await res : res;
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function findByIdOrTs(all, key) {
    if (!Array.isArray(all) || !key) return null;

    // Prefer id match if present
    if (key.id != null) {
      for (const r of all) {
        if (r && (r.id === key.id || r._id === key.id)) return r;
      }
    }

    // Fallback to ts match
    if (key.ts != null) {
      for (const r of all) {
        const t = (r && typeof r.ts === "number") ? r.ts : null;
        if (t === key.ts) return r;
      }
    }

    return null;
  }

  function enterEditMode(key, record) {
    EDIT.active = true;
    EDIT.key = key || null;
    EDIT.original = record || null;

    setSaveLabelEditing(true);
    setHeaderEditing(true);

    if (record) {
      writeNumber("inSys", record.sys);
      writeNumber("inDia", record.dia);
      writeNumber("inHr",  record.hr);
      writeText("inNotes", record.notes || "");
    }
  }

  function exitEditMode() {
    EDIT.active = false;
    EDIT.key = null;
    EDIT.original = null;

    setSaveLabelEditing(false);
    setHeaderEditing(false);
  }

  async function openAddNew() {
    ensureFormPresent();
    exitEditMode();
    clearInputs();

    try {
      if (window.VTPanels && typeof window.VTPanels.openAdd === "function") {
        window.VTPanels.openAdd(true);
        return;
      }
      if (window.VTPanels && typeof window.VTPanels.go === "function") {
        window.VTPanels.go("add", true);
        return;
      }
    } catch (_) {}
  }

  async function openEdit(payload) {
    // payload may be: { id }, { ts }, { record }, raw record
    ensureFormPresent();
    await initStoreIfNeeded();

    let key = null;
    let rec = null;

    try {
      if (payload && payload.record && typeof payload.record === "object") {
        rec = normalizeRecord(payload.record);
        key = { id: payload.id ?? payload.record.id ?? payload.record._id ?? null, ts: payload.ts ?? payload.record.ts ?? null };
      } else if (payload && typeof payload === "object" && ("ts" in payload || "sys" in payload || "dia" in payload || "hr" in payload || "notes" in payload)) {
        // raw record-like object
        rec = normalizeRecord(payload);
        key = { id: payload.id ?? payload._id ?? null, ts: payload.ts ?? null };
      } else if (payload && typeof payload === "object" && ("id" in payload || "ts" in payload)) {
        key = { id: payload.id ?? null, ts: payload.ts ?? null };
      }

      if (!rec && key) {
        const all = await getAllRecords();
        const found = findByIdOrTs(all, key);
        if (found) rec = normalizeRecord(found);
      }

      if (!rec) {
        safeAlert("Edit failed: could not locate that record.");
        return;
      }

      // Open Add panel (do not change swipe logic)
      try {
        if (window.VTPanels && typeof window.VTPanels.openAdd === "function") {
          window.VTPanels.openAdd(true);
        } else if (window.VTPanels && typeof window.VTPanels.go === "function") {
          window.VTPanels.go("add", true);
        }
      } catch (_) {}

      enterEditMode(key, rec);
    } catch (_) {
      safeAlert("Edit failed.");
    }
  }

  function hasUpdateAPI() {
    const s = window.VTStore || {};
    return (typeof s.update === "function") ||
           (typeof s.put === "function") ||
           (typeof s.set === "function") ||
           (typeof s.upsert === "function");
  }

  async function updateRecord(key, rec) {
    const s = window.VTStore || {};
    if (typeof s.update === "function") return s.update(key, rec);
    if (typeof s.put === "function") return s.put(key, rec);
    if (typeof s.set === "function") return s.set(key, rec);
    if (typeof s.upsert === "function") return s.upsert(key, rec);
    throw new Error("No update API");
  }

  async function save() {
    if (saving) return;

    if (!ensureStoreReady()) {
      safeAlert("Storage is not ready (VTStore). Fix store.js/storage.js wiring first.");
      return;
    }

    saving = true;
    setSaveEnabled(false);

    await initStoreIfNeeded();

    const rec = defaultRecord();
    rec.sys = readNumber("inSys");
    rec.dia = readNumber("inDia");
    rec.hr  = readNumber("inHr");
    rec.notes = readText("inNotes");

    const hasSys = rec.sys != null;
    const hasDia = rec.dia != null;

    // Allow notes-only OR vitals; but if BP is entered, require both sys+dia.
    if ((hasSys && !hasDia) || (!hasSys && hasDia)) {
      safeAlert("If entering BP, please enter BOTH systolic and diastolic.");
      saving = false;
      setSaveEnabled(true);
      return;
    }

    try {
      if (EDIT.active) {
        if (!hasUpdateAPI()) {
          safeAlert("Edit is not available yet (VTStore has no update method).");
          return;
        }

        // Preserve original timestamp if we have one; otherwise keep the new ts.
        const tsToKeep =
          (EDIT.original && typeof EDIT.original.ts === "number") ? EDIT.original.ts :
          (EDIT.key && typeof EDIT.key.ts === "number") ? EDIT.key.ts :
          null;

        if (tsToKeep != null) rec.ts = tsToKeep;

        const key = EDIT.key || { ts: rec.ts };

        await updateRecord(key, rec);

        // Refresh features if present
        try { window.VTLog?.onShow?.(); } catch (_) {}
        try { window.VTChart?.onShow?.(); } catch (_) {}

        safeAlert("Saved.");
        exitEditMode();
        clearInputs();
        return;
      }

      await window.VTStore.add(rec);

      // Refresh features if present
      try { window.VTLog?.onShow?.(); } catch (_) {}
      try { window.VTChart?.onShow?.(); } catch (_) {}

      safeAlert("Saved.");
      clearInputs();
    } catch (e) {
      safeAlert("Save failed. Check console for details.");
      try { console.error(e); } catch (_) {}
    } finally {
      saving = false;
      setSaveEnabled(true);
    }
  }

  function goHome() {
    // Prefer panels closeAdd() so panels.js can restore lastMainPanel correctly.
    try {
      if (window.VTPanels) {
        if (typeof window.VTPanels.closeAdd === "function") {
          window.VTPanels.closeAdd(true);
          return;
        }
        if (typeof window.VTPanels.go === "function") {
          window.VTPanels.go("home", true);
          return;
        }
      }
    } catch (_) {}

    // Fallback DOM toggle (non-invasive)
    try {
      document.getElementById("panelAdd")?.classList.remove("active");
      document.getElementById("panelHome")?.classList.add("active");
    } catch (_) {}
  }

  function bind() {
    softenAddCard();
    ensureFormPresent();

    bindOnce(btnSave, "saveReading", (e) => {
      try { e.preventDefault(); } catch (_) {}
      save();
    });

    bindOnce(btnHome, "homeFromAdd", (e) => {
      try { e.preventDefault(); } catch (_) {}
      goHome();
    });

    // Listen for log edit requests (non-swipe, decoupled)
    document.addEventListener("vt:editRequested", function (e) {
      try {
        if (!e || !e.detail) return;
        openEdit(e.detail);
      } catch (_) {}
    });

    setSaveEnabled(true);
    setSaveLabelEditing(false);
    setHeaderEditing(false);
  }

  // Public API (for log hyperlink wiring)
  window.VTAdd = Object.freeze({
    openNew: openAddNew,
    openEdit: openEdit
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { passive: true });
  } else {
    bind();
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/add.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 9 of 9 (P0)
Prev file: js/log.js (File 8 of 9)
Next file: (end of pass)
*/
```0
