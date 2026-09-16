// ============================================
// BOARD INTERACTIONS
// ============================================
// Unified interaction model for mouse AND touch:
//   • LEFT CLICK on piece/square: normal chess move / piece selection (or setup pick/place)
//   • LEFT DRAG (sqA -> sqB):
//       - in setup editing: moves piece from sqA to sqB (NO arrows/drawings)
//       - in normal mode / after START FROM POSITION: a rectangle click marks
//         one fitted square, eraser is click-only, every other tool = arrow
//   • LEFT CLICK: the selected tool does its job (select = chess), through a
//       short double-click window; a DOUBLE left click takes back what the
//       first click of that pair put down - and never anything older
//   • RIGHT CLICK / RIGHT DRAG:
//       - while editing a position (setup editing OR puzzle authoring): erases
//         the piece at square (NO drawings)
//       - while teaching / playing in ANY mode: always the ARROW (drag, or
//         click the origin square then the target square)
//   • Drag threshold: DRAG_SLOP_PX (10px) to prevent accidental drags during clicks.
const DRAG_SLOP_PX = 10;

let pressSquare = null;    // square the pointer went down on
let pressX = 0;
let pressY = 0;
let pressButton = 0;       // 0 = left, 2 = right
let pressDetail = 1;       // mousedown detail: 2 = second click of a double click
let pressMoved = false;    // pointer travelled past the slop -> this is a real drag
let pressConsumed = false; // a mode already acted on the press -> ignore the release
let touchHandledPress = false;
let lastTouchAt = 0;       // when the last real touch gesture was seen
let lastRightEditSquare = null;
let lastRightEditAt = 0;
let setupDeferredRack = null;  // rack piece waiting to see if the press is a click or a drag
const TOUCH_SUPPRESS_MS = 800;

// A tap on a phone makes Chrome replay the gesture as synthetic
// mousedown/mousemove/mouseup/click right after touchend. Handled twice, a tap
// on a piece selected it and then deselected it, and a tap with a drawing tool
// looked like a double click and reversed whatever the first pass had drawn -
// so on touch devices the tools appeared to do nothing at all. Every mouse
// handler therefore refuses a gesture that came from a finger.
function pressCameFromTouch(e) {
  if (e && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents === true) return true;
  return (Date.now() - lastTouchAt) < TOUCH_SUPPRESS_MS;
}

function onSquareMouseDown(e) {
  if (pressCameFromTouch(e)) return;
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
  beginSquarePress(e.target.closest('.square'), e.clientX, e.clientY, e.button, e.detail);
}

function onSquareMouseMove(e) {
  if (pressCameFromTouch(e)) return;
  if (pressSquare === null || pressMoved) return;
  if (Math.hypot(e.clientX - pressX, e.clientY - pressY) > DRAG_SLOP_PX) {
    pressMoved = true;
  }
}

function onSquareMouseUp(e) {
  if (pressCameFromTouch(e)) return;
  endSquarePress(e.target.closest('.square'), e.clientX, e.clientY);
}

// Touch: phones/tablets fire synthetic mouse events after a tap, and those can
// land on the wrong square (or not at all once the page scrolls). Handle the
// touch directly and swallow the emulated mouse pair for this tap.
function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchHandledPress = true;
  lastTouchAt = Date.now();
  const el = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(t.clientX, t.clientY) : null;
  beginSquarePress(el ? el.closest('.square') : null, t.clientX, t.clientY, 0);
}

function onTouchMove(e) {
  if (!touchHandledPress || e.touches.length !== 1) return;
  lastTouchAt = Date.now();
  const t = e.touches[0];
  if (pressSquare !== null && !pressMoved &&
      Math.hypot(t.clientX - pressX, t.clientY - pressY) > DRAG_SLOP_PX) {
    pressMoved = true;
  }
  // Only claim the gesture once it really is a drag (arrow drawing), so the
  // page can still be scrolled with a plain swipe.
  if (pressMoved && e.preventDefault) e.preventDefault();
}

