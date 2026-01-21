/* File: js/symptoms.js */
/*
Vitals Tracker — Symptoms Catalog + Scoring + UI Builder
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.028a

FILE ROLE (LOCKED)
- Canonical symptom catalog (clinician-friendly labels + weights).
- Canonical distress computation from selected symptoms (0–100).
- Optional lightweight symptom-grid builder for legacy/simple UIs.
- Must NOT read/write storage.
- Must NOT render panels or own navigation.

VERIFICATION NOTES (THIS EDIT ONLY — NOT FUTURE INSTRUCTIONS)
- Verified backwards compatibility with v2.001 API:
  buildSymptoms(containerEl, symptomList), getSelectedSymptoms(), clearSymptoms(), setSelectedSymptoms(names)
- Added canonical APIs:
  getCatalog(), flattenCatalog(), computeScore(selectedKeys), labelsForKeys(keys),
  normalizeSelection(input), migrateLegacyNamesToKeys(names)
- Verified computeScore returns stable 0–100 with defensive caps and empty selection => 0.
- Verified stable symptom keys (do not change once deployed; add new items only).

IMPLEMENTATION ORDER
- Step: 3 of 6
- Previous: js/store.js
- Current:  js/symptoms.js
- Next:     js/add.js
*/

export const SYMPTOM_CATALOG = Object.freeze([
  {
    group: "Cardiovascular",
    items: [
      { key: "chest_tightness", label: "Chest tightness/pressure", w: 4, domains: ["cardio"] },
      { key: "palpitations", label: "Palpitations / pounding heart", w: 3, domains: ["cardio"] },
      { key: "skipped_beats", label: "Irregular / skipped beats", w: 3, domains: ["cardio"] },
      { key: "chest_pain", label: "Chest pain (non-traumatic)", w: 5, domains: ["cardio"] },
    ],
  },
  {
    group: "Respiratory",
    items: [
      { key: "shortness_of_breath", label: "Shortness of breath", w: 4, domains: ["resp"] },
      { key: "air_hunger", label: "Air hunger / breath hunger", w: 5, domains: ["resp"] },
      { key: "choking_sensation", label: "Choking sensation / throat tightness", w: 4, domains: ["resp"] },
      { key: "wheezing", label: "Wheezing", w: 3, domains: ["resp"] },
    ],
  },
  {
    group: "Neurologic",
    items: [
      { key: "dizziness", label: "Dizziness / vertigo", w: 3, domains: ["neuro"] },
      { key: "lightheaded", label: "Lightheadedness", w: 3, domains: ["neuro"] },
      { key: "near_syncope", label: "Near-faint / near-syncope", w: 5, domains: ["neuro"] },
      { key: "weakness", label: "Weakness", w: 3, domains: ["neuro"] },
      { key: "tremor", label: "Shaky / tremor", w: 3, domains: ["neuro"] },
      { key: "brain_fog", label: "Brain fog / mental fog", w: 3, domains: ["neuro"] },
      { key: "blurred_vision", label: "Blurred vision", w: 4, domains: ["neuro"] },
      { key: "headache", label: "Headache / migraine flare", w: 4, domains: ["neuro","pain"] },
    ],
  },
  {
    group: "Psychological",
    items: [
      { key: "panic", label: "Panic", w: 4, domains: ["psych"] },
      { key: "anxiety", label: "Anxiety / intense worry", w: 3, domains: ["psych"] },
      { key: "agitation", label: "Agitation / restlessness", w: 3, domains: ["psych"] },
      { key: "sense_of_doom", label: "Sense of doom", w: 4, domains: ["psych"] },
      { key: "racing_thoughts", label: "Racing thoughts", w: 3, domains: ["psych"] },
      { key: "irritability", label: "Irritability", w: 2, domains: ["psych"] },
    ],
  },
  {
    group: "Gastrointestinal",
    items: [
      { key: "nausea", label: "Nausea", w: 3, domains: ["gi"] },
      { key: "abdominal_pain", label: "Abdominal pain", w: 3, domains: ["gi"] },
      { key: "diarrhea", label: "Diarrhea", w: 3, domains: ["gi"] },
      { key: "constipation", label: "Constipation", w: 2, domains: ["gi"] },
    ],
  },
  {
    group: "Autonomic / Systemic",
    items: [
      { key: "sweaty", label: "Sweaty / clammy", w: 3, domains: ["autonomic"] },
      { key: "hot_flashes", label: "Hot flashes / heat intolerance", w: 3, domains: ["autonomic"] },
      { key: "chills", label: "Chills", w: 2, domains: ["autonomic"] },
      { key: "hot_ears", label: "Hot ears", w: 2, domains: ["autonomic"] },
      { key: "fatigue", label: "Fatigue", w: 2, domains: ["autonomic"] },
    ],
  },
  {
    group: "Sensory",
    items: [
      { key: "tinnitus_spike", label: "Tinnitus spike", w: 2, domains: ["sensory"] },
      { key: "sound_sensitivity", label: "Sound sensitivity (hyperacusis)", w: 3, domains: ["sensory"] },
      { key: "light_sensitivity", label: "Light sensitivity (photophobia)", w: 3, domains: ["sensory"] },
    ],
  },
]);

