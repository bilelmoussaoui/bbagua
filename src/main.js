import { CONNS, FLUSH, MODES, PARTS, TOUR, TUBES, WATER } from './data.js';
import { reduceMotion } from './kit.js';
import { createScene } from './scene.js';
import { createValve } from './valve.js';

const $ = (s) => document.querySelector(s);
const mobile = () => matchMedia('(max-width: 720px)').matches;

/* ---------- framing: keep the model in the space the UI leaves free ---------- */
const drawer = $('#drawer');
let tourOpen = false;
function insets() {
  const top = $('#top').getBoundingClientRect().bottom + 8;
  const bottomUI = tourOpen ? $('#tour').offsetHeight + 40 : 76;
  const open = !drawer.hidden && !drawer.classList.contains('closing');
  if (mobile()) return { top, left: 0, right: 0, bottom: open ? drawer.offsetHeight : bottomUI };
  return { top, left: 0, right: open ? drawer.offsetWidth + 24 : 0, bottom: bottomUI };
}
const reframe = () => unit.setInset(insets());

/* ---------- drawer ---------- */
const sw = (c) => `<span class="sw" style="--c:${TUBES[c].css}"></span>`;
function partHTML(id) {
  const p = PARTS[id];
  let h = `<div><p class="kicker">${p.k}</p><h2>${p.t}</h2><p class="desc">${p.d}</p></div>`;
  if (p.life) {
    const [a, b] = p.life;
    h += `<section><h4>Replace every</h4>
      <div class="life-big"><b>${b ? `${a}–${b}` : a}</b><span>${(b || a) > 1 ? 'years' : 'year'}</span></div>
      <div class="lbar" style="--a:${a};--b:${b || a}"><i></i>${b ? '<i class="range"></i>' : ''}</div>
      <div class="lscale"><span>0</span><span>1</span><span>2</span><span>3</span><span>4 yrs</span></div></section>`;
  }
  if (p.facts)
    h += `<section><h4>Specs</h4><dl class="facts">${p.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>`;
  if (p.conn.length)
    h += `<section><h4>Connections</h4><ul class="conns">${p.conn.map(([c, t]) => `<li>${sw(c)}${t}</li>`).join('')}</ul></section>`;
  if (p.flush)
    h += `<section><details class="flush"><summary>After a filter change: flush</summary><ol>${FLUSH.map(([b, t]) => `<li><span><b>${b}.</b>${t}</span></li>`).join('')}</ol></details></section>`;
  if (p.schematic) h += `<span class="tag-s">Position approximate</span>`;
  return h;
}
function connHTML(id) {
  const k = CONNS[id],
    tube = TUBES[k.tube];
  return `<div><p class="kicker">${tube.name} tube</p><h2>${sw(k.tube)}${k.n}</h2></div>
    <section><ul class="conns"><li>From · ${k.from}</li><li>To · ${k.to}</li></ul></section>`;
}
function openDrawer(html) {
  drawer.classList.remove('closing');
  drawer.hidden = false;
  $('#drawerBody').innerHTML = `<div class="swap-in">${html}</div>`;
  reframe();
}
function closeDrawer() {
  if (drawer.hidden) return;
  if (reduceMotion) {
    drawer.hidden = true;
    reframe();
    return;
  }
  drawer.classList.add('closing');
  reframe();
  drawer.addEventListener(
    'animationend',
    () => {
      if (drawer.classList.contains('closing')) {
        drawer.hidden = true;
        drawer.classList.remove('closing');
      }
    },
    { once: true },
  );
}
$('#drawerX').addEventListener('click', () => {
  unit.select(null, { fly: false });
  unit.overview();
});

/* ---------- dialogs ---------- */
function openDialog(d) {
  if (!d.open) d.showModal();
}
function closeDialog(d) {
  if (!d.open) return;
  if (reduceMotion) return d.close();
  d.classList.add('closing');
  d.addEventListener(
    'animationend',
    () => {
      d.classList.remove('closing');
      d.close();
    },
    { once: true },
  );
}
document.querySelectorAll('dialog').forEach((d) => {
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-close]')) closeDialog(d);
  });
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeDialog(d);
  });
});
const valveDlg = $('#valveDlg');
valveDlg.addEventListener('close', () => {
  unit.select(null, { fly: false });
  unit.overview();
});
$('#aboutBtn').addEventListener('click', () => openDialog($('#aboutDlg')));

