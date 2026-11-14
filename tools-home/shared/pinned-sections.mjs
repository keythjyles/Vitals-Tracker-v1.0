export function setupPinnedSections({host, key, player, togglePlayer}) {
 const sections = [...document.querySelectorAll('[data-pin-section]')];
 const homes = sections.map(section => {
  const anchor = document.createComment(section.id);
  section.before(anchor);
  return anchor;
 });
 let active;
 let wasOpen = false;

 function pin(section) {
  if (active) {
   homes[sections.indexOf(active)].after(active);
   active.open = wasOpen;
   active.querySelector('[data-pin]').textContent = 'Pin';
   active.querySelector('[data-pin]').setAttribute('aria-pressed', 'false');
  }
  active = section;
  host.hidden = !active;
  if (section) {
   wasOpen = section.open;
   section.open = true;
   section.querySelector('[data-pin]').textContent = 'Unpin';
   section.querySelector('[data-pin]').setAttribute('aria-pressed', 'true');
   host.append(section);
  }
  try { localStorage.setItem(key, section?.id || ''); } catch {}
 }
 for (const section of sections) {
  section.querySelector('[data-pin]').onclick = event => {
   event.preventDefault();
   event.stopPropagation();
   pin(active === section ? null : section);
  };
 }
 try {
  const remembered = sections.find(section => section.id === localStorage.getItem(key));
  if (remembered) pin(remembered);
 } catch {}

 if (!togglePlayer) return;
 togglePlayer.onclick = () => {
  const pinPlayer = togglePlayer.getAttribute('aria-pressed') !== 'true';
  togglePlayer.setAttribute('aria-pressed', String(pinPlayer));
  togglePlayer.textContent = pinPlayer ? 'Unpin player' : 'Pin player';
  player.style.setProperty('position', pinPlayer ? 'sticky' : 'static', 'important');
 };
}
