function loadPuzzleToEditor(puzzleId) {
  const lib = getLibrary();
  let puzzle = null;
  let chapterId = null;
  for (const chap of lib.chapters) {
    const p = chap.puzzles.find(p => p.id === puzzleId);
    if (p) { puzzle = p; chapterId = chap.id; break; }
  }
  if (!puzzle) {
    // Clear form
    $('puzzleTitle').value = '';
    $('puzzleDescription').value = '';
    $('puzzleSolution').value = '';
    $('puzzleDifficulty').value = '3';
    $('puzzleTags').value = '';
    $('puzzleFen').value = '';
    $('puzzleChapterSelect').value = '';
    updateFenDisplay('');
    // Clear puzzle editor's independent state
    if (puzzleGame()) {
      puzzleGame().load('8/8/8/8/8/8/8/8 w - - 0 1');
      puzzleState.history = [];
      puzzleState.historyIndex = -1;
      puzzleState.heldPiece = null;
      peSetupPushHistory();
      peUpdatePieceCount();
      peUpdateHint();
    }
    // Reset main board to standard
    state.game.reset();
    state.history = [];
    state.historyIndex = -1;
    renderAll();
    return;
  }
  $('puzzleTitle').value = puzzle.title || '';
  $('puzzleDescription').value = puzzle.description || '';
  $('puzzleSolution').value = puzzle.solution || '';
  $('puzzleDifficulty').value = String(puzzle.difficulty || 3);
  $('puzzleTags').value = puzzle.tags || '';
  $('puzzleFen').value = puzzle.fen || '';
  updateFenDisplay(puzzle.fen || '');
  $('puzzleChapterSelect').value = chapterId;

  // Load the puzzle's FEN into the puzzle editor's independent state
  if (puzzleGame() && puzzle.fen) {
    try {
      puzzleGame().load(puzzle.fen);
      puzzleState.history = [];
      puzzleState.historyIndex = -1;
      puzzleState.heldPiece = null;
      puzzleState.selectedSquare = null;
      peSetupPushHistory();
      peUpdatePieceCount();
      peUpdateHint();
    } catch (e) {}
  }

  // Also load the puzzle position into the MAIN board so user sees it
  if (puzzle.fen) {
    try {
      state.game.load(puzzle.fen);
      state.history = [];
      state.historyIndex = -1;
      renderAll();
    } catch (e) {}
  }

  toast(`Loaded puzzle: ${puzzle.title}`);
}

function saveCurrentPuzzle() {
  const lib = getLibrary();
  let puzzle = null;
  let chap = null;
  if (lib.activePuzzleId) {
    for (const c of lib.chapters) {
      const p = c.puzzles.find(x => x.id === lib.activePuzzleId);
      if (p) { puzzle = p; chap = c; break; }
    }
  }
  // Get title — auto-generate if empty so save ALWAYS works
  let title = $('puzzleTitle').value.trim();
  if (!title) {
    title = autoName('Puzzle', lib);
    $('puzzleTitle').value = title;
  }
  const description = $('puzzleDescription').value.trim();
  const solution = $('puzzleSolution').value.trim();
  const difficulty = parseInt($('puzzleDifficulty').value) || 3;
  const tags = $('puzzleTags').value.trim();
  // Prefer puzzle editor's independent FEN (puzzleState.game), fallback to main board
  let fen;
  if (puzzleState.game) {
    fen = puzzleGame().fen();
  } else {
    fen = state.game.fen();
  }
  $('puzzleFen').value = fen;
  updateFenDisplay(fen);
  const newChapterId = $('puzzleChapterSelect').value;

  if (!puzzle) {
    // Create new puzzle
    let targetChapId = newChapterId || lib.activeChapterId || lib.chapters[0]?.id;
    if (!targetChapId) {
      // Auto-create a chapter
      const newChap = { id: uniqueId('chapter'), name: 'My Puzzles', expanded: true, puzzles: [] };
      lib.chapters.push(newChap);
      targetChapId = newChap.id;
    }
    const target = lib.chapters.find(c => c.id === targetChapId);
    if (!target) {
      // Fallback: use first chapter
      const fallback = lib.chapters[0];
      if (!fallback) {
        toast('No chapter to save into — please create a chapter first', 'error');
        return;
      }
    }
    const tid = targetChapId || lib.chapters[0].id;
    const t = lib.chapters.find(c => c.id === tid) || lib.chapters[0];
    puzzle = {
      id: uniqueId('puzzle'),
      title, description, solution, difficulty, tags, fen,
      chapterId: tid, createdAt: Date.now(),
    };
    t.puzzles.push(puzzle);
    lib.activeChapterId = tid;
    lib.activePuzzleId = puzzle.id;
    t.expanded = true;
  } else {
    // Update existing
    puzzle.title = title;
    puzzle.description = description;
    puzzle.solution = solution;
    puzzle.difficulty = difficulty;
    puzzle.tags = tags;
    puzzle.fen = fen;

    // Move to new chapter if changed
    if (newChapterId && chap && chap.id !== newChapterId) {
      chap.puzzles = chap.puzzles.filter(p => p.id !== puzzle.id);
      const newChap = lib.chapters.find(c => c.id === newChapterId);
      if (newChap) {
        newChap.puzzles.push(puzzle);
        chap = newChap;
        lib.activeChapterId = newChap.id;
      }
    }
    if (chap) puzzle.chapterId = chap.id;
  }

  saveLibrary(lib);
  renderLibrary($('librarySearch')?.value || '');
  renderChapterSelect();
  updateFenDisplay(fen);
  toast('✓ Saved: ' + title, 'success');

  // Visual feedback: flash the SAVE button green
  const saveBtn = $('btnSavePuzzle');
  if (saveBtn) {
    saveBtn.classList.add('save-flash');
    setTimeout(() => saveBtn.classList.remove('save-flash'), 1500);
  }

  // Highlight the newly saved puzzle in the library
  setTimeout(() => {
    const newPuzEl = document.querySelector('.library-puzzle.active');
    if (newPuzEl) {
      newPuzEl.classList.add('puzzle-just-saved');
      safeScrollIntoView(newPuzEl, { behavior: 'smooth', block: 'center' });
      setTimeout(() => newPuzEl.classList.remove('puzzle-just-saved'), 2000);
    }
    // Also flash the library panel border
    const libPanel = $('libraryPanel');
    if (libPanel) {
      libPanel.classList.add('library-saved-flash');
      setTimeout(() => libPanel.classList.remove('library-saved-flash'), 1500);
    }
  }, 100);
}

