/**
 * Targeted regressions for event duplication and board context-menu handling.
 * This intentionally uses the real split scripts and a DOM fixture rather than
 * calling an isolated mock of the interaction code.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const scripts = [
  'chess.min.js', 'pieces.js', 'engine.js',
  ...JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'MANIFEST.json'), 'utf8')).parts
    .map(part => part.file),
];

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
  window.prompt = (_message, defaultValue) => defaultValue || 'QA chapter';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = callback => setTimeout(callback, 0);
  window.ResizeObserver = class { observe() {} disconnect() {} };
  window.navigator.clipboard = { writeText: () => Promise.resolve() };
  window.URL.createObjectURL = () => 'blob:qa';
  window.URL.revokeObjectURL = () => {};

  const code = scripts.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n;\n');
  window.eval(code);
  // The boot script may have registered DOMContentLoaded, but it is safe to
  // request initialization here because doInit is now explicitly idempotent.
  window.doInit();
  return { dom, window };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function oneRightClick(window, squareName) {
  const { document } = window;
  const first = document.querySelector(`.square[data-square="${squareName}"]`);
  assert(first, `missing ${squareName} square`);
  // This is the board's real press state machine. It avoids synthetic mouse
  // suppression after a touch test while still exercising the right-button path.
  window.beginSquarePress(first, 10, 10, 2, 1);
  const replacement = document.querySelector(`.square[data-square="${squareName}"]`);
  // Chrome and Firefox may dispatch contextmenu after mouseup; exercise that
  // ordering because it used to trigger a second erase/history entry.
  window.endSquarePress(replacement, 10, 10);
  const event = new window.MouseEvent('contextmenu', {
    button: 2, bubbles: true, cancelable: true, clientX: 10, clientY: 10,
  });
  replacement.dispatchEvent(event);
  assert(event.defaultPrevented, 'board context menu was not prevented');
}

const { dom, window } = makeWindow();
const results = [];
function check(name, fn) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}`);
  }
}

check('doInit is idempotent and does not duplicate button listeners', () => {
  const before = window.getLibrary().chapters.length;
  window.doInit();
  window.doInit();
  window.document.getElementById('btnNewChapter').click();
  const after = window.getLibrary().chapters.length;
  assert(after === before + 1, `one click created ${after - before} chapters`);
});

check('setup right-click erases once and one undo restores the piece', () => {
  window.setMode('setup');
  window.loadPreset('empty');
  window.placePieceOnSetup('e4', 'K');
  oneRightClick(window, 'e4');
  assert(window.state.game.get('e4') === null, 'piece was not erased');
  window.setupUndo();
  const restored = window.state.game.get('e4');
  assert(restored && restored.type === 'k', 'one undo did not restore the king');
});

check('authoring right-click uses puzzle erase path without duplicate history', () => {
  window.setMode('puzzle');
  window.peLoadPreset('empty');
  window.pePlacePiece('e4', 'K');
  oneRightClick(window, 'e4');
  assert(window.state.game.get('e4') === null, 'authoring piece was not erased');
  window.peSetupUndo();
  const restored = window.state.game.get('e4');
  assert(restored && restored.type === 'k', 'one puzzle undo did not restore the king');
});

results.forEach(line => console.log(line));
const failed = results.filter(line => line.startsWith('FAIL'));
console.log(`INTERACTION REGRESSION RESULT: ${results.length - failed.length} PASSED | ${failed.length} FAILED`);
dom.window.close();
process.exit(failed.length ? 1 : 0);
