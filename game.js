'use strict';

import { ROWS, COLS, PIECES, PIECE_TYPES, SCORE_TABLE, BASE_SPEED, MIN_SPEED, SPEED_STEP, COLORS } from './constants.js';
import { AudioManager } from './audio.js';
import { drawBoard, drawPreview, updateUIElements } from './renderer.js';

// ─── DOM ──────────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('board');
const ctx         = canvas.getContext('2d');
const nextCanvas  = document.getElementById('next');
const nextCtx     = nextCanvas.getContext('2d');
const holdCanvas  = document.getElementById('hold');
const holdCtx     = holdCanvas.getContext('2d');
const overlay     = document.getElementById('overlay');
const overlayMsg  = document.getElementById('overlay-msg');

const UI_ELEMENTS = {
    score:     document.getElementById('score'),
    highScore: document.getElementById('high-score'),
    level:     document.getElementById('level'),
    lines:     document.getElementById('lines')
};

// ─── State ────────────────────────────────────────────────────────────────────
let board, currentPiece, nextType, holdType, holdUsed;
let score, highScore, level, linesCleared;
let gameState;   // 'idle' | 'playing' | 'paused' | 'over'
let dropTimer, lastTime, animId;
let lockPending, lockTimer, lockMoves;
const LOCK_DELAY     = 500;
const MAX_LOCK_MOVES = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
let bag = [];
function randomType() {
    if (bag.length === 0) {
        bag = [...PIECE_TYPES];
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
    }
    return bag.pop();
}

function cells(piece) {
    if (!piece) return [];
    return PIECES[piece.type][piece.rotation].map(([r, c]) => [
        piece.row + r,
        piece.col + c,
    ]);
}

function isValid(piece) {
    return cells(piece).every(([r, c]) =>
        r >= 0 && r < ROWS && c >= 0 && c < COLS && !board[r][c]
    );
}

function dropSpeed() {
    return Math.max(MIN_SPEED, BASE_SPEED - (level - 1) * SPEED_STEP);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function initGame() {
    board        = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score        = 0;
    level        = 1;
    linesCleared = 0;
    dropTimer    = 0;
    lastTime     = null;
    bag          = [];
    holdType     = null;
    holdUsed     = false;
    lockPending  = false;
    lockTimer    = 0;
    lockMoves    = 0;
    highScore    = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
    nextType     = randomType();
    spawnPiece();
    updateUI();
}

function spawnPiece() {
    lockPending  = false;
    lockTimer    = 0;
    lockMoves    = 0;
    currentPiece = { type: nextType, rotation: 0, row: 0, col: 3 };
    nextType     = randomType();
    if (!isValid(currentPiece)) gameOver();
}

// ─── Movement ─────────────────────────────────────────────────────────────────
function moveLeft() {
    const p = { ...currentPiece, col: currentPiece.col - 1 };
    if (isValid(p)) {
        currentPiece = p;
        AudioManager.sfx('move');
        if (lockPending) handleLockReset();
    }
}

function moveRight() {
    const p = { ...currentPiece, col: currentPiece.col + 1 };
    if (isValid(p)) {
        currentPiece = p;
        AudioManager.sfx('move');
        if (lockPending) handleLockReset();
    }
}

function tryMoveDown() {
    const p = { ...currentPiece, row: currentPiece.row + 1 };
    if (isValid(p)) { currentPiece = p; return true; }
    return false;
}

function moveDown() {
    if (tryMoveDown()) { dropTimer = 0; return true; }
    if (!lockPending) {
        lockPending = true;
        lockTimer   = LOCK_DELAY;
        lockMoves   = 0;
    }
    return false;
}

function hardDrop() {
    lockPending = false;
    lockTimer   = 0;
    lockMoves   = 0;
    while (isValid({ ...currentPiece, row: currentPiece.row + 1 })) {
        currentPiece = { ...currentPiece, row: currentPiece.row + 1 };
    }
    lockPiece();
    dropTimer = 0;
}

function rotate() {
    const nextRot = (currentPiece.rotation + 1) % 4;
    // Try plain rotation then wall-kicks: ±1, ±2 columns
    for (const kick of [0, -1, 1, -2, 2]) {
        const p = { ...currentPiece, rotation: nextRot, col: currentPiece.col + kick };
        if (isValid(p)) {
            currentPiece = p;
            AudioManager.sfx('rotate');
            if (lockPending) handleLockReset();
            return;
        }
    }
}

function holdPiece() {
    if (holdUsed) return;
    holdUsed    = true;
    lockPending = false;
    lockTimer   = 0;
    lockMoves   = 0;
    if (holdType === null) {
        holdType = currentPiece.type;
        spawnPiece();
    } else {
        const temp   = holdType;
        holdType     = currentPiece.type;
        currentPiece = { type: temp, rotation: 0, row: 0, col: 3 };
        if (!isValid(currentPiece)) { gameOver(); return; }
    }
    AudioManager.sfx('rotate');
}

function handleLockReset() {
    if (isValid({ ...currentPiece, row: currentPiece.row + 1 })) {
        lockPending = false;
        lockTimer   = 0;
    } else if (lockMoves < MAX_LOCK_MOVES) {
        lockMoves++;
        lockTimer = LOCK_DELAY;
    }
}

// ─── Locking & Line Clearing ──────────────────────────────────────────────────
function lockPiece() {
    holdUsed = false;
    cells(currentPiece).forEach(([r, c]) => { board[r][c] = COLORS[currentPiece.type]; });
    const cleared = clearLines();
    if (cleared > 0) {
        score        += SCORE_TABLE[cleared] * level;
        linesCleared += cleared;
        const newLevel = Math.floor(linesCleared / 10) + 1;
        if (newLevel > level) AudioManager.sfx('levelup');
        level = newLevel;
        AudioManager.sfx('clear', cleared);
        updateUI();
    } else {
        AudioManager.sfx('land');
    }
    spawnPiece();
}

function clearLines() {
    let count = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(c => c !== null)) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(null));
            count++;
            r++;  // recheck same index after shift
        }
    }
    return count;
}

