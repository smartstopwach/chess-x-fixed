// ============================================
// MOVE LIST
// ============================================
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
    state.game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  } else {
    state.game.load(getFenAtMove(idx));
  }
  state.selectedSquare = null;
  renderAll();
}

function getFenAtMove(idx) {
  // idx is into state.history (persistent, SAN strings)
  const game = new Chess();
  for (let i = 0; i <= idx && i < state.history.length; i++) {
    try { game.move(state.history[i]); } catch (e) {}
  }
  return game.fen();
}

function getCurrentFen() {
  // The actual FEN shown on the board, reconstructed from history up to historyIndex
  if (state.historyIndex < 0) {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
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
    state.game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
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
    state.game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  } else {
    state.game.load(getFenAtMove(state.historyIndex));
  }
  state.selectedSquare = null;
  renderAll();
  requestEngineEval();
  toast(`Deleted: ${lastSan}`, 'success');
}

