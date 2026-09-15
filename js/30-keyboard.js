// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;

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