/* ---------- selection ---------- */
function onSelect(sel) {
  if (tour.active) return; // the tour has its own caption
  if (!sel) return closeDrawer();
  if (sel.type === 'node' && sel.id === 'V') {
    closeDrawer();
    openDialog(valveDlg);
    return;
  }
  openDrawer(sel.type === 'node' ? partHTML(sel.id) : connHTML(sel.id));
}

const unit = createScene($('#gl'), { onSelect, inset: { top: 110, bottom: 76, left: 0, right: 0 } });
addEventListener('resize', reframe);
document.fonts?.ready.then(reframe);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !drawer.hidden && !document.querySelector('dialog[open]') && !tour.active)
    $('#drawerX').click();
});

/* ---------- interaction hint: fades once the user has orbited or zoomed ---------- */
const hint = $('#hint');
let gestures = 0;
const gl = $('#gl');
const used = () => {
  if (++gestures >= 2) {
    hint.classList.add('used');
    gl.removeEventListener('pointerdown', used);
    gl.removeEventListener('wheel', used);
  }
};
gl.addEventListener('pointerdown', used);
gl.addEventListener('wheel', used, { passive: true });

/* ---------- modes ---------- */
const modes = $('#modes');
const ink = modes.querySelector('.seg-ink');
const status = $('#status');
function moveInk(btn) {
  ink.style.width = `${btn.offsetWidth}px`;
  ink.style.transform = `translateX(${btn.offsetLeft}px)`;
}
function setMode(name, { fromTour = false } = {}) {
  unit.setMode(name);
  modes.querySelectorAll('button').forEach((b) => {
    const on = b.dataset.m === name;
    b.setAttribute('aria-pressed', on);
    if (on) moveInk(b);
  });
  status.classList.add('swap');
  setTimeout(
    () => {
      status.textContent = MODES[name].txt;
      status.classList.remove('swap');
    },
    reduceMotion ? 0 : 180,
  );
  if (!fromTour) tour.stop();
}
modes.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-m]');
  if (b) setMode(b.dataset.m);
});
addEventListener('resize', () => moveInk(modes.querySelector('[aria-pressed="true"]')));
document.fonts?.ready.then(() => moveInk(modes.querySelector('[aria-pressed="true"]')));

/* ---------- legend popover ---------- */
const legend = $('#legend'),
  legendBtn = $('#legendBtn');
const LEG = [
  ['orange', 'Water in'],
  ['lime', 'Stage 1 → 2'],
  ['magenta', 'Stage 2 → 3'],
  ['teal', 'Pre-filtered'],
  ['purple', 'Clean water'],
  ['blue', 'Tank'],
  ['yellow', 'Faucet'],
  ['black', 'Salty waste → drain'],
];
let pinned = null;
{
  const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
  const w = document.createElement('div');
  w.className = 'water-key';
  w.innerHTML = `<span class="wk-bar" style="--a:${hex(WATER.raw.c)};--b:${hex(WATER.sed.c)};--c:${hex(WATER.feed.c)};--d:${hex(WATER.clean.c)}"></span>
    <span class="wk-lbl"><span>Tap</span><span>Pre-filtered</span><span>Clean</span></span>
    <span class="wk-rej"><i style="--c:${hex(WATER.reject.c)}"></i>Salty waste</span>`;
  legend.appendChild(w);
}
LEG.forEach(([c, t]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.style.setProperty('--c', TUBES[c].css);
  b.innerHTML = `${sw(c)}${t}`;
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('pointerenter', () => unit.highlightColor(c));
  b.addEventListener('pointerleave', () => unit.highlightColor(pinned));
  b.addEventListener('focus', () => unit.highlightColor(c));
  b.addEventListener('blur', () => unit.highlightColor(pinned));
  b.addEventListener('click', () => {
    pinned = pinned === c ? null : c;
    legend
      .querySelectorAll('button')
      .forEach((x) => x.setAttribute('aria-pressed', x === b && pinned ? 'true' : 'false'));
    unit.highlightColor(pinned);
  });
  legend.appendChild(b);
});
function toggleLegend(open = legend.hidden) {
  legend.hidden = !open;
  legendBtn.setAttribute('aria-expanded', open);
  if (!open) {
    pinned = null;
    unit.highlightColor(null);
    legend.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  }
}
legendBtn.addEventListener('click', () => toggleLegend());
document.addEventListener('pointerdown', (e) => {
  if (!legend.hidden && !e.target.closest('.corner')) toggleLegend(false);
});

