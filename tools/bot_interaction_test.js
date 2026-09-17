/**
 * Bot-game regression test with a deterministic Worker double.
 * It verifies that the bot starts from the current move list and that Flip
 * changes the side controlled by the bot without resetting the position.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'MANIFEST.json'), 'utf8'));
const files = ['chess.min.js', 'pieces.js', 'engine.js', ...manifest.parts.map(part => part.file)];

function makeAudio() {
  return class FakeAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    resume() { return Promise.resolve(); }
    createOscillator() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, start() {}, stop() {},
      };
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  };
}

async function main() {
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
  window.prompt = (_message, fallback) => fallback || 'QA';
  window.safeScrollIntoView = () => {};
  window.autoFitBoard = () => {};
  window.requestAnimationFrame = callback => setTimeout(callback, 0);
  window.ResizeObserver = class { observe() {} disconnect() {} };
  window.AudioContext = makeAudio();

  class FakeWorker {
    constructor() {
      this.onmessage = null;
      this.onerror = null;
      this.terminated = false;
    }
    postMessage(command) {
      if (this.terminated || !/^go depth /.test(command)) return;
      setTimeout(() => {
        if (this.terminated || !this.onmessage) return;
        const turn = window.state.game.turn();
        const uci = turn === 'b' ? 'e7e5' : 'g1f3';
        this.onmessage({ data: `bestmove ${uci}` });
      }, 20);
    }
    terminate() { this.terminated = true; }
  }
  window.Worker = FakeWorker;

  window.eval(files.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n;\n'));
  window.doInit();
  window.setMode('normal');

  // White has already played e4. Starting the bot must keep that position and
  // move list, then let the bot (black) continue with e5.
  const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  window.state.game.load(afterE4);
  window.resetMoveHistory(afterE4);
  window.state.history.push('e4');
  window.state.historyIndex = 0;
  window.state.flipped = false;
  window.document.body.dataset.flipped = 'false';
  window.renderAll();
  window.startBotGame();
  await new Promise(resolve => setTimeout(resolve, 420));

  assert.strictEqual(window.state.bot.active, true, 'bot should be active');
  assert.strictEqual(window.state.bot.color, 'b', 'normal orientation gives bot Black');
  assert.deepStrictEqual(Array.from(window.state.history), ['e4', 'e5'], 'bot continues existing history');
  assert.strictEqual(window.state.game.turn(), 'w', 'turn returns to White after bot move');

  // Flip during the same game: the human is now Black and the bot must take
  // White. The current position and existing moves must remain intact.
  window.flipBoard();
  await new Promise(resolve => setTimeout(resolve, 420));
  assert.strictEqual(window.state.bot.color, 'w', 'flipped orientation gives bot White');
  assert.deepStrictEqual(Array.from(window.state.history), ['e4', 'e5', 'Nf3'], 'flip continues without reset');
  assert.strictEqual(window.state.game.turn(), 'b', 'turn returns to Black after flipped bot move');

  const fenBeforeStop = window.state.game.fen();
  window.stopBotGame(false);
  assert.strictEqual(window.state.game.fen(), fenBeforeStop, 'stopping bot keeps position');
  assert.strictEqual(window.state.bot.active, false, 'bot stopped');

  // Editing mode must hide the panel and refuse a new bot game.
  window.setMode('setup');
  assert.strictEqual(window.document.getElementById('botPanel').hidden, true, 'setup editing hides bot');
  window.setMode('puzzle');
  assert.strictEqual(window.document.getElementById('botPanel').hidden, true, 'puzzle authoring hides bot');

  dom.window.close();
  console.log('BOT INTERACTION RESULT: 6 PASSED | 0 FAILED');
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