// ─── Ghost ────────────────────────────────────────────────────────────────────
function ghostPiece() {
    let g = { ...currentPiece };
    while (isValid({ ...g, row: g.row + 1 })) g = { ...g, row: g.row + 1 };
    return g;
}

function draw() {
    drawBoard(ctx, board, currentPiece, cells(ghostPiece()));
    drawPreview(nextCtx, nextCanvas, nextType);
    drawPreview(holdCtx, holdCanvas, holdType, holdUsed);
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateUI() {
    updateUIElements(UI_ELEMENTS, { score, highScore, level, linesCleared, muted: AudioManager.muted });
}

// ─── Game State ───────────────────────────────────────────────────────────────
function startGame() {
    initGame();
    gameState        = 'playing';
    overlay.style.display = 'none';
    lastTime         = null;
    animId           = requestAnimationFrame(loop);
    AudioManager.startMusic();
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        cancelAnimationFrame(animId);
        AudioManager.pauseMusic();
        overlayMsg.textContent = 'PAUSED\nPress P to Resume';
        overlay.style.display  = 'flex';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        overlay.style.display = 'none';
        AudioManager.resumeMusic();
        lastTime = null;
        animId   = requestAnimationFrame(loop);
    }
}

function gameOver() {
    gameState = 'over';
    cancelAnimationFrame(animId);
    AudioManager.stopMusic();
    AudioManager.sfx('gameover');
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore);
        overlayMsg.textContent  = `NEW BEST!\n${score} pts\nPress Space to Restart`;
    } else {
        overlayMsg.textContent = `GAME OVER\n${score} pts\nPress Space to Restart`;
    }
    updateUI();
    overlay.style.display = 'flex';
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
function loop(timestamp) {
    if (gameState !== 'playing') return;
    const delta = lastTime ? timestamp - lastTime : 0;
    lastTime    = timestamp;

    if (lockPending) {
        lockTimer -= delta;
        if (lockTimer <= 0) {
            lockPending = false;
            lockPiece();
        }
    } else {
        dropTimer += delta;
        if (dropTimer >= dropSpeed()) {
            if (!tryMoveDown()) {
                lockPending = true;
                lockTimer   = LOCK_DELAY;
                lockMoves   = 0;
            }
            dropTimer = 0;
        }
    }

    if (gameState === 'playing') {
        draw();
        animId = requestAnimationFrame(loop);
    }
}

