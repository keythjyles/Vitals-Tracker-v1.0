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
    PANEL MODEL
    - Home / Charts / Log participate in swipe rotation
    - Settings is EXCLUDED from rotation and opened explicitly
    - Add participates but may be temporarily gated
  */

  const ROTATION = ["home", "charts", "log", "add"];

  let currentIndex = 0;
  let inSettings = false;

  const panels = {};
  const deck = {};

  function cacheDom() {
    deck.root = document.getElementById("panelDeck");
    deck.track = document.getElementById("deckTrack");

    panels.home = document.getElementById("panelHome");
    panels.charts = document.getElementById("panelCharts");
    panels.log = document.getElementById("panelLog");
    panels.add = document.getElementById("panelAdd");
    panels.settings = document.getElementById("panelSettings");
  }

  function indexFor(name) {
    return ROTATION.indexOf(name);
  }

  function clampIndex(i) {
    if (i < 0) return 0;
    if (i >= ROTATION.length) return ROTATION.length - 1;
    return i;
  }

  function applyTransform(animated = true) {
    if (!deck.track) return;

    deck.track.style.transition = animated
      ? "transform 320ms cubic-bezier(.2,.8,.2,1)"
      : "none";

    const x = -currentIndex * 100;
    deck.track.style.transform = `translate3d(${x}%, 0, 0)`;
  }

  function activatePanels() {
    Object.keys(panels).forEach(k => {
      panels[k] && panels[k].classList.remove("active");
    });

    const name = ROTATION[currentIndex];
    const p = panels[name];
    p && p.classList.add("active");

    // Chart refresh hook
    if (name === "charts" && window.VTChart?.onShow) {
      window.VTChart.onShow();
    }
    if (name === "log" && window.VTLog?.onShow) {
      window.VTLog.onShow();
    }
  }

  function go(name, animated = true) {
    if (inSettings) closeSettings(false);

    const idx = indexFor(name);
    if (idx === -1) return;

    currentIndex = idx;
    applyTransform(animated);
    activatePanels();
  }

  /* ============================
     Settings (NON-ROTATING)
     ============================ */

  function openSettings() {
    if (!panels.settings) return;
    inSettings = true;

    Object.values(panels).forEach(p => p && p.classList.remove("active"));
    panels.settings.classList.add("active");

    if (deck.track) {
      deck.track.style.transition = "none";
      deck.track.style.transform = "translate3d(0,0,0)";
    }
  }

  function closeSettings(animated = true) {
    inSettings = false;
    applyTransform(animated);
    activatePanels();
  }

  /* ============================
     Swipe Hooks (called by gestures.js)
     ============================ */

  function swipeToIndex(idx) {
    if (inSettings) return;
    currentIndex = clampIndex(idx);
    applyTransform(true);
    activatePanels();
  }

  function swipeDelta(deltaRatio) {
    if (inSettings) return;
    if (!deck.track) return;

    deck.track.style.transition = "none";
    const x = (-currentIndex * 100) + (deltaRatio * 100);
    deck.track.style.transform = `translate3d(${x}%, 0, 0)`;
  }

  function swipeEnd(deltaRatio) {
    if (inSettings) return;

    if (deltaRatio > 0.2 && currentIndex > 0) {
      currentIndex--;
    } else if (deltaRatio < -0.2 && currentIndex < ROTATION.length - 1) {
      currentIndex++;
    }

    applyTransform(true);
    activatePanels();
  }

  /* ============================
     Init
     ============================ */

  function init() {
    cacheDom();
    go("home", false);
  }

  window.VTPanels = Object.freeze({
    init,
    go,
    openSettings,
    closeSettings,
    swipeToIndex,
    swipeDelta,
    swipeEnd
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
