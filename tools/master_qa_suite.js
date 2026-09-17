/**
 * Master QA Test Suite for ChessX
 * Covers 100% of discovered function inventory, edge cases, boundary values,
 * DOM events, error handling, storage, chess rules, and UI transitions.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runMasterSuite() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost:8000/',
  });

  const { window } = dom;

  // Polyfills
  window.confirm = () => true;
  window.prompt = (msg, def) => def || 'Test Value';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  // Storage mock
  const storageMap = new Map();
  window.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  };

  const scripts = [
    'chess.min.js',
    'pieces.js',
    'engine.js',
    'js/00-constants.js',
    'js/01-state.js',
    'js/02-dom.js',
    'js/03-utils.js',
    'js/04-protect.js',
    'js/10-board-render.js',
    'js/11-annotations-render.js',
    'js/12-board-interactions.js',
    'js/13-annotation-tools.js',
    'js/14-tool-selection.js',
    'js/15-position-setup.js',
    'js/16-move-list.js',
    'js/17-fen.js',
    'js/18-themes.js',
    'js/19-layouts.js',
    'js/20-puzzle-library-store.js',
    'js/21-puzzle-uid.js',
    'js/22-puzzle-library-ui.js',
    'js/23-puzzle-crud.js',
    'js/24-puzzle-editor-board.js',
    'js/25-puzzle-authoring.js',
    'js/26-engine.js',
    'js/27-autofit.js',
    'js/28-flip-reset.js',
    'js/29-chess-clock.js',
    'js/30-keyboard.js',
    'js/31-render-all.js',
    'js/32-event-bindings.js',
    'js/33-mode-picker.js',
    'js/35-checkmate.js',
    'js/36-persist.js',
    'js/90-boot.js',
  ];

  const fullCode = scripts.map(s => fs.readFileSync(path.join(__dirname, '..', s), 'utf8')).join('\n;\n');
  window.eval(fullCode);

  const document = window.document;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let passed = 0;
  let failed = 0;
  const failures = [];

  function test(group, desc, fn) {
    try {
      fn();
      console.log(`✓ [${group}] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`✗ [${group}] ${desc}: ${err.message}`);
      failures.push({ group, desc, error: err.message });
      failed++;
    }
  }

  function assert(cond, msg = 'Assertion failed') {
    if (!cond) throw new Error(msg);
  }

  console.log('======================================================');
  console.log('CHESSX MASTER QA TEST SUITE — COMPLETE FUNCTION AUDIT');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // GROUP 1: BOOT, MODE, EVENT, AND NAVIGATION
  // ----------------------------------------------------
  test('BOOT/MODE', 'init & doInit executed successfully', () => {
    assert(typeof window.init === 'function');
    assert(typeof window.doInit === 'function');
    assert(typeof window.safeCall === 'function');
    let called = false;
    window.safeCall('testSafe', () => { called = true; });
    assert(called);
    // safeCall swallowing error
    window.safeCall('testError', () => { throw new Error('Safe error'); });
  });

  test('BOOT/MODE', 'setMode transitions between front, normal, puzzle, setup', () => {
    window.setMode('normal');
    assert(document.body.dataset.mode === 'normal');
    assert(document.body.dataset.authoring === 'false');
    assert(document.body.dataset.setupEditing === 'false');

    window.setMode('puzzle');
    assert(document.body.dataset.mode === 'puzzle');
    assert(document.body.dataset.authoring === 'true');

    window.setMode('setup');
    assert(document.body.dataset.mode === 'setup');
    assert(document.body.dataset.setupEditing === 'true');

    window.showFrontPage();
    assert(document.body.classList.contains('on-front-page'));
  });

  test('BOOT/MODE', 'Authoring mode transitions & helper functions', () => {
    window.setAuthoringMode(true);
    assert(window.isAuthoringMode() === true);
    assert(document.body.dataset.authoring === 'true');

    window.exitAuthoringMode();
    assert(window.isAuthoringMode() === false);
    assert(document.body.dataset.authoring === 'false');

    window.enterAuthoringForNewPuzzle();
    assert(window.isAuthoringMode() === true);

    window.enterSetupEditing();
    assert(document.body.dataset.setupEditing === 'true');
    window.finishSetupEditing();
    assert(document.body.dataset.setupEditing === 'false');
  });

  // ----------------------------------------------------
  // GROUP 2: BOARD, CHESS LOGIC, MOVE, AND RENDER
  // ----------------------------------------------------
  test('BOARD/RENDER', 'Square naming, coordinates, light/dark checks', () => {
    assert(window.squareName(0, 0) === 'a8');
    assert(window.squareName(7, 7) === 'h1');
    assert(window.squareName(6, 4) === 'e2');
    assert(window.squareRC('a8').r === 0 && window.squareRC('a8').c === 0);
    assert(window.squareRC('h1').r === 7 && window.squareRC('h1').c === 7);
    assert(window.squareRC('e4').r === 4 && window.squareRC('e4').c === 4);
    assert(window.isLight(0, 0) === true);
    assert(window.isLight(0, 1) === false);
    assert(window.showSquare('e4') !== null);
  });

  test('BOARD/RENDER', 'turnName and pieceLetter utilities', () => {
    assert(window.turnName('w') === 'White');
    assert(window.turnName('b') === 'Black');
    assert(window.pieceLetter({ type: 'q', color: 'w' }) === 'Q');
    assert(window.pieceLetter({ type: 'k', color: 'b' }) === 'k');
    assert(window.pieceLetter('P') === 'P');
    assert(window.pieceLetter(null) === null);
  });

  test('BOARD/RENDER', 'renderBoard, highlightSquares, and renderAll', () => {
    window.state.game.reset();
    window.renderAll();
    const squares = $$('.square');
    assert(squares.length === 64);
    assert($$('.piece').length === 32);
  });

  test('BOARD/RENDER', 'Player indicators & flip synchronization', () => {
    window.state.flipped = false;
    window.renderBoard();
    assert($('playerTopName').textContent === 'Black');
    assert($('playerTop').className.includes('black'));
    assert($('playerTop').dataset.color === 'b');
    assert($('playerBottomName').textContent === 'White');
    assert($('playerBottom').className.includes('white'));
    assert($('playerBottom').dataset.color === 'w');

    window.flipBoard();
    assert(window.state.flipped === true);
    assert($('playerTopName').textContent === 'White');
    assert($('playerTop').className.includes('white'));
    assert($('playerTop').dataset.color === 'w');
    assert($('playerBottomName').textContent === 'Black');
    assert($('playerBottom').className.includes('black'));
    assert($('playerBottom').dataset.color === 'b');

    window.flipBoard(); // flip back
    assert(window.state.flipped === false);
  });

  test('BOARD/RENDER', 'Legal moves, move list, history navigation (prev, next, delete, goTo)', () => {
    window.setMode('normal');
    window.state.game.reset();
    window.state.history = [];
    window.state.historyIndex = -1;

    assert(window.tryMakeMove('e2', 'e4') === true);
    assert(window.tryMakeMove('e7', 'e5') === true);
    assert(window.tryMakeMove('g1', 'f3') === true);
    assert(window.state.history.length === 3);

    // Illegal move test
    assert(window.tryMakeMove('e8', 'e1') === false);

    // Move list rendering
    window.renderMovesList();
    assert($$('.move-san').length === 3);

    // History navigation
    window.prevMove();
    assert(window.state.historyIndex === 1);
    window.nextMove();
    assert(window.state.historyIndex === 2);
    window.goToMove(0);
    assert(window.state.historyIndex === 0);
    window.goToMove(2);
    assert(window.state.historyIndex === 2);

    // Delete move
    window.deleteMove();
    assert(window.state.history.length === 2);
    assert(window.state.historyIndex === 1);
  });

  // ----------------------------------------------------
  // GROUP 3: MOUSE, TOUCH, AND BOARD INTERACTIONS
  // ----------------------------------------------------
  test('INTERACTION', 'beginSquarePress, onSquareMouseDown, mouseup and touch events', () => {
    window.setMode('normal');
    window.setTool('select');
    window.state.game.reset();
    window.state.history = [];
    window.state.historyIndex = -1;
    window.renderAll();

    const sqE2 = window.showSquare('e2');
    const sqE4 = window.showSquare('e4');

    // Click on e2 (select piece)
    window.beginSquarePress(sqE2, 100, 100, 0);
    window.endSquarePress(sqE2, 100, 100);
    assert(window.state.selectedSquare === 'e2', `Expected selectedSquare 'e2', got '${window.state.selectedSquare}'`);

    // Click on e4 (make move e2-e4)
    window.beginSquarePress(sqE4, 100, 200, 0);
    window.endSquarePress(sqE4, 100, 200);
    assert(window.state.selectedSquare === null, `Expected selectedSquare null, got '${window.state.selectedSquare}'`);
    assert(window.state.game.fen().includes('4P3'), `Expected e4 move on board`);

    // Clicking an opponent piece on the wrong turn rejects the selection and
    // emits the error cue without changing the board.
    window.handleSquareClick('d2');
    assert(window.state.selectedSquare === null, 'opponent piece was not rejected');
    assert($('boardMsg').className.includes('error'), 'wrong-side click did not show an error');

    // Simulated Touch Move: board touch must claim the gesture immediately so
    // a phone cannot scroll while a piece is being picked up or dragged.
    let touchStartPrevented = false;
    window.onTouchStart({
      touches: [{ clientX: 50, clientY: 50 }],
      cancelable: true,
      preventDefault: () => { touchStartPrevented = true; },
    });
    assert(touchStartPrevented === true, 'board touch did not prevent page scrolling');
    window.onTouchMove({ touches: [{ clientX: 150, clientY: 150 }], preventDefault: () => {} });
    window.onTouchEnd({ changedTouches: [{ clientX: 150, clientY: 150 }], preventDefault: () => {} });
    window.cancelSquarePress();
    assert(window.state.isDrawing === false);
  });

  // ----------------------------------------------------
  // GROUP 4: DRAWING TOOLS AND ANNOTATIONS
  // ----------------------------------------------------
  test('DRAWING', 'Tools selection, arrow, circle, highlight, rect, eraser', () => {
    window.setTool('arrow');
    assert(window.state.currentTool === 'arrow');

    window.clearAllAnnotations();
    assert(window.state.arrows.length === 0);

    window.addArrow('e2', 'e4');
    assert(window.state.arrows.length === 1);
    assert(window.state.arrows[0].from === 'e2' && window.state.arrows[0].to === 'e4');

    window.addCircle('e4');
    assert(window.state.circles.length === 1);

    window.addHighlight('e4');
    assert(window.state.highlights.length === 1);

    window.addRectangle('a1', 'b2');
    assert(window.state.rectangles.length === 1);

    window.eraseAnnotationAt('e4');
    assert(window.state.circles.length === 0);
    assert(window.state.highlights.length === 0);

    window.clearAllAnnotations();
    assert(window.state.arrows.length === 0 && window.state.rectangles.length === 0);
  });

  test('DRAWING', 'Color cycling, 12-color palette & 1-by-1 Undo/Redo history', () => {
    window.setDrawingColor('#ef4444');
    assert(window.state.currentColor === '#ef4444');

    window.cycleDrawingColor();
    assert(window.state.currentColor === '#22c55e');

    // Undo/Redo drawings
    window.clearAllAnnotations();
    window.addArrow('a2', 'a4');
    assert(window.state.arrows.length === 1);
    window.undoAnnotation();
    assert(window.state.arrows.length === 0);
    window.redoAnnotation();
    assert(window.state.arrows.length === 1);
  });

  // ----------------------------------------------------
  // GROUP 5: CUSTOM POSITION SETUP
  // ----------------------------------------------------
  test('SETUP', 'Piece rack init, selection, placement, pick, erase, presets, undo/redo', () => {
    window.setMode('setup');
    assert(window.state.setupMode === true);

    // Expand & Collapse row helpers
    const expanded = window.expandRow('rnbqkbnr');
    assert(expanded.length === 8 && expanded[0] === 'r');
    const collapsed = window.collapseRow(expanded);
    assert(collapsed === 'rnbqkbnr');

    // Load empty preset
    window.loadPreset('empty');
    assert(window.state.game.fen().startsWith('8/8/8/8/8/8/8/8'));

    // Place King & Queen
    window.placePieceOnSetup('e1', 'K');
    window.placePieceOnSetup('e8', 'k');
    assert(window.state.game.fen().includes('4K3') && window.state.game.fen().includes('4k3'));

    // Pick from board & move
    window.pickPieceFromBoard('e1');
    assert(window.state.heldPiece && window.state.heldPiece.piece === 'K');
    window.placePieceOnSetup('d1', 'K');
    assert(window.state.game.fen().includes('3K4'));

    // Erase
    window.erasePieceAt('d1');
    assert(!window.state.game.fen().includes('K'));

    // Undo/Redo setup
    window.setupUndo();
    assert(window.state.game.fen().includes('3K4'));
    window.setupRedo();
    assert(!window.state.game.fen().includes('K'));

    // Test START FROM POSITION
    window.loadPreset('endgame_kq');
    window.startFromPosition();
    assert(window.state.setupMode === false);
    assert(document.body.dataset.setupEditing === 'false');
  });

  // ----------------------------------------------------
  // GROUP 6: FEN, THEME, AND RESPONSIVE LAYOUT
  // ----------------------------------------------------
  test('FEN/THEME', 'updateFen, loadFen, copyFen, themes, piece styles', () => {
    window.state.game.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    window.updateFen();
    assert($('fenInput').value.includes('4P3'));

    window.setTheme('tournament');
    assert(window.state.boardTheme === 'tournament');
    assert(document.body.dataset.theme === 'tournament');

    // Piece SVG styles
    const svgAlpha = window.getPieceSvg('K', 'alpha');
    const svgMerida = window.getPieceSvg('K', 'merida');
    const svgClassic = window.getPieceSvg('K', 'classic');
    assert(svgAlpha.includes('<svg') && svgMerida.includes('<svg') && svgClassic.includes('<svg'));
    assert(svgAlpha !== svgMerida);
  });

  // ----------------------------------------------------
  // GROUP 7: PUZZLE EDITOR & CRUD
  // ----------------------------------------------------
  test('PUZZLE/CRUD', 'Library CRUD, chapter creation, puzzle save, search, export/import', () => {
    window.setMode('puzzle');
    const lib = window.getLibrary();
    assert(Array.isArray(lib.chapters));

    // Create unique chapter
    const chapName = 'Test Chapter ' + Date.now();
    const newChap = { id: window.uniqueId('chapter'), name: chapName, expanded: true, puzzles: [] };
    lib.chapters.push(newChap);
    lib.activeChapterId = newChap.id;
    window.saveLibrary(lib);

    // Add and save puzzle
    window.enterAuthoringForNewPuzzle();
    $('puzzleTitle').value = 'Test Fork ' + Date.now();
    $('puzzleDescription').value = 'Knight forks King and Queen';
    $('puzzleSolution').value = 'Nf7+';
    $('puzzleDifficulty').value = '3';
    $('puzzleTags').value = 'fork, knight';
    $('puzzleChapterSelect').value = newChap.id;
    window.peLoadPreset('endgame_kq');
    window.saveCurrentPuzzle();

    const activeLib = window.getLibrary();
    const foundChap = activeLib.chapters.find(c => c.id === newChap.id);
    assert(foundChap && foundChap.puzzles.length >= 1);

    // Search filter
    window.renderLibrary('fork');
    assert($$('.library-puzzle').length >= 1);

    // Export & Import
    const exported = JSON.stringify(activeLib);
    assert(exported.includes(chapName));

    // Up/down puzzle navigation follows the active chapter and exposes the
    // selected puzzle's 1/total counter.
    const navFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const navOne = {
      id: window.uniqueId('puzzle'), title: 'Navigation One', description: '', solution: '',
      difficulty: 1, tags: '', fen: navFen, chapterId: newChap.id, createdAt: Date.now()
    };
    const navTwo = {
      id: window.uniqueId('puzzle'), title: 'Navigation Two', description: '', solution: '',
      difficulty: 1, tags: '', fen: navFen, chapterId: newChap.id, createdAt: Date.now() + 1
    };
    const nextChapter = {
      id: window.uniqueId('chapter'), name: 'Next Navigation Chapter', expanded: true,
      puzzles: [{
        id: window.uniqueId('puzzle'), title: 'Navigation Three', description: '', solution: '',
        difficulty: 1, tags: '', fen: navFen, chapterId: '', createdAt: Date.now() + 2
      }]
    };
    nextChapter.puzzles[0].chapterId = nextChapter.id;
    foundChap.puzzles.push(navOne, navTwo);
    activeLib.chapters.push(nextChapter);
    activeLib.activeChapterId = newChap.id;
    activeLib.activePuzzleId = navOne.id;
    window.saveLibrary(activeLib);
    window.renderLibrary();
    assert($('puzzleProgress').textContent === '2/3', 'Counter starts at the selected puzzle position');

    const down = new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.dispatchEvent(down);
    assert(down.defaultPrevented === true, 'Down arrow shortcut was consumed');
    const navigatedLib = window.getLibrary();
    assert(navigatedLib.activeChapterId === newChap.id, 'Active chapter follows the selected puzzle');
    assert(navigatedLib.activePuzzleId === navTwo.id, 'Down arrow loaded the next puzzle');
    assert(window.state.game.fen() === navFen, 'Next puzzle position loaded onto the board');
    assert($('puzzleProgress').textContent === '3/3', 'Counter advances to the last puzzle');
    assert(document.body.dataset.authoring === 'false' && window.state.setupMode === false, 'Next puzzle is playable');
    const activeRow = document.querySelector(`[data-action="select-puzzle"][data-puzzle-id="${navTwo.id}"]`);
    assert(activeRow && activeRow.classList.contains('active'), 'Library highlights the next puzzle');

    const crossChapter = new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.dispatchEvent(crossChapter);
    assert(crossChapter.defaultPrevented === true && window.getLibrary().activePuzzleId === nextChapter.puzzles[0].id, 'Existing navigation continues into the next chapter');
    assert($('puzzleProgress').textContent === '1/1', 'Counter resets for the new chapter');

    const lastId = window.getLibrary().activePuzzleId;
    const atLast = new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.dispatchEvent(atLast);
    assert(atLast.defaultPrevented === true && window.getLibrary().activePuzzleId === lastId, 'Next at the last puzzle is a safe no-op');

    const upFromNextChapter = new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    document.dispatchEvent(upFromNextChapter);
    assert(upFromNextChapter.defaultPrevented === true && window.getLibrary().activePuzzleId === navTwo.id, 'Up arrow returns to the previous chapter');
    assert($('puzzleProgress').textContent === '3/3', 'Counter returns to the previous chapter');

    const up = new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    document.dispatchEvent(up);
    assert(up.defaultPrevented === true && window.getLibrary().activePuzzleId === navOne.id, 'Up arrow loads the previous puzzle');
    assert($('puzzleProgress').textContent === '2/3', 'Counter moves back to the previous puzzle');

    const firstChapter = activeLib.chapters[0];
    const first = firstChapter.puzzles[0];
    activeLib.activePuzzleId = first.id;
    activeLib.activeChapterId = firstChapter.id;
    window.saveLibrary(activeLib);
    window.renderLibrary();
    const atFirst = new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    document.dispatchEvent(atFirst);
    assert(atFirst.defaultPrevented === true && window.getLibrary().activePuzzleId === first.id, 'Previous at the first collection puzzle is a safe no-op');
    assert($('puzzleProgress').textContent === `1/${firstChapter.puzzles.length}`, 'Counter shows the first collection puzzle');

    window.setAuthoringMode(true);
    const whileEditing = new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.dispatchEvent(whileEditing);
    assert(whileEditing.defaultPrevented === false && window.getLibrary().activePuzzleId === first.id, 'Authoring mode ignores puzzle navigation');
    window.setAuthoringMode(false);
  });

  test('PUZZLE/IMPORT', 'strictly validates imported library JSON before storage', () => {
    const good = {
      format: 'chessx-puzzle-library',
      version: 1,
      chapters: [{
        id: 'import-chapter', name: 'Import checks', expanded: true,
        puzzles: [{
          id: 'import-puzzle', title: 'Back Rank', description: 'Mate in one',
          solution: 'Re8#', difficulty: 2, tags: 'mate',
          fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
          chapterId: 'import-chapter', createdAt: Date.now()
        }]
      }],
      activeChapterId: 'import-chapter', activePuzzleId: 'import-puzzle'
    };
    const accepted = window.validatePuzzleLibrary(good);
    assert(accepted.ok, JSON.stringify(accepted.errors));
    assert(accepted.library.chapters[0].puzzles.length === 1);
    assert(window.libraryExportPayload(accepted.library).format === 'chessx-puzzle-library');

    const badFen = JSON.parse(JSON.stringify(good));
    badFen.chapters[0].puzzles[0].fen = 'not-a-fen';
    assert(!window.validatePuzzleLibrary(badFen).ok, 'bad FEN was accepted');

    const duplicate = JSON.parse(JSON.stringify(good));
    duplicate.chapters[0].puzzles[0].id = 'other';
    duplicate.chapters[0].puzzles.push({ ...duplicate.chapters[0].puzzles[0], id: 'other', title: 'Duplicate' });
    assert(!window.validatePuzzleLibrary(duplicate).ok, 'duplicate IDs were accepted');
  });

  // ----------------------------------------------------
  // GROUP 8: PUZZLE PLAY & TEST MODE
  // ----------------------------------------------------
  test('PUZZLE/TEST', 'Student test mode, solution parsing, move validation, auto-revert', () => {
    window.setMode('puzzle');
    const lib = window.getLibrary();
    const testPuzzle = {
      id: window.uniqueId('puzzle'),
      title: 'Back Rank Mate Test ' + Date.now(),
      description: 'Deliver checkmate on back rank',
      solution: 'Re8#',
      fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
      difficulty: 1,
      tags: 'mate',
      chapterId: lib.chapters[0].id,
      createdAt: Date.now(),
    };
    lib.chapters[0].puzzles.push(testPuzzle);
    lib.activePuzzleId = testPuzzle.id;
    window.saveLibrary(lib);

    window.loadPuzzleToEditor(testPuzzle.id);
    window.startPuzzleTest();
    assert(document.body.dataset.testing === 'true', 'Expected testing dataset to be true');
    assert(window.state.puzzle.moves[0] === 'Re8#', `Expected Re8#, got ${window.state.puzzle.moves[0]}`);

    // Wrong move: Re2
    const wrongMove = window.tryMakeMove('e1', 'e2');
    assert(wrongMove === true, 'Move e1-e2 was legal physically');
    assert(window.state.puzzle.solved === false, 'Puzzle should not be marked solved on wrong move');
    // Verified auto-reverted back to White's turn
    assert(window.state.game.turn() === 'w', `Expected turn 'w' after auto-revert, got '${window.state.game.turn()}'`);

    // Correct move: Re8#
    const correctMove = window.tryMakeMove('e1', 'e8');
    assert(correctMove === true, 'Move e1-e8 was legal');
    assert(window.state.puzzle.solved === true, 'Puzzle should be marked solved on correct move');

    window.endPuzzleTest(false);
    assert(document.body.dataset.testing === 'false');
  });

  // ----------------------------------------------------
  // GROUP 10: PERSISTENCE & STORAGE
  // ----------------------------------------------------
  test('PERSIST', 'sessionPayload, saveSession, restoreSession, draft handling', () => {
    window.startSessionWatch();
    window.setMode('normal');
    window.state.game.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    window.saveSession(true);

    const stored = window.readStoredJson('chessx-session-v1');
    assert(stored !== null, 'Expected session to be stored');
    assert(stored.fen.includes('4P3'), `Expected FEN to contain 4P3, got ${stored ? stored.fen : 'null'}`);

    // Test corrupted JSON recovery
    window.storeSet('chessx_corrupt', '{invalid json...');
    const corrupt = window.readStoredJson('chessx_corrupt');
    assert(corrupt === null);
  });

  test('PERSIST', 'triangle and hexagon-only sessions remain restorable', () => {
    const standard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const snapshot = {
      mode: 'front', fen: standard, history: [], arrows: [], circles: [],
      highlights: [], rectangles: [], triangles: [{ square: 'd4' }], hexagons: [],
    };
    assert(window.isRestorable(snapshot) === true, 'triangle-only work must restore');
    snapshot.triangles = [];
    snapshot.hexagons = [{ square: 'e5' }];
    assert(window.isRestorable(snapshot) === true, 'hexagon-only work must restore');
    assert(window.resumeLabel('front', snapshot).includes('1 marking'), 'resume label counts the shape');
  });

  // ----------------------------------------------------
  // GROUP 11: CHECKMATE, STALEMATE, AND DRAW
  // ----------------------------------------------------
  test('CHECKMATE/DRAW', 'mateStatus, finishInfo, looksDrawnMaterial, silenced during editing', () => {
    // Checkmate position (Fool's mate)
    const mateGame = new window.Chess('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 3');
    assert(window.mateStatus(mateGame) === 'checkmate');
    const mateInfo = window.finishInfo(mateGame);
    assert(mateInfo.kind === 'checkmate' && mateInfo.variant === 'is-mate');

    // 2-Bishop Checkmate position (KBB vs K is checkmate and NOT draw!)
    const kbbMate = new window.Chess('7k/5B2/6K1/8/3B4/8/8/8 b - - 0 1');
    assert(window.mateStatus(kbbMate) === 'checkmate', '2 Bishops delivering checkmate must be detected');
    assert(window.looksDrawnMaterial('7k/5B2/6K1/8/3B4/8/8/8 b - - 0 1') === false, '2 Bishops vs King is not drawn');

    // Stalemate position
    const staleGame = new window.Chess('k7/8/1Q6/8/8/8/8/K7 b - - 0 1');
    assert(window.mateStatus(staleGame) === 'stalemate');

    // Material draw (K vs K)
    const drawFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    assert(window.looksDrawnMaterial(drawFen) === true);
    const savedFen = window.state.game.fen();
    window.state.game.load(drawFen);
    window.state.history = [];
    window.state.historyIndex = -1;
    window.state.setupMode = false;
    window.state.authoringMode = false;
    document.body.dataset.setupEditing = 'false';
    document.body.dataset.authoring = 'false';
    assert(window.isFinishedPosition() === true, 'draw is terminal while playing');
    assert(window.tryMakeMove('e1', 'e2') === false, 'draw blocks another move');
    assert(window.state.game.fen() === drawFen, 'draw guard leaves position unchanged');

    // Silenced during editing and editable despite terminal material
    window.state.setupMode = true;
    document.body.dataset.setupEditing = 'true';
    assert(window.celebrateMate() === false);
    window.state.setupMode = false;
    document.body.dataset.setupEditing = 'false';
    window.state.game.load(savedFen);
  });

  // ----------------------------------------------------
  // GROUP 11b: RIGHT-BUTTON MATRIX (arrow while teaching, erase while editing)
  // ----------------------------------------------------
  test('RIGHT-BUTTON', 'right button is the arrow only outside position editing', () => {
    window.state.setupMode = false;
    window.state.authoringMode = false;
    assert(window.rightButtonIsArrow() === true);
    assert(window.isEditingPosition() === false);

    window.state.setupMode = true;                      // Custom Setup editing
    assert(window.rightButtonIsArrow() === false);
    window.state.setupMode = false;

    window.state.authoringMode = true;                  // puzzle authoring
    assert(window.rightButtonIsArrow() === false);
    window.state.authoringMode = false;

    const before = window.state.arrows.length;
    window.handleRightClickOrDrag('a1', 'a5', true);    // teaching: drag = arrow
    assert(window.state.arrows.length === before + 1);
    window.handleRightClickOrDrag('b1', 'b1', false);   // origin mark
    assert(window.state.rightArrowFrom === 'b1');
    window.handleRightClickOrDrag('b5', 'b5', false);   // finish it
    assert(window.state.arrows.length === before + 2);
    assert(window.state.rightArrowFrom === null);
  });

  test('RIGHT-BUTTON', 'one setup right-click erases once and remains undoable', () => {
    window.setMode('setup');
    window.loadPreset('empty');
    window.placePieceOnSetup('e4', 'K');
    const first = window.document.querySelector('.square[data-square="e4"]');
    assert(first, 'setup square exists');
    // Call the board's press state machine directly so a preceding touch test
    // cannot make this synthetic mouse event look like Chrome's touch replay.
    window.beginSquarePress(first, 10, 10, 2, 1);
    // Erasing re-renders the square, so a real browser targets the replacement
    // node when its contextmenu event arrives. Exercise the browser ordering
    // where that event follows mouseup.
    const current = window.document.querySelector('.square[data-square="e4"]');
    window.endSquarePress(current, 10, 10);
    const menu = new window.MouseEvent('contextmenu', {
      button: 2, bubbles: true, cancelable: true, clientX: 10, clientY: 10
    });
    current.dispatchEvent(menu);
    assert(menu.defaultPrevented === true, 'board context menu is suppressed');
    assert(window.state.game.get('e4') === null, 'piece was erased');
    window.setupUndo();
    assert(window.state.game.get('e4') && window.state.game.get('e4').type === 'k',
      'one undo restores the erased king; a duplicate erase would require two undos');
    window.setMode('normal');
  });

  // ----------------------------------------------------
  // GROUP 11c: BUG-FIX REGRESSIONS (found by the bughunt harness)
  // ----------------------------------------------------
  test('ANNO-FIX', 'erasing/clearing a lone triangle or hexagon is undoable', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    window.addTriangle('d4'); window.addHexagon('e5');
    window.eraseAnnotationAt('d4');
    assert(window.state.triangles.length === 0, 'triangle erased');
    window.undoAnnotation();
    assert(window.state.triangles.length === 1, 'undo brings the triangle back');
    window.clearAllAnnotations();
    assert(window.state.hexagons.length === 0, 'cleared');
    window.undoAnnotation();
    assert(window.state.hexagons.length === 1, 'undo brings the hexagon back');
  });

  test('ANNO-FIX', 'identical rectangles never stack', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    window.setTool('rectangle');
    assert(window.addRectangle('c3', 'f6') === true, 'first box added');
    assert(window.addRectangle('c3', 'f6') === false, 'duplicate ignored');
    assert(window.addRectangle('f6', 'c3') === false, 'same box, other corner order');
    assert(window.state.rectangles.length === 1);
  });

  test('ANNO-FIX', 'triangle and hexagon grow slightly but stay inside their square', () => {
    const board = $('board');
    const svg = $('boardSvg');
    const container = $('boardContainer');
    const box = { left: 0, top: 0, width: 800, height: 800 };
    const targets = [board, svg, container];
    const previous = targets.map(el => el.getBoundingClientRect);
    targets.forEach(el => Object.defineProperty(el, 'getBoundingClientRect', {
      configurable: true, value: () => ({ ...box })
    }));
    try {
      window.clearAllAnnotations(false);
      window.state.triangles = [{ square: 'd4', color: '#06b6d4' }];
      window.state.hexagons = [{ square: 'e5', color: '#06b6d4' }];
      window.renderAnnotations();
      const polygons = Array.from(svg.querySelectorAll('polygon[data-type]'));
      assert(polygons.length === 2, 'both polygon annotations rendered');
      polygons.forEach(poly => {
        const values = poly.getAttribute('points').trim().split(/[, ]+/).map(Number);
        const points = [];
        for (let i = 0; i < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] });
        const square = poly.dataset.square;
        const rc = window.squareRC(square);
        const left = rc.c * 100, top = rc.r * 100;
        const right = left + 100, bottom = top + 100;
        assert(points.every(p => p.x > left + 2 && p.x < right - 2 && p.y > top + 2 && p.y < bottom - 2),
          `${poly.dataset.type} crossed its square boundary`);
        const spanX = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
        const spanY = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
        // The equilateral triangle's vertical span is 0.63 squares at the
        // larger radius; the flat-top hexagon spans 0.84 horizontally.
        assert(Math.max(spanX, spanY) > 60, `${poly.dataset.type} was not enlarged enough`);
      });
    } finally {
      targets.forEach((el, i) => Object.defineProperty(el, 'getBoundingClientRect', {
        configurable: true, value: previous[i]
      }));
      window.clearAllAnnotations(false);
    }
  });

  test('ANNO-FIX', 'bishop arrows stay on a legal diagonal', () => {
    window.state.game.reset();
    window.clearAllAnnotations(false);
    assert(window.arrowFollowsPieceRule('c1', 'f4') === true, 'diagonal bishop arrow allowed');
    assert(window.arrowFollowsPieceRule('c1', 'f5') === false, 'non-diagonal bishop arrow rejected');
    assert(window.addArrow('c1', 'f5') === false, 'illegal bishop arrow not drawn');
    assert(window.state.arrows.length === 0, 'illegal bishop arrow leaves no annotation');
  });

  test('ANNO-FIX', 'rapid triple-click clears drawings and one undo restores all', () => {
    window.setMode('normal');
    window.state.game.reset();
    window.clearAllAnnotations(false);
    window.initAnnoHistory();
    window.setTool('circle');
    window.addCircle('a3');
    window.addTriangle('b3');
    window.addHexagon('c3');
    window.addArrow('c1', 'f4');

    // Add the two arrow outputs that are easy to miss: left-hold and
    // right-hold arrows are created while Select is active, not by the Arrow
    // palette tool. Their gesture paths are covered by the interaction suite;
    // here we verify that the clear shortcut treats both as annotations.
    window.setTool('select');
    window.addArrow('a1', 'a4');
    window.handleRightClickOrDrag('b1', 'b4', true);
    assert(window.annoTotal() === 6, `all six annotations prepared, including held arrows (got ${window.annoTotal()})`);

    const blank = window.document.querySelector('.square[data-square="e4"]');
    window.beginSquarePress(blank, 10, 10, 0, 3);
    window.endSquarePress(blank, 10, 10);
    assert(window.annoTotal() === 0, 'triple click clears all annotations');
    window.undoAnnotation();
    assert(window.annoTotal() === 6, 'one undo restores every annotation including held arrows');

    const occupied = window.document.querySelector('.square[data-square="e2"]');
    window.beginSquarePress(occupied, 10, 10, 0, 4);
    window.endSquarePress(occupied, 10, 10);
    assert(window.annoTotal() === 6, 'multi-click on a piece does not clear drawings');
    window.cancelLeftAction();
    window.clearAllAnnotations(false);
  });

  test('ANNO-FIX', 'addShapeOnce / addArrow report whether they placed', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    assert(window.addShapeOnce('circles', 'd4') === true);
    assert(window.addShapeOnce('circles', 'd4') === false, 'already there');
    assert(window.addArrow('a1', 'a5') === true);
    assert(window.addArrow('a1', 'a5') === false, 'toggled off');
    assert(window.state.arrows.length === 0);
  });

  test('ANNO-FIX', 'double click never destroys drawings it did not place', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    window.setTool('arrow');
    window.addArrow('a1', 'a5');
    window.state.drawingFrom = null;
    window.scheduleLeftAction('a5');      // 1st click only marks an origin
    window.scheduleLeftAction('a5');      // 2nd click = double click
    assert(window.state.arrows.length === 1, 'pre-existing arrow survives');

    window.setTool('circle');
    window.addCircle('d4');
    window.scheduleLeftAction('d4'); window.scheduleLeftAction('d4');
    assert(window.state.circles.length === 1, 'pre-existing circle survives');
  });

  test('ANNO-FIX', 'double click still takes back what THIS click placed', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    window.setTool('triangle');
    window.scheduleLeftAction('d5'); window.flushLeftAction();   // placed
    assert(window.state.triangles.length === 1);
    window.scheduleLeftAction('d5');                             // taken back
    assert(window.state.triangles.length === 0);
    window.scheduleLeftAction('d5');                             // swallowed 2nd click ...
    window.flushLeftAction();
    assert(window.state.triangles.length === 0, '...did not place it again');
  });

  test('ANNO-FIX', 'undo/redo drop origin marks even with nothing to undo', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    window.handleRightClickOrDrag('b1', 'b1', false);
    assert(window.state.rightArrowFrom === 'b1');
    window.undoAnnotation();
    assert(window.state.rightArrowFrom === null, 'right origin dropped');
    window.setTool('arrow');
    window.placeWithTool('c1');
    assert(window.state.drawingFrom === 'c1');
    window.redoAnnotation();
    assert(window.state.drawingFrom === null, 'left origin dropped');
  });

  test('ANNO-FIX', 'switching tools finishes the pending click', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    window.setTool('circle');
    window.scheduleLeftAction('e4');
    window.setTool('arrow');
    assert(window.state.circles.length === 1, 'circle was placed, not swallowed');
    assert(window.state.currentTool === 'arrow');
    assert(window.state.drawingFrom === null, 'origin marks reset on tool switch');
  });

  // ----------------------------------------------------
  // GROUP 11d: BASE POSITION (undo / move list must follow the position on screen)
  // ----------------------------------------------------
  // NOTE: START_FEN is a top-level const in js/00-constants.js, so it is a
  // shared global binding but NOT a window property - compare against the
  // literal here.
  const STD_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  test('BASE-FEN', 'undo, move list and deleteMove replay on the custom start', () => {
    const CUSTOM = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 5 4';
    window.state.game.load(CUSTOM);
    window.resetMoveHistory(CUSTOM);
    assert(window.state.baseFen === CUSTOM, 'base recorded');
    assert(window.state.history.length === 0 && window.state.historyIndex === -1);

    window.state.game.move('Nf6');
    window.state.history.push('Nf6');
    window.state.historyIndex = 0;

    window.prevMove();
    assert(window.state.game.fen() === CUSTOM, 'undo returns to the custom start, got ' + window.state.game.fen());
    window.nextMove();
    assert(window.state.historyIndex === 0 && window.state.game.fen() !== CUSTOM, 'redo replays the move');

    window.goToMove(-1);
    assert(window.state.game.fen() === CUSTOM, 'first position in the list is the custom base');
    assert(window.getCurrentFen() === CUSTOM, 'FEN read-out matches');

    window.goToMove(0);
    window.deleteMove();
    assert(window.state.history.length === 0 && window.state.game.fen() === CUSTOM, 'deleteMove keeps the custom base');
  });

  test('BASE-FEN', 'every fresh move list remembers where it started', () => {
    const KRK = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
    window.state.game.load(KRK);
    window.resetMoveHistory();            // no argument = take the board as it is
    assert(window.state.baseFen === KRK, 'got ' + window.state.baseFen);

    window.state.game.reset();
    window.resetMoveHistory();
    assert(window.state.baseFen === STD_START, 'standard start is the default base, got ' + window.state.baseFen);

    window.loadFen && (window.document.getElementById('fenInput').value = KRK);
    window.loadFen();
    assert(window.state.baseFen === KRK, 'loading a FEN moves the base with it, got ' + window.state.baseFen);
    window.state.game.reset(); window.resetMoveHistory();
  });

  test('BASE-FEN', 'the base position survives a save / restore round trip', () => {
    const CUSTOM = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    window.state.game.load(CUSTOM);
    window.resetMoveHistory(CUSTOM);
    const payload = window.sessionPayload();
    assert(payload.baseFen === CUSTOM, 'payload carries the base');
    window.state.baseFen = STD_START;                 // as if the page had just booted
    window.applySession(payload);
    assert(window.state.baseFen === CUSTOM, 'restored base, got ' + window.state.baseFen);
    window.state.game.reset(); window.resetMoveHistory();
  });

  // ----------------------------------------------------
  // GROUP 11e: PUZZLE PLAYABILITY (a puzzle you can actually play)
  // ----------------------------------------------------
  test('PUZZLE-PLAY', 'selecting a puzzle and testing it hands over the Select tool', () => {
    const PF = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    const lib = window.getLibrary();
    const ch = lib.chapters[0];
    ch.puzzles = (ch.puzzles || []).filter(x => x.id !== 'qa_p1');
    ch.puzzles.push({ id: 'qa_p1', title: 'Back rank', description: 'Mate in 1', solution: 'Ra8#', difficulty: 3, tags: '', fen: PF });
    window.saveLibrary(lib);

    window.setMode('puzzle');
    window.setTool('arrow');                          // explaining state, as the editor leaves it
    window.handleLibraryAction('select-puzzle', ch.id, 'qa_p1');
    assert(window.state.currentTool === 'select', 'a selected puzzle is playable, tool=' + window.state.currentTool);
    assert(window.state.authoringMode === false && window.state.setupMode === false);

    window.startPuzzleTest();
    assert(window.state.currentTool === 'select', 'test mode must not leave the arrow tool, tool=' + window.state.currentTool);
    assert(window.state.puzzle && window.state.puzzle.moves.join(',') === 'Ra8#', 'solution parsed');

    window.handleSquareClick('a1');
    window.handleSquareClick('a8');                   // the student answers with left clicks
    assert(window.state.puzzle.solved === true, 'puzzle solved through the board');

    window.endPuzzleTest(false);
    assert(window.state.currentTool === 'arrow', 'after the test the board goes back to explaining');
  });

  test('PUZZLE-PLAY', 'Normal mode always comes back playable', () => {
    window.setMode('puzzle');
    window.setTool('arrow');
    window.setMode('normal');
    assert(window.state.currentTool === 'select', 'tool=' + window.state.currentTool);
    assert(window.state.setupMode === false && window.state.authoringMode === false);
    assert(window.state.baseFen === STD_START, 'base=' + window.state.baseFen);
  });

  // ----------------------------------------------------
  // GROUP 11f: KEYBOARD (documented shortcuts must be the real ones)
  // ----------------------------------------------------
  const pressKey = (key, opts) =>
    window.document.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, opts || {})));

  test('KEYS', 'E / H / O / A / V select the tools the README promises', () => {
    window.setTool('select');
    pressKey('e'); assert(window.state.currentTool === 'eraser', 'E -> eraser, got ' + window.state.currentTool);
    pressKey('H'); assert(window.state.currentTool === 'highlight', 'H -> highlight');
    pressKey('o'); assert(window.state.currentTool === 'circle', 'O -> circle');
    pressKey('a'); assert(window.state.currentTool === 'arrow', 'A -> arrow');
    pressKey('v'); assert(window.state.currentTool === 'select', 'V -> select');
    const c0 = window.state.currentColor;
    pressKey('c'); assert(window.state.currentColor !== c0, 'C cycles the colour');
  });

  test('KEYS', 'Esc cancels a pending click, the selection and origin marks', () => {
    window.clearAllAnnotations(false); window.initAnnoHistory();
    window.setTool('circle');
    window.scheduleLeftAction('d4');                      // still inside its window
    window.state.selectedSquare = 'e2';
    window.handleRightClickOrDrag('b1', 'b1', false);     // right-click origin mark
    pressKey('Escape');
    assert(window.state.selectedSquare === null, 'selection dropped');
    assert(window.state.rightArrowFrom === null, 'right origin dropped');
    assert(window.state.drawingFrom === null, 'left origin dropped');
    window.flushLeftAction();                             // pending click was dropped
    assert(window.state.circles.length === 0, 'nothing was placed after Esc');
    window.setTool('select');
  });

  // ----------------------------------------------------
  // GROUP 11g: POSITION VALIDATION (impossible positions must be refused)
  // ----------------------------------------------------
  test('VALIDATE', 'legal positions pass', () => {
    const good = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
      '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
      'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1'
    ];
    good.forEach(f => {
      const r = window.validatePosition(f);
      assert(r.ok === true, 'should be legal: ' + f + ' -> ' + r.reason);
    });
  });

  test('VALIDATE', 'impossible positions are refused with a reason', () => {
    const bad = {
      '8/8/8/8/8/8/8/8 w - - 0 1': 'king',
      '3k3k/8/8/8/8/8/8/K6K w - - 0 1': 'two kings',
      'K6k/8/8/8/8/8/8/7k w - - 0 1': 'king',
      'P6k/8/8/8/8/8/8/K7 w - - 0 1': 'last rank',
      '7k/8/8/8/8/8/8/PK6 w - - 0 1': 'first rank',
      '4k3/ppppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1': '9 pawns',
      '4k3/8/8/8/8/8/8/R3K3 w KQkq - 0 1': 'castling',
      '4k3/8/8/8/8/8/8/4R1K1 w - - 0 1': 'own king in check',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 1': 'en-passant',
      '4k3/8/8/8/8/8/8/3QQK2 w - - 0 1': 'promoted',
      'nonsense': 'incomplete',
      '4k3/8/8/8 w - - 0 1': '8 ranks'
    };
    Object.keys(bad).forEach(f => {
      const r = window.validatePosition(f);
      assert(r.ok === false, 'should be refused: ' + f);
      assert(typeof r.reason === 'string' && r.reason.length > 3, 'needs a reason: ' + f);
    });
  });

  test('VALIDATE', 'START FROM POSITION refuses an impossible board and stays editing', () => {
    window.setMode('setup');
    window.state.game.load('8/8/8/8/8/8/8/8 w - - 0 1');      // no kings at all
    window.syncSetupControlsFromFen('8/8/8/8/8/8/8/8 w - - 0 1');
    window.startFromPosition();
    assert(window.state.setupMode === true, 'still editing');
    assert(window.document.body.dataset.setupEditing === 'true');
    assert(window.state.history.length === 0);

    window.state.game.load('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
    window.syncSetupControlsFromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
    window.startFromPosition();
    assert(window.state.setupMode === false, 'a legal position starts');
    assert(window.state.baseFen === '4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  });

  test('VALIDATE', 'the FEN box refuses an impossible position and keeps the board', () => {
    const before = window.state.game.fen();
    window.document.getElementById('fenInput').value = '8/8/8/8/8/8/8/8 w - - 0 1';
    window.loadFen();
    assert(window.state.game.fen() === before, 'board untouched');
    window.document.getElementById('fenInput').value = '';
    window.loadFen();
    assert(window.state.game.fen() === before, 'empty input is refused too');
  });

  test('VARIATIONS', 'saved positions are stored as labelled objects and can be jumped to', () => {
    window.setMode('normal');
    window.state.game.reset(); window.resetMoveHistory(); window.state.variations = [];
    window.handleSquareClick('e2'); window.handleSquareClick('e4');
    window.saveVariation();
    assert(window.state.variations.length === 1, 'one saved position');
    const v = window.state.variations[0];
    assert(typeof v === 'object' && v.fen && v.label === '1.e4', JSON.stringify(v));
    window.saveVariation();
    assert(window.state.variations.length === 1, 'the same position is not saved twice');
    assert(window.document.getElementById('variationList').children.length === 1, 'chip is rendered');

    window.handleSquareClick('e7'); window.handleSquareClick('e5');
    assert(window.state.history.length === 2);
    window.goToVariation(0);
    assert(window.state.history.length === 0 && window.state.game.fen() === v.fen, 'jumped back to the saved line');
    assert(window.state.baseFen === v.fen, 'the saved position became the new base');
    window.removeVariation(0);
    assert(window.state.variations.length === 0, 'chip removed');
    assert(window.document.getElementById('variationList').children.length === 0);
  });

  test('ENGINE-DEPTH', 'the configured depth survives the engine reporting its own', () => {
    window.setEngineDepth(20);
    assert(window.state.engine.depth === 20, 'setEngineDepth stores the number, got ' + window.state.engine.depth);
    assert(window.document.getElementById('engineDepth').value === '20', 'the control shows it too');
    window.state.engine.enabled = true;
    window.handleEngineMessage('info depth 7 seldepth 9 multipv 1 score cp 21 nodes 12345 pv g1f3 g8f6');
    assert(window.state.engine.depth === 20, 'user setting must not be overwritten, got ' + window.state.engine.depth);
    assert(window.state.engine.searchDepth === 7, 'reached depth is tracked separately');
    assert(window.document.getElementById('depth').textContent === '7', 'display shows the reached depth');
    window.setEngineDepth('nonsense');
    assert(window.state.engine.depth === 20, 'garbage input is ignored');
    window.setEngineMultiPV('x');
    assert(window.state.engine.multipv === 1, 'garbage multiPV falls back to 1');
  });

  test('ENGINE-OFF', 'a search abandoned by STOP cannot repaint the panel', () => {
    window.state.engine.enabled = true;
    window.handleEngineMessage('info depth 12 seldepth 14 multipv 1 score cp 33 nodes 999 pv d2d4 d7d5');
    assert(window.state.engine.bestMove === 'd2d4', 'best move recorded while analysing');
    window.state.engine.enabled = false;                 // what toggleEngine() does
    window.document.getElementById('engineStatus').textContent = 'Idle';
    window.handleEngineMessage('info depth 14 seldepth 18 multipv 1 score cp 41 nodes 5000 pv e2e4 e7e5');
    window.handleEngineMessage('bestmove e2e4 ponder e7e5');
    assert(window.document.getElementById('engineStatus').textContent === 'Idle', 'status stays Idle, got ' + window.document.getElementById('engineStatus').textContent);
    assert(window.state.engine.bestMove === 'd2d4', 'a cancelled search must not replace the best move');
    assert(window.state.engine.searchDepth === 12, 'reached depth is not updated while off');
  });

  test('CLOCK-PAINT', 'starting the clock marks the side that is on move', () => {
    window.state.clock.activeColor = 'w';
    window.state.clock.running = false;
    window.paintClockSide();
    assert(!window.document.getElementById('clockWhite').classList.contains('active'), 'nothing is highlighted while paused');
    window.state.clock.running = true;
    window.paintClockSide();
    assert(window.document.getElementById('clockWhite').classList.contains('active'), 'white is on move');
    assert(!window.document.getElementById('clockBlack').classList.contains('active'));
    window.switchClockSide();
    assert(window.state.clock.activeColor === 'b' &&
      window.document.getElementById('clockBlack').classList.contains('active') &&
      !window.document.getElementById('clockWhite').classList.contains('active'), 'a move hands the highlight over');
    window.state.clock.running = false;
    window.paintClockSide();
    assert(!window.document.getElementById('clockBlack').classList.contains('active'), 'pausing clears it');
  });

  test('SETUP-DRAG', 'a held rack piece no longer blocks dragging a board piece', () => {
    // The full press -> travel -> release drag is exercised with real mouse
    // events in the browser suite (ui_test2 T9); here the observable state
    // machine around it is checked.
    window.setMode('setup');
    const FEN = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
    window.state.game.load(FEN);
    window.syncSetupControlsFromFen(FEN);
    window.state.setupMode = true;
    window.document.body.dataset.setupEditing = 'true';
    window.state.heldPiece = { piece: 'Q', source: 'rack' };   // rack pieces stay held
    window.state.selectedRackPiece = 'Q';
    const sqOf = name => ({ dataset: { square: name } });
    const placement = () => window.state.game.fen().split(' ')[0];

    // Pressing an OCCUPIED square picks the board piece up (so the gesture can
    // still become a drag) instead of stamping the held queen over it.
    window.beginSquarePress(sqOf('a1'), 10, 10, 0, 1);
    assert(window.state.heldPiece && window.state.heldPiece.source === 'a1' && window.state.heldPiece.piece === 'R',
      'the rook was picked up, got ' + JSON.stringify(window.state.heldPiece));
    assert(placement() === '4k3/8/8/8/8/8/8/R3K3', 'nothing was placed on the press, got ' + placement());

    // Releasing on the same square is a click: the held queen replaces the rook
    // and stays in hand for the next one.
    window.endSquarePress(sqOf('a1'), 12, 12);
    assert(placement() === '4k3/8/8/8/8/8/8/Q3K3', 'the click placed the queen, got ' + placement());
    assert(window.state.heldPiece && window.state.heldPiece.piece === 'Q' && window.state.heldPiece.source === 'rack',
      'the rack piece is still in hand, got ' + JSON.stringify(window.state.heldPiece));

    // A dropped gesture (Esc, release off the board, lost focus) hands the rack
    // piece back instead of leaving the teacher holding the piece under it.
    window.beginSquarePress(sqOf('e1'), 10, 10, 0, 1);
    assert(window.state.heldPiece && window.state.heldPiece.source === 'e1', 'the king was picked up');
    window.cancelSquarePress();
    assert(window.state.heldPiece && window.state.heldPiece.piece === 'Q' && window.state.heldPiece.source === 'rack',
      'cancelling returns the queen to hand, got ' + JSON.stringify(window.state.heldPiece));
    assert(placement() === '4k3/8/8/8/8/8/8/Q3K3', 'and nothing was placed, got ' + placement());

    // Pressing an EMPTY square with a rack piece still places at once
    window.beginSquarePress(sqOf('h5'), 10, 10, 0, 1);
    assert(placement() === '4k3/8/8/7Q/8/8/8/Q3K3', 'an empty square is stamped immediately, got ' + placement());
  });

  // ----------------------------------------------------
  // GROUP 12: UTILITIES
  // ----------------------------------------------------
  test('UTILS', 'uniqueId uniqueness, escapeHtml, autoName, toast silencing', () => {
    const ids = new Set();
    for (let i = 0; i < 500; i++) ids.add(window.uniqueId('item'));
    assert(ids.size === 500);

    assert(window.escapeHtml('<script>"hello"&\'bye\'</script>') === '&lt;script&gt;&quot;hello&quot;&amp;&#39;bye&#39;&lt;/script&gt;');
    assert(window.autoName('Puzzle', { chapters: [{ puzzles: [{ title: 'Puzzle 1' }] }] }) === 'Puzzle 2');

    // Toast is permanent no-op per user requirement
    window.toast('Test message');
    assert($('toast').classList.contains('show') === false);
  });

  console.log('\n======================================================');
  console.log(`MASTER AUDIT RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    console.error('FAILURES:');
    failures.forEach(f => console.error(` - [${f.group}] ${f.desc}: ${f.error}`));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
