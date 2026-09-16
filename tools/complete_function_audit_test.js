/**
 * Completeness audit for the current split application.
 *
 * The older function_inventory_test.js covers the historical public inventory.
 * This companion discovers every named function in the current JS split, checks
 * its exposure boundary, and directly exercises functions added since that
 * inventory (including the import validator and move-audio helper).
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'MANIFEST.json'), 'utf8'));
const scriptFiles = ['chess.min.js', 'pieces.js', 'engine.js', ...manifest.parts.map(x => x.file)];
const localFunctionNames = new Set([
  'inspectGuard', 'setLocked', 'dockedHeuristic', 'tick',
  'watchBoardSpace', 'watchFullscreen',
]);

function discoveredFunctions() {
  const found = [];
  const re = /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  for (const file of manifest.parts.map(x => x.file)) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    let match;
    while ((match = re.exec(source))) found.push({ name: match[1], file });
  }
  return found;
}

function makeWindow() {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    runScripts: 'outside-only',
    url: 'http://localhost:4173/?allowinspect=1',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const stored = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => stored.has(key) ? stored.get(key) : null,
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: key => stored.delete(key),
      clear: () => stored.clear(),
    },
  });
  window.confirm = () => true;
  window.prompt = (_message, defaultValue) => defaultValue || 'QA value';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = callback => setTimeout(callback, 0);
  window.ResizeObserver = class { observe() {} disconnect() {} };
  window.navigator.clipboard = { writeText: () => Promise.resolve() };
  window.URL.createObjectURL = () => 'blob:qa';
  window.URL.revokeObjectURL = () => {};

  let audioCreated = 0;
  let oscillatorsStarted = 0;
  class FakeAudioContext {
    constructor() {
      audioCreated++;
      this.state = 'suspended';
      this.currentTime = 10;
      this.destination = {};
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createOscillator() {
      return {
        type: '',
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        start() { oscillatorsStarted++; },
        stop() {},
      };
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  }
  window.AudioContext = FakeAudioContext;

  const code = scriptFiles.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n;\n');
  window.eval(code);
  window.doInit();
  return { dom, window, getAudioCounts: () => ({ audioCreated, oscillatorsStarted }) };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const found = discoveredFunctions();
const names = new Set(found.map(x => x.name));
assert(found.length === names.size, 'duplicate named function declarations found');
assert(found.length === 240, `expected the current 240 named declarations, found ${found.length}`);

const { dom, window, getAudioCounts } = makeWindow();
const results = [];
function check(name, fn) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}`);
  }
}

check('all discovered public functions are exposed', () => {
  const missing = found
    .filter(({ name }) => !localFunctionNames.has(name) && typeof window[name] !== 'function')
    .map(({ name, file }) => `${name} (${file})`);
  assert(missing.length === 0, 'missing public functions: ' + missing.join(', '));
});

check('all discovered private functions stay accounted for', () => {
  const unexpected = found.filter(({ name }) => localFunctionNames.has(name) && typeof window[name] === 'function');
  assert(unexpected.length === 0, 'private IIFE functions leaked: ' + unexpected.map(x => x.name).join(', '));
});

// Newly discovered utility/render functions.
check('message, audio, material and promotion helpers', () => {
  window.showBoardMessage('audit message', 'info');
  assert(window.pieceValue('Q') === 9 && window.pieceValue('x') === 0, 'piece values');
  assert(window.materialPoints('w') > 0 && window.materialBalance().white > 0, 'material totals');
  window.state.history = ['e4', 'e5', 'a8=Q+'];
  assert(window.promotionCounts().w === 1, 'promotion count');
  assert(window.prepareMoveAudio() === true, 'audio context warm-up');
  window.playPieceMoveSound({ flags: 'n' });
  window.playPieceMoveSound({ flags: 'c' }, 0.05);
  const audio = getAudioCounts();
  assert(audio.audioCreated === 1 && audio.oscillatorsStarted === 2, 'audio scheduling');
  window.AudioContext = class { constructor() { throw new Error('blocked'); } };
  window.playPieceMoveSound(); // browser restriction must remain a no-op
});

check('interaction state helpers and all annotation shapes', () => {
  window.state.setupMode = false;
  window.state.authoringMode = false;
  assert(window.pressCameFromTouch(null) === false, 'touch predicate');
  assert(window.isEditingPosition() === false && window.rightButtonIsArrow() === true, 'editing predicate');
  window.cancelLeftAction();
  window.scheduleLeftAction('a1');
  window.cancelLeftAction();
  window.flushLeftAction();
  window.dropTransientMarks();
  assert(window.annoTotal() >= 0, 'annotation total');
  window.notePlaced('e4');
  assert(window.takeBackMatches('e4') === true, 'take-back match');
  window.suppressNextClick('e4');
  assert(window.clickSuppressed('e4') === true, 'suppressed click');
  window.clearAllAnnotations(false);
  assert(window.addShapeOnce('triangles', 'd4') === true, 'generic shape');
  assert(window.addTriangle('e4') === true && window.addHexagon('f4') === true, 'triangle and hexagon');
  assert(window.addRectangle('g4', 'g4') === true, 'rectangle');
  window.takeBack('d4');
  assert(!window.state.triangles.some(shape => shape.square === 'd4'), 'take-back erases shape');
  window.setTool('select');
  assert(window.placeWithTool('a1') === false, 'select tool has no drawing');
});

check('position validation and setup helpers', () => {
  assert(window.materialCountHtml({ K: 1, Q: 1, R: 0, B: 0, N: 0, P: 0, k: 1, q: 0, r: 0, b: 0, n: 0, p: 0 }).includes(''), 'material markup returns text');
  assert(window.validatePosition('4k3/8/8/8/8/8/8/R3K3 w - - 0 1').ok, 'valid position');
  assert(!window.validatePosition('8/8/8/8/8/8/8/8 w - - 0 1').ok, 'invalid position');
  window.state.game.reset();
  window.resetMoveHistory();
  assert(window.baseFen().includes('rnbqkbnr'), 'base FEN');
  window.expandRow('8');
  window.collapseRow(Array(8).fill(null));
  window.updateFenDisplay('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  window.syncSetupControlsFromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
});

check('variation helpers support strings and records', () => {
  const fen = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
  assert(window.variationFen(fen) === fen, 'string variation FEN');
  assert(window.variationFen({ fen }) === fen, 'record variation FEN');
  assert(window.variationLabel({ label: 'saved' }, 0) === 'saved', 'record variation label');
  assert(window.variationLabel(null, 1) === 'Position 2', 'fallback variation label');
  window.state.game.load(fen);
  window.resetMoveHistory(fen);
  window.state.variations = [];
  window.saveVariation();
  window.renderVariations();
  assert(window.state.variations.length === 1, 'variation saved');
  window.goToVariation(0);
  window.removeVariation(0);
});

check('puzzle import validator helpers cover valid and invalid input', () => {
  const errors = [];
  const warnings = [];
  assert(window.isLibraryRecord({}) && !window.isLibraryRecord([]), 'record predicate');
  window.importIssue(errors, 'one');
  assert(errors.length === 1, 'issue collector');
  assert(window.importText('  title  ', 'title', errors, true, 20) === 'title', 'text trim');
  assert(window.importSolutionTokens('1. e4 {comment} e5 1/2-1/2').join(',') === 'e4,e5', 'solution tokens');
  const fen = window.canonicalImportFen('4k3/8/8/8/8/8/8/R3K3 w - -', 'fen', errors, warnings);
  assert(fen.endsWith('0 1') && warnings.length === 1, 'FEN defaults');
  const solutionErrors = [];
  window.validateImportedSolution('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'Ra8#', 'solution', solutionErrors);
  assert(solutionErrors.length === 0, 'legal solution');
  const valid = window.validatePuzzleLibrary(JSON.parse(fs.readFileSync(path.join(ROOT, 'puzzle-library-example.json'), 'utf8')));
  assert(valid.ok && valid.library, 'sample library');
  const invalid = window.validatePuzzleLibrary({ chapters: [{ id: 'c', name: 'C', puzzles: [{ id: 'p', title: 'P', fen: '8/8/8/8/8/8/8/8 w - - 0 1' }] }] });
  assert(!invalid.ok && invalid.errors.some(e => e.includes('.fen')), 'invalid import');
  const exported = window.libraryExportPayload(valid.library);
  assert(exported.format === 'chessx-puzzle-library' && exported.version === 1 && exported.exportedAt, 'export metadata');
});

check('layout, clock and engine boundary helpers', () => {
  const box = window.boardFreeBox(window.document.getElementById('boardWrapper'), window.document.getElementById('boardContainer'));
  assert(typeof box.w === 'number' && typeof box.h === 'number', 'free box');
  window.paintClockSide();
  window.stopClockIfGameIsOver();
  assert(window.formatTime(0) === '0:00' && window.formatMove('e2e4') === 'e2-e4', 'format boundaries');
  window.setEngineDepth('invalid');
  window.setEngineMultiPV('invalid');
  window.handleEngineMessage(null);
});

results.forEach(line => console.log(line));
const failed = results.filter(line => line.startsWith('FAIL'));
console.log(`COMPLETE FUNCTION AUDIT RESULT: ${results.length - failed.length} PASSED | ${failed.length} FAILED`);
dom.window.close();
process.exit(failed.length ? 1 : 0);
