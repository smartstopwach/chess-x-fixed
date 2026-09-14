// ============================================
// AUTO-FIT BOARD (always fills available space, keeps SQUARE)
// ============================================
function autoFitBoard() {
  const wrapper = document.getElementById('boardWrapper');
  const boardContainer = document.getElementById('boardContainer');
  if (!wrapper || !boardContainer) return;

  // Available space inside wrapper (account for player-info rows above/below)
  // The two meta rows add ~52px (24px + 24px + 4px gap)
  const metaRows = (document.querySelector('.board-meta-top')?.getBoundingClientRect().height || 24) +
                    (document.querySelector('.board-meta-bottom')?.getBoundingClientRect().height || 24);
  const availW = wrapper.clientWidth - 24; // padding buffer
  const availH = wrapper.clientHeight - metaRows - 16; // account for meta rows + gap

  // Board MUST stay square — pick the smaller dim, then clamp
  const size = Math.max(320, Math.min(1100, Math.floor(Math.min(availW, availH))));

  boardContainer.style.setProperty('--board-size', size + 'px');
  // Also force width/height explicitly to override max-* shrinking
  boardContainer.style.width = size + 'px';
  boardContainer.style.height = size + 'px';
  setTimeout(renderAnnotations, 50);
}

