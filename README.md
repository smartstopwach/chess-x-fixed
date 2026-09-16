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
- **Import Puzzle Library** — choose a `.json` file from the Library / Chapters panel. The importer checks the root schema, chapter/puzzle IDs, references, FEN legality, difficulty, timestamps, and every saved SAN solution before replacing local data; a bad file is rejected without touching the existing library
- `puzzle-library-example.json` is a ready-to-import sample file
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

## 🚀 Usage

It's a pure static website. Open `index.html` in any modern browser, or serve the folder with any static server:

```bash
# Python 3
python3 -m http.server 8000

# Node
npx serve
```

Then visit `http://localhost:8000`.

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
