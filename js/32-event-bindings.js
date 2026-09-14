// ============================================
// EVENT BINDINGS
// ============================================
function bindEvents() {
  els.board.addEventListener('mousedown', onSquareMouseDown);
  els.board.addEventListener('mousemove', onSquareMouseMove);
  els.board.addEventListener('mouseup', onSquareMouseUp);

  // Touch support (phones / tablets): a tap = chess move, a swipe = arrow.
  els.board.addEventListener('touchstart', onTouchStart, { passive: true });
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
  $('btnUndo').addEventListener('click', () => { prevMove(); });
  $('btnRedo').addEventListener('click', () => { nextMove(); });
  $('btnFullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });

  $$('.tool-btn').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $$('.color-dot').forEach(b => b.addEventListener('click', () => {
    state.currentColor = b.dataset.color;
    $$('.color-dot').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));
  $('btnClearAnnotations').addEventListener('click', clearAllAnnotations);

  $('btnStartFromPosition').addEventListener('click', () => {
    state.setupMode = false;
    state.heldPiece = null;
    state.selectedRackPiece = null;
    $$('.rack-piece').forEach(x => x.classList.remove('selected'));
    $$('.square').forEach(sq => sq.classList.remove('drop-target', 'drop-invalid', 'held-source'));
    updateSetupHint();
    state.selectedRackPiece = null;
    $$('.rack-piece').forEach(x => x.classList.remove('selected'));
    state.history = [];
    state.historyIndex = -1;
    renderAll();
    requestEngineEval();
    toast('Position set', 'success');
  });

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
  $('btnAddVariation').addEventListener('click', () => {
    const fen = state.game.fen();
    if (!state.variations.includes(fen)) state.variations.push(fen);
    toast('Variation saved', 'success');
  });

  $('btnEngineToggle').addEventListener('click', toggleEngine);
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
  $('pieceStyle').addEventListener('change', (e) => { state.pieceStyle = e.target.value; renderBoard(); });

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

  els.board.addEventListener('click', () => {
    if (state.clock.running) setTimeout(switchClockSide, 100);
  });

  // Prevent right-click menu on board AND erase piece in setup mode
  els.board.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (state.setupMode) {
      const sq = e.target.closest('.square');
      if (sq) {
        erasePieceAt(sq.dataset.square);
      }
    }
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
    if (piece) {
      placePieceOnSetup(sqName, piece);
      toast(`Dropped ${pieceName(piece)} on ${sqName}`);
    }
  });
}