export const DEFAULT_SYMPTOMS = Object.freeze([
  // Kept for compatibility with v2.001; legacy/simple UIs can pass these labels.
  "Sweaty",
  "Dizzy",
  "Panic",
  "Brain fog",
  "Chest tight",
  "Headache",
  "Nausea",
  "Short breath",
  "Hot ears",
  "Shaky",
  "Blurred vision",
  "Weakness",
]);

const _INDEX = (function buildIndex(){
  const byKey = new Map();
  const byLabel = new Map();
  const all = [];

  for (const g of (SYMPTOM_CATALOG || [])) {
    for (const it of (g.items || [])) {
      if (!it || !it.key || !it.label) continue;

      const key = String(it.key).trim();
      const label = String(it.label).trim();
      if (!key || !label) continue;

      const item = {
        key,
        label,
        w: Number.isFinite(Number(it.w)) ? Number(it.w) : 1,
        domains: Array.isArray(it.domains) ? it.domains.map(String) : [],
        group: String(g.group || "").trim() || "Other",
      };

      // Do not allow duplicate keys (first wins)
      if (!byKey.has(key)) {
        byKey.set(key, item);
        all.push(item);
      }

      // Label lookup is best-effort; store lowercase to support migration
      const lk = label.toLowerCase();
      if (!byLabel.has(lk)) byLabel.set(lk, item);
    }
  }

  // Add a tiny alias layer for v1-style short labels -> canonical labels (best-effort).
  // These are NOT canonical items; they only help migration.
  const alias = new Map([
    ["sweaty", "Sweaty / clammy"],
    ["dizzy", "Dizziness / vertigo"],
    ["panic", "Panic"],
    ["brain fog", "Brain fog / mental fog"],
    ["chest tight", "Chest tightness/pressure"],
    ["headache", "Headache / migraine flare"],
    ["nausea", "Nausea"],
    ["short breath", "Shortness of breath"],
    ["hot ears", "Hot ears"],
    ["shaky", "Shaky / tremor"],
    ["blurred vision", "Blurred vision"],
    ["weakness", "Weakness"],
  ]);

  function findByLabelOrAlias(name){
    const raw = String(name || "").trim();
    if (!raw) return null;
    const k = raw.toLowerCase();
    const ali = alias.get(k);
    if (ali) {
      const it = byLabel.get(String(ali).toLowerCase());
      if (it) return it;
    }
    return byLabel.get(k) || null;
  }

  return Object.freeze({ byKey, byLabel, all, findByLabelOrAlias });
})();

export function getCatalog(){
  // Return a safe clone-ish structure (no functions) for UI rendering.
  return (SYMPTOM_CATALOG || []).map(g => ({
    group: String(g.group || "Other"),
    items: (g.items || []).map(it => ({
      key: String(it.key),
      label: String(it.label),
      w: Number.isFinite(Number(it.w)) ? Number(it.w) : 1,
      domains: Array.isArray(it.domains) ? it.domains.map(String) : [],
    })),
  }));
}

export function flattenCatalog(){
  return _INDEX.all.slice();
}

