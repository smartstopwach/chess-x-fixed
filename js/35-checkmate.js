// ============================================
// CHECKMATE / STALEMATE / DRAW CELEBRATION
// ============================================
// One hook, called from renderAll(). Every path that can finish a game repaints
// through renderAll() - a click or drag move in Normal mode, a graded puzzle
// move in Puzzle mode, a piece dropped from either rack in Custom Setup, a
// FEN/PGN import, SAVE / ▶ Test, and stepping with the arrow keys - so all three
// modes animate without any of them owning the logic.
//
// Three looks, because the three results mean different things:
//   checkmate  gold banner + the mated king pulses red + two board shakes
//   stalemate  grey banner + a slow ripple over the board, no king pulse
//   draw       steel-blue banner naming WHY (fifty-move / threefold /
//              insufficient material) + two light sweeps crossing the board
// Draws are deliberately calmer and desaturate the board instead of shaking it.

let __mateFxKey = '';
let __mateFxTimer = null;
let __mateFxUntil = 0;

function cbCall(game, ...names) {
  // The bundled chess.min.js and the offline fallback stub do not expose the
  // same names, and some builds use the is_* prefix. Try each, quietly.
  for (const name of names) {
    try {
      if (typeof game[name] === 'function' && game[name]() === true) return true;
    } catch (e) {}
  }
  return false;
}

function cbHalfmoveClock(fen) {
  const n = parseInt(String(fen || '').split(' ')[4], 10);
  return Number.isFinite(n) ? n : 0;
}

/** Kings-only, or one minor (or two same-coloured bishops) per side. Used only
 *  when the engine build has no insufficient_material() to ask. */
function looksDrawnMaterial(fen) {
  const placement = String(fen || '').split(' ')[0];
  if (!placement) return false;
  const counts = { w: {}, b: {} };
  let color = null;
  for (const ch of placement) {
    if (ch === '/') continue;
    if (/[1-8]/.test(ch)) continue;
    color = ch === ch.toUpperCase() ? 'w' : 'b';
    counts[color][ch.toLowerCase()] = (counts[color][ch.toLowerCase()] || 0) + 1;
  }
  for (const side of ['w', 'b']) {
    const c = counts[side];
    for (const type of Object.keys(c)) {
      if (type === 'k') continue;
      if (type !== 'b' && type !== 'n') return false;   // pawn / rook / queen
    }
    if ((c.b || 0) + (c.n || 0) > 2) return false;
  }
  return true;
}

/** 'checkmate' | 'stalemate' | 'draw' | null for the position on the board. */
function mateStatus(game) {
  if (!game) return null;
  if (cbCall(game, 'in_checkmate')) return 'checkmate';
  if (cbCall(game, 'in_stalemate')) return 'stalemate';
  if (cbCall(game, 'in_draw')) return 'draw';
  // Version-proof fallback: a side to move with no legal move is mated when in
  // check, stalemated otherwise. Also covers the offline Chess stub in 01-state.
  try {
    const list = game.moves();
    if (!list || list.length === 0) {
      return cbCall(game, 'in_check') ? 'checkmate' : 'stalemate';
    }
  } catch (e) {}
  try {
    if (cbHalfmoveClock(game.fen()) >= 100) return 'draw';
    if (looksDrawnMaterial(game.fen())) return 'draw';
  } catch (e) {}
  return null;
}

function finishInfo(game) {
  const kind = mateStatus(game);
  if (!kind) return null;
  let fen = '';
  try { fen = game.fen(); } catch (e) {}

  const loser = (typeof game.turn === 'function') ? game.turn() : 'w';
  const winner = loser === 'w' ? 'Black' : 'White';

  if (kind === 'checkmate') {
    return { kind, variant: 'is-mate', title: 'CHECKMATE', sub: winner + ' wins',
             toast: `Checkmate — ${winner} wins` };
  }
  if (kind === 'stalemate') {
    return { kind, variant: 'is-stale', title: 'STALEMATE', sub: 'Draw — no legal move',
             toast: 'Stalemate — draw' };
  }
  // A draw: say which rule ended it, so the moment is explainable on camera.
  let reason = 'neither side can win';
  if (cbHalfmoveClock(fen) >= 100) reason = 'by the fifty-move rule';
  else if (cbCall(game, 'insufficient_material', 'is_insufficient_material') || looksDrawnMaterial(fen)) reason = 'insufficient material';
  else if (cbCall(game, 'in_threefold_repetition')) reason = 'by threefold repetition';
  return { kind, variant: 'is-draw', title: 'DRAW', sub: reason, toast: `Draw — ${reason}` };
}

function mateFxBox() {
  let box = document.getElementById('mateFx');
  if (box) return box;
  box = document.createElement('div');
  box.id = 'mateFx';
  box.className = 'mate-fx';
  box.setAttribute('aria-live', 'polite');
  (els.boardArea || document.body).appendChild(box);
  return box;
}

