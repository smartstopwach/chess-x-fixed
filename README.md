# ♟️ ChessX — Professional Chess Teaching Studio

A complete, professional chess teaching and screen-recording web app built for chess teachers and content creators who want to make high-quality educational chess videos.

## 🎯 What is ChessX?

ChessX is a **single-page, browser-based chess studio** designed for recording chess teaching videos. Unlike traditional chess platforms focused on playing or studying, ChessX combines a professional analysis board, drawing tools, Stockfish integration, position editor, lesson management, and built-in screen recording — all optimized for clean screen capture.

## ✨ Key Features

### 🎓 Professional Chessboard
- Drag & drop and click-to-move
- Legal move highlighting, last-move highlighting, check indication
- Board coordinates, flip, reset, undo
- Fullscreen and zoom controls
- A short, subtle move cue after successful moves and piece placements in every mode
- A distinct two-note check/checkmate alert, cached locally for offline play
- 6 board themes (Classic, Tournament, Wooden, Dark, Minimal, Green)
- 3 piece styles (Alpha, Merida, Classic)

### ✏️ Teaching Drawing Tools
- **Select, Arrow, Circle, Highlight, Rectangle, Triangle, Hexagon, Eraser** —
  the palette in the left sidebar; Circle, Rectangle, Triangle and Hexagon are
  fitted inside one square and centred on that square's piece/centre
- **Left click does whatever the selected tool says** (select = chess move /
  piece pick-up, every drawing tool = its own marking), and **a double left
  click on a square reverses what the left click put there** — every tool
  except select. Placing never toggles: one click puts the shape down, the
  double click takes it away (`scheduleLeftAction()` / `placeWithTool()` in
  `js/12-board-interactions.js`, ~260ms double-click window)
- **A double click can only take back what that click itself placed** — same
  square, same tool, same colour, within ~0.9s (`takeBackMatches()`). Drawings
  that were already on the board, including arrows made with the right button,
  are never destroyed by a double click; use the eraser or Undo for those
- Switching tools **finishes** a click that is still inside its double-click
  window, so a marking is never silently swallowed, and Undo/Redo drop a
  half-finished click-click origin mark (left or right) along with its
  highlight. Identical rectangles are not stacked on top of each other
- **The right button is ALWAYS the arrow** in Normal mode, no matter which
  tool is selected: right-drag draws it in one gesture, and two single right
  clicks work too (first = origin square, second = target, same square twice
  = cancel). `handleRightClickOrDrag()` owns this and nothing else
- Left-drag draws an arrow (except that Rectangle and Eraser are click-only):
  Rectangle places one fitted box in the clicked square; Eraser removes marks
  only from the square clicked after selecting it, never from a held drag
- The right-button arrow works in **every mode while teaching**, and never
  while **editing a position** (`isEditingPosition()` /
  `rightButtonIsArrow()` in `js/12-board-interactions.js`):

  | state | right drag / right click |
  |---|---|
  | Normal — playing / explaining | arrow |
  | Custom Setup — editing the position | erase piece (no drawing) |
  | Custom Setup — after START FROM POSITION | arrow |
  | Puzzle — authoring (new puzzle / ✎ Edit position) | erase piece (no drawing) |
  | Puzzle — saved or selected puzzle, explaining | arrow |
  | Puzzle — ▶ Test (student solving) | arrow |
- 12 colors, default amber `#ffaa00` (the one from the reference shots)
- "Clear all annotations" button, plus 1-by-1 undo/redo for every marking —
  all six kinds count for history (`annoTotal()`), so erasing or clearing a
  lone triangle/hexagon is undoable too

### 🏹 Arrows that read on a recording (`js/11-annotations-render.js`)
Arrows are drawn as one SVG group per arrow — a round-capped band plus a filled
triangular head — with every dimension expressed as a fraction of a square, so
they look the same at 200px and at 1300px:

| part | value | how it was chosen |
|---|---|---|
| band width | `0.22 × square` | a 16px band on the 73px squares of the reference shot |
| head | `0.31 × square` long, `0.47 × square` wide, tip exactly on the target square centre | measured the same way |
| colour | `#ffaa00` at `opacity .8` | the reference reads `rgb(251,183,42)` over a light square and `rgb(227,166,16)` over a dark one; solving the two equations gives `255,170,0` at alpha `0.8` |
| layering | `z-index 2`, pieces are `4` | the band slides *under* the piece standing on its origin square |
| joins | `stroke-linejoin: round` | a soft elbow instead of a spike |

**Knight moves get their own shape.** A move whose displacement is (1, 2) or
(2, 1) and whose origin square holds (or just lost) a knight is drawn as the
letter L it actually travels — long leg first, so `Nb1-c3` goes up the b-file to
b3 and only then turns into c3. A bishop/rook drag that happens to land a knight
jump away stays a straight line, and if the origin square is already empty (the
move was played) the L is kept, because the shape is what the class is reading.

Flip needs no special case: the geometry is in board coordinates and the whole
`<svg>` is rotated 180°, so arrows, circles and the highlight layer flip together.
`python3 tools/arrow_style_test.py` re-measures all of this on a real Chromium
render (it pixel-scans our own screenshot, and the flip, the under-piece layering
and the knight L are all asserted, not eyeballed).

### 📐 The board always fills the room (`js/27-autofit.js`)
`autoFitBoard()` measures `#boardWrapper`'s free box, subtracts only the rows
that really sit above and below it, and gives the board that whole square — no
design-size ceiling any more (the old 1100px cap meant a 1440px-tall screen got
a 1100px board). The same value is published as `--board-size` on `:root` so the
player-name rows track the board width. A fit that lands in the middle of a mode
transition measures a box that is about to change, so the result is re-checked on
the next frame and a `ResizeObserver` on the wrapper keeps it honest.

Measured board size (before → after), no clipped rank in any mode:

| window | Normal | Puzzle | Custom Setup |
|---|---|---|---|
| 2560×1440 | 1100 → **1309** | 1100 → **1259** | 1100 → **1309** |
| 1920×1080 | 893 → **949** | 843 → **899** | 843 → **949** |
| 1440×900 | 713 → **769** | 663 → **719** | 663 → **769** |
| 1366×768 | 581 → **637** | 531 → **587** | 531 → **637** |
| 390×844 (phone) | clipped → **370** | | |

