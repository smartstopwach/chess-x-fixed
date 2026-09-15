function renderLibrary(filter = '') {
  const tree = $('libraryTree');
  if (!tree) return;
  const lib = getLibrary();
  const f = filter.toLowerCase().trim();
  if (!lib.chapters.length) {
    tree.innerHTML = '<div class="library-empty">No chapters yet. Click + to create one.</div>';
    return;
  }
  let html = '';
  for (const chap of lib.chapters) {
    // Filter puzzles by search
    const puzzles = chap.puzzles.filter(p => {
      if (!f) return true;
      return (p.title || '').toLowerCase().includes(f)
        || (p.description || '').toLowerCase().includes(f)
        || (p.tags || '').toLowerCase().includes(f)
        || (p.solution || '').toLowerCase().includes(f);
    });
    const isExpanded = chap.expanded !== false;
    const isActive = chap.id === lib.activeChapterId;
    const puzzleCount = chap.puzzles.length;
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    html += `<div class="library-chapter" data-chapter-id="${chap.id}">
      <div class="library-chapter-header ${isExpanded ? 'expanded' : ''} ${isActive ? 'active' : ''}" data-action="toggle-chapter" data-chapter-id="${chap.id}">
        <span class="chapter-caret">▶</span>
        <span class="chapter-name" title="${escapeHtml(chap.name)}">${escapeHtml(chap.name)}</span>
        <span class="chapter-count">${puzzleCount}</span>
        <div class="chapter-actions">
          <button class="chapter-action" data-action="add-puzzle" data-chapter-id="${chap.id}" title="Add puzzle here">+</button>
          <button class="chapter-action" data-action="rename-chapter" data-chapter-id="${chap.id}" title="Rename">✎</button>
          <button class="chapter-action" data-action="delete-chapter" data-chapter-id="${chap.id}" title="Delete">✕</button>
        </div>
      </div>
      <div class="library-puzzles">`;

    if (puzzles.length === 0) {
      // No puzzles in this chapter — show empty hint inside
      html += '<div class="library-empty-chapter">No puzzles yet — click + on the chapter header to add one</div>';
    }

    for (const puz of puzzles) {
      const isActivePuz = puz.id === lib.activePuzzleId;
      html += `<div class="library-puzzle ${isActivePuz ? 'active' : ''}" data-action="select-puzzle" data-puzzle-id="${puz.id}" data-chapter-id="${chap.id}">
        <span class="puzzle-difficulty" title="Difficulty ${puz.difficulty}/5">${stars(puz.difficulty || 3)}</span>
        <span class="puzzle-name" title="${escapeHtml(puz.title || 'Untitled')}">${escapeHtml(puz.title || 'Untitled')}</span>
        <div class="puzzle-actions">
          <button class="puzzle-action" data-action="delete-puzzle" data-puzzle-id="${puz.id}" data-chapter-id="${chap.id}" title="Delete">✕</button>
        </div>
      </div>`;
    }

    html += '</div></div>';
  }
  tree.innerHTML = html;

  // Wire up event delegation
  tree.onclick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset?.action;
    if (!action) return;
    const el = e.target.closest('[data-action]');
    const chapterId = el.dataset.chapterId;
    const puzzleId = el.dataset.puzzleId;
    handleLibraryAction(action, chapterId, puzzleId);
  };
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[ch]);
}

