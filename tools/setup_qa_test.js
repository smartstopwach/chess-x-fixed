const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runSetupTests() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost:8000/',
  });

  const { window } = dom;

  // Polyfills
  window.confirm = () => true;
  window.prompt = () => 'Test';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  const scripts = [
    'chess.min.js',
    'pieces.js',
    'engine.js',
    'js/00-constants.js',
    'js/01-state.js',
    'js/02-dom.js',
    'js/03-utils.js',
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
  window.eval(fullCode + '\n; window._ctx = { state, puzzleState, setMode, loadPreset, clearBoard, selectRackPiece, pickPieceFromBoard, placePieceOnSetup, erasePieceAt, setupUndo, setupRedo, startFromPosition, tryMakeMove, celebrateMate, mateStatus, syncSetupControlsFromFen, loadFen };');

  const {
    state, setMode, loadPreset, clearBoard, selectRackPiece,
    pickPieceFromBoard, placePieceOnSetup, erasePieceAt, setupUndo,
    setupRedo, startFromPosition, tryMakeMove, celebrateMate, mateStatus,
    syncSetupControlsFromFen, loadFen
  } = window._ctx;

  const document = window.document;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  console.log('=== RUNNING CUSTOM SETUP MODE QA TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${desc} — ${details}`);
      failed++;
    }
  }

  // 1. Enter Custom Setup Mode
  setMode('setup');
  assert('Mode is setup', document.body.dataset.mode === 'setup');
  assert('Setup editing is active', document.body.dataset.setupEditing === 'true');
  assert('state.setupMode is true', state.setupMode === true);

  // 2. Verify checkmate/draw effects are SILENCED during setup editing
  loadPreset('endgame_kq'); // K+Q vs K: would normally trigger evaluations
  const mateResDuringSetup = celebrateMate();
  assert('No checkmate celebration during setup editing', mateResDuringSetup === false);
  const mateBox = document.getElementById('mateFx');
  assert('No mate FX popup shown during setup editing', !mateBox || !mateBox.classList.contains('show'));

  // 3. Test Presets
  loadPreset('empty');
  assert('Preset empty loaded', state.game.fen().startsWith('8/8/8/8/8/8/8/8'));

  loadPreset('pawns_kings');
  assert('Preset pawns_kings loaded', state.game.fen().includes('4k3/pppppppp'));

  loadPreset('lucena');
  assert('Preset Lucena loaded', state.game.fen().includes('1R6/1P1k4'));

  loadPreset('philidor');
  assert('Preset Philidor loaded', state.game.fen().includes('4k3/8/8/3r4'));

  loadPreset('two_rooks');
  assert('Preset two_rooks loaded', state.game.fen().includes('R2RK3'));

  // 4. Test Piece Rack Selection & Placement
  clearBoard();
  selectRackPiece('K'); // White King
  assert('Selected White King from rack', state.heldPiece && state.heldPiece.piece === 'K');
  placePieceOnSetup('e1', state.heldPiece.piece);
  assert('Placed White King on e1', state.game.fen().includes('4K3'));

  selectRackPiece('k'); // Black King
  placePieceOnSetup('e8', state.heldPiece.piece);
  assert('Placed Black King on e8', state.game.fen().includes('4k3'));

  selectRackPiece('Q'); // White Queen
  placePieceOnSetup('d1', state.heldPiece.piece);
  assert('Placed White Queen on d1', state.game.fen().includes('3QK3'));

  // 5. Test Board Pick & Move / Erase
  pickPieceFromBoard('d1');
  assert('Picked Queen from d1', state.heldPiece && state.heldPiece.piece === 'Q' && state.heldPiece.source === 'd1');
  placePieceOnSetup('h5', state.heldPiece.piece);
  assert('Moved Queen from d1 to h5', state.game.fen().includes('7Q') && !state.game.fen().includes('3QK3'));

  erasePieceAt('h5');
  assert('Erased piece at h5', !state.game.fen().includes('Q'));

  // 6. Test Setup Undo and Redo
  setupUndo();
  assert('Undo restored piece at h5', state.game.fen().includes('7Q'));

  setupRedo();
  assert('Redo re-erased piece at h5', !state.game.fen().includes('Q'));

  // 7. Test Setup Controls (Castling, Side to Move, EP, Counters)
  loadPreset('castling_test');
  $('optWhiteCastleK').checked = true;
  $('optWhiteCastleQ').checked = false;
  $('optBlackCastleK').checked = false;
  $('optBlackCastleQ').checked = true;
  $('optSideToMove').value = 'b';
  $('optHalfmove').value = '5';
  $('optFullmove').value = '12';

  // 8. Test START FROM POSITION
  startFromPosition();
  assert('Setup editing disabled after START FROM POSITION', document.body.dataset.setupEditing === 'false');
  assert('state.setupMode is false', state.setupMode === false);
  const activeFen = state.game.fen();
  assert('Constructed FEN has Black to move', activeFen.includes(' b '));
  assert('Constructed FEN has correct castling (Kq)', activeFen.includes(' Kq '));
  assert('Constructed FEN has halfmove and fullmove (5 12)', activeFen.endsWith('5 12'));

  // 9. Verify Gameplay and Checkmate after START FROM POSITION
  // Load Scholar's mate setup (Queen on h5, Bishop on c4)
  $('fenInput').value = 'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
  loadFen();
  startFromPosition();

  // Play Qxf7#
  const moveRes = tryMakeMove('h5', 'f7');
  assert('Played checkmate move Qxf7#', moveRes === true);
  assert('Game detects checkmate', mateStatus(state.game) === 'checkmate');

  // 10. Test FEN loading
  $('fenInput').value = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
  loadFen();
  assert('Loaded FEN to board', state.game.fen().includes('4P3'));

  console.log(`\n========================================`);
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runSetupTests().catch(err => {
  console.error('Setup QA test suite error:', err);
  process.exit(1);
});
