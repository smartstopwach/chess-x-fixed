// ============================================
// UTILITIES
// ============================================
// Pop-up toasts were disabled per user request, but `toast()` is called from
// ~90 places to report refusals ("Cannot start from this position: ..."), the
// clock expiring, a saved puzzle, a failed clipboard write. With the function
// stubbed out every one of those was silent, so a rejected action looked like a
// dead button. Messages now go to a slim inline pill over the board instead of a
// floating pop-up: same information, no overlay, no layout change.
let boardMsgTimer = 0;

function showBoardMessage(message, kind) {
  const el = (typeof document !== 'undefined') ? document.getElementById('boardMsg') : null;
  if (!el) return;
  clearTimeout(boardMsgTimer);
  const text = (message === null || message === undefined) ? '' : String(message);
  if (!text) { el.textContent = ''; el.className = 'board-msg'; return; }
  el.textContent = text;
  el.className = 'board-msg show' + (kind ? ' ' + kind : '');
  boardMsgTimer = setTimeout(() => { el.textContent = ''; el.className = 'board-msg'; }, 6000);
}

function toast(message, type = '') {
  if (!message) return;
  const kind = (type === 'error') ? 'error'
    : (type === 'success' || type === 'ok') ? 'success'
    : (type === 'warn' || type === 'warning') ? 'warn' : '';
  showBoardMessage(message, kind);
}

function squareName(r, c) {
  return String.fromCharCode(97 + c) + (8 - r);
}

function squareRC(sq) {
  return { r: 8 - parseInt(sq[1]), c: sq.charCodeAt(0) - 97 };
}

function isLight(r, c) { return (r + c) % 2 === 0; }

function showSquare(name) {
  const { r, c } = squareRC(name);
  return els.board.children[r * 8 + c];
}