function mateKingSquare(color) {
  try {
    let found = null;
    state.game.board().forEach((row, r) => row.forEach((p, c) => {
      if (!found && p && p.type === 'k' && p.color === color) found = els.board.children[r * 8 + c];
    }));
    return found || null;
  } catch (e) {
    return null;
  }
}

/**
 * Called at the end of highlightSquares(), because that is the function that
 * owns square classes: it re-marks the mated king after every repaint while the
 * celebration is still running. In a checkmate the mated king is by definition
 * the square already carrying .check; draws have nothing to mark.
 */
function decorateMateKing() {
  if (state.setupMode || state.authoringMode ||
      (document.body && (document.body.dataset.setupEditing === 'true' || document.body.dataset.authoring === 'true'))) {
    clearMateFx();
    return;
  }
  if (!__mateFxUntil || Date.now() > __mateFxUntil) return;
  const sq = document.querySelector('.square.check');
  if (sq) sq.classList.add('mate-king');
}

function clearMateFx() {
  const box = document.getElementById('mateFx');
  if (box) box.classList.remove('show');
  $$('.square.mate-king').forEach(sq => sq.classList.remove('mate-king'));
  const bc = els.boardContainer || document.getElementById('boardContainer');
  if (bc) bc.classList.remove('mate-shake', 'fx-dim');
  __mateFxUntil = 0;
  if (__mateFxTimer) { clearTimeout(__mateFxTimer); __mateFxTimer = null; }
}

/**
 * Fires the celebration for a finished position.
 * @param {boolean} force replay even if this position already celebrated
 * @returns {boolean} true when an animation was started
 */
function celebrateMate(force) {
  // Never celebrate or show mate/stalemate effects during setup editing or puzzle authoring!
  if (state.setupMode || state.authoringMode ||
      (document.body && (document.body.dataset.setupEditing === 'true' || document.body.dataset.authoring === 'true'))) {
    clearMateFx();
    return false;
  }

  const info = finishInfo(state.game);
  let key = '';
  try { key = state.game.fen() + '|' + (state.history ? state.history.length : 0); } catch (e) { return false; }

  // Walking away from a finished position (undo, arrow keys, reset, a new FEN,
  // another piece placed) must not leave a frozen banner or a glowing king.
  if (!info) {
    if (__mateFxKey || __mateFxUntil) { __mateFxKey = ''; clearMateFx(); }
    return false;
  }
  if (!force && key === __mateFxKey) return false;
  __mateFxKey = key;

  const isMate = info.kind === 'checkmate';
  const isDraw = info.kind === 'draw';

  // Rebuilding the markup is also what restarts the animations, since the
  // ripple / sweep elements are new nodes each time.
  const box = mateFxBox();
  box.innerHTML =
    '<div class="mate-fx-panel">' +
      '<div class="mate-fx-title"></div>' +
      '<div class="mate-fx-sub"></div>' +
    '</div>' +
    (info.kind === 'stalemate' ? '<div class="fx-ripple"></div>' : '') +
    (isDraw ? '<div class="fx-sweep fx-sweep-a"></div><div class="fx-sweep fx-sweep-b"></div>' : '');
  const titleEl = box.querySelector('.mate-fx-title');
  const subEl = box.querySelector('.mate-fx-sub');
  if (titleEl) titleEl.textContent = info.title;
  if (subEl) subEl.textContent = info.sub;
  box.className = 'mate-fx ' + info.variant;

  __mateFxUntil = Date.now() + 3000;

  const bc = els.boardContainer || document.getElementById('boardContainer');
  if (bc) {
    bc.classList.remove('mate-shake', 'fx-dim');
    void bc.offsetWidth;                     // reflow, so the same animation can run again
    bc.classList.add(isMate ? 'mate-shake' : 'fx-dim');
  }

  // Only a checkmate pulses a king - a draw is not an attack on anybody.
  if (isMate) {
    $$('.square.mate-king').forEach(sq => { sq.classList.remove('mate-king'); void sq.offsetWidth; });
    const king = mateKingSquare(state.game.turn ? state.game.turn() : 'w');
    if (king) { void king.offsetWidth; king.classList.add('mate-king'); }
  }

  void box.offsetWidth;
  box.classList.add('show');
  if (__mateFxTimer) clearTimeout(__mateFxTimer);
  __mateFxTimer = setTimeout(clearMateFx, 3000);

  toast(info.toast, 'success');
  return true;
}

// 'M' replays the moment for the position already on the board - useful while
// recording: re-cut the celebration without undo/redo juggling.
function replayMateFx() {
  if (!celebrateMate(true)) toast('No checkmate, stalemate or draw on the board', 'info');
}
