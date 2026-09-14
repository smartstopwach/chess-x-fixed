// ============================================
// BOARD INTERACTIONS
// ============================================
// One unified "press → release" model for mouse AND touch:
//   • press + release on the SAME square  → CLICK  → select piece / make chess move
//   • press on one square, release on another → DRAG → draw an arrow
// A tiny hand wobble while clicking must NOT be mistaken for a drag, so the
// release square only counts as a drag target once the pointer has actually
// travelled more than DRAG_SLOP_PX.
const DRAG_SLOP_PX = 10;

let pressSquare = null;    // square the pointer went down on
let pressX = 0;
let pressY = 0;
let pressMoved = false;    // pointer travelled past the slop -> this is a real drag
let pressConsumed = false; // a mode already acted on the press -> ignore the release
let touchHandledPress = false;

function onSquareMouseDown(e) {
  // Stop the browser from starting a native image/text drag or a text
  // selection — either one silently swallows the matching mouseup and the
  // move never happens.
  if (e.cancelable) e.preventDefault();
  // preventDefault() also blocks the usual focus change, so drop the caret out
  // of any text field by hand — otherwise the keyboard shortcuts stay muted
  // (they ignore keys while an input has focus) after typing in the FEN box.
  const ae = document.activeElement;
  if (ae && ae !== document.body && typeof ae.blur === 'function' &&
      ae.matches('input, textarea, select')) {
    ae.blur();
  }
  beginSquarePress(e.target.closest('.square'), e.clientX, e.clientY, e.button);
}

function onSquareMouseMove(e) {
  if (pressSquare === null || pressMoved) return;
  if (Math.abs(e.clientX - pressX) > DRAG_SLOP_PX ||
      Math.abs(e.clientY - pressY) > DRAG_SLOP_PX) {
    pressMoved = true;
  }
}

function onSquareMouseUp(e) {
  endSquarePress(e.target.closest('.square'), e.clientX, e.clientY);
}

// Touch: phones/tablets fire synthetic mouse events after a tap, and those can
// land on the wrong square (or not at all once the page scrolls). Handle the
// touch directly and swallow the emulated mouse pair for this tap.
function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchHandledPress = true;
  beginSquarePress(document.elementFromPoint(t.clientX, t.clientY), t.clientX, t.clientY, 0);
}

function onTouchMove(e) {
  if (!touchHandledPress || e.touches.length !== 1) return;
  const t = e.touches[0];
  if (pressSquare !== null && !pressMoved &&
      (Math.abs(t.clientX - pressX) > DRAG_SLOP_PX ||
       Math.abs(t.clientY - pressY) > DRAG_SLOP_PX)) {
    pressMoved = true;
  }
  // Only claim the gesture once it really is a drag (arrow drawing), so the
  // page can still be scrolled with a plain swipe.
  if (pressMoved) e.preventDefault();
}

function onTouchEnd(e) {
  if (!touchHandledPress) return;
  touchHandledPress = false;
  const t = (e.changedTouches && e.changedTouches[0]) || null;
  const target = t ? document.elementFromPoint(t.clientX, t.clientY) : null;
  if (pressMoved) e.preventDefault();
  endSquarePress(target ? target.closest('.square') : null, t ? t.clientX : 0, t ? t.clientY : 0);
}

function beginSquarePress(sq, x, y, button) {
  pressConsumed = false;

  if (!sq) return;
  const sqName = sq.dataset.square;

  // Right-click never starts a drag/press gesture.
  if (button === 2) {
    pressConsumed = true;
    if (state.setupMode) erasePieceAt(sqName);
    return;
  }

  pressSquare = sqName;
  pressX = x || 0;
  pressY = y || 0;
  pressMoved = false;

  // AUTHORING MODE (puzzle edit) acts on the PRESS, so the matching release
  // must not be replayed as a second click (that used to deselect the piece
  // the instant it was picked up).
  //   rack piece held -> place it anywhere | board piece -> select / move it
  //   freely | illegal target -> select the piece just clicked instead.
  if (isAuthoringMode()) {
    pressConsumed = true;

    if (puzzleState.heldPiece && !puzzleState.heldPiece.source) {
      pePlacePiece(sqName, puzzleState.heldPiece.piece);
      if (puzzleGame()) puzzleGame().load(state.game.fen());
      return;
    }

    const piece = getPieceAt(sqName);

    if (!state.selectedSquare) {
      if (piece) state.selectedSquare = sqName;
      highlightSquares();
      return;
    }

    if (state.selectedSquare === sqName) {
      state.selectedSquare = null;
      highlightSquares();
      return;
    }

    if (!peMakeMove(state.selectedSquare, sqName)) {
      state.selectedSquare = piece ? sqName : null;
      highlightSquares();
    }
    return;
  }

  // SETUP MODE - hold/place pieces; a click on a board piece picks it up.
  if (state.setupMode) {
    pressConsumed = true;
    if (state.heldPiece) {
      placePieceOnSetup(sqName, state.heldPiece.piece);
      return;
    }
    if (getPieceAt(sqName)) pickPieceFromBoard(sqName);
    return;
  }

  // Click-only annotation tools act on the press too.
  if (state.currentTool === 'circle')    { pressConsumed = true; addCircle(sqName); return; }
  if (state.currentTool === 'highlight') { pressConsumed = true; addHighlight(sqName); return; }
  if (state.currentTool === 'eraser')    { pressConsumed = true; eraseAnnotationAt(sqName); return; }

  // Arrow / rectangle tools start a shape. The select tool just waits for the
  // release to decide between "chess click" and "draw an arrow".
  if (state.currentTool === 'arrow' || state.currentTool === 'rectangle') {
    state.drawingFrom = sqName;
    state.isDrawing = true;
  }
}