function onTouchEnd(e) {
  if (!touchHandledPress) return;
  touchHandledPress = false;
  lastTouchAt = Date.now();
  const t = (e.changedTouches && e.changedTouches[0]) || null;
  const target = (t && typeof document.elementFromPoint === 'function') ? document.elementFromPoint(t.clientX, t.clientY) : null;
  // The gesture is fully handled here, so the emulated mouse pair (and the
  // click that follows it) must never reach the board - a tap is not two taps.
  if (e.cancelable && e.preventDefault) e.preventDefault();
  endSquarePress(target ? target.closest('.square') : null, t ? t.clientX : 0, t ? t.clientY : 0);
}

// The right button owns the arrow ONLY while teaching / playing. During any
// kind of position editing - Custom Setup editing, or puzzle authoring - the
// right button keeps its building job (erase the piece under the cursor),
// because that is what setting up a position needs. Same rule in every mode.
function isEditingPosition() {
  return state.setupMode === true ||
         (typeof isAuthoringMode === 'function' && isAuthoringMode() === true);
}

function rightButtonIsArrow() {
  return !isEditingPosition();
}

function beginSquarePress(sq, x, y, button, detail) {
  pressConsumed = false;
  pressDetail = (detail >= 2) ? 2 : 1;

  if (!sq) return;
  const sqName = sq.dataset.square;

  pressSquare = sqName;
  pressX = x || 0;
  pressY = y || 0;
  pressButton = (button !== undefined) ? button : 0;
  pressMoved = false;

  // RIGHT-CLICK:
  if (pressButton === 2) {
    // Editing a position (setup editing OR puzzle authoring): the right
    // button erases the piece immediately - no drawing, no arrow.
    if (isEditingPosition()) {
      pressConsumed = true;
      // Puzzle authoring also sets setupMode so the piece editor can use the
      // same board gesture. Check authoring first or a right-click would erase
      // only the main setup state and bypass the puzzle editor's undo history.
      lastRightEditSquare = sqName;
      lastRightEditAt = Date.now();
      if (typeof isAuthoringMode === 'function' && isAuthoringMode() && typeof peErasePiece === 'function') {
        peErasePiece(sqName);
      } else if (state.setupMode) {
        erasePieceAt(sqName);
      }
      return;
    }
    // Teaching / playing (Normal, Setup after START FROM POSITION, Puzzle
    // saved/selected or under test): the release becomes an arrow gesture.
    return;
  }

  // LEFT-CLICK:
  // AUTHORING MODE (puzzle edit) acts on the PRESS
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

  // SETUP MODE (while editing position):
  if (state.setupMode) {
    // If a piece is already held from the rack or board:
    if (state.heldPiece) {
      const occupant = (typeof getPieceAt === 'function') ? getPieceAt(sqName) : null;
      // A rack piece stays held so several of them can be stamped out, but that
      // used to make every press on an OCCUPIED square place a copy - so the
      // piece already on the board could not be dragged anywhere ("drag pieces
      // too" simply did nothing after picking something from the rack). Let the
      // gesture decide instead: a drag moves the board piece, a plain click
      // still replaces it with the held rack piece.
      if (occupant && state.heldPiece.source === 'rack') {
        setupDeferredRack = state.heldPiece.piece;
        state.heldPiece = null;
        state.selectedRackPiece = null;
        $$('.rack-piece').forEach(x => x.classList.remove('selected'));
        pickPieceFromBoard(sqName);
        return;                    // not consumed - the release decides
      }
      pressConsumed = true;
      placePieceOnSetup(sqName, state.heldPiece.piece);
      return;
    }

    // If square has a piece, pick it up (user may click target square or drag to target square)
    const piece = getPieceAt(sqName);
    if (piece) {
      pickPieceFromBoard(sqName);
      // Do not mark consumed immediately so drag-to-move can complete on mouseup
      return;
    }

    // Empty square with no piece held: consume press, no-op
    pressConsumed = true;
    return;
  }

  // NORMAL MODE / PLAY MODE:
  // Do not consume press; endSquarePress will handle click vs drag.
}

