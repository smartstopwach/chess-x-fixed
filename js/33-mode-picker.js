// ============================================
// MODE PICKER / FRONT PAGE
// ============================================
// Three modes: 'front' (mode picker shown), 'normal', 'puzzle', 'setup'
let currentMode = 'front';

function setMode(mode) {
  if (mode === currentMode && mode !== 'front') return;
  if (typeof state !== 'undefined' && state.bot && state.bot.active &&
      (mode === 'front' || mode !== currentMode)) {
    stopBotGame(false);
  }
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
  if (typeof isAuthoringMode === 'function' && isAuthoringMode()) {
    setAuthoringMode(false);
  }

  // Reset setup editing state completely for clean mode entry
  state.setupMode = false;
  document.body.dataset.setupEditing = 'false';
  state.selectedSquare = null;
  state.heldPiece = null;
  state.selectedRackPiece = null;
  state.dragPiece = null;
  $$('.rack-piece, .pe-rack-piece').forEach(x => x.classList.remove('selected'));
  $$('.square').forEach(sq => sq.classList.remove('drop-target', 'drop-invalid', 'held-source', 'selected'));
  if (typeof updateSetupHint === 'function') updateSetupHint();

  if (typeof puzzleState !== 'undefined') {
    puzzleState.selectedSquare = null;
    puzzleState.heldPiece = null;
  }

  state.game.reset();
  resetMoveHistory();
  if (typeof puzzleGame === 'function' && puzzleGame()) {
    puzzleGame().load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    puzzleState.history = [];
    puzzleState.historyIndex = -1;
    if (typeof peSetupPushHistory === 'function') peSetupPushHistory();
    if (typeof peUpdatePieceCount === 'function') peUpdatePieceCount();
    if (typeof peUpdateHint === 'function') peUpdateHint();
  }
  clearAllAnnotations();

  if (mode === 'normal') {
    // Normal mode: clean board, no authoring, no puzzle editor showing
    document.body.dataset.authoring = 'false';
    document.body.dataset.setupEditing = 'false';
    state.setupMode = false;
    // Normal mode means "play chess": puzzle/authoring flows leave the Arrow
    // tool selected, and with that a left click draws instead of moving, so the
    // Select tool is restored on the way in.
    if (typeof setTool === 'function') setTool('select');
    // Force left sidebar hidden (focus mode default)
    const layout = document.getElementById('layout');
    if (layout) layout.classList.remove('left-sidebar-visible');
    setTimeout(autoFitBoard, 50);
    toast('Normal mode — play chess with full tools', 'success');
  } else if (mode === 'puzzle') {
    // Puzzle mode: enter authoring, show puzzle editor + blue position setup
    document.body.dataset.authoring = 'true';
    document.body.dataset.setupEditing = 'false';
    state.setupMode = false;
    enterAuthoringForNewPuzzle();
    setTimeout(autoFitBoard, 50);
  } else if (mode === 'setup') {
    // Custom setup mode: show yellow Position Setup on left, editing enabled
    document.body.dataset.authoring = 'false';
    document.body.dataset.setupEditing = 'true';
    state.setupMode = true;
    const layout = document.getElementById('layout');
    if (layout) layout.classList.add('left-sidebar-visible');
    loadPreset('standard');
    setTimeout(autoFitBoard, 50);
    toast('Custom Setup — arrange pieces and click START FROM POSITION', 'success');
  }
  renderAll();
}

function showFrontPage() {
  setMode('front');
}
