// ============================================
// CHECKMATE / STALEMATE CELEBRATION
// ============================================
// One hook, called from renderAll(). Every path that can put a mate on the
// board repaints through renderAll() - a real move in Normal mode, a graded
// puzzle move in Puzzle mode, a piece dropped from either rack in Custom
// Setup, PGN/FEN import, SAVE / load, and stepping with the arrow keys - so
// all three modes animate without touching their own logic.

let __mateFxKey = '';
let __mateFxTimer = null;
let __mateFxUntil = 0;

function mateStatus(game) {
  if (!game) return null;
  try { if (typeof game.in_checkmate === 'function' && game.in_checkmate()) return 'checkmate'; } catch (e) {}
  try { if (typeof game.in_stalemate === 'function' && game.in_stalemate()) return 'stalemate'; } catch (e) {}
  // Version-proof fallback: a side to move with no legal move is mated when in
  // check, stalemated otherwise. Also covers the offline Chess stub.
  try {
    const list = game.moves();
    if (!list || list.length === 0) {
      let check = false;
      try { check = typeof game.in_check === 'function' ? !!game.in_check() : false; } catch (e) {}
      return check ? 'checkmate' : 'stalemate';
    }
  } catch (e) {}
  return null;
}

function mateFxBox() {
  let box = document.getElementById('mateFx');
  if (box) return box;
  box = document.createElement('div');
  box.id = 'mateFx';
  box.className = 'mate-fx';
  box.setAttribute('aria-live', 'polite');
  box.innerHTML =
    '<div class="mate-fx-panel">' +
      '<div class="mate-fx-title"></div>' +
      '<div class="mate-fx-sub"></div>' +
    '</div>';
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
 * the square already carrying .check; in a stalemate no king is pulsing.
 */
function decorateMateKing() {
  if (!__mateFxUntil || Date.now() > __mateFxUntil) return;
  const sq = document.querySelector('.square.check');
  if (sq) sq.classList.add('mate-king');
}

function clearMateFx() {
  const box = document.getElementById('mateFx');
  if (box) box.classList.remove('show');
  $$('.square.mate-king').forEach(sq => sq.classList.remove('mate-king'));
  if (els.boardContainer) els.boardContainer.classList.remove('mate-shake');
  __mateFxUntil = 0;
  if (__mateFxTimer) { clearTimeout(__mateFxTimer); __mateFxTimer = null; }
}

/**
 * Fires the celebration for a finished position.
 * @param {boolean} force replay even if this position already celebrated
 * @returns {boolean} true when an animation was started
 */
function celebrateMate(force) {
  const status = mateStatus(state.game);
  let fen = '';
  try { fen = state.game.fen(); } catch (e) { return false; }

  // Walking away from a mate (undo, arrow keys, reset, a new position) must
  // not leave a frozen banner or a pulsing king behind.
  if (!status) {
    if (__mateFxKey || __mateFxUntil) { __mateFxKey = ''; clearMateFx(); }
    return false;
  }
  if (!force && fen === __mateFxKey) return false;
  __mateFxKey = fen;

  const loser = (typeof state.game.turn === 'function') ? state.game.turn() : 'w';
  const winner = loser === 'w' ? 'Black' : 'White';
  const isMate = status === 'checkmate';

  const box = mateFxBox();
  box.querySelector('.mate-fx-title').textContent = isMate ? 'CHECKMATE' : 'STALEMATE';
  box.querySelector('.mate-fx-sub').textContent = isMate ? winner + ' wins' : 'Draw';
  box.className = 'mate-fx ' + (isMate ? 'is-mate' : 'is-stale');

  __mateFxUntil = Date.now() + 3000;

  // The king square pulses and the board shakes twice. Dropping the classes and
  // forcing a reflow is what lets the same animation run again on the same
  // elements - that is how 'M' is able to replay it.
  // Only a checkmate pulses a king: a stalemate is not a attack on the king, so
  // there is nothing to mark (and .check, which decorateMateKing relies on, is
  // not on the board either).
  if (isMate) {
    const king = mateKingSquare(loser);
    if (king) { king.classList.remove('mate-king'); void king.offsetWidth; king.classList.add('mate-king'); }
  }

  const bc = els.boardContainer || document.getElementById('boardContainer');
  if (bc) { bc.classList.remove('mate-shake'); void bc.offsetWidth; bc.classList.add('mate-shake'); }

  void box.offsetWidth;
  box.classList.add('show');
  if (__mateFxTimer) clearTimeout(__mateFxTimer);
  __mateFxTimer = setTimeout(clearMateFx, 3000);

  toast(isMate ? `Checkmate — ${winner} wins` : 'Stalemate — draw', 'success');
  return true;
}

// 'M' replays the moment for the position already on the board - useful while
// recording: re-cut the celebration without undo/redo juggling.
function replayMateFx() {
  if (!celebrateMate(true)) toast('No checkmate or stalemate on the board', 'info');
}
