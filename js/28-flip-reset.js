// ============================================
// FLIP / RESET
// ============================================
function flipBoard() {
  state.flipped = !state.flipped;
  document.body.dataset.flipped = state.flipped;
  renderBoard();
  renderAnnotations();
  highlightSquares();
  // The board-bottom side is always the human side in bot games. Flipping
  // during a search therefore cancels the old search and hands the other side
  // to the bot without resetting the current position or move list.
  try { syncBotAfterBoardChange(); } catch (e) {}
}

function resetBoard() {
  if (state.history.length > 0 && !confirm('Reset board and clear moves?')) return;
  state.game.reset();
  resetMoveHistory();
  clearAllAnnotations();
  renderAll();
  try { syncBotAfterBoardChange(); } catch (e) {}
}

