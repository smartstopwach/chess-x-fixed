// ============================================
// ANNOTATION HELPERS & 1-BY-1 UNDO / REDO HISTORY
// ============================================
const annoHistory = [];
let annoHistoryIndex = -1;

function pushAnnoHistory() {
  const snapshot = {
    arrows: state.arrows.map(a => ({ ...a })),
    circles: state.circles.map(c => ({ ...c })),
    highlights: state.highlights.map(h => ({ ...h })),
    rectangles: state.rectangles.map(r => ({ ...r }))
  };
  // Truncate future redo branch if we are in the middle of history
  annoHistory.length = annoHistoryIndex + 1;
  annoHistory.push(snapshot);
  if (annoHistory.length > 100) annoHistory.shift();
  annoHistoryIndex = annoHistory.length - 1;
  updateAnnoButtons();
}

function updateAnnoButtons() {
  const canUndo = annoHistoryIndex > 0;
  const canRedo = annoHistoryIndex >= 0 && annoHistoryIndex < annoHistory.length - 1;
  ['btnAnnoUndo', 'btnAnnoUndoBottom'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = !canUndo;
  });
  ['btnAnnoRedo', 'btnAnnoRedoBottom'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = !canRedo;
  });
}

function undoAnnotation() {
  if (annoHistoryIndex <= 0) return;
  annoHistoryIndex--;
  const snap = annoHistory[annoHistoryIndex];
  state.arrows = snap.arrows.map(a => ({ ...a }));
  state.circles = snap.circles.map(c => ({ ...c }));
  state.highlights = snap.highlights.map(h => ({ ...h }));
  state.rectangles = snap.rectangles.map(r => ({ ...r }));
  state.drawingFrom = null;
  renderAnnotations();
  if (typeof highlightSquares === 'function') highlightSquares();
  updateAnnoButtons();
  toast('Undid 1 drawing', 'info');
}

function redoAnnotation() {
  if (annoHistoryIndex >= annoHistory.length - 1) return;
  annoHistoryIndex++;
  const snap = annoHistory[annoHistoryIndex];
  state.arrows = snap.arrows.map(a => ({ ...a }));
  state.circles = snap.circles.map(c => ({ ...c }));
  state.highlights = snap.highlights.map(h => ({ ...h }));
  state.rectangles = snap.rectangles.map(r => ({ ...r }));
  state.drawingFrom = null;
  renderAnnotations();
  if (typeof highlightSquares === 'function') highlightSquares();
  updateAnnoButtons();
  toast('Redid 1 drawing', 'info');
}

function addArrow(from, to) {
  const idx = state.arrows.findIndex(a => a.from === from && a.to === to && a.color === state.currentColor);
  if (idx >= 0) state.arrows.splice(idx, 1);
  else state.arrows.push({ from, to, color: state.currentColor });
  renderAnnotations();
  pushAnnoHistory();
}

function addCircle(sq) {
  const idx = state.circles.findIndex(c => c.square === sq && c.color === state.currentColor);
  if (idx >= 0) state.circles.splice(idx, 1);
  else state.circles.push({ square: sq, color: state.currentColor });
  renderAnnotations();
  pushAnnoHistory();
}

function addHighlight(sq) {
  const idx = state.highlights.findIndex(h => h.square === sq && h.color === state.currentColor);
  if (idx >= 0) state.highlights.splice(idx, 1);
  else state.highlights.push({ square: sq, color: state.currentColor });
  renderAnnotations();
  pushAnnoHistory();
}

function addRectangle(from, to) {
  state.rectangles.push({ from, to, color: state.currentColor });
  renderAnnotations();
  pushAnnoHistory();
}

function eraseAnnotationAt(sq) {
  const prevCount = state.arrows.length + state.circles.length + state.highlights.length + state.rectangles.length;
  state.arrows = state.arrows.filter(a => a.from !== sq && a.to !== sq);
  state.circles = state.circles.filter(c => c.square !== sq);
  state.highlights = state.highlights.filter(h => h.square !== sq);
  state.rectangles = state.rectangles.filter(r => r.from !== sq && r.to !== sq);
  const newCount = state.arrows.length + state.circles.length + state.highlights.length + state.rectangles.length;
  renderAnnotations();
  if (prevCount !== newCount) pushAnnoHistory();
}

function clearAllAnnotations(keepHistory) {
  const hadAny = state.arrows.length > 0 || state.circles.length > 0 || state.highlights.length > 0 || state.rectangles.length > 0;
  state.arrows = [];
  state.circles = [];
  state.highlights = [];
  state.rectangles = [];
  state.drawingFrom = null;
  renderAnnotations();
  if (typeof highlightSquares === 'function') highlightSquares();
  if (hadAny && keepHistory !== false) pushAnnoHistory();
}

function initAnnoHistory() {
  annoHistory.length = 0;
  annoHistoryIndex = -1;
  pushAnnoHistory(); // record initial empty state
}

