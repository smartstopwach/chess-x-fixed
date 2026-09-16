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
        const svg = typeof getPieceSvg === 'function' ? getPieceSvg(key, state.pieceStyle) : (typeof PIECE_SVG !== 'undefined' ? PIECE_SVG[key] : null);
        if (svg) {
          p.innerHTML = svg;
        } else {
          p.textContent = PIECE_FONT[key];
          p.style.color = piece.color === 'w' ? '#ffffff' : '#1a1a1a';
        }
        sq.appendChild(p);
      }

      els.board.appendChild(sq);
    }
  }

  try {
    renderPlayerInfo();
  } catch (e) {
    console.error('renderPlayerInfo failed:', e);
  }
}

function renderPlayerInfo() {
  const topFlag = $('playerTop');
  const topName = $('playerTopName');
  const bottomFlag = $('playerBottom');
  const bottomName = $('playerBottomName');
  const capturedTop = $('capturedTop');
  const capturedBottom = $('capturedBottom');

  const isFlipped = !!(typeof state !== 'undefined' && state.flipped);

  // When not flipped: Top is Black, Bottom is White
  // When flipped: Top is White, Bottom is Black
  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';

  if (topName) topName.textContent = topColor === 'w' ? 'White' : 'Black';
  if (bottomName) bottomName.textContent = bottomColor === 'w' ? 'White' : 'Black';

  if (topFlag) {
    topFlag.className = 'player-flag ' + (topColor === 'w' ? 'white' : 'black');
  }
  if (bottomFlag) {
    bottomFlag.className = 'player-flag ' + (bottomColor === 'w' ? 'white' : 'black');
  }

  // Calculate and render captured pieces
  if (capturedTop && capturedBottom && typeof state !== 'undefined' && state.game) {
    const initialWhite = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
    const initialBlack = { p: 8, n: 2, b: 2, r: 2, q: 1 };

    let board = null;
    try {
      board = state.game.board();
    } catch (e) {}

    const currentCounts = {};
    if (board) {
      board.forEach(row => {
        row.forEach(p => {
          if (p) {
            const k = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
            currentCounts[k] = (currentCounts[k] || 0) + 1;
          }
        });
      });
    }

    const whiteCaptured = [];
    ['P', 'N', 'B', 'R', 'Q'].forEach(k => {
      const missing = Math.max(0, (initialWhite[k] || 0) - (currentCounts[k] || 0));
      for (let i = 0; i < missing; i++) whiteCaptured.push(k);
    });

    const blackCaptured = [];
    ['p', 'n', 'b', 'r', 'q'].forEach(k => {
      const missing = Math.max(0, (initialBlack[k] || 0) - (currentCounts[k] || 0));
      for (let i = 0; i < missing; i++) blackCaptured.push(k);
    });

    // Top player displays opponent pieces captured
    const topPieces = topColor === 'b' ? whiteCaptured : blackCaptured;
    const bottomPieces = bottomColor === 'b' ? whiteCaptured : blackCaptured;

    capturedTop.innerHTML = topPieces.map(k => {
      const svg = typeof getPieceSvg === 'function' ? getPieceSvg(k, state.pieceStyle) : '';
      return svg ? `<span class="captured-piece" title="${k}">${svg}</span>` : '';
    }).join('');

    capturedBottom.innerHTML = bottomPieces.map(k => {
      const svg = typeof getPieceSvg === 'function' ? getPieceSvg(k, state.pieceStyle) : '';
      return svg ? `<span class="captured-piece" title="${k}">${svg}</span>` : '';
    }).join('');
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

  // Check (only when actually playing a game, not during setup editing or puzzle authoring)
  try {
    const isEditing = state.setupMode || state.authoringMode ||
      (document.body && (document.body.dataset.setupEditing === 'true' || document.body.dataset.authoring === 'true'));
    if (!isEditing && state.game.in_check()) {
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

  // Pending origin of a right-click-click arrow
  if (state.rightArrowFrom) {
    const sel = showSquare(state.rightArrowFrom);
    if (sel) sel.classList.add('selected');
  }
}

