/* File: /js/gestures.js */
/*
Vitals Tracker — Global Gesture Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: gestures.js
Purpose:
- Own horizontal swipe navigation between panels (carousel).
- Enforce wrap-around behavior via panels.js (no local state duplication).
- Protect chart interaction zones so chart pan/pinch NEVER trigger panel swipes.
- Keep behavior simple, predictable, and accessibility-friendly.

Dependencies (locked):
- panels.js (imported functions):
    initPanels(), nextPanel(), setPanel(), getPanelIndex()

Gesture Rules (locked):
1) Horizontal swipe (left/right) anywhere EXCEPT protected zones → panel carousel.
2) Vertical gestures are ignored here (handled elsewhere or by browser).
3) Any touch that starts inside a protected element is ignored entirely by this module.
4) Minimum horizontal distance required to trigger panel change.
5) Only one panel change per gesture.

Protected Zones:
- Chart interaction surface:
    #canvasWrap
    #chartCanvas
  (Any ancestor match also blocks panel swipes.)

Panel Order (owned by panels.js):
0 Home → 1 Charts → 2 Log → 3 Settings → wrap

Change Log:
- v2.0xx: Initial carousel gesture controller with strict chart protection.
*/

import { nextPanel } from "./panels.js";

const SWIPE_MIN_PX = 42;     // minimum horizontal movement to count as swipe
const SWIPE_MAX_TIME = 550; // ms; slow drags ignored to prevent accidental nav

let startX = 0;
let startY = 0;
let startTime = 0;
let tracking = false;
let blocked = false;

/* ---------- Utilities ---------- */

function isProtectedTarget(target) {
  if (!target) return false;

  // Direct matches
  if (
    target.id === "canvasWrap" ||
    target.id === "chartCanvas"
  ) return true;

  // Ancestor walk (defensive)
  let el = target.parentElement;
  while (el) {
    if (
      el.id === "canvasWrap" ||
      el.id === "chartCanvas"
    ) return true;
    el = el.parentElement;
  }
  return false;
}

/* ---------- Touch Handlers ---------- */

function onTouchStart(e) {
  if (!e.touches || e.touches.length !== 1) return;

  const t = e.touches[0];
  startX = t.clientX;
  startY = t.clientY;
  startTime = Date.now();
  tracking = true;
  blocked = isProtectedTarget(e.target);
}

function onTouchMove(e) {
  if (!tracking || blocked) return;
  // Do nothing — decision made on touchend
}

function onTouchEnd(e) {
  if (!tracking) return;

  tracking = false;
  if (blocked) return;

  const elapsed = Date.now() - startTime;
  if (elapsed > SWIPE_MAX_TIME) return;

  const t = (e.changedTouches && e.changedTouches[0]) || null;
  if (!t) return;

  const dx = t.clientX - startX;
  const dy = t.clientY - startY;

  // Require primarily horizontal movement
  if (Math.abs(dx) < SWIPE_MIN_PX) return;
  if (Math.abs(dx) < Math.abs(dy)) return;

  // Direction:
  // swipe left  -> next panel (+1)
  // swipe right -> previous panel (-1)
  if (dx < 0) {
    nextPanel(+1);
  } else {
    nextPanel(-1);
  }
}

/* ---------- Public Init ---------- */

/**
 * Initialize global swipe handling.
 * Should be called ONCE after DOM is ready and panels are initialized.
 */
export function initGestures() {
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
}

/* EOF: /js/gestures.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
Reference:
- Owns ONLY panel-level swipe navigation.
- Chart gestures are explicitly protected and never intercepted.
- Panel order and wrap logic live exclusively in panels.js.
*/