function captureCurrentPosition() {
  const fen = state.game.fen();
  $('puzzleFen').value = fen;
  updateFenDisplay(fen);
  toast('Position captured', 'success');
}

function updateFenDisplay(fen) {
  const el = $('puzzleFenDisplay');
  if (!el) return;
  if (!fen) {
    el.textContent = 'No position set';
    el.classList.add('empty');
    return;
  }
  el.classList.remove('empty');
  el.textContent = fen;
  // Add a brief highlight
  el.style.borderColor = 'var(--accent)';
  setTimeout(() => el.style.borderColor = '', 500);
}

function loadFENToBoard(fen) {
  if (!fen) return;
  try {
    state.game.load(fen);
    state.history = [];
    state.historyIndex = -1;
    renderAll();
    toast('Position loaded to board', 'success');
  } catch (e) {
    toast('Invalid FEN', 'error');
  }
}

function newPuzzle() {
  enterAuthoringForNewPuzzle();
}

function deleteCurrentPuzzle() {
  const lib = getLibrary();
  if (!lib.activePuzzleId) { toast('No puzzle selected', 'error'); return; }
  const puz = getActivePuzzle();
  if (!puz) { toast('Puzzle not found', 'error'); return; }
  if (!confirm(`Delete puzzle "${puz.title}"?`)) return;
  for (const c of lib.chapters) {
    const idx = c.puzzles.findIndex(p => p.id === lib.activePuzzleId);
    if (idx >= 0) { c.puzzles.splice(idx, 1); break; }
  }
  lib.activePuzzleId = null;
  saveLibrary(lib);
  renderLibrary($('librarySearch')?.value || '');
  loadPuzzleToEditor(null);
  toast('Puzzle deleted', 'success');
}

function testPuzzleAsStudent() {
  const lib = getLibrary();
  const puz = getActivePuzzle();
  if (!puz) { toast('Select a puzzle first', 'error'); return; }
  if (!puz.fen) { toast('No position set', 'error'); return; }
  state.game.load(puz.fen);
  state.history = [];
  state.historyIndex = -1;
  state.puzzle = {
    title: puz.title,
    question: puz.description || 'Find the solution',
    solution: puz.solution || '',
    fen: puz.fen,
  };
  renderAll();
  // Show puzzle overlay
  const overlay = $('puzzleOverlay');
  const question = $('puzzleQuestion');
  if (overlay && question) {
    question.textContent = puz.description || 'Find the solution';
    overlay.classList.remove('hidden');
  }
  toast(`Testing puzzle: ${puz.title} — try to solve it!`);
}

// ============================================
