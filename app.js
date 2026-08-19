// ===== Theme handling =====
(function () {
  const stored = localStorage.getItem('jimmity-theme');
  const theme = stored || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    updateToggleIcon(btn, theme);
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('jimmity-theme', next);
      updateToggleIcon(btn, next);
    });
  });
  function updateToggleIcon(btn, theme) {
    btn.textContent = theme === 'dark' ? '☀' : '●';
  }
})();

// ===== Workout Engine =====
// `PLAN` is expected to be defined on each day page before this script runs.
// PLAN = { day: 'Monday', items: [ {type:'work'|'rest'|'note', name, cue, seconds, group, setLabel} ... ] }

function initSession(PLAN) {
  const startBtn = document.getElementById('startBtn');
  const wrap = document.querySelector('.wrap');
  const session = document.getElementById('session');
  const done = document.getElementById('doneScreen');

  const items = PLAN.items;
  let idx = 0;
  let remaining = 0;
  let timerId = null;
  let paused = false;

  const els = {
    progress: document.getElementById('sessionProgress'),
    fill: document.getElementById('progressFill'),
    modeTag: document.getElementById('modeTag'),
    exName: document.getElementById('exName'),
    exCue: document.getElementById('exCue'),
    timer: document.getElementById('timer'),
    setInfo: document.getElementById('setInfo'),
    upNext: document.getElementById('upNext'),
    pauseBtn: document.getElementById('pauseBtn'),
    skipBtn: document.getElementById('skipBtn'),
    exitBtn: document.getElementById('exitBtn'),
  };

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      o.start();
      o.stop(ctx.currentTime + 0.3);
    } catch (e) { /* audio unsupported, ignore */ }
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function render() {
    const item = items[idx];
    els.progress.textContent = `${idx + 1} / ${items.length}`;
    els.fill.style.width = `${(idx / items.length) * 100}%`;

    const isRest = item.type === 'rest';
    els.modeTag.textContent = isRest ? 'Rest' : (item.group || 'Work');
    els.modeTag.classList.toggle('rest-mode', isRest);
    els.timer.classList.toggle('rest', isRest);

    els.exName.textContent = item.name;
    els.exCue.textContent = item.cue || '';
    els.setInfo.textContent = item.setLabel || '';

    const next = items[idx + 1];
    if (next) {
      els.upNext.innerHTML = `Up next &nbsp; <b>${next.name}</b>`;
      els.upNext.style.visibility = 'visible';
    } else {
      els.upNext.innerHTML = `Last one — finish strong.`;
    }

    remaining = item.seconds;
    els.timer.textContent = fmt(remaining);
  }

  function tick() {
    if (paused) return;
    remaining -= 1;
    if (remaining <= 0) {
      advance();
      return;
    }
    if (remaining <= 3) { beep(); vibrate(60); }
    els.timer.textContent = fmt(remaining);
  }

  function advance() {
    idx += 1;
    if (idx >= items.length) {
      finish();
      return;
    }
    vibrate([80, 40, 80]);
    render();
  }

  function finish() {
    clearInterval(timerId);
    session.classList.remove('active');
    done.classList.add('active');
    vibrate([100, 60, 100, 60, 200]);
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function begin() {
    wrap.classList.add('active-session');
    session.classList.add('active');
    idx = 0;
    render();
    startTimer();
  }

  startBtn.addEventListener('click', begin);

  els.pauseBtn.addEventListener('click', () => {
    paused = !paused;
    els.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });

  els.skipBtn.addEventListener('click', () => {
    advance();
  });

  els.exitBtn.addEventListener('click', () => {
    if (confirm('Exit workout? Your progress will reset.')) {
      clearInterval(timerId);
      session.classList.remove('active');
      wrap.classList.remove('active-session');
      idx = 0;
      paused = false;
      els.pauseBtn.textContent = 'Pause';
    }
  });
}
