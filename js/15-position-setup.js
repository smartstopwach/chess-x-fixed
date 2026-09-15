// ============================================
// POSITION SETUP — ADVANCED
// ============================================
function initPieceRack() {
  const rack = $('pieceRack');
  if (!rack) return;
  rack.innerHTML = '';
  const pieces = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p'];
  pieces.forEach(p => {
    const div = document.createElement('div');
    div.className = 'rack-piece';
    div.dataset.piece = p;
    if (typeof PIECE_SVG !== 'undefined' && PIECE_SVG[p]) {
      div.innerHTML = PIECE_SVG[p];
    } else {
      div.textContent = PIECE_FONT[p];
      div.style.color = p === p.toUpperCase() ? '#ffffff' : '#1a1a1a';
    }
    // SINGLE click: select for placing
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      selectRackPiece(p);
    });
    // DRAG start: begin drag-and-drop placement
    div.addEventListener('dragstart', (e) => {
      state.dragPiece = p;
      state.setupMode = true;
      document.body.dataset.setupEditing = 'true';
      e.dataTransfer.setData('text/plain', p);
      e.dataTransfer.effectAllowed = 'copy';
      div.classList.add('dragging');
      selectRackPiece(p);
    });
    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
    });
    div.setAttribute('draggable', 'true');
    rack.appendChild(div);
  });
}

function selectRackPiece(p) {
  state.selectedRackPiece = p;
  state.setupMode = true;
  document.body.dataset.setupEditing = 'true';
  state.heldPiece = { piece: p, source: 'rack' };
  $$('.rack-piece').forEach(x => x.classList.remove('selected'));
  const el = document.querySelector(`.rack-piece[data-piece="${p}"]`);
  if (el) el.classList.add('selected');
  // Also sync the inline rack (if it exists in the puzzle editor)
  $$('.rack-piece-mini').forEach(x => x.classList.toggle('selected', x.dataset.piece === p));
  toast(`Holding ${pieceName(p)} — click square to place, right-click square to erase.`);
  updateSetupHint();
  highlightDropSquares();
}

// PICK A PIECE FROM THE BOARD by double-click or click
function pickPieceFromBoard(sqName) {
  const piece = getPieceAt(sqName);
  if (!piece) {
    // Empty square — if we are holding a piece, place it here
    if (state.heldPiece) {
      placePieceOnSetup(sqName, state.heldPiece.piece);
      return true;
    }
    return false;
  }
  // Pick up the piece
  state.heldPiece = { piece: piece, source: sqName };
  state.selectedRackPiece = piece;
  state.setupMode = true;
  document.body.dataset.setupEditing = 'true';
  $$('.rack-piece').forEach(x => x.classList.remove('selected'));
  const el = document.querySelector(`.rack-piece[data-piece="${piece}"]`);
  if (el) el.classList.add('selected');
  toast(`Picked ${pieceName(piece)} from ${sqName} — click destination square.`);
  updateSetupHint();
  highlightDropSquares();
  return true;
}

// Show squares where the held piece can be placed
function highlightDropSquares() {
  $$('.square').forEach(sq => sq.classList.remove('drop-target', 'drop-invalid'));
  if (!state.heldPiece) return;
  $$('.square').forEach(sq => {
    sq.classList.add('drop-target');
  });
}

function updateSetupHint() {
  const hint = $('setupHint');
  if (!hint) return;
  if (state.heldPiece) {
    hint.innerHTML = `<span class="hint-active">Holding: <strong>${pieceName(state.heldPiece.piece)}</strong></span> · click to place · right-click to erase`;
    hint.classList.add('active');
  } else {
    hint.innerHTML = `Click a piece in rack OR double-click a board piece · drag pieces too`;
    hint.classList.remove('active');
  }
}

function pieceName(p) {
  const names = { K:'White King', Q:'White Queen', R:'White Rook', B:'White Bishop', N:'White Knight', P:'White Pawn', k:'Black King', q:'Black Queen', r:'Black Rook', b:'Black Bishop', n:'Black Knight', p:'Black Pawn' };
  return names[p] || p;
}

function getPieceAt(sqName) {
  try {
    const fen = state.game.fen();
    const position = fen.split(' ')[0];
    const rows = position.split('/');
    const { r, c } = squareRC(sqName);
    const row = rows[r];
    const expanded = expandRow(row);
    return expanded[c] || null;
  } catch (e) { return null; }
}

