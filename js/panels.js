/* File: /js/panels.js */
/*
Vitals Tracker — Panels Carousel Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: panels.js
Purpose:
- Own the canonical panel order and index-based navigation.
- Provide wrap-around carousel behavior (0→1→2→3→0 and reverse).
- Expose a single navigation surface for gestures.js and app.js (no duplicate nav logic elsewhere).

Panel Order (locked):
0 = Home
1 = Charts
2 = Log
3 = Settings (reserved slot; may be placeholder if panel not present yet)

DOM Contract:
- Preferred: panels are registered by key -> element id.
- Keys: "home", "charts", "log", "settings"
- Expected element IDs (default mapping):
  home     -> #panelHome
  charts   -> #panelCharts
  log      -> #panelLog
  settings -> #panelSettings  (may not exist yet)

Behavior:
- Only one panel is active at a time via class "active".
- setPanel(index|key) applies active class safely even if a panel is missing.
- nextPanel(dir) wraps around (dir = +1 / -1).

Change Log:
- v2.0xx: Introduced canonical panel order + wrap-around next/prev helpers.
*/

const PANEL_ORDER = ["home", "charts", "log", "settings"];

const DEFAULT_ID_MAP = {
  home: "panelHome",
  charts: "panelCharts",
  log: "panelLog",
  settings: "panelSettings",
};

let _idMap = { ...DEFAULT_ID_MAP };
let _els = {};
let _currentIndex = 0;

function _getElByKey(key) {
  const id = _idMap[key];
  if (!id) return null;
  return document.getElementById(id) || null;
}

function _refreshEls() {
  _els = {};
  for (const key of PANEL_ORDER) {
    _els[key] = _getElByKey(key);
  }
}

function _normalizeIndex(i) {
  const n = PANEL_ORDER.length;
  const x = Number(i);
  if (!Number.isFinite(x)) return 0;
  // JS modulo that handles negatives:
  return ((Math.trunc(x) % n) + n) % n;
}

function _keyToIndex(key) {
  const k = String(key || "").toLowerCase();
  const idx = PANEL_ORDER.indexOf(k);
  return idx >= 0 ? idx : 0;
}

function _applyActive() {
  // Ensure we have a fresh handle in case DOM was replaced.
  _refreshEls();

  const activeKey = PANEL_ORDER[_currentIndex];

  for (const key of PANEL_ORDER) {
    const el = _els[key];
    if (!el) continue;
    if (key === activeKey) el.classList.add("active");
    else el.classList.remove("active");
  }
}

/**
 * Initialize panel controller.
 * @param {Object} [opts]
 * @param {Object} [opts.idMap] - Optional override mapping key->elementId.
 * @param {number|string} [opts.start] - Start panel index or key.
 */
export function initPanels(opts = {}) {
  if (opts && typeof opts.idMap === "object" && opts.idMap) {
    _idMap = { ...DEFAULT_ID_MAP, ...opts.idMap };
  } else {
    _idMap = { ...DEFAULT_ID_MAP };
  }

  if (typeof opts.start === "string") _currentIndex = _keyToIndex(opts.start);
  else if (typeof opts.start === "number") _currentIndex = _normalizeIndex(opts.start);
  else _currentIndex = 0;

  _applyActive();
}

/**
 * Set the active panel by index or key.
 * Wraps safely; if the target panel element doesn't exist, index still updates.
 * @param {number|string} indexOrKey
 * @returns {number} current index
 */
export function setPanel(indexOrKey) {
  if (typeof indexOrKey === "string") _currentIndex = _keyToIndex(indexOrKey);
  else _currentIndex = _normalizeIndex(indexOrKey);

  _applyActive();
  return _currentIndex;
}

/**
 * Move to next/previous panel with wrap-around.
 * @param {number} dir +1 or -1
 * @returns {number} current index
 */
export function nextPanel(dir = 1) {
  const step = dir >= 0 ? 1 : -1;
  _currentIndex = _normalizeIndex(_currentIndex + step);
  _applyActive();
  return _currentIndex;
}

/**
 * Get current panel index.
 * @returns {number}
 */
export function getPanelIndex() {
  return _currentIndex;
}

/**
 * Get current panel key.
 * @returns {string}
 */
export function getPanelKey() {
  return PANEL_ORDER[_currentIndex];
}

/**
 * Get canonical panel order (do not mutate).
 * @returns {string[]}
 */
export function getPanelOrder() {
  return PANEL_ORDER.slice();
}

/**
 * Convenience: hard refresh current panel application (e.g., after DOM changes).
 */
export function refreshPanels() {
  _applyActive();
}

/* EOF: /js/panels.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
Reference:
- Canonical order owned here: ["home","charts","log","settings"]
- Public API: initPanels, setPanel, nextPanel, getPanelIndex, getPanelKey, refreshPanels
*/
