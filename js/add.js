Understood. We are not starting a new pass.

Active pass: JYLES-20260122-ADDSTEP1-003 (per your screenshot plan)

Pasted file pass: ...-002
Per Jyles Method: because the IDs do not match, the prior pass comments are stale, and we proceed by stamping this file to the active pass and delivering the completed one-page product for the pass.


Below is the updated js/add.js (File 1 of 1), with:

“Vitals” moved into the same top row as X, left-aligned, bigger

No steps commentary (still none)

SYS/DIA/HR evenly spaced

Inputs larger + high-contrast background + clearer border + stronger focus ring

Better “card snap” attempt within this single file by forcing the add body/card to not stretch (true root cause may still be in css/app.css, but this is the best possible inside this pass’s 1-of-1 constraint)


/* 
Vitals Tracker — BOF (Jyles Method Pass Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: JYLES-20260122-ADDSTEP1-003
FileEditId: 13
Edited: 2026-01-22

Current file: js/add.js, File 1 of 1


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Beacon Sticky Notes (persist until user changes)
- Every file edit is its own Pass with a unique ImplementationId.
- Each Pass includes an explicit file list; even one file is “1 of 1.”
- If pasted file ImplementationId does NOT match active pass ImplementationId, prior pass comments are stale; strip/replace.
- If pasted file ImplementationId DOES match active pass ImplementationId, STOP and ask how to proceed.
------------------------------------------------------------

Scope (this Pass)
- Step 1 (Vitals module) accessibility + card snap polish only.
- Title row: “Vitals” left-aligned, bigger, inline with X (same row).
- Remove steps commentary (none shown).
- SYS/DIA/HR evenly spaced top row.
- Continue is full-width on its own row with larger font.
- Inputs: bigger tap target + higher-contrast background so it’s obvious where to tap.
- Card border snaps to visible contents (best-effort within this single file).
- No changes to save semantics beyond prior Step 1 rules.
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
      /* Step 1 compact UX (js/add.js injected) */
      #panelAdd .screenHeaderRight { display:none !important; } /* hide Home header actions (no Home) */

      /* Best-effort "card snap" in a 1-file pass:
         force the Add body container to not stretch items to full height */
      #addBody{
        align-items:flex-start !important;
        justify-content:flex-start !important;
        overflow:auto !important;
        padding-top: 10px;
        padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
      }

      /* Ensure card sizes to content (not full-height) */
      #addCard{
        height:auto !important;
        align-self:flex-start !important;
        overflow:visible !important;
        padding-bottom: 14px;
      }
      #addCard .wizStep{
        height:auto !important;
      }

      /* Top row: Title left, X right */
      .addWizTopRow{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
      }
      .vtStep1Title{
        font-size:20px;
        font-weight:900;
        letter-spacing:.2px;
        color:rgba(255,255,255,.92);
        line-height:1.1;
      }

      .addWizX{
        width:44px; height:44px; border-radius:999px;
        display:flex; align-items:center; justify-content:center;
        border:1px solid rgba(235,245,255,.16);
        background:rgba(12,21,40,.35);
        color:rgba(235,245,255,.86);
        flex:0 0 auto;
      }
      .addWizX:active{ transform: scale(.985); }

      /* Vitals row */
      .vtStep1Row{
        display:flex;
        gap:12px;
        align-items:flex-end;
        justify-content:space-between;
        margin-top:6px;
      }
      .vtBox{
        flex:1 1 0;
        min-width:0;
        text-align:center;
      }
      .vtBoxLabel{
        font-weight: 900;
        letter-spacing: .10em;
        font-size: 13px;
        margin-bottom: 8px;
        color: rgba(235,245,255,.90);
      }

      /* Inputs: bigger, higher-contrast target */
      .vtBox input.addInput{
        text-align:center;
        font-weight: 900;
        font-size: 26px;
        padding-top: 16px;
        padding-bottom: 16px;

        border-width: 2px !important;
        border-style: solid !important;
        border-color: rgba(180,210,255,.62) !important;

        /* Higher-contrast background to make the target obvious */
        background: rgba(255,255,255,.10) !important;
        box-shadow:
          inset 0 0 0 1px rgba(235,245,255,.10),
          0 0 0 1px rgba(0,0,0,.22);
      }

      .vtBox input.addInput:focus{
        outline:none !important;
        border-color: rgba(210,235,255,.85) !important;
        box-shadow:
          0 0 0 3px rgba(80,140,220,.25),
          inset 0 0 0 1px rgba(235,245,255,.12);
      }

      /* Continue button: full width */
      .vtContinueRow{
        margin-top: 14px;
      }
      .vtContinueRow .primaryBtn{
        width: 100%;
        height: 60px;
        font-weight: 900;
        font-size: 20px;
        letter-spacing:.3px;
      }

      /* Remove any instructional footer/hint under Step 1 */
      .addHint{ display:none !important; }
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
          <div class="vtStep1Title">Vitals</div>
          <button class="addWizX" id="btnWizAbortX" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- STEP 1: Vitals -->
        <div class="wizStep" id="wizStep1">
          <div class="vtStep1Row">
            <div class="vtBox">
              <div class="vtBoxLabel">SYS</div>
              <input class="addInput" id="inSys" inputmode="numeric" placeholder="132" aria-label="Systolic" />
            </div>

            <div class="vtBox">
              <div class="vtBoxLabel">DIA</div>
              <input class="addInput" id="inDia" inputmode="numeric" placeholder="84" aria-label="Diastolic" />
            </div>

            <div class="vtBox">
              <div class="vtBoxLabel">HR</div>
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
    safeSetText("sumMeds", (r.meds && r.meds.length) ? ("Meds: " + r.meds.map(m => (m && m.name) ? m.name : "").filter(Boolean).join(", ")) : "Meds: —");
    safeSetText("sumNotes", r.notes ? ("Notes: " + String(r.notes).slice(0, 120)) : "Notes: —");
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
      resetSession();
      injectWizardUI();
      bind();
      showStep(1);
      try { window.VTPanels?.go?.("add", true); } catch (_) {}
    },

    ensureMounted() {
      if (!$("wizStep1") || !$("btnStep1Continue")) {
        injectWizardUI();
        resetSession();
        bind();
        showStep(1);
      }
    }
  });

  function boot() {
    injectWizardUI();
    resetSession();
    bind();
    showStep(1);

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

File: js/add.js
App Version Authority: js/version.js
ImplementationId: JYLES-20260122-ADDSTEP1-003
FileEditId: 13
Edited: 2026-01-22

Current file: js/add.js, File 1 of 1


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js

Acceptance checks
- Title row: “Vitals” is left-aligned and inline with X.
- Step commentary removed completely.
- SYS/DIA/HR evenly spaced in top row.
- Inputs are larger with higher-contrast background and clearer focus state.
- Continue is full-width on its own row; larger font/tap target.
- Best-effort card snap applied without touching css/app.css.
- Existing Step 1 save/advance semantics preserved.

Test and regroup for next pass.
*/ 
