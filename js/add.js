/* 
Vitals Tracker — BOF (Add Implementation Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-001
FileEditId: 4
Edited: 2026-01-21

Current file: js/add.js, File 3 of 7


Next file to fetch: js/symptoms.js, File 4 of 7



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Beacon Drift Control Note (persist until user changes)
- Focus on THIS pasted file and THIS chat message only.
- Follow the cardinal header/footer boilerplate rules exactly.
- This is an Add Implementation pass (not Prime Pass).
------------------------------------------------------------

Role / Ownership (LOCKED)
- Owns Add/Edit form UI wiring, per-record transient UI state, and save/update orchestration
- Owns Distress (0–100) and Symptoms popup capture for records
- Owns Medication marker capture for records
- Must NOT implement chart rendering logic here (chart.js consumes stored data later)
- Must NOT implement panel-deck transforms here (delegates to VTPanels)
------------------------------------------------------------ 
*/

/* File: js/add.js */
/*
Purpose of this header: verification metadata for this edit (not instructions).
Edited: 2026-01-21
Change focus: SYS/DIA/HR forced into one row; thicker borders to visually stand out.
*/

(function () {
  "use strict";

  const btnSave = document.getElementById("btnSaveReading");
  const btnHome = document.getElementById("btnHomeFromAdd");
  const bodyEl = document.getElementById("addBody");
  const cardEl = document.getElementById("addCard");

  let saving = false;

  // Edit mode state
  const EDIT = {
    active: false,
    key: null,
    original: null
  };

  // Local UI state (per-record)
  const UI = {
    // Distress: user can set final 0..100 without symptoms.
    distressFinal: null,        // 0..100 or null
    distressComputed: null,     // 0..100 or null (derived from symptoms, if available)
    distressDelta: null,        // final - computed
    distressTouched: false,     // user manually set final
    // Symptoms: selected keys
    symptoms: [],               // [string]
    // Medications: event markers
    meds: []                    // [{ name, atTs }]
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

  function nowTs() { return Date.now(); }

  function clampInt(n, lo, hi) {
    const x = Math.trunc(Number(n));
    if (!Number.isFinite(x)) return null;
    return Math.max(lo, Math.min(hi, x));
  }

  function normalizeStringArray(arr) {
    const out = [];
    const seen = new Set();
    for (const x of (arr || [])) {
      const v = String(x || "").trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }

  function normalizeMeds(arr) {
    const out = [];
    const seen = new Set();
    for (const m of (arr || [])) {
      const name = String(m && m.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: name, atTs: (m && typeof m.atTs === "number") ? m.atTs : null });
    }
    return out;
  }

  function defaultRecord() {
    return {
      ts: nowTs(),
      sys: null,
      dia: null,
      hr: null,
      notes: "",
      distressFinal: null,       // 0..100
      distressComputed: null,    // 0..100 (from symptoms)
      distressDelta: null,       // final - computed (if both present)
      symptoms: [],              // symptom keys/labels
      meds: []
    };
  }

  function softenAddCard() {
    if (!cardEl) return;
    try {
      cardEl.style.background = "rgba(0,0,0,0.14)";
      cardEl.style.border = "1px solid rgba(255,255,255,0.12)";
      cardEl.style.boxShadow = "inset 0 0 0 1px rgba(235,245,255,.08)";
      cardEl.style.backdropFilter = "blur(6px)";
      cardEl.style.webkitBackdropFilter = "blur(6px)";
    } catch (_) {}
  }

  function applyThickFieldBorders(formRoot) {
    try {
      if (!formRoot) return;
      const ids = ["inSys", "inDia", "inHr"];
      ids.forEach(id => {
        const el = formRoot.querySelector("#" + id);
        if (!el) return;
        el.style.borderWidth = "2px";
        el.style.borderStyle = "solid";
        el.style.borderColor = "rgba(180,210,255,.42)";
        el.style.boxShadow = "inset 0 0 0 1px rgba(235,245,255,.10)";
      });

      // Ensure the row itself stays 3 columns even if app.css changes
      const row = formRoot.querySelector("#vtVitalsRow");
      if (row) {
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 1fr 1fr";
        row.style.gap = "10px";
        row.style.alignItems = "stretch";
      }
    } catch (_) {}
  }

  function ensureFormPresent() {
    if (!bodyEl) return;
    if (document.getElementById("addForm")) return;

    const form = document.createElement("div");
    form.id = "addForm";
    form.className = "addForm";

    form.innerHTML = `
      <div class="addGrid">

        <!-- SYS/DIA/HR on ONE row -->
        <div id="vtVitalsRow" class="addRow3">
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
        </div>

        <div class="addSection" id="secSymptoms">
          <div class="addSectionH">
            <div>
              <div class="addSectionTitle">Symptoms</div>
              <div class="addSectionHint">Tap to select symptoms (popup). Symptoms can contribute to a computed distress score.</div>
            </div>
            <button class="pillBtn" id="btnOpenSymptoms" type="button">Select</button>
          </div>

          <div class="tagList" id="symptomsTagList" aria-label="Selected symptoms"></div>
        </div>

        <div class="addSection" id="secDistress">
          <div class="addSectionH">
            <div>
              <div class="addSectionTitle">Distress</div>
              <div class="addSectionHint">Set your distress (0–100). Symptoms are optional.</div>
            </div>
            <button class="pillBtn" id="btnClearDistress" type="button">Clear</button>
          </div>

          <div class="distressRow" style="gap:10px; align-items:center;">
            <input id="inDistress100" inputmode="numeric" class="addInput" placeholder="0–100" style="max-width:120px;" />
            <input id="rngDistress100" type="range" min="0" max="100" step="1" value="0" style="flex:1; opacity:.95;" />
          </div>

          <div class="tagList" id="distressMeta" aria-label="Distress meta"></div>
        </div>

        <div class="addSection" id="secMeds">
          <div class="addSectionH">
            <div>
              <div class="addSectionTitle">Medications</div>
              <div class="addSectionHint">Add medication event markers. Dosage stays in Notes.</div>
            </div>
          </div>

          <div class="medsRow">
            <input id="inMedName" class="addInput" placeholder="Medication name" list="dlMedNames" />
            <datalist id="dlMedNames"></datalist>
            <button class="medsAddBtn" id="btnAddMedToRecord" type="button">Add</button>
          </div>

          <div class="tagList" id="medsTagList" aria-label="Medication markers"></div>
        </div>

        <label class="addField addNotes">
          <div class="addLabel">Notes</div>
          <textarea id="inNotes" class="addTextArea" placeholder="Symptoms, meds, context..."></textarea>
        </label>
      </div>

      <!-- Symptoms popup -->
      <div class="vtOverlay" id="symptomsOverlay" aria-hidden="true">
        <div class="vtModal" role="dialog" aria-modal="true" aria-label="Symptoms">
          <div class="vtModalHead">
            <div>
              <div class="vtModalTitle" id="symptomsModalTitle">Symptoms</div>
              <div class="vtModalSub" id="symptomsModalSub">Select symptoms that apply right now.</div>
            </div>
            <button class="iconBtn" id="btnCloseSymptomsModal" type="button" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="vtModalBody" id="symptomsPickBody"></div>

          <div class="vtModalFoot">
            <button class="pillBtn" id="btnSymptomsCancel" type="button">Cancel</button>
            <button class="pillBtn" id="btnSymptomsApply" type="button">Apply</button>
          </div>
        </div>
      </div>
    `;

    if (cardEl) {
      cardEl.insertBefore(form, cardEl.firstChild);
    } else {
      bodyEl.appendChild(form);
    }

    try {
      const inputs = form.querySelectorAll("input,textarea");
      inputs.forEach(el => {
        el.style.background = "rgba(8,12,20,0.45)";
        el.style.borderColor = "rgba(235,245,255,0.16)";
      });
    } catch (_) {}

    // Force 1-row vitals + thick borders
    applyThickFieldBorders(form);

    bindSymptomsUI();
    bindDistressUI();
    bindMedsUI();
    refreshMedDatalist();

    // Render empty state
    renderSymptomsTags();
    renderDistressMeta();
    renderMedsTags();
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
    try { el.value = (v == null || v === "") ? "" : String(v); } catch (_) {}
  }

  function writeText(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    try { el.value = (v == null) ? "" : String(v); } catch (_) {}
  }

  function clearInputs() {
    const ids = ["inSys", "inDia", "inHr", "inNotes", "inMedName", "inDistress100"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }

    // Reset UI state
    UI.distressFinal = null;
    UI.distressComputed = null;
    UI.distressDelta = null;
    UI.distressTouched = false;
    UI.symptoms = [];
    UI.meds = [];

    // Reset range
    const rng = document.getElementById("rngDistress100");
    if (rng) rng.value = "0";

    renderSymptomsTags();
    renderDistressMeta();
    renderMedsTags();
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
    try { btnSave.textContent = isEditing ? "Save Changes" : "Save"; } catch (_) {}
  }

  function setHeaderEditing(isEditing) {
    try {
      const title = document.querySelector("#panelAdd .screenTitle");
      if (!title) return;
      title.textContent = isEditing ? "Edit Reading" : "Add Reading";
    } catch (_) {}
  }

  function normalizeRecord(r) {
    const ts = (r && typeof r.ts === "number") ? r.ts : null;
    const sys = (r && typeof r.sys === "number") ? r.sys : (r && typeof r.systolic === "number" ? r.systolic : null);
    const dia = (r && typeof r.dia === "number") ? r.dia : (r && typeof r.diastolic === "number" ? r.diastolic : null);
    const hr  = (r && typeof r.hr  === "number") ? r.hr  : (r && typeof r.heartRate === "number" ? r.heartRate : null);
    const notes = (r && (r.notes ?? r.note ?? r.comment ?? r.memo)) ?? "";

    const distressFinal = (r && Number.isFinite(Number(r.distressFinal))) ? clampInt(Number(r.distressFinal), 0, 100) : null;
    const distressComputed = (r && Number.isFinite(Number(r.distressComputed))) ? clampInt(Number(r.distressComputed), 0, 100) : null;

    const symptoms = Array.isArray(r && r.symptoms) ? normalizeStringArray(r.symptoms) : [];
    const meds = Array.isArray(r && r.meds) ? r.meds.slice() : [];

    const out = {
      ts,
      sys,
      dia,
      hr,
      notes: String(notes || ""),
      distressFinal,
      distressComputed,
      distressDelta: (distressFinal != null && distressComputed != null) ? (distressFinal - distressComputed) : null,
      symptoms,
      meds: normalizeMeds(meds)
    };

    // Back-compat: legacy `distress` in 0..100 -> distressFinal
    try {
      if (out.distressFinal == null && r && Number.isFinite(Number(r.distress))) {
        const dv = clampInt(Number(r.distress), 0, 100);
        if (dv != null) out.distressFinal = dv;
      }
    } catch (_) {}

    return out;
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

    if (key.id != null) {
      for (const r of all) {
        if (r && (r.id === key.id || r._id === key.id)) return r;
      }
    }

    if (key.ts != null) {
      for (const r of all) {
        const t = (r && typeof r.ts === "number") ? r.ts : null;
        if (t === key.ts) return r;
      }
    }

    return null;
  }

  function devEchoToken() {
    return `#DEV ADD-20260121-001 add.js FE4`;
  }

  function devPrefillNotesIfEmpty() {
    const el = document.getElementById("inNotes");
    if (!el) return;
    const cur = String(el.value || "");
    if (cur.trim()) return;
    try { el.value = devEchoToken(); } catch (_) {}
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

      UI.symptoms = normalizeStringArray(record.symptoms || []);
      UI.meds = normalizeMeds(record.meds || []);

      UI.distressComputed = (record.distressComputed == null ? null : clampInt(record.distressComputed, 0, 100));
      UI.distressFinal = (record.distressFinal == null ? null : clampInt(record.distressFinal, 0, 100));
      UI.distressDelta = (UI.distressFinal != null && UI.distressComputed != null) ? (UI.distressFinal - UI.distressComputed) : null;

      UI.distressTouched = (UI.distressFinal != null);

      const rng = document.getElementById("rngDistress100");
      if (rng) rng.value = String(UI.distressFinal != null ? UI.distressFinal : 0);
      writeNumber("inDistress100", UI.distressFinal);

      renderSymptomsTags();
      renderDistressMeta();
      renderMedsTags();
      refreshMedDatalist();

      devPrefillNotesIfEmpty();
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

    devPrefillNotesIfEmpty();

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
    ensureFormPresent();
    await initStoreIfNeeded();

    let key = null;
    let rec = null;

    try {
      if (payload && payload.record && typeof payload.record === "object") {
        rec = normalizeRecord(payload.record);
        key = { id: payload.id ?? payload.record.id ?? payload.record._id ?? null, ts: payload.ts ?? payload.record.ts ?? null };
      } else if (payload && typeof payload === "object" && ("ts" in payload || "sys" in payload || "dia" in payload || "hr" in payload || "notes" in payload)) {
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

  function getMedList() {
    try {
      if (window.VTSettings && typeof window.VTSettings.getMedNames === "function") {
        return window.VTSettings.getMedNames() || [];
      }
    } catch (_) {}
    return [];
  }

  function addMedToSettings(name) {
    try {
      if (window.VTSettings && typeof window.VTSettings.addMedName === "function") {
        window.VTSettings.addMedName(name);
      }
    } catch (_) {}
  }

  function refreshMedDatalist() {
    const dl = document.getElementById("dlMedNames");
    if (!dl) return;
    const meds = getMedList();
    dl.innerHTML = "";
    meds.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      dl.appendChild(opt);
    });
  }

  // -----------------------------
  // Symptoms popup (Add-only)
  // -----------------------------
  let symptomsTemp = null;

  function symptomsAdapter() {
    try {
      const s = window.VTSymptoms || null;
      if (!s) return null;

      const getCatalog =
        (typeof s.getCatalog === "function") ? () => s.getCatalog() :
        (Array.isArray(s.catalog)) ? () => s.catalog :
        null;

      const compute =
        (typeof s.computeDistress === "function") ? (keys) => s.computeDistress(keys) :
        (typeof s.computeScore === "function") ? (keys) => s.computeScore(keys) :
        null;

      return { getCatalog, compute };
    } catch (_) {
      return null;
    }
  }

  function bindSymptomsUI() {
    bindOnce(document.getElementById("btnOpenSymptoms"), "openSymptoms", function () {
      openSymptomsPicker();
    });

    bindOnce(document.getElementById("btnCloseSymptomsModal"), "closeSymptomsModal", function () {
      closeSymptomsPicker(true);
    });

    bindOnce(document.getElementById("btnSymptomsCancel"), "cancelSymptomsModal", function () {
      closeSymptomsPicker(true);
    });

    bindOnce(document.getElementById("btnSymptomsApply"), "applySymptomsModal", function () {
      applySymptomsPicker();
    });
  }

  function openSymptomsPicker() {
    const overlay = document.getElementById("symptomsOverlay");
    const body = document.getElementById("symptomsPickBody");
    if (!overlay || !body) return;

    symptomsTemp = new Set((UI.symptoms || []).map(x => String(x).trim()).filter(Boolean));

    const ad = symptomsAdapter();
    const catalog = (ad && ad.getCatalog) ? (ad.getCatalog() || []) : [];

    body.innerHTML = "";

    if (!Array.isArray(catalog) || !catalog.length) {
      const msg = document.createElement("div");
      msg.className = "muted";
      msg.style.fontSize = "13px";
      msg.style.lineHeight = "1.35";
      msg.textContent = "Symptoms catalog not available yet (js/symptoms.js). Paste/implement symptoms.js to enable symptom selection.";
      body.appendChild(msg);
    } else {
      catalog.forEach(it => {
        const key = String(it.k ?? it.key ?? it.id ?? it.label ?? "").trim();
        if (!key) return;

        const label = String(it.label ?? it.name ?? it.k ?? key).trim();
        const desc = String(it.desc ?? it.d ?? it.description ?? "").trim();

        const row = document.createElement("div");
        row.className = "vtPickItem";

        const left = document.createElement("div");
        left.className = "vtPickItemLeft";

        const nm = document.createElement("div");
        nm.className = "vtPickItemName";
        nm.textContent = label;

        const ds = document.createElement("div");
        ds.className = "vtPickItemDesc";
        ds.textContent = desc;

        left.appendChild(nm);
        if (desc) left.appendChild(ds);

        const tog = document.createElement("button");
        tog.type = "button";
        tog.className = "vtToggle" + (symptomsTemp.has(key) ? " on" : "");
        tog.setAttribute("aria-pressed", symptomsTemp.has(key) ? "true" : "false");

        tog.addEventListener("click", function () {
          if (symptomsTemp.has(key)) symptomsTemp.delete(key);
          else symptomsTemp.add(key);
          tog.className = "vtToggle" + (symptomsTemp.has(key) ? " on" : "");
          tog.setAttribute("aria-pressed", symptomsTemp.has(key) ? "true" : "false");
        });

        row.appendChild(left);
        row.appendChild(tog);
        body.appendChild(row);
      });
    }

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeSymptomsPicker(clearTemp) {
    const overlay = document.getElementById("symptomsOverlay");
    if (!overlay) return;
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    if (clearTemp) symptomsTemp = null;
  }

  function computeDistressFromSymptoms(keys) {
    const ad = symptomsAdapter();
    if (!ad || typeof ad.compute !== "function") return null;
    try {
      const v = ad.compute(keys);
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return clampInt(n, 0, 100);
    } catch (_) {
      return null;
    }
  }

  function applySymptomsPicker() {
    if (!symptomsTemp) {
      closeSymptomsPicker(true);
      return;
    }

    UI.symptoms = normalizeStringArray(Array.from(symptomsTemp));
    symptomsTemp = null;

    const computed = computeDistressFromSymptoms(UI.symptoms);
    UI.distressComputed = (computed == null ? null : computed);

    if (!UI.distressTouched) {
      UI.distressFinal = (UI.distressComputed == null ? null : UI.distressComputed);
      const rng = document.getElementById("rngDistress100");
      if (rng) rng.value = String(UI.distressFinal != null ? UI.distressFinal : 0);
      writeNumber("inDistress100", UI.distressFinal);
    }

    UI.distressDelta = (UI.distressFinal != null && UI.distressComputed != null) ? (UI.distressFinal - UI.distressComputed) : null;

    renderSymptomsTags();
    renderDistressMeta();
    closeSymptomsPicker(true);
  }

  function renderSymptomsTags() {
    const host = document.getElementById("symptomsTagList");
    if (!host) return;
    host.innerHTML = "";

    const tags = UI.symptoms || [];
    if (!tags.length) {
      const muted = document.createElement("div");
      muted.className = "muted";
      muted.style.fontSize = "12px";
      muted.textContent = "No symptoms selected.";
      host.appendChild(muted);
      return;
    }

    tags.forEach(t => {
      const chip = document.createElement("div");
      chip.className = "tagChip";
      chip.textContent = t;

      const x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Remove");
      x.innerHTML = "×";
      x.addEventListener("click", function () {
        UI.symptoms = (UI.symptoms || []).filter(v => v !== t);

        const computed = computeDistressFromSymptoms(UI.symptoms);
        UI.distressComputed = (computed == null ? null : computed);

        if (!UI.distressTouched) {
          UI.distressFinal = (UI.distressComputed == null ? null : UI.distressComputed);
          const rng = document.getElementById("rngDistress100");
          if (rng) rng.value = String(UI.distressFinal != null ? UI.distressFinal : 0);
          writeNumber("inDistress100", UI.distressFinal);
        }

        UI.distressDelta = (UI.distressFinal != null && UI.distressComputed != null) ? (UI.distressFinal - UI.distressComputed) : null;

        renderSymptomsTags();
        renderDistressMeta();
      });

      chip.appendChild(x);
      host.appendChild(chip);
    });
  }

  // -----------------------------
  // Distress 0–100 UI
  // -----------------------------
  function bindDistressUI() {
    const inD = document.getElementById("inDistress100");
    const rng = document.getElementById("rngDistress100");
    const btnClear = document.getElementById("btnClearDistress");

    if (rng) {
      rng.addEventListener("input", function () {
        const v = clampInt(rng.value, 0, 100);
        UI.distressFinal = (v == null ? null : v);
        UI.distressTouched = true;
        writeNumber("inDistress100", UI.distressFinal);
        UI.distressDelta = (UI.distressFinal != null && UI.distressComputed != null) ? (UI.distressFinal - UI.distressComputed) : null;
        renderDistressMeta();
      });
    }

    if (inD) {
      inD.addEventListener("input", function () {
        const v = clampInt(inD.value, 0, 100);
        UI.distressFinal = (v == null ? null : v);
        UI.distressTouched = true;
        if (rng) rng.value = String(UI.distressFinal != null ? UI.distressFinal : 0);
        UI.distressDelta = (UI.distressFinal != null && UI.distressComputed != null) ? (UI.distressFinal - UI.distressComputed) : null;
        renderDistressMeta();
      });
    }

    bindOnce(btnClear, "clearDistress100", function () {
      UI.distressFinal = null;
      UI.distressTouched = false;
      UI.distressDelta = null;

      if (rng) rng.value = "0";
      if (inD) inD.value = "";

      renderDistressMeta();
    });
  }

  function renderDistressMeta() {
    const host = document.getElementById("distressMeta");
    if (!host) return;
    host.innerHTML = "";

    const metaLine = document.createElement("div");
    metaLine.className = "muted";
    metaLine.style.fontSize = "12px";

    const parts = [];
    if (UI.distressFinal != null) parts.push(`Final: ${UI.distressFinal}`);
    else parts.push("Final: (not set)");

    if (UI.distressComputed != null) parts.push(`Computed: ${UI.distressComputed}`);
    else parts.push("Computed: (n/a)");

    if (UI.distressFinal != null && UI.distressComputed != null) parts.push(`Δ: ${UI.distressFinal - UI.distressComputed}`);

    metaLine.textContent = parts.join("  •  ");
    host.appendChild(metaLine);

    if ((UI.symptoms || []).length && UI.distressComputed == null) {
      const warn = document.createElement("div");
      warn.className = "muted";
      warn.style.fontSize = "12px";
      warn.style.marginTop = "6px";
      warn.textContent = "Computed distress requires symptoms.js scoring API.";
      host.appendChild(warn);
    }
  }

  // -----------------------------
  // Meds UI
  // -----------------------------
  function bindMedsUI() {
    const btnAdd = document.getElementById("btnAddMedToRecord");
    const inMed = document.getElementById("inMedName");

    bindOnce(btnAdd, "addMedToRecord", function () {
      const name = String((inMed && inMed.value) || "").trim();
      if (!name) return;

      const key = name.toLowerCase();
      const exists = (UI.meds || []).some(m => String(m.name).toLowerCase() === key);
      if (!exists) {
        UI.meds.push({ name: name, atTs: nowTs() });
        UI.meds = normalizeMeds(UI.meds);
        renderMedsTags();
      }

      addMedToSettings(name);
      refreshMedDatalist();

      if (inMed) inMed.value = "";
    });

    if (inMed) {
      inMed.addEventListener("keydown", function (e) {
        if (e && e.key === "Enter") {
          try { e.preventDefault(); } catch (_) {}
          btnAdd && btnAdd.click();
        }
      });
    }

    document.addEventListener("vt:settingsChanged", function () {
      refreshMedDatalist();
    });
  }

  function renderMedsTags() {
    const host = document.getElementById("medsTagList");
    if (!host) return;
    host.innerHTML = "";

    const meds = UI.meds || [];
    if (!meds.length) {
      const muted = document.createElement("div");
      muted.className = "muted";
      muted.style.fontSize = "12px";
      muted.textContent = "No medication markers added.";
      host.appendChild(muted);
      return;
    }

    meds.forEach(m => {
      const chip = document.createElement("div");
      chip.className = "tagChip";
      chip.textContent = m.name;

      const x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Remove");
      x.innerHTML = "×";
      x.addEventListener("click", function () {
        const key = String(m.name).toLowerCase();
        UI.meds = (UI.meds || []).filter(z => String(z.name).toLowerCase() !== key);
        renderMedsTags();
      });

      chip.appendChild(x);
      host.appendChild(chip);
    });
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

    const finalV = clampInt(readNumber("inDistress100"), 0, 100);
    rec.distressFinal = (finalV == null ? (UI.distressFinal == null ? null : UI.distressFinal) : finalV);
    rec.distressComputed = (UI.distressComputed == null ? null : clampInt(UI.distressComputed, 0, 100));
    rec.distressDelta = (rec.distressFinal != null && rec.distressComputed != null) ? (rec.distressFinal - rec.distressComputed) : null;

    rec.symptoms = normalizeStringArray(UI.symptoms || []);
    rec.meds = normalizeMeds(UI.meds || []);

    const hasSys = rec.sys != null;
    const hasDia = rec.dia != null;

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

        const tsToKeep =
          (EDIT.original && typeof EDIT.original.ts === "number") ? EDIT.original.ts :
          (EDIT.key && typeof EDIT.key.ts === "number") ? EDIT.key.ts :
          null;

        if (tsToKeep != null) rec.ts = tsToKeep;

        const key = EDIT.key || { ts: rec.ts };
        await updateRecord(key, rec);

        try { window.VTLog?.onShow?.(); } catch (_) {}
        try { window.VTChart?.onShow?.(); } catch (_) {}

        safeAlert("Saved.");
        exitEditMode();
        clearInputs();
        return;
      }

      await window.VTStore.add(rec);

      try { window.VTLog?.onShow?.(); } catch (_) {}
      try { window.VTChart?.onShow?.(); } catch (_) {}

      safeAlert("Saved.");
      clearInputs();
      devPrefillNotesIfEmpty();
    } catch (e) {
      safeAlert("Save failed. Check console for details.");
      try { console.error(e); } catch (_) {}
    } finally {
      saving = false;
      setSaveEnabled(true);
    }
  }

  function goHome() {
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

    document.addEventListener("vt:editRequested", function (e) {
      try {
        if (!e || !e.detail) return;
        openEdit(e.detail);
      } catch (_) {}
    });

    setSaveEnabled(true);
    setSaveLabelEditing(false);
    setHeaderEditing(false);

    devPrefillNotesIfEmpty();
  }

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
Vitals Tracker — EOF (Add Implementation Footer)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-001
FileEditId: 4
Edited: 2026-01-21

Current file: js/add.js, File 3 of 7


Next file to fetch: js/symptoms.js, File 4 of 7



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js
Acceptance checks
- SYS/DIA/HR are forced into one row and each input has a thicker border for visibility
- Distress is 0–100 and can be set without symptoms
- Symptoms selection is a popup modal (requires symptoms.js catalog/scoring API to be fully enabled)
- Symptoms can compute a distress score (0–100) when symptoms.js provides computeDistress/computeScore
- Medications event markers preserved and stored
- Save enforces BP pairs (sys+dia) while allowing HR/Notes-only entries
- Add panel returns to previous panel via VTPanels.closeAdd()

Implementation Fetch Aid (ONE-TIME ONLY; NOT AUTHORITATIVE)
- This is only a human paste directive for ADD-20260121-001, not a master schema/order.
*/ 
