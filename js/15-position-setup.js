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
    const svg = typeof getPieceSvg === 'function' ? getPieceSvg(p, state.pieceStyle) : (typeof PIECE_SVG !== 'undefined' ? PIECE_SVG[p] : null);
    if (svg) {
      div.innerHTML = svg;
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

function enterSetupEditing() {
  state.setupMode = true;
  document.body.dataset.setupEditing = 'true';
  updateSetupHint();
  highlightDropSquares();
}

function finishSetupEditing() {
  startFromPosition();
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
    playPieceMoveSound();

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
  el.innerHTML = `<span class="count-w">${wCount}</span><span class="count-sep">·</span><span class="count-b">${bCount}</span>` +
    materialCountHtml(counts);
}

// "39–36 (+3 W)" in the piece counters: material points with the standard
// values, so a teacher can see the imbalance while building a position.
function materialCountHtml(counts) {
  const V = (typeof PIECE_VALUES !== 'undefined') ? PIECE_VALUES : { p:1, n:3, b:3, r:5, q:9, k:0 };
  const c = counts || {};
  const w = V.p*(c.P||0) + V.n*(c.N||0) + V.b*(c.B||0) + V.r*(c.R||0) + V.q*(c.Q||0);
  const b = V.p*(c.p||0) + V.n*(c.n||0) + V.b*(c.b||0) + V.r*(c.r||0) + V.q*(c.q||0);
  const d = w - b;
  const adv = d > 0 ? ` (+${d} W)` : (d < 0 ? ` (+${-d} B)` : '');
  return `<span class="count-pts" title="Material points — pawn 1, knight 3, bishop 3, rook 5, queen 9">⚖ ${w}–${b}${adv}</span>`;
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
  resetMoveHistory('8/8/8/8/8/8/8/8 w - - 0 1');
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

// A teaching studio must never hand out an impossible position. chess.js loads
// anything at all - no kings, two kings, pawns on the back rank, nine pawns, a
// side that just moved into check - and from such a board the check/mate
// detection, the clock and every lesson recorded on top of it are wrong.
// Returns { ok:true } or { ok:false, reason:'...' }.
function validatePosition(fen) {
  const parts = String(fen || '').trim().split(/\s+/);
  if (parts.length < 4) return { ok: false, reason: 'the FEN is incomplete' };

  const rows = parts[0].split('/');
  if (rows.length !== 8) return { ok: false, reason: 'the position must describe 8 ranks' };

  const grid = [];
  const cnt = { w: { K:0, Q:0, R:0, B:0, N:0, P:0 }, b: { K:0, Q:0, R:0, B:0, N:0, P:0 } };
  let whiteKing = null, blackKing = null;

  for (let r = 0; r < 8; r++) {
    const row = [];
    let c = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        c += parseInt(ch, 10);
        for (let k = 0; k < parseInt(ch, 10); k++) row.push(null);
        continue;
      }
      if (!/[prnbqkPRNBQK]/.test(ch)) return { ok: false, reason: '"' + ch + '" is not a chess piece' };
      if (c > 7) return { ok: false, reason: 'rank ' + (8 - r) + ' holds more than 8 squares' };
      const white = (ch === ch.toUpperCase());
      const t = ch.toUpperCase();
      cnt[white ? 'w' : 'b'][t]++;
      if (t === 'P' && (r === 0 || r === 7)) return { ok: false, reason: 'a pawn cannot stand on the first or the last rank' };
      if (t === 'K') {
        const name = String.fromCharCode(97 + c) + (8 - r);
        if (white) { if (whiteKing) return { ok: false, reason: 'White has two kings' }; whiteKing = name; }
        else { if (blackKing) return { ok: false, reason: 'Black has two kings' }; blackKing = name; }
      }
      row.push(ch);
      c++;
    }
    if (c !== 8) return { ok: false, reason: 'rank ' + (8 - r) + ' does not cover 8 squares' };
    grid.push(row);
  }

  if (!whiteKing || !blackKing) return { ok: false, reason: 'each side needs exactly one king' };

  for (const side of ['w', 'b']) {
    const n = cnt[side], who = (side === 'w') ? 'White' : 'Black';
    const total = n.K + n.Q + n.R + n.B + n.N + n.P;
    if (n.P > 8) return { ok: false, reason: who + ' cannot have more than 8 pawns' };
    if (total > 16) return { ok: false, reason: who + ' cannot have more than 16 pieces' };
    // every extra queen / rook / bishop / knight must come from a promoted pawn
    const extras = Math.max(0, n.Q - 1) + Math.max(0, n.R - 2) + Math.max(0, n.B - 2) + Math.max(0, n.N - 2);
    if (extras > 8 - n.P) return { ok: false, reason: who + ' has more promoted pieces than the missing pawns allow' };
  }

  const turn = parts[1];
  if (turn !== 'w' && turn !== 'b') return { ok: false, reason: 'the side to move must be w or b' };

  const rights = parts[2] || '-';
  if (rights !== '-') {
    const home = { K: ['e1', 'h1', 7, 7], Q: ['e1', 'a1', 7, 0], k: ['e8', 'h8', 0, 7], q: ['e8', 'a8', 0, 0] };
    for (const ch of rights) {
      const need = home[ch];
      if (!need) return { ok: false, reason: '"' + ch + '" is not a castling right' };
      const kingAt = (ch === ch.toUpperCase()) ? whiteKing : blackKing;
      const rookChar = (ch === ch.toUpperCase()) ? 'R' : 'r';
      if (kingAt !== need[0]) return { ok: false, reason: 'castling "' + ch + '" needs the king on ' + need[0] };
      if (grid[need[2]][need[3]] !== rookChar) return { ok: false, reason: 'castling "' + ch + '" needs a rook on ' + need[1] };
    }
  }

  const ep = parts[3] || '-';
  if (ep !== '-') {
    if (!/^[a-h][36]$/.test(ep)) return { ok: false, reason: 'the en-passant square must be on rank 3 or 6' };
    const epRank = parseInt(ep[1], 10);
    if ((turn === 'w' && epRank !== 6) || (turn === 'b' && epRank !== 3)) return { ok: false, reason: 'that en-passant square does not match the side to move' };
    const fc = ep.charCodeAt(0) - 97;
    const epRow = 8 - epRank;
    if (grid[epRow][fc] !== null) return { ok: false, reason: 'the en-passant square must be empty' };
    const pawnRow = (turn === 'w') ? epRow + 1 : epRow - 1;
    const pawnChar = (turn === 'w') ? 'p' : 'P';
    if (grid[pawnRow][fc] !== pawnChar) return { ok: false, reason: 'no pawn just made the double step to that en-passant square' };
  }

  if (parts[4] !== undefined && !/^\d+$/.test(parts[4])) return { ok: false, reason: 'the halfmove clock must be a number' };
  if (parts[5] !== undefined && (!/^\d+$/.test(parts[5]) || parseInt(parts[5], 10) < 1)) return { ok: false, reason: 'the fullmove number must be 1 or more' };

  // The side that just moved may not have left its OWN king in check: ask the
  // engine by handing the same position to the other side to move.
  try {
    if (typeof Chess !== 'undefined') {
      const g = new Chess();
      const swapped = [parts[0], (turn === 'w' ? 'b' : 'w'), rights, '-', parts[4] || '0', parts[5] || '1'].join(' ');
      const loaded = g.load(swapped);
      if (loaded !== false && typeof g.in_check === 'function' && g.in_check()) {
        return { ok: false, reason: 'the side that just moved left its own king in check' };
      }
    }
  } catch (e) {}

  return { ok: true };
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
    // Refuse impossible positions instead of quietly starting a game that can
    // never be checked, mated or recorded correctly. Editing stays armed so the
    // teacher can fix the position.
    const check = validatePosition(fullFen);
    if (!check.ok) {
      toast('Cannot start from this position: ' + check.reason, 'error');
      updateSetupHint();
      return;
    }
    state.game.load(fullFen);
  } catch (e) {
    console.warn('Could not load constructed FEN, keeping current board position:', e);
    toast('Cannot start from this position: ' + (e && e.message ? e.message : 'the FEN is not valid'), 'error');
    return;
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

  // Reset move history for play from this position - and remember that THIS
  // position is now the start, so undo comes back here
  resetMoveHistory();

  // Restore active tool
  if (!state.currentTool) state.currentTool = 'select';
  if (typeof setTool === 'function') setTool(state.currentTool);

  renderAll();
  updateFen();
  try { requestEngineEval(); } catch (e) {}
  toast('Position set — start playing or drawing annotations', 'success');
}
