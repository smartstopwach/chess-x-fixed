// ============================================
// POSITION SETUP — ADVANCED
// ============================================
function initPieceRack() {
  const rack = $('pieceRack');
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

// PICK A PIECE FROM THE BOARD by double-click
function pickPieceFromBoard(sqName) {
  const piece = getPieceAt(sqName);
  if (!piece) {
    // Empty square — if we are holding a piece, place it here
    if (state.heldPiece) {
      placePieceOnSetup(sqName, state.heldPiece.piece);
      // After placing, automatically deselect for faster workflow
      // state.heldPiece = null;
      // state.selectedRackPiece = null;
      // $$('.rack-piece').forEach(x => x.classList.remove('selected'));
      return true;
    }
    return false;
  }
  // Pick up the piece — single click picks it
  state.heldPiece = { piece: piece, source: sqName };
  state.selectedRackPiece = piece;
  state.setupMode = true;
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

    const { r, c } = squareRC(sq);
    const row = rows[r];
    const expanded = expandRow(row);

    // If piece was picked from the board, remove it from old position (move/copy)
    if (state.heldPiece && state.heldPiece.source && state.heldPiece.source !== 'rack') {
      const oldRC = squareRC(state.heldPiece.source);
      const oldExpanded = expandRow(rows[oldRC.r]);
      oldExpanded[oldRC.c] = null;
      rows[oldRC.r] = collapseRow(oldExpanded);
    }

    expanded[c] = piece;
    rows[r] = collapseRow(expanded);

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

// Quick position presets
function loadPreset(name) {
  const presets = {
    standard: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    empty: '8/8/8/8/8/8/8/8 w - - 0 1',
    kings: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
    kk: '4k3/8/8/8/8/8/8/3K4 w - - 0 1',
    endgame_kq: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1',
    endgame_krk: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    promotion: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    middlegame: 'r1bqkbnr/pp2pppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
    castling_test: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
    scholars: 'rnbqkb1r/pppp1ppp/4p3/8/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
  };
  const fen = presets[name];
  if (!fen) return;
  try {
    state.game.load(fen);
    setupHistory.length = 0;
    setupHistoryIndex = -1;
    pushSetupHistory();
    renderAll();
    updatePieceCount();
    toast(`Loaded preset: ${name.replace(/_/g, ' ')}`);
  } catch (e) {
    toast('Invalid preset', 'error');
  }
}

function clearBoard() {
  state.game.load('8/8/8/8/8/8/8/8 w - - 0 1');
  state.history = [];
  state.historyIndex = -1;
  renderAll();
}

