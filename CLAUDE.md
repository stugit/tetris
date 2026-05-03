# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in a browser — no build step, no server required. All files are plain ES modules loaded via `<script type="module">`:

- `index.html` — markup and canvas elements
- `style.css` — styling and responsive layout
- `constants.js` — board dimensions, piece definitions, SRS kick tables, scoring, localStorage keys, and Supabase config
- `game.js` — entry point, game state, and input handling
- `audio.js` — Web Audio API music (Themes A/B/C) and SFX
- `renderer.js` — all drawing logic, animations, and particle effects
- `supabase-client.js` — Supabase client init and leaderboard/auth functions

## Development commands

```bash
npm install               # Install ESLint dev dependency
npm run lint              # Check for lint errors
npm run lint:fix          # Auto-fix lint errors
node scripts/install-hook.js  # Install git pre-commit lint hook
```

## Backend (Supabase)

The game uses Supabase for a global leaderboard and GitHub OAuth.

- **Table**: `leaderboard` (id, github_id, username, score, game_id, avatar_url, created_at)
- **Edge function**: `supabase/functions/validate-score/index.ts` — validates checksum, enforces 30s rate-limit, and applies heuristic score sanity checks before inserting
- **Schema**: `supabase/20240523000000_init_leaderboard.sql`
- **Skills**: Agent has permissions to use the Supabase CLI (`supabase *`)

### Local dev vs production

`constants.js` auto-detects `localhost`/`127.0.0.1` and points to the local Supabase instance (`http://127.0.0.1:54321`). Set `OVERRIDE_LOCAL_TO_PRODUCTION = true` in `constants.js` to force production URLs locally.

Typical local Supabase workflow:
```bash
supabase start            # Start local instance
supabase functions serve  # Serve edge functions locally (required for score submission)
supabase db reset         # Reset local DB and re-run migrations
supabase stop
```

## Architecture

The game uses modern ES modules. `game.js` is the hub — it imports from all other modules and owns all mutable state.

### State (game.js globals)

- **Board/piece**: `board` (2D array), `currentPiece` (`{type, rotation, col, row}`), `nextQueue` (5-piece preview), `holdType`, `holdUsed`
- **Score**: `score`, `highScore`, `level`, `linesCleared`, `comboCount`, `b2bActive`
- **Timers**: `dropTimer`, `lockTimer`, `lockPending`, `lockMoves` (lock delay: 500ms, max 15 moves)
- **Session**: `userSession`, `gameState` (`'idle' | 'playing' | 'paused' | 'over'`)
- **Settings**: `das`, `arr`, `sdr`, `zenMode`, `showGhost`, `keyBindings` — all persisted to `localStorage`

### Piece system

- `PIECES` in `constants.js` stores all four rotation states as `[row, col]` offsets in a 4×4 bounding box
- `cells(piece)` converts offsets to absolute board coordinates
- Spawning uses a 7-bag randomizer (`randomType()` in `game.js`)
- Rotation uses full SRS with separate kick tables for I vs. all other pieces (`SRS_KICKS`, `SRS_KICKS_I`)

### Movement & locking

- `moveLeft/Right/Down`, `hardDrop`, `rotate` — all mutate `currentPiece` in-place only if `isValid` passes
- Lock delay: piece locks after 500ms on ground; reset on each valid move, capped at 15 resets
- `lockPiece` writes to `board`, calls `clearLines` (splice-and-unshift), then scores and spawns next piece

### Scoring

- Standard line-clear points from `SCORE_TABLE` + T-spin bonuses (`TSPIN_SCORES`, `TSPIN_MINI_SCORES`)
- Combo bonus: `COMBO_BONUS * comboCount` per consecutive clear
- Back-to-back (B2B) multiplier: `×1.5` for consecutive Tetris/T-spin clears
- Perfect clear: flat `PERFECT_CLEAR_BONUS` (3000 pts)
- T-spin detection uses the 3-corner rule; last-move-was-rotate flag gates mini-spin classification

### Game loop

`requestAnimationFrame` loop; gravity via `dropTimer` accumulator vs. `dropSpeed()` (levels 1–20 span `BASE_SPEED` → `MIN_SPEED` in `SPEED_STEP` increments).

### Input

Keyboard (`keydown`) + touch/swipe on the canvas. Custom DAS/ARR/SDR values control held-key repeat. Key bindings are remappable and stored under `STORAGE_KEY_KEYS`.

### Persistence

- `localStorage` key `tetrisHighScore` — personal high score
- `localStorage` key `tetrisSaveState` — in-progress game state (board + piece + queue + hold + score)
- DAS/ARR/SDR/zen/ghost/key settings each have their own `localStorage` keys (see `constants.js`)

### Rendering (renderer.js)

`draw()` in `game.js` calls into `renderer.js` for board, pieces, hold/next canvases, UI overlays (level-up, T-spin, combo, B2B, perfect clear), and particles. Board background and grid color shift per `LEVEL_THEMES` (6 themes cycling every few levels). A starfield (`STAR_COUNT = 100`) scrolls in the background.

### Audio (audio.js)

`AudioManager` synthesizes music via Web Audio API (no audio files). Three themes (A = Korobeiniki, B, C) are represented as note-sequence arrays with melody + bass tracks. Compressor, filter, and vibrato are applied. SFX (move, rotate, lock, clear, hard drop, level up) are also synthesized.

## Responsive / mobile layout

Single media query (`max-width: 560px` or `pointer: coarse`): stacks panel below board, hides keyboard legend, shows `#touch-controls` (hidden on desktop).