function expandRow(row) {
  const result = [];
  for (const ch of row) {
    if (/\d/.test(ch)) {
      for (let i = 0; i < parseInt(ch); i++) result.push(null);
    } else {
      result.push(ch);
    }
  }
  return result;
}

function collapseRow(arr) {
  let result = '';
  let empty = 0;
  for (const cell of arr) {
    if (cell === null || cell === undefined) {
      empty++;
    } else {
      if (empty > 0) { result += empty; empty = 0; }
      result += cell;
    }
  }
  if (empty > 0) result += empty;
  return result;
}

function placePieceOnSetup(sq, piece) {
  if (!piece) return;
  try {
    const fen = state.game.fen();
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    const targetRC = squareRC(sq);

    // If piece was picked from the board and not the same square, remove from old square
    if (state.heldPiece && state.heldPiece.source && state.heldPiece.source !== 'rack' && state.heldPiece.source !== sq) {
      const oldRC = squareRC(state.heldPiece.source);
      const oldExpanded = expandRow(rows[oldRC.r]);
      oldExpanded[oldRC.c] = null;
      rows[oldRC.r] = collapseRow(oldExpanded);
    }

    // Now place piece on target square
    const targetExpanded = expandRow(rows[targetRC.r]);
    targetExpanded[targetRC.c] = piece;
    rows[targetRC.r] = collapseRow(targetExpanded);

    parts[0] = rows.join('/');
    const newFen = parts.join(' ');
    state.game.load(newFen);

    // The puzzle editor keeps its OWN Chess instance. Keep it in step with the
    // visible board, otherwise SAVE and the editor disagree and a piece that
    // was just dragged from a rack silently disappears once you save.
    try {
      if (typeof puzzleGame === 'function' && puzzleGame()) {
        puzzleGame().load(state.game.fen());
        if (typeof peUpdatePieceCount === 'function') peUpdatePieceCount();
        if (typeof peUpdateHint === 'function') peUpdateHint();
      }
    } catch (e) { /* editor copy is best-effort; the board is the truth */ }

    pushSetupHistory(); // save for undo

    // If we moved a piece from the board, clear the held state
    if (state.heldPiece && state.heldPiece.source && state.heldPiece.source !== 'rack') {
      state.heldPiece = null;
      state.selectedRackPiece = null;
      $$('.rack-piece').forEach(x => x.classList.remove('selected'));
    }

    renderAll();
    updatePieceCount();
    updateSetupHint();
    highlightDropSquares();
  } catch (e) {
    toast('Invalid position', 'error');
  }
}

function erasePieceAt(sq) {
  try {
    const fen = state.game.fen();
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    const { r, c } = squareRC(sq);
    const expanded = expandRow(rows[r]);
    expanded[c] = null;
    rows[r] = collapseRow(expanded);
    parts[0] = rows.join('/');
    state.game.load(parts.join(' '));
    pushSetupHistory();
    renderAll();
    updatePieceCount();
    updateSetupHint();
  } catch (e) {
    toast('Cannot erase', 'error');
  }
}

// Undo/redo for position setup
const setupHistory = [];
let setupHistoryIndex = -1;
function pushSetupHistory() {
  const fen = state.game.fen();
  // Remove future history if we're in the middle
  setupHistory.length = setupHistoryIndex + 1;
  setupHistory.push(fen);
  if (setupHistory.length > 50) setupHistory.shift();
  setupHistoryIndex = setupHistory.length - 1;
}
function setupUndo() {
  if (setupHistoryIndex <= 0) return;
  setupHistoryIndex--;
  state.game.load(setupHistory[setupHistoryIndex]);
  renderAll();
  updatePieceCount();
  toast('Undid position change');
}
function setupRedo() {
  if (setupHistoryIndex >= setupHistory.length - 1) return;
  setupHistoryIndex++;
  state.game.load(setupHistory[setupHistoryIndex]);
  renderAll();
  updatePieceCount();
  toast('Redid position change');
}

