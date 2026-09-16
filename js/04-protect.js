// ============================================
// INSPECTION DETERRENT
// ============================================
// A page cannot *truly* disable DevTools - the browser always owns that key -
// so this file closes every path a page is allowed to close:
//   1. the keyboard shortcuts that open DevTools / view-source are swallowed
//      before anything else sees them
//   2. the right-click "Inspect" menu never appears (the board's own
//      contextmenu listener runs first, so right-click drawing/erase is
//      untouched)
//   3. a debugger trap notices when DevTools is open anyway (docked, undocked
//      or remote) and locks the whole app behind a full-screen guard until
//      they are closed again
//
// Owner escape hatch, for real debugging of your own site:
//   open it with  ?allowinspect=1   in the URL, or run once in the console
//   (from the browser menu, before the guard matters):
//     localStorage.setItem('chessx-allow-inspect', '1')
(function inspectGuard() {
  'use strict';

  var allowed = /[?&]allowinspect=1/.test(location.search);
  try {
    allowed = allowed || localStorage.getItem('chessx-allow-inspect') === '1';
  } catch (e) { /* private mode / file:// : the URL flag still works */ }
  if (allowed) return;

  // ---- 1. keyboard paths -----------------------------------------------
  // F12, Ctrl/Cmd+Shift+I (devtools), +J / +K (console), +C (element
  // picker), Ctrl/Cmd+U (view-source). Capture phase, so the app's own
  // shortcut handler never even sees a swallowed combo.
  window.addEventListener('keydown', function (e) {
    const k = (e.key || '').toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const block =
      k === 'f12' ||
      (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'k' || k === 'c')) ||
      (mod && k === 'u');
    if (block) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // ---- 2. no "Inspect" context menu -------------------------------------
  // Text fields keep their native menu (copy/paste while typing). The board
  // listens on #board itself, which fires before this document-level
  // listener, so setup-mode erase and right-click tools still work.
  document.addEventListener('contextmenu', function (e) {
    const t = e.target;
    if (t && typeof t.closest === 'function' && t.closest('input, textarea, select')) return;
    e.preventDefault();
  });

  // ---- 3. debugger trap + lock screen -----------------------------------
  let locked = false;

  function setLocked(on) {
    if (on === locked) return;
    locked = on;
    const g = document.getElementById('inspectGuard');
    if (g) g.classList.toggle('hidden', !on);
    if (document.body) document.body.dataset.inspect = on ? 'true' : 'false';
  }

  // Secondary signal: devtools docked to a side/bottom stretches the
  // outer-vs-inner window difference far beyond browser chrome alone.
  // Thresholds are deliberately high so bookmarks bars never trip it.
  function dockedHeuristic() {
    return (window.outerWidth - window.innerWidth > 200) ||
           (window.outerHeight - window.innerHeight > 300);
  }

  function tick() {
    const now = (window.performance && performance.now)
      ? () => performance.now() : () => Date.now();
    const t0 = now();
    debugger;            // a no-op unless DevTools is open, where it pauses here
    const paused = now() - t0 > 100;
    setLocked(paused || dockedHeuristic());
    setTimeout(tick, 800);
  }

  const start = () => setTimeout(tick, 1200);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