**The board touches the topbar in every mode.** Nothing sits above the board
any more: `.layout` carries no vertical padding, `.board-area` /
`.board-wrapper` start at the column's top edge (`justify-content:
flex-start`), and the two player rows (name + captured pieces) share a single
16px strip *under* the board (`.board-meta-strip` in `index.html`, styled in
`css/18-board.css`). `autoFitBoard()` then hands the whole freed column to the
squares, so the board's top edge lands exactly on the topbar's bottom edge —
identically in Normal, Puzzle and Custom Setup, because the change is on the
mode-agnostic board column:

| window | gap above board | board before → after |
|---|---|---|
| 1366×800 | 28px → **0** | 689 → **729** |
| 1920×1080 | 28px → **0** | 969 → **1009** |
| 390×844 (phone) | – → 10px | 370 → **370** (width-limited) |
| 844×390 (phone landscape) | – → **0** | → **200** (player strip hidden) |

No rank is clipped at any of those sizes: at 1366×800 the board's bottom edge
lands on 784 and the 16px strip finishes exactly at the window edge.
Before/after comparison images accompany this change.

**Full (the `Full` button) is the recording path**, and it now really means
bigger: `css/47-fullscreen.css` compacts the topbar (54px → 40px) and the layout
gaps while fullscreen is on, and `autoFitBoard()` re-runs on `fullscreenchange`,
so the board takes the freed rows — 949 → **975** at 1920×1080, 637 → **663** at
1366×768. Nothing is hidden (every button stays reachable mid-recording) and
leaving fullscreen restores the normal sizing exactly.

Supporting trims: `.layout` padding 12→8 and gap 12→8 (now `0 8px`, the
vertical padding is gone entirely), `.board-area` padding 8→4→0, the two
player-info rows 28px→16px each and now sharing one 16px strip below the
board, board frame 3px→2px. Below 900px
every layout collapses to one column — the desktop rules used to pin the panels
to numbered grid columns, which left a phone with a 56px-wide board.

### 🧩 Position Setup
- Visual piece rack to add/remove pieces
- Castling rights toggles (kept in step with whatever FEN you load)
- Side-to-move selector, en-passant square, halfmove / fullmove counters
- FEN input + paste + copy
- "Start from position" button
- **Placing and moving pieces** (`js/12-board-interactions.js`): a rack piece
  stays in your hand so you can stamp out several of them. Click an empty
  square to place it. On a square that already holds a piece the gesture
  decides — **drag** moves that piece somewhere else, a plain **click** replaces
  it with the piece in hand. Right-click always erases while editing, and
  Undo/Redo step through every edit.
- **Impossible positions are refused** (`validatePosition()` in
  `js/15-position-setup.js`): START FROM POSITION and the FEN box both check the
  position before it becomes the lesson — exactly one king per side, no pawns on
  the first/last rank, at most 8 pawns and 16 pieces per side, extra
  queens/rooks/bishops/knights only up to the number of pawns you removed,
  castling letters only while the king and that rook are still on their home
  squares, an en-passant square that matches the side to move (rank 6 for White,
  rank 3 for Black, empty, with the pawn that just stepped past it present),
  numeric move counters, and the side that just moved may not be left in check.
  A refusal says **why** and leaves you in the editor with your work intact;
  saving a puzzle on such a position still saves, but the warning rides along in
  the same message so it cannot be missed.

### 📜 Move List
- Clean SAN notation
- Click any move to jump to it
- Previous/Next/Delete
- **Navigation follows the position on screen**: the recorded SAN moves are
  replayed on `state.baseFen` — the position the game actually started from —
  so Undo, ←/→, a move-list click and Delete after *Custom Setup → START FROM
  POSITION*, a FEN load or a puzzle all come back to **that** position instead
  of teleporting to the standard opening. Every fresh move list records its
  base (`resetMoveHistory()` in `js/16-move-list.js`) and the session snapshot
  carries it, so it survives F5 too
- **Variations you can actually use**: `+ Variation` snapshots the position you
  are looking at as a chip under the move list (`#variationList`), labelled with
  the move that led to it (`1.e4`, `1...e5`, or `start`). Click a chip to put
  that position back on the board — it becomes the base position, so the moves
  you play next are recorded from there — or ✕ to drop it. The last 20 are part
  of the session snapshot, so they survive F5.
- Compact panel that doesn't distract during recording

### 🤖 Stockfish Analysis
- Real evaluation, best move, PV
- Configurable depth (10/15/20/25). The depth you pick (`state.engine.depth`)
  and the depth the engine has actually reached (`state.engine.searchDepth`,
  shown in the panel) are two different numbers — the engine's progress reports
  no longer overwrite your setting, and switching analysis off ignores the
  messages from the search it was told to abandon, so the panel cannot come back
  to life on its own
- Multi-PV (1/2/3/4)
- Eval bar visualization
- **"Hide Engine"** button — critical for clean recording

### 🤖 Play Against Bot
- Available in all three playable modes: Normal, Puzzle after leaving position editing, and Custom Setup after **START FROM POSITION**.
- Hidden automatically while a position is being edited, so the bot cannot interfere with piece placement or puzzle authoring.
- Starts from the exact position currently on the board and keeps the existing move list; it never resets a half-played game.
- The side at the bottom of the board is always **You**. The bot plays the opposite side.
- Press **Flip** during a game to switch the human and bot sides. Any active search is cancelled safely and restarted for the new bot side without losing the position.
- Includes approximate bot-strength choices from **400 to 2400 Elo**. The UI value is translated to Stockfish skill/depth and calibrated Elo where the engine supports it.
- If the bot is to move when the game starts, it moves automatically; otherwise it waits for your move.

### 🎥 Recording Mode (one-click)
- Activated with the prominent red **RECORDING MODE** button
- Hides everything except the board, lesson title, and essential teaching controls
- Maximizes board size for video
- Toggle to fully hide UI for clean video capture

### 🖼️ Layout Presets (4)
- **Board Only** — huge board
- **Board + Moves** — board + move list
- **Board + Explanation** — board + notes
- **Presentation** — almost fullscreen

### 📝 Lesson Title & Subtitle
- Show above the board
- Toggle to hide before recording

### 📋 Teacher Notes Panel
- Markdown-friendly text area
- Hide/show toggle
- Auto-saved with lessons

### 🔖 Position Bookmarks
- Save, name, and navigate important positions
- Keyboard shortcuts: **N** (next), **P** (previous)

