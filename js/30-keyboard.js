// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;

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
    case 'h': case 'H':
      e.preventDefault();
      showFrontPage();
      break;
    case 'p': case 'P':
      // Toggle authoring mode
      if (isAuthoringMode()) exitAuthoringMode();
      else enterAuthoringForNewPuzzle();
      break;
    case 'e': case 'E':
      // Toggle setup mode
      state.setupMode = !state.setupMode;
      if (!state.setupMode) {
        state.heldPiece = null;
        state.selectedRackPiece = null;
        $$('.rack-piece').forEach(x => x.classList.remove('selected'));
        $$('.square').forEach(sq => sq.classList.remove('drop-target'));
      }
      toast(state.setupMode ? 'Setup Mode: ON — click/drag to edit position' : 'Setup Mode: OFF — play moves normally');
      updateSetupHint();
      break;
    case 'ArrowLeft': e.preventDefault(); prevMove(); break;
    case 'ArrowRight': e.preventDefault(); nextMove(); break;
    case 'f': case 'F': flipBoard(); break;
    case 'r': case 'R': if (!e.ctrlKey && !e.metaKey) resetBoard(); break;
    case 'a': case 'A': setTool('arrow'); break;
    case 'c': case 'C': setTool('circle'); break;
    case 'e': case 'E': setTool('eraser'); break;
    case 'v': case 'V': setTool('select'); break;
    case 'h': case 'H': setTool('highlight'); break;
    case 'z': case 'Z':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        prevMove();
      }
      break;
    case 'y': case 'Y':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        nextMove();
      }
      break;
  }
});