// Piece count display
function updatePieceCount() {
  const el = $('pieceCount');
  if (!el) return;
  const fen = state.game.fen().split(' ')[0];
  const counts = { K:0, Q:0, R:0, B:0, N:0, P:0, k:0, q:0, r:0, b:0, n:0, p:0 };
  for (const ch of fen) {
    if (counts[ch] !== undefined) counts[ch]++;
  }
  const wCount = counts.P + counts.N + counts.B + counts.R + counts.Q + counts.K;
  const bCount = counts.p + counts.n + counts.b + counts.r + counts.q + counts.k;
  el.innerHTML = `<span class="count-w">${wCount}</span><span class="count-sep">·</span><span class="count-b">${bCount}</span>`;
}

function syncSetupControlsFromFen(fen) {
  if (!fen) return;
  const parts = fen.split(' ');
  // Side to move
  const side = parts[1] || 'w';
  const sideEl = $('optSideToMove');
  if (sideEl) sideEl.value = side;

  // Castling
  const castling = parts[2] || '-';
  const wK = $('optWhiteCastleK'); if (wK) wK.checked = castling.includes('K');
  const wQ = $('optWhiteCastleQ'); if (wQ) wQ.checked = castling.includes('Q');
  const bK = $('optBlackCastleK'); if (bK) bK.checked = castling.includes('k');
  const bQ = $('optBlackCastleQ'); if (bQ) bQ.checked = castling.includes('q');

  // En passant
  const ep = parts[3] || '-';
  const epEl = $('optEnPassant');
  if (epEl) {
    const validEp = ['-', 'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'];
    epEl.value = validEp.includes(ep) ? ep : '-';
  }

  // Halfmove & Fullmove
  const hm = parseInt(parts[4]) || 0;
  const fm = parseInt(parts[5]) || 1;
  const hmEl = $('optHalfmove'); if (hmEl) hmEl.value = hm;
  const fmEl = $('optFullmove'); if (fmEl) fmEl.value = fm;
}

// Quick position presets
function loadPreset(name) {
  const presets = {
    standard: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    empty: '8/8/8/8/8/8/8/8 w - - 0 1',
    pawns_kings: '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
    rooks_pawns: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    single_rook_pawns: '4k3/4rppp/8/8/8/8/4RPPP/4K3 w - - 0 1',
    lucena: '1R6/1P1k4/8/8/8/8/2r5/4K3 w - - 0 1',
    philidor: '4k3/8/8/3r4/4KP2/8/7R/8 b - - 0 1',
    queens_kings: '3qk3/8/8/8/8/8/8/3QK3 w - - 0 1',
    queens_pawns: '3qk3/pppp4/8/8/8/8/PPPP4/3QK3 w - - 0 1',
    queen_vs_rooks: 'r3k2r/8/8/8/8/8/8/3QK3 w - - 0 1',
    bishops_pawns: '2b1k3/pppp4/8/8/8/8/PPPP4/2B1K3 w - - 0 1',
    knights_pawns: '1n2k3/pppp4/8/8/8/8/PPPP4/1N2K3 w - - 0 1',
    rook_vs_minor: '1nb1k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    pawn_race: '4k3/p1p1p3/8/8/8/8/P1P1P3/4K3 w - - 0 1',
    king_pawn: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    two_pawns: '4k3/8/8/8/8/8/3PP3/4K3 w - - 0 1',
    endgame_kq: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1',
    endgame_krk: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    two_rooks: '4k3/8/8/8/8/8/8/R2RK3 w - - 0 1',
    two_bishops: '4k3/8/8/8/8/8/8/1BB1K3 w - - 0 1',
    bishop_knight_mate: '4k3/8/8/8/8/8/8/1NB1K3 w - - 0 1',
    castling_test: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
    promotion: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    middlegame: 'r1bqkbnr/pp2pppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
    scholars: 'rnbqkb1r/pppp1ppp/4p3/8/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
  };
  const presetLabels = {
    standard: 'Standard starting position',
    empty: 'Empty board',
    pawns_kings: 'All Pawns + Kings',
    rooks_pawns: 'Rooks + Pawns + Kings',
    single_rook_pawns: 'R+3P vs R+3P',
    lucena: 'Lucena Position',
    philidor: 'Philidor Position',
    queens_kings: 'Queens + Kings',
    queens_pawns: 'Queens + Pawns',
    queen_vs_rooks: 'Queen vs 2 Rooks',
    bishops_pawns: 'Bishops + Pawns',
    knights_pawns: 'Knights + Pawns',
    rook_vs_minor: 'Rook vs Minor pieces',
    pawn_race: 'Pawn Race (3 vs 3)',
    king_pawn: 'King + Pawn vs King',
    two_pawns: 'King + 2 Pawns vs King',
    endgame_kq: 'King + Queen vs King',
    endgame_krk: 'King + Rook vs King',
    two_rooks: 'King + 2 Rooks vs King',
    two_bishops: 'King + 2 Bishops vs King',
    bishop_knight_mate: 'King + Bishop + Knight vs King',
    castling_test: 'Castling test position',
    promotion: 'Promotion practice',
    middlegame: 'Middlegame position',
    scholars: 'Scholar\'s mate setup',
  };
  const fen = presets[name];
  if (!fen) return;
  try {
    state.game.load(fen);
    state.setupMode = true;
    document.body.dataset.setupEditing = 'true';
    state.heldPiece = null;
    state.selectedRackPiece = null;
    $$('.rack-piece').forEach(x => x.classList.remove('selected'));
    setupHistory.length = 0;
    setupHistoryIndex = -1;
    pushSetupHistory();
    syncSetupControlsFromFen(fen);
    renderAll();
    updatePieceCount();
    updateSetupHint();
    highlightDropSquares();
    toast(`Loaded preset: ${presetLabels[name] || name.replace(/_/g, ' ')}`);
  } catch (e) {
    toast('Invalid preset', 'error');
  }
}

