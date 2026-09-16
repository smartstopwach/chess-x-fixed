// ============================================
// SESSION / DRAFT PERSISTENCE
// ============================================
// Before this file, only the puzzle LIBRARY was saved (js/20). Everything the
// user actually built up on the board - the position, the move list, the
// arrows/circles they drew, the theme, the position-setup options, the puzzle
// they had open, and the half-typed puzzle form - lived in memory only. A
// reload went through doInit() -> showFrontPage() and dropped all of it.
//
// Design notes:
// - snapshots are taken at three moments: after every repaint (renderAll()
//   calls queueSessionSave), every 1.5s while the tab is visible, and on
//   pagehide / visibilitychange, which is what a reload actually fires
// - a snapshot is only written when it differs from the last one, so this is
//   not a write loop
// - restoring happens AFTER setMode(), because setMode deliberately wipes the
//   board and the annotations (clean-slate on mode entry); restoring before it
//   would be thrown away
// - everything is wrapped: localStorage throws on file:// in some browsers and
//   in private mode, and a broken record must never stop the app from booting

const SESSION_KEY = 'chessx-session-v1';
const DRAFT_KEY = 'chessx-puzzle-draft-v1';

let __sessionReady = false;      // no saving until the restore has finished
let __watchStarted = false;
let __lastPayload = '';
let __lastDraft = '';
let __sessionTimer = null;
let __queueTimer = null;

function storeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function storeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}

function readStoredJson(key) {
  const raw = storeGet(key);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return (obj && obj.v === 1) ? obj : null;
  } catch (e) { return null; }
}

function fieldVal(id) {
  const el = $(id);
  if (!el) return '';
  return el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value;
}

function setFieldVal(id, v) {
  const el = $(id);
  if (!el || v === undefined || v === null) return;
  if (el.type === 'checkbox') el.checked = !!v;
  else el.value = v;
}

function fenOf(game) {
  try { return game && game.fen ? game.fen() : ''; } catch (e) { return ''; }
}

function asArray(v) { return Array.isArray(v) ? v : []; }

// ---------- snapshot ----------

function sessionPayload() {
  const clock = state.clock || {};
  return {
    v: 1,
    mode: (typeof currentMode === 'string') ? currentMode : null,
    setupMode: !!state.setupMode,
    setupEditing: document.body.dataset.setupEditing === 'true',
    fen: fenOf(state.game),
    history: asArray(state.history).slice(0, 500),
    historyIndex: state.historyIndex,
    flipped: !!state.flipped,
    theme: state.boardTheme,
    pieceStyle: state.pieceStyle,
    tool: state.currentTool,
    color: state.currentColor,
    arrows: asArray(state.arrows),
    circles: asArray(state.circles),
    highlights: asArray(state.highlights),
    rectangles: asArray(state.rectangles),
    triangles: asArray(state.triangles),
    hexagons: asArray(state.hexagons),
    setup: {
      whiteCastleK: fieldVal('optWhiteCastleK'),
      whiteCastleQ: fieldVal('optWhiteCastleQ'),
      blackCastleK: fieldVal('optBlackCastleK'),
      blackCastleQ: fieldVal('optBlackCastleQ'),
      halfmove: fieldVal('optHalfmove'),
      fullmove: fieldVal('optFullmove')
    },
    engine: { depth: fieldVal('engineDepth'), multipv: fieldVal('engineMultiPV') },
    clock: { wTime: clock.wTime, bTime: clock.bTime },
    // Entering puzzle mode resets this pointer, so it is copied into the
    // snapshot and restored from there instead of being read back from the
    // library. It is only read in puzzle mode, because parsing the library on
    // every tick would be pointless work while teaching on the board.
    activePuzzleId: (typeof currentMode === 'string' && currentMode === 'puzzle')
      ? (() => { try { return getLibrary().activePuzzleId || null; } catch (e) { return null; } })()
      : null
  };
}