function endSquarePress(sq, x, y) {
  // The release landed off the board (over a panel, the clock, a tooltip ...):
  // drop the gesture so a stale press-square can't poison the next click.
  if (!sq) { cancelSquarePress(); return; }

  const sqName = sq.dataset.square;
  const from = pressSquare;
  const moved = pressMoved;
  const tool = state.currentTool;
  // Read the pending shape BEFORE the reset below clears it.
  const beginDrawing = state.isDrawing ? state.drawingFrom : null;
  const consumed = pressConsumed;

  cancelSquarePress();

  // Authoring / setup / circle / highlight / eraser already acted on the
  // press - the release must not do anything else.
  if (consumed) return;

  // A drag only counts once the pointer really travelled. Pressing one square
  // and releasing on another *without* moving the mouse (a hand wobble, or two
  // separate taps) stays a chess click.
  const isDrag = !!(moved && from && from !== sqName);

  // Arrow / rectangle tool: a drag finishes the shape, a plain click still
  // behaves like a normal chess click (select / move / deselect).
  if (beginDrawing) {
    if (isDrag) {
      if (tool === 'arrow') addArrow(beginDrawing, sqName);
      else if (tool === 'rectangle') addRectangle(beginDrawing, sqName);
      renderAnnotations();
      return;
    }
  } else if (isDrag && tool === 'select') {
    // Select tool + a real drag = draw an arrow (left-drag always draws).
    addArrow(from, sqName);
    renderAnnotations();
    return;
  }

  // Otherwise this was a CLICK -> chess move / piece selection.
  handleSquareClick(sqName);
}

function cancelSquarePress() {
  pressSquare = null;
  pressMoved = false;
  pressConsumed = false;
  if (state.isDrawing) {
    state.isDrawing = false;
    state.drawingFrom = null;
  }
}

// A single click on a square in NORMAL mode.
function handleSquareClick(sqName) {
  // Clicking the already-selected square deselects it.
  if (state.selectedSquare === sqName) {
    state.selectedSquare = null;
    highlightSquares();
    return;
  }

  // A piece is selected → try to move it there.
  if (state.selectedSquare) {
    const from = state.selectedSquare;
    if (tryMakeMove(from, sqName)) return;

    // The move didn't happen. Never leave the board feeling dead:
    // clicking one of your own pieces re-selects it, anything else explains why.
    let piece = null;
    try { piece = state.game.get(sqName); } catch (e) {}

    if (piece && piece.color === state.game.turn()) {
      state.selectedSquare = sqName;
      highlightSquares();
      return;
    }

    state.selectedSquare = from;   // keep the piece picked up
    highlightSquares();
    rejectMove(from, sqName, piece);
    return;
  }

  // Nothing selected → pick up one of the side-to-move's pieces.
  let piece = null;
  try { piece = state.game.get(sqName); } catch (e) {}

  if (!piece) return;   // empty square, nothing to do

  if (piece.color === state.game.turn()) {
    state.selectedSquare = sqName;
    highlightSquares();
    return;
  }

  rejectMove(null, sqName, piece);
}

function turnName(color) { return color === 'w' ? 'White' : 'Black'; }

// pieceName() wants a FEN letter ('P' / 'p'). chess.js hands us
// { type, color } objects, so normalise both shapes here.
function pieceLetter(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  if (p.type) return p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
  return null;
}

function rejectMove(from, to, piece) {
  const el = showSquare(to);
  if (el) {
    el.classList.remove('square-reject');
    void el.offsetWidth;              // restart the animation
    el.classList.add('square-reject');
    setTimeout(() => el.classList.remove('square-reject'), 450);
  }

  const turn = state.game.turn();
  const toName = pieceName(pieceLetter(piece));

  // Clicked a piece that isn't yours to move.
  if (piece && piece.color !== turn) {
    if (!from) {
      toast(`${turnName(turn)} to move — ${toName} cannot be selected right now`, 'error');
    } else {
      toast(`Illegal move — ${toName} belongs to ${turnName(piece.color)}`, 'error');
    }
    return;
  }

  // Your own piece, but that square isn't reachable (blocked / wrong shape /
  // would leave the king in check — chess.js hides all of those).
  if (from) {
    toast(`${pieceName(pieceLetter(getPieceAt(from)))} cannot go to ${to}`, 'error');
  }
}

function tryMakeMove(from, to) {
  let result = null;
  try {
    result = state.game.move({ from, to, promotion: 'q' });
  } catch (e) {
    return false;          // chess.js rejects the move object outright
  }
  if (!result) return false;

  // The move is on the board now — commit the bookkeeping first so that a
  // failure anywhere in the UI refresh can never report "move failed" for a
  // move that actually happened (that used to leave the piece stuck and show
  // a bogus "Illegal move" toast).
  state.selectedSquare = null;
  // Append the new SAN to our persistent history, dropping any redo branch
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(result.san);
  state.historyIndex = state.history.length - 1;

  renderAll();            // fail-safe: never throws out of a single panel
  // Puzzle play mode: grade the move the user just made.
  try { if (state.puzzle) onPuzzleMovePlayed(result.san); } catch (e) {}
  try { requestEngineEval(); } catch (e) {}
  return true;
}

// Scroll an element into view without ever throwing. scrollIntoView is
// missing/limited in some embedded webviews, and a throw here used to bubble
// up into the click handler and break move-making entirely.
function safeScrollIntoView(el, opts) {
  if (!el) return;
  try {
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView(opts || { block: 'nearest', behavior: 'smooth' });
      return;
    }
  } catch (e) {}
  try {
    const p = el.parentElement;
    if (p) p.scrollTop = Math.max(0, el.offsetTop - p.clientHeight / 2);
  } catch (e) {}
}

