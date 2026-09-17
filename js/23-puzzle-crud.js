function loadPuzzleToEditor(puzzleId) {
  if (state.bot && state.bot.active && typeof stopBotGame === 'function') stopBotGame(false);
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
    resetMoveHistory();
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
      resetMoveHistory(puzzle.fen);
      renderAll();
    } catch (e) {}
  }

  if (isAuthoringMode()) setAuthoringMode(false);
  // The loaded puzzle is meant to be PLAYED ("play it, or press ✎ Edit
  // position"), so the left button has to move pieces. setAuthoringMode(false)
  // leaves the Arrow tool selected, and with that every left click draws an
  // arrow instead of playing the move. Explaining still works: the right
  // button is always the arrow in every teaching state.
  if (typeof setTool === 'function') setTool('select');

  toast(`Loaded puzzle: ${puzzle.title} — click a piece, then its square`);
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
  // Save the position that is actually ON THE BOARD - that is what the user
  // built and sees. This used to read the editor's private copy, so anything
  // placed through the normal setup path (drag from either rack) never reached
  // the saved puzzle and the piece "vanished" after SAVE.
  let fen = null;
  try { fen = state.game.fen(); } catch (e) { fen = null; }
  if (!fen && puzzleState.game && puzzleGame()) fen = puzzleGame().fen();
  if (!fen) { toast('Nothing to save - the position could not be read', 'error'); return; }
  try { if (puzzleGame()) puzzleGame().load(fen); } catch (e) {}
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

  // A puzzle built on an impossible position can never be solved or checked -
  // warn loudly (the save still happens, the teacher may be mid-edit). The
  // warning has to ride along in the FINAL message: sent on its own it was
  // overwritten a moment later by the "Saved" confirmation, so a teacher could
  // save an impossible puzzle and never be told.
  let legalWarning = '';
  if (typeof validatePosition === 'function') {
    const vCheck = validatePosition(fen);
    if (!vCheck.ok) legalWarning = ' — heads-up, this position is not legal: ' + vCheck.reason;
  }

  // After saving puzzle, exit authoring mode and set active tool to arrow
  if (isAuthoringMode()) {
    setAuthoringMode(false);
  }
  if (typeof setTool === 'function') setTool('arrow');

  toast(legalWarning
    ? '✓ Saved: ' + title + legalWarning
    : '✓ Saved: ' + title + ' — left click to draw arrows', legalWarning ? 'warn' : 'success');

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
    resetMoveHistory(fen);
    renderAll();
    try { restartBotAfterPositionChange(); } catch (e) {}
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

// ============================================
// PUZZLE PLAY / TEST MODE
// ============================================
// ▶ Test used to leave the board in authoring mode - and because
// state.setupMode stays true even after authoring is switched off, every click
// went to the piece editor instead of chess.js. A saved puzzle therefore could
// not be played. Play mode is now a real state (body[data-testing="true"]):
// authoring off, setupMode off, so the normal click-to-move path runs.

