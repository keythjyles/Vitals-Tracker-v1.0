/* 
Vitals Tracker — BOF (Wizard Add Pass Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260122-001
FileEditId: 10
Edited: 2026-01-22

Current file: js/add.js, File 1 of 3


Next file to fetch: js/store.js, File 2 of 3



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Beacon Sticky Notes (persist until user changes)
- Every file edit is its own Pass with a unique ImplementationId.
- Each Pass includes an explicit file list; even one file is “1 of 1.”
- Replace prior non-sticky header/footer content each Pass; keep only explicitly-sticky Beacon rules.
------------------------------------------------------------

Scope (this Pass)
- Wizard-driven Add flow with SAVE-PER-STEP compliance.
- Each Add tap starts a NEW wizard session (no resume).
- Save commits ONLY module-owned fields (patch semantics).
- Empty inputs NEVER overwrite prior saved values.
- Explicit clears are required to remove data.
- Symptoms-only, Mood-only, or Meds-only entries are allowed.
- Summary appears only after at least one Save.
- No Log work. No Chart work.
------------------------------------------------------------
*/

(function () {
  "use strict";

  // ---------- Wizard session (ephemeral only) ----------
  const WIZ = {
    step: 1,            // 1–5
    key: null,          // {ts} after first save
    createdTs: null,    // ts anchor
    lastSaved: null,    // last merged record snapshot
    hasSaved: false     // at least one Save occurred
  };

  // ---------- UI state (not persisted unless saved) ----------
  const UI = {
    symptoms: [],
    distressComputed: null,
    distressFinal: null,
    mood: null,
    meds: []
  };

  let saving = false;
  let bound = false;

  // ---------- utilities ----------
  const nowTs = () => Date.now();
  const clamp = (n, l, h) => Math.max(l, Math.min(h, Number(n)));
  const norm = (s) => String(s || "").trim();
  const isNum = (n) => typeof n === "number" && Number.isFinite(n);

  function $(id) {
    return document.getElementById(id);
  }

  function readNum(id) {
    const el = $(id);
    const v = el && typeof el.value === "string" ? el.value.trim() : "";
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function readTxt(id) {
    const el = $(id);
    return norm(el && typeof el.value === "string" ? el.value : "");
  }

  function ensureStore() {
    return window.VTStore && typeof window.VTStore.add === "function" && typeof window.VTStore.update === "function";
  }

  async function initStore() {
    try { await window.VTStore.init?.(); } catch (_) {}
  }

  function safeSetText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  // ---------- DOM injection (wizard skeleton) ----------
  function injectWizardUI() {
    const bodyEl = $("addBody");
    if (!bodyEl) return;

    // Replace any placeholder content deterministically.
    bodyEl.innerHTML = `
      <div class="addCard" id="addCard">
        <div class="addWizTopRow">
          <div class="muted" id="vtWizStep">Step 1 of 4</div>
          <button class="pillBtn" id="btnWizAbort" type="button">Close</button>
        </div>

        <!-- STEP 1: Vitals -->
        <div class="wizStep" id="wizStep1">
          <div class="addSectionTitle">Vitals</div>

          <div class="addGrid">
            <div class="addField">
              <label class="addLabel" for="inSys">Systolic</label>
              <input class="addInput" id="inSys" inputmode="numeric" placeholder="e.g., 132" />
            </div>

            <div class="addField">
              <label class="addLabel" for="inDia">Diastolic</label>
              <input class="addInput" id="inDia" inputmode="numeric" placeholder="e.g., 84" />
            </div>

            <div class="addField">
              <label class="addLabel" for="inHr">Heart Rate</label>
              <input class="addInput" id="inHr" inputmode="numeric" placeholder="e.g., 72" />
            </div>
          </div>

          <div class="addRow">
            <button class="primaryBtn" id="btnStep1Save" type="button">Save & Next</button>
          </div>

          <div class="muted addHint">
            You may save BP only, HR only, or both. If you enter BP, you must enter both numbers.
          </div>
        </div>

        <!-- STEP 2: Symptoms + Distress (scaffold; symptoms picker can be expanded later) -->
        <div class="wizStep" id="wizStep2" hidden>
          <div class="addSectionTitle">Symptoms</div>

          <div class="muted addHint">
            Symptom selection UI is wired for future expansion. You can still Save & Next to create a symptoms-only entry later.
          </div>

          <div class="addRow">
            <button class="primaryBtn" id="btnStep2Save" type="button">Save & Next</button>
          </div>
        </div>

        <!-- STEP 3: Mood (scaffold; dropdown can be expanded later) -->
        <div class="wizStep" id="wizStep3" hidden>
          <div class="addSectionTitle">Mood</div>

          <div class="muted addHint">
            Mood UI is a placeholder in this pass (no invented defaults). When you add the dropdown, this step will persist mood-only records.
          </div>

          <div class="addRow">
            <button class="primaryBtn" id="btnStep3Save" type="button">Save & Next</button>
          </div>
        </div>

        <!-- STEP 4: Meds + Notes -->
        <div class="wizStep" id="wizStep4" hidden>
          <div class="addSectionTitle">Meds & Notes</div>

          <div class="addField">
            <label class="addLabel" for="inNotes">Notes</label>
            <textarea class="addTextarea" id="inNotes" rows="4" placeholder="Optional notes…"></textarea>
          </div>

          <div class="muted addHint">
            Meds events will be added in a later pass. Notes are saved only when non-empty.
          </div>

          <div class="addRow">
            <button class="primaryBtn" id="btnStep4Save" type="button">Save & Finish</button>
          </div>
        </div>

        <!-- STEP 5: Summary -->
        <div class="wizStep" id="wizStep5" hidden>
          <div class="addSectionTitle">Saved</div>

          <div class="summaryGrid">
            <div class="summaryLine"><span class="muted">BP</span> <span id="sumBP">—</span></div>
            <div class="summaryLine"><span class="muted">HR</span> <span id="sumHR">—</span></div>
            <div class="summaryLine"><span class="muted">Distress</span> <span id="sumDistress">—</span></div>
            <div class="summaryLine"><span class="muted">Mood</span> <span id="sumMood">Mood: —</span></div>
            <div class="summaryLine"><span class="muted">Symptoms</span> <span id="sumSymptoms">Symptoms: —</span></div>
            <div class="summaryLine"><span class="muted">Meds</span> <span id="sumMeds">Meds: —</span></div>
            <div class="summaryLine"><span class="muted">Notes</span> <span id="sumNotes">Notes: —</span></div>
          </div>

          <div class="addRow">
            <button class="primaryBtn" id="btnSummaryClose" type="button">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- patch builders (module-owned only; omit empties) ----------
  function patchVitals() {
    const sys = readNum("inSys");
    const dia = readNum("inDia");
    const hr  = readNum("inHr");

    // If either BP value is provided, both are required.
    if ((sys != null && dia == null) || (sys == null && dia != null)) {
      alert("Enter both systolic and diastolic (or leave both blank).");
      return { __invalid: true };
    }

    const p = {};
    if (sys != null && dia != null) { p.sys = sys; p.dia = dia; }
    if (hr != null) { p.hr = hr; }
    return p;
  }

  function patchSymptoms() {
    // In this pass, symptoms UI may be empty; do not invent data.
    const p = {};

    if (Array.isArray(UI.symptoms) && UI.symptoms.length) {
      p.symptoms = UI.symptoms.slice();
    }

    // Only persist distress fields if explicitly set (non-null)
    if (UI.distressComputed != null) {
      p.distressComputed = clamp(UI.distressComputed, 0, 100);
    }
    if (UI.distressFinal != null) {
      p.distressFinal = clamp(UI.distressFinal, 0, 100);
    }

    if (p.distressComputed != null && p.distressFinal != null) {
      p.distressDelta = p.distressFinal - p.distressComputed;
    }

    return p;
  }

  function patchMood() {
    const p = {};
    if (UI.mood) p.mood = UI.mood;
    return p;
  }

  function patchMedsNotes() {
    const p = {};

    // Meds: only if non-empty (no overwriting with [])
    if (Array.isArray(UI.meds) && UI.meds.length) {
      p.meds = UI.meds.slice();
    }

    // Notes: only if non-empty (no overwriting with "")
    const notes = readTxt("inNotes");
    if (notes) p.notes = notes;

    return p;
  }

  function buildPatch(step) {
    if (step === 1) return patchVitals();
    if (step === 2) return patchSymptoms();
    if (step === 3) return patchMood();
    if (step === 4) return patchMedsNotes();
    return {};
  }

  function hasMeaning(p) {
    if (!p || typeof p !== "object") return false;
    if (p.__invalid) return false;
    return Object.keys(p).length > 0;
  }

  // ---------- persistence ----------
  async function saveStep(step) {
    if (saving) return false;
    if (!ensureStore()) return false;

    saving = true;
    await initStore();

    try {
      const patch = buildPatch(step);

      // Hard block on invalid step input (e.g., partial BP)
      if (patch && patch.__invalid) return false;

      // If nothing to save, allow navigation (compliance: user can skip steps)
      if (!hasMeaning(patch)) return true;

      // First save → create record (ts anchor)
      if (!WIZ.hasSaved) {
        const ts = nowTs();
        const rec = Object.assign({ ts }, patch);

        await window.VTStore.add(rec);

        WIZ.key = { ts };
        WIZ.createdTs = ts;
        WIZ.lastSaved = rec;
        WIZ.hasSaved = true;
        return true;
      }

      // Subsequent save → patch update (merge into lastSaved; preserve ts)
      const base = WIZ.lastSaved || {};
      const merged = Object.assign({}, base, patch, { ts: base.ts });

      await window.VTStore.update(WIZ.key, merged);

      WIZ.lastSaved = merged;
      return true;
    } finally {
      saving = false;
    }
  }

  // ---------- navigation ----------
  function showStep(n) {
    WIZ.step = n;

    for (let i = 1; i <= 5; i++) {
      const el = $("wizStep" + i);
      if (!el) continue;

      const on = (i === n);
      el.hidden = !on;
      if (on) el.classList.add("show");
      else el.classList.remove("show");
    }

    const lbl = $("vtWizStep");
    if (lbl) lbl.textContent = (n <= 4) ? ("Step " + n + " of 4") : "Done";
  }

  function closeWizard() {
    try { window.VTPanels?.go?.("home", true); } catch (_) {}
  }

  // ---------- summary ----------
  function renderSummary() {
    if (!WIZ.lastSaved) return;
    const r = WIZ.lastSaved;

    safeSetText("sumBP", (isNum(r.sys) && isNum(r.dia)) ? (r.sys + "/" + r.dia) : "—");
    safeSetText("sumHR", isNum(r.hr) ? String(r.hr) : "—");
    safeSetText("sumDistress", isNum(r.distressFinal) ? String(r.distressFinal) : "—");
    safeSetText("sumMood", r.mood ? ("Mood: " + r.mood) : "Mood: —");
    safeSetText("sumSymptoms", (r.symptoms && r.symptoms.length) ? ("Symptoms: " + r.symptoms.length) : "Symptoms: —");
    safeSetText("sumMeds", (r.meds && r.meds.length) ? ("Meds: " + r.meds.map(m => m && m.name ? m.name : "").filter(Boolean).join(", ")) : "Meds: —");
    safeSetText("sumNotes", r.notes ? ("Notes: " + String(r.notes).slice(0, 120)) : "Notes: —");
  }

  // ---------- bindings (idempotent) ----------
  function bind() {
    if (bound) return;
    bound = true;

    const b1 = $("btnStep1Save");
    const b2 = $("btnStep2Save");
    const b3 = $("btnStep3Save");
    const b4 = $("btnStep4Save");

    const bClose = $("btnSummaryClose");
    const bAbort = $("btnWizAbort");

    if (b1) b1.addEventListener("click", async () => {
      if (await saveStep(1)) showStep(2);
    });

    if (b2) b2.addEventListener("click", async () => {
      if (await saveStep(2)) showStep(3);
    });

    if (b3) b3.addEventListener("click", async () => {
      if (await saveStep(3)) showStep(4);
    });

    if (b4) b4.addEventListener("click", async () => {
      if (await saveStep(4)) {
        renderSummary();
        showStep(5);
      }
    });

    if (bClose) bClose.addEventListener("click", closeWizard);
    if (bAbort) bAbort.addEventListener("click", closeWizard);
  }

  function resetSession() {
    WIZ.step = 1;
    WIZ.key = null;
    WIZ.createdTs = null;
    WIZ.lastSaved = null;
    WIZ.hasSaved = false;

    UI.symptoms = [];
    UI.distressComputed = null;
    UI.distressFinal = null;
    UI.mood = null;
    UI.meds = [];

    saving = false;
    bound = false;
  }

  // ---------- public API ----------
  window.VTAdd = Object.freeze({
    openNew() {
      // Each Add tap starts a NEW wizard session (no resume).
      resetSession();
      injectWizardUI();
      bind();
      showStep(1);
      try { window.VTPanels?.go?.("add", true); } catch (_) {}
    },

    // Optional: allow panels/app to re-render wizard shell if Add panel is shown by navigation alone.
    ensureMounted() {
      // If wizard DOM isn't present, mount it (does not start a session).
      if (!$("wizStep1") || !$("btnStep1Save")) {
        injectWizardUI();
        resetSession();
        bind();
        showStep(1);
      }
    }
  });

  // Mount wizard UI on load so the Add panel is never blank.
  function boot() {
    injectWizardUI();
    resetSession();
    bind();
    showStep(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();

/* 
Vitals Tracker — EOF (Wizard Add Pass Footer)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260122-001
FileEditId: 10
Edited: 2026-01-22

Current file: js/add.js, File 1 of 3


Next file to fetch: js/store.js, File 2 of 3



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js

Acceptance checks
- Wizard always starts fresh on Add.
- Save-per-step commits patches only.
- Empty inputs do not overwrite saved data.
- Symptoms-only / Mood-only / Meds-only supported.
- Summary appears only after at least one Save.
- Close returns to Home; no resume behavior.
*/
