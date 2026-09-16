// ============================================
// PUZZLE EDITOR — INDEPENDENT POSITION SETUP
// ============================================
// This is its own setup, separate from left-sidebar Position Setup.
// Uses a SEPARATE Chess instance (puzzleGame) so it doesn't fight with
// the main board state. User edits puzzle position here without affecting
// the visible board, until they click "USE THIS POSITION FOR PUZZLE" or SAVE.
const puzzleState = {
  game: typeof Chess !== 'undefined' ? new Chess() : null,
  history: [],
  historyIndex: -1,
  heldPiece: null,
  setupMode: true, // Always in setup mode
};

function puzzleGame() {
  if (!puzzleState.game && typeof Chess !== 'undefined') {
    puzzleState.game = new Chess();
  }
  return puzzleState.game;
}

function peSetupPushHistory() {
  const fen = state.game ? state.game.fen() : (puzzleGame() ? puzzleGame().fen() : '');
  if (!fen) return;
  puzzleState.history.length = puzzleState.historyIndex + 1;
  puzzleState.history.push(fen);
  if (puzzleState.history.length > 50) puzzleState.history.shift();
  puzzleState.historyIndex = puzzleState.history.length - 1;
}

function peSetupUndo() {
  if (puzzleState.historyIndex <= 0) return;
  puzzleState.historyIndex--;
  const fen = puzzleState.history[puzzleState.historyIndex];
  if (!fen) return;
  try {
    state.game.load(fen);
    if (puzzleGame()) puzzleGame().load(fen);
    $('puzzleFen').value = fen;
    updateFenDisplay(fen);
    peUpdatePieceCount();
    renderAll();
    toast('Undid puzzle setup', 'success');
  } catch (e) {
    console.error('peSetupUndo failed', e);
  }
}

function peSetupRedo() {
  if (puzzleState.historyIndex >= puzzleState.history.length - 1) return;
  puzzleState.historyIndex++;
  const fen = puzzleState.history[puzzleState.historyIndex];
  if (!fen) return;
  try {
    state.game.load(fen);
    if (puzzleGame()) puzzleGame().load(fen);
    $('puzzleFen').value = fen;
    updateFenDisplay(fen);
    peUpdatePieceCount();
    renderAll();
    toast('Redid puzzle setup', 'success');
  } catch (e) {
    console.error('peSetupRedo failed', e);
  }
}

function peLoadPreset(name) {
  const presets = {
    standard: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    empty: '8/8/8/8/8/8/8/8 w - - 0 1',
    pawns_kings: '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
    rooks_pawns: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    endgame_kq: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1',
    endgame_krk: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    castling_test: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
  };
  const fen = presets[name];
  if (!fen) return;
  try {
    state.game.load(fen);
    if (puzzleGame()) puzzleGame().load(fen);
    resetMoveHistory(fen);
    state.selectedSquare = null;
    state.heldPiece = null;
    puzzleState.heldPiece = null;
    puzzleState.selectedSquare = null;
    $$('.pe-rack-piece').forEach(x => x.classList.remove('selected'));
    peSetupPushHistory();
    peUpdatePieceCount();
    peUpdateHint();
    $('puzzleFen').value = fen;
    updateFenDisplay(fen);
    renderAll();
    toast(`Loaded preset: ${name.replace(/_/g, ' ')}`, 'success');
  } catch (e) {
    toast('Invalid preset', 'error');
  }
}

function peClearBoard() {
  peLoadPreset('empty');
}

function pePlacePiece(sq, piece) {
  if (!piece) return;
  // Place a piece on the main board (state.game), with chess-rule validation:
  // - Cannot place on a same-color piece (would be illegal)
  // - Cannot create a second king of the same color (only one king per side)
  try {
    // Rule 1: check if target square has same-color piece
    const targetPiece = getPieceAt(sq);
    if (targetPiece) {
      // targetPiece is like 'K' (white) or 'k' (black); piece is same format
      const targetColor = targetPiece === targetPiece.toUpperCase() ? 'w' : 'b';
      const pieceColor = piece === piece.toUpperCase() ? 'w' : 'b';
      if (targetColor === pieceColor) {
        toast('Cannot place on own piece — right-click to erase first', 'error');
        return;
      }
    }
    // Rule 2: check if we're placing a king when one already exists of that color
    if (piece === 'K' || piece === 'k') {
      const kingKey = piece; // K for white, k for black
      const fen = state.game.fen().split(' ')[0];
      if (fen.includes(kingKey)) {
        toast('Cannot add a second ' + (piece === 'K' ? 'white' : 'black') + ' king', 'error');
        return;
      }
    }
    const fen = state.game.fen();
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    const r = 8 - parseInt(sq[1]);
    const c = sq.charCodeAt(0) - 97;
    const expanded = [];
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) expanded.push(null);
      } else {
        expanded.push(ch);
      }
    }
    expanded[c] = piece;
    let s = ''; let e = 0;
    for (const cell of expanded) {
      if (cell === null) e++;
      else { if (e > 0) { s += e; e = 0; } s += cell; }
    }
    if (e > 0) s += e;
    rows[r] = s;
    parts[0] = rows.join('/');
    state.game.load(parts.join(' '));
    playPieceMoveSound();
    // Sync puzzle editor state
    if (puzzleGame()) puzzleGame().load(state.game.fen());
    peSetupPushHistory();
    peUpdatePieceCount();
    peUpdateHint();
    state.history = [];
    state.historyIndex = -1;
    renderAll();
  } catch (e) {
    toast('Cannot place piece', 'error');
  }
}