// ─── Input ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'idle' || gameState === 'over') startGame();
        else if (gameState === 'playing') hardDrop();
        return;
    }
    if (e.code === 'KeyP') {
        if (gameState === 'playing' || gameState === 'paused') pauseGame();
        return;
    }
    if (e.code === 'KeyM') {
        AudioManager.toggleMute();
        updateUI();
        return;
    }
    if (gameState !== 'playing') return;
    switch (e.code) {
        case 'ArrowLeft':  e.preventDefault(); moveLeft();   break;
        case 'ArrowRight': e.preventDefault(); moveRight();  break;
        case 'ArrowDown':  e.preventDefault(); moveDown();   break;
        case 'ArrowUp':    e.preventDefault(); rotate();     break;
        case 'KeyZ':       e.preventDefault(); rotate();     break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight': e.preventDefault(); holdPiece();  break;
    }
});

// ─── Touch / Swipe ────────────────────────────────────────────────────────────
// Gestures: tap=rotate, long-press=hold, swipe-up=hard-drop, swipe-down=soft-drop, swipe-left/right=move
let touchX0, touchY0, touchStartTime;

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchX0        = e.touches[0].clientX;
    touchY0        = e.touches[0].clientY;
    touchStartTime = Date.now();
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (gameState === 'idle' || gameState === 'over') { startGame(); return; }
    if (gameState === 'paused') { pauseGame(); return; }
    if (gameState !== 'playing') return;

    const dx       = e.changedTouches[0].clientX - touchX0;
    const dy       = e.changedTouches[0].clientY - touchY0;
    const adx      = Math.abs(dx), ady = Math.abs(dy);
    const elapsed  = Date.now() - touchStartTime;

    if (adx < 20 && ady < 20) {
        if (elapsed > 250) holdPiece();  // long press → hold
        else               rotate();    // quick tap → rotate
    } else if (adx > ady) {
        if (dx < 0) moveLeft(); else moveRight();
    } else if (dy < 0) {
        hardDrop();   // swipe up → hard drop
    } else {
        moveDown();   // swipe down → soft drop
    }

    draw();
}, { passive: false });

// Overlay covers the canvas when idle/paused/over, so touches land here, not canvas.
overlay.addEventListener('touchstart', e => {
    e.preventDefault();
    touchX0 = e.touches[0].clientX;
    touchY0 = e.touches[0].clientY;
}, { passive: false });

overlay.addEventListener('touchend', e => {
    e.preventDefault();
    if (gameState === 'idle' || gameState === 'over') { startGame(); return; }
    if (gameState === 'paused') { pauseGame(); return; }
}, { passive: false });

// Allow clicking the overlay with a mouse to start/resume as well.
overlay.addEventListener('click', () => {
    if (gameState === 'idle' || gameState === 'over') startGame();
    else if (gameState === 'paused') pauseGame();
});

// ─── Fit to viewport ──────────────────────────────────────────────────────────
// Scales the entire #wrapper down (CSS transform) so the game fits on screen
// without scrolling on any phone. Does not affect canvas resolution.
function scaleToFit() {
    const wrapper = document.getElementById('wrapper');
    wrapper.style.transform = 'none';
    document.body.style.overflow = '';
    document.body.style.height   = '';
    void wrapper.offsetWidth;                                   // force reflow before measuring

    const vw    = window.innerWidth;
    const vh    = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const bs    = getComputedStyle(document.body);
    const availW = vw - parseFloat(bs.paddingLeft)  - parseFloat(bs.paddingRight);
    const availH = vh - parseFloat(bs.paddingTop)   - parseFloat(bs.paddingBottom);
    const scale  = Math.min(availW / wrapper.offsetWidth, availH / wrapper.offsetHeight, 1);

    if (scale < 1) {
        wrapper.style.transform       = `scale(${scale})`;
        wrapper.style.transformOrigin = 'top center';
        document.body.style.height    = vh + 'px';
        document.body.style.overflow  = 'hidden';
    }
}

window.addEventListener('load', scaleToFit);
window.addEventListener('resize', scaleToFit);
window.addEventListener('orientationchange', () => setTimeout(scaleToFit, 400));

document.getElementById('mute-btn').addEventListener('click', () => {
    AudioManager.toggleMute();
    updateUI();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
gameState               = 'idle';
score                   = 0;
level                   = 1;
linesCleared            = 0;
highScore               = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);

updateUI();
ctx.fillStyle           = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
