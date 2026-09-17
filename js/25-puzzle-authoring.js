// AUTHORING MODE — distinct visual state when making puzzles
// ============================================
function setAuthoringMode(on) {
  if (on && state.bot && state.bot.active && typeof stopBotGame === 'function') {
    stopBotGame(false);
  }
  state.authoringMode = on;
  document.body.dataset.authoring = on ? 'true' : 'false';
  document.body.dataset.setupEditing = on ? 'true' : 'false';
  if (on) {
    state.setupMode = true; // auto-enable setup mode
    toast('Authoring Mode ON — set up your puzzle position', 'success');
  } else {
    // Exiting authoring mode: disarm piece setup and switch tool to arrow
    state.setupMode = false;
    state.heldPiece = null;
    state.selectedRackPiece = null;
    state.drawingFrom = null;
    $$('.rack-piece, .pe-rack-piece').forEach(x => x.classList.remove('selected'));
    $$('.square').forEach(sq => sq.classList.remove('drop-target', 'drop-invalid', 'held-source'));
    if (typeof setTool === 'function') setTool('arrow');
    toast('Authoring Mode OFF — left click to draw arrows', 'success');
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
  state.drawingFrom = null;
  state.history = [];
  state.historyIndex = -1;
  clearAllAnnotations();
  // Clear any selected piece in puzzle rack
  puzzleState.heldPiece = null;
  puzzleState.selectedSquare = null;
  $$('.pe-rack-piece').forEach(x => x.classList.remove('selected'));
  peUpdateHint();
  if (typeof setTool === 'function') setTool('arrow');
  renderAll();
  setTimeout(autoFitBoard, 50);
  toast('Exited authoring mode — left click to draw arrows', 'success');
}

function exportLibrary() {
  const lib = getLibrary();
  const json = JSON.stringify(libraryExportPayload(lib), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chessx-library-${new Date().toISOString().split('T')[0]}.json`;
  // The anchor has to be in the document for Firefox to honour the click, and
  // the blob URL must outlive it - revoking on the very next line could cancel
  // a download that had not started yet.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
  toast('Library exported', 'success');
}

function importLibrary(file) {
  if (!file || typeof FileReader === 'undefined') {
    toast('Choose a JSON library file first', 'error');
    return;
  }
  if (typeof file.size === 'number' && file.size > MAX_IMPORT_FILE_BYTES) {
    toast('Import rejected: file is larger than 10 MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => toast('Could not read this file', 'error');
  reader.onload = (e) => {
    let parsed;
    try {
      parsed = JSON.parse(String(e.target.result || ''));
    } catch (err) {
      console.warn('Puzzle library JSON parse failed:', err);
      toast('Import rejected: the file is not valid JSON', 'error');
      return;
    }

    let report;
    try {
      report = validatePuzzleLibrary(parsed);
    } catch (err) {
      console.error('Puzzle library validation failed:', err);
      toast('Import rejected: the library structure could not be verified', 'error');
      return;
    }
    if (!report.ok) {
      console.warn('Puzzle library import rejected:', report.errors);
      const shown = report.errors.slice(0, 2).join(' | ');
      const more = report.errors.length > 2 ? ` (+${report.errors.length - 2} more)` : '';
      toast(`Import rejected: ${shown}${more}`, 'error');
      return; // Never overwrite a working library with a bad file.
    }

    const existing = getLibrary();
    const merge = mergePuzzleLibraries(existing, report.library);
    const lib = merge.library;
    saveLibrary(lib);
    renderLibrary($('librarySearch')?.value || '');
    renderChapterSelect();
    // If the imported file remembers an active puzzle, refill the editor too;
    // otherwise keep the current selection and form state intact.
    if (lib.activePuzzleId && typeof loadPuzzleToEditor === 'function') {
      loadPuzzleToEditor(lib.activePuzzleId);
    }
    const warningText = report.warnings.length ? ` (${report.warnings.length} warning(s))` : '';
    if (report.warnings.length) console.warn('Puzzle library import warnings:', report.warnings);
    const duplicateText = merge.skippedPuzzles ? `, ${merge.skippedPuzzles} duplicate(s) skipped` : '';
    const remapText = merge.remappedPuzzles ? `, ${merge.remappedPuzzles} conflicting ID(s) remapped` : '';
    toast(`Merged ${merge.addedPuzzles} new puzzle(s) in ${merge.addedChapters} new chapter(s)${duplicateText}${remapText}${warningText}; existing puzzles preserved`, 'success');
  };
  reader.readAsText(file);
}

