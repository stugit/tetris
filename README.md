# Tetris

A browser-based Tetris game. No dependencies, no build step — open `index.html` and play.

**Live:** https://stugit.github.io/tetris

---

## How to play

### Desktop

| Key | Action |
|---|---|
| `← →` | Move left / right |
| `↑` or `Z` | Rotate clockwise |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `P` | Pause / resume |

### Mobile (touch gestures)

| Gesture | Action |
|---|---|
| Tap | Rotate clockwise |
| Double tap | Hard drop |
| Swipe ← → | Move left / right |
| Swipe ↓ | Soft drop |

The board scales automatically to fit any screen size.

---

## Scoring

| Lines cleared | Points (× level) |
|---|---|
| 1 | 100 |
| 2 | 300 |
| 3 | 500 |
| 4 (Tetris) | 800 |

Level increases every 10 lines. Speed increases with each level. High score is saved in your browser.

---

## Running locally

Open `index.html` directly in any modern browser — no server required.

## Deployment

Pushes to `main` automatically lint and deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`. To enable for a new fork, go to **Settings → Pages** and set the source to **GitHub Actions**.
