// ============================================
// LIBRARY / CHAPTERS / PUZZLE AUTHORING
// ============================================
const LIBRARY_KEY = 'chessx-library-v1';
const PUZZLE_LIBRARY_FORMAT = 'chessx-puzzle-library';
const PUZZLE_LIBRARY_VERSION = 1;
const MAX_IMPORT_CHAPTERS = 200;
const MAX_IMPORT_PUZZLES = 5000;
const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_ERRORS = 60;

function getLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Corrupted or half-written storage ("null", "{}", a truncated blob)
      // must never reach the callers as null/undefined - entering puzzle mode
      // with such a value threw inside enterAuthoringForNewPuzzle().
      if (parsed && Array.isArray(parsed.chapters)) return parsed;
    }
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
  if (!lib.chapters || !lib.chapters.length) return null;
  return lib.chapters.find(c => c.id === lib.activeChapterId) || lib.chapters[0];
}

function getActivePuzzle() {
  const lib = getLibrary();
  if (!lib.activePuzzleId) return null;
  for (const chap of (lib.chapters || [])) {
    const p = (chap.puzzles || []).find(x => x && x.id === lib.activePuzzleId);
    if (p) return p;
  }
  return null;
}

// ---- imported-library validation -------------------------------------------
// Imports are an input boundary, not just another localStorage write. A JSON
// file can be syntactically valid while still containing duplicate IDs, broken
// references, impossible chess positions, or a solution that cannot be played.
// Validate and clone it before it can replace the teacher's existing library.
function isLibraryRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function importIssue(list, message) {
  if (list.length < MAX_IMPORT_ERRORS) list.push(message);
}

function importText(value, path, errors, required, maxLength) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') {
    importIssue(errors, `${path} must be text`);
    return '';
  }
  const text = value.trim();
  if (required && !text) importIssue(errors, `${path} cannot be empty`);
  if (text.length > maxLength) importIssue(errors, `${path} is too long (maximum ${maxLength} characters)`);
  return text;
}

function canonicalImportFen(value, path, errors, warnings) {
  const raw = importText(value, path, errors, true, 200);
  if (!raw) return '';
  const parts = raw.split(/\s+/);
  if (parts.length < 4 || parts.length > 6) {
    importIssue(errors, `${path} must have 4 to 6 FEN fields`);
    return raw;
  }
  while (parts.length < 6) parts.push(parts.length === 4 ? '0' : '1');
  const fen = parts.join(' ');
  if (parts.length !== raw.split(/\s+/).length) {
    warnings.push(`${path} was missing move counters; defaults were added`);
  }

  if (typeof validatePosition === 'function') {
    const result = validatePosition(fen);
    if (!result.ok) importIssue(errors, `${path} is not a valid position: ${result.reason}`);
  }
  try {
    if (typeof Chess === 'function') {
      const game = new Chess();
      const loaded = game.load(fen);
      if (loaded === false) importIssue(errors, `${path} could not be loaded by the chess engine`);
    }
  } catch (e) {
    importIssue(errors, `${path} could not be loaded by the chess engine`);
  }
  return fen;
}

function importSolutionTokens(text) {
  return String(text || '')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b([1-9]\d*)\.{1,3}/g, ' ')
    .split(/[\s,;]+/)
    .map(t => t.replace(/^[.]+|[.]+$/g, '').trim())
    .filter(t => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}