function saveSession(force) {
  if (!__sessionReady) return false;
  let payload;
  try { payload = sessionPayload(); } catch (e) { return false; }
  const json = JSON.stringify(payload);
  if (!force && json === __lastPayload) return false;
  __lastPayload = json;
  try { storeSet(SESSION_KEY, JSON.stringify(Object.assign({ ts: Date.now() }, payload))); } catch (e) {}
  return true;
}

function queueSessionSave() {
  if (!__sessionReady || __queueTimer) return;
  __queueTimer = setTimeout(() => { __queueTimer = null; saveSession(); }, 60);
}

// ---------- unsaved puzzle form ----------

function puzzleDraftPayload() {
  let editorFen = '';
  try { if (typeof puzzleGame === 'function' && puzzleGame()) editorFen = puzzleGame().fen(); } catch (e) {}
  return {
    v: 1,
    title: fieldVal('puzzleTitle'),
    description: fieldVal('puzzleDescription'),
    solution: fieldVal('puzzleSolution'),
    difficulty: fieldVal('puzzleDifficulty'),
    tags: fieldVal('puzzleTags'),
    fen: fieldVal('puzzleFen'),
    chapterId: fieldVal('puzzleChapterSelect'),
    editorFen
  };
}

function isDraftEmpty(d) {
  return !d || !(d.title || d.description || d.solution || d.tags || d.fen ||
    (d.editorFen && d.editorFen.indexOf('8/8/8/8/8/8/8/8') !== 0));
}

function savePuzzleDraft(force) {
  let payload;
  try { payload = puzzleDraftPayload(); } catch (e) { return false; }
  const json = JSON.stringify(payload);
  if (!force && json === __lastDraft) return false;
  __lastDraft = json;
  if (isDraftEmpty(payload)) { storeSet(DRAFT_KEY, JSON.stringify(Object.assign({ empty: 1 }, payload))); return true; }
  storeSet(DRAFT_KEY, JSON.stringify(Object.assign({ ts: Date.now() }, payload)));
  return true;
}

function findPuzzleById(lib, id) {
  if (!lib || !id) return null;
  for (const chap of asArray(lib.chapters)) {
    const p = asArray(chap.puzzles).find(x => x && x.id === id);
    if (p) return p;
  }
  return null;
}

function restorePuzzleDraft() {
  const d = readStoredJson(DRAFT_KEY);
  if (!d || d.empty || isDraftEmpty(d)) return false;
  let applied = 0;
  try {
    const lib = getLibrary();
    const saved = findPuzzleById(lib, lib.activePuzzleId);
    // Only bring the form back when it differs from what is already saved,
    // otherwise loadPuzzleToEditor() has already filled it correctly.
    const dirty = !saved || saved.title !== d.title || saved.solution !== d.solution ||
      saved.description !== d.description || (d.fen && saved.fen !== d.fen);
    if (!dirty) return false;
    if (fieldVal('puzzleTitle') === d.title && fieldVal('puzzleSolution') === d.solution) return false;
    setFieldVal('puzzleTitle', d.title); applied++;
    setFieldVal('puzzleDescription', d.description);
    setFieldVal('puzzleSolution', d.solution); applied++;
    setFieldVal('puzzleDifficulty', d.difficulty || '3');
    setFieldVal('puzzleTags', d.tags);
    setFieldVal('puzzleFen', d.fen);
    if (d.editorFen && typeof puzzleGame === 'function' && puzzleGame()) {
      try {
        puzzleGame().load(d.editorFen);           // the editor's own board
        state.game.load(d.editorFen);             // keep the visible board in step
        state.history = [];
        state.historyIndex = -1;
        if (typeof updateFenDisplay === 'function') updateFenDisplay(d.editorFen);
        applied++;
      } catch (e) {}
    }
  } catch (e) { return false; }
  return applied > 0;
}

// ---------- restore ----------

