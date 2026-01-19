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

  const ROTATION = ["home", "charts", "log"];                      // swipe carousel
  const TRACK_ORDER = ["home", "charts", "log", "settings", "add"]; // DOM order in deckTrack

  let currentPanel = "home";
  let lastMainPanel = "home";   // last rotating panel (home/charts/log)
  let inSettings = false;
  let inAdd = false;

  // Drag mode for seamless wrap preview (0 <-> 2)
  let dragMode = false;

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

  function dispatchPanelChanged(activeName) {
    try {
      document.dispatchEvent(new CustomEvent("vt:panelChanged", {
        detail: { active: activeName }
      }));
    } catch (_) {}
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

    dispatchPanelChanged(name);
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

  function clearRotationPanelTransforms() {
    ROTATION.forEach(n => {
      const el = panels[n];
      if (el) el.style.transform = "";
    });
  }

  function setDragMode(on) {
    if (dragMode === on) return;
    dragMode = on;

    if (!deck.track) return;

    if (on) {
      // Freeze track; we will move panels individually to enable seamless wrap preview.
      deck.track.style.transition = "none";
      deck.track.style.transform = "translate3d(0,0,0)";
    } else {
      clearRotationPanelTransforms();
    }
  }

  function go(name, animated = true) {
    if (!panels[name]) return;

    // Leaving special modes
    if (inSettings && name !== "settings") inSettings = false;
    if (inAdd && name !== "add") inAdd = false;

    // Track last main panel (rotating only)
    if (isRotatingPanel(name)) lastMainPanel = name;

    currentPanel = name;

    // Settings (non-rotating)
    if (name === "settings") {
      inSettings = true;
      setDragMode(false);
      setActivePanel("settings");
      applyTransformToPanel("settings", animated);
      return;
    }

    // Add (non-rotating)
    if (name === "add") {
      inAdd = true;
      setDragMode(false);
      setActivePanel("add");
      applyTransformToPanel("add", animated);
      return;
    }

    // Normal rotating panels
    setDragMode(false);
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
    const target = isRotatingPanel(lastMainPanel) ? lastMainPanel : "home";
    go(target, animated);
  }

  /* ============================
     Add (NON-ROTATING)
     ============================ */

  function openAdd() {
    if (!panels.add) return;
    go("add", false);
  }

  function closeAdd(animated = true) {
    inAdd = false;
    const target = isRotatingPanel(lastMainPanel) ? lastMainPanel : "home";
    go(target, animated);
  }

  /* ============================
     Swipe API (gestures.js calls these)
     ============================ */

  function canSwipe() {
    return !inSettings && !inAdd && isRotatingPanel(currentPanel);
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

  // Seamless wrap preview:
  // We render a 3-panel carousel by moving panels individually. This avoids abrupt jumps at 0<->2.
  function swipeDelta(deltaRatio) {
    if (!canSwipe()) return;

    if (!deck.track) return;

    // Enter drag mode as soon as a horizontal delta exists
    setDragMode(true);

    const n = ROTATION.length;
    const cur = getRotationIndex();

    deck.track.style.transition = "none";
    deck.track.style.transform = "translate3d(0,0,0)";

    // Place each rotating panel at the nearest relative position (-1, 0, +1) around current,
    // then apply drag delta to all for continuous motion (including wrap).
    for (let i = 0; i < n; i++) {
      const name = ROTATION[i];
      const el = panels[name];
      if (!el) continue;

      // smallest circular distance into [-1,0,+1]
      let rel = i - cur;
      if (rel > 1) rel -= n;
      if (rel < -1) rel += n;

      const x = (rel + deltaRatio) * 100;
      el.style.transform = `translate3d(${x}%, 0, 0)`;
    }
  }

  function swipeEnd(deltaRatio) {
    if (!canSwipe()) return;

    const THRESH = 0.2;

    // Exit drag mode before snapping to the track transform
    setDragMode(false);

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

    // Snap back (no change)
    go(currentPanel, true);
  }

  /* ============================
     Init
     ============================ */

  function init() {
    cacheDom();
    currentPanel = "home";
    lastMainPanel = "home";
    inSettings = false;
    inAdd = false;
    setDragMode(false);
    go("home", false);
  }

  window.VTPanels = Object.freeze({
    init,
    go,

    // settings
    openSettings,
    closeSettings,

    // add
    openAdd,
    closeAdd,

    // swipe API
    canSwipe,
    swipeDelta,
    swipeEnd,

    // utilities
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
```0