function clearBoard() {
  state.game.load('8/8/8/8/8/8/8/8 w - - 0 1');
  state.setupMode = true;
  document.body.dataset.setupEditing = 'true';
  state.heldPiece = null;
  state.selectedRackPiece = null;
  $$('.rack-piece').forEach(x => x.classList.remove('selected'));
  state.history = [];
  state.historyIndex = -1;
  setupHistory.length = 0;
  setupHistoryIndex = -1;
  pushSetupHistory();
  syncSetupControlsFromFen('8/8/8/8/8/8/8/8 w - - 0 1');
  renderAll();
  updatePieceCount();
  updateSetupHint();
  highlightDropSquares();
  toast('Board cleared');
}

function startFromPosition() {
  try {
    const placement = state.game.fen().split(' ')[0];
    const side = ($('optSideToMove') && $('optSideToMove').value) || 'w';
    let castling = '';
    if ($('optWhiteCastleK') && $('optWhiteCastleK').checked) castling += 'K';
    if ($('optWhiteCastleQ') && $('optWhiteCastleQ').checked) castling += 'Q';
    if ($('optBlackCastleK') && $('optBlackCastleK').checked) castling += 'k';
    if ($('optBlackCastleQ') && $('optBlackCastleQ').checked) castling += 'q';
    if (!castling) castling = '-';
    const ep = ($('optEnPassant') && $('optEnPassant').value) || '-';
    const halfmove = ($('optHalfmove') && parseInt($('optHalfmove').value)) || 0;
    const fullmove = ($('optFullmove') && parseInt($('optFullmove').value)) || 1;

    const fullFen = `${placement} ${side} ${castling} ${ep} ${halfmove} ${fullmove}`;
    state.game.load(fullFen);
  } catch (e) {
    console.warn('Could not load constructed FEN, keeping current board position:', e);
  }

  // Finish setup editing mode
  state.setupMode = false;
  document.body.dataset.setupEditing = 'false';
  state.heldPiece = null;
  state.selectedRackPiece = null;
  state.dragPiece = null;
  state.selectedSquare = null;
  $$('.rack-piece').forEach(x => x.classList.remove('selected'));
  $$('.square').forEach(sq => sq.classList.remove('drop-target', 'drop-invalid', 'held-source', 'selected'));
  updateSetupHint();

  // Reset move history for play from this position
  state.history = [];
  state.historyIndex = -1;

  // Restore active tool
  if (!state.currentTool) state.currentTool = 'select';
  if (typeof setTool === 'function') setTool(state.currentTool);

  renderAll();
  updateFen();
  try { requestEngineEval(); } catch (e) {}
  toast('Position set — start playing or drawing annotations', 'success');
}