function applySession(s) {
  try {
    if (s.fen) {
      const current = fenOf(state.game);
      if (current !== s.fen) state.game.load(s.fen);
    }
    state.history = asArray(s.history);
    state.historyIndex = (typeof s.historyIndex === 'number' &&
      s.historyIndex >= -1 && s.historyIndex < state.history.length) ? s.historyIndex : state.history.length - 1;
    state.flipped = !!s.flipped;
    document.body.dataset.flipped = state.flipped ? 'true' : 'false';
    if (s.theme && typeof setTheme === 'function' && s.theme !== state.boardTheme) setTheme(s.theme);
    if (s.pieceStyle) {
      state.pieceStyle = s.pieceStyle;
      setFieldVal('pieceStyle', s.pieceStyle);
      renderBoard();
      if (typeof initPieceRack === 'function') initPieceRack();
      if (typeof initPEPieceRack === 'function') initPEPieceRack();
    }
    if (s.color) state.currentColor = s.color;
    // the drawing tool you left selected, so an F5 does not silently put you
    // back on 'select' mid-lesson
    if (s.tool && s.tool !== state.currentTool && typeof setTool === 'function') setTool(s.tool);
    state.arrows = asArray(s.arrows);
    state.circles = asArray(s.circles);
    state.highlights = asArray(s.highlights);
    state.rectangles = asArray(s.rectangles);
    state.triangles = asArray(s.triangles);
    state.hexagons = asArray(s.hexagons);
    const su = s.setup || {};
    ['whiteCastleK', 'whiteCastleQ', 'blackCastleK', 'blackCastleQ', 'halfmove', 'fullmove'].forEach(k => {
      if (su[k] !== undefined) setFieldVal('opt' + k.charAt(0).toUpperCase() + k.slice(1), su[k]);
    });
    const en = s.engine || {};
    if (en.depth) { setFieldVal('engineDepth', en.depth); state.engine.depth = en.depth; }
    if (en.multipv) { setFieldVal('engineMultiPV', en.multipv); state.engine.multipv = en.multipv; }
    if (s.clock) {
      if (typeof s.clock.wTime === 'number') state.clock.wTime = s.clock.wTime;
      if (typeof s.clock.bTime === 'number') state.clock.bTime = s.clock.bTime;
      state.clock.running = false;                     // a timer is never resumed
      if (typeof updateClocks === 'function') updateClocks();
    }
    if (s.mode === 'setup') {
      if (s.setupEditing === false || s.setupMode === false) {
        state.setupMode = false;
        document.body.dataset.setupEditing = 'false';
      } else {
        state.setupMode = true;
        document.body.dataset.setupEditing = 'true';
      }
    }
  } catch (e) {
    console.error('applySession failed', e);
  }
}

function resumeLabel(mode, s) {
  const names = { normal: 'Normal mode', puzzle: 'Puzzle mode', setup: 'Custom Setup' };
  const bits = [];
  const n = asArray(s.history).length;
  if (n) bits.push(n + (n === 1 ? ' move' : ' moves'));
  const drawn = asArray(s.arrows).length + asArray(s.circles).length +
    asArray(s.highlights).length + asArray(s.rectangles).length;
  if (drawn) bits.push(drawn + (drawn === 1 ? ' marking' : ' markings'));
  try {
    const puz = findPuzzleById(getLibrary(), s.activePuzzleId);
    if (puz && puz.title) bits.push('“' + puz.title + '”');
  } catch (e) {}
  return 'Resumed ' + (names[mode] || mode || 'where you left off') +
    (bits.length ? ' — ' + bits.join(', ') : '');
}

function isRestorable(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.mode && s.mode !== 'front') return true;
  if (asArray(s.history).length) return true;
  if (asArray(s.arrows).length + asArray(s.circles).length +
      asArray(s.highlights).length + asArray(s.rectangles).length) return true;
  return !!s.fen && s.fen.indexOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') !== 0;
}

/**
 * Boot entry point: bring the user back to the mode, position and markings they
 * had, instead of always landing on the mode picker with a wiped board.
 * Called at the end of doInit(), replacing the old unconditional showFrontPage().
 */
