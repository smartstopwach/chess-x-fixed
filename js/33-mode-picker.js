// ============================================
// MODE PICKER / FRONT PAGE
// ============================================
// Three modes: 'front' (mode picker shown), 'normal', 'puzzle', 'setup'
let currentMode = 'front';

function setMode(mode) {
  if (mode === currentMode && mode !== 'front') return;
  currentMode = mode;

  // Hide front page
  const fp = document.getElementById('frontPage');
  if (mode === 'front') {
    document.body.classList.add('on-front-page');
    if (fp) fp.classList.remove('hidden');
    const ind = document.getElementById('modeIndicator');
    if (ind) ind.textContent = '';
    return;
  }
  document.body.classList.remove('on-front-page');
  if (fp) fp.classList.add('hidden');

  // Update body data-mode
  document.body.dataset.mode = mode;

  // Update indicator
  const ind = document.getElementById('modeIndicator');
  if (ind) {
    if (mode === 'normal') ind.textContent = 'Normal';
    else if (mode === 'puzzle') ind.textContent = 'Puzzle';
    else if (mode === 'setup') ind.textContent = 'Setup';
  }

  // Exit any current authoring/puzzle mode first
  if (isAuthoringMode && isAuthoringMode()) {
    setAuthoringMode(false);
  }

  // Reset state for clean mode entry
  state.selectedSquare = null;
  puzzleState.selectedSquare = null;
  puzzleState.heldPiece = null;
  $$('.pe-rack-piece').forEach(x => x.classList.remove('selected'));
  state.heldPiece = null;
  state.selectedRackPiece = null;
  $$('.rack-piece').forEach(x => x.classList.remove('selected'));
  state.game.reset();
  state.history = [];
  state.historyIndex = -1;
  if (puzzleGame()) {
    puzzleGame().load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    puzzleState.history = [];
    puzzleState.historyIndex = -1;
    peSetupPushHistory();
    peUpdatePieceCount();
    peUpdateHint();
  }
  clearAllAnnotations();

  if (mode === 'normal') {
    // Normal mode: clean board, no authoring, no puzzle editor showing
    document.body.dataset.authoring = 'false';
    // Force left sidebar hidden (focus mode default)
    const layout = document.getElementById('layout');
    if (layout) layout.classList.remove('left-sidebar-visible');
    setTimeout(autoFitBoard, 50);
    toast('Normal mode — play chess with full tools', 'success');
  } else if (mode === 'puzzle') {
    // Puzzle mode: enter authoring, show puzzle editor + blue position setup
    document.body.dataset.authoring = 'true';
    enterAuthoringForNewPuzzle();
    setTimeout(autoFitBoard, 50);
  } else if (mode === 'setup') {
    // Custom setup mode: just show the yellow Position Setup on left
    // NO authoring mode (no authoring toolbar), NO puzzle editor, NO library
    // Just a clean Position Setup + FEN panel + board to play with
    document.body.dataset.authoring = 'false';
    document.body.dataset.mode = 'setup';
    toast('Custom Setup — drag pieces to set up a position', 'success');
  }
  renderAll();
}

function showFrontPage() {
  setMode('front');
}