function endSquarePress(sq, x, y) {
  // The release landed off the board: drop the gesture
  if (!sq) { cancelSquarePress(); return; }

  const sqName = sq.dataset.square;
  const from = pressSquare;
  const moved = pressMoved;
  const btn = pressButton;
  const dbl = pressDetail === 2;
  const consumed = pressConsumed;
  const deferredRack = setupDeferredRack;   // read before the press state is cleared

  cancelSquarePress(true);                  // this release completes a gesture

  if (consumed) return;

  const isDrag = !!(moved && from && from !== sqName);

  // 1. SETUP MODE:
  if (state.setupMode) {
    if (isDrag && from && state.heldPiece) {
      // Piece was dragged from `from` to `sqName`
      placePieceOnSetup(sqName, state.heldPiece.piece);
      state.heldPiece = null;
      state.selectedRackPiece = null;
      $$('.rack-piece').forEach(x => x.classList.remove('selected'));
      // If a rack piece was in hand when the drag started, hand it back: moving
      // a piece out of the way must not cost the teacher the piece they were
      // about to stamp down.
      if (deferredRack) {
        state.heldPiece = { piece: deferredRack, source: 'rack' };
        state.selectedRackPiece = deferredRack;
        const rackEl = document.querySelector(`.rack-piece[data-piece="${deferredRack}"]`);
        if (rackEl) rackEl.classList.add('selected');
      }
      highlightDropSquares();
      updateSetupHint();
    } else if (deferredRack && from) {
      // The press on an occupied square turned out to be a click, not a drag:
      // the held rack piece replaces what was there, and stays held.
      const held = deferredRack;
      state.heldPiece = { piece: held, source: 'rack' };
      placePieceOnSetup(sqName, held);
      state.heldPiece = { piece: held, source: 'rack' };
      state.selectedRackPiece = held;
      const rackEl = document.querySelector(`.rack-piece[data-piece="${held}"]`);
      if (rackEl) rackEl.classList.add('selected');
      highlightDropSquares();
      updateSetupHint();
    }
    // Setup mode NEVER creates any annotations
    return;
  }

  // 2. RIGHT CLICK / RIGHT DRAG: the right button is ALWAYS the arrow while
  //    teaching / playing - in Normal, in Custom Setup after START FROM
  //    POSITION, and in Puzzle mode once you are out of authoring - whether or
  //    not the arrow tool is selected in the palette. While editing a position
  //    the press already erased a piece and was consumed, so nothing reaches
  //    here; the guard is a belt-and-braces second lock.
  if (btn === 2) {
    if (!rightButtonIsArrow()) return;
    __lastPlaced = null;
    handleRightClickOrDrag(from, sqName, isDrag);
    return;
  }

  // 3. LEFT DRAG (Normal Mode & After START FROM POSITION):
  if (isDrag) {
    cancelLeftAction();   // a drag is not a click: drop any pending place
    __lastPlaced = null;  // ...and the take-back context goes with it
    if (state.drawingFrom) { state.drawingFrom = null; highlightSquares(); }
    if (state.currentTool === 'rectangle') {
      // A box is a one-square mark. Do not turn a drag into a large
      // out-of-square rectangle; click the square to place the fitted box.
      return;
    } else if (state.currentTool === 'eraser') {
      // Eraser is intentionally click-only. Holding and dragging it used to
      // erase both end squares, which made it too easy to remove drawings by
      // accident. The single-click path below is its only action.
      return;
    } else {
      // Left-drag ALWAYS draws an arrow!
      addArrow(from, sqName);
    }
    return;
  }

  // 4. LEFT CLICK with 'select': chess move / piece selection, instantly.
  if (state.currentTool === 'select') {
    handleSquareClick(sqName);
    return;
  }

  // 5. LEFT CLICK with the remaining drawing tools: the selected tool does its
  //    job through a double-click window, because a DOUBLE left click on a
  //    square reverses whatever the left click put there (every tool except
  //    select, with Rectangle/Eraser handled immediately below). The second
  //    click of a double click (mousedown detail 2) reverses at once.
  if (dbl) {
    cancelLeftAction();
    // Second click of a real double click: if the first one only marked an
    // arrow origin, drop that mark; if it actually drew something, take that
    // something back. Drawings that were already on the board stay.
    if (state.drawingFrom === sqName) { state.drawingFrom = null; highlightSquares(); return; }
    if (takeBackMatches(sqName)) takeBack(sqName);
    return;
  }

  // Rectangle and eraser are deliberately immediate click tools. They do not
  // need the drawing tools' double-click delay: a single eraser click must
  // erase now, and a one-square box must appear on that click. A later second
  // click still reaches the double-click branch above and can take back a box
  // that this click placed.
  if (state.currentTool === 'rectangle' || state.currentTool === 'eraser') {
    flushLeftAction();
    if (state.currentTool === 'rectangle') {
      const before = state.rectangles.length;
      addRectangle(sqName, sqName);
      if (state.rectangles.length > before) notePlaced(sqName);
      else __lastPlaced = null;
    } else {
      __lastPlaced = null;
      eraseAnnotationAt(sqName);
    }
    return;
  }

  scheduleLeftAction(sqName);
}

