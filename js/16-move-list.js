// ============================================
// MOVE LIST
// ============================================
// Where the game on screen started. Every navigation function replays SAN on
// top of this, so it follows Custom Setup / FEN loads / puzzles automatically.
function baseFen() {
  const b = (state.baseFen || '').trim();
  return b || START_FEN;
}

// Start a fresh move list from the position that is on the board right now
// (or from an explicit FEN). Never reset history without saying where it
// starts, or undo will take the board back to the standard opening.
function resetMoveHistory(fen) {
  let base = (fen || '').trim();
  if (!base) { try { base = state.game.fen(); } catch (e) { base = ''; } }
  state.baseFen = base || START_FEN;
  state.history = [];
  state.historyIndex = -1;
}

function renderMovesList() {
  els.movesList.innerHTML = '';
  const history = state.history || [];

  for (let i = 0; i < history.length; i++) {
    const san = history[i];
    if (i % 2 === 0) {
      const num = document.createElement('span');
      num.className = 'move-num';
      num.textContent = `${Math.floor(i/2) + 1}.`;
      els.movesList.appendChild(num);
    }
    const moveSpan = document.createElement('span');
    moveSpan.className = 'move-san';
    if (i === state.historyIndex) moveSpan.classList.add('current');
    moveSpan.textContent = san;
    moveSpan.dataset.idx = i;
    moveSpan.addEventListener('click', () => goToMove(i));
    els.movesList.appendChild(moveSpan);
  }

  const current = els.movesList.querySelector('.current');
  safeScrollIntoView(current, { block: 'nearest', behavior: 'smooth' });
  renderVariations();
}

// ---- saved positions ("+ Variation") ---------------------------------------
// The button used to push a FEN into an array nobody ever looked at again and
// then claimed "Variation saved". The saved positions are now chips under the
// move list: click one to put that position back on the board and start a new
// line from it, click its × to throw it away. They survive a reload.
function variationFen(v) { return (typeof v === 'string') ? v : (v && v.fen) || ''; }

function variationLabel(v, i) {
  if (v && typeof v === 'object' && v.label) return v.label;
  return 'Position ' + (i + 1);
}

function renderVariations() {
  const box = $('variationList');
  if (!box) return;
  const list = state.variations || [];
  box.innerHTML = '';
  if (!list.length) { box.style.display = 'none'; return; }
  box.style.display = '';
  list.forEach((v, i) => {
    const fen = variationFen(v);
    if (!fen) return;
    const chip = document.createElement('span');
    chip.className = 'variation-chip';
    chip.title = fen;

    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'variation-go';
    go.textContent = '\u27F2 ' + variationLabel(v, i);
    go.title = 'Put this position back on the board';
    go.addEventListener('click', () => goToVariation(i));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'variation-del';
    del.textContent = '\u00D7';
    del.title = 'Remove this saved position';
    del.addEventListener('click', () => removeVariation(i));

    chip.appendChild(go);
    chip.appendChild(del);
    box.appendChild(chip);
  });
}

function saveVariation() {
  const fen = state.game.fen();
  const idx = (typeof state.historyIndex === 'number') ? state.historyIndex : -1;
  const ply = idx + 1;                       // 0 would be falsy - never use || here
  const san = (idx >= 0) ? state.history[idx] : null;
  const label = san ? (Math.ceil(ply / 2) + (ply % 2 === 1 ? '.' : '...') + san) : 'start';
  if (!(state.variations || []).some(v => variationFen(v) === fen)) {
    state.variations.push({ fen: fen, label: label, ply: ply });
  }
  renderVariations();
  toast(`Position saved below the move list (${state.variations.length})`, 'success');
}

function goToVariation(i) {
  const fen = variationFen((state.variations || [])[i]);
  if (!fen) return;
  if (typeof loadFENToBoard === 'function') loadFENToBoard(fen);
  else { try { state.game.load(fen); resetMoveHistory(fen); renderAll(); } catch (e) {} }
}

function removeVariation(i) {
  (state.variations || []).splice(i, 1);
  renderVariations();
  toast('Saved position removed', 'info');
}

function goToMove(idx) {
  if (idx < -1 || idx >= state.history.length) return;
  state.historyIndex = idx;
  if (idx < 0) {
    state.game.load(baseFen());
  } else {
    state.game.load(getFenAtMove(idx));
  }
  state.selectedSquare = null;
  renderAll();
  try { playMoveSound(idx >= 0 ? state.history[idx] : ''); } catch (e) {}
}

function getFenAtMove(idx) {
  // idx is into state.history (persistent, SAN strings), replayed on the
  // position this game actually started from
  const game = new Chess();
  try { game.load(baseFen()); } catch (e) { game.reset(); }
  for (let i = 0; i <= idx && i < state.history.length; i++) {
    try { game.move(state.history[i]); } catch (e) {}
  }
  return game.fen();
}

function getCurrentFen() {
  // The actual FEN shown on the board, reconstructed from history up to historyIndex
  if (state.historyIndex < 0) {
    return baseFen();
  }
  return getFenAtMove(state.historyIndex);
}

function nextMove() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.game.load(getFenAtMove(state.historyIndex));
    state.selectedSquare = null;
    renderAll();
    try { playMoveSound(state.history[state.historyIndex]); } catch (e) {}
  }
}

function prevMove() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.game.load(getFenAtMove(state.historyIndex));
    state.selectedSquare = null;
    renderAll();
    try { playMoveSound(state.history[state.historyIndex]); } catch (e) {}
  } else if (state.historyIndex === 0) {
    state.historyIndex = -1;
    state.game.load(baseFen());
    state.selectedSquare = null;
    renderAll();
    try { playMoveSound(''); } catch (e) {}
  }
}

function deleteMove() {
  if (state.history.length === 0) return;
  const lastSan = state.history[state.history.length - 1];
  state.history.pop();
  state.historyIndex = state.history.length - 1;
  if (state.historyIndex < 0) {
    state.game.load(baseFen());
  } else {
    state.game.load(getFenAtMove(state.historyIndex));
  }
  state.selectedSquare = null;
  renderAll();
  requestEngineEval();
  toast(`Deleted: ${lastSan}`, 'success');
}

