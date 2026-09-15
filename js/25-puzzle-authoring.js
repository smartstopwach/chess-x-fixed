// AUTHORING MODE — distinct visual state when making puzzles
// ============================================
function setAuthoringMode(on) {
  state.authoringMode = on;
  document.body.dataset.authoring = on ? 'true' : 'false';
  if (on) {
    state.setupMode = true; // auto-enable setup mode
    toast('Authoring Mode ON — set up your puzzle position', 'success');
  } else {
    // The part that used to be missing: setAuthoringMode(true) arms the piece
    // editor (state.setupMode) but turning it off left that flag on - so after
    // "exiting" the editor every click kept picking/placing pieces instead of
    // playing a legal move, and no piece you touched was ever a real move.
    state.setupMode = false;
    state.heldPiece = null;
    state.selectedRackPiece = null;
    $$('.rack-piece, .pe-rack-piece').forEach(x => x.classList.remove('selected'));
    $$('.square').forEach(sq => sq.classList.remove('drop-target', 'drop-invalid', 'held-source'));
    toast('Authoring Mode OFF', 'success');
  }
  updateSetupHint();
  // Show/hide authoring button
  const btn = $('btnToggleAuthoring');
  if (btn) btn.classList.toggle('active', on);
}

function isAuthoringMode() {
  return state.authoringMode === true;
}

function enterAuthoringForNewPuzzle() {
  // SIMPLE FLOW: just enter authoring mode and clear the editor.
  // The puzzle is only created when the user clicks SAVE.
  const lib = getLibrary();
  // Auto-create chapter if none exists
  if (!lib.chapters.length) {
    const newChap = { id: uniqueId('chapter'), name: 'My Puzzles', expanded: true, puzzles: [] };
    lib.chapters.push(newChap);
    saveLibrary(lib);
    renderChapterSelect();
  }
  // Clear active puzzle so save creates a new one
  lib.activePuzzleId = null;
  saveLibrary(lib);

  // Clear all editor fields
  $('puzzleTitle').value = '';
  $('puzzleDescription').value = '';
  $('puzzleSolution').value = '';
  $('puzzleDifficulty').value = '3';
  $('puzzleTags').value = '';

  // CRITICAL: Reset the puzzle editor's INDEPENDENT state (puzzleState.game)
  // to the standard position so user starts fresh. Don't carry over old puzzle.
  if (puzzleGame()) {
    puzzleGame().load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    puzzleState.history = [];
    puzzleState.historyIndex = -1;
    puzzleState.heldPiece = null;
    puzzleState.selectedSquare = null;
    peSetupPushHistory();
    peUpdatePieceCount();
    peUpdateHint();
  }

  // Also sync the puzzle FEN display to standard
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  $('puzzleFen').value = startFen;
  updateFenDisplay(startFen);
  // Reset main board to standard too
  state.game.reset();
  state.history = [];
  state.historyIndex = -1;
  state.selectedSquare = null;
  state.heldPiece = null;
  state.selectedRackPiece = null;
  $$('.rack-piece').forEach(x => x.classList.remove('selected'));
  clearAllAnnotations();
  // Force re-render of the board explicitly
  renderBoard();
  renderAnnotations();
  highlightSquares();
  updateFen();
  setTimeout(autoFitBoard, 50);

  // Set chapter dropdown to active or first
  const chapId = lib.activeChapterId || lib.chapters[0].id;
  $('puzzleChapterSelect').value = chapId;

  renderLibrary($('librarySearch')?.value || '');

  setAuthoringMode(true);
  setTimeout(autoFitBoard, 50);
  // Scroll to editor panel
  const panel = $('puzzleEditorPanel');
  safeScrollIntoView(panel, { behavior: 'smooth', block: 'center' });
  toast('New puzzle — set the position and click SAVE', 'success');
}

function exitAuthoringMode() {
  setAuthoringMode(false);
  // Leave a PLAYABLE board with the position that was being edited (or the
  // saved puzzle's position). Resetting to the standard position here used to
  // destroy the puzzle you just built, so "exit editing" landed on a board that
  // looked like the puzzle but was not it.
  const puz = (typeof getActivePuzzle === 'function') ? getActivePuzzle() : null;
  if (puz && puz.fen) {
    try { state.game.load(puz.fen); }
    catch (e) { /* keep whatever is on the board */ }
  }
  state.setupMode = false;
  state.heldPiece = null;
  state.selectedRackPiece = null;
  state.selectedSquare = null;
  state.history = [];
  state.historyIndex = -1;
  state.selectedSquare = null;
  clearAllAnnotations();
  // Clear any selected piece in puzzle rack
  puzzleState.heldPiece = null;
  puzzleState.selectedSquare = null;
  $$('.pe-rack-piece').forEach(x => x.classList.remove('selected'));
  peUpdateHint();
  renderAll();
  setTimeout(autoFitBoard, 50);
  toast('Exited authoring mode', 'success');
}

function exportLibrary() {
  const lib = getLibrary();
  const json = JSON.stringify(lib, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chessx-library-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Library exported', 'success');
}

function importLibrary(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const lib = JSON.parse(e.target.result);
      if (!lib.chapters || !Array.isArray(lib.chapters)) throw new Error('Invalid format');
      saveLibrary(lib);
      renderLibrary($('librarySearch')?.value || '');
      renderChapterSelect();
      toast(`Imported ${lib.chapters.length} chapter(s)`, 'success');
    } catch (err) {
      toast('Invalid library file', 'error');
    }
  };
  reader.readAsText(file);
}

