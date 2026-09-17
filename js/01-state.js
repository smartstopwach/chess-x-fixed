// ============================================
// STATE
// ============================================
function createGame() {
  if (typeof Chess !== 'undefined') {
    try { return new Chess(); } catch (e) {}
  }
  // Fallback stub
  return {
    _board: Array(8).fill(null).map(()=>Array(8).fill(null)),
    _turn: 'w',
    _history: [],
    board() { return this._board; },
    history() { return []; },
    moves() { return []; },
    fen() { return '8/8/8/8/8/8/8/8 w - - 0 1'; },
    in_check() { return false; },
    turn() { return 'w'; },
    move() { return null; },
    undo() { return null; },
    reset() {},
    pgn() { return ''; },
    load() { return null; },
    load_pgn() { return null; },
    get() { return null; }
  };
}

const state = {
  game: createGame(),
  history: [],           // Persistent move history (SAN strings), survives undo/load
  historyIndex: -1,      // Pointer into history: -1 = start, history.length-1 = latest
  baseFen: START_FEN,    // position the current move list is played from
  position: { fen: '' },
  flipped: false,
  selectedSquare: null,
  currentTool: 'select',
  currentColor: '#ffaa00',
  annotations: [],
  arrows: [],
  circles: [],
  highlights: [],
  rectangles: [],
  triangles: [],
  hexagons: [],
  rightArrowFrom: null,   // first square of a right-click-click arrow
  drawingFrom: null,
  isDrawing: false,
  boardTheme: 'classic',
  pieceStyle: 'alpha',
  boardSize: 640,
  variations: [],
  currentVariation: 'main',
  puzzle: null,
  clock: { wTime: 600, bTime: 600, running: false, activeColor: 'w', interval: null },
  layout: 'focus',
  uiHidden: false,
  clockHidden: false,
  engineHidden: false,
  setupMode: false,
  authoringMode: false,
  selectedRackPiece: null,
  deletingMode: false,
  pendingPromotion: null,
  movesListData: [],
  engine: {
    stockfish: null,
    enabled: false,
    evaluating: false,
    depth: 15,          // what the teacher asked for (the Depth select)
    searchDepth: 0,     // what Stockfish has actually reached so far
    multipv: 1,
    eval: 0,
    bestMove: '',
    pv: '',
    lines: []
  },
  bot: {
    active: false,
    color: null,        // the side Stockfish plays; the user gets the board-bottom side
    elo: 1000,
    thinking: false,
    searchId: 0,
    timer: null,
    stockfish: null
  },
  drag: { active: false, piece: null, from: null }
};

if (typeof window !== 'undefined') {
  window.state = state;
}

