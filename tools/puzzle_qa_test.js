const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runTests() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Create JSDOM instance with scripts executed
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost:8000/',
  });

  const { window } = dom;

  // Polyfills for browser environment
  window.confirm = () => true;
  window.prompt = (msg, def) => 'Test Renamed Chapter';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  // Load chess.min.js and all scripts in order
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
  window.eval(fullCode + '\n; window._ctx = { state, puzzleState, getLibrary, saveLibrary, peLoadPreset, peSetupUndo, peSetupRedo, pePlacePiece, peErasePiece, peSelectRackPiece, peUseForPuzzle, enterAuthoringForNewPuzzle, saveCurrentPuzzle, loadPuzzleToEditor, startPuzzleTest, tryMakeMove, endPuzzleTest, handleLibraryAction, setMode };');

  const {
    state, puzzleState, getLibrary, saveLibrary, peLoadPreset, peSetupUndo,
    peSetupRedo, pePlacePiece, peErasePiece, peSelectRackPiece, peUseForPuzzle,
    enterAuthoringForNewPuzzle, saveCurrentPuzzle, loadPuzzleToEditor,
    startPuzzleTest, tryMakeMove, endPuzzleTest, handleLibraryAction, setMode
  } = window._ctx;
  const document = window.document;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  console.log('=== RUNNING PUZZLE MODE QA TEST SUITE ===\n');

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

  // 1. Enter Puzzle Mode
  setMode('puzzle');
  assert('Mode is puzzle', document.body.dataset.mode === 'puzzle', `data-mode is ${document.body.dataset.mode}`);
  assert('Authoring mode is active on entry', document.body.dataset.authoring === 'true', `data-authoring is ${document.body.dataset.authoring}`);

  // 2. Test Presets in Left Position Setup
  peLoadPreset('pawns_kings');
  let fen = state.game.fen();
  assert('Preset pawns_kings loaded to main board', fen.includes('4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3'), `FEN: ${fen}`);

  peLoadPreset('empty');
  fen = state.game.fen();
  assert('Preset empty cleared board', fen.startsWith('8/8/8/8/8/8/8/8'), `FEN: ${fen}`);

  peLoadPreset('endgame_kq');
  fen = state.game.fen();
  assert('Preset endgame_kq loaded', fen.includes('3QK3'), `FEN: ${fen}`);

  // 3. Test Undo and Redo in Position Setup
  peSetupUndo(); // back to empty
  fen = state.game.fen();
  assert('Undo returned to empty preset', fen.startsWith('8/8/8/8/8/8/8/8'), `FEN: ${fen}`);

  peSetupRedo(); // back to endgame_kq
  fen = state.game.fen();
  assert('Redo returned to endgame_kq', fen.includes('3QK3'), `FEN: ${fen}`);

  // 4. Test Place Piece & Erase Piece
  peLoadPreset('empty');
  pePlacePiece('e1', 'K'); // White King
  pePlacePiece('e8', 'k'); // Black King
  pePlacePiece('d1', 'Q'); // White Queen
  fen = state.game.fen();
  assert('Placed pieces (K on e1, k on e8, Q on d1)', fen.includes('4k3') && fen.includes('3QK3'), `FEN: ${fen}`);

  peErasePiece('d1');
  fen = state.game.fen();
  assert('Erased piece at d1', !fen.includes('Q'), `FEN: ${fen}`);

  // 5. Test Piece Rack Selection & Placement
  peSelectRackPiece('R');
  assert('Selected White Rook from rack', puzzleState.heldPiece && puzzleState.heldPiece.piece === 'R');
  pePlacePiece('a1', puzzleState.heldPiece.piece);
  fen = state.game.fen();
  assert('Placed Rook on a1', fen.includes('R3K3'), `FEN: ${fen}`);

  // 6. Test Capturing Position for Puzzle
  peUseForPuzzle();
  assert('Authoring mode exited after Use Position', document.body.dataset.authoring === 'false');
  assert('puzzleFen field updated', $('puzzleFen').value.includes('R3K3'));

  // 7. Test Creating New Puzzle & Setting Fields
  enterAuthoringForNewPuzzle();
  assert('Re-entered authoring for new puzzle', document.body.dataset.authoring === 'true');
  $('puzzleTitle').value = 'Back Rank Mate';
  $('puzzleDescription').value = 'Find the winning rook move for White';
  $('puzzleSolution').value = 'Ra8#';
  $('puzzleDifficulty').value = '4';
  $('puzzleTags').value = 'backrank, mate';
  peLoadPreset('endgame_krk');

  // 8. Test Saving Puzzle
  saveCurrentPuzzle();
  assert('Authoring exited after save', document.body.dataset.authoring === 'false');
  const lib = getLibrary();
  const savedPuz = lib.chapters.flatMap(c => c.puzzles).find(p => p.title === 'Back Rank Mate');
  assert('Puzzle saved in library store', !!savedPuz);
  assert('Saved puzzle solution matches', savedPuz && savedPuz.solution === 'Ra8#');
  assert('Saved puzzle difficulty matches', savedPuz && savedPuz.difficulty === 4);

  // 9. Test Test / Play Mode with Solution Verification
  loadPuzzleToEditor(savedPuz.id);
  startPuzzleTest();
  assert('Testing mode active', document.body.dataset.testing === 'true');
  assert('Puzzle question displayed', $('puzzleQuestion').textContent === 'Find the winning rook move for White');

  // Wrong move test
  tryMakeMove('e1', 'e2');
  assert('Wrong move did not solve puzzle', state.puzzle && !state.puzzle.solved);

  // Correct move test
  tryMakeMove('a1', 'a8');
  assert('Correct move solved puzzle', state.puzzle && state.puzzle.solved);
  assert('Puzzle answer revealed', !$('puzzleAnswer').classList.contains('hidden'));

  // End test mode
  endPuzzleTest(false);
  assert('Testing mode ended', document.body.dataset.testing === 'false');

  // 10. Test Library Export and Import
  const exportedJson = JSON.stringify(getLibrary());
  assert('Library exported valid JSON', exportedJson.length > 50 && exportedJson.includes('Back Rank Mate'));

  // Modify library and re-import
  const modifiedLib = JSON.parse(exportedJson);
  modifiedLib.chapters[0].name = 'Imported Grandmaster Puzzles';
  saveLibrary(modifiedLib);
  const reloadedLib = getLibrary();
  assert('Library updated with imported data', reloadedLib.chapters[0].name === 'Imported Grandmaster Puzzles');

  // 11. Test Chapter Rename & Delete
  handleLibraryAction('rename-chapter', reloadedLib.chapters[0].id);
  assert('Chapter renamed via action', getLibrary().chapters[0].name === 'Test Renamed Chapter');

  const puzToDelete = getLibrary().chapters[0].puzzles[0];
  if (puzToDelete) {
    const initialCount = getLibrary().chapters[0].puzzles.length;
    handleLibraryAction('delete-puzzle', getLibrary().chapters[0].id, puzToDelete.id);
    const afterCount = getLibrary().chapters[0].puzzles.length;
    assert('Puzzle deleted via action', afterCount === initialCount - 1);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner threw unhandled error:', err);
  process.exit(1);
});
