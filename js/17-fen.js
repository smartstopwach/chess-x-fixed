// ============================================
// FEN
// ============================================
function updateFen() {
  els.fenInput.value = state.game.fen();
}

function copyFen() {
  const fen = state.game.fen();
  // The async clipboard API needs a secure context and a permission; opened
  // from file:// or with the permission denied it REJECTS, and the old code had
  // no catch - the teacher got an unhandled error and no FEN. Fall back to the
  // old select-and-copy trick and say what happened either way.
  const fallback = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = fen;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const done = !!(document.execCommand && document.execCommand('copy'));
      document.body.removeChild(ta);
      toast(done ? 'FEN copied to clipboard' : 'Copy blocked — the FEN is selected in the box', done ? 'success' : 'error');
      if (!done && els.fenInput) { els.fenInput.value = fen; els.fenInput.focus(); els.fenInput.select(); }
    } catch (e) {
      toast('Copy blocked — the FEN is in the box below', 'error');
      if (els.fenInput) { els.fenInput.value = fen; els.fenInput.focus(); els.fenInput.select(); }
    }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fen)
        .then(() => toast('FEN copied to clipboard', 'success'))
        .catch(fallback);
      return;
    }
  } catch (e) {}
  fallback();
}

function loadFen() {
  const raw = ((els.fenInput && els.fenInput.value) || '').trim();
  if (!raw) { toast('Paste a FEN into the box first', 'error'); return; }
  // Same gatekeeper as Custom Setup: an impossible position would break check
  // and mate detection for everything taught from it.
  if (typeof validatePosition === 'function') {
    const check = validatePosition(raw);
    if (!check.ok) { toast('That position is impossible: ' + check.reason, 'error'); return; }
  }
  try {
    state.game.load(raw);
    resetMoveHistory();           // reset history on FEN load (no PGN); the
                                  // loaded position becomes the new start
    if (typeof syncSetupControlsFromFen === 'function') {
      syncSetupControlsFromFen(els.fenInput.value);
    }
    renderAll();
    toast('FEN loaded', 'success');
  } catch (e) {
    toast('Invalid FEN', 'error');
  }
}

