// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.target && typeof e.target.matches === 'function' && e.target.matches('input, textarea, select')) return;

  if (state.pendingPromotion) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelPromotionDialog();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'q' || k === '1') { e.preventDefault(); choosePromotion('q'); return; }
    if (k === 'r' || k === '2') { e.preventDefault(); choosePromotion('r'); return; }
    if (k === 'b' || k === '3') { e.preventDefault(); choosePromotion('b'); return; }
    if (k === 'n' || k === 'k' || k === '4') { e.preventDefault(); choosePromotion('n'); return; }
    return;
  }

  if (e.key === 'Escape') {
    // During a puzzle test, Esc leaves the test (back to the editor) before
    // anything else - otherwise the user is stuck with a live overlay.
    if (document.body.dataset.testing === 'true') {
      e.preventDefault();
      endPuzzleTest(true);
      return;
    }
    // While editing a position, Esc is the obvious "stop editing" key - it must
    // also disarm the piece editor, which is what exitAuthoringMode now does.
    if (isAuthoringMode()) {
      e.preventDefault();
      exitAuthoringMode();
      return;
    }
    // Otherwise Esc puts down whatever is half-finished: a click still inside
    // its double-click window, a selected piece, or a click-click origin mark
    // (left button or right). Without this the highlighted origin square sits
    // there until the same square is clicked again.
    e.preventDefault();
    if (typeof cancelLeftAction === 'function') cancelLeftAction();
    state.selectedSquare = null;
    state.drawingFrom = null;
    state.rightArrowFrom = null;
    if (typeof highlightSquares === 'function') highlightSquares();
    return;
  }

  switch (e.key) {
    case '1':
      e.preventDefault();
      setMode('normal');
      break;
    case '2':
      e.preventDefault();
      setMode('puzzle');
      break;
    case '3':
      e.preventDefault();
      setMode('setup');
      break;
    case 'p': case 'P':
      // Toggle authoring mode. While a puzzle is being played, P must not
      // start a brand-new blank puzzle - it goes back to editing that one.
      if (document.body.dataset.testing === 'true') endPuzzleTest(true);
      else if (isAuthoringMode()) exitAuthoringMode();
      else enterAuthoringForNewPuzzle();
      break;
    case 'ArrowLeft': e.preventDefault(); prevMove(); break;
    case 'ArrowRight': e.preventDefault(); nextMove(); break;
    case 'ArrowDown':
      if (typeof switchPuzzleByOffset === 'function' && switchPuzzleByOffset(1)) e.preventDefault();
      break;
    case 'f': case 'F': flipBoard(); break;
    case 'r': case 'R': if (!e.ctrlKey && !e.metaKey) resetBoard(); break;
    case 'a': case 'A': setTool('arrow'); break;
    case 'c': case 'C':
      if (typeof cycleDrawingColor === 'function') cycleDrawingColor();
      break;
    case 'o': case 'O': setTool('circle'); break;
    case 'e': case 'E': setTool('eraser'); break;
    case 'v': case 'V': setTool('select'); break;
    case 'h': case 'H': setTool('highlight'); break;
    // 'M' replays the checkmate/stalemate celebration for the position already
    // on the board - handy when recording, no undo/redo juggling needed.
    case 'm': case 'M': replayMateFx(); break;
    case 'z': case 'Z':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (state.currentTool !== 'select' && typeof undoAnnotation === 'function') {
          undoAnnotation();
        } else {
          prevMove();
        }
      }
      break;
    case 'y': case 'Y':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (state.currentTool !== 'select' && typeof redoAnnotation === 'function') {
          redoAnnotation();
        } else {
          nextMove();
        }
      }
      break;
  }
});
