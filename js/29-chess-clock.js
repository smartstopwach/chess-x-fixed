// ============================================
// CHESS CLOCK
// ============================================
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setClock(seconds) {
  state.clock.wTime = seconds;
  state.clock.bTime = seconds;
  updateClocks();
}

function updateClocks() {
  const w = $('clockWhite').querySelector('.clock-time');
  const b = $('clockBlack').querySelector('.clock-time');
  w.textContent = formatTime(state.clock.wTime);
  b.textContent = formatTime(state.clock.bTime);
  $('clockWhite').classList.toggle('low-time', state.clock.wTime < 30);
  $('clockBlack').classList.toggle('low-time', state.clock.bTime < 30);
}

// Whose clock is ticking has to be visible the moment it starts. The highlight
// used to be painted only by switchClockSide(), so after pressing START neither
// side was marked until the first move was played.
function paintClockSide() {
  const w = $('clockWhite'), b = $('clockBlack');
  const on = !!state.clock.running;
  if (w) w.classList.toggle('active', on && state.clock.activeColor === 'w');
  if (b) b.classList.toggle('active', on && state.clock.activeColor === 'b');
}

function toggleClock() {
  state.clock.running = !state.clock.running;
  const btn = $('btnClockToggle');
  btn.textContent = state.clock.running ? 'Pause Clock' : 'Start Clock';

  if (state.clock.running) {
    state.clock.interval = setInterval(() => {
      if (state.clock.activeColor === 'w') state.clock.wTime--;
      else state.clock.bTime--;
      if (state.clock.wTime <= 0 || state.clock.bTime <= 0) {
        clearInterval(state.clock.interval);
        state.clock.running = false;
        btn.textContent = 'Start Clock';
        paintClockSide();
        toast('Time expired!', 'error');
      }
      updateClocks();
    }, 1000);
  } else {
    clearInterval(state.clock.interval);
  }
  paintClockSide();
  updateClocks();
}

function switchClockSide() {
  state.clock.activeColor = state.clock.activeColor === 'w' ? 'b' : 'w';
  paintClockSide();
}
