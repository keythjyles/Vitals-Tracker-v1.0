/* 
Vitals Tracker — BOF (Jyles Method Pass Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

PASS: Add Launch Reset (Force Step 1 New)
ImplementationId: JYLES-20260122-ADDRESET-001
App Version Authority: js/version.js

File: js/add.js
FileEditId: 14
Edited: 2026-01-22

Prev (this pass): (none — BOF)
Next (this pass): EOL, EOP

Role / Ownership (LOCKED)
- Add wizard state machine + step rendering + Save semantics
- Must ensure “Add” always starts NEW reading at Step 1 (no resume)

Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file: js/add.js, File 1 of 1


Next file to fetch: EOL, EOP, File 0 of 0



Scope (this Pass)
- Any navigation to panel "add" must start a NEW reading at Step 1.
- Prevent “resume last step” after finishing/closing summary and returning Home.
- Implement within js/add.js only (no guessing other files).
------------------------------------------------------------
*/

(function () {
  "use strict";

  // ---------- Wizard session (ephemeral only) ----------
  const WIZ = {
    step: 1,
    key: null,          // {ts} after first save
    createdTs: null,
    lastSaved: null,
    hasSaved: false
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

  // Add-reset enforcement
  let _panelsGoWrapped = false;
  let _internalGoToAdd = false;

  // ---------- utilities ----------
  const nowTs = () => Date.now();
  const clamp = (n, l, h) => Math.max(l, Math.min(h, Number(n)));
  const norm = (s) => String(s || "").trim();
  const isNum = (n) => typeof n === "number" && Number.isFinite(n);

  function $(id) { return document.getElementById(id); }

  // Non-null numeric input; treats 0 as "not provided" for this pass per requirement.
  function readNumNZ(id) {
    const el = $(id);
    const v = el && typeof el.value === "string" ? el.value.trim() : "";
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n === 0) return null;
    return n;
  }

  function readTxt(id) {
    const el = $(id);
    return norm(el && typeof el.value === "string" ? el.value : "");
  }

  function ensureStore() {
    return window.VTStore &&
      typeof window.VTStore.add === "function" &&
      typeof window.VTStore.update === "function";
  }

  async function initStore() {
    try { await window.VTStore.init?.(); } catch (_) {}
  }

  function safeSetText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  // ---------- DOM style helpers (Step 1 UX) ----------
  function ensureStep1Style() {
    if (document.getElementById("vtAddStep1Style")) return;

    const css = `
      /* Step 1 UX (js/add.js injected; keep minimal and Step-1-specific) */

      /* Top row: Vitals (left) + X (right) */
      .addWizTopRow{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:10px;
      }
      .addWizTitle{
        font-size:22px;
        font-weight:900;
        letter-spacing:.02em;
        color:rgba(235,245,255,.92);
        line-height:1.1;
      }

      /* Close (X) */
      .addWizX{
        width:44px; height:44px; border-radius:999px;
        display:flex; align-items:center; justify-content:center;
        border:1px solid rgba(235,245,255,.16);
        background:rgba(12,21,40,.35);
        color:rgba(235,245,255,.86);
        flex:0 0 auto;
      }
      .addWizX:active{ transform:scale(.985); }

      /* Step 1 row: no “capsule” frames; inputs are the obvious targets */
      .vtStep1Row{
        display:flex;
        gap:12px;
        align-items:flex-end;
        justify-content:space-between;
        margin-top:10px;
      }
      .vtField{
        flex:1 1 0;
        min-width:0;
        text-align:center;
      }
      .vtFieldLabel{
        font-weight:900;
        letter-spacing:.10em;
        font-size:13px;
        margin-bottom:6px;
        color:rgba(235,245,255,.84);
      }
      .vtField input.addInput{
        text-align:center;
        font-weight:900;
        font-size:20px;
        padding-top:16px;
        padding-bottom:16px;
        border:2px solid rgba(180,210,255,.50);
        background:rgba(255,255,255,.10);
      }

      /* Continue: preserve prior behavior (full-width, large tap target) */
      .vtContinueRow{ margin-top:14px; }
      .vtContinueRow .primaryBtn{
        width:100%;
        height:58px;
        font-weight:900;
        font-size:18px;
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.id = "vtAddStep1Style";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ---------- DOM injection (wizard skeleton) ----------
  function injectWizardUI() {
    const bodyEl = $("addBody");
    if (!bodyEl) return;

    ensureStep1Style();

    bodyEl.innerHTML = `
      <div class="addCard" id="addCard">
        <div class="addWizTopRow">
          <div class="addWizTitle" aria-label="Step title">Vitals</div>
          <button class="addWizX" id="btnWizAbortX" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- STEP 1: Vitals -->
        <div class="wizStep" id="wizStep1">
          <div class="vtStep1Row" role="group" aria-label="Vitals inputs">
            <div class="vtField">
              <div class="vtFieldLabel">SYS</div>
              <input class="addInput" id="inSys" inputmode="numeric" placeholder="132" aria-label="Systolic" />
            </div>

            <div class="vtField">
              <div class="vtFieldLabel">DIA</div>
              <input class="addInput" id="inDia" inputmode="numeric" placeholder="84" aria-label="Diastolic" />
            </div>

            <div class="vtField">
              <div class="vtFieldLabel">HR</div>
              <input class="addInput" id="inHr" inputmode="numeric" placeholder="72" aria-label="Heart Rate" />
            </div>
          </div>

          <div class="vtContinueRow">
            <button class="primaryBtn" id="btnStep1Continue" type="button">Continue</button>
          </div>
        </div>

        <!-- STEP 2: Symptoms + Distress (existing scaffold retained) -->
        <div class="wizStep" id="wizStep2" hidden>
          <div class="addSectionTitle">Symptoms</div>
          <div class="muted addHint">
            Symptom selection UI is wired for future expansion. You can still Save & Next to create a symptoms-only entry later.
          </div>
          <div class="addRow">
            <button class="primaryBtn" id="btnStep2Save" type="button">Save & Next</button>
          </div>
        </div>

        <!-- STEP 3: Mood (existing scaffold retained) -->
        <div class="wizStep" id="wizStep3" hidden>
          <div class="addSectionTitle">Mood</div>
          <div class="muted addHint">
            Mood UI is a placeholder in this pass (no invented defaults). When you add the dropdown, this step will persist mood-only records.
          </div>
          <div class="addRow">
            <button class="primaryBtn" id="btnStep3Save" type="button">Save & Next</button>
          </div>
        </div>

        <!-- STEP 4: Meds + Notes (existing scaffold retained) -->
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
  function patchVitalsStep1() {
    const sys = readNumNZ("inSys");
    const dia = readNumNZ("inDia");
    const hr  = readNumNZ("inHr");

    // If either BP value is provided, both are required.
    if ((sys != null && dia == null) || (sys == null && dia != null)) {
      alert("Enter both SYS and DIA (or leave both blank).");
      return { __invalid: true };
    }

    const p = {};
    if (sys != null && dia != null) { p.sys = sys; p.dia = dia; }
    if (hr != null) { p.hr = hr; }
    return p;
  }

  function patchSymptoms() {
    const p = {};
    if (Array.isArray(UI.symptoms) && UI.symptoms.length) p.symptoms = UI.symptoms.slice();
    if (UI.distressComputed != null) p.distressComputed = clamp(UI.distressComputed, 0, 100);
    if (UI.distressFinal != null) p.distressFinal = clamp(UI.distressFinal, 0, 100);
    if (p.distressComputed != null && p.distressFinal != null) p.distressDelta = p.distressFinal - p.distressComputed;
    return p;
  }

  function patchMood() {
    const p = {};
    if (UI.mood) p.mood = UI.mood;
    return p;
  }

  function patchMedsNotes() {
    const p = {};
    if (Array.isArray(UI.meds) && UI.meds.length) p.meds = UI.meds.slice();
    const notes = readTxt("inNotes");
    if (notes) p.notes = notes;
    return p;
  }

  function buildPatch(step) {
    if (step === 1) return patchVitalsStep1();
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
  async function savePatchIfAny(step) {
    // Step 1 requirement: advance either way; save only if non-null and non-zero values exist.
    if (saving) return { ok: true };
    if (!ensureStore()) return { ok: true };

    saving = true;
    await initStore();

    try {
      const patch = buildPatch(step);
      if (patch && patch.__invalid) return { ok: false };

      if (!hasMeaning(patch)) return { ok: true };

      if (!WIZ.hasSaved) {
        const ts = nowTs();
        const rec = Object.assign({ ts }, patch);
        await window.VTStore.add(rec);

        WIZ.key = { ts };
        WIZ.createdTs = ts;
        WIZ.lastSaved = rec;
        WIZ.hasSaved = true;
        return { ok: true };
      }

      const base = WIZ.lastSaved || {};
      const merged = Object.assign({}, base, patch, { ts: base.ts });
      await window.VTStore.update(WIZ.key, merged);

      WIZ.lastSaved = merged;
      return { ok: true };
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
    safeSetText("sumMeds", (r.meds && r.meds.length) ? ("Meds: " + r.meds.map(m => (m && m.name) ? m.name : "").filter(Boolean).join(", ")) : "Meds: —");
    safeSetText("sumNotes", r.notes ? ("Notes: " + String(r.notes).slice(0, 120)) : "Notes: —");
  }

  // ---------- session reset (hard) ----------
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

  // ---------- mount fresh Step 1 (deterministic Add launch) ----------
  function mountFreshStep1() {
    resetSession();
    injectWizardUI();
    bind();       // bind() is idempotent per "bound" reset above
    showStep(1);

    // Best-effort focus SYS for speed; ignore failures.
    try { $("inSys")?.focus?.(); } catch (_) {}
  }

  // Close should also clear wizard so next Add is always NEW/Step1
  function closeWizard() {
    mountFreshStep1(); // clear any progress before leaving Add
    try { window.VTPanels?.go?.("home", true); } catch (_) {}
  }

  // ---------- bindings (idempotent) ----------
  function bind() {
    if (bound) return;
    bound = true;

    const bX = $("btnWizAbortX");
    const b1 = $("btnStep1Continue");
    const b2 = $("btnStep2Save");
    const b3 = $("btnStep3Save");
    const b4 = $("btnStep4Save");
    const bClose = $("btnSummaryClose");

    if (bX) bX.addEventListener("click", closeWizard);

    if (b1) b1.addEventListener("click", async () => {
      const res = await savePatchIfAny(1);
      if (res && res.ok) showStep(2);
    });

    if (b2) b2.addEventListener("click", async () => {
      const res = await savePatchIfAny(2);
      if (res && res.ok) showStep(3);
    });

    if (b3) b3.addEventListener("click", async () => {
      const res = await savePatchIfAny(3);
      if (res && res.ok) showStep(4);
    });

    if (b4) b4.addEventListener("click", async () => {
      const res = await savePatchIfAny(4);
      if (res && res.ok) {
        renderSummary();
        showStep(5);
      }
    });

    if (bClose) bClose.addEventListener("click", closeWizard);
  }

  // ---------- HARD GUARANTEE: Any go("add") starts NEW/Step1 ----------
  function wrapPanelsGoForAddReset() {
    if (_panelsGoWrapped) return;

    const vp = window.VTPanels;
    if (!vp || typeof vp.go !== "function") return;

    const origGo = vp.go.bind(vp);

    // Avoid double-wrapping.
    if (vp.go && vp.go.__vtAddResetWrapped) {
      _panelsGoWrapped = true;
      return;
    }

    function wrappedGo(panel, instant) {
      try {
        if (panel === "add" && !_internalGoToAdd) {
          // External navigation to Add (Home/Charts/Log/Add button, or any caller):
          // force NEW/Step1 deterministically before showing Add.
          mountFreshStep1();
        }
      } catch (_) {}

      return origGo(panel, instant);
    }
    wrappedGo.__vtAddResetWrapped = true;

    vp.go = wrappedGo;
    _panelsGoWrapped = true;
  }

  // ---------- public API ----------
  window.VTAdd = Object.freeze({
    // Called by any explicit "Add" action when available.
    // Guarantees NEW reading + Step 1 and navigates to Add.
    openNew() {
      mountFreshStep1();
      try {
        _internalGoToAdd = true;
        window.VTPanels?.go?.("add", true);
      } catch (_) {
        // no-op
      } finally {
        _internalGoToAdd = false;
      }
    },

    // Safe to call on any panel-enter hook; always forces NEW Step 1.
    startNewAtStep1() {
      mountFreshStep1();
    },

    // Legacy compatibility: enforce Step 1 even if caller only "ensures" UI.
    ensureMounted() {
      mountFreshStep1();
    }
  });

  function boot() {
    // Mount once for initial DOM availability, but do not rely on preserved state.
    injectWizardUI();
    resetSession();
    bind();
    showStep(1);

    // Enforce global guarantee: any VTPanels.go("add") starts NEW/Step1.
    wrapPanelsGoForAddReset();

    // Hard-hide any Home button that may exist in the Add header (index-owned).
    try {
      const btnHome = document.getElementById("btnHomeFromAdd");
      if (btnHome) btnHome.style.display = "none";
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();

/* 
Vitals Tracker — EOF (Jyles Method Pass Footer)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

PASS: Add Launch Reset (Force Step 1 New)
ImplementationId: JYLES-20260122-ADDRESET-001
App Version Authority: js/version.js

File: js/add.js
FileEditId: 14
Edited: 2026-01-22

Current file: js/add.js, File 1 of 1


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js

Acceptance checks
- Clicking Add (from anywhere) always starts a NEW reading at Step 1 (Vitals).
- After completing the wizard and closing (X or Close), returning Home, then clicking Add again does NOT resume; it starts Step 1.
- No changes to save semantics beyond enforcing the Step 1 reset on Add launch.
- No dependency on other files; enforcement works via VTPanels.go("add") interception.

Test and regroup for next pass.
*/
