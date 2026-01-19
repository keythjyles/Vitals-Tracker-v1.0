/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)
*/

(function () {
  "use strict";

  /*
    PANEL MODEL (LOCKED FOR THIS PASS)
    - Swipe rotation is ONLY: Home / Charts / Log (loop)
      Home=0, Charts=1, Log=2 (rotation indices)
    - Settings is NOT in rotation. Opened by gear only.
    - Add is NOT in rotation. Opened explicitly by button only.
    - Deck track DOM order is:
        home(0), charts(1), log(2), settings(3), add(4)
      We must respect TRACK_ORDER for transforms.
  */

  const ROTATION = ["home", "charts", "log"];                 // swipe carousel
  const TRACK_ORDER = ["home", "charts", "log", "settings", "add"]; // DOM order in deckTrack

  let currentPanel = "home";
  let inSettings = false;

  const panels = {};
  const deck = {};

  function cacheDom() {
    deck.root = document.getElementById("panelDeck");
    deck.track = document.getElementById("deckTrack");

    panels.home = document.getElementById("panelHome");
    panels.charts = document.getElementById("panelCharts");
    panels.log = document.getElementById("panelLog");
    panels.settings = document.getElementById("panelSettings");
    panels.add = document.getElementById("panelAdd");
  }

  function trackIndexFor(name) {
    return TRACK_ORDER.indexOf(name);
  }

  function rotationIndexFor(name) {
    return ROTATION.indexOf(name);
  }

  function isRotatingPanel(name) {
    return rotationIndexFor(name) !== -1;
  }

  function setActivePanel(name) {
    Object.keys(panels).forEach(k => {
      panels[k] && panels[k].classList.remove("active");
    });

    const p = panels[name];
    p && p.classList.add("active");

    // Feature hooks
    try {
      if (name === "charts" && window.VTChart?.onShow) window.VTChart.onShow();
      if (name === "log" && window.VTLog?.onShow) window.VTLog.onShow();
    } catch (_) {}
  }

  function applyTransformToPanel(name, animated = true) {
    if (!deck.track) return;

    const idx = trackIndexFor(name);
    if (idx === -1) return;

    deck.track.style.transition = animated
      ? "transform 320ms cubic-bezier(.2,.8,.2,1)"
      : "none";

    const x = -idx * 100;
    deck.track.style.transform = `translate3d(${x}%, 0, 0)`;
  }

  function go(name, animated = true) {
    // Close settings if we are leaving it
    if (inSettings && name !== "settings") {
      inSettings = false;
    }

    if (!panels[name]) return;

    currentPanel = name;

    // Settings is allowed, but NOT part of swipe rotation
    if (name === "settings") {
      inSettings = true;
      setActivePanel("settings");
      applyTransformToPanel("settings", animated);
      return;
    }

    // Normal panels
    setActivePanel(name);
    applyTransformToPanel(name, animated);
  }

  /* ============================
     Settings (NON-ROTATING)
     ============================ */

  function openSettings() {
    if (!panels.settings) return;
    go("settings", false);
  }

  function closeSettings(animated = true) {
    inSettings = false;
    // Return to last non-settings panel
    if (!panels[currentPanel] || currentPanel === "settings") currentPanel = "home";
    go(currentPanel === "settings" ? "home" : currentPanel, animated);
  }

  /* ============================
     Swipe API (gestures.js calls these)
     ============================ */

  function canSwipe() {
    return !inSettings && isRotatingPanel(currentPanel);
  }

  function getRotationIndex() {
    const idx = rotationIndexFor(currentPanel);
    return idx === -1 ? 0 : idx;
  }

  function showByRotationIndex(rotIdx, animated = true) {
    const n = ROTATION.length;
    const wrapped = ((rotIdx % n) + n) % n;
    const name = ROTATION[wrapped];
    go(name, animated);
  }

  // Visual drag while swiping (only within the non-wrapping neighbors)
  // NOTE: For wrap edges (Home drag-right, Log drag-left), we do NOT drag across;
  // we only wrap on release. This keeps motion stable with current DOM order.
  function swipeDelta(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

    const rot = getRotationIndex();
    const isAtLeftEdge = (rot === 0);               // Home
    const isAtRightEdge = (rot === ROTATION.length - 1); // Log

    // Block drag beyond edges (wrap will occur on end)
    if (deltaRatio > 0 && isAtLeftEdge) deltaRatio = 0;
    if (deltaRatio < 0 && isAtRightEdge) deltaRatio = 0;

    deck.track.style.transition = "none";

    const trackIdx = trackIndexFor(currentPanel);
    if (trackIdx === -1) return;

    const x = (-trackIdx * 100) + (deltaRatio * 100);
    deck.track.style.transform = `translate3d(${x}%, 0, 0)`;
  }

  function swipeEnd(deltaRatio) {
    if (!canSwipe()) return;

    const THRESH = 0.2;

    // Right swipe => PREV (wrap enabled)
    if (deltaRatio > THRESH) {
      showByRotationIndex(getRotationIndex() - 1, true);
      return;
    }

    // Left swipe => NEXT (wrap enabled)
    if (deltaRatio < -THRESH) {
      showByRotationIndex(getRotationIndex() + 1, true);
      return;
    }

    // Snap back
    applyTransformToPanel(currentPanel, true);
    setActivePanel(currentPanel);
  }

  /* ============================
     Init
     ============================ */

  function init() {
    cacheDom();
    currentPanel = "home";
    inSettings = false;
    go("home", false);
  }

  window.VTPanels = Object.freeze({
    init,
    go,
    openSettings,
    closeSettings,

    // swipe API
    canSwipe,
    swipeDelta,
    swipeEnd,

    // utilities (optional, but useful)
    getRotationIndex,
    showByRotationIndex
  });

})();

/* 
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
Pass: Render Recovery + Swipe Feel
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)
*/
