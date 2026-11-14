const reportURL = new URL('../tools/jokelab/', import.meta.url).href;
const handoff = new URLSearchParams(location.hash.slice(1));
if (['report', 'reportz', 'seed', 'seedz'].some(key => handoff.has(key))) {
  location.replace(reportURL + location.hash);
}

const search = document.getElementById('toolSearch');
const searchStatus = document.getElementById('searchStatus');
const groups = [...document.querySelectorAll('.tool-group')];
document.getElementById('searchPanel').hidden = false;

search.addEventListener('input', () => {
  const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const group of groups) {
    let hits = 0;
    for (const row of group.querySelectorAll('li')) {
      row.hidden = !words.every(word => row.textContent.toLowerCase().includes(word));
      if (!row.hidden) hits++;
    }
    group.hidden = hits === 0;
    count += hits;
  }
  searchStatus.textContent = words.length ? (count ? count + (count === 1 ? ' tool' : ' tools') : 'No tools found.') : '';
});

const customKey = 'toolsHub.links.v1';
const extra = document.getElementById('directoryExtras');
const list = document.getElementById('moreLinks');
const form = document.getElementById('customToolForm');
const customStatus = document.getElementById('customToolStatus');
let custom = {};
try {
  const saved = JSON.parse(localStorage.getItem(customKey) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) custom = saved;
} catch {}

function showCustomLinks() {
  for (const node of list.querySelectorAll('[data-custom-tool]')) node.remove();
  const destinations = new Set([...document.querySelectorAll('a.tool,#moreLinks a')].map(link => link.href));
  for (const [name, address] of Object.entries(custom)) {
    let url;
    try { url = new URL(address); } catch { continue; }
    if (url.protocol !== 'https:' || destinations.has(url.href)) continue;
    destinations.add(url.href);
    const item = document.createElement('li');
    item.dataset.customTool = '';
    const link = document.createElement('a');
    link.href = url.href;
    link.textContent = name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.append(link);
    list.append(item);
  }
}
showCustomLinks();
extra.hidden = false;
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get('name').trim();
  try {
    const url = new URL(data.get('url'));
    if (!name || url.protocol !== 'https:') throw Error();
    const next = {...custom, [name]: url.href};
    localStorage.setItem(customKey, JSON.stringify(next));
    custom = next;
    showCustomLinks();
    form.reset();
    customStatus.textContent = 'Tool link saved on this browser.';
  } catch {
    customStatus.textContent = 'Enter a name and an HTTPS address. Check that browser storage is available.';
  }
});

const prompt=(kind)=>`JokeGen v1.2 — ${kind==='seeds'?'produce 25 seed jokes':kind==='analysis'?'analyze the joke I provide and produce 25 tone/tense variants':'develop long-form jokes from the seed I provide'}.
${kind==='seeds'?'Use simple dad-type deadpan humor and a variety of premises and mechanisms. Give 25 standalone base specimens, not 25 minor rewrites of one premise.':'Use the supplied specimen. If I have not supplied one, ask for it before generating.'}
Examine the setup, expectation, hinge and payoff. Explore adverbs, qualifiers, attribution and placement. Preserve the premise while allowing tone to shift implications. Keep spoken rhythm natural; shortest is not automatically best. Human and AI synthesize the humor together. Do not assign grades, rankings or winners. Stop speaking after the final punchline. Carry each treatment’s tone into script, voice and video directions.
${kind==='longform'?'Expand context, characters, narrative and escalation around the seed. Distinguish a faithful expansion from a new branch. Added words must serve the construction; do not explain the payoff.':''}
Present a readable report grouped by tone and labeled by tense. Include exact joke text and concise mechanism, rhythm and provenance notes. Originality is unverified unless established.
Finish with report JSON: {"schema":"JokeReport-1.0","id":"unique-batch-id","name":"batch name","source":"source specimen or seed-batch description","notes":"batch observations","variants":[{"id":"unique-id","text":"complete spoken joke","tone":"descriptive tone","tense":"Present tense","qualifier":"operator or none","notes":"mechanism, rhythm, provenance and performance directions"}]}.
Link each joke to ${reportURL}#seed= followed by URL-safe base64 of UTF-8 JSON of the same report wrapper with exactly that one variant. Link the whole report with #report= and the full wrapper. If file creation is supported, supply a standalone HTML report and JSON file. Otherwise provide the JSON for Reports → Import. Never invent a hosted URL or claim the report was saved in the tools.
No separate AI API, paid generation service, automatic publishing or changes to the tools. Use this chat’s available capabilities. If actual credit telemetry is unavailable, do not invent a credit total.`;

const promptField = document.getElementById('promptText');
const promptStatus = document.getElementById('promptStatus');
for (const button of document.querySelectorAll('[data-prompt]')) {
  button.addEventListener('click', () => {
    const value = prompt(button.dataset.prompt);
    promptField.value = value;
    promptField.parentElement.hidden = false;
    promptStatus.textContent = 'Select and copy the prompt to use it in ChatGPT.';
    navigator.clipboard?.writeText(value).then(
      () => { promptStatus.textContent = 'Prompt copied. Paste it into ChatGPT.'; },
      () => {},
    );
    window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
  });
}
