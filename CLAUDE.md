# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in a browser — no build step, no server required. All three files are loaded as plain static assets:

- `index.html` — markup and canvas elements
- `style.css` — styling and responsive layout
- `game.js` — all game logic (no framework, no bundler)

## Architecture

The entire game is a single `game.js` file (~410 lines) with no dependencies. Key sections, marked by banner comments:

- **Constants** — board dimensions (`COLS=10`, `ROWS=20`, `CELL=30px`), piece rotation tables (`PIECES`), scoring (`SCORE_TABLE`), and speed curve (`BASE_SPEED`, `MIN_SPEED`, `SPEED_STEP`).
- **State** — six mutable globals: `board` (2-D array of color strings or `null`), `currentPiece` and `nextType`, `score`/`highScore`/`level`/`linesCleared`, `gameState` (`'idle'|'playing'|'paused'|'over'`), and rAF/timer handles.
- **Movement** — `moveLeft/Right/Down`, `hardDrop`, `rotate` (with ±1/±2 column wall-kick). All mutate `currentPiece` in-place only if `isValid` passes.
- **Locking & line clearing** — `lockPiece` writes cells to `board`, calls `clearLines` (splice-and-unshift), then updates score/level and spawns the next piece.
- **Drawing** — `draw()` repaints everything each frame: background, grid, locked cells, ghost piece (20% alpha), active piece, and the next-piece preview canvas.
- **Game loop** — `requestAnimationFrame` loop; gravity is time-based via `dropTimer` accumulator compared against `dropSpeed()`.
- **Input** — keyboard (`keydown`) + touch/swipe on the canvas + on-screen button overlay. DAS (Delayed Auto-Shift) is implemented for held left/right/soft-drop buttons.

High score is persisted in `localStorage` under the key `tetrisHighScore`.

## Piece representation

Each piece is an object `{ type, rotation, col, row }`. The `PIECES` table stores all four rotation states as arrays of `[row, col]` offsets within a 4×4 bounding box. `cells(piece)` converts these offsets to absolute board coordinates for collision and drawing.

## Responsive / mobile layout

The CSS uses a single media query (`max-width: 560px` or `pointer: coarse`) to stack the panel below the board, hide the keyboard legend, and show `#touch-controls`. Touch controls are hidden by default on desktop.
