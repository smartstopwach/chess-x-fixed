// ============================================
// BOARD RENDERING
// ============================================
function renderBoard() {
  els.board.innerHTML = '';
  let board;
  try {
    board = state.game.board();
  } catch (e) {
    console.error('Chess.js not loaded:', e);
    board = Array(8).fill(null).map(() => Array(8).fill(null));
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      const sqName = squareName(r, c);
      const light = isLight(r, c);
      sq.className = 'square ' + (light ? 'light' : 'dark');
      sq.dataset.square = sqName;
      sq.dataset.row = r;
      sq.dataset.col = c;

      // Coordinates (CSS rotates board when flipped, so use same positions)
      if (c === 0) {
        const rank = document.createElement('div');
        rank.className = 'coord rank';
        rank.textContent = 8 - r;
        sq.appendChild(rank);
      }
      if (r === 7) {
        const file = document.createElement('div');
        file.className = 'coord file';
        file.textContent = String.fromCharCode(97 + c);
        sq.appendChild(file);
      }

      // Piece
      const piece = board[r][c];
      if (piece) {
        const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        const p = document.createElement('div');
        p.className = 'piece';
        if (typeof PIECE_SVG !== 'undefined' && PIECE_SVG[key]) {
          p.innerHTML = PIECE_SVG[key];
        } else {
          p.textContent = PIECE_FONT[key];
          p.style.color = piece.color === 'w' ? '#ffffff' : '#1a1a1a';
        }
        sq.appendChild(p);
      }

      els.board.appendChild(sq);
    }
  }
}

function highlightSquares() {
  // Clear previous highlights
  $$('.square').forEach(sq => {
    sq.classList.remove('selected', 'last-move', 'check');
    const md = sq.querySelector('.move-dot'); if (md) md.remove();
    const cd = sq.querySelector('.capture-dot'); if (cd) cd.remove();
  });

  // Last move (highlight from/to of the current move in the persistent history)
  try {
    if (state.historyIndex >= 0 && state.historyIndex < state.history.length) {
      const san = state.history[state.historyIndex];
      const game = new Chess();
      for (let i = 0; i <= state.historyIndex; i++) {
        try { game.move(state.history[i]); } catch (e) {}
      }
      const verbose = game.history({ verbose: true });
      const lastMove = verbose[verbose.length - 1];
      if (lastMove) {
        const fromSq = showSquare(lastMove.from);
        const toSq = showSquare(lastMove.to);
        if (fromSq) fromSq.classList.add('last-move');
        if (toSq) toSq.classList.add('last-move');
      }
    }
  } catch (e) {}

  // Check
  try {
    if (state.game.in_check()) {
      const turn = state.game.turn();
      state.game.board().forEach((row, r) => {
        row.forEach((p, c) => {
          if (p && p.type === 'k' && p.color === turn) {
            const sq = els.board.children[r * 8 + c];
            if (sq) sq.classList.add('check');
          }
        });
      });
    }
  } catch (e) {}

  // Selected square + legal moves
  if (state.selectedSquare) {
    const sel = showSquare(state.selectedSquare);
    if (sel) sel.classList.add('selected');

    try {
      const moves = state.game.moves({ square: state.selectedSquare, verbose: true });
      moves.forEach(m => {
        const sq = showSquare(m.to);
        if (!sq) return;
        if (m.flags.includes('e') || m.flags.includes('c')) {
          const dot = document.createElement('div');
          dot.className = 'capture-dot';
          sq.appendChild(dot);
        } else {
          const dot = document.createElement('div');
          dot.className = 'move-dot';
          sq.appendChild(dot);
        }
      });
    } catch (e) {}
  }

  // Checkmate / stalemate: keep the mated king marked while the celebration
  // runs. renderBoard() rewrites square classes, so this belongs here rather
  // than only in the one-shot trigger.
  try { if (typeof decorateMateKing === 'function') decorateMateKing(); } catch (e) {}

  // Active drawing origin (first square of multi-click arrow or rectangle)
  if (state.drawingFrom) {
    const sel = showSquare(state.drawingFrom);
    if (sel) sel.classList.add('selected');
  }
}