function normSan(s) {
  s = String(s == null ? '' : s).replace(/[+#!?]/g, '').trim();
  if (/^0-0-0$/i.test(s) || /^o-o-o$/i.test(s)) return 'O-O-O';
  if (/^0-0$/i.test(s) || /^o-o$/i.test(s)) return 'O-O';
  return s.toUpperCase().replace(/[^A-Z0-9X\-=.]/g, '');
}

// Puzzle "solution" is free text ("1. Nxe5" / "Rd8+ e6 Re7#"), so the only
// reliable parser is chess.js itself - we normalise the tokens and the caller
// tries to play them one by one.
function solutionSanList(text) {
  if (!text) return [];
  return String(text)
    .replace(/\{[^}]*\}/g, ' ')              // drop variation braces
    .replace(/\b([1-9]\d*)\.{1,3}/g, ' ')    // drop move numbers
    .split(/[\s,;]+/)
    .map(t => t.replace(/^[.]+|[.]+$/g, '').trim())
    .filter(t => t && !/^\.{1,3}$/.test(t))
    .slice(0, 12);
}

function startPuzzleTest() {
  const lib = getLibrary();
  const puz = getActivePuzzle();
  if (!puz) { toast('Select a puzzle in the library first', 'error'); return; }
  if (!puz.fen) { toast('This puzzle has no position', 'error'); return; }

  // The two flags that turn board clicks into editing:
  if (isAuthoringMode()) setAuthoringMode(false);
  state.setupMode = false;
  state.heldPiece = null;
  state.selectedRackPiece = null;
  state.selectedSquare = null;
  $$('.rack-piece, .pe-rack-piece').forEach(x => x.classList.remove('selected'));

  try { state.game.load(puz.fen); }
  catch (e) { toast('This puzzle FEN cannot be loaded: ' + e.message.slice(0, 40), 'error'); return; }

  resetMoveHistory(puz.fen);
  clearAllAnnotations();

  state.puzzle = {
    id: puz.id,
    title: puz.title || 'Untitled',
    question: puz.description || 'Find the solution',
    solution: puz.solution || '',
    fen: puz.fen,
    moves: solutionSanList(puz.solution),
    progress: 0,
    solved: false,
    revealing: false,
  };
  document.body.dataset.testing = 'true';

  // A live puzzle is solved with the left button, so the Select tool is
  // required here - arriving from the editor the Arrow tool is still selected
  // and every click would draw instead of moving, leaving the student unable
  // to answer at all.
  if (typeof setTool === 'function') setTool('select');

  renderAll();
  const overlay = $('puzzleOverlay');
  if (overlay) overlay.classList.remove('hidden');
  const q = $('puzzleQuestion');
  if (q) q.textContent = state.puzzle.question;
  const ans = $('puzzleAnswer');
  if (ans) ans.classList.add('hidden');
  const rev = $('btnRevealAnswer');
  if (rev) rev.textContent = state.puzzle.moves.length ? 'REVEAL ANSWER' : 'NO SOLUTION SAVED — EDIT FIRST';
  const back = $('btnPuzzleBack');
  if (back) back.style.display = '';
  toast('Puzzle is live — click a piece, then its target square', 'success');
  setTimeout(autoFitBoard, 50);
}

// kept because the toolbar / quick-action buttons call this name
function testPuzzleAsStudent() { startPuzzleTest(); }

function showPuzzleAnswer(show) {
  const box = $('puzzleAnswer');
  const mv = $('puzzleAnswerMove');
  const pz = state.puzzle;
  if (mv) {
    let next = '';
    if (pz && pz.moves && pz.moves.length) {
      // while solving: the move still missing. once finished/revealed: the line.
      next = (pz.solved || pz.progress >= pz.moves.length)
        ? pz.moves.join(' ')
        : pz.moves[pz.progress];
    }
    mv.textContent = next || (pz && pz.solution) || 'no solution saved';
  }
  if (box) box.classList.toggle('hidden', !show);
}

function revealPuzzleAnswer() {
  const pz = state.puzzle;
  if (!pz) { toast('Not playing a puzzle right now', 'error'); return; }
  showPuzzleAnswer(true);
  if (!pz.moves.length) { toast('No solution move was saved for this puzzle', 'error'); return; }
  // Replay the rest of the line so it can be stepped through with ← →
  pz.revealing = true;
  let played = 0;
  for (const mv of pz.moves.slice(pz.progress)) {
    let res = null;
    try { res = state.game.move(mv); } catch (e) { res = null; }
    if (!res) break;
    playPieceMoveSound(res, played * 0.08);
    state.history.push(res.san);
    state.historyIndex = state.history.length - 1;
    played++;
  }
  pz.revealing = false;
  pz.progress = Math.min(pz.moves.length, pz.progress + played);
  renderAll();
  toast(played
    ? `Answer ${pz.moves[0]} — ${played} move(s) replayed, use ← → to step`
    : `Answer is ${pz.moves[0]} (could not be played from here)`, 'info');
}

// Called by tryMakeMove() after every legal move while a puzzle is loaded.
function onPuzzleMovePlayed(san) {
  const pz = state.puzzle;
  if (!pz || pz.revealing || !pz.moves || !pz.moves.length) return;
  const want = normSan(pz.moves[pz.progress] || '');
  if (!want) return;
  if (normSan(san) === want) {
    pz.progress++;
    if (pz.progress >= pz.moves.length) {
      pz.solved = true;
      showPuzzleAnswer(true);
      toast('✓ Solved — that is the whole line', 'success');
    } else {
      toast('✓ Correct — opponent replies, keep going', 'success');
      // play the opponent's answer so the puzzle continues by itself
      pz.revealing = true;
      const nxt = pz.moves[pz.progress];
      let res = null;
      if (nxt) { try { res = state.game.move(nxt); } catch (e) { res = null; } }
      if (res) {
        playPieceMoveSound(res);
        state.history.push(res.san);
        state.historyIndex = state.history.length - 1;
        pz.progress++;
        // the opponent's automatic answer also hands the clock back
        try {
          if (state.clock && state.clock.running) {
            const ended = typeof stopClockIfGameIsOver === 'function' && stopClockIfGameIsOver();
            if (!ended) switchClockSide();
          }
        } catch (e) {}
      }
      pz.revealing = false;
      if (pz.progress >= pz.moves.length) { pz.solved = true; showPuzzleAnswer(true); }
      renderAll();
    }
  } else {
    // Revert the wrong move so student can immediately try again
    try {
      state.game.undo();
      if (state.history.length > 0) {
        state.history.pop();
        state.historyIndex = state.history.length - 1;
      }
      renderAll();
    } catch (e) {}
    toast(`✗ ${san} is not the solution — try again`, 'error');
  }
}

function endPuzzleTest(backToEditor) {
  document.body.dataset.testing = 'false';
  const overlay = $('puzzleOverlay');
  if (overlay) overlay.classList.add('hidden');
  const wasId = state.puzzle && state.puzzle.id;
  state.puzzle = null;
  if (backToEditor) {
    const lib = getLibrary();
    if (wasId) {
      lib.activePuzzleId = wasId;
      saveLibrary(lib);
      loadPuzzleToEditor(wasId);            // refills the editor + position
    }
    setAuthoringMode(true);                 // re-enables the piece editor
    renderAll();
    renderLibrary(($('librarySearch') && $('librarySearch').value) || '');
    setTimeout(autoFitBoard, 50);
    toast('Back to editing this puzzle', 'success');
  } else {
    if (typeof setTool === 'function') setTool('arrow');
    renderAll();
    toast('Finished — left click to draw arrows', 'success');
  }
}

// ============================================