/* ---------- guided tour ---------- */
const tour = (() => {
  const card = $('#tour'),
    body = $('#tBody'),
    start = $('#tStart'),
    steps = $('#tSteps');
  const play = $('#tPlay');
  const DUR = 4800;
  let i = -1,
    playing = false,
    t0 = 0,
    raf = 0;
  const api = { active: false, stop };

  TOUR.forEach((s, n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Step ${n + 1}: ${s.t}`);
    b.addEventListener('click', () => go(n));
    steps.appendChild(b);
  });

  function go(n) {
    i = (n + TOUR.length) % TOUR.length;
    const s = TOUR[i];
    setMode(s.mode, { fromTour: true });
    unit.highlight(s.tubes.length ? s.tubes : null);
    unit.select({ type: 'node', id: s.focus }, { fly: true });
    [...steps.children].forEach((b, k) => {
      b.className = k < i ? 'done' : k === i ? 'cur' : '';
      b.style.removeProperty('--p');
    });
    $('#tN').textContent = `${String(i + 1).padStart(2, '0')} / ${TOUR.length}`;
    $('#tT').textContent = s.t;
    $('#tC').innerHTML = s.c;
    body.classList.remove('tbody-swap');
    void body.offsetWidth;
    body.classList.add('tbody-swap');
    t0 = performance.now();
  }
  function tick(now) {
    if (!playing) return;
    const p = Math.min(1, (now - t0) / DUR);
    steps.children[i]?.style.setProperty('--p', p);
    if (p >= 1) {
      if (i === TOUR.length - 1) {
        setPlaying(false);
        return;
      }
      go(i + 1);
    }
    raf = requestAnimationFrame(tick);
  }
  function setPlaying(v) {
    playing = v;
    play.classList.toggle('paused', !v);
    play.setAttribute('aria-label', v ? 'Pause' : 'Play');
    cancelAnimationFrame(raf);
    if (v) {
      t0 = performance.now() - (parseFloat(steps.children[i]?.style.getPropertyValue('--p')) || 0) * DUR;
      raf = requestAnimationFrame(tick);
    }
  }
  function begin() {
    api.active = tourOpen = true;
    closeDrawer();
    toggleLegend(false);
    start.hidden = true;
    body.hidden = false;
    card.classList.add('open');
    go(0);
    reframe();
    setPlaying(!reduceMotion);
  }
  function stop() {
    if (!api.active) return;
    api.active = tourOpen = false;
    setPlaying(false);
    body.hidden = true;
    start.hidden = false;
    card.classList.remove('open');
    unit.highlight(null);
    reframe();
  }
  start.addEventListener('click', begin);
  play.addEventListener('click', () => {
    if (!playing && i === TOUR.length - 1) go(0);
    setPlaying(!playing);
  });
  $('#tPrev').addEventListener('click', () => {
    go(i - 1);
    if (playing) t0 = performance.now();
  });
  $('#tNext').addEventListener('click', () => {
    go(i + 1);
    if (playing) t0 = performance.now();
  });
  $('#tExit').addEventListener('click', () => {
    stop();
    unit.select(null, { fly: false });
    setMode('making');
    unit.overview();
  });
  addEventListener('keydown', (e) => {
    if (!api.active) return;
    if (e.key === 'ArrowRight') $('#tNext').click();
    if (e.key === 'ArrowLeft') $('#tPrev').click();
    if (e.key === 'Escape') $('#tExit').click();
  });
  return api;
})();

setMode('making', { fromTour: true });
reframe();

/* ---------- valve close-up (inside the dialog) ---------- */
const ports = $('#ports');
const valve = createValve($('#vgl'), {
  onPort: (p) => ports.querySelectorAll('li').forEach((li) => li.classList.toggle('on', li.dataset.port === p)),
});
ports.querySelectorAll('li').forEach((li) => {
  li.addEventListener('pointerenter', () => {
    valve.emphasize(li.dataset.port);
    li.classList.add('on');
  });
  li.addEventListener('pointerleave', () => {
    valve.emphasize(null);
    li.classList.remove('on');
  });
});
