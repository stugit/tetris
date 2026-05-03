# Tetris Project Plan & Context

This document serves as a roadmap and architectural guide for AI agents working on this Tetris project.

## 1. Project Overview
A modern, browser-based Tetris implementation with a Supabase backend for global leaderboards and GitHub OAuth authentication.

## 2. Tech Stack
- **Frontend**: Vanilla JS (ES Modules), HTML5 Canvas, CSS3.
- **Backend**: Supabase (PostgreSQL, GoTrue Auth, Edge Functions).
- **Infrastructure**: GitHub Pages for hosting, Supabase CLI for local development.

## 3. Core Architecture
- `game.js`: Orchestrates game state, input handling, and the main loop.
- `renderer.js`: Pure visual logic (canvas drawing, particles, starfields).
- `supabase-client.js`: Interface for Auth and Database operations.
- `constants.js`: Centralized config. **Crucial**: Contains `SCORE_SALT` and environment toggle `OVERRIDE_LOCAL_TO_PRODUCTION`.
- `supabase/functions/validate-score/`: Deno-based Edge Function that prevents leaderboard tampering.

## 4. Development Workflow

### Local Development (Supabase)
1. **Start Services**: `npx supabase start` (Requires Docker).
2. **Apply Schema**: `npx supabase db reset` (Runs migrations and seeds).
3. **Run Edge Functions**: `npx supabase functions serve validate-score --no-verify-jwt`.
4. **Frontend**: Use VS Code "Live Server" on `http://127.0.0.1:5500`.

### Environment Switching
- Development uses `http://127.0.0.1:54321`.
- Production uses `<https://qifjlcmyafstvocfrzuc.supabase.co>`.
- Adjust keys in `constants.js` based on terminal output from `supabase start`.

## 5. Security & Integrity
Scores are not saved directly via client-side `insert`.
1. **Checksum**: The client creates a SHA-256 hash in `supabase-client.js`: `score:lines:level:gameId:userId:avatar:salt`.
2. **Edge Function**: `validate-score` recalculates this hash using the same `SCORE_SALT` (stored in env vars).
3. **Heuristics**: The function checks if the score is theoretically possible for the number of lines cleared.
4. **Cooldown**: Users are rate-limited to 30 seconds between submissions.

## 6. Known Considerations
- **CORS**: ES Modules require a local server (Live Server/npx serve). Direct `file://` access will fail.
- **OAuth**: GitHub OAuth requires separate App registrations for local (`127.0.0.1`) and production.
- **DAS/ARR**: Horizontal movement is custom-implemented in `game.js` to match high-level competitive Tetris feel (Delayed Auto-Shift and Auto-Repeat Rate).

## 7. Future Roadmap
- [ ] Improved mobile touch controls (Visual d-pad option).
- [ ] Social sharing of scores.
- [ ] Multiple game modes (Sprint, Marathon, Ultra).
- [ ] Skin system for blocks and backgrounds.

## 8. Troubleshooting CLI Failures
If `supabase start` or `db reset` times out with `context deadline exceeded`:
1. `npx supabase stop --no-backup`
2. Restart Docker Desktop.
3. `npx supabase start`
