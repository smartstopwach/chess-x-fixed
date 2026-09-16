// ============================================
// TOOL SELECTION
// ============================================
function setTool(tool) {
  // A click that is still inside its double-click window belongs to the tool
  // that was active when it happened - let it finish first, so switching tools
  // never silently swallows a drawing the teacher just asked for.
  if (typeof flushLeftAction === 'function') flushLeftAction();
  state.currentTool = tool;
  state.drawingFrom = null;
  state.rightArrowFrom = null;
  $$('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  els.board.style.cursor = (tool === 'arrow' || tool === 'rectangle') ? 'crosshair' :
                           tool === 'eraser' ? 'not-allowed' : 'default';
  if (typeof highlightSquares === 'function') highlightSquares();
}

