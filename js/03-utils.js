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

// A tiny Web Audio move cue keeps every board mode feeling responsive without
// shipping an audio asset. It is created lazily from the user's move gesture,
// so it also satisfies browser autoplay rules. In browsers without Web Audio
// (or in the DOM test harness) it simply becomes a no-op.
let moveAudioContext = null;

function playPieceMoveSound(move, delay = 0) {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!moveAudioContext || moveAudioContext.state === 'closed') {
      moveAudioContext = new AudioCtor();
    }
    if (moveAudioContext.state === 'suspended' && typeof moveAudioContext.resume === 'function') {
      const resumeResult = moveAudioContext.resume();
      if (resumeResult && typeof resumeResult.catch === 'function') resumeResult.catch(() => {});
    }

    const ctx = moveAudioContext;
    const start = ctx.currentTime + Math.max(0, Number(delay) || 0);
    const captured = !!(move && (move.captured || (move.flags && String(move.flags).includes('c'))));
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(captured ? 150 : 205, start);
    oscillator.frequency.exponentialRampToValueAtTime(captured ? 105 : 135, start + 0.12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(captured ? 0.16 : 0.12, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.16);
  } catch (e) {
    // Sound must never be able to break a legal move or a setup placement.
  }
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

