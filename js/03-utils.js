// ============================================
// UTILITIES
// ============================================
// Pop-up toasts were disabled per user request, but `toast()` is called from
// ~90 places to report refusals ("Cannot start from this position: ..."), the
// clock expiring, a saved puzzle, a failed clipboard write. With the function
// stubbed out every one of those was silent, so a rejected action looked like a
// dead button. Messages now go to a slim inline pill over the board instead of a
// floating pop-up: same information, no overlay, no layout change.
let boardMsgTimer = 0;

function showBoardMessage(message, kind) {
  const el = (typeof document !== 'undefined') ? document.getElementById('boardMsg') : null;
  if (!el) return;
  clearTimeout(boardMsgTimer);
  const text = (message === null || message === undefined) ? '' : String(message);
  if (!text) { el.textContent = ''; el.className = 'board-msg'; return; }
  el.textContent = text;
  el.className = 'board-msg show' + (kind ? ' ' + kind : '');
  boardMsgTimer = setTimeout(() => { el.textContent = ''; el.className = 'board-msg'; }, 6000);
}

function toast(message, type = '') {
  if (!message) return;
  const kind = (type === 'error') ? 'error'
    : (type === 'success' || type === 'ok') ? 'success'
    : (type === 'warn' || type === 'warning') ? 'warn' : '';
  showBoardMessage(message, kind);
}

function squareName(r, c) {
  return String.fromCharCode(97 + c) + (8 - r);
}

function squareRC(sq) {
  return { r: 8 - parseInt(sq[1]), c: sq.charCodeAt(0) - 97 };
}

function isLight(r, c) { return (r + c) % 2 === 0; }

function showSquare(name) {
  const { r, c } = squareRC(name);
  return els.board.children[r * 8 + c];
}

// ============================================
// CHESS AUDIO / SOUND EFFECTS (Web Audio API)
// ============================================
let chessAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!chessAudioCtx) {
    try {
      chessAudioCtx = new AudioContextClass();
    } catch (e) {
      chessAudioCtx = null;
    }
  }
  if (chessAudioCtx && chessAudioCtx.state === 'suspended') {
    try { chessAudioCtx.resume(); } catch (e) {}
  }
  return chessAudioCtx;
}

function playWoodClick(ctx, startTime, freq, dropFreq, duration, volume) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, dropFreq), startTime + duration);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // High attack transient click for wooden piece strike feel
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(freq * 3.2, startTime);
    clickOsc.frequency.exponentialRampToValueAtTime(Math.max(1, freq), startTime + 0.015);

    clickGain.gain.setValueAtTime(volume * 0.7, startTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.015);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    clickOsc.start(startTime);
    clickOsc.stop(startTime + 0.015);
  } catch (e) {}
}

function playChime(ctx, startTime, freq, duration, volume) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (e) {}
}

/**
 * Plays realistic chess audio when a piece moves.
 * Supports: normal move, capture, check, checkmate, castling, and promotion.
 */
function playMoveSound(move) {
  if (typeof state !== 'undefined' && state.soundEnabled === false) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const san = (move && move.san) ? move.san : (typeof move === 'string' ? move : '');
    const flags = (move && move.flags) ? move.flags : '';

    const isMate = san.includes('#') || (typeof state !== 'undefined' && state.game && typeof state.game.in_checkmate === 'function' && state.game.in_checkmate());
    const isCheck = san.includes('+') || (typeof state !== 'undefined' && state.game && typeof state.game.in_check === 'function' && state.game.in_check());
    const isCapture = flags.includes('c') || flags.includes('e') || san.includes('x') || !!(move && move.captured);
    const isCastle = flags.includes('k') || flags.includes('q') || san.startsWith('O-O');
    const isPromotion = flags.includes('p') || san.includes('=');

    if (isMate) {
      // Checkmate: wood strike + triumphant dual chime
      playWoodClick(ctx, now, 320, 110, 0.08, 0.38);
      playChime(ctx, now + 0.04, 659.25, 0.35, 0.22); // E5
      playChime(ctx, now + 0.14, 880, 0.45, 0.25);    // A5
    } else if (isCheck) {
      // Check: wood strike + alert chime ping
      playWoodClick(ctx, now, 330, 115, 0.075, 0.36);
      playChime(ctx, now + 0.03, 880, 0.26, 0.2);     // A5
    } else if (isCastle) {
      // Castle: double wood click (King then Rook)
      playWoodClick(ctx, now, 340, 120, 0.065, 0.34);
      playWoodClick(ctx, now + 0.09, 310, 105, 0.065, 0.34);
    } else if (isCapture) {
      // Capture: crisp double-impact wood strike
      playWoodClick(ctx, now, 480, 200, 0.05, 0.38);
      playWoodClick(ctx, now + 0.035, 300, 95, 0.08, 0.4);
    } else if (isPromotion) {
      // Promotion: wood strike + ascending chime
      playWoodClick(ctx, now, 320, 110, 0.075, 0.35);
      playChime(ctx, now + 0.04, 523.25, 0.18, 0.2);  // C5
      playChime(ctx, now + 0.12, 659.25, 0.25, 0.22); // E5
    } else {
      // Regular move: classic wooden piece tap
      playWoodClick(ctx, now, 320, 110, 0.075, 0.35);
    }
  } catch (e) {}
}

function toggleSound() {
  if (typeof state === 'undefined') return;
  state.soundEnabled = !(state.soundEnabled !== false);
  updateSoundButton();
  toast(state.soundEnabled ? 'Sound enabled' : 'Sound muted', 'info');
}

function updateSoundButton() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('btnSound');
  if (!btn) return;
  const enabled = (typeof state !== 'undefined') ? (state.soundEnabled !== false) : true;
  btn.classList.toggle('active', enabled);
  btn.title = enabled ? 'Sound: On (Click to Mute)' : 'Sound: Off (Click to Enable)';
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.innerHTML = enabled
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'
      : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  }
}


