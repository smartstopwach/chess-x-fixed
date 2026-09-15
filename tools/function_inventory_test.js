/**
 * Direct Function-by-Function Inventory Unit Test Suite
 * Calls each function directly with valid, boundary, and invalid inputs.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testInventory() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8000/' });
  const { window } = dom;

  window.confirm = () => true;
  window.prompt = () => 'Test Val';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  window.navigator.clipboard = { writeText: () => Promise.resolve() };
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};

  const scripts = [
    'chess.min.js', 'pieces.js', 'engine.js', 'js/00-constants.js', 'js/01-state.js',
    'js/02-dom.js', 'js/03-utils.js', 'js/10-board-render.js', 'js/11-annotations-render.js',
    'js/12-board-interactions.js', 'js/13-annotation-tools.js', 'js/14-tool-selection.js',
    'js/15-position-setup.js', 'js/16-move-list.js', 'js/17-fen.js', 'js/18-themes.js',
    'js/19-layouts.js', 'js/20-puzzle-library-store.js', 'js/21-puzzle-uid.js',
    'js/22-puzzle-library-ui.js', 'js/23-puzzle-crud.js', 'js/24-puzzle-editor-board.js',
    'js/25-puzzle-authoring.js', 'js/26-engine.js', 'js/27-autofit.js', 'js/28-flip-reset.js',
    'js/29-chess-clock.js', 'js/30-keyboard.js', 'js/31-render-all.js', 'js/32-event-bindings.js',
    'js/33-mode-picker.js', 'js/35-checkmate.js', 'js/36-persist.js', 'js/90-boot.js',
  ];

  const fullCode = scripts.map(s => fs.readFileSync(path.join(__dirname, '..', s), 'utf8')).join('\n;\n');
  window.eval(fullCode);

  let passed = 0;
  let failed = 0;

  function check(name, fn) {
    try {
      fn();
      passed++;
      console.log(`✓ [FUNC] ${name}`);
    } catch (e) {
      failed++;
      console.error(`✗ [FUNC] ${name}: ${e.message}`);
    }
  }

  console.log('=== DIRECT FUNCTION INVENTORY TESTING ===\n');

  // BOOT, MODE, EVENT
  check('init', () => { window.init(); });
  check('doInit', () => { window.doInit(); });
  check('safeCall', () => { window.safeCall('test', () => {}); });
  check('bindEvents', () => { window.bindEvents(); });
  check('setMode', () => { window.setMode('normal'); window.setMode('puzzle'); window.setMode('setup'); window.setMode('front'); });
  check('showFrontPage', () => { window.showFrontPage(); });
  check('setAuthoringMode', () => { window.setAuthoringMode(true); window.setAuthoringMode(false); });
  check('isAuthoringMode', () => { window.isAuthoringMode(); });
  check('enterAuthoringForNewPuzzle', () => { window.enterAuthoringForNewPuzzle(); });
  check('exitAuthoringMode', () => { window.exitAuthoringMode(); });
  check('enterSetupEditing', () => { window.enterSetupEditing(); });
  check('finishSetupEditing', () => { window.finishSetupEditing(); });

  // BOARD, MOVE, RENDER
  check('createGame', () => { const g = window.createGame(); if (!g) throw new Error(); });
  check('renderBoard', () => { window.renderBoard(); });
  check('renderAll', () => { window.renderAll(); });
  check('renderAnnotations', () => { window.renderAnnotations(); });
  check('highlightSquares', () => { window.highlightSquares(); });
  check('showSquare', () => { window.showSquare('e4'); });
  check('squareName', () => { if (window.squareName(0, 0) !== 'a8') throw new Error(); });
  check('squareRC', () => { const rc = window.squareRC('a8'); if (rc.r !== 0 || rc.c !== 0) throw new Error(); });
  check('isLight', () => { if (window.isLight(0, 0) !== true) throw new Error(); });
  check('handleSquareClick', () => { window.handleSquareClick('e2'); });
  check('tryMakeMove', () => { window.tryMakeMove('e2', 'e4'); });
  check('rejectMove', () => { window.rejectMove('e2', 'e5', null); });
  check('turnName', () => { if (window.turnName('w') !== 'White') throw new Error(); });
  check('pieceLetter', () => { if (window.pieceLetter({ type: 'p', color: 'w' }) !== 'P') throw new Error(); });
  check('getCurrentFen', () => { if (!window.getCurrentFen()) throw new Error(); });
  check('getFenAtMove', () => { window.getFenAtMove(-1); });
  check('formatMove', () => { if (!window.formatMove) throw new Error(); });
  check('goToMove', () => { window.goToMove(-1); });
  check('prevMove', () => { window.prevMove(); });
  check('nextMove', () => { window.nextMove(); });
  check('deleteMove', () => { window.deleteMove(); });
  check('renderMovesList', () => { window.renderMovesList(); });
  check('renderPlayerInfo', () => { window.renderPlayerInfo(); });

  // MOUSE, TOUCH, INTERACTION
  check('beginSquarePress', () => { window.beginSquarePress(null, 0, 0, 0); });
  check('endSquarePress', () => { window.endSquarePress(null, 0, 0); });
  check('cancelSquarePress', () => { window.cancelSquarePress(); });
  check('onSquareMouseDown', () => { window.onSquareMouseDown({ target: window.document.body, clientX: 0, clientY: 0, button: 0, cancelable: true, preventDefault: () => {} }); });
  check('onSquareMouseMove', () => { window.onSquareMouseMove({ clientX: 0, clientY: 0 }); });
  check('onSquareMouseUp', () => { window.onSquareMouseUp({ target: window.document.body, clientX: 0, clientY: 0 }); });
  check('onTouchStart', () => { window.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] }); });
  check('onTouchMove', () => { window.onTouchMove({ touches: [{ clientX: 0, clientY: 0 }] }); });
  check('onTouchEnd', () => { window.onTouchEnd({ changedTouches: [{ clientX: 0, clientY: 0 }] }); });
  check('handleRightClickOrDrag', () => { window.handleRightClickOrDrag('e2', 'e4', false); });

  // DRAWING
  check('addArrow', () => { window.addArrow('e2', 'e4'); });
  check('addCircle', () => { window.addCircle('e4'); });
  check('addHighlight', () => { window.addHighlight('e4'); });
  check('addRectangle', () => { window.addRectangle('e2', 'e4'); });
  check('eraseAnnotationAt', () => { window.eraseAnnotationAt('e4'); });
  check('clearAllAnnotations', () => { window.clearAllAnnotations(); });
  check('setTool', () => { window.setTool('arrow'); window.setTool('circle'); window.setTool('select'); });
  check('cycleDrawingColor', () => { window.cycleDrawingColor(); });
  check('setDrawingColor', () => { window.setDrawingColor('#ffaa00'); });
  check('initAnnoHistory', () => { window.initAnnoHistory(); });
  check('pushAnnoHistory', () => { window.pushAnnoHistory(); });
  check('undoAnnotation', () => { window.undoAnnotation(); });
  check('redoAnnotation', () => { window.redoAnnotation(); });
  check('updateAnnoButtons', () => { window.updateAnnoButtons(); });
  check('arrowIsKnightMove', () => { window.arrowIsKnightMove(0, 0, 1, 2); });
  check('sqPos', () => { window.sqPos('e4'); });
  check('sqTopLeft', () => { window.sqTopLeft('e4'); });
  check('svgEl', () => { window.svgEl('line', {}); });

  // CUSTOM SETUP
  check('initPieceRack', () => { window.initPieceRack(); });
  check('selectRackPiece', () => { window.selectRackPiece('K'); });
  check('pickPieceFromBoard', () => { window.pickPieceFromBoard('e1'); });
  check('getPieceAt', () => { window.getPieceAt('e1'); });
  check('pieceName', () => { if (window.pieceName('K') !== 'White King') throw new Error(); });
  check('placePieceOnSetup', () => { window.placePieceOnSetup('e1', 'K'); });
  check('erasePieceAt', () => { window.erasePieceAt('e1'); });
  check('highlightDropSquares', () => { window.highlightDropSquares(); });
  check('updatePieceCount', () => { window.updatePieceCount(); });
  check('updateSetupHint', () => { window.updateSetupHint(); });
  check('expandRow', () => { if (window.expandRow('8').length !== 8) throw new Error(); });
  check('collapseRow', () => { if (window.collapseRow(Array(8).fill(null)) !== '8') throw new Error(); });
  check('pushSetupHistory', () => { window.pushSetupHistory(); });
  check('setupUndo', () => { window.setupUndo(); });
  check('setupRedo', () => { window.setupRedo(); });
  check('loadPreset', () => { window.loadPreset('standard'); window.loadPreset('empty'); });
  check('clearBoard', () => { window.clearBoard(); });
  check('syncSetupControlsFromFen', () => { window.syncSetupControlsFromFen('8/8/8/8/8/8/8/8 w - - 0 1'); });
  check('startFromPosition', () => { window.startFromPosition(); });

  // FEN, THEME, LAYOUT
  check('updateFen', () => { window.updateFen(); });
  check('copyFen', () => { window.copyFen(); });
  check('loadFen', () => { window.loadFen(); });
  check('loadFENToBoard', () => { window.loadFENToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); });
  check('flipBoard', () => { window.flipBoard(); window.flipBoard(); });
  check('resetBoard', () => { window.resetBoard(); });
  check('setTheme', () => { window.setTheme('classic'); });
  check('getPieceSvg', () => { window.getPieceSvg('K', 'alpha'); });
  check('autoFitBoard', () => { window.autoFitBoard(); });

  // PUZZLE EDITOR & CRUD
  check('puzzleGame', () => { if (!window.puzzleGame()) throw new Error(); });
  check('initPEPieceRack', () => { window.initPEPieceRack(); });
  check('peSetupPushHistory', () => { window.peSetupPushHistory(); });
  check('peSetupUndo', () => { window.peSetupUndo(); });
  check('peSetupRedo', () => { window.peSetupRedo(); });
  check('peLoadPreset', () => { window.peLoadPreset('standard'); });
  check('peClearBoard', () => { window.peClearBoard(); });
  check('pePlacePiece', () => { window.pePlacePiece('e1', 'K'); });
  check('peErasePiece', () => { window.peErasePiece('e1'); });
  check('peGetPieceAt', () => { window.peGetPieceAt('e1'); });
  check('pePickFromBoard', () => { window.pePickFromBoard('e1'); });
  check('peSelectRackPiece', () => { window.peSelectRackPiece('K'); });
  check('peMakeMove', () => { window.peMakeMove('e2', 'e4'); });
  check('peOnBoardMouseDown', () => { window.peOnBoardMouseDown({ target: window.document.body, button: 0, stopImmediatePropagation: () => {}, preventDefault: () => {} }); });
  check('peOnBoardContextMenu', () => { window.peOnBoardContextMenu({ target: window.document.body, preventDefault: () => {} }); });
  check('peUpdatePieceCount', () => { window.peUpdatePieceCount(); });
  check('peUpdateHint', () => { window.peUpdateHint(); });
  check('peCaptureFromBoard', () => { window.peCaptureFromBoard(); });
  check('peLoadToBoard', () => { window.peLoadToBoard(); });
  check('peUseForPuzzle', () => { window.peUseForPuzzle(); });
  check('resetPuzzleSetupToStandard', () => { window.resetPuzzleSetupToStandard(); });
  check('getLibrary', () => { const l = window.getLibrary(); if (!l) throw new Error(); });
  check('saveLibrary', () => { window.saveLibrary(window.getLibrary()); });
  check('findPuzzleById', () => { window.findPuzzleById(window.getLibrary(), 'test'); });
  check('getActiveChapter', () => { window.getActiveChapter(); });
  check('getActivePuzzle', () => { window.getActivePuzzle(); });
  check('renderLibrary', () => { window.renderLibrary(); });
  check('renderChapterSelect', () => { window.renderChapterSelect(); });
  check('handleLibraryAction', () => { window.handleLibraryAction('none', 'a', 'b'); });
  check('loadPuzzleToEditor', () => { window.loadPuzzleToEditor(null); });
  check('saveCurrentPuzzle', () => { window.saveCurrentPuzzle(); });
  check('captureCurrentPosition', () => { window.captureCurrentPosition(); });
  check('deleteCurrentPuzzle', () => { window.deleteCurrentPuzzle(); });
  check('newPuzzle', () => { window.newPuzzle(); });
  check('exportLibrary', () => { window.exportLibrary(); });
  check('importLibrary', () => { window.importLibrary(new window.Blob(['{}'], { type: 'application/json' })); });

  // PUZZLE PLAY
  check('startPuzzleTest', () => { window.startPuzzleTest(); });
  check('endPuzzleTest', () => { window.endPuzzleTest(false); });
  check('testPuzzleAsStudent', () => { window.testPuzzleAsStudent(); });
  check('onPuzzleMovePlayed', () => { window.onPuzzleMovePlayed('e4'); });
  check('solutionSanList', () => { const l = window.solutionSanList('1. e4 e5'); if (l.length !== 2) throw new Error(); });
  check('normSan', () => { if (window.normSan('Qxf7#') !== 'QXF7') throw new Error(); });
  check('revealPuzzleAnswer', () => { window.revealPuzzleAnswer(); });
  check('showPuzzleAnswer', () => { window.showPuzzleAnswer(true); window.showPuzzleAnswer(false); });

  // ENGINE & CLOCK
  check('initEngine', () => { window.initEngine(); });
  check('handleEngineMessage', () => { window.handleEngineMessage('info depth 10 score cp 50 pv e2e4'); });
  check('requestEngineEval', () => { window.requestEngineEval(); });
  check('toggleEngine', () => { window.toggleEngine(); });
  check('hideEngine', () => { window.hideEngine(); });
  check('setEngineDepth', () => { window.setEngineDepth(15); });
  check('setEngineMultiPV', () => { window.setEngineMultiPV(1); });
  check('setClock', () => { window.setClock(600); });
  check('toggleClock', () => { window.toggleClock(); window.toggleClock(); });
  check('switchClockSide', () => { window.switchClockSide(); });
  check('updateClocks', () => { window.updateClocks(); });
  check('formatTime', () => { if (window.formatTime(125) !== '2:05') throw new Error(); });

  // PERSISTENCE
  check('sessionPayload', () => { const p = window.sessionPayload(); if (!p || p.v !== 1) throw new Error(); });
  check('saveSession', () => { window.saveSession(true); });
  check('applySession', () => { window.applySession(window.sessionPayload()); });
  check('queueSessionSave', () => { window.queueSessionSave(); });
  check('flushSession', () => { window.flushSession(); });
  check('startSessionWatch', () => { window.startSessionWatch(); });
  check('stopSessionWatch', () => { window.stopSessionWatch(); });
  check('restoreSession', () => { window.restoreSession(); });
  check('restorePuzzleDraft', () => { window.restorePuzzleDraft(); });
  check('savePuzzleDraft', () => { window.savePuzzleDraft(true); });
  check('puzzleDraftPayload', () => { window.puzzleDraftPayload(); });
  check('readStoredJson', () => { window.readStoredJson('none'); });
  check('storeGet', () => { window.storeGet('k'); });
  check('storeSet', () => { window.storeSet('k', 'v'); });
  check('fieldVal', () => { window.fieldVal('puzzleTitle'); });
  check('setFieldVal', () => { window.setFieldVal('puzzleTitle', 'T'); });
  check('fenOf', () => { window.fenOf(window.state.game); });
  check('asArray', () => { if (window.asArray(null).length !== 0) throw new Error(); });
  check('isRestorable', () => { window.isRestorable({}); });
  check('isDraftEmpty', () => { window.isDraftEmpty({}); });
  check('resumeLabel', () => { window.resumeLabel('normal', {}); });

  // CHECKMATE, STALEMATE, DRAW
  check('mateStatus', () => { window.mateStatus(window.state.game); });
  check('finishInfo', () => { window.finishInfo(window.state.game); });
  check('looksDrawnMaterial', () => { window.looksDrawnMaterial('4k3/8/8/8/8/8/8/4K3 w - - 0 1'); });
  check('cbCall', () => { window.cbCall(window.state.game, 'turn'); });
  check('cbHalfmoveClock', () => { window.cbHalfmoveClock('8/8/8/8/8/8/8/8 w - - 10 1'); });
  check('celebrateMate', () => { window.celebrateMate(); });
  check('replayMateFx', () => { window.replayMateFx(); });
  check('clearMateFx', () => { window.clearMateFx(); });
  check('decorateMateKing', () => { window.decorateMateKing(); });
  check('mateFxBox', () => { window.mateFxBox(); });
  check('mateKingSquare', () => { window.mateKingSquare('w'); });

  // UTILITIES
  check('uniqueId', () => { if (!window.uniqueId('test')) throw new Error(); });
  check('escapeHtml', () => { if (window.escapeHtml('&<') !== '&amp;&lt;') throw new Error(); });
  check('autoName', () => { if (!window.autoName('Test', { chapters: [] })) throw new Error(); });
  check('toast', () => { window.toast('msg'); });
  check('stars', () => { if (window.stars(3) !== '★★★☆☆') throw new Error(); });

  console.log(`\n======================================================`);
  console.log(`INVENTORY UNIT TEST RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

testInventory().catch(e => {
  console.error('Fatal inventory test error:', e);
  process.exit(1);
});
