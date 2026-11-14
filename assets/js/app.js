/* Breathe — app logic. Depends on `exercises` from exercises.js. No dependencies. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const setText = (el, txt) => { if (el && el.textContent !== txt) el.textContent = txt; };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  };

  /* ---------- Breath model: one source of truth for orb size, trace and phase ---------- */
  const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
  function buildModel(phases) {
    if (!phases || !phases.length) return null;
    const last = [...phases].reverse().find(p => p[2] !== 'hold');
    let cur = last && last[2] === 'inhale' ? 1 : 0, t = 0, i = 0;
    const segs = [];
    while (i < phases.length) {
      const type = phases[i][2]; let j = i, total = 0;
      while (j < phases.length && phases[j][2] === type) total += phases[j++][1];
      const from = cur, target = type === 'inhale' ? 1 : type === 'exhale' ? 0 : cur; let acc = 0;
      for (let k = i; k < j; k++) {
        acc += phases[k][1];
        const to = from + (target - from) * (acc / total);
        segs.push({ idx: k, label: phases[k][0], type, start: t, dur: phases[k][1] * 1000, from: cur, to });
        cur = to; t += phases[k][1] * 1000;
      }
      i = j;
    }
    const levelIn = (s, x) => s.dur ? s.from + (s.to - s.from) * ease(Math.min(1, Math.max(0, (x - s.start) / s.dur))) : s.to;
    const segAt = (pos) => segs.find(s => pos < s.start + s.dur) || segs[segs.length - 1];
    return {
      segs, cycleMs: t,
      levelAt: (ms) => { const pos = ms % t; return levelIn(segAt(pos), pos); },
      phaseAt: (ms) => { const pos = ms % t, s = segAt(pos); return { seg: s, cycle: Math.floor(ms / t) + 1, remain: Math.max(1, Math.ceil((s.start + s.dur - pos) / 1000)) }; }
    };
  }
  const fromShape = (str) => buildModel(str.split(' ').map(tok => [tok, parseFloat(tok), { i: 'inhale', h: 'hold', o: 'exhale' }[tok.slice(-1)]]));

  /* SVG paths for a model: one path per phase so each can carry its colour. */
  function tracePaths(model, w, h, pad) {
    const y = (l) => (pad + (1 - l) * (h - 2 * pad)).toFixed(1);
    const x = (ms) => (pad + (ms / model.cycleMs) * (w - 2 * pad)).toFixed(1);
    if (!model) { // natural rhythm: a gentle dashed wave
      let d = ''; for (let k = 0; k <= 60; k++) d += (k ? 'L' : 'M') + (pad + k / 60 * (w - 2 * pad)).toFixed(1) + ' ' + (h / 2 + Math.sin(k / 60 * Math.PI * 4) * h * 0.18).toFixed(1);
      return { segs: [{ type: 'rest', d }], full: d, pt: null };
    }
    const segs = model.segs.map(s => {
      const n = s.type === 'hold' ? 1 : Math.max(8, Math.round(s.dur / 100));
      let d = ''; for (let k = 0; k <= n; k++) { const ms = s.start + s.dur * k / n; d += (k ? 'L' : 'M') + x(ms) + ' ' + y(model.levelAt(Math.min(ms, model.cycleMs - 0.01))); }
      return { type: s.type, d };
    });
    return { segs, full: segs.map(s => s.d).join(''), pt: (ms) => [x(ms % model.cycleMs), y(model.levelAt(ms))] };
  }
  const drawTrace = (svg, model, { w = 400, h = 72, pad = 8, live = false } = {}) => {
    const tp = tracePaths(model, w, h, pad);
    svg.innerHTML = tp.segs.map(s => `<path class="t-${s.type}${live ? ' t-seg' : ''}" d="${s.d}"/>`).join('') +
      (live && tp.pt ? `<path class="t-done" pathLength="1" stroke-dasharray="0 2" d="${tp.full.replace(/M/g, 'L').replace('L', 'M')}"/><circle class="t-dot" r="6" cx="${pad}" cy="${h / 2}"/>` : '');
    svg._tp = tp; svg._model = model;
  };
  function moveTrace(svg, ms) {
    const m = svg._model, tp = svg._tp; if (!m || !tp.pt) return;
    const [cx, cy] = tp.pt(ms), dot = svg.querySelector('.t-dot'), done = svg.querySelector('.t-done');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    done.setAttribute('stroke-dasharray', ((ms % m.cycleMs) / m.cycleMs).toFixed(4) + ' 2');
  }

  /* ---------- Guide: timing + frame loop shared by the intro and practice sessions ---------- */
  class Guide {
    constructor(o) { Object.assign(this, o); this.state = 'idle'; this.before = 0; this.t0 = 0; this.duration = 0; this.model = null; this.key = ''; }
    elapsed() { return this.before + (this.state === 'active' ? performance.now() - this.t0 : 0); }
    start(model, duration) {
      this.halt(); this.model = model; this.duration = duration; this.before = 0; this.t0 = performance.now(); this.key = ''; this.state = 'active';
      this.el.dataset.live = 'true'; this.run(); this.tick();
    }
    pause() { if (this.state !== 'active') return; this.before = this.elapsed(); this.state = 'paused'; this.halt(); this.onPause && this.onPause(); }
    resume() { if (this.state !== 'paused') return; this.t0 = performance.now(); this.state = 'active'; this.run(); this.tick(); this.onResume && this.onResume(); }
    stop() { this.halt(); this.state = 'idle'; this.el.dataset.live = 'false'; this.el.style.setProperty('--breath', .5); this.el.querySelector('.orb-body').style.setProperty('--breath', .5); }
    run() {
      const loop = () => { this.tick(); if (this.state === 'active') this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop); this.iv = setInterval(() => this.tick(), 250); // interval keeps cues running when the tab is hidden
    }
    halt() { cancelAnimationFrame(this.raf); clearInterval(this.iv); }
    tick() {
      if (this.state !== 'active') return;
      const e = Math.min(this.elapsed(), this.duration), m = this.model;
      const level = m ? m.levelAt(e) : .5;
      this.el.querySelector('.orb-body').style.setProperty('--breath', level.toFixed(4));
      const info = m ? m.phaseAt(e) : null;
      if (this.trace) moveTrace(this.trace, e);
      const key = info ? info.cycle + ':' + info.seg.idx : 'rest';
      if (key !== this.key) { this.key = key; this.onPhase(info); }
      this.onFrame(e, info);
      if (e >= this.duration) { this.halt(); this.state = 'complete'; this.el.dataset.live = 'false'; this.el.querySelector('.orb-body').style.setProperty('--breath', .5); this.onComplete(); }
    }
  }

  /* ---------- Preferences: theme, audio cues, voice ---------- */
  const root = document.documentElement;
  function syncTheme() {
    const light = root.dataset.theme === 'light', label = light ? 'Switch to dark theme' : 'Switch to light theme';
    ['theme-toggle', 'practice-theme-toggle'].forEach(id => { const b = $(id); b.setAttribute('aria-label', label); b.innerHTML = icon(light ? 'moon' : 'sun'); });
    document.querySelector('meta[name="theme-color"]').setAttribute('content', light ? '#f3f6f2' : '#0f1e1b');
  }
  const toggleTheme = () => { root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'; store.set('breathe-theme', root.dataset.theme); syncTheme(); };
  $('theme-toggle').addEventListener('click', toggleTheme); $('practice-theme-toggle').addEventListener('click', toggleTheme); syncTheme();

  let audioOn = store.get('breathe-audio-cues') === 'on', voiceOn = store.get('breathe-voice-guidance') === 'on', audioCtx = null;
  const speechOk = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  function syncPrefs() {
    $$('.sound-toggle').forEach(b => { b.setAttribute('aria-pressed', String(audioOn)); setText(b.querySelector('span'), audioOn ? 'Audio cues on' : 'Audio cues off'); });
    $$('.voice-toggle').forEach(b => {
      b.setAttribute('aria-pressed', String(voiceOn && speechOk)); b.disabled = !speechOk;
      setText(b.querySelector('span'), !speechOk ? 'Voice unavailable' : voiceOn ? 'Voice guidance on' : 'Voice guidance off');
    });
  }
  function cue(type) {
    if (!audioOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      audioCtx = audioCtx || new AC(); if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime({ inhale: 523.25, hold: 659.25, exhale: 392 }[type] || 440, now);
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.055, now + .025); g.gain.exponentialRampToValueAtTime(.0001, now + .22);
      o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + .24);
    } catch (_) {}
  }
  const stopVoice = () => { if (speechOk) speechSynthesis.cancel(); };
  function speak(text) {
    if (!voiceOn || !speechOk || !text) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = .88; u.volume = .8; speechSynthesis.speak(u); } catch (_) {}
  }
  $$('.sound-toggle').forEach(b => b.addEventListener('click', () => { audioOn = !audioOn; store.set('breathe-audio-cues', audioOn ? 'on' : 'off'); syncPrefs(); if (audioOn) cue('inhale'); }));
  $$('.voice-toggle').forEach(b => b.addEventListener('click', () => { if (!speechOk) return; voiceOn = !voiceOn; store.set('breathe-voice-guidance', voiceOn ? 'on' : 'off'); if (!voiceOn) stopVoice(); syncPrefs(); if (voiceOn) speak('Ready when you are'); }));
  syncPrefs();

  /* ---------- Header: scroll state + mobile menu ---------- */
  const topbar = $('top'), nav = $('site-nav'), menuBtn = $('menu-toggle');
  addEventListener('scroll', () => topbar.classList.toggle('is-scrolled', scrollY > 8), { passive: true });
  const setMenu = (open) => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); menuBtn.innerHTML = icon(open ? 'close' : 'menu'); };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); } });

  /* ---------- Intro (hero) ---------- */
  const introPhases = [['Breathe in', 4, 'inhale'], ['Hold gently', 2, 'hold'], ['Breathe out', 6, 'exhale']];
  const introModel = buildModel(introPhases), INTRO_MS = 36000;
  const heroTrace = $('hero-trace'); drawTrace(heroTrace, introModel, { live: true });
  const heroLabel = { title: $('hero-title'), kicker: $('hero-kicker'), lede: $('hero-lede'), phase: $('hero-phase'), count: $('hero-phase-count'), caption: $('orb-caption') };
  const pauseLabel = (paused) => { $('pause-intro').innerHTML = icon(paused ? 'play' : 'pause', paused ? 'fill' : '') + `<span>${paused ? 'Resume' : 'Pause'}</span>`; };
  const restartLabel = (txt) => { $('restart-intro').innerHTML = icon('restart') + `<span>${txt}</span>`; };
  const intro = new Guide({
    el: $('hero-art'), trace: heroTrace,
    onPhase(info) { cue(info.seg.type); speak(info.seg.label); },
    onFrame(e, info) {
      const cycle = Math.min(3, Math.floor(e / 12000) + 1);
      setText(heroLabel.phase, info.seg.label);
      setText(heroLabel.count, info.remain + (info.remain === 1 ? ' second' : ' seconds'));
      setText($('intro-cycle'), 'Cycle ' + cycle + ' of 3'); setText($('intro-remaining'), Math.ceil((INTRO_MS - e) / 1000) + ' seconds');
      $('intro-progress-value').style.width = (e / INTRO_MS * 100) + '%';
    },
    onPause() { stopVoice(); pauseLabel(true); heroLabel.count.textContent = 'Paused'; },
    onResume() { pauseLabel(false); },
    onComplete() {
      stopVoice(); $('intro').classList.remove('is-active');
      setText(heroLabel.title, 'Three breaths complete.'); setText(heroLabel.kicker, 'A good place to begin');
      setText(heroLabel.lede, 'Choose a breathing practice below whenever you are ready. You can return to this short guide at any time.');
      setText(heroLabel.phase, 'Well done'); setText(heroLabel.count, 'Three cycles complete'); setText(heroLabel.caption, 'You can keep exploring');
      $('intro-progress-value').style.width = '100%'; setText($('intro-cycle'), 'Complete'); setText($('intro-remaining'), '36 seconds');
      $('pause-intro').style.display = 'none'; restartLabel('Repeat three breaths');
      setText($('hero-explore').querySelector('span'), 'Continue to the exercise library');
      moveTrace(heroTrace, 0);
    }
  });
  function beginIntro() {
    $('intro').classList.add('is-active');
    setText(heroLabel.title, 'Follow the shape of each breath.'); setText(heroLabel.kicker, 'Your first three cycles');
    setText(heroLabel.lede, 'Breathe in, pause gently, then let the breath out. Keep the pace comfortable.'); setText(heroLabel.caption, 'Let the breath stay easy');
    $('begin-intro').style.display = 'none'; $('hero-facts').style.display = 'none';
    $('pause-intro').style.display = ''; pauseLabel(false); restartLabel('Start again');
    $('intro-controls').classList.add('visible'); $('intro-progress').classList.add('visible');
    intro.start(introModel, INTRO_MS);
  }
  $('begin-intro').addEventListener('click', beginIntro); $('restart-intro').addEventListener('click', beginIntro);
  $('pause-intro').addEventListener('click', () => intro.state === 'active' ? intro.pause() : intro.resume());

  /* ---------- Intentions grid ---------- */
  $$('.intent-trace').forEach(svg => drawTrace(svg, svg.dataset.shape === 'rest' ? null : fromShape(svg.dataset.shape), { w: 180, h: 44, pad: 4 }));
  const CATEGORIES = ['Settle', 'Focus', 'Rest', 'Awareness', 'Techniques', 'Energy'];
  const catCount = (c) => exercises.filter(e => e.category === c).length;
  $$('.intent').forEach(a => { const n = catCount(a.dataset.filterLink); setText(a.querySelector('.count'), n + (n === 1 ? ' exercise' : ' exercises')); });

  /* ---------- Library ---------- */
  const KEYS = { fav: 'breathe:v1:favorites', recent: 'breathe:v1:recent' };
  const readJSON = (k) => { try { const v = JSON.parse(store.get(k)); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
  let favs = new Set(readJSON(KEYS.fav)), recents = readJSON(KEYS.recent);
  const params = new URLSearchParams(location.search);
  let view = ['Favorites', 'Recent'].includes(params.get('view')) ? params.get('view') : 'All';
  let filter = CATEGORIES.includes(params.get('category')) ? params.get('category') : 'All';
  const search = $('exercise-search'); search.value = (params.get('q') || '').slice(0, 80);
  const storageIssue = () => setText($('storage-status'), 'Your browser could not save this change. Check available site storage.');
  const saveFavs = () => { if (!store.set(KEYS.fav, JSON.stringify([...favs]))) storageIssue(); };
  const saveRecents = () => { if (!store.set(KEYS.recent, JSON.stringify(recents.slice(0, 20)))) storageIssue(); };
  const modelCache = new Map();
  const modelOf = (ex) => { if (!modelCache.has(ex.id)) modelCache.set(ex.id, buildModel(ex.phases)); return modelCache.get(ex.id); };
  const FILTERS = [['cat', 'All', 'All exercises'], ...CATEGORIES.map(c => ['cat', c, c]), ['view', 'Favorites', 'Favourites'], ['view', 'Recent', 'Recently practised']];
  function syncURL() {
    const p = new URLSearchParams(location.search);
    [['view', view === 'All' ? '' : view], ['category', filter === 'All' ? '' : filter], ['q', search.value.trim()]].forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    const qs = p.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  function renderFilters() {
    const counts = (kind, v) => kind === 'view' ? (v === 'Favorites' ? favs.size : recents.length) : v === 'All' ? exercises.length : catCount(v);
    $('filter-list').innerHTML = FILTERS.map(([kind, v, label], i) => {
      const on = kind === 'view' ? view === v : view === 'All' && filter === v;
      return (kind === 'view' && FILTERS[i - 1][0] === 'cat' ? '<span class="filter-divider" aria-hidden="true"></span>' : '') +
        `<button class="filter-btn" type="button" data-kind="${kind}" data-value="${v}" aria-pressed="${on}"><span>${label}</span><span class="n">${counts(kind, v)}</span></button>`;
    }).join('');
  }
  function rowShape(ex) {
    const m = modelOf(ex), tp = tracePaths(m, 104, 28, 3);
    return `<div class="row-shape"><svg viewBox="0 0 104 28" aria-hidden="true">${tp.segs.map(s => `<path class="t-${s.type}" d="${s.d}"/>`).join('')}</svg><span class="row-pattern">${ex.pattern}</span></div>`;
  }
  function renderExercises(sync = true) {
    const term = search.value.trim().toLowerCase();
    let src = exercises;
    if (view === 'Favorites') src = exercises.filter(e => favs.has(e.id));
    if (view === 'Recent') src = recents.map(r => exercises.find(e => e.id === r.id)).filter(Boolean);
    const list = src.filter(e => (view !== 'All' || filter === 'All' || e.category === filter) && (!term || (e.name + ' ' + e.description + ' ' + e.bestFor + ' ' + e.category + ' ' + e.pattern + ' ' + e.level).toLowerCase().includes(term)));
    $('exercise-list').innerHTML = list.map(ex => {
      const fav = favs.has(ex.id);
      return `<article class="row"><div><h3 class="row-name">${ex.name}</h3><p class="row-desc">${ex.description}</p><p class="row-use">Good for: ${ex.bestFor}</p></div>${rowShape(ex)}<span class="row-tag">${ex.category}</span>` +
        `<button class="fav" type="button" data-favorite="${ex.id}" aria-pressed="${fav}" aria-label="${fav ? 'Remove' : 'Add'} ${ex.name} ${fav ? 'from' : 'to'} favourites" title="${fav ? 'Remove from' : 'Add to'} favourites"><svg class="icon${fav ? ' fill' : ''}" aria-hidden="true"><use href="#i-heart"/></svg></button>` +
        `<button class="row-open" type="button" data-open="${ex.id}" aria-label="Open ${ex.name}">View practice</button></article>`;
    }).join('');
    setText($('result-count'), list.length + (list.length === 1 ? ' practice' : ' practices'));
    const empty = $('empty-state'); empty.hidden = list.length > 0;
    empty.innerHTML = view === 'Favorites' ? '<strong>No favourites yet.</strong><br>Save an exercise with the heart button and it will appear here.' : view === 'Recent' ? '<strong>No recent practices yet.</strong><br>Start an exercise and it will appear here.' : '<strong>No matching exercise.</strong><br>Try another search or category.';
    renderFilters(); if (sync) syncURL();
  }
  search.addEventListener('input', () => renderExercises());
  $('filter-list').addEventListener('click', e => {
    const b = e.target.closest('[data-kind]'); if (!b) return;
    if (b.dataset.kind === 'view') { view = b.dataset.value; filter = 'All'; } else { view = 'All'; filter = b.dataset.value; }
    renderExercises(); $('filter-list').querySelector('[aria-pressed="true"]')?.focus();
  });
  $('category-grid').addEventListener('click', e => { const a = e.target.closest('[data-filter-link]'); if (!a) return; view = 'All'; filter = a.dataset.filterLink; search.value = ''; renderExercises(); });
  $('exercise-list').addEventListener('click', e => {
    const f = e.target.closest('[data-favorite]');
    if (f) { const id = f.dataset.favorite; favs.has(id) ? favs.delete(id) : favs.add(id); saveFavs(); renderExercises(); $('exercise-list').querySelector(`[data-favorite="${id}"]`)?.focus(); return; }
    const o = e.target.closest('[data-open]'); if (o) openPractice(o.dataset.open, o);
  });

  /* Backup / restore (format unchanged: version 1) */
  const backupStatus = (m) => setText($('backup-status'), m);
  $('export-data').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'Breathe', version: 1, exportedAt: new Date().toISOString(), favorites: [...favs], recent: recents.slice(0, 20) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'breathe-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); backupStatus('Backup downloaded. Keep the file somewhere safe.');
  });
  $('import-data').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files?.[0]; if (!file) return;
    try {
      if (file.size > 200000) throw new Error('This backup file is too large.');
      const p = JSON.parse(await file.text());
      if (!p || p.app !== 'Breathe' || p.version !== 1 || !Array.isArray(p.favorites) || !Array.isArray(p.recent)) throw new Error('This is not a supported Breathe backup.');
      const valid = new Set(exercises.map(e => e.id)), seen = new Set();
      const nf = [...new Set(p.favorites.filter(id => typeof id === 'string' && valid.has(id)))];
      const okRecent = (r) => r && typeof r.id === 'string' && valid.has(r.id) && Number.isFinite(r.at);
      const nr = p.recent.filter(r => okRecent(r) && !seen.has(r.id) && seen.add(r.id)).slice(0, 20).map(r => ({ id: r.id, at: r.at }));
      backupStatus(nf.length !== p.favorites.length || (nr.length === 0 && p.recent.length > 0 && !p.recent.every(okRecent)) ? 'Some unknown or invalid entries were skipped while restoring.' : 'Backup restored successfully.');
      favs = new Set(nf); recents = nr; saveFavs(); saveRecents(); renderExercises();
    } catch (err) { backupStatus(err.message || 'Could not read this backup file.'); }
    finally { $('import-file').value = ''; }
  });

  /* ---------- Practice dialog ---------- */
  const INTENTIONS = { settle: ['Settle', 'Let this be a gentle pause, with nothing to achieve.'], focus: ['Focus', 'Gently return your attention to the rhythm of this breath.'], unwind: ['Unwind', 'Allow your shoulders and jaw to soften, without forcing anything.'], observe: ['Observe', 'Notice each breath as it is, without needing to change it.'] };
  let intention = INTENTIONS[store.get('breathe-intention')] ? store.get('breathe-intention') : 'settle';
  const syncIntention = () => { $('session-intention').value = intention; setText($('intention-hint'), INTENTIONS[intention][1]); };
  $('session-intention').addEventListener('change', () => { intention = INTENTIONS[$('session-intention').value] ? $('session-intention').value : 'settle'; store.set('breathe-intention', intention); syncIntention(); });
  syncIntention();

  const dlg = $('practice-screen'), stage = $('practice-stage'), pTrace = $('practice-trace');
  let current = null, returnFocus = null, pModel = null;
  const phasesNow = () => current && Array.isArray(current.phases) ? ($('skip-holds').checked ? current.phases.filter(p => p[2] !== 'hold') : current.phases) : null;
  const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const pauseBtn = (paused) => { $('session-pause').setAttribute('aria-label', paused ? 'Resume session' : 'Pause session'); $('session-pause').innerHTML = icon(paused ? 'play' : 'pause', paused ? 'fill' : ''); };
  function renderPattern() {
    const phases = phasesNow(); pModel = buildModel(phases);
    $('pattern-flow').innerHTML = (phases && phases.length ? phases : [['Notice the breath', 0, 'rest']]).map(p => `<span class="pattern-step" data-type="${p[2]}">${p[0]}<small>${p[1] ? p[1] + ' seconds' : 'No set count'}</small></span>`).join('');
    drawTrace(pTrace, pModel, { live: true }); pTrace.hidden = false; stage._trace = pTrace; guide.trace = pTrace;
    if (!pModel) { pTrace.querySelector('.t-rest').classList.remove('t-seg'); }
  }
  const guide = new Guide({
    el: stage, trace: pTrace,
    onPhase(info) { const label = info ? info.seg.label : 'Notice the breath'; setText($('practice-phase'), label); if (info) { cue(info.seg.type); speak(label); } },
    onFrame(e, info) {
      setText($('session-mode'), INTENTIONS[intention][0] + ' · ' + (info ? 'Cycle ' + info.cycle : 'Gentle observation'));
      setText($('session-clock'), fmt(guide.duration - e));
      setText($('practice-phase-count'), info ? info.remain + (info.remain === 1 ? ' second' : ' seconds') : 'No count to follow');
    },
    onPause() { stopVoice(); stage.dataset.state = 'paused'; pauseBtn(true); setText($('practice-phase-count'), 'Paused'); },
    onResume() { stage.dataset.state = 'active'; pauseBtn(false); },
    onComplete() { stopVoice(); stage.dataset.state = 'complete'; setText($('practice-phase'), 'Complete'); setText($('practice-phase-count'), 'Session finished'); setText($('session-clock'), '0:00'); $('done-close').focus(); }
  });
  function startPractice() {
    if (!current) return;
    recents = [{ id: current.id, at: Date.now() }, ...recents.filter(r => r.id !== current.id)].slice(0, 20); saveRecents(); renderFilters();
    renderPattern(); stage.dataset.state = 'active'; pauseBtn(false);
    guide.start(pModel, Number($('session-duration').value) * 60000); $('session-pause').focus();
  }
  function openPractice(id, trigger) {
    current = exercises.find(e => e.id === id); if (!current) return;
    returnFocus = trigger || null; guide.stop(); stopVoice();
    setText($('practice-category'), current.category + ' · ' + current.level); setText($('practice-title'), current.name); setText($('practice-description'), current.description);
    setText($('practice-use'), current.bestFor); setText($('practice-caution'), current.caution);
    $('practice-meta').innerHTML = [current.level, current.minutes, current.pattern].map(t => `<span class="chip">${t}</span>`).join('');
    const hasHold = Boolean(current.phases && current.phases.some(p => p[2] === 'hold'));
    $('skip-holds').checked = false; $('skip-holds-wrap').hidden = !hasHold; $('hold-note').hidden = !hasHold;
    syncIntention(); renderPattern();
    stage.dataset.state = 'ready'; setText($('practice-phase'), 'Ready when you are'); setText($('practice-phase-count'), 'Choose a duration, then start');
    setText($('session-mode'), 'Ready to begin'); setText($('session-clock'), $('session-duration').value + ':00');
    root.dataset.practice = 'open'; document.body.style.overflow = 'hidden'; document.querySelector('main').inert = true;
    if (!dlg.open) dlg.showModal();
    $('start-practice').focus();
    const p = new URLSearchParams(location.search); p.set('exercise', id); history.replaceState(null, '', location.pathname + '?' + p + location.hash);
  }
  function cleanup() {
    guide.stop(); stopVoice(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    document.body.style.overflow = ''; document.querySelector('main').inert = false; delete root.dataset.practice;
    const p = new URLSearchParams(location.search); p.delete('exercise'); const qs = p.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    if (returnFocus && returnFocus.isConnected) returnFocus.focus(); returnFocus = null;
  }
  dlg.addEventListener('close', cleanup); // fires for Esc, the back button and programmatic close
  $('close-practice').addEventListener('click', () => dlg.close()); $('done-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('start-practice').addEventListener('click', startPractice);
  $('done-again').addEventListener('click', () => { startPractice(); });
  $('session-restart').addEventListener('click', startPractice);
  $('session-pause').addEventListener('click', () => guide.state === 'active' ? guide.pause() : guide.resume());
  $('session-duration').addEventListener('change', () => { if (stage.dataset.state === 'ready') setText($('session-clock'), $('session-duration').value + ':00'); });
  $('skip-holds').addEventListener('change', () => { if (stage.dataset.state === 'ready') renderPattern(); });
  const fsOk = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  $('session-fullscreen').hidden = !fsOk;
  $('session-fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); } catch (_) {}
  });

  /* ---------- Boot ---------- */
  renderExercises(false);
  const deep = params.get('exercise'); if (deep && exercises.some(e => e.id === deep)) openPractice(deep, null);

  /* ---------- Install + offline ---------- */
  let installEvent = null; const installBtn = $('install-app');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; installBtn.hidden = false; });
  installBtn.addEventListener('click', async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; installBtn.hidden = true; });
  addEventListener('appinstalled', () => { installBtn.hidden = true; });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
})();
