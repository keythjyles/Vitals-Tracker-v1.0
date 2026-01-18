/* File: /js/panels.js */
/*
Vitals Tracker — Panel Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: panels.js
Purpose:
- Own ALL panel state and navigation.
- Implement continuous carousel behavior.
- Provide a single, authoritative API for panel changes.
- Remain UI-agnostic (no gesture logic here).

Panels (LOCKED ORDER):
Index 0 → Home
Index 1 → Charts
Index 2 → Log
Index 3 → Settings (future)

Carousel Rules (LOCKED):
- Swiping forward from last panel wraps to first.
- Swiping backward from first panel wraps to last.
- Only ONE panel has class `.active` at any time.
- Panel switching triggers no side effects except visibility.
- Rendering hooks are called explicitly where required.

Dependencies:
- DOM sections with class `.panel`
- IDs must remain stable across versions.

Exports (LOCKED):
- initPanels()
- nextPanel(direction)
- showPanelByIndex(index)
- getActivePanelIndex()

Change Log:
- v2.0xx: Initial locked carousel controller.
*/

let panels = [];
let activeIndex = 0;

/* ---------- Internal ---------- */

function clampIndex(i) {
  const len = panels.length;
  if (len === 0) return 0;
  if (i < 0) return len - 1;
  if (i >= len) return 0;
  return i;
}

function applyActive() {
  panels.forEach((p, i) => {
    if (i === activeIndex) {
      p.classList.add("active");
      p.setAttribute("aria-hidden", "false");
    } else {
      p.classList.remove("active");
      p.setAttribute("aria-hidden", "true");
    }
  });
}

/* ---------- Public API ---------- */

export function initPanels(root = document) {
  panels = Array.from(root.querySelectorAll(".panel"));

  if (!panels.length) {
    console.warn("Panels: no .panel elements found");
    return;
  }

  activeIndex = panels.findIndex(p => p.classList.contains("active"));
  if (activeIndex < 0) activeIndex = 0;

  applyActive();
}

export function nextPanel(direction = +1) {
  if (!panels.length) return;
  activeIndex = clampIndex(activeIndex + direction);
  applyActive();
}

export function showPanelByIndex(index) {
  if (!panels.length) return;
  activeIndex = clampIndex(index);
  applyActive();
}

export function getActivePanelIndex() {
  return activeIndex;
}

/* EOF: /js/panels.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
Reference Notes:
- This file is the single source of truth for panel order.
- Gesture code must NEVER manipulate DOM panel classes directly.
- Any new panel must be appended to DOM and order list updated here.
*/