export function labelsForKeys(keys){
  const out = [];
  const seen = new Set();
  for (const k of (keys || [])) {
    const key = String(k || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    const it = _INDEX.byKey.get(key);
    if (it) {
      out.push(it.label);
      seen.add(key);
    }
  }
  return out;
}

export function migrateLegacyNamesToKeys(names){
  // Accepts old label strings and returns canonical keys where possible.
  const out = [];
  const seen = new Set();
  for (const n of (names || [])) {
    const it = _INDEX.findByLabelOrAlias(n);
    if (!it) continue;
    if (seen.has(it.key)) continue;
    seen.add(it.key);
    out.push(it.key);
  }
  return out;
}

export function normalizeSelection(input){
  // Accept keys or labels; returns canonical keys.
  if (!input) return [];
  if (Array.isArray(input)) {
    // Could be keys or labels; detect by key existence.
    const out = [];
    const seen = new Set();
    for (const v of input) {
      const s = String(v || "").trim();
      if (!s) continue;

      const byKey = _INDEX.byKey.get(s);
      const it = byKey ? byKey : _INDEX.findByLabelOrAlias(s);

      if (!it) continue;
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      out.push(it.key);
    }
    return out;
  }
  return [];
}

export function computeScore(selectedKeys){
  const keys = normalizeSelection(selectedKeys);
  if (!keys.length) return 0;

  // Sum selected weights
  let sumW = 0;
  for (const k of keys) {
    const it = _INDEX.byKey.get(k);
    if (!it) continue;
    const w = Number.isFinite(Number(it.w)) ? Number(it.w) : 1;
    sumW += Math.max(0, w);
  }

  // Normalize against catalog total weight (stable across records).
  // Note: adding new catalog items will change maxW; acceptable for v2 since the scoring is meant to be tunable.
  let maxW = 0;
  for (const it of _INDEX.all) {
    const w = Number.isFinite(Number(it.w)) ? Number(it.w) : 1;
    maxW += Math.max(0, w);
  }

  if (!maxW) return 0;

  let score = Math.round((100 * sumW) / maxW);

  // Defensive clamp
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(100, score));

  return score;
}

/* ------------------------------------------------------------------
   Legacy/simple symptom-grid builder (v2.001 compatibility)
   ------------------------------------------------------------------ */

let _symptoms = [];
let _container = null;
const _state = new Map();

function setSelectedUI(itemEl, name, on){
  itemEl.classList.toggle("selected", on);
  itemEl.setAttribute("aria-checked", on ? "true" : "false");
  _state.set(name, on);
}

export function buildSymptoms(containerEl, symptomList = DEFAULT_SYMPTOMS){
  // This builder is label-based and is intentionally minimal.
  // New distress/symptom modal work will consume SYMPTOM_CATALOG directly in add.js.
  _container = containerEl;
  _symptoms = Array.isArray(symptomList) ? [...symptomList] : [];
  _state.clear();

  if(!_container) return;
  _container.innerHTML = "";

  for(const name of _symptoms){
    const label = String(name || "").trim();
    if(!label) continue;

    const item = document.createElement("div");
    item.className = "symItem";
    item.setAttribute("role","checkbox");
    item.setAttribute("aria-checked","false");
    item.tabIndex = 0;

    const box = document.createElement("div");
    box.className = "box";
    const check = document.createElement("div");
    check.className = "check";
    box.appendChild(check);

    const text = document.createElement("div");
    text.className = "symText";
    text.textContent = label;

    item.appendChild(box);
    item.appendChild(text);

    const toggle = () => setSelectedUI(item, label, !_state.get(label));

    setSelectedUI(item, label, false);

    item.addEventListener("click", toggle);
    item.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        toggle();
      }
    });

    _container.appendChild(item);
  }
}

export function getSelectedSymptoms(){
  return _symptoms.filter(s => _state.get(s));
}

export function clearSymptoms(){
  for(const name of _symptoms) _state.set(name, false);
  if(!_container) return;
  for(const el of _container.querySelectorAll(".symItem")){
    el.classList.remove("selected");
    el.setAttribute("aria-checked","false");
  }
}

export function setSelectedSymptoms(names){
  const set = new Set((names || []).map(String));
  for(const name of _symptoms){
    _state.set(name, set.has(name));
  }
  if(!_container) return;
  for(const el of _container.querySelectorAll(".symItem")){
    const label = el.querySelector(".symText")?.textContent || "";
    const on = set.has(label);
    el.classList.toggle("selected", on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  }
}

/*
Vitals Tracker — EOF Verification Notes
File: js/symptoms.js
App Version Authority: js/version.js
Base: v2.028a

Implementation Order:
- Step: 3 of 6
- Previous: js/store.js
- Current:  js/symptoms.js
- Next:     js/add.js

Verified: catalog + scoring + v2.001 compatibility APIs retained
*/