// ---- left click: single = place, double = take back -----------------------
let __leftTimer = null;
let __leftSq = null;
let __lastPlaced = null;       // { sq, tool, color, at } of the last real placement
let __suppressSq = null;       // square whose next click is swallowed ...
let __suppressUntil = 0;       // ... because it was the 2nd click of a take-back
const LEFT_DBL_MS = 260;       // window in which a second click is a double click
const LEFT_TAKEBACK_MS = 900;  // window in which a repeat click takes it back

function cancelLeftAction() {
  if (__leftTimer) { clearTimeout(__leftTimer); __leftTimer = null; }
  __leftSq = null;
}

function flushLeftAction() {
  if (!__leftTimer) return;
  clearTimeout(__leftTimer);
  __leftTimer = null;
  const sq = __leftSq;
  __leftSq = null;
  placeWithTool(sq);
}

// A repeat click may only take back what THIS click sequence put on the board:
// same square, same tool, same colour, and just now. Anything older - a shape
// from a minute ago, an arrow drawn with the right button - is left untouched,
// so a double click can never destroy work that was already there.
function takeBackMatches(sq) {
  return !!__lastPlaced &&
         __lastPlaced.sq === sq &&
         __lastPlaced.tool === state.currentTool &&
         __lastPlaced.color === state.currentColor &&
         (Date.now() - __lastPlaced.at) <= LEFT_TAKEBACK_MS;
}

function notePlaced(sq) {
  __lastPlaced = { sq: sq, tool: state.currentTool, color: state.currentColor, at: Date.now() };
}

// A take-back is usually the first half of a double click. Swallowing the click
// that follows it keeps the pair a pair - otherwise the second click would put
// the shape straight back and the board would only flicker.
function suppressNextClick(sq) {
  __suppressSq = sq;
  __suppressUntil = Date.now() + LEFT_DBL_MS;
}

function clickSuppressed(sq) {
  if (__suppressSq === sq && Date.now() <= __suppressUntil) {
    __suppressSq = null; __suppressUntil = 0;
    return true;
  }
  return false;
}

function takeBack(sq) {
  __lastPlaced = null;
  eraseAnnotationAt(sq);
  suppressNextClick(sq);
}

