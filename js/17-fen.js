// ============================================
// FEN
// ============================================
function updateFen() {
  els.fenInput.value = state.game.fen();
}

function copyFen() {
  navigator.clipboard.writeText(state.game.fen()).then(() => toast('FEN copied to clipboard', 'success'));
}

function loadFen() {
  try {
    state.game.load(els.fenInput.value);
    resetMoveHistory();           // reset history on FEN load (no PGN); the
                                  // loaded position becomes the new start
    if (typeof syncSetupControlsFromFen === 'function') {
      syncSetupControlsFromFen(els.fenInput.value);
    }
    renderAll();
    toast('FEN loaded', 'success');
  } catch (e) {
    toast('Invalid FEN', 'error');
  }
}

