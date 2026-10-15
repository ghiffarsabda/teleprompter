(function () {
  'use strict';

  const ED_LINE = 22;
  const LS = { text: 'tp.text', duration: 'tp.duration', size: 'tp.size' };

  const $ = (id) => document.getElementById(id);
  const ta = $('ta');
  const gutter = $('gutter');
  const mirror = $('mirror');
  const durationInput = $('duration');
  const sizeInput = $('size');
  const sizeInput2 = $('size2');
  const wpmEl = $('wpm');
  const startBtn = $('start');
  const prompterView = $('prompter-view');
  const prompter = $('prompter');
  const prompterText = $('prompter-text');
  const playBtn = $('play');
  const restartBtn = $('restart');
  const exitBtn = $('exit');
  const fsBtn = $('fs');
  const progressEl = $('progress');
  const remainingEl = $('remaining');

  /* ---------- editor ---------- */

  function syncGutter() {
    mirror.style.width = ta.clientWidth + 'px';
    const lines = ta.value.split('\n');

    mirror.replaceChildren();
    for (let i = 0; i < lines.length; i++) {
      const d = document.createElement('div');
      d.textContent = lines[i];
      mirror.appendChild(d);
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < lines.length; i++) {
      const d = document.createElement('div');
      d.className = 'ln';
      d.textContent = i + 1;
      d.style.height = (mirror.children[i].offsetHeight || ED_LINE) + 'px';
      frag.appendChild(d);
    }
    gutter.replaceChildren(frag);
    gutter.scrollTop = ta.scrollTop;
  }

  function updateWpm() {
    const words = (ta.value.match(/\S+/g) || []).length;
    const minutes = parseFloat(durationInput.value) || 0;
    const wpm = minutes > 0 ? Math.round(words / minutes) : 0;
    wpmEl.innerHTML = '<b>' + words + '</b> words' +
      (wpm ? ' &middot; <b>' + wpm + '</b> wpm' : '');
  }

  /* ---------- persistence ---------- */

  function save() {
    localStorage.setItem(LS.text, ta.value);
    localStorage.setItem(LS.duration, durationInput.value);
    localStorage.setItem(LS.size, String(size));
  }

  function load() {
    const text = localStorage.getItem(LS.text);
    if (text !== null) ta.value = text;
    const dur = localStorage.getItem(LS.duration);
    if (dur) durationInput.value = dur;
    const s = parseInt(localStorage.getItem(LS.size), 10);
    if (s) size = s;
  }

  /* ---------- prompter ---------- */

  let size = 48;
  let playing = false;
  let rafId = 0;
  let baseScroll = 0;
  let baseTime = 0;
  let speed = 0;
  let maxScroll = 0;

  function durationMs() {
    const m = parseFloat(durationInput.value);
    return isFinite(m) && m > 0 ? m * 60000 : 0;
  }

  function measure() {
    maxScroll = Math.max(0, prompter.scrollHeight - prompter.clientHeight);
  }

  function computeSpeed() {
    const d = durationMs();
    speed = d > 0 && maxScroll > 0 ? maxScroll / d : 0;
  }

  function fmt(ms) {
    if (!isFinite(ms) || ms < 0) ms = 0;
    const total = Math.ceil(ms / 1000);
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  }

  function updateHud() {
    const progress = maxScroll > 0 ? Math.min(1, prompter.scrollTop / maxScroll) : 0;
    progressEl.style.width = (progress * 100).toFixed(2) + '%';
    const remaining = speed > 0 ? (maxScroll - prompter.scrollTop) / speed : durationMs();
    remainingEl.textContent = fmt(remaining);
  }

  function setSize(value) {
    size = value;
    prompterText.style.fontSize = value + 'px';
    if (sizeInput.value !== String(value)) sizeInput.value = value;
    if (sizeInput2.value !== String(value)) sizeInput2.value = value;
  }

  function retarget() {
    const wasPlaying = playing;
    if (wasPlaying) pause();
    measure();
    computeSpeed();
    if (wasPlaying) play();
    updateHud();
  }

  function play() {
    measure();
    computeSpeed();
    if (speed <= 0) return;
    if (prompter.scrollTop >= maxScroll - 0.5) prompter.scrollTop = 0;
    baseScroll = prompter.scrollTop;
    baseTime = performance.now();
    playing = true;
    playBtn.textContent = 'Pause';
    rafId = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!playing) return;
    const pos = baseScroll + speed * (now - baseTime);
    if (pos >= maxScroll) {
      prompter.scrollTop = maxScroll;
      updateHud();
      pause();
      return;
    }
    prompter.scrollTop = pos;
    updateHud();
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(rafId);
    playBtn.textContent = 'Play';
  }

  function openPrompter() {
    if (!ta.value.trim()) { ta.focus(); return; }
    prompterText.textContent = ta.value;
    setSize(size);
    prompterView.hidden = false;
    prompter.scrollTop = 0;
    measure();
    computeSpeed();
    updateHud();
  }

  function exitPrompter() {
    pause();
    prompterView.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    ta.focus();
  }

  /* ---------- wiring ---------- */

  ta.addEventListener('input', function () { syncGutter(); updateWpm(); save(); });
  ta.addEventListener('scroll', function () { gutter.scrollTop = ta.scrollTop; });
  new ResizeObserver(syncGutter).observe(ta);

  durationInput.addEventListener('input', function () { updateWpm(); save(); if (!prompterView.hidden) retarget(); });

  function onSizeInput(e) { setSize(parseInt(e.target.value, 10)); retarget(); save(); }
  sizeInput.addEventListener('input', onSizeInput);
  sizeInput2.addEventListener('input', onSizeInput);

  startBtn.addEventListener('click', openPrompter);
  playBtn.addEventListener('click', function () { playing ? pause() : play(); });
  restartBtn.addEventListener('click', function () { pause(); prompter.scrollTop = 0; updateHud(); });
  exitBtn.addEventListener('click', exitPrompter);
  fsBtn.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    else prompterView.requestFullscreen().catch(function () {});
  });

  document.addEventListener('keydown', function (e) {
    if (prompterView.hidden) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'Escape') exitPrompter();
  });

  load();
  setSize(size);
  syncGutter();
  updateWpm();
})();
