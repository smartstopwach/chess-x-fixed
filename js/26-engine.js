// ============================================
// ENGINE (STOCKFISH)
// ============================================
function initEngine() {
  try {
    if (typeof StockfishEngine === 'undefined') {
      $('engineStatus').textContent = 'Unavailable';
      return;
    }
    state.engine.stockfish = new StockfishEngine();
    state.engine.stockfish.onMessage((line) => handleEngineMessage(line));
    state.engine.stockfish.init();
    $('engineStatus').textContent = 'Ready';
  } catch (e) {
    console.warn('Engine init:', e.message || e);
    $('engineStatus').textContent = 'Unavailable';
  }
}

function handleEngineMessage(line) {
  if (typeof line !== 'string') return;
  // Switching analysis off sends `stop`, and the engine keeps flushing the
  // search it was told to abandon for a moment afterwards. Those late lines
  // must not repaint the panel - the status used to end up frozen on
  // "Analyzing d14" with analysis switched off, and a move from a cancelled
  // search could replace the best move that was actually reported.
  if (!state.engine.enabled) { state.engine.evaluating = false; return; }

  if (line.startsWith('info') && line.includes('score')) {
    const parts = line.split(' ');
    let multipv = 1;
    let depth = 0;
    let cp = 0;
    let mate = null;
    let pvStart = false;
    let pvMoves = [];

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'multipv') multipv = parseInt(parts[i+1]);
      if (parts[i] === 'depth') depth = parseInt(parts[i+1]);
      if (parts[i] === 'score') {
        if (parts[i+1] === 'cp') cp = parseInt(parts[i+2]);
        if (parts[i+1] === 'mate') mate = parseInt(parts[i+2]);
      }
      if (parts[i] === 'pv') {
        pvStart = true;
        continue;
      }
      if (pvStart) pvMoves.push(parts[i]);
    }

    const evalCp = mate !== null ? (mate > 0 ? 9999 : -9999) : cp;
    const evalDisplay = mate !== null
      ? `#${mate > 0 ? '+' : ''}${mate}`
      : (cp / 100).toFixed(1);

    if (multipv === 1) {
      state.engine.eval = evalCp;
      state.engine.bestMove = pvMoves[0] || '';
      state.engine.pv = pvMoves.join(' ');
      // The engine reports the depth it has REACHED so far. That must never
      // replace the depth the teacher configured: requestEngineEval() sends
      // state.engine.depth, so overwriting it made every later analysis use
      // whatever half-finished number arrived last (and the session saved it).
      state.engine.searchDepth = depth;

      $('evalValue').textContent = (evalCp > 0 ? '+' : '') + evalDisplay;
      $('bestMove').textContent = pvMoves[0] ? formatMove(pvMoves[0]) : '—';
      $('depth').textContent = depth;
      $('pvMoves').textContent = pvMoves.map(formatMove).join(' ') || '—';

      const whitePercent = Math.max(0, Math.min(100, 50 + (evalCp / 400) * 50));
      $('barWhite').style.width = whitePercent + '%';
      $('barBlack').style.width = (100 - whitePercent) + '%';

      $('engineStatus').textContent = `Analyzing d${depth}`;
    }
  }

  if (line.startsWith('bestmove')) {
    const parts = line.split(' ');
    if (parts[1] && parts[1] !== '(none)') state.engine.bestMove = parts[1];
    $('engineStatus').textContent = 'Done';
    state.engine.evaluating = false;
  }
}

function formatMove(uci) {
  if (!uci || uci.length < 4) return uci;
  return uci.substring(0, 2) + '-' + uci.substring(2, 4);
}

function requestEngineEval() {
  if (!state.engine.enabled || !state.engine.stockfish) return;
  state.engine.evaluating = true;
  state.engine.stockfish.stop();
  state.engine.stockfish.setPosition(state.game.fen());
  state.engine.stockfish.go(state.engine.depth);
  $('engineStatus').textContent = 'Analyzing...';
}