function scheduleLeftAction(sq) {
  if (__leftTimer && __leftSq === sq) {   // second click inside the window ...
    cancelLeftAction();                   // ...the first one placed nothing yet
    if (state.drawingFrom === sq) { state.drawingFrom = null; highlightSquares(); return; }
    if (takeBackMatches(sq)) takeBack(sq);
    return;
  }
  flushLeftAction();                      // a pending place on another square
  if (clickSuppressed(sq)) return;        // 2nd click of a take-back pair
  if (takeBackMatches(sq)) {              // slower second click: take it back
    takeBack(sq);
    return;
  }
  __leftSq = sq;
  __leftTimer = setTimeout(() => {
    __leftTimer = null;
    __leftSq = null;
    placeWithTool(sq);
  }, LEFT_DBL_MS);
}

// Puts the selected tool to work on one square. Returns true only when the
// click really added a drawing - an origin mark, a cancelled origin, a shape
// that was already there and an eraser swipe all return false, which is what
// keeps the double-click take-back honest.
function placeWithTool(sq) {
  if (!sq) return false;
  const tool = state.currentTool;

  if (tool === 'arrow') {
    if (!state.drawingFrom) {             // first click: mark the origin square
      state.drawingFrom = sq;
      highlightSquares();
      return false;
    }
    const from = state.drawingFrom;
    state.drawingFrom = null;
    if (from === sq) { highlightSquares(); return false; }   // clicked origin again: cancel
    const before = state.arrows.length;
    addArrow(from, sq);
    highlightSquares();
    if (state.arrows.length > before) { notePlaced(sq); return true; }
    __lastPlaced = null;
    return false;
  }

  // All square marks, including Rect, are placed by one click and are fitted
  // inside that square. Rect used to share the arrow's two-click range logic,
  // which is why a test click could produce a box several squares wide.
  if (tool === 'circle' || tool === 'highlight' || tool === 'rectangle' ||
      tool === 'triangle' || tool === 'hexagon') {
    if (tool === 'rectangle') {
      const before = state.rectangles.length;
      addRectangle(sq, sq);
      if (state.rectangles.length > before) { notePlaced(sq); return true; }
      __lastPlaced = null;
      return false;
    }
    const kind = (tool === 'circle') ? 'circles'
               : (tool === 'highlight') ? 'highlights'
               : (tool === 'triangle') ? 'triangles' : 'hexagons';
    const before = state[kind].length;
    addShapeOnce(kind, sq);
    if (state[kind].length > before) { notePlaced(sq); return true; }
    __lastPlaced = null;
    return false;
  }

  if (tool === 'eraser') { __lastPlaced = null; eraseAnnotationAt(sq); return false; }
  return false;
}

// The right button owns ONE job in play modes: the arrow. A drag draws it in a
// single gesture; two single clicks work as well (first click marks the origin
// square, second click finishes the arrow, clicking the origin again cancels).
// Which tool is selected in the palette makes no difference here.
function handleRightClickOrDrag(from, to, isDrag) {
  if (isDrag && from && to && from !== to) {
    state.rightArrowFrom = null;
    addArrow(from, to);
    return;
  }
  if (!from) return;
  if (!state.rightArrowFrom) {
    state.rightArrowFrom = from;
  } else if (state.rightArrowFrom === from) {
    state.rightArrowFrom = null;
  } else {
    addArrow(state.rightArrowFrom, from);
    state.rightArrowFrom = null;
  }
  highlightSquares();
}

