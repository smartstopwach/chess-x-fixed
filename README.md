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
- Arrows (drag from one square to another)
- Circles (click to toggle)
- Square highlights
- Rectangle highlight areas
- Eraser (per-square)
- 7 colors
- "Clear all annotations" button

### 🧩 Position Setup
- Visual piece rack to add/remove pieces
- Castling rights toggles
- Side-to-move selector
- FEN input + paste + copy
- "Start from position" button

### 📜 Move List
- Clean SAN notation
- Click any move to jump to it
- Previous/Next/Delete
- Variation support
- Compact panel that doesn't distract during recording

### 🤖 Stockfish Analysis
- Real evaluation, best move, PV
- Configurable depth (10/15/20/25)
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
  legal chess moves (piece selection, move list, `Ctrl+Z`, `←`/`→` all work)
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

## ⚠️ Known issues found while refactoring (not yet fixed)

1. **Dead keyboard cases** — `js/30-keyboard.js` has `case 'e'`/`case 'E'` and
   `case 'h'`/`case 'H'` twice in the same `switch`. A `switch` takes the first
   match, so `E` toggles setup mode and `H` shows the front page; the
   `setTool('eraser')` / `setTool('highlight')` branches are unreachable, even
   though the table above advertises them. Use the tool buttons instead.
2. **`test.html` DOM checks always fail** — that page loads the scripts but has
   no `#board` markup, so "board element exists / 64 squares / 32 pieces" can
   never pass (it fails identically before and after the split). The first four
   checks are meaningful.
3. **`css/23-modal-dead.css`** — in the original `styles.css`, line 1224 had a
   section banner where `.modal-overlay {` belonged, so that block plus
   `.modal-content/-header/-actions` is commented out and the file carries two
   unmatched `}`. No modal exists in `index.html`/`app.js`, so nothing is lost.
4. **"Recording Mode" and "Layout Presets" are documented above but not in this
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

### ⌨️ Keyboard Shortcuts
| Key | Action |
|---|---|
| `←` / `→` | Previous / Next move |
| `F` | Flip board |
| `R` | Reset board |
| `V` | Select tool |
| `A` | Arrow tool |
| `C` | Circle tool |
| `E` | Eraser tool |
| `H` | Highlight tool (or hide UI in recording mode) |
| `N` / `P` | Next / Previous bookmark |
| `Ctrl+Z` | Undo |
| `M` | Replay the checkmate / stalemate / draw animation |
| `Esc` | Exit recording mode |

### 💾 Save / Load / Export
- **Save Lesson** — exports full lesson as JSON (position + moves + annotations + notes + bookmarks + theme)
- **Load Lesson** — restore from JSON
- **Export PGN** — download game as PGN
- **Import** — JSON or PGN
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
- Optimized for Windows, Mac, iPad (landscape), Android tablets
- Rearranges panels on small screens

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
css/                  33 files — was styles.css, one file per section banner
  00-base.css           tokens, reset, typography
  10..28-*.css          shared chrome: topbar, layout, board, panels, clock, notes…
  30..35-puzzle-*.css   puzzle library + editor styling
  36-mode-setup.css     Custom Setup overrides
  37-mode-puzzle.css    Puzzle mode overrides (hides Analysis + Clock cards)
  38-puzzle-editor-ui.css  editor controls (.pe-*)
  40-home-button.css 41-front-page.css
  45-mode-normal.css    Normal mode overrides
  46-checkmate.css      checkmate / stalemate / draw animations
  23-modal-dead.css     ⚠ pre-existing: this block is commented out in the original
                        CSS (.modal-overlay selector line is missing). No modal exists
                        in index.html/app.js, so nothing is lost — safe to delete.
js/                   31 files — was app.js, one file per section banner
  00-constants.js       PIECE_FONT
  01-state.js 02-dom.js 03-utils.js          shared core
  10..19-*.js           board render, interactions, annotations, tools, setup,
                        move list, FEN, themes, layouts
  20..25-puzzle-*.js    puzzle library, editor board, authoring mode
  26-engine.js 27-autofit.js 28-flip-reset.js 29-chess-clock.js 30-keyboard.js
  31-render-all.js 32-event-bindings.js 33-mode-picker.js
  35-checkmate.js       checkmate / stalemate / draw animation (hooked into renderAll)
  36-persist.js         session + unsaved-draft autosave (restores after a reload)
  90-boot.js            init() — MUST stay the last script
tools/verify_split.py   integrity check (see below)
```

Nothing was rewritten while splitting: the files are byte-exact slices of the
originals, recorded in `css/MANIFEST.json` and `js/MANIFEST.json`. To prove the
split is still intact after your edits:

```bash
python3 tools/verify_split.py      # PASS = concatenation + load order unchanged
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
