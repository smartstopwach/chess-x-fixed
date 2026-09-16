/* ============================================
   ChessX — Professional Chess Teaching Studio
   ============================================ */

// The position a game is played FROM. Undo, the move list, deleteMove and the
// FEN read-out all replay the recorded SAN moves on top of this position, so it
// has to be remembered every time a custom position (Custom Setup, the FEN box,
// a puzzle) becomes the new start - otherwise navigation silently rebuilds the
// standard opening instead of the position on screen.
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Material values - the standard teaching scale: pawn 1, knight 3, bishop 3,
// rook 5, queen 9. The king is priceless (it can never be captured), so 0.
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Use high-quality unicode chess pieces (for fallback)
const PIECE_FONT = {
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚'
};

