/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/add.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 9 of 9 (P0)
Prev file: js/log.js (File 8 of 9)
Next file: (end of pass)
*/

(function () {
  "use strict";

  const btnSave = document.getElementById("btnSaveReading");
  const btnHome = document.getElementById("btnHomeFromAdd");
  const bodyEl = document.getElementById("addBody");
  const cardEl = document.getElementById("addCard");

  function safeAlert(msg) {
    try { alert(msg); } catch (_) {}
  }

  function ensureStoreReady() {
    return (window.VTStore && typeof window.VTStore.add === "function" && typeof window.VTStore.init === "function");
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
    // Minimal record schema used by chart.js + log.js
    // (sys, dia, hr, ts, notes)
    return {
      ts: nowTs(),
      sys: null,
      dia: null,
      hr: null,
      notes: ""
    };
  }

  function buildBasicForm() {
    if (!bodyEl) return;

    // If a real form already exists, do not replace it.
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

    // Insert above the Save button/card text so the panel is usable immediately
    if (cardEl && cardEl.parentNode) {
      cardEl.insertBefore(form, cardEl.firstChild);
    } else {
      bodyEl.appendChild(form);
    }
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

  async function save() {
    if (!ensureStoreReady()) {
      safeAlert("Storage is not ready (VTStore). Fix store.js/storage.js wiring first.");
      return;
    }

    await initStoreIfNeeded();

    const rec = defaultRecord();
    rec.sys = readNumber("inSys");
    rec.dia = readNumber("inDia");
    rec.hr  = readNumber("inHr");
    rec.notes = readText("inNotes");

    // Basic validation: allow saving notes-only, but if any BP is entered, require both sys & dia.
    const hasSys = rec.sys != null;
    const hasDia = rec.dia != null;

    if ((hasSys && !hasDia) || (!hasSys && hasDia)) {
      safeAlert("If entering BP, please enter BOTH systolic and diastolic.");
      return;
    }

    try {
      await window.VTStore.add(rec);

      // Refresh log/chart if present
      try { window.VTLog?.onShow?.(); } catch (_) {}
      try { window.VTChart?.onShow?.(); } catch (_) {}

      safeAlert("Saved.");

      // Clear inputs for quick repeats
      const ids = ["inSys", "inDia", "inHr", "inNotes"];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

    } catch (e) {
      safeAlert("Save failed. Check console for details.");
      try { console.error(e); } catch (_) {}
    }
  }

  function goHome() {
    if (window.VTPanels && typeof window.VTPanels.go === "function") {
      window.VTPanels.go("home", true);
      return;
    }
    // Fallback
    try {
      document.getElementById("panelAdd")?.classList.remove("active");
      document.getElementById("panelHome")?.classList.add("active");
    } catch (_) {}
  }

  function bind() {
    buildBasicForm();

    if (btnSave) {
      btnSave.addEventListener("click", (e) => {
        e.preventDefault();
        save();
      }, false);
    }

    if (btnHome) {
      btnHome.addEventListener("click", (e) => {
        e.preventDefault();
        goHome();
      }, false);
    }
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
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 9 of 9 (P0)
Prev file: js/log.js (File 8 of 9)
Next file: (end of pass)
*/
