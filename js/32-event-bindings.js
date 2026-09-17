// ============================================
// EVENT BINDINGS
// ============================================
let __eventsBound = false;

function bindEvents() {
  if (__eventsBound) return;
  if (!els.board) return;
  __eventsBound = true;

  els.board.addEventListener('mousedown', onSquareMouseDown);
  els.board.addEventListener('mousemove', onSquareMouseMove);
  els.board.addEventListener('mouseup', onSquareMouseUp);

  // Touch support (phones / tablets): a tap = chess move, a swipe = arrow.
  // Board touches are gestures, not page-scroll gestures. Keep this
  // non-passive so onTouchStart can stop a phone from scrolling while a piece
  // is being picked up or dragged; the sidebars remain the page-scroll area.
  els.board.addEventListener('touchstart', onTouchStart, { passive: false });
  els.board.addEventListener('touchmove', onTouchMove, { passive: false });
  els.board.addEventListener('touchend', onTouchEnd, { passive: false });
  els.board.addEventListener('touchcancel', () => { touchHandledPress = false; cancelSquarePress(); });

  // Released outside the board (or the window lost focus)? Drop the gesture so
  // a stale press-square can't turn the next plain click into an arrow.
  window.addEventListener('mouseup', (e) => {
    if (!e.target || e.target === window || e.target === document) return;
    if (els.board.contains(e.target)) return;
    cancelSquarePress();
  });
  window.addEventListener('blur', cancelSquarePress);

  $('btnFlip').addEventListener('click', flipBoard);
  $('btnReset').addEventListener('click', resetBoard);
  const bUndo = $('btnUndo'); if (bUndo) bUndo.addEventListener('click', () => { prevMove(); });
  const bRedo = $('btnRedo'); if (bRedo) bRedo.addEventListener('click', () => { nextMove(); });
  $('btnFullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });

  $$('.tool-btn').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $$('.color-dot').forEach(b => b.addEventListener('click', () => {
    if (typeof setDrawingColor === 'function') setDrawingColor(b.dataset.color);
    else state.currentColor = b.dataset.color;
  }));
  const cycleBtn = $('btnCycleColor');
  if (cycleBtn) cycleBtn.addEventListener('click', cycleDrawingColor);
  $('btnClearAnnotations').addEventListener('click', clearAllAnnotations);

  const u1 = $('btnAnnoUndo'); if (u1) u1.addEventListener('click', undoAnnotation);
  const u2 = $('btnAnnoUndoBottom'); if (u2) u2.addEventListener('click', undoAnnotation);
  const r1 = $('btnAnnoRedo'); if (r1) r1.addEventListener('click', redoAnnotation);
  const r2 = $('btnAnnoRedoBottom'); if (r2) r2.addEventListener('click', redoAnnotation);

  $('btnStartFromPosition').addEventListener('click', startFromPosition);

  // Position setup advanced controls
  $('btnSetupUndo').addEventListener('click', setupUndo);
  $('btnSetupRedo').addEventListener('click', setupRedo);
  $$('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
  });
  $('btnLoadStandard').addEventListener('click', () => loadPreset('standard'));

  $('btnClearBoard').addEventListener('click', clearBoard);

  $('btnLoadFen').addEventListener('click', loadFen);
  $('btnCopyFen').addEventListener('click', copyFen);

  $('btnPrevMove').addEventListener('click', prevMove);
  $('btnNextMove').addEventListener('click', nextMove);
  $('btnDeleteMove').addEventListener('click', deleteMove);
  $('btnAddVariation').addEventListener('click', saveVariation);

  $('btnEngineToggle').addEventListener('click', toggleEngine);
  $('btnBotToggle').addEventListener('click', startBotGame);
  $('botElo').addEventListener('change', (e) => setBotElo(e.target.value));
  // Toggle left sidebar (Tools) visibility
  $('btnToggleLeftSidebar').addEventListener('click', () => {
    els.layout.classList.toggle('left-sidebar-visible');
    setTimeout(autoFitBoard, 50);
  });

  // Home / mode picker button
  $('btnHome').addEventListener('click', showFrontPage);
  // Mode card clicks on front page
  $$('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      if (mode === 'normal') setMode('normal');
      else if (mode === 'puzzle') setMode('puzzle');
      else if (mode === 'setup') setMode('setup');
    });
  });

  $('btnHideEngine').addEventListener('click', hideEngine);
  $('engineDepth').addEventListener('change', (e) => setEngineDepth(e.target.value));
  $('engineMultiPV').addEventListener('change', (e) => setEngineMultiPV(e.target.value));

  $$('.theme-btn').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
  $('pieceStyle').addEventListener('change', (e) => {
    state.pieceStyle = e.target.value;
    renderBoard();
    if (typeof initPieceRack === 'function') initPieceRack();
    if (typeof initPEPieceRack === 'function') initPEPieceRack();
    const styleName = e.target.options[e.target.selectedIndex]?.text || e.target.value;
    toast(`Piece style: ${styleName}`, 'success');
  });

  $$('[data-clock]').forEach(b => b.addEventListener('click', () => {
    setClock(parseInt(b.dataset.time));
    if (state.clock.running) toggleClock();
  }));
  $('btnSetCustomClock').addEventListener('click', () => {
    const min = parseInt($('clockCustom').value) || 10;
    setClock(min * 60);
    if (state.clock.running) toggleClock();
  });
  $('btnClockToggle').addEventListener('click', toggleClock);
  $('btnToggleClock').addEventListener('click', () => {
    state.clockHidden = !state.clockHidden;
    $('clockPanel').querySelector('.clocks').style.display = state.clockHidden ? 'none' : 'grid';
  });

  // Zoom buttons removed — board auto-fits to available space

  window.addEventListener('resize', () => { autoFitBoard(); renderAnnotations(); });
  setTimeout(autoFitBoard, 200);

  // NOTE: the clock used to switch on ANY board click - including clicks that
  // only drew an arrow, selected a piece or were rejected as illegal. It now
  // switches inside tryMakeMove(), i.e. only when a move really happened.

  // Prevent the browser menu on the board. A real right-button press already
  // erases in beginSquarePress(); only use contextmenu as a fallback when the
  // browser delivered that event without the matching mousedown. Otherwise a
  // single right-click would erase twice and add two setup-history entries.
  els.board.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const sq = e.target.closest('.square');
    if (!state.setupMode || !sq) return;
    // Browsers differ on whether contextmenu lands before or after mouseup.
    // The press path has already erased this square in either ordering; do not
    // perform the fallback a second time. Keep the fallback for context-menu
    // events that arrive without a matching right-button press.
    const alreadyHandled = lastRightEditSquare === sq.dataset.square &&
      (Date.now() - lastRightEditAt) < 1000;
    if (alreadyHandled) return;
    if (isAuthoringMode() && typeof peErasePiece === 'function') peErasePiece(sq.dataset.square);
    else erasePieceAt(sq.dataset.square);
  });

  // Double-click: pick up piece under cursor (in setup mode)
  els.board.addEventListener('dblclick', (e) => {
    if (!state.setupMode) return;
    const sq = e.target.closest('.square');
    if (!sq) return;
    const sqName = sq.dataset.square;
    const piece = getPieceAt(sqName);
    if (piece) {
      pickPieceFromBoard(sqName);
      toast(`Picked ${pieceName(piece)} from ${sqName} — click destination.`);
    }
  });

  // Allow drop on board squares
  els.board.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  els.board.addEventListener('drop', (e) => {
    e.preventDefault();
    const sq = e.target.closest('.square');
    if (!sq) return;
    const sqName = sq.dataset.square;
    const piece = e.dataTransfer.getData('text/plain') || state.dragPiece;
    state.dragPiece = null;
    if (piece) {
      // While authoring a puzzle the editor owns placement (its own undo history
      // and piece count); otherwise use the plain position-setup path.
      if (isAuthoringMode() && typeof pePlacePiece === 'function') pePlacePiece(sqName, piece);
      else placePieceOnSetup(sqName, piece);
      toast(`Dropped ${pieceName(piece)} on ${sqName}`);
    }
  });
}
