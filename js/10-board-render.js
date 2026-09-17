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

// ---- material points (P1 N3 B3 R5 Q9) ------------------------------------
function pieceValue(ch) {
  if (!ch) return 0;
  const v = PIECE_VALUES[String(ch).toLowerCase()];
  return (typeof v === 'number') ? v : 0;
}

// Everything one colour ('w' / 'b') has on the board right now, in points.
function materialPoints(color) {
  let total = 0;
  try {
    const board = state.game.board();
    (board || []).forEach(row => (row || []).forEach(p => {
      if (p && p.color === color) total += pieceValue(p.type);
    }));
  } catch (e) {}
  return total;
}

// White minus black, plus both totals - the "+3" badge is drawn from this.
function materialBalance() {
  const white = materialPoints('w');
  const black = materialPoints('b');
  return { white: white, black: black, diff: white - black };
}

// A pawn that promoted is NOT a captured pawn, so the '=' moves already played
// are subtracted from that side's pawn losses. Who moved first comes from the
// base position, because a custom position can start with Black to move.
function promotionCounts(uptoIndex) {
  const out = { w: 0, b: 0 };
  let whiteToMove = true;
  try {
    const base = (typeof baseFen === 'function') ? baseFen() : (state.baseFen || START_FEN);
    whiteToMove = String(base).split(' ')[1] !== 'b';
  } catch (e) {}
  const hist = state.history || [];
  const end = (typeof uptoIndex === 'number' && uptoIndex >= 0) ? uptoIndex : hist.length - 1;
  hist.slice(0, end + 1).forEach(san => {
    if (String(san).indexOf('=') >= 0) { if (whiteToMove) out.w++; else out.b++; }
    whiteToMove = !whiteToMove;
  });
  return out;
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

  const botActive = !!(typeof state !== 'undefined' && state.bot && state.bot.active);
  const playerName = color => {
    const side = color === 'w' ? 'White' : 'Black';
    if (!botActive || !state.bot.color) return side;
    return color === state.bot.color ? `Bot · ${side}` : `You · ${side}`;
  };
  if (topName) topName.textContent = playerName(topColor);
  if (bottomName) bottomName.textContent = playerName(bottomColor);

  if (topFlag) {
    topFlag.className = 'player-flag ' + (topColor === 'w' ? 'white' : 'black');
    topFlag.dataset.color = topColor;
    topFlag.setAttribute('aria-label', topColor === 'w' ? 'White player' : 'Black player');
  }
  if (bottomFlag) {
    bottomFlag.className = 'player-flag ' + (bottomColor === 'w' ? 'white' : 'black');
    bottomFlag.dataset.color = bottomColor;
    bottomFlag.setAttribute('aria-label', bottomColor === 'w' ? 'White player' : 'Black player');
  }

  // Calculate and render captured pieces
  if (capturedTop && capturedBottom && typeof state !== 'undefined' && state.game) {
    // Captured = what THIS game started with minus what is on the board now.
    // The fixed 8/2/2/2/1 army made every custom position, puzzle or endgame
    // advertise captures that never happened.
    const initialWhite = {};
    const initialBlack = {};
    let placement = START_FEN.split(' ')[0];
    try {
      const base = (typeof baseFen === 'function') ? baseFen() : (state.baseFen || START_FEN);
      placement = String(base).split(' ')[0];
    } catch (e) {}
    for (const ch of placement) {
      if (ch >= 'A' && ch <= 'Z') initialWhite[ch] = (initialWhite[ch] || 0) + 1;
      else if (ch >= 'a' && ch <= 'z') initialBlack[ch] = (initialBlack[ch] || 0) + 1;
    }
    const promos = promotionCounts(state.historyIndex);

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
      let missing = Math.max(0, (initialWhite[k] || 0) - (currentCounts[k] || 0));
      if (k === 'P') missing = Math.max(0, missing - promos.w);   // promoted, not captured
      for (let i = 0; i < missing; i++) whiteCaptured.push(k);
    });

    const blackCaptured = [];
    ['p', 'n', 'b', 'r', 'q'].forEach(k => {
      let missing = Math.max(0, (initialBlack[k] || 0) - (currentCounts[k] || 0));
      if (k === 'p') missing = Math.max(0, missing - promos.b);
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

  // Material advantage badge ("+3"), the way a playing site shows it: only for
  // the side that is ahead, and not while a position is being edited (a
  // half-built board has no meaningful balance yet).
  const matTop = $('materialTop');
  const matBottom = $('materialBottom');
  if (matTop || matBottom) {
    const editing = (typeof state !== 'undefined') && (state.setupMode === true ||
      (typeof isAuthoringMode === 'function' && isAuthoringMode() === true));
    const bal = materialBalance();
    const label = `Material — White ${bal.white} · Black ${bal.black} (pawn 1, knight 3, bishop 3, rook 5, queen 9)`;
    [[matTop, topColor], [matBottom, bottomColor]].forEach(pair => {
      const el = pair[0], color = pair[1];
      if (!el) return;
      if (editing) { el.textContent = ''; el.removeAttribute('title'); return; }
      const adv = (color === 'w') ? bal.diff : -bal.diff;
      el.textContent = adv > 0 ? '+' + adv : '';
      el.title = label;
    });
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

