/* File: /js/gestures.js */
/*
Vitals Tracker — Gesture Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: gestures.js
Purpose:
- Handle horizontal swipe gestures for panel carousel navigation.
- Delegate panel changes to panels.js ONLY.
- Protect chart interaction area from panel swipes.
- Remain isolated from chart pinch/zoom logic.

Dependencies (LOCKED):
- panels.js (initPanels, nextPanel)

Protected Zones (LOCKED):
- Any element matching: #canvasWrap, #chartCanvas
  → Horizontal swipes starting inside these zones MUST NOT trigger panel navigation.

Gesture Rules (LOCKED):
1) Horizontal swipe only (ignore vertical).
2) Minimum swipe distance required.
3) Carousel wraps (handled by panels.js).
4) No interference with chart pan/pinch.
5) Touch-only; no mouse emulation.

Change Log:
- v2.0xx: Initial locked swipe controller with chart protection.
*/

import { nextPanel } from "./panels.js";

const SWIPE_MIN_PX = 48;
const SWIPE_MAX_VERTICAL = 32;

let touchStartX = 0;
let touchStartY = 0;
let tracking = false;
let blocked = false;

/* ---------- Utilities ---------- */

function isProtectedTarget(target) {
  if (!target) return false;
  return (
    target.closest("#canvasWrap") ||
    target.closest("#chartCanvas")
  );
}

/* ---------- Handlers ---------- */

function onTouchStart(e) {
  if (e.touches.length !== 1) return;

  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  tracking = true;
  blocked = isProtectedTarget(e.target);
}

function onTouchMove(e) {
  if (!tracking || blocked) return;

  const t = e.touches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  // Abort if vertical intent detected
  if (Math.abs(dy) > SWIPE_MAX_VERTICAL) {
    tracking = false;
    return;
  }

  // Prevent scroll once horizontal intent is clear
  if (Math.abs(dx) > 12) {
    e.preventDefault();
  }
}

function onTouchEnd(e) {
  if (!tracking || blocked) {
    tracking = false;
    blocked = false;
    return;
  }

  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  tracking = false;

  if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return;
  if (Math.abs(dx) < SWIPE_MIN_PX) return;

  // Swipe direction:
  // left swipe (dx < 0) → next panel
  // right swipe (dx > 0) → previous panel
  nextPanel(dx < 0 ? +1 : -1);
}

/* ---------- Init ---------- */

export function initGestures() {
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
}

/* EOF: /js/gestures.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
Reference:
- This file ONLY handles panel swipe gestures.
- Chart gestures (pan/zoom) are owned elsewhere.
- Any new interactive chart surface must be added to Protected Zones.
*/