function toggleEngine() {
  state.engine.enabled = !state.engine.enabled;
  const btn = $('btnEngineToggle');
  if (state.engine.enabled) {
    btn.textContent = 'Stop Analysis';
    requestEngineEval();
  } else {
    btn.textContent = 'Start Analysis';
    if (state.engine.stockfish) state.engine.stockfish.stop();
    $('engineStatus').textContent = 'Idle';
  }
}

function hideEngine() {
  $('engineDisplay').style.display = 'none';
  state.engineHidden = true;
}

function setEngineDepth(d) {
  const n = parseInt(d, 10);
  if (!isNaN(n) && n > 0) {
    state.engine.depth = n;
    // keep the control showing the truth - it used to stay on the old number
    // while the engine searched at the new one
    const sel = (typeof $ === 'function') ? $('engineDepth') : null;
    if (sel && Array.prototype.some.call(sel.options, o => parseInt(o.value, 10) === n)) sel.value = String(n);
  }
  if (state.engine.enabled) requestEngineEval();
}

function setEngineMultiPV(n) {
  const m = parseInt(n, 10);
  state.engine.multipv = (!isNaN(m) && m > 0) ? m : 1;
  const mpSel = (typeof $ === 'function') ? $('engineMultiPV') : null;
  if (mpSel && mpSel.value !== String(state.engine.multipv)) mpSel.value = String(state.engine.multipv);
  if (state.engine.stockfish) {
    state.engine.stockfish.setMultiPV(n);
    if (state.engine.enabled) requestEngineEval();
  }
}

// ============================================
// PLAY AGAINST BOT
// ============================================
// The board perspective is the player's side: white is at the bottom normally,
// black is at the bottom after Flip. The bot always takes the opposite colour.
const BOT_ELO_LEVELS = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];

function botHumanColor() {
  return state.flipped ? 'b' : 'w';
}

function botColorForBoard() {
  return botHumanColor() === 'w' ? 'b' : 'w';
}

function botDepthForElo(elo) {
  const value = parseInt(elo, 10) || 1000;
  if (value <= 400) return 4;
  if (value <= 600) return 5;
  if (value <= 800) return 6;
  if (value <= 1000) return 7;
  if (value <= 1200) return 8;
  if (value <= 1400) return 10;
  if (value <= 1600) return 11;
  if (value <= 1800) return 12;
  if (value <= 2000) return 14;
  if (value <= 2200) return 16;
  return 18;
}

function botIsEditing() {
  return state.setupMode === true || state.authoringMode === true ||
    document.body.dataset.setupEditing === 'true' ||
    document.body.dataset.authoring === 'true';
}

function isBotTurn() {
  return !!(state.bot && state.bot.active && state.bot.color &&
    !botIsEditing() && typeof currentMode === 'string' && currentMode !== 'front' &&
    state.game && typeof state.game.turn === 'function' &&
    state.game.turn() === state.bot.color);
}

function initBotEngine() {
  if (state.bot.stockfish) {
    if (!state.bot.stockfish.failed) return true;
    try { state.bot.stockfish.terminate(); } catch (e) {}
    state.bot.stockfish = null;
  }
  if (typeof StockfishEngine === 'undefined') return false;
  try {
    state.bot.stockfish = new StockfishEngine();
    state.bot.stockfish.onMessage(handleBotEngineMessage);
    state.bot.stockfish.init();
    if (state.bot.stockfish.failed) {
      state.bot.stockfish.terminate();
      state.bot.stockfish = null;
      return false;
    }
    return true;
  } catch (e) {
    try { if (state.bot.stockfish) state.bot.stockfish.terminate(); } catch (ignored) {}
    state.bot.stockfish = null;
    return false;
  }
}

function configureBotEngine() {
  if (!state.bot.stockfish) return;
  const elo = parseInt(state.bot.elo, 10) || 1000;
  const skill = Math.max(0, Math.min(20, Math.round((elo - 400) / 100)));
  // Skill Level works across Stockfish builds. UCI_LimitStrength/UCI_Elo are
  // also sent for builds that support calibrated Elo; low displayed Elo still
  // remains constrained by the depth cap above.
  state.bot.stockfish.setOption('Skill Level', skill);
  if (elo >= 1320) {
    state.bot.stockfish.setOption('UCI_LimitStrength', 'true');
    state.bot.stockfish.setOption('UCI_Elo', elo);
  } else {
    // Stockfish's calibrated UCI_Elo range starts above the beginner values;
    // use the skill/depth cap for those selections instead of silently making
    // a 400-Elo choice play at the engine's minimum calibrated rating.
    state.bot.stockfish.setOption('UCI_LimitStrength', 'false');
  }
}

