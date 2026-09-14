// ============================================
// LIBRARY / CHAPTERS / PUZZLE AUTHORING
// ============================================
const LIBRARY_KEY = 'chessx-library-v1';

function getLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Default: one welcome chapter with one example puzzle
  return {
    chapters: [
      {
        id: uniqueId('chapter'),
        name: 'My First Chapter',
        expanded: true,
        puzzles: [
          {
            id: uniqueId('puzzle'),
            title: 'Mate in 2 (Example)',
            description: 'White to move. Find the forcing sequence.',
            solution: 'Qh5+, g6, Qxg6#',
            difficulty: 2,
            tags: 'mate, opening',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2',
            chapterId: null,
            createdAt: Date.now(),
          }
        ]
      }
    ],
    activeChapterId: null,
    activePuzzleId: null,
  };
}

function saveLibrary(lib) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  } catch (e) {
    toast('Could not save library (storage full?)', 'error');
  }
}

function getActiveChapter() {
  const lib = getLibrary();
  return lib.chapters.find(c => c.id === lib.activeChapterId);
}
function getActivePuzzle() {
  const lib = getLibrary();
  const chap = getActiveChapter();
  if (!chap) return null;
  return chap.puzzles.find(p => p.id === lib.activePuzzleId);
}

