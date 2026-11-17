export function mountInsertionSettings(panel) {
 const part = name => panel.querySelector(`[data-insertion="${name}"]`);
 const group = (className, ...nodes) => {
  const element = document.createElement('div');
  element.className = className;
  element.append(...nodes);
  return element;
 };
 const close = part('close');
 const name = part('name');
 const rename = part('rename');
 const header = group('gs-insertion-header', name, rename, close);
 const navigation = group('gs-insertion-nav', part('go'), part('back'), part('frame'), part('forward'), part('move'));
 const range = group('gs-insertion-range');
 for (const [edge, caption] of [['in', 'IN'], ['out', 'OUT']]) {
  const field = part(edge);
  const label = document.createElement('label');
  label.htmlFor = field.id;
  label.textContent = caption;
  range.append(group('gs-insertion-edge', label, field, part('mark-' + edge)));
 }
 const status = part('status');
 const summary = part('summary');
 panel.prepend(header, navigation, range, group('gs-insertion-feedback', summary, status));
 close.autofocus = true;
 close.onclick = () => panel.close();
 name.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  rename.click();
 });
 panel.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.defaultPrevented) panel.close();
 });

 let player;
 const viewport = window.visualViewport;
 function fit() {
  const edge = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  const playerBottom = Math.max(0, player?.getBoundingClientRect().bottom ?? 0);
  panel.style.setProperty('--insertion-room', Math.max(170, edge - playerBottom - 6) + 'px');
  panel.style.setProperty('--insertion-bottom', Math.max(0, window.innerHeight - edge) + 'px');
 }
 const observer = new ResizeObserver(fit);
 panel.addEventListener('close', () => {
  observer.disconnect();
  window.removeEventListener('scroll', fit);
  window.removeEventListener('resize', fit);
  viewport?.removeEventListener('resize', fit);
  viewport?.removeEventListener('scroll', fit);
 });
 return () => {
  if (panel.open) return;
  player = document.querySelector('.gs-player-shell');
  player?.scrollIntoView({block:'start', behavior:'instant'});
  fit();
  panel.scrollTop = 0;
  panel.show();
  close.focus({preventScroll:true});
  if (player) observer.observe(player);
  window.addEventListener('scroll', fit, {passive:true});
  window.addEventListener('resize', fit);
  viewport?.addEventListener('resize', fit);
  viewport?.addEventListener('scroll', fit);
 };
}

export function fitInsertionRate(sourceSeconds, placementSeconds) {
 const rate = sourceSeconds / placementSeconds;
 if (!Number.isFinite(rate) || rate < .1 || rate > 8) {
  throw Error('Choose an OUT that fits the clip at 0.1× to 8×.');
 }
 return rate;
}