// Make a legal chess move on the main board (used in puzzle authoring mode).
// Returns true if move was made, false if illegal.
function peMakeMove(from, to) {
  try {
    const result = state.game.move({ from, to, promotion: 'q' });
    if (result) {
      playPieceMoveSound(result);
      state.selectedSquare = null;
      state.history = [];
      state.historyIndex = -1;
      // Sync puzzle editor state
      if (puzzleGame()) puzzleGame().load(state.game.fen());
      peSetupPushHistory();
      peUpdatePieceCount();
      renderAll();
      return true;
    }
  } catch (e) {}
  return false;
}

function peErasePiece(sq) {
  try {
    const fen = state.game.fen();
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    const r = 8 - parseInt(sq[1]);
    const c = sq.charCodeAt(0) - 97;
    const expanded = [];
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) expanded.push(null);
      } else {
        expanded.push(ch);
      }
    }
    expanded[c] = null;
    let s = ''; let e = 0;
    for (const cell of expanded) {
      if (cell === null) e++;
      else { if (e > 0) { s += e; e = 0; } s += cell; }
    }
    if (e > 0) s += e;
    rows[r] = s;
    parts[0] = rows.join('/');
    state.game.load(parts.join(' '));
    if (puzzleGame()) puzzleGame().load(state.game.fen());
    peSetupPushHistory();
    peUpdatePieceCount();
    state.history = [];
    state.historyIndex = -1;
    renderAll();
  } catch (e) {
    toast('Cannot erase', 'error');
  }
}

function peSelectRackPiece(p) {
  // Rack pieces are held with no source — they go via pePlacePiece (rule-free)
  puzzleState.heldPiece = { piece: p, source: null };
  // Clear any main board selection so rack piece takes priority
  state.selectedSquare = null;
  highlightSquares();
  $$('.pe-piece-rack .pe-rack-piece').forEach(x => x.classList.toggle('selected', x.dataset.piece === p));
  peUpdateHint();
  toast(`Holding ${p.toUpperCase() === p ? 'White ' : 'Black '}${p.toLowerCase() === 'k' ? 'King' : p.toLowerCase() === 'q' ? 'Queen' : p.toLowerCase() === 'r' ? 'Rook' : p.toLowerCase() === 'b' ? 'Bishop' : p.toLowerCase() === 'n' ? 'Knight' : 'Pawn'} — click any square to place`, 'success');
}

function pePickFromBoard(sq) {
  let piece = null;
  try { piece = state.game.get(sq); } catch (e) {}
  if (!piece && puzzleGame()) {
    const board = puzzleGame().board();
    const r = 8 - parseInt(sq[1]);
    const c = sq.charCodeAt(0) - 97;
    const p = board[r][c];
    if (p) piece = { color: p.color, type: p.type };
  }
  if (!piece) {
    // Empty — if holding, place
    if (puzzleState.heldPiece) {
      pePlacePiece(sq, puzzleState.heldPiece.piece);
      return true;
    }
    return false;
  }
  // Convert to single char: 'wK' -> 'K', 'bP' -> 'p'
  const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
  puzzleState.heldPiece = { piece: key, source: sq };
  $$('.pe-piece-rack .pe-rack-piece').forEach(x => x.classList.toggle('selected', x.dataset.piece === key));
  peUpdateHint();
  toast(`Picked ${key} from ${sq}`, 'success');
  return true;
}

function peGetPieceAt(sq) {
  let piece = null;
  try { piece = state.game.get(sq); } catch (e) {}
  if (piece) return piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
  if (!puzzleGame()) return null;
  const board = puzzleGame().board();
  const r = 8 - parseInt(sq[1]);
  const c = sq.charCodeAt(0) - 97;
  const p = board[r][c];
  if (!p) return null;
  return p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
}

function peUpdatePieceCount() {
  const el = $('pePieceCount');
  if (!el) return;
  const fen = (state.game ? state.game.fen() : (puzzleGame() ? puzzleGame().fen() : '')).split(' ')[0];
  const counts = { K:0, Q:0, R:0, B:0, N:0, P:0, k:0, q:0, r:0, b:0, n:0, p:0 };
  for (const ch of fen) {
    if (counts[ch] !== undefined) counts[ch]++;
  }
  const wCount = counts.P + counts.N + counts.B + counts.R + counts.Q + counts.K;
  const bCount = counts.p + counts.n + counts.b + counts.r + counts.q + counts.k;
  el.innerHTML = `<span class="count-w">${wCount}</span><span class="count-sep">·</span><span class="count-b">${bCount}</span>` +
    (typeof materialCountHtml === 'function' ? materialCountHtml(counts) : '');
}

