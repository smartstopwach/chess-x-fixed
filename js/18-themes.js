// ============================================
// THEMES
// ============================================
function setTheme(theme) {
  state.boardTheme = theme;
  document.body.dataset.theme = theme;
  $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  renderBoard();
  renderAnnotations();
}

