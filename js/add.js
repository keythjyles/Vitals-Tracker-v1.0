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
- Must NOT implement delete/edit (future pass).

v2.026a — Change Log (THIS FILE ONLY)
1) Carries forward Add panel UI + Save action (no swipe changes).
2) Maintains cosmetic softening + single-form enforcement.
3) Maintains Home routing via panels.js closeAdd() when available.
*/

(function () {
  "use strict";

  const btnSave = document.getElementById("btnSaveReading");
  const btnHome = document.getElementById("btnHomeFromAdd");
  const bodyEl = document.getElementById("addBody");
  const cardEl = document.getElementById("addCard");

  let saving = false;

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

    setSaveEnabled(true);
  }

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
