// ============================================
// UTILITIES
// ============================================
function toast(message, type = '') {
  els.toast.textContent = message;
  els.toast.className = 'toast show ' + type;
  clearTimeout(els.toast._timer);
  els.toast._timer = setTimeout(() => { els.toast.classList.remove('show'); }, 2500);
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

