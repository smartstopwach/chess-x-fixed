// ============================================
// INITIALIZATION
// ============================================
let __bootInitialized = false;
let deferredInstallPrompt = null;

function initWebAppControls() {
  const installButton = $('btnInstallApp');
  const installNote = $('appInstallNote');
  const setNote = message => {
    if (installNote) installNote.textContent = message || '';
  };
  const standalone = () => {
    const mediaStandalone = typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    return mediaStandalone || (typeof navigator !== 'undefined' && navigator.standalone === true);
  };
  const markInstalled = () => {
    if (!installButton) return;
    installButton.classList.add('is-installed');
    installButton.querySelector('strong').textContent = 'Web App Ready';
    installButton.querySelector('small').textContent = 'Already installed';
    installButton.disabled = true;
  };

  if (standalone()) markInstalled();

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
        const isAppleTouch = /iPad|iPhone|iPod/.test(ua) ||
          (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' &&
            Number(navigator.maxTouchPoints || 0) > 1);
        const isSafari = /Safari\//.test(ua) &&
          !/(Chrome|CriOS|Edg|Firefox|FxiOS|OPR)\//.test(ua);
        const isFirefox = /(Firefox|FxiOS)\//.test(ua);
        if (isAppleTouch) {
          setNote('iPhone or iPad: Share → Add to Home Screen.');
        } else if (isSafari) {
          setNote('Safari: File → Add to Dock, or Share → Add to Home Screen.');
        } else if (isFirefox) {
          setNote('Firefox: open the page menu and choose Install.');
        } else {
          setNote('Open your browser menu and choose Install app or Add to Home screen.');
        }
        return;
      }
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') setNote('ChessX is being installed.');
        else setNote('Installation cancelled. You can try again from the browser menu.');
      } catch (e) {
        setNote('Open the browser menu and choose Install app.');
      }
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (!standalone()) setNote('Ready to install as an app on this device.');
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setNote('ChessX is installed on this device.');
    markInstalled();
  });

  if (typeof navigator !== 'undefined' && navigator.serviceWorker &&
      typeof navigator.serviceWorker.register === 'function') {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Opening the static site from file:// or a restricted host is still valid;
      // only offline/PWA installation is unavailable in that environment.
    });
  }
}

function init() {
  if (typeof Chess === 'undefined') {
    console.warn('Chess.js not loaded yet, retrying...');
    setTimeout(() => {
      state.game = createGame();
      doInit();
    }, 100);
    return;
  }
  doInit();
}

function safeCall(name, fn) {
  try { fn(); } catch (e) { console.error(name + ' failed:', e); }
}

function doInit() {
  // Initialization can be requested by both DOMContentLoaded and a dependency
  // retry. Keep it one-shot so every button and board gesture gets one listener.
  if (__bootInitialized) return;
  __bootInitialized = true;

  // CRITICAL: render the board FIRST so user sees something even if other things fail
  safeCall('renderBoard', renderBoard);
  safeCall('updateFen', updateFen);

  // Then do the rest independently
  safeCall('initPieceRack', initPieceRack);
  safeCall('initPEPieceRack', initPEPieceRack);
  renderLibrary();
  renderChapterSelect();
  loadPuzzleToEditor(null);
  pushSetupHistory(); // initial state
  safeCall('initAnnoHistory', initAnnoHistory);
  updatePieceCount();
  updateSetupHint();
  // Library / Puzzle editor event listeners
  $('librarySearch').addEventListener('input', (e) => renderLibrary(e.target.value));
  $('btnNewChapter').addEventListener('click', () => {
    const name = prompt('Chapter name:', 'New Chapter');
    if (!name || !name.trim()) return;
    const lib = getLibrary();
    const newChap = { id: uniqueId('chapter'), name: name.trim(), expanded: true, puzzles: [] };
    lib.chapters.push(newChap);
    lib.activeChapterId = newChap.id;
    saveLibrary(lib);
    renderLibrary($('librarySearch')?.value || '');
    renderChapterSelect();
    toast(`Chapter "${name.trim()}" created`, 'success');
  });
  $('btnSavePuzzle').addEventListener('click', saveCurrentPuzzle);
  $('btnNewPuzzle').addEventListener('click', newPuzzle);
  $('btnQuickChapter').addEventListener('click', () => $('btnNewChapter').click());
  $('btnQuickPuzzle').addEventListener('click', enterAuthoringForNewPuzzle);
  $('btnQuickTest').addEventListener('click', testPuzzleAsStudent);

  // Authoring toolbar buttons
  $('btnAuthoringCapture').addEventListener('click', peCaptureFromBoard);
  $('btnAuthoringLoad').addEventListener('click', peLoadToBoard);
  $('btnAuthoringSave').addEventListener('click', saveCurrentPuzzle);
  $('btnAuthoringTest').addEventListener('click', testPuzzleAsStudent);
  $('btnAuthoringNew').addEventListener('click', enterAuthoringForNewPuzzle);
  $('btnAuthoringExit').addEventListener('click', exitAuthoringMode);
  $('btnDeletePuzzle').addEventListener('click', deleteCurrentPuzzle);
  $('btnPECaptureBoard').addEventListener('click', peCaptureFromBoard);
  $('btnPELoadToBoard').addEventListener('click', peLoadToBoard);

  // Puzzle editor position setup (independent state)
  initPEPieceRack();
  peSetupPushHistory();
  peUpdatePieceCount();
  peUpdateHint();

  $('btnPEUndo').addEventListener('click', peSetupUndo);
  $('btnPERedo').addEventListener('click', peSetupRedo);
  $('btnPEEmpty').addEventListener('click', peClearBoard);
  $('btnPEStart').addEventListener('click', resetPuzzleSetupToStandard);
  $('btnPEUseForPuzzle').addEventListener('click', peUseForPuzzle);
  $$('.pe-preset').forEach(btn => {
    btn.addEventListener('click', () => peLoadPreset(btn.dataset.preset));
  });

  $('btnTestPuzzle').addEventListener('click', testPuzzleAsStudent);
  $('btnEditPosition').addEventListener('click', () => {
    // Enter the piece editor from a playable board, keeping the position.
    try { if (puzzleGame()) puzzleGame().load(state.game.fen()); } catch (e) {}
    setAuthoringMode(true);
    renderAll();
    toast('Editing position - clicks place/move pieces. ✕ Exit (or Esc) to play again', 'success');
  });
  $('btnRevealAnswer').addEventListener('click', revealPuzzleAnswer);
  $('btnPuzzleBack').addEventListener('click', () => endPuzzleTest(true));
  $('btnPuzzleDone').addEventListener('click', () => endPuzzleTest(false));
  $('btnExportLibrary').addEventListener('click', exportLibrary);
  $('btnImportLibrary').addEventListener('click', () => $('libraryFileInput').click());
  $('libraryFileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) importLibrary(e.target.files[0]);
    e.target.value = '';
  });

  safeCall('bindEvents', bindEvents);
  safeCall('initWebAppControls', initWebAppControls);

  // Try to init engine, but don't block the rest
  setTimeout(() => safeCall('initEngine', initEngine), 50);

  safeCall('updateClocks', updateClocks);

  // Front page on first load - but if the user was mid-work when the page was
  // reloaded (or closed), put them back where they were instead of wiping it.
  if (typeof restoreSession === 'function') safeCall('restoreSession', restoreSession);
  else showFrontPage();

  console.log('ChessX initialized successfully');
}

// Fallback: if DOMContentLoaded already fired (script loaded late), init immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
