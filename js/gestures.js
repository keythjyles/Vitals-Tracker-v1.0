/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 6 of 9 (P0)
Prev file: js/panels.js (File 5 of 9)
Next file: js/chart.js (File 7 of 9)
*/

(function () {
  "use strict";

  /*
    GESTURE MODEL (SIMPLIFIED, LIQUID)
    - One responsibility: translate touch movement into panel drag
    - NO panel decisions here (panels.js owns snapping + activation)
    - Vertical gestures are ignored (Home pull-down handled elsewhere)
  */

  const deck = document.getElementById("panelDeck");
  if (!deck) return;

  let active = false;
  let startX = 0;
  let currentX = 0;
  let width = 0;

  function onStart(e) {
    if (e.touches.length !== 1) return;

    active = true;
    startX = e.touches[0].clientX;
    currentX = startX;
    width = deck.clientWidth || window.innerWidth;
  }

  function onMove(e) {
    if (!active) return;
    if (e.touches.length !== 1) return;

    const x = e.touches[0].clientX;
    const dx = x - startX;
    currentX = x;

    const ratio = dx / width;

    if (window.VTPanels && window.VTPanels.swipeDelta) {
      window.VTPanels.swipeDelta(ratio);
    }

    e.preventDefault();
  }

  function onEnd() {
    if (!active) return;
    active = false;

    const dx = currentX - startX;
    const ratio = dx / width;

    if (window.VTPanels && window.VTPanels.swipeEnd) {
      window.VTPanels.swipeEnd(ratio);
    }
  }

  deck.addEventListener("touchstart", onStart, { passive: true });
  deck.addEventListener("touchmove", onMove, { passive: false });
  deck.addEventListener("touchend", onEnd, { passive: true });
  deck.addEventListener("touchcancel", onEnd, { passive: true });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
Pass: Render Recovery + Swipe Feel
Pass order: File 6 of 9 (P0)
Prev file: js/panels.js (File 5 of 9)
Next file: js/chart.js (File 7 of 9)
*/
