/*
Vitals Tracker (Modular) — js/app.js
App Version: v2.001

Purpose:
- Single entrypoint loaded by index.html (type="module").
- Boots the application in a controlled order:
  1) Wire PWA install events
  2) Initialize UI (panels, add/edit overlay, log, charts)
- No data migration, no key changes. Your existing v1 localStorage data remains untouched.

Latest Update (v2.001):
- Initial modular bootstrap for v2.
- Ensures install events are wired before UI renders (so Install button state is correct early).
*/

import { wireInstallEvents, refreshInstallButton } from "./pwa.js";
import { initUI } from "./ui.js";

(function boot(){
  try{
    wireInstallEvents();
    refreshInstallButton();
  }catch{}

  // UI boot (renders Home, then Log/Charts on navigation)
  initUI();
})();

/*
Vitals Tracker (Modular) — js/app.js (EOF)
App Version: v2.001
Notes:
- index.html must load this as:
    <script type="module" src="./js/app.js"></script>
- Next expected file: index.html (you said you want index.html in another chat with no commentary).
*/
