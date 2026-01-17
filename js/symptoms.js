/*
Vitals Tracker (Modular) — js/symptoms.js
App Version: v2.001
Purpose:
- Builds the symptom grid UI and manages selection state.
- Mirrors v1 behavior and styling assumptions (CSS classes):
  - .symItem, .symItem.selected, .box, .check, .symText
- Provides:
  - buildSymptoms(containerEl, symptomList)
  - getSelectedSymptoms()
  - clearSymptoms()
  - setSelectedSymptoms(names)

Latest Update (v2.001):
- Initial symptoms module created (no behavior drift from v1).
*/

export const DEFAULT_SYMPTOMS = [
  "Sweaty","Dizzy","Panic","Brain fog","Chest tight","Headache",
  "Nausea","Short breath","Hot ears","Shaky","Blurred vision","Weakness"
];

let _symptoms = [];
let _container = null;
const _state = new Map();

function setSelectedUI(itemEl, name, on){
  itemEl.classList.toggle("selected", on);
  itemEl.setAttribute("aria-checked", on ? "true" : "false");
  _state.set(name, on);
}

export function buildSymptoms(containerEl, symptomList = DEFAULT_SYMPTOMS){
  _container = containerEl;
  _symptoms = [...symptomList];
  _state.clear();

  if(!_container) return;
  _container.innerHTML = "";

  for(const name of _symptoms){
    const item = document.createElement("div");
    item.className = "symItem";
    item.setAttribute("role","checkbox");
    item.setAttribute("aria-checked","false");
    item.tabIndex = 0;

    const box = document.createElement("div");
    box.className = "box";
    const check = document.createElement("div");
    check.className = "check";
    box.appendChild(check);

    const text = document.createElement("div");
    text.className = "symText";
    text.textContent = name;

    item.appendChild(box);
    item.appendChild(text);

    const toggle = () => setSelectedUI(item, name, !_state.get(name));

    // Default off
    setSelectedUI(item, name, false);

    item.addEventListener("click", toggle);
    item.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        toggle();
      }
    });

    _container.appendChild(item);
  }
}

export function getSelectedSymptoms(){
  return _symptoms.filter(s => _state.get(s));
}

export function clearSymptoms(){
  for(const name of _symptoms) _state.set(name, false);
  if(!_container) return;
  for(const el of _container.querySelectorAll(".symItem")){
    el.classList.remove("selected");
    el.setAttribute("aria-checked","false");
  }
}

export function setSelectedSymptoms(names){
  const set = new Set((names || []).map(String));
  for(const name of _symptoms){
    _state.set(name, set.has(name));
  }
  if(!_container) return;
  for(const el of _container.querySelectorAll(".symItem")){
    const label = el.querySelector(".symText")?.textContent || "";
    const on = set.has(label);
    el.classList.toggle("selected", on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  }
}

/*
Vitals Tracker (Modular) — js/symptoms.js (EOF)
App Version: v2.001
Notes:
- Stateless outside the module except for in-memory selection.
- Next expected file: js/add.js (Add/Edit panel logic using storage + symptoms module)
*/