function botSideText() {
  const human = botHumanColor();
  const bot = human === 'w' ? 'b' : 'w';
  return `You: ${turnName(human)} · Bot: ${turnName(bot)}`;
}

function updateBotPanel() {
  const panel = $('botPanel');
  if (!panel) return;
  const hidden = typeof currentMode !== 'string' || currentMode === 'front' || botIsEditing();
  panel.hidden = hidden;
  const side = $('botSideInfo');
  if (side) side.textContent = botSideText();
  const elo = $('botElo');
  if (elo && String(elo.value) !== String(state.bot.elo)) elo.value = String(state.bot.elo);
  const button = $('btnBotToggle');
  if (button) {
    button.textContent = state.bot.active ? 'Stop Playing Bot' : 'Play Against Bot';
    button.classList.toggle('is-active', state.bot.active);
    button.setAttribute('aria-pressed', state.bot.active ? 'true' : 'false');
  }
  const status = $('botStatus');
  if (status) {
    status.classList.toggle('is-thinking', !!state.bot.thinking);
    if (state.bot.thinking) {
      status.textContent = `Bot (${turnName(state.bot.color)}) is thinking…`;
    } else if (state.bot.active) {
      status.textContent = isBotTurn()
        ? `Bot (${turnName(state.bot.color)}) will move shortly.`
        : `Your turn — you are ${turnName(botHumanColor())}.`;
    } else {
      status.textContent = 'Ready — flip the board to choose your side.';
    }
  }
}

function cancelBotSearch() {
  if (state.bot.timer) {
    clearTimeout(state.bot.timer);
    state.bot.timer = null;
  }
  state.bot.searchId++;
  state.bot.thinking = false;
  if (state.bot.stockfish) {
    try { state.bot.stockfish.stop(); } catch (e) {}
    // A stopped Stockfish worker may still emit its old bestmove. Terminating
    // it prevents a stale answer from being applied after a mid-game flip.
    try { state.bot.stockfish.terminate(); } catch (e) {}
    state.bot.stockfish = null;
  }
}

function stopBotGame(notify = true) {
  const wasActive = !!state.bot.active;
  state.bot.active = false;
  state.bot.color = null;
  cancelBotSearch();
  try { renderBoard(); } catch (e) {}
  updateBotPanel();
  if (notify && wasActive) toast('Play against bot stopped — the position was kept', 'info');
}

function startBotGame() {
  if (botIsEditing() || typeof currentMode !== 'string' || currentMode === 'front') {
    toast('Finish position editing before starting a bot game', 'info');
    updateBotPanel();
    return;
  }
  if (state.bot.active) {
    stopBotGame();
    return;
  }
  // Puzzle student mode owns move grading. Keep the current board and history,
  // but leave that overlay before handing the position to the bot game.
  if (document.body.dataset.testing === 'true' && typeof endPuzzleTest === 'function') {
    endPuzzleTest(false);
  }
  if (typeof setTool === 'function') setTool('select');
  const selected = parseInt(($('botElo') && $('botElo').value) || state.bot.elo, 10);
  state.bot.elo = BOT_ELO_LEVELS.includes(selected) ? selected : 1000;
  state.bot.active = true;
  state.bot.color = botColorForBoard();
  state.bot.searchId++;
  if (!initBotEngine()) {
    state.bot.active = false;
    state.bot.color = null;
    updateBotPanel();
    toast('Bot unavailable — Stockfish could not start', 'error');
    return;
  }
  configureBotEngine();
  try { renderBoard(); } catch (e) {}
  updateBotPanel();
  toast(`Bot game started — ${botSideText()}; current position kept`, 'success');
  scheduleBotMove();
}

