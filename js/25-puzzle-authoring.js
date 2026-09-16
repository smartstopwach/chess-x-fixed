// AUTHORING MODE — distinct visual state when making puzzles
// ============================================
function setAuthoringMode(on) {
  state.authoringMode = on;
  document.body.dataset.authoring = on ? 'true' : 'false';
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
  const json = JSON.stringify(lib, null, 2);
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

/**
 * Thoroughly verifies a puzzle library structure, chess FEN positions, and solution moves.
 * Supports:
 *   - Full library object: { chapters: [ ... ] }
 *   - Puzzles list: { puzzles: [ ... ] }
 *   - Array of puzzles: [ { title, fen, solution, ... }, ... ]
 *   - Array of chapters: [ { name, puzzles: [...] }, ... ]
 *   - Single puzzle: { title, fen, solution, ... }
 */
function verifyPuzzleLibrary(input) {
  const errors = [];
  const warnings = [];
  let parsed = null;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      return { ok: false, library: null, validCount: 0, chapterCount: 0, errors: ['Invalid JSON: ' + e.message], warnings: [] };
    }
  } else if (typeof input === 'object' && input !== null) {
    parsed = input;
  } else {
    return { ok: false, library: null, validCount: 0, chapterCount: 0, errors: ['Input must be a valid JSON object or string'], warnings: [] };
  }

  // Normalize structure into chapters array
  let rawChapters = [];
  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && Array.isArray(parsed[0].puzzles)) {
      rawChapters = parsed;
    } else {
      rawChapters = [{ name: 'Imported Puzzles', expanded: true, puzzles: parsed }];
    }
  } else if (parsed.chapters && Array.isArray(parsed.chapters)) {
    rawChapters = parsed.chapters;
  } else if (parsed.puzzles && Array.isArray(parsed.puzzles)) {
    rawChapters = [{ name: parsed.name || 'Imported Puzzles', expanded: true, puzzles: parsed.puzzles }];
  } else if (parsed.fen || parsed.title) {
    rawChapters = [{ name: 'Imported Puzzles', expanded: true, puzzles: [parsed] }];
  } else {
    return {
      ok: false,
      library: null,
      validCount: 0,
      chapterCount: 0,
      errors: ['Unrecognized puzzle file format. File must contain "chapters" or "puzzles" array.'],
      warnings: []
    };
  }

  const verifiedChapters = [];
  let totalValidPuzzles = 0;
  const seenPuzzleIds = new Set();
  const seenChapterIds = new Set();

  rawChapters.forEach((chap, cIdx) => {
    const chapName = (chap && typeof chap.name === 'string' && chap.name.trim()) ? chap.name.trim() : ('Chapter ' + (cIdx + 1));
    let chapId = (chap && chap.id) ? String(chap.id) : uniqueId('chapter');
    if (seenChapterIds.has(chapId)) chapId = uniqueId('chapter');
    seenChapterIds.add(chapId);

    const rawPuzzles = (chap && Array.isArray(chap.puzzles)) ? chap.puzzles : [];
    const validPuzzles = [];

    rawPuzzles.forEach((puz, pIdx) => {
      if (!puz || typeof puz !== 'object') {
        warnings.push(`Chapter "${chapName}", item #${pIdx + 1} is not a valid puzzle object.`);
        return;
      }
      const puzTitle = (typeof puz.title === 'string' && puz.title.trim()) ? puz.title.trim() : ('Puzzle ' + (pIdx + 1));

      // 1. Verify FEN chess position
      const fen = (typeof puz.fen === 'string') ? puz.fen.trim() : '';
      if (!fen) {
        errors.push(`Puzzle "${puzTitle}": Missing FEN position.`);
        return;
      }

      let tempGame = null;
      let fenValid = false;
      try {
        tempGame = new Chess();
        fenValid = tempGame.load(fen);
      } catch (e) {
        fenValid = false;
      }

      if (!fenValid || !tempGame) {
        errors.push(`Puzzle "${puzTitle}": Invalid chess FEN position ("${fen}").`);
        return;
      }

      // Check both kings exist
      const b = tempGame.board();
      let whiteKing = false, blackKing = false;
      b.forEach(row => (row || []).forEach(sq => {
        if (sq && sq.type === 'k') {
          if (sq.color === 'w') whiteKing = true;
          if (sq.color === 'b') blackKing = true;
        }
      }));

      if (!whiteKing || !blackKing) {
        errors.push(`Puzzle "${puzTitle}": Position is missing a ${!whiteKing ? 'White' : 'Black'} King.`);
        return;
      }

      // 2. Verify Solution moves
      const rawSolution = (typeof puz.solution === 'string') ? puz.solution.trim() : '';
      const moves = (typeof solutionSanList === 'function') ? solutionSanList(rawSolution) : [];
      let verifiedMoves = [];

      if (moves.length > 0) {
        const sim = new Chess(fen);
        for (const mv of moves) {
          let res = null;
          try { res = sim.move(mv); } catch (e) { res = null; }
          if (!res) {
            // Try matching without check/mate suffix
            try {
              const legal = sim.moves({ verbose: true });
              const cleanMv = mv.replace(/[+#]/g, '');
              const match = legal.find(l => l.san.replace(/[+#]/g, '') === cleanMv);
              if (match) res = sim.move(match.san);
            } catch (e) {}
          }
          if (res) {
            verifiedMoves.push(res.san);
          } else {
            warnings.push(`Puzzle "${puzTitle}": Move "${mv}" could not be played from step ${verifiedMoves.length + 1}.`);
            break;
          }
        }
      }

      // 3. Difficulty
      let diff = parseInt(puz.difficulty, 10);
      if (isNaN(diff) || diff < 1 || diff > 5) diff = 3;

      // 4. Unique ID
      let puzId = puz.id ? String(puz.id) : uniqueId('puzzle');
      if (seenPuzzleIds.has(puzId)) puzId = uniqueId('puzzle');
      seenPuzzleIds.add(puzId);

      const verified = {
        id: puzId,
        title: puzTitle,
        description: (typeof puz.description === 'string') ? puz.description : '',
        solution: verifiedMoves.length > 0 ? verifiedMoves.join(', ') : rawSolution,
        difficulty: diff,
        tags: (typeof puz.tags === 'string') ? puz.tags : (Array.isArray(puz.tags) ? puz.tags.join(', ') : ''),
        fen: fen,
        chapterId: chapId,
        createdAt: (typeof puz.createdAt === 'number') ? puz.createdAt : Date.now()
      };

      validPuzzles.push(verified);
      totalValidPuzzles++;
    });

    if (validPuzzles.length > 0 || rawPuzzles.length === 0) {
      verifiedChapters.push({
        id: chapId,
        name: chapName,
        expanded: chap.expanded !== false,
        puzzles: validPuzzles
      });
    }
  });

  const ok = totalValidPuzzles > 0 || (verifiedChapters.length > 0 && errors.length === 0);
  return {
    ok: ok,
    library: {
      chapters: verifiedChapters,
      activeChapterId: verifiedChapters[0]?.id || null,
      activePuzzleId: verifiedChapters[0]?.puzzles[0]?.id || null
    },
    validCount: totalValidPuzzles,
    chapterCount: verifiedChapters.length,
    errors: errors,
    warnings: warnings
  };
}

function importLibrary(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const result = verifyPuzzleLibrary(e.target.result);
      if (!result.ok || result.validCount === 0) {
        const reason = result.errors.length ? result.errors[0] : 'No valid puzzles found in file';
        toast(`Import verification failed: ${reason}`, 'error');
        return;
      }

      const currentLib = getLibrary();
      // Check if existing library has only default sample puzzle
      const isDefaultOnly = currentLib.chapters.length === 1 &&
        currentLib.chapters[0].name === 'My First Chapter' &&
        currentLib.chapters[0].puzzles.length <= 1;

      let mergedChapters = [];
      if (isDefaultOnly) {
        mergedChapters = result.library.chapters;
      } else {
        const existingIds = new Set(currentLib.chapters.map(c => c.id));
        result.library.chapters.forEach(c => {
          if (existingIds.has(c.id)) c.id = uniqueId('chapter');
          mergedChapters.push(c);
        });
        mergedChapters = currentLib.chapters.concat(result.library.chapters);
      }

      const firstNewChap = result.library.chapters[0] || null;
      const firstNewPuz = firstNewChap?.puzzles[0] || null;

      const newLib = {
        chapters: mergedChapters,
        activeChapterId: firstNewChap ? firstNewChap.id : currentLib.activeChapterId,
        activePuzzleId: firstNewPuz ? firstNewPuz.id : currentLib.activePuzzleId
      };

      saveLibrary(newLib);
      renderLibrary($('librarySearch')?.value || '');
      renderChapterSelect();

      if (firstNewPuz) {
        loadPuzzleToEditor(firstNewPuz.id);
        renderAll();
      }

      let toastMsg = `✓ Verified & Imported: ${result.validCount} puzzle(s) in ${result.chapterCount} chapter(s)`;
      if (result.warnings.length) {
        console.warn('Puzzle verification warnings:', result.warnings);
      }
      toast(toastMsg, 'success');
    } catch (err) {
      toast('Invalid library file: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

if (typeof window !== 'undefined') {
  window.verifyPuzzleLibrary = verifyPuzzleLibrary;
}