function restoreSession() {
  const s = readStoredJson(SESSION_KEY);
  if (!isRestorable(s)) { showFrontPage(); startSessionWatch(); return false; }

  const mode = ['normal', 'puzzle', 'setup'].indexOf(s.mode) >= 0 ? s.mode : 'normal';
  let draftBack = false;
  try { setMode(mode); } catch (e) { showFrontPage(); startSessionWatch(); return false; }

  if (mode === 'puzzle') {
    // Entering puzzle mode turns authoring on with a blank new puzzle; the user
    // was not necessarily editing, and re-arming the piece editor here is what
    // used to make the board feel stuck after a reload.
    try { if (typeof setAuthoringMode === 'function') setAuthoringMode(false); } catch (e) {}
    try {
      if (s.activePuzzleId && typeof loadPuzzleToEditor === 'function') {
        loadPuzzleToEditor(s.activePuzzleId);
        // loadPuzzleToEditor() fills the form but does not claim the pointer,
        // and entering puzzle mode nulled it - so write it back, otherwise the
        // next SAVE creates a duplicate puzzle instead of updating this one.
        const lib = getLibrary();
        if (findPuzzleById(lib, s.activePuzzleId)) {
          lib.activePuzzleId = s.activePuzzleId;
          saveLibrary(lib);
          if (typeof renderLibrary === 'function') renderLibrary($('librarySearch') ? $('librarySearch').value : '');
        }
      }
    } catch (e) {}
    try { draftBack = restorePuzzleDraft(); } catch (e) {}
  } else if (mode === 'setup') {
    if (s.setupEditing === false || s.setupMode === false) {
      state.setupMode = false;
      document.body.dataset.setupEditing = 'false';
    } else {
      state.setupMode = true;
      document.body.dataset.setupEditing = 'true';
    }
  }

  applySession(s);
  renderAll();
  startSessionWatch();
  const label = resumeLabel(mode, s);
  toast(draftBack ? (label + ' · unsaved puzzle draft restored') : label, 'success');
  return true;
}

// ---------- wiring ----------

function flushSession() {
  saveSession(true);
  try { savePuzzleDraft(true); } catch (e) {}
}

function startSessionWatch() {
  __sessionReady = true;
  if (__watchStarted) return;
  __watchStarted = true;
  __lastPayload = JSON.stringify(sessionPayload());

  __sessionTimer = setInterval(() => { if (!document.hidden) saveSession(); }, 1500);

  // reload / close: pagehide is the reliable one, beforeunload kept for older
  // browsers; both write synchronously so nothing typed is lost
  window.addEventListener('pagehide', flushSession);
  window.addEventListener('beforeunload', flushSession);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushSession(); });

  // the puzzle form is user data too, and it is the part that vanished most
  const formIds = ['puzzleTitle', 'puzzleDescription', 'puzzleSolution', 'puzzleTags', 'puzzleFen', 'puzzleDifficulty', 'puzzleChapterSelect'];
  formIds.forEach(id => {
    const el = $(id);
    if (!el) return;
    const onInput = () => { try { savePuzzleDraft(); } catch (e) {} };
    el.addEventListener('input', onInput);
    el.addEventListener('change', onInput);
  });

  ['optWhiteCastleK', 'optWhiteCastleQ', 'optBlackCastleK', 'optBlackCastleQ', 'optHalfmove', 'optFullmove',
   'engineDepth', 'engineMultiPV', 'pieceStyle'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', () => saveSession(true));
  });

  // after a SAVE the draft is no longer "unsaved"
  ['btnSavePuzzle', 'btnAuthoringSave'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('click', () => setTimeout(() => { try { savePuzzleDraft(true); saveSession(true); } catch (e) {} }, 120));
  });
}

function stopSessionWatch() {           // exposed for tests / debugging
  if (__sessionTimer) { clearInterval(__sessionTimer); __sessionTimer = null; }
  __sessionReady = false;
}
