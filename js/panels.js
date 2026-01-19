/* File: js/panels.js */
/*
Vitals Tracker - Panel Controller

App Version Authority: js/version.js
Base: v2.025e

FILE ROLE (LOCKED)
- Owns which panel is active.
- Owns deck translation math.
- Does NOT listen to touch directly (gestures.js feeds deltas).
- Does NOT render charts or logs.

Pass: Render Recovery + Swipe Feel
Pass order: File 4 of 9
Prev file: css/app.css (File 3 of 9)
Next file: js/gestures.js (File 5 of 9)
*/

(function () {
  "use strict";

  var PANEL_ORDER = ["home", "add", "charts", "log", "settings"];
  var currentIndex = 0;

  var deck = null;
  var track = null;

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function indexFor(name) {
    return PANEL_ORDER.indexOf(name);
  }

  function nameFor(index) {
    return PANEL_ORDER[index] || "home";
  }

  function setTransform(px, animate) {
    if (!track) return;

    if (animate) {
      track.style.transition = "transform 280ms cubic-bezier(.22,.61,.36,1)";
    } else {
      track.style.transition = "none";
    }

    track.style.transform = "translate3d(" + px + "px,0,0)";
  }

  function width() {
    return deck ? deck.clientWidth : window.innerWidth;
  }

  function gotoIndex(index, animate) {
    index = clamp(index, 0, PANEL_ORDER.length - 1);
    currentIndex = index;

    var x = -index * width();
    setTransform(x, animate);

    notifyPanelShown(nameFor(index));
  }

  function notifyPanelShown(name) {
    try {
      if (name === "charts" && window.VTChart && typeof window.VTChart.onShow === "function") {
        window.VTChart.onShow();
      }
      if (name === "log" && window.VTLog && typeof window.VTLog.onShow === "function") {
        window.VTLog.onShow();
      }
    } catch (e) {}
  }

  function show(name) {
    var idx = indexFor(name);
    if (idx === -1) return;
    gotoIndex(idx, true);
  }

  function onDrag(deltaX) {
    var base = -currentIndex * width();
    var x = base + deltaX;
    setTransform(x, false);
  }

  function onRelease(deltaX) {
    var w = width();
    var threshold = w * 0.18;

    if (deltaX > threshold) {
      gotoIndex(currentIndex - 1, true);
    } else if (deltaX < -threshold) {
      gotoIndex(currentIndex + 1, true);
    } else {
      gotoIndex(currentIndex, true);
    }
  }

  function init() {
    deck = $("deck");
    track = $("deckTrack");

    if (!deck || !track) return;

    // Initial position
    gotoIndex(currentIndex, false);

    // Resize safety
    window.addEventListener("resize", function () {
      gotoIndex(currentIndex, false);
    });
  }

  window.VTPanels = {
    init: init,
    show: show,
    onDrag: onDrag,
    onRelease: onRelease
  };

})();
 
/*
Vitals Tracker - EOF Version Notes
File: js/panels.js
Pass order: File 4 of 9
Prev file: css/app.css
Next file: js/gestures.js
*/
