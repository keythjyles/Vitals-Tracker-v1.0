/* File: /js/panels.js */
/*
Vitals Tracker — Panel State & Carousel Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: panels.js
Purpose:
- Own panel order, index, and visibility.
- Provide a single source of truth for panel navigation.
- Support circular (wrap-around) carousel behavior.
- Be gesture-agnostic (gestures.js calls into this module).

Panel Order (LOCKED):
0 = Home      (#panelHome)
1 = Charts    (#panelCharts)
2 = Log       (#panelLog)
3 = Settings  (#panelSettings)  // future-safe; may not exist yet

Rules (LOCKED):
1) Exactly one panel is .active at any time.
2) Navigation wraps in both directions.
3) This module NEVER handles touch events directly.
4) Missing panels are skipped safely.
5) Index remains stable even if a panel is temporarily absent.

Public API (LOCKED):
- initPanels()
- nextPanel(direction)
- setPanel(index)
- getPanelIndex()

Change Log:
- v2.0xx: Initial locked carousel panel controller.
*/

const PANEL_IDS = [
  "panelHome",
  "panelCharts",
  "panelLog",
  "panelSettings" // may not exist yet
];

let panels = [];
let currentIndex = 0;

/* ---------- Internal ---------- */

function resolvePanels() {
  panels = PANEL_IDS.map(id => document.getElementById(id));
}

function activateIndex(idx) {
  if (!panels.length) return;

  // Normalize index with wrap-around
  const len = panels.length;
  let i = ((idx % len) + len) % len;

  // Skip null panels (future-safe)
  let safety = 0;
  while (!panels[i] && safety < len) {
    i = (i + 1) % len;
    safety++;
  }

  panels.forEach(p => {
    if (p) p.classList.remove("active");
  });

  if (panels[i]) {
    panels[i].classList.add("active");
    currentIndex = i;
  }
}

/* ---------- Public API ---------- */

/**
 * Initialize panel system.
 * Call once after DOMContentLoaded.
 */
export function initPanels() {
  resolvePanels();

  // Find initially active panel if present
  let found = false;
  panels.forEach((p, i) => {
    if (p && p.classList.contains("active") && !found) {
      currentIndex = i;
      found = true;
    }
  });

  // Enforce single-active invariant
  activateIndex(currentIndex);
}

/**
 * Move to next or previous panel.
 * @param {number} direction +1 = next, -1 = previous
 */
export function nextPanel(direction) {
  if (typeof direction !== "number" || !direction) return;
  activateIndex(currentIndex + (direction > 0 ? 1 : -1));
}

/**
 * Set panel by absolute index.
 * @param {number} index
 */
export function setPanel(index) {
  if (!Number.isInteger(index)) return;
  activateIndex(index);
}

/**
 * Get current active panel index.
 * @returns {number}
 */
export function getPanelIndex() {
  return currentIndex;
}

/* EOF: /js/panels.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
Reference:
- This module is the ONLY owner of panel order and index.
- Gesture, button, or keyboard navigation must call into this API.
- Do NOT duplicate panel state elsewhere.
*/
