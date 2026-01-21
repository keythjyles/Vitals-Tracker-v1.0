/* 
Vitals Tracker — BOF (Add Implementation Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-001
Add Implementation: Step 9 of 12
Prev (this run): js/panels.js
Next (this run): js/symptoms.js
FileEditId: 1
Edited: 2026-01-21

Current file: js/add.js, File 9 of 12


Next file to fetch: js/symptoms.js, File 10 of 12



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Beacon Drift Control Note (persist until user changes)
- Focus on THIS pasted file and THIS chat message only.
- Follow the cardinal header/footer boilerplate rules exactly.
- This is an Add Implementation pass (not Prime Pass).
------------------------------------------------------------

Role / Ownership (LOCKED)
- Owns Add/Edit form UI wiring, per-record transient UI state, and save/update orchestration
- Owns Distress (0–5 + descriptor picker) and Medication marker capture for records
- Must NOT implement chart rendering logic here (chart.js consumes stored data later)
- Must NOT implement panel-deck transforms here (delegates to VTPanels)
------------------------------------------------------------ 
*/

/* File: js/add.js */
/*
Purpose of this header: verification metadata for this edit (not instructions).
Edited: 2026-01-20
Change focus: Add/Edit expanded with Distress (0–5 + descriptor popup) and Medications (event markers w/ settings prefill).
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
    distress: null,           // 0..5 or null
    distressTags: [],         // strings
    meds: []                  // [{ name, atTs }]
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

  function defaultRecord() {
    return {
      ts: nowTs(),
      sys: null,
      dia: null,
      hr: null,
      notes: "",
      distress: null,
      distressTags: [],
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

  function ensureFormPresent() {
    if (!bodyEl) return;
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

        <div class="addSection" id="secDistress">
          <div class="addSectionH">
            <div>
              <div class="addSectionTitle">Distress</div>
              <div class="addSectionHint">Select a level (0–5) to choose descriptors.</div>
            </div>
          </div>

          <div class="distressRow" id="distressBtns">
            <button class="distressBtn" type="button" data-d="0">0</button>
            <button class="distressBtn" type="button" data-d="1">1</button>
            <button class="distressBtn" type="button" data-d="2">2</button>
            <button class="distressBtn" type="button" data-d="3">3</button>
            <button class="distressBtn" type="button" data-d="4">4</button>
            <button class="distressBtn" type="button" data-d="5">5</button>
            <button class="pillBtn" id="btnClearDistress" type="button">Clear</button>
          </div>

          <div class="tagList" id="distressTagList" aria-label="Distress descriptors"></div>
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

      <!-- Distress popup -->
      <div class="vtOverlay" id="distressOverlay" aria-hidden="true">
        <div class="vtModal" role="dialog" aria-modal="true" aria-label="Distress descriptors">
          <div class="vtModalHead">
            <div>
              <div class="vtModalTitle" id="distressModalTitle">Distress Level</div>
              <div class="vtModalSub" id="distressModalSub">Select descriptors that fit right now.</div>
            </div>
            <button class="iconBtn" id="btnCloseDistressModal" type="button" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="vtModalBody" id="distressPickBody"></div>

          <div class="vtModalFoot">
            <button class="pillBtn" id="btnDistressCancel" type="button">Cancel</button>
            <button class="pillBtn" id="btnDistressApply" type="button">Apply</button>
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

    bindDistressUI();
    bindMedsUI();
    refreshMedDatalist();
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
    const ids = ["inSys", "inDia", "inHr", "inNotes", "inMedName"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }
    UI.distress = null;
    UI.distressTags = [];
    UI.meds = [];
    renderDistressButtons();
    renderDistressTags();
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

    const distress = (r && Number.isFinite(Number(r.distress))) ? Number(r.distress) : null;
    const distressTags = Array.isArray(r && r.distressTags) ? r.distressTags.slice() : [];

    const meds = Array.isArray(r && r.meds) ? r.meds.slice() : [];

    return {
      ts,
      sys,
      dia,
      hr,
      notes: String(notes || ""),
      distress: (distress === null ? null : clampInt(distress, 0, 5)),
      distressTags: normalizeStringArray(distressTags),
      meds: normalizeMeds(meds)
    };
  }

  function clampInt(n, lo, hi) {
    const x = Math.trunc(Number(n));
    if (!Number.isFinite(x)) return lo;
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

      UI.distress = (record.distress == null ? null : clampInt(record.distress, 0, 5));
      UI.distressTags = normalizeStringArray(record.distressTags || []);
      UI.meds = normalizeMeds(record.meds || []);

      renderDistressButtons();
      renderDistressTags();
      renderMedsTags();
      refreshMedDatalist();
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
  // Distress descriptors catalog
  // -----------------------------
  const DISTRESS = Object.freeze({
    0: [
      { k:"Calm", d:"No distress; baseline." },
      { k:"Stable", d:"Able to function normally." },
      { k:"No urgent symptoms", d:"No acute complaints." }
    ],
    1: [
      { k:"Mild unease", d:"Slight discomfort or worry." },
      { k:"Light tension", d:"Noticeable but manageable." },
      { k:"Slight restlessness", d:"Minor agitation." },
      { k:"Mild fatigue", d:"Tired but functional." }
    ],
    2: [
      { k:"Moderate discomfort", d:"More noticeable; still coping." },
      { k:"Elevated worry", d:"Persistent concern." },
      { k:"Irritability", d:"Short temper / easily bothered." },
      { k:"Body tension", d:"Tight chest/neck/shoulders." },
      { k:"Mild dizziness", d:"Occasional lightheadedness." }
    ],
    3: [
      { k:"High anxiety", d:"Hard to ignore; affects focus." },
      { k:"Breath hunger", d:"Feeling air-starved / dyspnea sensation." },
      { k:"Chest tightness", d:"Pressure/tight feeling." },
      { k:"Tremor / shakes", d:"Physically keyed up." },
      { k:"Racing thoughts", d:"Mind won’t settle." },
      { k:"Nausea", d:"Stomach upset." }
    ],
    4: [
      { k:"Severe distress", d:"Functioning significantly impaired." },
      { k:"Panic sensations", d:"Surge of fear / doom." },
      { k:"Marked dizziness", d:"Feels unsteady / near-faint." },
      { k:"Severe headache flare", d:"Pain spike impacting function." },
      { k:"Unable to relax", d:"Cannot downshift." },
      { k:"Safety concern", d:"Feels unsafe being alone right now." }
    ],
    5: [
      { k:"Crisis-level", d:"Cannot function; needs immediate support." },
      { k:"Overwhelmed", d:"Unable to cope." },
      { k:"Severe air hunger", d:"Breathing feels critically compromised." },
      { k:"Severe chest symptoms", d:"Concerning chest pressure/tightness." },
      { k:"Near-syncope", d:"Feels close to passing out." },
      { k:"Emergency-level fear", d:"Panic with loss of control." }
    ]
  });

  // --- Distress UI ---
  function bindDistressUI() {
    const wrap = document.getElementById("distressBtns");
    if (!wrap) return;

    // Level buttons
    wrap.querySelectorAll("button[data-d]").forEach(btn => {
      bindOnce(btn, "distressLevel_" + btn.getAttribute("data-d"), function () {
        const d = Number(btn.getAttribute("data-d"));
        UI.distress = clampInt(d, 0, 5);
        UI.distressTags = []; // reset per spec: tags are level-aligned
        renderDistressButtons();
        renderDistressTags();
        openDistressPicker(UI.distress);
      });
    });

    const btnClear = document.getElementById("btnClearDistress");
    bindOnce(btnClear, "clearDistress", function () {
      UI.distress = null;
      UI.distressTags = [];
      renderDistressButtons();
      renderDistressTags();
      closeDistressPicker(true);
    });

    // Modal buttons
    bindOnce(document.getElementById("btnCloseDistressModal"), "closeDistressModal", function(){ closeDistressPicker(true); });
    bindOnce(document.getElementById("btnDistressCancel"), "cancelDistressModal", function(){ closeDistressPicker(true); });
    bindOnce(document.getElementById("btnDistressApply"), "applyDistressModal", function(){ applyDistressPicker(); });
  }

  function renderDistressButtons() {
    const wrap = document.getElementById("distressBtns");
    if (!wrap) return;
    wrap.querySelectorAll("button[data-d]").forEach(btn => {
      const d = Number(btn.getAttribute("data-d"));
      if (UI.distress === d) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }

  function renderDistressTags() {
    const host = document.getElementById("distressTagList");
    if (!host) return;
    host.innerHTML = "";

    if (UI.distress == null) {
      // per spec: hidden until level selected; show nothing (not even empty pill)
      return;
    }

    const tags = UI.distressTags || [];
    if (!tags.length) {
      const muted = document.createElement("div");
      muted.className = "muted";
      muted.style.fontSize = "12px";
      muted.textContent = "No descriptors selected.";
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
        UI.distressTags = (UI.distressTags || []).filter(v => v !== t);
        renderDistressTags();
      });

      chip.appendChild(x);
      host.appendChild(chip);
    });
  }

  let pickerTemp = null;

  function openDistressPicker(level) {
    const overlay = document.getElementById("distressOverlay");
    const body = document.getElementById("distressPickBody");
    const ttl = document.getElementById("distressModalTitle");
    if (!overlay || !body || level == null) return;

    const L = clampInt(level, 0, 5);
    const items = (DISTRESS[L] || []).slice();

    pickerTemp = new Set((UI.distressTags || []).map(x => String(x).trim()));

    if (ttl) ttl.textContent = "Distress Level " + L;

    body.innerHTML = "";
    items.forEach(it => {
      const row = document.createElement("div");
      row.className = "vtPickItem";

      const left = document.createElement("div");
      left.className = "vtPickItemLeft";

      const nm = document.createElement("div");
      nm.className = "vtPickItemName";
      nm.textContent = it.k;

      const ds = document.createElement("div");
      ds.className = "vtPickItemDesc";
      ds.textContent = it.d;

      left.appendChild(nm);
      left.appendChild(ds);

      const tog = document.createElement("button");
      tog.type = "button";
      tog.className = "vtToggle" + (pickerTemp.has(it.k) ? " on" : "");
      tog.setAttribute("aria-pressed", pickerTemp.has(it.k) ? "true" : "false");

      tog.addEventListener("click", function () {
        if (pickerTemp.has(it.k)) pickerTemp.delete(it.k);
        else pickerTemp.add(it.k);
        tog.className = "vtToggle" + (pickerTemp.has(it.k) ? " on" : "");
        tog.setAttribute("aria-pressed", pickerTemp.has(it.k) ? "true" : "false");
      });

      row.appendChild(left);
      row.appendChild(tog);
      body.appendChild(row);
    });

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeDistressPicker(clearTemp) {
    const overlay = document.getElementById("distressOverlay");
    if (!overlay) return;
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    if (clearTemp) pickerTemp = null;
  }

  function applyDistressPicker() {
    if (!pickerTemp) {
      closeDistressPicker(true);
      return;
    }
    UI.distressTags = Array.from(pickerTemp);
    UI.distressTags.sort((a,b) => a.localeCompare(b));
    pickerTemp = null;
    renderDistressTags();
    closeDistressPicker(true);
  }

  // --- Meds UI ---
  function bindMedsUI() {
    const btnAdd = document.getElementById("btnAddMedToRecord");
    const inMed = document.getElementById("inMedName");
    bindOnce(btnAdd, "addMedToRecord", function () {
      const name = String((inMed && inMed.value) || "").trim();
      if (!name) return;

      // add to record
      const key = name.toLowerCase();
      const exists = (UI.meds || []).some(m => String(m.name).toLowerCase() === key);
      if (!exists) {
        UI.meds.push({ name: name, atTs: nowTs() });
        UI.meds = normalizeMeds(UI.meds);
        renderMedsTags();
      }

      // add to settings list (prefill)
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

    rec.distress = (UI.distress == null ? null : clampInt(UI.distress, 0, 5));
    rec.distressTags = normalizeStringArray(UI.distressTags || []);
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
Add Implementation: Step 9 of 12
Prev (this run): js/panels.js
Next (this run): js/symptoms.js
FileEditId: 1
Edited: 2026-01-21

Current file: js/add.js, File 9 of 12


Next file to fetch: js/symptoms.js, File 10 of 12



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js
Acceptance checks
- Add/Edit supports Distress 0–5 with descriptor picker modal and removable descriptor chips
- Add/Edit supports Medication event markers with settings prefill datalist
- Save enforces BP pairs (sys+dia) while allowing HR/Notes-only entries
- Add panel returns to previous panel via VTPanels.closeAdd()
*/ 