function validateImportedSolution(fen, solution, path, errors) {
  if (!solution) return;
  const tokens = importSolutionTokens(solution);
  if (!tokens.length) {
    importIssue(errors, `${path} has no playable move tokens`);
    return;
  }
  // The puzzle player intentionally supports a maximum of twelve plies.
  if (tokens.length > 12) {
    importIssue(errors, `${path} has ${tokens.length} moves; the maximum supported is 12`);
    return;
  }
  if (typeof Chess !== 'function') return;

  let game;
  try {
    game = new Chess();
    game.load(fen);
  } catch (e) {
    return; // The FEN validator already reported the useful error.
  }

  for (let i = 0; i < tokens.length; i++) {
    const original = tokens[i];
    const candidates = [original];
    const withoutNags = original.replace(/[+#?!]+$/g, '');
    if (withoutNags !== original) candidates.push(withoutNags);
    const zerosAsLetterO = original.replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
    if (!candidates.includes(zerosAsLetterO)) candidates.push(zerosAsLetterO);

    let played = null;
    for (const candidate of candidates) {
      try {
        played = game.move(candidate);
      } catch (e) {
        played = null;
      }
      if (played) break;
    }
    if (!played) {
      importIssue(errors, `${path} move ${i + 1} ("${original}") is illegal from the previous position`);
      break;
    }
  }
}

function validatePuzzleLibrary(input) {
  const errors = [];
  const warnings = [];
  if (!isLibraryRecord(input)) {
    return { ok: false, errors: ['the root must be a JSON object'], warnings, library: null };
  }

  if (input.format !== undefined && input.format !== PUZZLE_LIBRARY_FORMAT) {
    importIssue(errors, `format must be "${PUZZLE_LIBRARY_FORMAT}"`);
  }
  if (input.version !== undefined && input.version !== PUZZLE_LIBRARY_VERSION) {
    importIssue(errors, `version must be ${PUZZLE_LIBRARY_VERSION}`);
  }
  if (!Array.isArray(input.chapters)) {
    importIssue(errors, 'chapters must be an array');
    return { ok: false, errors, warnings, library: null };
  }
  if (input.chapters.length > MAX_IMPORT_CHAPTERS) {
    importIssue(errors, `the file has too many chapters (maximum ${MAX_IMPORT_CHAPTERS})`);
  }

  const chapterIds = new Set();
  const puzzleIds = new Set();
  const puzzleChapter = new Map();
  const cleanChapters = [];
  let totalPuzzles = 0;

  input.chapters.slice(0, MAX_IMPORT_CHAPTERS).forEach((chapter, ci) => {
    const cp = `chapters[${ci}]`;
    if (!isLibraryRecord(chapter)) {
      importIssue(errors, `${cp} must be an object`);
      return;
    }
    const id = importText(chapter.id, `${cp}.id`, errors, true, 160);
    if (id && chapterIds.has(id)) importIssue(errors, `${cp}.id duplicates another chapter ID`);
    if (id) chapterIds.add(id);
    const name = importText(chapter.name, `${cp}.name`, errors, true, 160);
    if (!Array.isArray(chapter.puzzles)) {
      importIssue(errors, `${cp}.puzzles must be an array`);
    }
    if (chapter.expanded !== undefined && typeof chapter.expanded !== 'boolean') {
      importIssue(errors, `${cp}.expanded must be true or false`);
    }

    const cleanChapter = {
      id,
      name,
      expanded: chapter.expanded !== false,
      puzzles: []
    };
    const puzzles = Array.isArray(chapter.puzzles) ? chapter.puzzles : [];
    if (puzzles.length > MAX_IMPORT_PUZZLES) {
      importIssue(errors, `${cp}.puzzles has too many entries (maximum ${MAX_IMPORT_PUZZLES})`);
    }

    puzzles.slice(0, MAX_IMPORT_PUZZLES).forEach((puzzle, pi) => {
      totalPuzzles++;
      const pp = `${cp}.puzzles[${pi}]`;
      if (!isLibraryRecord(puzzle)) {
        importIssue(errors, `${pp} must be an object`);
        return;
      }
      const puzzleId = importText(puzzle.id, `${pp}.id`, errors, true, 160);
      if (puzzleId && puzzleIds.has(puzzleId)) importIssue(errors, `${pp}.id duplicates another puzzle ID`);
      if (puzzleId) {
        puzzleIds.add(puzzleId);
        puzzleChapter.set(puzzleId, id);
      }

      const title = importText(puzzle.title, `${pp}.title`, errors, true, 240);
      const description = importText(puzzle.description, `${pp}.description`, errors, false, 10000);
      const solution = importText(puzzle.solution, `${pp}.solution`, errors, false, 2000);
      const tags = importText(puzzle.tags, `${pp}.tags`, errors, false, 500);
      const fen = canonicalImportFen(puzzle.fen, `${pp}.fen`, errors, warnings);

      let difficulty = puzzle.difficulty;
      if (difficulty === undefined) {
        difficulty = 3;
      } else if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
        importIssue(errors, `${pp}.difficulty must be an integer from 1 to 5`);
        difficulty = 3;
      }

      let createdAt = puzzle.createdAt;
      if (createdAt === undefined) {
        createdAt = Date.now();
      } else if (!Number.isFinite(createdAt) || createdAt < 0) {
        importIssue(errors, `${pp}.createdAt must be a positive timestamp`);
        createdAt = Date.now();
      }

      if (puzzle.chapterId !== undefined && puzzle.chapterId !== id) {
        importIssue(errors, `${pp}.chapterId must point to its containing chapter`);
      }
      validateImportedSolution(fen, solution, `${pp}.solution`, errors);

      cleanChapter.puzzles.push({
        id: puzzleId,
        title,
        description,
        solution,
        difficulty,
        tags,
        fen,
        chapterId: id || null,
        createdAt
      });
    });
    cleanChapters.push(cleanChapter);
  });

  if (totalPuzzles > MAX_IMPORT_PUZZLES) {
    importIssue(errors, `the file has too many puzzles (maximum ${MAX_IMPORT_PUZZLES} total)`);
  }

  const activeChapterId = input.activeChapterId == null ? null : input.activeChapterId;
  const activePuzzleId = input.activePuzzleId == null ? null : input.activePuzzleId;
  if (activeChapterId !== null && typeof activeChapterId !== 'string') {
    importIssue(errors, 'activeChapterId must be a chapter ID or null');
  } else if (activeChapterId && !chapterIds.has(activeChapterId)) {
    importIssue(errors, 'activeChapterId does not refer to an imported chapter');
  }
  if (activePuzzleId !== null && typeof activePuzzleId !== 'string') {
    importIssue(errors, 'activePuzzleId must be a puzzle ID or null');
  } else if (activePuzzleId && !puzzleIds.has(activePuzzleId)) {
    importIssue(errors, 'activePuzzleId does not refer to an imported puzzle');
  }
  if (activePuzzleId && activeChapterId && puzzleChapter.get(activePuzzleId) !== activeChapterId) {
    importIssue(errors, 'activePuzzleId must belong to activeChapterId');
  }

  const library = {
    chapters: cleanChapters,
    activeChapterId: activeChapterId || null,
    activePuzzleId: activePuzzleId || null
  };
  return { ok: errors.length === 0, errors, warnings, library: errors.length ? null : library };
}

function libraryExportPayload(lib) {
  return Object.assign({}, lib, {
    format: PUZZLE_LIBRARY_FORMAT,
    version: PUZZLE_LIBRARY_VERSION,
    exportedAt: new Date().toISOString()
  });
}
