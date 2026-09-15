/**
 * Comprehensive Test Suite for Pawn Promotion and 2-Bishop Checkmate Rules
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const assert = require('assert');

function runRulesAndPromoTests() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8000/' });
  const { window } = dom;

  window.confirm = () => true;
  window.prompt = () => 'Test';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

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
  window.doInit();

  console.log('=== TEST 1: TWO BISHOPS CHECKMATE & MATERIAL RULES ===');
  // 1a. Checkmate with 2 Bishops vs King
  const kbbMateFen = '7k/5B2/6K1/8/3B4/8/8/8 b - - 0 1';
  window.state.game.load(kbbMateFen);
  const statusMate = window.mateStatus(window.state.game);
  console.log('Status for 2-bishop checkmate:', statusMate);
  assert.strictEqual(statusMate, 'checkmate', 'Two bishops delivering mate must be recognized as checkmate');

  // 1b. Material check with 2 Bishops vs King
  const kbbDrawn = window.looksDrawnMaterial(kbbMateFen);
  console.log('looksDrawnMaterial for 2 bishops:', kbbDrawn);
  assert.strictEqual(kbbDrawn, false, 'Two bishops vs King is NOT insufficient material');

  // 1c. Bishop + Knight vs King
  const kbnFen = '8/8/8/8/8/8/8/K1BNk3 w - - 0 1';
  assert.strictEqual(window.looksDrawnMaterial(kbnFen), false, 'Bishop + Knight vs King is NOT insufficient material');

  // 1d. Bare kings (K vs K)
  const kkFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
  assert.strictEqual(window.looksDrawnMaterial(kkFen), true, 'K vs K is insufficient material');

  // 1e. Single bishop (KB vs K)
  const kbFen = '8/8/8/8/8/8/8/K1Bk4 w - - 0 1';
  assert.strictEqual(window.looksDrawnMaterial(kbFen), true, 'KB vs K is insufficient material');

  // 1f. Single knight (KN vs K)
  const knFen = '8/8/8/8/8/8/8/K1Nk4 w - - 0 1';
  assert.strictEqual(window.looksDrawnMaterial(knFen), true, 'KN vs K is insufficient material');

  console.log('✓ All material and 2-bishop checkmate tests passed!');

  console.log('\n=== TEST 2: PAWN PROMOTION WORKFLOW & UNDERPROMOTION ===');
  window.setMode('normal');

  // 2a. Trigger promotion dialog for White pawn e7 -> e8
  window.state.game.load('7k/4P3/8/8/8/8/8/7K w - - 0 1');
  window.state.history = [];
  window.state.historyIndex = -1;
  window.renderAll();

  assert.strictEqual(window.isPromotionMove('e7', 'e8'), true, 'e7->e8 is a promotion move');
  assert.strictEqual(window.isPromotionMove('h1', 'g1'), false, 'h1->g1 is not a promotion move');

  window.handleSquareClick('e7');
  assert.strictEqual(window.state.selectedSquare, 'e7');

  window.handleSquareClick('e8');
  assert(window.state.pendingPromotion !== null, 'Promotion dialog should be active');
  assert.strictEqual(window.state.pendingPromotion.from, 'e7');
  assert.strictEqual(window.state.pendingPromotion.to, 'e8');
  assert.strictEqual(window.state.pendingPromotion.color, 'w');

  const overlay = window.document.getElementById('promotionOverlay');
  const promoPieces = window.document.getElementById('promotionPieces');
  assert.strictEqual(overlay.style.display, 'flex');
  assert.strictEqual(promoPieces.children.length, 4, 'Must offer Queen, Rook, Bishop, Knight');

  // 2b. Underpromotion to Knight
  window.choosePromotion('n');
  assert(window.state.game.fen().includes('4N2k'), 'Board must contain promoted Knight');
  assert.strictEqual(window.state.history[0], 'e8=N', 'Move history must record e8=N');
  assert.strictEqual(window.state.pendingPromotion, null);

  // 2c. Promotion to Queen
  window.state.game.load('7k/4P3/8/8/8/8/8/7K w - - 0 1');
  window.state.history = [];
  window.state.historyIndex = -1;
  window.renderAll();
  window.handleSquareClick('e7');
  window.handleSquareClick('e8');
  window.choosePromotion('q');
  assert(window.state.game.fen().includes('4Q2k'), 'Board must contain promoted Queen');
  assert.strictEqual(window.state.history[0], 'e8=Q+', 'Move history must record e8=Q+ with check');

  // 2d. Promotion to Rook
  window.state.game.load('7k/4P3/8/8/8/8/8/7K w - - 0 1');
  window.state.history = [];
  window.state.historyIndex = -1;
  window.renderAll();
  window.handleSquareClick('e7');
  window.handleSquareClick('e8');
  window.choosePromotion('r');
  assert(window.state.game.fen().includes('4R2k'), 'Board must contain promoted Rook');
  assert.strictEqual(window.state.history[0], 'e8=R+', 'Move history must record e8=R+');

  // 2e. Promotion to Bishop
  window.state.game.load('7k/4P3/8/8/8/8/8/7K w - - 0 1');
  window.state.history = [];
  window.state.historyIndex = -1;
  window.renderAll();
  window.handleSquareClick('e7');
  window.handleSquareClick('e8');
  window.choosePromotion('b');
  assert(window.state.game.fen().includes('4B2k'), 'Board must contain promoted Bishop');
  assert.strictEqual(window.state.history[0], 'e8=B', 'Move history must record e8=B');

  // 2f. Black pawn promotion (a2 -> a1)
  window.state.game.load('7k/8/8/8/8/8/p7/7K b - - 0 1');
  window.state.history = [];
  window.state.historyIndex = -1;
  window.renderAll();
  assert.strictEqual(window.isPromotionMove('a2', 'a1'), true, 'a2->a1 is a Black promotion move');
  window.handleSquareClick('a2');
  window.handleSquareClick('a1');
  assert(window.state.pendingPromotion !== null);
  assert.strictEqual(window.state.pendingPromotion.color, 'b');
  window.choosePromotion('q');
  assert(window.state.game.fen().includes('q6K'), 'Black queen created on a1');

  // 2g. Cancel promotion dialog
  window.state.game.load('7k/4P3/8/8/8/8/8/7K w - - 0 1');
  window.renderAll();
  window.handleSquareClick('e7');
  window.handleSquareClick('e8');
  assert(window.state.pendingPromotion !== null);
  window.cancelPromotionDialog();
  assert.strictEqual(window.state.pendingPromotion, null);
  assert(window.state.game.fen().includes('4P3'), 'Pawn remains unpromoted on e7 after cancel');

  // 2h. Keyboard shortcut promotion ('b' key for Bishop)
  window.state.game.load('7k/4P3/8/8/8/8/8/7K w - - 0 1');
  window.renderAll();
  window.handleSquareClick('e7');
  window.handleSquareClick('e8');
  assert(window.state.pendingPromotion !== null);
  const keyEvent = new window.KeyboardEvent('keydown', { key: 'b' });
  window.document.dispatchEvent(keyEvent);
  assert.strictEqual(window.state.pendingPromotion, null);
  assert(window.state.game.fen().includes('4B2k'), 'Promoted via keyboard B shortcut to Bishop');

  console.log('✓ All pawn promotion & underpromotion tests passed!\n');
  process.exit(0);
}

runRulesAndPromoTests();
