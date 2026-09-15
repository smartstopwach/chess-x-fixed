// ============================================
// BOARD INTERACTIONS
// ============================================
// Unified interaction model for mouse AND touch:
//   • LEFT CLICK on piece/square: normal chess move / piece selection (or setup pick/place)
//   • LEFT DRAG (sqA -> sqB):
//       - in setup editing: moves piece from sqA to sqB (NO arrows/drawings)
//       - in normal mode / after START FROM POSITION: ALWAYS draws an arrow
//   • RIGHT CLICK / RIGHT DRAG:
//       - in setup editing: erases piece at square (NO drawings)
//       - in normal mode / after START FROM POSITION: uses selected drawing tool (circle, highlight, rect, eraser, arrow)
//   • Drag threshold: DRAG_SLOP_PX (10px) to prevent accidental drags during clicks.
const DRAG_SLOP_PX = 10;

let pressSquare = null;    // square the pointer went down on
let pressX = 0;
let pressY = 0;
let pressButton = 0;       // 0 = left, 2 = right
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
  if (Math.hypot(e.clientX - pressX, e.clientY - pressY) > DRAG_SLOP_PX) {
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
  const el = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(t.clientX, t.clientY) : null;
  beginSquarePress(el ? el.closest('.square') : null, t.clientX, t.clientY, 0);
}

function onTouchMove(e) {
  if (!touchHandledPress || e.touches.length !== 1) return;
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
  const t = (e.changedTouches && e.changedTouches[0]) || null;
  const target = (t && typeof document.elementFromPoint === 'function') ? document.elementFromPoint(t.clientX, t.clientY) : null;
  if (pressMoved && e.preventDefault) e.preventDefault();
  endSquarePress(target ? target.closest('.square') : null, t ? t.clientX : 0, t ? t.clientY : 0);
}

function beginSquarePress(sq, x, y, button) {
  pressConsumed = false;

  if (!sq) return;
  const sqName = sq.dataset.square;

  pressSquare = sqName;
  pressX = x || 0;
  pressY = y || 0;
  pressButton = (button !== undefined) ? button : 0;
  pressMoved = false;

  // RIGHT-CLICK:
  if (pressButton === 2) {
    // In setup mode, right-click erases piece immediately; no drawing
    if (state.setupMode) {
      pressConsumed = true;
      erasePieceAt(sqName);
      return;
    }
    // In puzzle authoring mode, right-click erases piece
    if (isAuthoringMode()) {
      pressConsumed = true;
      if (typeof peErasePiece === 'function') peErasePiece(sqName);
      return;
    }
    // In normal / played mode, right-click waits for release to distinguish click vs drag tool action
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
  const consumed = pressConsumed;

  cancelSquarePress();

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
      highlightDropSquares();
      updateSetupHint();
    }
    // Setup mode NEVER creates any annotations
    return;
  }

  // 2. RIGHT CLICK / RIGHT DRAG (Drawing Tools):
  if (btn === 2) {
    handleRightClickOrDrag(from, sqName, isDrag);
    return;
  }

  // 3. LEFT DRAG (Normal Mode & After START FROM POSITION):
  if (isDrag) {
    if (state.currentTool === 'rectangle') {
      addRectangle(from, sqName);
    } else if (state.currentTool === 'eraser') {
      eraseAnnotationAt(from);
      eraseAnnotationAt(sqName);
    } else {
      // Left-drag ALWAYS draws an arrow!
      addArrow(from, sqName);
    }
    return;
  }

  // 4. LEFT CLICK with active drawing tool:
  if (state.currentTool === 'arrow') {
    if (!state.drawingFrom) {
      state.drawingFrom = sqName;
      highlightSquares();
    } else if (state.drawingFrom === sqName) {
      state.drawingFrom = null;
      highlightSquares();
    } else {
      addArrow(state.drawingFrom, sqName);
      state.drawingFrom = null;
      highlightSquares();
    }
    return;
  }

  if (state.currentTool === 'circle') {
    addCircle(sqName);
    return;
  }

  if (state.currentTool === 'highlight') {
    addHighlight(sqName);
    return;
  }

  if (state.currentTool === 'rectangle') {
    if (!state.drawingFrom) {
      state.drawingFrom = sqName;
      highlightSquares();
    } else if (state.drawingFrom === sqName) {
      state.drawingFrom = null;
      highlightSquares();
    } else {
      addRectangle(state.drawingFrom, sqName);
      state.drawingFrom = null;
      highlightSquares();
    }
    return;
  }

  if (state.currentTool === 'eraser') {
    eraseAnnotationAt(sqName);
    return;
  }

  // 5. LEFT CLICK with 'select' tool (Normal Chess Move / Piece Selection):
  handleSquareClick(sqName);
}

function handleRightClickOrDrag(from, to, isDrag) {
  const tool = state.currentTool;

  if (isDrag && from && to && from !== to) {
    if (tool === 'rectangle') {
      addRectangle(from, to);
    } else if (tool === 'eraser') {
      eraseAnnotationAt(from);
      eraseAnnotationAt(to);
    } else if (tool === 'circle') {
      addCircle(to);
    } else if (tool === 'highlight') {
      addHighlight(to);
    } else {
      // Default / 'select' / 'arrow': right-drag draws an arrow
      addArrow(from, to);
    }
  } else {
    // Single square right-click
    if (tool === 'circle') {
      addCircle(to);
    } else if (tool === 'highlight') {
      addHighlight(to);
    } else if (tool === 'eraser') {
      eraseAnnotationAt(to);
    } else if (tool === 'rectangle') {
      addHighlight(to);
    } else {
      // Default / 'select' / 'arrow': right-click toggles circle
      addCircle(to);
    }
  }
}

function cancelSquarePress() {
  pressSquare = null;
  pressMoved = false;
  pressConsumed = false;
  pressButton = 0;
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
