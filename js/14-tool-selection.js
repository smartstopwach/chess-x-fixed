// ============================================
// TOOL SELECTION
// ============================================
function setTool(tool) {
  state.currentTool = tool;
  state.drawingFrom = null;
  $$('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  els.board.style.cursor = (tool === 'arrow' || tool === 'rectangle') ? 'crosshair' :
                           tool === 'eraser' ? 'not-allowed' : 'default';
  if (typeof highlightSquares === 'function') highlightSquares();
}

