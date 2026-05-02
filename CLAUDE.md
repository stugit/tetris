# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in a browser — no build step, no server required. All three files are loaded as plain static assets:

- `index.html` — markup and canvas elements
- `style.css` — styling and responsive layout
- `game.js` — entry point, game state, and input handling
- `audio.js` — Web Audio API management for music and SFX
- `constants.js` — board dimensions, piece definitions, and SRS kick tables
- `renderer.js` — all drawing logic, animations, and particle effects

## Architecture

The game uses modern ES modules. Key sections in `game.js`:

- **State** — mutable globals: `board`, `currentPiece`, `nextQueue`, `holdType`, `score`, `highScore`, `level`, `linesCleared`, `gameState`, and gameplay settings (DAS/ARR/SDR).
- **Movement** — `moveLeft/Right/Down`, `hardDrop`, `rotate` (with ±1/±2 column wall-kick). All mutate `currentPiece` in-place only if `isValid` passes.
- **Locking & line clearing** — `lockPiece` writes cells to `board`, calls `clearLines` (splice-and-unshift), then updates score/level and spawns the next piece.
- **Drawing** — `draw()` delegates to `renderer.js` to repaint the board, pieces, UI overlays, and particles.
- **Game loop** — `requestAnimationFrame` loop; gravity is time-based via `dropTimer` accumulator compared against `dropSpeed()`.
- **Linting** — Uses ESLint. Commands: `npm run lint` (check), `npm run lint:fix` (auto-fix).

## Development Commands
- `node scripts/install-hook.js`: Install local git pre-commit hook for linting.
- `npm install`: Install dev dependencies (ESLint).
- **Input** — keyboard (`keydown`) + touch/swipe on the canvas. Custom DAS (Delayed Auto-Shift) and ARR (Auto-Repeat Rate) handle held keys.

High score is persisted in `localStorage` under the key `tetrisHighScore`.

## Piece representation

Each piece is an object `{ type, rotation, col, row }`. The `PIECES` table stores all four rotation states as arrays of `[row, col]` offsets within a 4×4 bounding box. `cells(piece)` converts these offsets to absolute board coordinates for collision and drawing.

## Responsive / mobile layout

The CSS uses a single media query (`max-width: 560px` or `pointer: coarse`) to stack the panel below the board, hide the keyboard legend, and show `#touch-controls`. Touch controls are hidden by default on desktop.