function cancelSquarePress(fromRelease) {
  pressSquare = null;
  pressMoved = false;
  pressConsumed = false;
  pressButton = 0;
  pressDetail = 1;
  // A gesture that was DROPPED (Esc, release off the board, lost focus) must
  // hand the teacher their rack piece back instead of leaving them holding the
  // piece that happened to be under the cursor. A release that is completing
  // the gesture (fromRelease) decides for itself in endSquarePress.
  if (setupDeferredRack) {
    const held = setupDeferredRack;
    setupDeferredRack = null;
    if (state.setupMode && !fromRelease) {
      // the temporary pick-up of the board piece is over: hand back the rack
      // piece the teacher was actually holding
      state.heldPiece = { piece: held, source: 'rack' };
      state.selectedRackPiece = held;
      const rackEl = document.querySelector(`.rack-piece[data-piece="${held}"]`);
      if (rackEl) rackEl.classList.add('selected');
      if (typeof updateSetupHint === 'function') updateSetupHint();
    }
  }
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

function isPromotionMove(from, to) {
  try {
    const piece = state.game.get(from);
    if (!piece || piece.type !== 'p') return false;
    const isWhite = piece.color === 'w';
    if ((isWhite && from[1] === '7' && to[1] === '8') || (!isWhite && from[1] === '2' && to[1] === '1')) {
      const legal = state.game.moves({ verbose: true });
      return legal.some(m => m.from === from && m.to === to && m.promotion);
    }
  } catch (e) {}
  return false;
}

function showPromotionDialog(from, to, color) {
  state.pendingPromotion = { from, to, color };
  const overlay = $('promotionOverlay');
  if (!overlay) return;

  const piecesContainer = $('promotionPieces');
  if (piecesContainer) {
    piecesContainer.innerHTML = '';
    const promoOptions = [
      { type: 'q', name: 'Queen', key: 'Q / 1', fenChar: color === 'w' ? 'Q' : 'q' },
      { type: 'r', name: 'Rook', key: 'R / 2', fenChar: color === 'w' ? 'R' : 'r' },
      { type: 'b', name: 'Bishop', key: 'B / 3', fenChar: color === 'w' ? 'B' : 'b' },
      { type: 'n', name: 'Knight', key: 'N / 4', fenChar: color === 'w' ? 'N' : 'n' },
    ];

    promoOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'promotion-option';
      btn.dataset.piece = opt.type;
      btn.title = `${opt.name} (${opt.key})`;
      btn.setAttribute('aria-label', opt.name);

      const svg = typeof getPieceSvg === 'function' ? getPieceSvg(opt.fenChar, state.pieceStyle) : null;
      if (svg) {
        btn.innerHTML = svg;
      } else {
        btn.textContent = opt.name[0];
      }

      const keyLabel = document.createElement('span');
      keyLabel.className = 'promotion-option-key';
      keyLabel.textContent = opt.type.toUpperCase();
      btn.appendChild(keyLabel);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        choosePromotion(opt.type);
      });

      piecesContainer.appendChild(btn);
    });
  }

  const cancelBtn = $('btnPromoCancel');
  if (cancelBtn && !cancelBtn._promoBound) {
    cancelBtn._promoBound = true;
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelPromotionDialog();
    });
  }

  if (!overlay._promoBound) {
    overlay._promoBound = true;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cancelPromotionDialog();
      }
    });
  }

  overlay.style.display = 'flex';
  void overlay.offsetWidth;
  overlay.classList.add('show');
}

function choosePromotion(pieceType) {
  if (!state.pendingPromotion) return;
  const { from, to } = state.pendingPromotion;
  cancelPromotionDialog();
  tryMakeMove(from, to, pieceType);
}

function cancelPromotionDialog() {
  state.pendingPromotion = null;
  const overlay = $('promotionOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      if (!state.pendingPromotion) overlay.style.display = 'none';
    }, 150);
  }
  state.selectedSquare = null;
  highlightSquares();
}

function tryMakeMove(from, to, promotion = null) {
  if (!promotion && isPromotionMove(from, to)) {
    const piece = state.game.get(from);
    const color = piece ? piece.color : state.game.turn();
    showPromotionDialog(from, to, color);
    return true;
  }

  const promoPiece = promotion || 'q';
  let result = null;
  try {
    result = state.game.move({ from, to, promotion: promoPiece });
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
  playPieceMoveSound(result);

  // A real move was made: hand the clock over (it used to switch on any board
  // click, so drawing an arrow also flipped whose time was running).
  try {
    if (state.clock && state.clock.running) {
      // a move that ends the game stops the clock instead of switching it
      const ended = typeof stopClockIfGameIsOver === 'function' && stopClockIfGameIsOver();
      if (!ended && typeof switchClockSide === 'function') switchClockSide();
    }
  } catch (e) {}

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