function peUpdateHint() {
  const hint = $('peSetupHint');
  if (!hint) return;
  if (puzzleState.heldPiece) {
    const p = puzzleState.heldPiece.piece;
    const name = p.toUpperCase() === p ? `White ${p === 'K' ? 'King' : p === 'Q' ? 'Queen' : p === 'R' ? 'Rook' : p === 'B' ? 'Bishop' : p === 'N' ? 'Knight' : 'Pawn'}` : `Black ${p.toLowerCase() === 'k' ? 'King' : p.toLowerCase() === 'q' ? 'Queen' : p.toLowerCase() === 'r' ? 'Rook' : p.toLowerCase() === 'b' ? 'Bishop' : p.toLowerCase() === 'n' ? 'Knight' : 'Pawn'}`;
    hint.innerHTML = `<span class="hint-active">Holding: <strong>${name}</strong></span> · click a board square to place · right-click to erase`;
    hint.classList.add('active');
  } else {
    hint.textContent = 'Click a piece from the rack below → click a board square to place · drag pieces too · right-click to erase';
    hint.classList.remove('active');
  }
}

function initPEPieceRack() {
  const rack = $('pePieceRack');
  if (!rack) return;
  rack.innerHTML = '';
  const pieces = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p'];
  pieces.forEach(p => {
    const div = document.createElement('div');
    div.className = 'pe-rack-piece';
    div.dataset.piece = p;
    const svg = typeof getPieceSvg === 'function' ? getPieceSvg(p, state.pieceStyle) : (typeof PIECE_SVG !== 'undefined' ? PIECE_SVG[p] : null);
    if (svg) {
      div.innerHTML = svg;
    } else {
      div.textContent = PIECE_FONT[p];
      div.style.color = p === p.toUpperCase() ? '#ffffff' : '#1a1a1a';
    }
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      peSelectRackPiece(p);
    });
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', p);
      e.dataTransfer.effectAllowed = 'copy';
      peSelectRackPiece(p);
    });
    div.addEventListener('dragend', () => {});
    rack.appendChild(div);
  });
}

function peUseForPuzzle() {
  let fen = null;
  try { fen = state.game.fen(); } catch (e) {}
  if (!fen && puzzleGame()) fen = puzzleGame().fen();
  if (fen) {
    $('puzzleFen').value = fen;
    updateFenDisplay(fen);
    if (puzzleGame()) puzzleGame().load(fen);
  }
  if (isAuthoringMode()) {
    setAuthoringMode(false);
  }
  if (typeof setTool === 'function') setTool('arrow');
  renderAll();
  toast('Position captured for puzzle — left click to draw arrows ✓', 'success');
}

function peLoadToBoard() {
  if (!puzzleGame()) return;
  // Load the puzzle's setup into the main game board for visual preview
  try {
    const fen = puzzleGame().fen();
    state.game.load(fen);
    state.history = [];
    state.historyIndex = -1;
    renderAll();
    toast('Position loaded to main board', 'success');
  } catch (e) {
    toast('Cannot load', 'error');
  }
}

function peCaptureFromBoard() {
  // Capture current main board position INTO the puzzle editor
  if (!puzzleGame()) return;
  try {
    const fen = state.game.fen();
    puzzleGame().load(fen);
    puzzleState.history = [];
    puzzleState.historyIndex = -1;
    peSetupPushHistory();
    peUpdatePieceCount();
    toast('Captured board position into puzzle editor', 'success');
  } catch (e) {
    toast('Cannot capture', 'error');
  }
}

function resetPuzzleSetupToStandard() {
  if (!puzzleGame()) return;
  peLoadPreset('standard');
}

function peOnBoardMouseDown(e) {
  if (!e.target.closest('.square')) return;
  const sq = e.target.closest('.square').dataset.square;
  // The puzzle editor only modifies its OWN setup when active
  // But we need a way to know user is editing puzzle vs main board.
  // Solution: when puzzle editor is "active" (user is authoring a puzzle),
  // clicks on the board go to the PUZZLE editor setup instead of the main game.
  if (!isAuthoringMode()) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  if (e.button === 2) {
    peErasePiece(sq);
    return;
  }
  // If holding a piece, place it
  if (puzzleState.heldPiece) {
    pePlacePiece(sq, puzzleState.heldPiece.piece);
    return;
  }
  // Single-click on a piece = pick it up
  const piece = peGetPieceAt(sq);
  if (piece) {
    pePickFromBoard(sq);
    return;
  }
}

function peOnBoardContextMenu(e) {
  if (!isAuthoringMode()) return;
  e.preventDefault();
  if (e.target.closest('.square')) {
    peErasePiece(e.target.closest('.square').dataset.square);
  }
}

