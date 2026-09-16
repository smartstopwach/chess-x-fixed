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
    let free = Math.min(box.w, box.h);
    // The wrapper alone cannot be trusted on a small window: the sidebars keep
    // their minimum width, so the reported box can be wider/taller than the
    // screen and an ancestor with overflow:hidden simply clips the board - a
    // phone showed the same 829px board as a desktop and the bottom ranks were
    // unreachable. What is left of the window from the wrapper's own top-left
    // corner is the real ceiling.
    try {
      const wr = wrapper.getBoundingClientRect();
      const EDGE = 12;
      const availW = window.innerWidth - Math.max(0, wr.left) - EDGE;
      const availH = window.innerHeight - Math.max(0, wr.top) - EDGE;
      if (availW > HARD_MIN) free = Math.min(free, availW);
      if (availH > HARD_MIN) free = Math.min(free, availH);
    } catch (e) {}
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
    let lastFree = -1;
    // Brake against a feedback loop between the two boxes - but a sliding one.
    // A permanent "3 refits and never again" counter used to disarm the watcher
    // for good: after three window resizes the board simply stopped following
    // the space it had (an emulated/device resize can report no window event at
    // all, leaving this observer as the only thing that can fix the size).
    const refitStamps = [];
    const MAX_REFITS_PER_SEC = 4;
    const HARD_MIN = 150;

    const settle = () => {
      const bc = document.getElementById('boardContainer');
      if (!bc) return;
      const box = boardFreeBox(wrapper, bc);
      const free = Math.min(box.w, box.h);
      if (free === lastFree) return;
      if (free < HARD_MIN || Math.abs(free - bc.getBoundingClientRect().height) <= 4) return;
      const now = Date.now();
      while (refitStamps.length && now - refitStamps[0] > 1000) refitStamps.shift();
      if (refitStamps.length >= MAX_REFITS_PER_SEC) return;
      refitStamps.push(now);
      lastFree = free;
      autoFitBoard();
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(settle, 80); };

    // Our own apply() repaints the wrapper too. Reacting to that would spin, so
    // it is debounced rather than acted on at once - but never *dropped*, or a
    // genuine change landing in the same window is lost.
    new ResizeObserver(schedule).observe(wrapper);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    if (window.visualViewport && window.visualViewport.addEventListener) {
      window.visualViewport.addEventListener('resize', schedule);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

// Entering or leaving fullscreen moves the free box by a whole row of chrome,
// so re-fit on the event instead of waiting for the resize that usually follows.
(function watchFullscreen() {
  const onFsChange = () => {
    autoFitBoard();
    // some engines report the new viewport a frame late
    if (window.requestAnimationFrame) requestAnimationFrame(autoFitBoard);
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
})();
