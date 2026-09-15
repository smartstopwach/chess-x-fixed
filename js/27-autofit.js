// ============================================
// AUTO-FIT BOARD (always fills available space, keeps SQUARE)
// ============================================
// The board is the point of the page, so it takes every pixel it can: the free
// box of #boardWrapper minus the player-info rows is handed to the board as a
// full square. There is no design-size cap any more, so a tall window really
// does get a tall board.
//
// Fitting once is not enough. A fit that runs in the middle of a mode
// transition measures a box that is about to change (the puzzle bar arrives a
// frame later, the info rows may still be 0px tall), which is how the board
// used to end up ~50px smaller than the room it had - or clipped, when the
// stale box was too generous. So the size is re-checked on the next frame, and
// a ResizeObserver on the wrapper keeps the board filling its cell for as long
// as the page is open.
function boardFreeBox(wrapper, boardContainer) {
  const cs = getComputedStyle(wrapper);
  const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const rowGap = parseFloat(cs.rowGap) || 0;
  const others = [...wrapper.children].filter(c => {
    if (c === boardContainer) return false;
    const s = getComputedStyle(c);
    return s.display !== 'none' && s.position !== 'absolute' && s.position !== 'fixed';
  });
  const otherH = others.reduce((sum, c) => sum + c.getBoundingClientRect().height, 0);
  const gapH = rowGap * Math.max(0, wrapper.children.length - 1);
  return {
    w: Math.floor(wrapper.clientWidth - padX),
    h: Math.floor(wrapper.clientHeight - padY - otherH - gapH)
  };
}

function autoFitBoard() {
  const wrapper = document.getElementById('boardWrapper');
  const boardContainer = document.getElementById('boardContainer');
  if (!wrapper || !boardContainer) return;
  // a board smaller than this is not worth drawing, but a phone in landscape
  // genuinely has less room than that - there we take what exists rather than
  // overflow the panel and clip the bottom rank
  const MIN_BOARD = 240;
  const HARD_MIN = 150;

  const wantSize = () => {
    const box = boardFreeBox(wrapper, boardContainer);
    const free = Math.min(box.w, box.h);
    return free < MIN_BOARD ? Math.max(HARD_MIN, free) : free;
  };
  const apply = (px) => {
    // tell the space-watcher that any resize it is about to see is ours
    wrapper.dataset.applying = '1';
    requestAnimationFrame(() => { wrapper.dataset.applying = '0'; });
    const s = Math.max(HARD_MIN, Math.round(px)) + 'px';
    boardContainer.style.setProperty('--board-size', s);
    boardContainer.style.width = s;
    boardContainer.style.height = s;
    // the player-info rows use the same variable, so they track the board width
    document.documentElement.style.setProperty('--board-size', s);
    renderAnnotations();
  };

  apply(wantSize());

  if (window.requestAnimationFrame) {
    requestAnimationFrame(() => {
      const next = wantSize();
      const got = boardContainer.getBoundingClientRect().height;
      if (Math.abs(next - got) > 1) apply(next);
    });
  }
}

// Keep the board filling its cell even when the layout settles late.
(function watchBoardSpace() {
  const start = () => {
    const wrapper = document.getElementById('boardWrapper');
    if (!wrapper || !window.ResizeObserver || wrapper.dataset.boardWatched) return;
    wrapper.dataset.boardWatched = '1';
    let timer = 0;
    let refits = 0;
    let lastFree = -1;
    new ResizeObserver(() => {
      // our own apply() changes the board, which repaints the wrapper: never
      // react to that, only to a wrapper that actually got more/less room
      if (wrapper.dataset.applying === '1') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const bc = document.getElementById('boardContainer');
        if (!bc) return;
        const box = boardFreeBox(wrapper, bc);
        const free = Math.min(box.w, box.h);
        const HARD_MIN = 150;
        const cur = bc.getBoundingClientRect().height;
        if (free === lastFree) { refits = 0; return; }
        // ignore a pixel of rounding; stop after a couple of genuine refits so
        // a feedback loop between the two boxes can never spin
        if (free >= HARD_MIN && Math.abs(free - cur) > 4 && refits < 3) {
          refits++; lastFree = free;
          autoFitBoard();
        }
      }, 80);
    }).observe(wrapper);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
