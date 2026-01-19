/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)

FIX (SWIPE ONLY)
- Corrects drag-mode math so panels do not “double offset” (natural flex position + transform),
  which is the root cause of p0->p1 snapping to p2 and general drift.
- Keeps rotation order stable:
    Right swipe: Home -> Log -> Charts -> Home ...
    Left swipe:  Home -> Charts -> Log -> Home ...
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

  // Drag mode: track is positioned at the CURRENT rotating index; panels are moved relative to that.
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
      // We keep transition off during drag. The track position is set in swipeDelta()
      // because it depends on the current rotation index.
      deck.track.style.transition = "none";
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

  // Seamless wrap preview (corrected):
  // - During drag, the track is pinned to the CURRENT rotation index (so natural flex offsets are stable).
  // - Each rotating panel gets an additional transform equal to (desiredPosition - naturalPosition),
  //   preventing the “double offset” bug that causes drift and wrong snaps.
  function swipeDelta(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

    const n = ROTATION.length;
    const cur = getRotationIndex();

    setDragMode(true);

    // Pin track at the current rotation panel index (0..2), not at 0.
    deck.track.style.transition = "none";
    deck.track.style.transform = `translate3d(${-cur * 100}%, 0, 0)`;

    for (let i = 0; i < n; i++) {
      const name = ROTATION[i];
      const el = panels[name];
      if (!el) continue;

      // Natural position relative to pinned track is (i - cur) * 100.
      const raw = i - cur;
      const natural = raw * 100;

      // Wrapped relative position into [-1, 0, +1] for continuous wrap preview.
      let rel = raw;
      if (rel > 1) rel -= n;
      if (rel < -1) rel += n;

      const desired = (rel + deltaRatio) * 100;

      // Apply only the delta needed beyond natural position.
      const tx = desired - natural;
      el.style.transform = `translate3d(${tx}%, 0, 0)`;
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