function handleLibraryAction(action, chapterId, puzzleId) {
  const lib = getLibrary();
  if (action === 'toggle-chapter') {
    const chap = lib.chapters.find(c => c.id === chapterId);
    if (chap) {
      chap.expanded = !(chap.expanded !== false);
      lib.activeChapterId = chapterId;
      saveLibrary(lib);
      renderLibrary($('librarySearch')?.value || '');
    }
  } else if (action === 'select-puzzle') {
    lib.activeChapterId = chapterId;
    lib.activePuzzleId = puzzleId;
    saveLibrary(lib);
    renderLibrary($('librarySearch')?.value || '');
    loadPuzzleToEditor(puzzleId);
    // Selecting a puzzle from the library should hand you a playable board, not
    // a frozen editor. Authoring/setup mode used to stay armed, so every click
    // edited the position and the puzzle could never actually be played.
    if (isAuthoringMode()) setAuthoringMode(false);
    state.setupMode = false;
    state.heldPiece = null;
    state.selectedSquare = null;
    clearAllAnnotations();
    renderAll();
    const _p = lib.chapters.flatMap(c => c.puzzles).find(x => x.id === puzzleId);
    toast(`${(_p && _p.title) || 'Puzzle'} loaded - play it, or press ✎ Edit position`, 'success');
  } else if (action === 'add-puzzle') {
    // Same as + New Puzzle button — enter authoring mode with fresh state
    // Reset main board to standard so user gets a clean slate
    state.game.reset();
    state.history = [];
    state.historyIndex = -1;
    state.selectedSquare = null;
    state.heldPiece = null;
    state.selectedRackPiece = null;
    $$('.rack-piece').forEach(x => x.classList.remove('selected'));
    clearAllAnnotations();

    // Reset the puzzle editor's independent state to standard
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

    // Create the new puzzle with auto-name and standard position
    const newPuzzle = {
      id: uniqueId('puzzle'),
      title: autoName('Puzzle', lib),
      description: '',
      solution: '',
      difficulty: 3,
      tags: '',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      chapterId,
      createdAt: Date.now(),
    };
    const chap = lib.chapters.find(c => c.id === chapterId);
    if (chap) {
      chap.puzzles.push(newPuzzle);
      lib.activeChapterId = chapterId;
      lib.activePuzzleId = newPuzzle.id;
      chap.expanded = true;
      saveLibrary(lib);
      renderLibrary($('librarySearch')?.value || '');
      // Set the form fields directly with standard FEN
      $('puzzleTitle').value = '';
      $('puzzleDescription').value = '';
      $('puzzleSolution').value = '';
      $('puzzleDifficulty').value = '3';
      $('puzzleTags').value = '';
      $('puzzleFen').value = newPuzzle.fen;
      updateFenDisplay(newPuzzle.fen);
      $('puzzleChapterSelect').value = chapterId;
      // Sync the puzzle editor's independent state with the new FEN
      if (puzzleGame()) {
        puzzleGame().load(newPuzzle.fen);
        puzzleState.history = [];
        puzzleState.historyIndex = -1;
        puzzleState.heldPiece = null;
        puzzleState.selectedSquare = null;
        peSetupPushHistory();
        peUpdatePieceCount();
        peUpdateHint();
      }
      // Set authoring mode BEFORE re-render
      setAuthoringMode(true);
      // Re-render the board explicitly
      renderBoard();
      renderAnnotations();
      highlightSquares();
      updateFen();
      setTimeout(autoFitBoard, 50);
      // Scroll to editor panel
      const panel = $('puzzleEditorPanel');
      safeScrollIntoView(panel, { behavior: 'smooth', block: 'center' });
      toast('New puzzle added — set its position and click SAVE', 'success');
    }
  } else if (action === 'rename-chapter') {
    const chap = lib.chapters.find(c => c.id === chapterId);
    if (chap) {
      const newName = prompt('Rename chapter:', chap.name);
      if (newName && newName.trim()) {
        chap.name = newName.trim();
        saveLibrary(lib);
        renderLibrary($('librarySearch')?.value || '');
      }
    }
  } else if (action === 'delete-chapter') {
    const chap = lib.chapters.find(c => c.id === chapterId);
    if (!chap) return;
    if (confirm(`Delete chapter "${chap.name}" and all its ${chap.puzzles.length} puzzle(s)?`)) {
      lib.chapters = lib.chapters.filter(c => c.id !== chapterId);
      if (lib.activeChapterId === chapterId) lib.activeChapterId = null;
      saveLibrary(lib);
      renderLibrary($('librarySearch')?.value || '');
      toast('Chapter deleted', 'success');
    }
  } else if (action === 'delete-puzzle') {
    const chap = lib.chapters.find(c => c.id === chapterId);
    if (!chap) return;
    const puz = chap.puzzles.find(p => p.id === puzzleId);
    if (!puz) return;
    if (confirm(`Delete puzzle "${puz.title}"?`)) {
      chap.puzzles = chap.puzzles.filter(p => p.id !== puzzleId);
      if (lib.activePuzzleId === puzzleId) lib.activePuzzleId = null;
      saveLibrary(lib);
      renderLibrary($('librarySearch')?.value || '');
      toast('Puzzle deleted', 'success');
    }
  }
}

function renderChapterSelect() {
  const sel = $('puzzleChapterSelect');
  if (!sel) return;
  const lib = getLibrary();
  let html = '<option value="">— Uncategorized —</option>';
  for (const chap of lib.chapters) {
    html += `<option value="${chap.id}">${escapeHtml(chap.name)}</option>`;
  }
  sel.innerHTML = html;
}