### ❓ Puzzle / Question Mode
- Display "YOUR MOVE?" with custom question
- **Clicking a puzzle in the library gives you a playable board** (it used to
  leave the piece editor armed, so every click edited instead of moved)
- Clicking a piece belonging to the side that is **not** to move is rejected
  with a short error sound; legal moves keep the wooden move tap
- **✎ Edit position** (in the Puzzle Editor panel) is the explicit way to place
  or remove pieces; `Esc` or ✕ Exit hands the board back to play with the
  position intact — exiting no longer resets to the starting position
- Pieces placed from **either** rack (drag or click) are what SAVE writes: the
  saved FEN is now read from the visible board and the editor copy is kept in
  step, so a dragged piece can no longer disappear after saving
- **▶ Test plays the puzzle for real**: authoring is switched off, so clicks are
  legal chess moves (piece selection, move list, `Ctrl+Z`, `←`/`→` all work), and
  the **Select tool is handed over** — the editor leaves Arrow selected, which
  would turn every student click into a drawing instead of a move. Selecting a
  puzzle from the library does the same, and Normal mode always comes back with
  Select. Explaining still needs no tool switch: the right button is the arrow
  in every teaching state
- The solution line is parsed from the free-text field and checked move by move:
  correct → the opponent's reply is played automatically and you continue;
  wrong → the move stays on the board and you get a ✗ so you can undo and retry
- "REVEAL ANSWER" shows the answer and replays the rest of the line
- The question card sits at the **top** of the board and is click-through
  (`pointer-events:none`), so it never covers a square mid-puzzle
- ✎ Edit (or `Esc`) returns to authoring with the same puzzle loaded; ✕ Done
  leaves the position on the board
- Perfect for YouTube "guess the move" segments

### 💾 Nothing is lost on reload (session + draft autosave)
`js/36-persist.js` keeps a snapshot of the working session in `localStorage`
(`chessx-session-v1`) and puts you back exactly where you were:

- the mode you were in (Normal / Puzzle / Custom Setup) — the app no longer
  drops you on the mode picker after a reload
- the position, the full move list and where in it you were standing
- every drawing: arrows, circles, highlights, rectangles, the active tool and colour
- board theme, piece style, flip, clock remaining (a running clock is **not**
  resumed — the timer never restarts mid-count)
- which puzzle was open, and it is re-selected in the library, so pressing SAVE
  after a reload still updates that puzzle instead of creating a duplicate
- the position-setup options (castling rights, halfmove / fullmove counters)
- the **unsaved** puzzle form: if you typed a title / solution and never hit
  SAVE, the fields and the editor position come back and the toast says
  `unsaved puzzle draft restored`

Writes happen on every repaint, every 1.5s while the tab is visible, and on
`pagehide` / `visibilitychange` (which is what a reload fires), and only when
the snapshot actually changed — so it is not a save loop. Every storage call is
wrapped, so `file://` and private-mode windows cannot break boot; on `file://`
it still works (Chromium keeps a per-origin store).

Deliberately unchanged: clicking a **mode card** still starts that mode clean
(`setMode()` resets the board and the drawings) — that is the app's existing
"fresh slate per mode" behaviour, and Home → pick a mode is also how you clear a
saved session. To wipe it by hand: `localStorage.removeItem('chessx-session-v1')`.

### 🏁 Checkmate, stalemate & draw animations (all three modes)
One trigger, `celebrateMate()`, is called from `renderAll()` in
`js/31-render-all.js`, and every path that can end a game repaints through
`renderAll()`: a click or drag move in Normal mode, a graded puzzle move, a
piece dropped from either rack in Custom Setup, a FEN/PGN load, SAVE / ▶ Test,
and stepping with `←` / `→`. That includes a position that is simply *dead*
(K vs K, K+bishop vs K), so a draw is announced as soon as it is true. All three
modes animate without any of them owning the logic.

Three results, three looks, so a draw never reads like a win:

| result | banner | motion |
|---|---|---|
| **checkmate** | gold `CHECKMATE` + `White wins` / `Black wins` | mated king **pulses red** and shakes in its square, board **shakes twice** |
| **stalemate** | grey `STALEMATE` + `Draw — no legal move` | one slow **ripple** ring over the board, colour drains out of the position, no king pulse |
| **draw** | steel-blue `DRAW` + the rule: `by the fifty-move rule`, `by threefold repetition`, `insufficient material` | **two light sweeps** cross the board in opposite directions and meet, colour drains out |

- all of it sits inside `#boardArea`, so it follows the board into every mode
  and survives the panels being hidden while recording
- the king marking is kept alive across repaints by `decorateMateKing()`, which
  is called from `highlightSquares()`
- the reason comes from the engine where it can (`in_draw()` in the bundled
  `chess.min.js` is `half_moves >= 100 || in_stalemate() ||
  insufficient_material() || in_threefold_repetition()`), with a FEN-level
  fallback for the halfmove clock and material, so the offline stub still labels
  the position correctly
- it is **never in the way**: `pointer-events:none`, and it auto-clears after 3s
  or the moment the position stops being finished (undo, `←`, reset, new FEN,
  another piece placed)
- **`M`** replays it for the position already on the board — any of the three
  kinds — re-cut the moment while recording without undo/redo juggling

Detection is defensive: `in_checkmate()` / `in_stalemate()` / `in_draw()` when
the bundled `chess.min.js` offers them, otherwise "no legal moves for the side to
move" plus `in_check()`, so it still works with the offline fallback engine.
`M` replays the current result. Reduced-motion users get the banner and the
labels without the shake, ripple or sweeps (`prefers-reduced-motion` guard in
`css/46-checkmate.css`).

### 🔒 Inspection deterrent (`js/04-protect.js`)
DevTools belong to the browser, so a page can never *truly* disable them — what
it can do is close every door a page is allowed to close, and that is what this
file does:

