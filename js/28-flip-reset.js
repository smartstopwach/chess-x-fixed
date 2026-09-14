// ============================================
// FLIP / RESET
// ============================================
function flipBoard() {
  state.flipped = !state.flipped;
  document.body.dataset.flipped = state.flipped;
  renderBoard();
  renderAnnotations();
  highlightSquares();
}

function resetBoard() {
  if (state.history.length > 0 && !confirm('Reset board and clear moves?')) return;
  state.game.reset();
  state.history = [];
  state.historyIndex = -1;
  clearAllAnnotations();
  renderAll();
}