function setBotElo(value) {
  const selected = parseInt(value, 10);
  if (!BOT_ELO_LEVELS.includes(selected)) return;
  state.bot.elo = selected;
  if (state.bot.active) {
    cancelBotSearch();
    if (initBotEngine()) {
      configureBotEngine();
      scheduleBotMove(100);
    }
  }
  updateBotPanel();
}

function scheduleBotMove(delay = 250) {
  if (state.bot.timer) {
    clearTimeout(state.bot.timer);
    state.bot.timer = null;
  }
  if (!state.bot.active || state.bot.thinking || !isBotTurn()) {
    updateBotPanel();
    return;
  }
  if (typeof isFinishedPosition === 'function' && isFinishedPosition()) {
    updateBotPanel();
    return;
  }
  const searchId = state.bot.searchId;
  state.bot.timer = setTimeout(() => {
    state.bot.timer = null;
    if (!state.bot.active || state.bot.searchId !== searchId || !isBotTurn()) return;
    requestBotMove();
  }, Math.max(0, delay));
  updateBotPanel();
}

function requestBotMove() {
  if (!state.bot.active || state.bot.thinking || !isBotTurn()) return;
  if (!initBotEngine()) {
    stopBotGame(false);
    toast('Bot unavailable — Stockfish could not start', 'error');
    return;
  }
  configureBotEngine();
  if (!state.bot.stockfish || state.bot.stockfish.failed) {
    stopBotGame(false);
    toast('Bot unavailable — Stockfish stopped unexpectedly', 'error');
    return;
  }
  const searchId = ++state.bot.searchId;
  state.bot.thinking = true;
  updateBotPanel();
  try {
    state.bot.stockfish.stop();
    state.bot.stockfish.setPosition(state.game.fen());
    state.bot.stockfish.go(botDepthForElo(state.bot.elo));
  } catch (e) {
    state.bot.thinking = false;
    stopBotGame(false);
    toast('Bot could not analyse this position', 'error');
    return;
  }
  // The id is deliberately kept on state: cancellation terminates the worker,
  // and any callback from an older worker cannot pass the active-turn checks.
  state.bot.activeSearchId = searchId;
}

function handleBotEngineMessage(line) {
  if (!state.bot.active || !state.bot.thinking || typeof line !== 'string') return;
  if (!line.startsWith('bestmove')) return;
  const uci = line.split(/\s+/)[1] || '';
  state.bot.thinking = false;
  if (!uci || uci === '(none)') {
    updateBotPanel();
    renderAll();
    return;
  }
  applyBotMove(uci);
}

function applyBotMove(uci) {
  if (!state.bot.active || !isBotTurn()) return false;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4].toLowerCase() : undefined;
  let result = null;
  try {
    result = state.game.move({ from, to, ...(promotion ? { promotion } : {}) });
  } catch (e) {}
  if (!result) {
    stopBotGame(false);
    toast('Bot returned an illegal move and was stopped', 'error');
    return false;
  }

  state.selectedSquare = null;
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(result.san);
  state.historyIndex = state.history.length - 1;
  playPieceMoveSound(result);
  try {
    if (state.clock && state.clock.running) {
      const ended = typeof stopClockIfGameIsOver === 'function' && stopClockIfGameIsOver();
      if (!ended && typeof switchClockSide === 'function') switchClockSide();
    }
  } catch (e) {}
  renderAll();
  toast(`Bot played ${result.san}`, 'info');
  try { requestEngineEval(); } catch (e) {}
  scheduleBotMove();
  return true;
}

function syncBotAfterBoardChange() {
  if (!state.bot.active) {
    updateBotPanel();
    return;
  }
  const nextColor = botColorForBoard();
  const sideChanged = state.bot.color !== nextColor;
  if (sideChanged) {
    state.bot.color = nextColor;
    cancelBotSearch();
    try { renderBoard(); } catch (e) {}
  }
  if (botIsEditing() || currentMode === 'front') {
    stopBotGame(false);
    return;
  }
  updateBotPanel();
  scheduleBotMove();
}

function restartBotAfterPositionChange() {
  if (!state.bot.active) {
    updateBotPanel();
    return;
  }
  cancelBotSearch();
  syncBotAfterBoardChange();
}

