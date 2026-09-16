// ============================================
// ANNOTATION HELPERS & 1-BY-1 UNDO / REDO HISTORY
// ============================================
const DRAWING_COLORS = [
  { hex: '#ffaa00', name: 'Amber / Gold' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#06b6d4', name: 'Cyan / Sky' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#84cc16', name: 'Lime' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#f59e0b', name: 'Warm Gold' },
  { hex: '#ffffff', name: 'White' },
];

function setDrawingColor(color) {
  if (!color) return;
  state.currentColor = color;
  $$('.color-dot').forEach(x => {
    x.classList.toggle('active', x.dataset.color && x.dataset.color.toLowerCase() === color.toLowerCase());
  });
  const colObj = DRAWING_COLORS.find(c => c.hex.toLowerCase() === color.toLowerCase());
  const name = colObj ? colObj.name : color;
  toast(`Color: ${name}`, 'info');
}

function cycleDrawingColor() {
  const cur = (state.currentColor || '#ffaa00').toLowerCase();
  const currentIdx = DRAWING_COLORS.findIndex(c => c.hex.toLowerCase() === cur);
  const nextIdx = (currentIdx + 1) % DRAWING_COLORS.length;
  const nextColor = DRAWING_COLORS[nextIdx];
  setDrawingColor(nextColor.hex);
}

const annoHistory = [];
let annoHistoryIndex = -1;

function pushAnnoHistory() {
  const snapshot = {
    arrows: state.arrows.map(a => ({ ...a })),
    circles: state.circles.map(c => ({ ...c })),
    highlights: state.highlights.map(h => ({ ...h })),
    rectangles: state.rectangles.map(r => ({ ...r })),
    triangles: (state.triangles || []).map(t => ({ ...t })),
    hexagons: (state.hexagons || []).map(h => ({ ...h }))
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

// Undo/Redo always drop a half-finished gesture first: a click-click origin
// mark is not a drawing, it never reaches the history, and leaving it behind
// would make the next click draw an arrow nobody asked for - even when there
// is nothing left to undo.
function dropTransientMarks() {
  const had = !!(state.drawingFrom || state.rightArrowFrom);
  state.drawingFrom = null;
  state.rightArrowFrom = null;
  if (had && typeof highlightSquares === 'function') highlightSquares();
  return had;
}

function undoAnnotation() {
  if (annoHistoryIndex <= 0) { dropTransientMarks(); return; }
  dropTransientMarks();
  annoHistoryIndex--;
  const snap = annoHistory[annoHistoryIndex];
  state.arrows = snap.arrows.map(a => ({ ...a }));
  state.circles = snap.circles.map(c => ({ ...c }));
  state.highlights = snap.highlights.map(h => ({ ...h }));
  state.rectangles = snap.rectangles.map(r => ({ ...r }));
  state.triangles = (snap.triangles || []).map(t => ({ ...t }));
  state.hexagons = (snap.hexagons || []).map(h => ({ ...h }));
  renderAnnotations();
  if (typeof highlightSquares === 'function') highlightSquares();
  updateAnnoButtons();
  toast('Undid 1 drawing', 'info');
}

function redoAnnotation() {
  if (annoHistoryIndex >= annoHistory.length - 1) { dropTransientMarks(); return; }
  dropTransientMarks();
  annoHistoryIndex++;
  const snap = annoHistory[annoHistoryIndex];
  state.arrows = snap.arrows.map(a => ({ ...a }));
  state.circles = snap.circles.map(c => ({ ...c }));
  state.highlights = snap.highlights.map(h => ({ ...h }));
  state.rectangles = snap.rectangles.map(r => ({ ...r }));
  state.triangles = (snap.triangles || []).map(t => ({ ...t }));
  state.hexagons = (snap.hexagons || []).map(h => ({ ...h }));
  renderAnnotations();
  if (typeof highlightSquares === 'function') highlightSquares();
  updateAnnoButtons();
  toast('Redid 1 drawing', 'info');
}

// Total number of drawings on the board - all SIX kinds. Anything that decides
// "did the board change?" must count every kind, or a change to triangles /
// hexagons would skip the history step and become impossible to undo.
function annoTotal() {
  return state.arrows.length + state.circles.length + state.highlights.length +
         state.rectangles.length + (state.triangles || []).length + (state.hexagons || []).length;
}

// Returns true when the arrow was added, false when an identical arrow was
// already there and got toggled off.
function addArrow(from, to) {
  const idx = state.arrows.findIndex(a => a.from === from && a.to === to && a.color === state.currentColor);
  if (idx >= 0) state.arrows.splice(idx, 1);
  else state.arrows.push({ from, to, color: state.currentColor });
  renderAnnotations();
  pushAnnoHistory();
  return idx < 0;
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

// Place-if-missing: a single left click puts the shape down, a double left
// click takes it away again (eraseAnnotationAt), so placing never toggles.
// Returns true only when the shape was really put down.
function addShapeOnce(kind, sq) {
  const list = state[kind];
  if (!list || !sq) return false;
  if (list.some(x => x.square === sq && x.color === state.currentColor)) return false;
  list.push({ square: sq, color: state.currentColor });
  renderAnnotations();
  pushAnnoHistory();
  return true;
}

function addTriangle(sq) { return addShapeOnce('triangles', sq); }
function addHexagon(sq) { return addShapeOnce('hexagons', sq); }

// Same box, same colour = the same rectangle: never stack duplicates on top of
// each other (they are invisible, and each one would need its own undo step).
// c3-f6 and f6-c3 describe one box, so the pair is compared sorted.
function addRectangle(from, to) {
  if (!from) return false;
  if (!to) to = from;
  const key = [from, to].sort().join('|');
  const dup = state.rectangles.some(r => [r.from, r.to].sort().join('|') === key && r.color === state.currentColor);
  if (dup) return false;
  state.rectangles.push({ from, to, color: state.currentColor });
  renderAnnotations();
  pushAnnoHistory();
  return true;
}

function pointOnSegment(p1, p2, p) {
  const minR = Math.min(p1.r, p2.r);
  const maxR = Math.max(p1.r, p2.r);
  const minC = Math.min(p1.c, p2.c);
  const maxC = Math.max(p1.c, p2.c);
  if (p.r < minR || p.r > maxR || p.c < minC || p.c > maxC) return false;
  const cross = (p.c - p1.c) * (p2.r - p1.r) - (p.r - p1.r) * (p2.c - p1.c);
  return cross === 0;
}

function arrowTouchesSquare(arrow, sq) {
  if (arrow.from === sq || arrow.to === sq) return true;
  const a = squareRC(arrow.from);
  const b = squareRC(arrow.to);
  const t = squareRC(sq);
  const dr = b.r - a.r;
  const dc = b.c - a.c;

  if (typeof arrowIsKnightMove === 'function' && arrowIsKnightMove(arrow.from, Math.abs(dr), Math.abs(dc))) {
    const elbow = Math.abs(dr) >= Math.abs(dc) ? { r: b.r, c: a.c } : { r: a.r, c: b.c };
    if (pointOnSegment(a, elbow, t) || pointOnSegment(elbow, b, t)) return true;
    return false;
  }

  return pointOnSegment(a, b, t);
}

function squareInRectangle(rect, sq) {
  if (rect.from === sq || rect.to === sq) return true;
  const a = squareRC(rect.from);
  const b = squareRC(rect.to);
  const target = squareRC(sq);
  const minR = Math.min(a.r, b.r);
  const maxR = Math.max(a.r, b.r);
  const minC = Math.min(a.c, b.c);
  const maxC = Math.max(a.c, b.c);
  return target.r >= minR && target.r <= maxR && target.c >= minC && target.c <= maxC;
}

function eraseAnnotationAt(sq) {
  const prevCount = annoTotal();
  state.arrows = state.arrows.filter(a => !arrowTouchesSquare(a, sq));
  state.circles = state.circles.filter(c => c.square !== sq);
  state.highlights = state.highlights.filter(h => h.square !== sq);
  state.rectangles = state.rectangles.filter(r => !squareInRectangle(r, sq));
  state.triangles = (state.triangles || []).filter(t => t.square !== sq);
  state.hexagons = (state.hexagons || []).filter(h => h.square !== sq);
  const removed = annoTotal() !== prevCount;
  renderAnnotations();
  if (removed) pushAnnoHistory();
  return removed;
}

function clearAllAnnotations(keepHistory) {
  const hadAny = annoTotal() > 0;
  state.arrows = [];
  state.circles = [];
  state.highlights = [];
  state.rectangles = [];
  state.triangles = [];
  state.hexagons = [];
  state.drawingFrom = null;
  state.rightArrowFrom = null;
  if (typeof cancelLeftAction === 'function') cancelLeftAction();
  renderAnnotations();
  if (typeof highlightSquares === 'function') highlightSquares();
  if (hadAny && keepHistory !== false) pushAnnoHistory();
}

function initAnnoHistory() {
  annoHistory.length = 0;
  annoHistoryIndex = -1;
  pushAnnoHistory(); // record initial empty state
}

