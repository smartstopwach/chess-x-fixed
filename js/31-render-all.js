// ============================================
// RENDER ALL
// ============================================
function renderAll() {
  // Every step is isolated: one panel throwing must never abort the rest of
  // the refresh, and must never propagate back into the click handler that
  // asked for the repaint (that is how a legal move used to end up reported
  // as "illegal").
  try { renderBoard(); }       catch (e) { console.error('renderBoard failed', e); }
  try { renderAnnotations(); } catch (e) { console.error('renderAnnotations failed', e); }
  try { highlightSquares(); }  catch (e) { console.error('highlightSquares failed', e); }
  try { renderMovesList(); }   catch (e) { console.error('renderMovesList failed', e); }
  try { updateFen(); }         catch (e) { console.error('updateFen failed', e); }
}

