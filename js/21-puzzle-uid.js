// ============================================
// UNIQUE ID GENERATOR (fixes Date.now() collision)
// ============================================
let __uidCounter = 0;
function uniqueId(prefix = 'id') {
  __uidCounter++;
  return prefix + '-' + Date.now().toString(36) + '-' + __uidCounter.toString(36) + '-' + Math.random().toString(36).substring(2, 7);
}

function autoName(prefix, lib) {
  // Auto-generate a name like "Puzzle 1", "Puzzle 2", "Chapter 1", etc.
  let n = 1;
  const existing = lib.chapters.flatMap(c => c.puzzles).map(p => p.title).filter(t => t && t.startsWith(prefix));
  while (existing.includes(prefix + ' ' + n)) n++;
  return prefix + ' ' + n;
}

