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

// A short, dry wooden WAV cue gives moves the familiar chess-board "tap"
// instead of a synthetic musical tone. The Web Audio context is still warmed
// on the board press as a reliable fallback for embedded browsers and delayed
// puzzle replays. Warming it during the original gesture is important on
// mobile Safari/Chrome, where resuming only after mouseup/touchend can leave
// the first move silent.
let moveAudioContext = null;

function prepareMoveAudio() {
  try {
    if (typeof window === 'undefined') return false;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    if (!moveAudioContext || moveAudioContext.state === 'closed') {
      moveAudioContext = new AudioCtor();
    }
    if (moveAudioContext.state === 'suspended' && typeof moveAudioContext.resume === 'function') {
      const resumeResult = moveAudioContext.resume();
      if (resumeResult && typeof resumeResult.catch === 'function') resumeResult.catch(() => {});
    }
    return true;
  } catch (e) {
    // Audio is optional; a blocked/unsupported context must never block a move.
    return false;
  }
}

function playPieceMoveSound(move, delay = 0) {
  try {
    // Prefer the local wooden sample in real browsers. Unlike a raw oscillator
    // this has the short, dry attack of a piece landing on a wooden board.
    if (typeof window !== 'undefined' && typeof window.Audio === 'function') {
      const audio = new window.Audio('audio/move.wav');
      // JSDOM and a few embedded shells expose Audio but report no WAV
      // decoder. Avoid calling their placeholder play() implementation;
      // real browsers return "maybe" or "probably" here.
      const playable = typeof audio.canPlayType !== 'function' || audio.canPlayType('audio/wav');
      if (playable) {
        audio.volume = 0.78;
        const playSample = () => {
          try {
            audio.currentTime = 0;
            const result = audio.play();
            if (result && typeof result.catch === 'function') result.catch(() => {});
          } catch (e) {}
        };
        const wait = Math.max(0, Number(delay) || 0) * 1000;
        if (wait > 0) setTimeout(playSample, wait);
        else playSample();
        return;
      }
    }

    // Web Audio fallback for browsers that can create a context but cannot
    // decode the local sample. It remains deliberately short and dry.
    if (!prepareMoveAudio()) return;
    const ctx = moveAudioContext;
    const now = Number(ctx.currentTime);
    const start = (Number.isFinite(now) ? now : 0) +
      Math.max(0.01, Number(delay) || 0);
    const captured = !!(move && (move.captured || (move.flags && String(move.flags).includes('c'))));
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(captured ? 270 : 420, start);
    oscillator.frequency.exponentialRampToValueAtTime(captured ? 135 : 220, start + 0.13);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(captured ? 0.30 : 0.22, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.19);
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

