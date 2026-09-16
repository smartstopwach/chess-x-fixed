// ============================================
// MOVE LIST
// ============================================
// Where the game on screen started. Every navigation function replays SAN on
// top of this, so it follows Custom Setup / FEN loads / puzzles automatically.
function baseFen() {
  const b = (state.baseFen || '').trim();
  return b || START_FEN;
}

// Start a fresh move list from the position that is on the board right now
// (or from an explicit FEN). Never reset history without saying where it
// starts, or undo will take the board back to the standard opening.
function resetMoveHistory(fen) {
  let base = (fen || '').trim();
  if (!base) { try { base = state.game.fen(); } catch (e) { base = ''; } }
  state.baseFen = base || START_FEN;
  state.history = [];
  state.historyIndex = -1;
}

function renderMovesList() {
  els.movesList.innerHTML = '';
  const history = state.history || [];

  for (let i = 0; i < history.length; i++) {
    const san = history[i];
    if (i % 2 === 0) {
      const num = document.createElement('span');
      num.className = 'move-num';
      num.textContent = `${Math.floor(i/2) + 1}.`;
      els.movesList.appendChild(num);
    }
    const moveSpan = document.createElement('span');
    moveSpan.className = 'move-san';
    if (i === state.historyIndex) moveSpan.classList.add('current');
    moveSpan.textContent = san;
    moveSpan.dataset.idx = i;
    moveSpan.addEventListener('click', () => goToMove(i));
    els.movesList.appendChild(moveSpan);
  }

  const current = els.movesList.querySelector('.current');
  safeScrollIntoView(current, { block: 'nearest', behavior: 'smooth' });
}

function goToMove(idx) {
  if (idx < -1 || idx >= state.history.length) return;
  state.historyIndex = idx;
  if (idx < 0) {
    state.game.load(baseFen());
  } else {
    state.game.load(getFenAtMove(idx));
  }
  state.selectedSquare = null;
  renderAll();
}

function getFenAtMove(idx) {
  // idx is into state.history (persistent, SAN strings), replayed on the
  // position this game actually started from
  const game = new Chess();
  try { game.load(baseFen()); } catch (e) { game.reset(); }
  for (let i = 0; i <= idx && i < state.history.length; i++) {
    try { game.move(state.history[i]); } catch (e) {}
  }
  return game.fen();
}

function getCurrentFen() {
  // The actual FEN shown on the board, reconstructed from history up to historyIndex
  if (state.historyIndex < 0) {
    return baseFen();
  }
  return getFenAtMove(state.historyIndex);
}

function nextMove() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.game.load(getFenAtMove(state.historyIndex));
    state.selectedSquare = null;
    renderAll();
  }
}

function prevMove() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.game.load(getFenAtMove(state.historyIndex));
    state.selectedSquare = null;
    renderAll();
  } else if (state.historyIndex === 0) {
    state.historyIndex = -1;
    state.game.load(baseFen());
    state.selectedSquare = null;
    renderAll();
  }
}

function deleteMove() {
  if (state.history.length === 0) return;
  const lastSan = state.history[state.history.length - 1];
  state.history.pop();
  state.historyIndex = state.history.length - 1;
  if (state.historyIndex < 0) {
    state.game.load(baseFen());
  } else {
    state.game.load(getFenAtMove(state.historyIndex));
  }
  state.selectedSquare = null;
  renderAll();
  requestEngineEval();
  toast(`Deleted: ${lastSan}`, 'success');
}

