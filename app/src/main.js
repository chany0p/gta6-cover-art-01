// Vice Cover — wires the editor: layouts, grades, per-panel photos, caption, export.
// State lives in one object; every change redraws the preview canvas.
import { drawCover, layoutRects, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const $ = (id) => document.getElementById(id);

const SAMPLES = ['pier', 'boulevard'];
const state = {
  layout: 'grid4',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Vice City • 2026',
  font: 'anton',
  titleSize: 1,
  color: '#ffffff',
  gradient: true,
  outline: true,
  shadow: true,
  titlePos: 'bottom',
  badge: true,
  badgeText: 'Vice City • 2026',
  grain: true,
  vignette: true,
  panels: Array.from({ length: 9 }, (_, i) => ({ img: null, ox: 0, oy: 0, zoom: 1, sample: SAMPLES[i % 2] })),
};
let selected = 0;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(i) {
  const p = state.panels[i];
  if (!p.img) p.img = await loadImage(`samples/${p.sample}.jpg`);
  return p.img;
}

function redraw() {
  drawCover(canvas, state);
}

function setStatus(msg) { statusEl.textContent = msg; }

/* ---------- layout + grade pickers ---------- */
function buildPicker(el, items, current, onPick) {
  el.innerHTML = '';
  for (const [value, label] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (value === current ? ' active' : '');
    b.textContent = label;
    b.dataset.value = value;
    b.addEventListener('click', () => {
      onPick(value);
      [...el.children].forEach((c) => c.classList.toggle('active', c.dataset.value === value));
      redraw();
    });
    el.appendChild(b);
  }
}
buildPicker($('layouts'), Object.entries(LAYOUTS).map(([v, o]) => [v, o.label]), state.layout, (v) => {
  state.layout = v; selected = 0; syncPanelUI();
});
buildPicker($('grades'), ['sunset', 'neon', 'noir', 'vice', 'heat'].map((g) => [g, g[0].toUpperCase() + g.slice(1)]), state.grade, (v) => { state.grade = v; });

/* ---------- per-panel photo ---------- */
function syncPanelUI() {
  $('panelLabel').textContent = `Panel ${selected + 1} of ${LAYOUTS[state.layout].panels}`;
  $('zoom').value = state.panels[selected].zoom;
  $('zoomVal').textContent = `${Math.round(state.panels[selected].zoom * 100)}%`;
}
$('zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  $('zoomVal').textContent = `${Math.round(state.panels[selected].zoom * 100)}%`;
  redraw();
});
$('samplePier').addEventListener('click', async () => { await setPanelSample('pier'); });
$('sampleBoulevard').addEventListener('click', async () => { await setPanelSample('boulevard'); });
async function setPanelSample(name) {
  const p = state.panels[selected];
  p.sample = name; p.img = await loadImage(`samples/${name}.jpg`);
  p.ox = 0; p.oy = 0;
  redraw(); setStatus(`Panel ${selected + 1}: ${name} sample loaded.`);
}
$('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await setPanelFile(file);
});
async function setPanelFile(file) {
  const p = state.panels[selected];
  p.img = await loadImage(URL.createObjectURL(file));
  p.sample = file.name; p.ox = 0; p.oy = 0;
  redraw(); setStatus(`Panel ${selected + 1}: ${file.name} loaded. Drag it to reposition.`);
}
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) await setPanelFile(file);
});

/* Drag to reposition + click to select a panel. */
let drag = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) / r.width, y = (clientY - r.top) / r.height;
  const rects = layoutRects(state.layout, 1, 1);
  const count = LAYOUTS[state.layout].panels;
  for (let i = count - 1; i >= 0; i--) {
    const [fx, fy, fw, fh] = rects[i];
    if (x >= fx && x <= fx + fw && y >= fy && y <= fy + fh) return i;
  }
  return 0;
}
canvas.addEventListener('pointerdown', (e) => {
  selected = panelAt(e.clientX, e.clientY);
  syncPanelUI();
  drag = { x: e.clientX, y: e.clientY, ox: state.panels[selected].ox, oy: state.panels[selected].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const p = state.panels[selected];
  p.ox = drag.ox + (e.clientX - drag.x) / r.width;
  p.oy = drag.oy + (e.clientY - drag.y) / r.height;
  p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
  p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

/* ---------- caption ---------- */
function bindText(id, key) {
  $(id).addEventListener('input', (e) => { state[key] = e.target.value; redraw(); });
}
bindText('title', 'title');
bindText('subtitle', 'subtitle');
bindText('badgeText', 'badgeText');
$('font').addEventListener('change', (e) => { state.font = e.target.value; redraw(); });
$('titleSize').addEventListener('input', (e) => {
  state.titleSize = Number(e.target.value);
  $('titleSizeVal').textContent = `${Math.round(state.titleSize * 100)}%`;
  redraw();
});
$('titleColor').addEventListener('input', (e) => { state.color = e.target.value; redraw(); });
$('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
for (const [id, key] of [['gradient', 'gradient'], ['outline', 'outline'], ['shadow', 'shadow'], ['badge', 'badge'], ['grain', 'grain'], ['vignette', 'vignette']]) {
  $(id).addEventListener('change', (e) => { state[key] = e.target.checked; redraw(); });
}

/* ---------- export ---------- */
function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${w}x${h}.png`);
  }, 'image/png');
}
$('exportSquare').addEventListener('click', () => exportPNG(1080, 1080));
$('exportPortrait').addEventListener('click', () => exportPNG(1080, 1350));
$('exportWide').addEventListener('click', () => exportPNG(1920, 1080));
$('exportAll').addEventListener('click', () => {
  exportPNG(1080, 1080);
  setTimeout(() => exportPNG(1080, 1350), 250);
  setTimeout(() => exportPNG(1920, 1080), 500);
});
$('reset').addEventListener('click', async () => {
  for (const p of state.panels) { p.ox = 0; p.oy = 0; p.zoom = 1; }
  await initSamples();
  syncPanelUI(); redraw(); setStatus('Panels reset.');
});

/* ---------- boot ---------- */
async function initSamples() {
  await Promise.all(state.panels.map((_, i) => loadSample(i)));
}
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  await initSamples();
  runShot(shot, new URLSearchParams(location.search), async (opts) => {
    state.layout = opts.layout;
    state.grade = opts.grade;
    state.title = opts.title;
    state.subtitle = opts.subtitle;
    state.titlePos = opts.titlePos;
    state.badgeText = opts.badge;
    $('title').value = opts.title;
    $('subtitle').value = opts.subtitle;
    $('badgeText').value = opts.badge;
    // First panel uses the requested photo; the rest keep the alternating samples.
    state.panels[0].sample = opts.photo;
    state.panels[0].img = await loadImage(`samples/${opts.photo}.jpg`);
    document.querySelectorAll('#layouts .chip').forEach((c) => c.classList.toggle('active', c.dataset.value === opts.layout));
    document.querySelectorAll('#grades .chip').forEach((c) => c.classList.toggle('active', c.dataset.value === opts.grade));
    syncPanelUI();
    redraw();
  });
} else {
  await initSamples();
  syncPanelUI();
  redraw();
}
