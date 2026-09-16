/**
 * Regression tests for the move-audio unlock and scheduling path.
 *
 * This deliberately uses the real js/03-utils.js source with a tiny browser
 * API harness. It does not pretend to verify speaker output; it verifies the
 * browser calls that make output possible: context creation, resume during a
 * gesture, oscillator scheduling, capture distinction, and unsupported-browser
 * safety.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js', '03-utils.js'), 'utf8');
const interactionSource = fs.readFileSync(path.join(ROOT, 'js', '12-board-interactions.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeHarness(options = {}) {
  const events = [];
  let contexts = 0;
  let resumes = 0;
  let audioElements = 0;
  let fallbackPlays = 0;

  class FakeAudioContext {
    constructor() {
      contexts++;
      this.state = options.startSuspended === false ? 'running' : 'suspended';
      this.currentTime = 12;
      this.destination = {};
    }

    resume() {
      resumes++;
      if (options.rejectResume) return Promise.reject(new Error('blocked'));
      this.state = 'running';
      return Promise.resolve();
    }

    createOscillator() {
      const event = { kind: 'oscillator', starts: [], stops: [], frequency: [] };
      events.push(event);
      return {
        type: '',
        frequency: {
          setValueAtTime: (value, at) => event.frequency.push(['set', value, at]),
          exponentialRampToValueAtTime: (value, at) => event.frequency.push(['ramp', value, at]),
        },
        connect: () => {},
        start: at => event.starts.push(at),
        stop: at => event.stops.push(at),
      };
    }

    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      };
    }
  }

  function FakeAudio(src) {
    audioElements++;
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.play = () => {
      fallbackPlays++;
      return Promise.resolve();
    };
  }

  const window = {};
  if (!options.noWebAudio) window.AudioContext = FakeAudioContext;
  if (options.webkitOnly) {
    window.webkitAudioContext = FakeAudioContext;
    delete window.AudioContext;
  }
  if (options.noWebAudio) window.Audio = FakeAudio;

  const sandbox = {
    window,
    document: { getElementById: () => null },
    setTimeout,
    clearTimeout,
    console,
    Number,
    String,
    Date,
    Math,
    Promise,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/03-utils.js' });
  return {
    sandbox,
    events,
    stats: () => ({ contexts, resumes, audioElements, fallbackPlays }),
  };
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}`);
  }
}

check('warms a suspended context before a move', () => {
  const h = makeHarness();
  assert(h.sandbox.prepareMoveAudio() === true, 'warm-up failed');
  const stats = h.stats();
  assert(stats.contexts === 1 && stats.resumes === 1, 'context was not resumed');
});

check('schedules an audible normal move cue', () => {
  const h = makeHarness();
  h.sandbox.prepareMoveAudio();
  h.sandbox.playPieceMoveSound({ flags: 'n' });
  assert(h.events.length === 1, 'oscillator was not created');
  assert(h.events[0].starts.length === 1 && h.events[0].stops.length === 1, 'cue was not scheduled');
  assert(h.events[0].frequency[0][1] === 420, 'normal move frequency');
  assert(h.stats().contexts === 1, 'move created a second context');
});

check('board press warms audio before the move release', () => {
  const h = makeHarness();
  h.sandbox.state = { setupMode: false };
  h.sandbox.isAuthoringMode = () => false;
  vm.runInContext(interactionSource, h.sandbox, { filename: 'js/12-board-interactions.js' });
  h.sandbox.beginSquarePress({ dataset: { square: 'e2' } }, 10, 10, 0, 1);
  assert(h.stats().contexts === 1 && h.stats().resumes === 1, 'board press did not unlock audio');
});

check('uses a lower capture cue and accepts a delayed replay', () => {
  const h = makeHarness();
  h.sandbox.playPieceMoveSound({ flags: 'c' }, 0.08);
  assert(h.events.length === 1, 'capture oscillator was not created');
  assert(h.events[0].frequency[0][1] === 270, 'capture frequency');
  assert(h.events[0].starts[0] > 12, 'delay was not applied');
});

check('supports the webkit-prefixed audio context', () => {
  const h = makeHarness({ webkitOnly: true });
  assert(h.sandbox.prepareMoveAudio() === true, 'webkit context was not selected');
  h.sandbox.playPieceMoveSound();
  assert(h.events.length === 1, 'webkit cue was not scheduled');
});

check('falls back safely when Web Audio is unavailable', () => {
  const h = makeHarness({ noWebAudio: true });
  h.sandbox.playPieceMoveSound();
  const stats = h.stats();
  assert(stats.audioElements === 1 && stats.fallbackPlays === 1, 'fallback audio was not attempted');
});

check('never throws when resume is rejected', () => {
  const h = makeHarness({ rejectResume: true });
  h.sandbox.prepareMoveAudio();
  h.sandbox.playPieceMoveSound();
  assert(h.stats().contexts === 1, 'resume rejection broke audio handling');
});

results.forEach(line => console.log(line));
const failed = results.filter(line => line.startsWith('FAIL'));
console.log(`MOVE AUDIO RESULT: ${results.length - failed.length} PASSED | ${failed.length} FAILED`);
process.exit(failed.length ? 1 : 0);