- **shortcuts swallowed** (capture phase, before the app's own handler): `F12`,
  `Ctrl/Cmd+Shift+I` / `+J` / `+K` / `+C`, and `Ctrl/Cmd+U` (view-source).
  App shortcuts such as `Ctrl+Z` are untouched.
- **no right-click "Inspect" menu** anywhere except text fields. The board's
  own `contextmenu` listener fires first, so right-click drawing and
  setup-mode erase keep working (verified: 32 → 31 pieces on a right-click).
- **a debugger trap notices DevTools anyway** (docked, undocked or remote):
  while they are open the whole app is locked behind a full-screen card
  (`#inspectGuard`, styled in `css/48-inspect-guard.css`) until they are
  closed again. A high-threshold window-size check catches the docked case
  without ever tripping on bookmarks bars.

Owner escape hatch for debugging your own site: open it with
`?allowinspect=1`, or set `localStorage.setItem('chessx-allow-inspect','1')`.

Honest caveat: this is a deterrent, not a lock. The sources still travel to the
browser, so a determined person can read them (JS disabled, `curl`, another
browser, or this repository). Nothing client-side changes that.
14 headless-Chromium checks cover the shortcuts, the menu, the board
right-click, the lock screen and the escape hatch — all passing.

### ⚖️ Material points (`js/00-constants.js` + `js/10-board-render.js`)
Standard counting, live on the board:

| Piece | Pawn | Knight | Bishop | Rook | Queen | King |
|---|---|---|---|---|---|---|
| Value | 1 | 3 | 3 | 5 | 9 | 0 (never counted) |

- Each player row shows their **total material** and the running **difference**
  (`+3`, `−5`), with the point value of every captured piece in the capture
  strip
- The numbers follow the position on screen: undo/redo, ←/→, a move-list click,
  a variation chip, flipping the board, loading a FEN or a puzzle all repaint
  them, and a promotion adds the new queen's 9 points for the right colour
- While you are **building** a position (Custom Setup editing or puzzle
  authoring) the score stays silent — an unfinished board has no meaningful
  material — and it comes back the moment you press START FROM POSITION or save
  and test the puzzle

### 💬 Messages without pop-ups
Toast pop-ups are switched off, but refusals and confirmations still have to be
seen: `toast()` writes to a slim pill over the bottom of the board
(`#boardMsg`, `js/03-utils.js`). It is absolutely positioned, so a message can
never change the size of the board, and it clears itself after six seconds.

## ⚠️ Known issues found while refactoring (not yet fixed)

1. **`test.html` DOM checks always fail** — that page loads the scripts but has
   no `#board` markup, so "board element exists / 64 squares / 32 pieces" can
   never pass (it fails identically before and after the split). The first four
   checks are meaningful.
2. **`css/23-modal-dead.css`** — in the original `styles.css`, line 1224 had a
   section banner where `.modal-overlay {` belonged, so that block plus
   `.modal-content/-header/-actions` is commented out and the file carries two
   unmatched `}`. No modal exists in `index.html`/`app.js`, so nothing is lost.
3. **"Recording Mode" and "Layout Presets" are documented above but not in this
   copy** — there is no `setLayout`, no red RECORDING button, `js/19-layouts.js`
   is an empty stub, and `state.uiHidden` is declared but never written. The
   `css/12-layout.css` `[data-layout="focus"]` rules are therefore dead too.
   For a clean capture, hide the panels yourself (devtools: `display:none` on
   `.sidebar-left, .sidebar-right, #topbar`); the checkmate animation lives
   inside `#boardArea`, so it stays with the board either way.

### ⏱️ Chess Clock
- Blitz / Rapid / Classical presets
- Custom time
- Hide/show toggle
- The side that is on move is highlighted **from the moment you press Start**,
  not only after the first move
- Only a **legal move** hands the clock over — drawing an arrow, marking a
  square or an illegal attempt leaves it where it was (in Puzzle mode the
  auto-reply switches it too)
- When a flag falls the clock stops itself, the button reads *Start Clock*
  again and the message strip says *Time expired!*

### ⌨️ Keyboard Shortcuts
(ignored while a text field has focus; `js/30-keyboard.js` is the source of truth)

| Key | Action |
|---|---|
| `1` / `2` / `3` | Normal / Puzzle / Custom Setup mode |
| `←` / `→` | Previous / Next move |
| `↑` / `↓` | Previous / Next puzzle in Puzzle mode (existing library order; counter follows the active chapter/collection, such as `2/30`) |
| `F` | Flip board |
| `R` | Reset board |
| `V` | Select tool (play chess) |
| `A` | Arrow tool |
| `O` | Circle tool |
| `E` | Eraser tool |
| `H` | Highlight tool |
| `C` | Cycle the drawing colour |
| `P` | Puzzle authoring on/off (during ▶ Test: back to the editor) |
| `M` | Replay the checkmate / stalemate / draw animation |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo — drawings when a drawing tool is active, otherwise moves |
| `Esc` | Cancel what is half-finished: a pending click, the selected piece, a click-click arrow origin; leaves ▶ Test or position editing first |

Triangle, Hexagon and Rectangle have no shortcut — pick them from the palette.

### 💾 Save / Load / Export
- **Save Lesson** — exports full lesson as JSON (position + moves + annotations + notes + bookmarks + theme)
- **Load Lesson** — restore from JSON
- **Export PGN** — download game as PGN
- **Import Puzzle Library** — choose a `.json` file from the Library / Chapters panel. The importer checks the root schema, chapter/puzzle IDs, references, FEN legality, difficulty, timestamps, and every saved SAN solution before merging the file into the current library; existing puzzles are preserved, exact duplicates are skipped, and conflicting IDs are remapped instead of overwriting data. A bad file is rejected without touching the existing library
- `puzzle-library-example.json` is a ready-to-import sample file
### 🧩 Full Puzzle Generation Prompt

The same prompt is also available as `puzzle-generation-prompt.txt`. It is designed for Arena.ai Agent Mode: its first response asks for total count, topic, chapter name, and starting/middlegame/endgame counts; it generates JSON only after the user answers and the counts are consistent. The complete copyable version is below.

```text
CHESSX PUZZLE LIBRARY GENERATION PROMPT — INTERACTIVE, STRICT, FAIL-CLOSED VERSION

PURPOSE
You are a careful chess-data generator working in Arena.ai Agent Mode. You are not writing a generic chess answer and you are not allowed to invent a plausible-looking JSON file. You must first collect the user's puzzle plan, then produce one importable ChessX puzzle-library JSON object that passes the current ChessX import validator. A legal-looking but unverified puzzle is a failure.

The most important rules are:
1. In a fresh request, ask the planning questions first. Do not generate JSON before the user answers them.
2. Never include a draw, a stalemate, dead/insufficient material, or a position whose result is uncertain.
3. Never put an endgame first when the requested order is starting/opening, middlegame, endgame.
4. Never change the requested count or phase counts.
5. Never output an illegal FEN, illegal SAN, duplicate ID, broken chapter reference, invalid difficulty, or wrong active ID.
6. Never output Markdown, comments, explanation, a partial file, or a second JSON object in the final generation response.
7. If any check cannot be completed, reject that candidate and regenerate it. Do not guess and do not explain the failure in the final JSON response.

INTERACTIVE ARENA AGENT MODE WORKFLOW
This prompt has two separate response phases. Keep them separate.

PHASE 0 — ASK THE USER FOR THE PLAN FIRST
On the first response after this prompt is given, ask the user the planning questions below and nothing else. Do not generate a puzzle, sample JSON, FEN, SAN, title, chapter, or explanation yet. Do not silently choose 30 puzzles or 10/10/10 unless the user explicitly gives those values. If Arena's question UI is available, use it; otherwise ask the questions clearly in one grouped text message.

Ask these questions:
1. How many puzzles do you want in total? Accept only a positive whole number.
2. What topic or puzzle category should all puzzles follow? Examples: checkmate, forks, pins, opening principles, tactics, rook endgames, king-and-pawn endgames, or another specific topic.
3. What should the chapter name be? If the user does not care, offer a clear default and ask them to accept it.
4. How many starting/opening-game puzzles should there be?
5. How many middlegame puzzles should there be?
6. How many endgame puzzles should there be?
7. Optional: which output language should the beginner descriptions use, and what starting estimated Elo should be used? If omitted, use simple English and approximately 100 Elo.

Use this compact question layout so the user can answer easily:
- Total puzzles:
- Topic/category:
- Chapter name:
- Starting/opening count:
- Middlegame count:
- Endgame count:
- Description language (optional):
- Starting estimated Elo (optional, default 100):

Do not accept an incomplete answer as approval. If the user answers only some questions, ask only for the missing values. If a count is not a whole number, ask for a corrected whole number. If the phase counts do not add up to the total, show the arithmetic plainly and ask the user to correct the counts. For example, if the user says 30 total but 8 + 10 + 10, respond that the phase total is 28 and ask how the remaining 2 should be assigned. Do not generate JSON while the plan is incomplete or inconsistent.

PHASE 1 — GENERATE ONLY AFTER VALID ANSWERS
After the user has supplied a complete, internally consistent plan, store the answers internally as CHAPTER_NAME, TOTAL_PUZZLES, REQUESTED_CATEGORY, STARTING_COUNT, MIDDLEGAME_COUNT, ENDGAME_COUNT, OUTPUT_LANGUAGE, FIRST_ESTIMATED_ELO, and ELO_STEP. Do not ask for a second confirmation when the answers are clear. If a value is ambiguous, ask a targeted follow-up before generating.

Before generation, restate the accepted plan in one short internal checklist:
- total = STARTING_COUNT + MIDDLEGAME_COUNT + ENDGAME_COUNT;
- topic/category = REQUESTED_CATEGORY;
- order = starting/opening, then middlegame, then endgame;
- first puzzle = starting/opening;
- first estimated Elo = FIRST_ESTIMATED_ELO, default 100;
- output = current ChessX import format.
Then generate and run every validation rule below. The first response is allowed to be questions; only the final response after valid answers is required to be raw JSON only.

ANSWER NORMALIZATION RULES
- Convert words such as "thirty" to 30 only when unambiguous.
- Treat "start game" as starting/opening, "mid game" as middlegame, and "end game" as endgame, but repeat the normalized meaning internally.
- Do not infer a missing count from a favorite split. Ask the user.
- Do not infer a topic from the chapter name. Ask the user for the topic.
- Do not infer that a request for 30 means 10/10/10 unless the user says so or accepts that split.
- Preserve the user's requested topic in every puzzle while still enforcing phase, legality, clarity, Elo order, and no-draw rules.

DEFAULTS THAT MAY BE USED ONLY AFTER THEY ARE DISCLOSED
If the user explicitly says defaults are acceptable, use:
CHAPTER_NAME = "Beginner No-Draw Chess Puzzles"
FIRST_ESTIMATED_ELO = 100
ELO_STEP = 25
OUTPUT_LANGUAGE = "simple English"
The total puzzle count and all three phase counts are never guessed. They must be supplied by the user or explicitly accepted by the user.

The three phase counts must add up exactly:
STARTING_COUNT + MIDDLEGAME_COUNT + ENDGAME_COUNT = TOTAL_PUZZLES

For a user-selected 30-puzzle request with a 10/10/10 split, the count and order are exactly:
- positions 1–10: starting/opening
- positions 11–20: middlegame
- positions 21–30: endgame

The first puzzle must be a starting/opening puzzle. The first puzzle must never be an endgame puzzle. If the user changes the counts, preserve the same phase order and use the new exact counts. If the counts do not add up, return to PHASE 0 and ask for correction instead of generating.

TARGET FORMAT — CURRENT CHESSX IMPORT FORMAT ONLY
Generate exactly one chapter by default. Use CHAPTER_NAME as its name. Do not use a generic puzzle schema, Lichess schema, PGN-only schema, array-only schema, or invented application format.

The accepted root object is:
- format: exactly "chessx-puzzle-library"
- version: exactly 1
- exportedAt: an ISO-8601 timestamp string
- chapters: an array containing the generated chapter
- activeChapterId: the generated chapter's exact id
- activePuzzleId: the first puzzle's exact id

Each chapter must contain only the supported ChessX fields:
- id: non-empty unique string
- name: non-empty string
- expanded: boolean, normally true
- puzzles: array

Each puzzle must contain these supported ChessX fields:
- id: non-empty unique string
- title: non-empty clear string
- description: plain-language learner instruction
- solution: non-empty SAN move sequence
- difficulty: integer from 1 through 5
- tags: one string, preferably comma-separated
- fen: legal six-field FEN
- chapterId: exactly the containing chapter id
- createdAt: non-negative numeric Unix timestamp in milliseconds

Do not add unsupported fields such as elo, rating, phase, result, sourceGame, sourceUrl, openingCode, evaluation, engineScore, comments, variations, or moves. ChessX does not preserve those fields during import. Put phase, category, and an estimated-Elo label in the tags string instead. Do not add a second chapter unless the editable request explicitly asks for multiple chapters.

PHASE PLAN — STRICT ORDER
A. STARTING/OPENING BLOCK
Generate exactly STARTING_COUNT puzzles first.
A starting/opening position must visibly belong to the early part of a game. Prefer full or near-full material, early development, basic opening principles, simple checks, captures, forks, pins, threats, or the requested category. It may be a position after a few legal opening moves, but it must not be a reduced-material endgame disguised as an opening puzzle.

For the default request, puzzles 1–10 must have tags containing "starting" or "opening" and must be the simplest group. Puzzle 1 must be the most accessible starting/opening puzzle, not an endgame, not an advanced study, and not a position requiring expert opening theory.

B. MIDDLEGAME BLOCK
Generate exactly MIDDLEGAME_COUNT puzzles next.
A middlegame position should have a developed or developing position with enough active material for normal middlegame tactics. Prefer understandable checks, captures, threats, pins, forks, discovered attacks, simple combinations, king safety, or the requested category. Do not put a bare-king, pawn-only, or obvious reduced-material endgame in this block.

C. ENDGAME BLOCK
Generate exactly ENDGAME_COUNT puzzles last.
An endgame must have reduced but sufficient material and a clear winning idea. Examples include a simple king-and-pawn conversion, a rook endgame tactic, a queen/rook finish, or another requested category. Never use king versus king, king and bishop versus king, king and knight versus king, a dead position, or any position where the only possible result is a draw. Reduced material is not enough by itself: the tested line must still be decisive.

PHASE CLASSIFICATION CHECK
Before accepting a candidate, inspect its FEN and its actual piece placement. Do not classify only from the title. Check:
- material amount and piece types;
- whether the position is early-game, middlegame, or reduced-material endgame;
- whether the phase tag agrees with the board;
- whether the requested phase count and sequence are still exact.
If a position could reasonably be classified in two phases, reject it and generate a clearer candidate. Do not put an endgame first simply because it has an easy solution.

NO-DRAW AND DECISIVE-RESULT POLICY — ABSOLUTE
Draw avoidance is mandatory, not optional.

Reject a candidate if any of the following is true in its source game, source line, starting position, or tested solution:
- the recorded game result is 1/2-1/2;
- the line ends in stalemate;
- the line reaches insufficient material or dead position;
- the line reaches threefold or fivefold repetition;
- the line reaches the fifty-move or seventy-five-move rule;
- the draw is by agreement or any other rule;
- the position is already drawn before the solution starts;
- the solution creates a forced draw instead of a win;
- the candidate has an uncertain result that cannot be verified.

Do not place 1/2-1/2, 1/2, draw, stalemate, or a draw explanation in the solution string. Do not assume that check means a win. Do not assume that winning material is enough without replaying the line.

Internally replay the complete selected solution line from the supplied FEN with a chess rules engine. At every ply check that the move is legal and that the position has not entered a draw state. At the end, verify that the side to move has a decisive winning result or a clearly verified, non-drawing winning conversion. If the solution ends in checkmate, the final SAN must use the correct # marker. For a non-mate category, the line must still be an unambiguous winning line; if that cannot be demonstrated, reject the candidate.

If the source game history is unavailable, do not pretend that repetition or a fifty-move status was checked. Use a fresh legal position and a short, verified decisive line, or reject the candidate. Never include a candidate merely because it looks tactical.

ELO AND DIFFICULTY PROGRESSION
The sequence must become harder gradually. The first requested level is approximately FIRST_ESTIMATED_ELO, which defaults to 100 Elo. Do not begin at 800, 1200, or expert level.

Use this order:
1. Within every phase, sort candidates by estimated Elo from low to high.
2. Keep the complete list broadly non-decreasing in difficulty: earlier puzzles are easier, later puzzles are somewhat harder.
3. The starting/opening block begins at the lowest level; the middlegame block follows; the endgame block is last and may be slightly harder. Do not make a sudden jump from beginner to expert.
4. Use ELO_STEP as a guide, not as a fake claim of exact engine calibration. Start near FIRST_ESTIMATED_ELO and increase gently by roughly ELO_STEP between adjacent levels.
5. If a puzzle is harder than its position number permits, replace it with a simpler candidate rather than assigning it an artificially low difficulty.

ChessX does not have a supported elo property. Do not create one. Store the approximate band only in tags, for example:
- "starting, requested-category, elo-100"
- "starting, requested-category, elo-175"
- "middlegame, requested-category, elo-300"
- "endgame, requested-category, elo-500"

Use difficulty as ChessX's only numeric difficulty field:
- difficulty 1: very accessible beginner idea;
- difficulty 2: simple one-idea tactic or conversion;
- difficulty 3: moderate but teachable idea;
- difficulty 4: harder later puzzle only;
- difficulty 5: very hard later puzzle only, and never use it for the first beginner block unless explicitly requested.

For the default 30-puzzle request, a safe progression is normally difficulty 1 in the earliest block, then 1–2, then 2–3, with later 3–4 only when genuinely justified. Do not label every puzzle 5. Do not put a high-Elo tag on a puzzle that is visibly simpler than the puzzles before it.

REQUESTED CATEGORY
Every puzzle must satisfy REQUESTED_CATEGORY, including the phase block in which it appears. If the requested category is mate, use clear legal mating ideas. If it is tactics, use a clear tactical objective. If it is opening, keep the board in the starting/opening block. If it is endgame, keep it in the endgame block. If the requested category conflicts with a legal, understandable, decisive, no-draw puzzle, reject the candidate and generate another one.

Do not let the category override:
- exact count;
- phase order;
- simple teaching level;
- FEN legality;
- SAN legality;
- unique IDs;
- no-draw policy;
- current ChessX schema.

TEACHING QUALITY RULES
- Write every description in OUTPUT_LANGUAGE, unless the requested language is explicitly changed.
- Say whose turn it is and tell a beginner what to look for in plain language.
- Avoid unexplained engine jargon such as "only move" or "zugzwang" unless the description explains it simply.
- Use a short unique title that matches the actual position and solution.
- Do not claim checkmate, a fork, a win, or a phase that the FEN and replay do not prove.
- Do not create duplicate or near-duplicate positions. Compare FENs and solution ideas before accepting the list.
- Make the first puzzles approachable for someone with almost no chess knowledge.
- Keep puzzle order stable and intentional. Do not shuffle after validation.

LEGAL FEN RULES
For every FEN, perform all of these checks before accepting it:
1. It has exactly six whitespace-separated fields: piece placement, active color, castling availability, en-passant target, halfmove clock, and fullmove number.
2. Piece placement has exactly eight ranks, and every rank expands to exactly eight squares.
3. There is exactly one white king and exactly one black king.
4. The active color is exactly w or b and matches the first SAN move.
5. Castling rights are consistent with the relevant king and rook positions. Do not claim castling rights for missing or moved pieces.
6. An en-passant square is legal and consistent; otherwise use -.
7. Halfmove and fullmove fields are numeric and sensible: halfmove is non-negative and fullmove is at least 1.
8. The position loads successfully in the same kind of chess rules engine used to replay SAN.
9. The position is not already checkmate, stalemate, insufficient material, or another draw unless the requested puzzle explicitly and validly requires a starting checkmate—which is not allowed for this beginner generation request. Regenerate instead.
10. Do not use a position with both kings in check or another impossible arrangement.

SAN SOLUTION RULES
For every solution, perform all of these checks:
1. Start with a fresh chess engine loaded with that puzzle's exact FEN.
2. Replay SAN tokens one at a time in order. The first token must be legal for the FEN's active side.
3. Use SAN, not UCI or coordinate notation: use moves such as Nf3, exd5, Qh5+, O-O, e8=Q, or Qxg7#.
4. Use correct disambiguation, capture marker, promotion notation, check marker, and checkmate marker. Do not write guessed SAN.
5. Do not include comments, move numbers, ellipses, NAGs, variations, PGN headers, or result tokens. Use one plain space between SAN tokens.
6. Keep the complete solution at 12 plies or fewer because the current ChessX player and importer enforce a maximum of 12 SAN tokens.
7. After every move, confirm it was accepted by the engine and that the intended side still has the intended objective.
8. Confirm the final line is decisive and not a draw. If a checkmate is reached, the final SAN must end in #.
9. Do not output an empty solution. Do not hide an illegal move behind a comment or alternate variation.

IDENTIFIER AND REFERENCE RULES
- Generate a unique chapter id, for example chapter-beginner-no-draw-30.
- Generate a unique puzzle id for every puzzle, for example puzzle-001-starting, puzzle-002-starting, and so on.
- IDs must be unique across all chapters, not merely unique within one chapter.
- Every puzzle's chapterId must exactly equal the containing chapter id.
- activeChapterId must exactly equal the generated chapter id.
- activePuzzleId must exactly equal the first puzzle id.
- Do not reuse IDs from a source file or another generation run.
- Titles may repeat only if unavoidable, but IDs may never repeat. Prefer unique titles as well.
- Use only strings for IDs and references.

COUNT, ORDER, AND COMPLETENESS CHECKS
Before serialization, create an internal audit table with one row per puzzle containing:
- sequence number;
- phase;
- title;
- FEN;
- solution token count;
- estimated Elo tag;
- difficulty;
- decisive/no-draw result;
- unique ID and chapter reference.

Then verify all of the following:
- total puzzle rows equals TOTAL_PUZZLES exactly;
- starting rows equal STARTING_COUNT exactly;
- middlegame rows equal MIDDLEGAME_COUNT exactly;
- endgame rows equal ENDGAME_COUNT exactly;
- rows are ordered starting, then middlegame, then endgame;
- puzzle 1 is starting/opening;
- no row is missing a title, description, solution, FEN, difficulty, tags, id, chapterId, or createdAt;
- no duplicate ID, duplicate FEN, or accidental duplicate solution was introduced;
- Elo labels and difficulty do not decrease unexpectedly;
- no candidate failed any draw or legality check.

CURRENT CHESSX IMPORT LIMITS TO RESPECT
The current validator accepts at most 200 chapters and at most 5,000 puzzles in total. Individual text limits include approximately:
- chapter id/name: 160 characters;
- puzzle id: 160 characters;
- title: 240 characters;
- description: 10,000 characters;
- solution: 2,000 characters, with no more than 12 playable SAN tokens;
- tags: 500 characters;
- FEN: 200 characters.
Stay far below these limits. A normal 30-puzzle file should have one chapter and short readable text.

REQUIRED JSON SHAPE
Return one JSON object with this exact supported structure. Values shown below are placeholders and must be replaced with the validated generated values:
{
  "format": "chessx-puzzle-library",
  "version": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "chapters": [
    {
      "id": "unique-chapter-id",
      "name": "the exact CHAPTER_NAME value",
      "expanded": true,
      "puzzles": [
        {
          "id": "unique-puzzle-id",
          "title": "short accurate title",
          "description": "plain-language instruction in OUTPUT_LANGUAGE",
          "solution": "legal SAN moves separated by spaces",
          "difficulty": 1,
          "tags": "starting, requested-category, elo-100",
          "fen": "legal six-field FEN",
          "chapterId": "the exact containing chapter id",
          "createdAt": 1780000000000
        }
      ]
    }
  ],
  "activeChapterId": "the exact generated chapter id",
  "activePuzzleId": "the exact first puzzle id"
}

The example above is only a shape reference. Do not output it as a sample, do not output placeholder values, and do not omit the remaining puzzles. Output exactly the requested number of fully validated puzzle objects.

FINAL TWO-PASS VALIDATION BEFORE ANSWERING
PASS 1 — chess/data validation:
- Parse the object as JSON.
- Validate the root and every supported field against the current ChessX rules above.
- Count and classify every puzzle.
- Replay every FEN and every SAN token.
- Recheck all no-draw conditions and decisive results.
- Recheck all ids and chapter references.
- Recheck difficulty, Elo ordering, and teaching descriptions.

PASS 2 — serialization validation:
- Serialize the final object again as strict JSON.
- Parse that serialized text again.
- Confirm there is exactly one root object.
- Confirm there are no Markdown fences, comments, trailing commas, headings, explanations, warnings, or text outside the JSON.
- Confirm the serialized puzzle count and phase order are unchanged.
- Confirm activeChapterId and activePuzzleId still reference existing records.

FAIL-CLOSED RESPONSE CONTRACT
If any validation fails, do not return the invalid object. Silently discard the failing candidate, generate a replacement, and repeat validation. If the request cannot be satisfied, continue generating valid alternatives rather than relaxing a rule. Never knowingly return a draw, illegal move, invalid FEN, wrong count, wrong order, duplicate ID, unsupported schema, or unverified result.

Your final response must contain only the validated raw JSON object. Do not use ``` fences. Do not add a title. Do not add a checklist. Do not add an explanation before or after the JSON. Do not output a second object. The first character must be { and the last character must be }.
```

- Auto-saves current lesson to localStorage

### 🎬 Built-in Screen Recording
- Uses browser `getDisplayMedia` API
- Records entire screen / window / tab
- Optional microphone audio integration
- Pause / Resume / Stop controls
- Live timer
- Preview and download after stop
- Falls back gracefully to OBS instructions if permission denied

### 🎙 Microphone Support
- Toggle on/off
- Optional integration with screen recording for full video + audio capture

### 🎨 6 Board Themes + 3 Piece Sets
- Classic, Tournament, Wooden, Dark, Minimal, Green

### 📱 Responsive Design
- Optimized for Windows, Mac, iPad (landscape), Android tablets and phones
- Rearranges panels on small screens (one column below 900px, board first)
- Phone and tablet layouts respect iOS/Android safe-area insets, allow the
  stacked panels to scroll, keep form fields from triggering browser zoom, and
  preserve touch drawing with `touch-action` controls
- The board is re-measured against **the room actually left in the window**, so
  it can never be clipped by the sidebars: a 1024×768 window gets a ~700px
  board, a 390×844 phone a ~365px one, and every rank stays reachable
  (`js/27-autofit.js`). The space watcher is rate-limited instead of
  "three refits and stop", so it keeps working for the whole session.
- **Finger input**: a tap is one gesture, never two. Chrome replays a tap as
  synthetic mouse events, and handling both made a tap select-then-deselect a
  piece and turn a drawing tap into a double click that undid itself — drawing
  tools now work with a finger exactly as they do with a mouse (tap-tap for a
  click-click arrow, swipe for a drag arrow)

### 🌐 Web App and Download
- The front page includes **Web App** to install ChessX as a PWA on supported
  Android, iPadOS, iOS and desktop browsers. Safari shows its Add to Home Screen
  guidance when it cannot open an install prompt directly.
- After the first successful online load, the service worker caches the complete
  app shell, icons, engine, audio, and downloadable bundle so the installed app
  continues to open and work without a connection.
- **Download** saves `ChessX-WebApp.zip`, a complete static copy that can be
  unzipped and served locally or from any static web host. The extracted bundle
  includes all application assets and remains usable without internet access.

## 🚀 Usage

It's a pure static website. Open `index.html` in any modern browser, or serve the folder with any static server:

```bash
# Python 3
python3 -m http.server 8000

# Node
npx serve
```

Then visit `http://localhost:8000`. Use a local/static HTTP server rather than
opening the file directly when you want PWA installation and service-worker
offline caching; the downloaded files themselves remain local and self-contained.

## 🌐 Browser Compatibility

Works on all modern Chromium / Firefox / Safari browsers. Screen recording requires Chromium-based browsers (Chrome, Edge, Brave, Opera) for full API support.

## 🗂 File structure

The old monolithic `styles.css` (3,025 lines) and `app.js` (2,922 lines) are split
into one file per section, so you can open exactly the file you need when fixing
something. Load order in `index.html` **is** the original order, and file names are
numbered to match it — so alphabetical order = load order.

```
index.html            the only page: markup + the <link>/<script> list (edit here)
css/                  35 files — was styles.css, one file per section banner
  00-base.css           tokens, reset, typography
  10..28-*.css          shared chrome: topbar, layout, board, panels, clock, notes…
  30..35-puzzle-*.css   puzzle library + editor styling
  36-mode-setup.css     Custom Setup overrides
  37-mode-puzzle.css    Puzzle mode overrides (hides Analysis + Clock cards)
  38-puzzle-editor-ui.css  editor controls (.pe-*)
  40-home-button.css 41-front-page.css
  45-mode-normal.css    Normal mode overrides
  46-checkmate.css      checkmate / stalemate / draw animations
  47-fullscreen.css     compact chrome while in Full, so the board grows
  48-inspect-guard.css  full-screen lock shown while DevTools is open
  23-modal-dead.css     ⚠ pre-existing: this block is commented out in the original
                        CSS (.modal-overlay selector line is missing). No modal exists
                        in index.html/app.js, so nothing is lost — safe to delete.
js/                   32 files — was app.js, one file per section banner
  00-constants.js       PIECE_FONT
  01-state.js 02-dom.js 03-utils.js          shared core
  04-protect.js         inspection deterrent (shortcuts, menu, devtools lock)
  10..19-*.js           board render, interactions, annotations (arrow shapes
                        live in 11-annotations-render.js), tools, setup,
                        move list, FEN, themes, layouts
  20..25-puzzle-*.js    puzzle library, editor board, authoring mode
  26-engine.js          Stockfish worker bridge
  27-autofit.js         board sizing — fills the whole free box, re-checks itself
  28-flip-reset.js 29-chess-clock.js 30-keyboard.js
  31-render-all.js 32-event-bindings.js 33-mode-picker.js
  35-checkmate.js       checkmate / stalemate / draw animation (hooked into renderAll)
  36-persist.js         session + unsaved-draft autosave (restores after a reload)
  90-boot.js            init() — MUST stay the last script
tools/verify_split.py   integrity check (see below)
tools/arrow_style_test.py  pixel-checks the arrows against the reference numbers
```

Nothing was rewritten while splitting: the files are byte-exact slices of the
originals, recorded in `css/MANIFEST.json` and `js/MANIFEST.json`. To prove the
split is still intact after your edits:

```bash
python3 tools/verify_split.py      # PASS = concatenation + load order unchanged

# arrows still look like the reference (needs playwright + chromium + pillow)
python3 tools/arrow_style_test.py  # 37 checks: band width, head, colour, the
                                   # knight L, flip, under-piece layering
```

Still no build step: `index.html` opens by double-click (`file://`) or via any
static server.

## 📦 Tech Stack

- **Vanilla JavaScript** — no build step, no framework overhead
- **[chess.js](https://github.com/jhlywa/chess.js)** — move validation & FEN/PGN
- **[Stockfish.js](https://github.com/nmrugg/stockfish.js)** — engine analysis
- Pure CSS (no Tailwind, no Bootstrap)
- Browser MediaRecorder API for screen recording
- localStorage / IndexedDB for persistence
- SVG for crisp annotations

## 🪪 License

MIT
