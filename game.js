'use strict';

import { ROWS, COLS, PIECES, PIECE_TYPES, SCORE_TABLE, TSPIN_SCORES, TSPIN_MINI_SCORES, BASE_SPEED, MIN_SPEED, SPEED_STEP, COLORS, STORAGE_KEY, PERFECT_CLEAR_BONUS, SRS_KICKS, SRS_KICKS_I, DEFAULT_DAS, DEFAULT_ARR, DEFAULT_SDR, STORAGE_KEY_DAS, STORAGE_KEY_ARR, STORAGE_KEY_SDR, STORAGE_KEY_ZEN, STORAGE_KEY_GHOST, COMBO_BONUS, B2B_MULTIPLIER, SAVE_KEY, LEVEL_THEMES } from './constants.js';
import { AudioManager } from './audio.js';
import { drawBoard, drawPreview, drawNextQueue, updateUIElements, updateMetrics, drawLevelUp, drawPerfectClear, drawTSpin, drawCombo, drawB2B, createExplosion, drawParticles, clearParticles, triggerShake, updateAnimations } from './renderer.js';

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
    lines:     document.getElementById('lines'),
    musicCheck: document.getElementById('music-check'),
    sfxCheck:   document.getElementById('sfx-check'),
    musicVol:   document.getElementById('music-vol'),
    sfxVol:     document.getElementById('sfx-vol'),
    dasSlider:  document.getElementById('das-slider'),
    arrSlider:  document.getElementById('arr-slider'),
    sdrSlider:  document.getElementById('sdr-slider'),
    pps:        document.getElementById('pps'),
    kpp:        document.getElementById('kpp'),
    zenCheck:   document.getElementById('zen-check'),
    ghostCheck: document.getElementById('ghost-check')
};

// ─── State ────────────────────────────────────────────────────────────────────
let board, currentPiece, nextQueue, holdType, holdUsed;
let score, highScore, level, linesCleared;
let gameState;   // 'idle' | 'playing' | 'paused' | 'over'
let dropTimer, lastTime, animId;
let lockPending, lockTimer, lockMoves;
let levelUpTimer;
let perfectClearTimer;
let tSpinTimer, tSpinType;
let comboCount, b2bActive;
let comboTimer, b2bTimer;
let piecesSpawnedCount, keyStrokesCount, gameElapsedTime;

// Configurable gameplay settings
let lastKickIndex = 0;
let das, arr, sdr, zenMode, showGhost;
let activeKeys = {}; // Tracks state of directional keys for DAS/ARR

let lastMoveWasRotate = false;
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
    const baseDrop = zenMode ? BASE_SPEED : Math.max(MIN_SPEED, BASE_SPEED - (level - 1) * SPEED_STEP);
    return activeKeys.softDrop ? baseDrop / sdr : baseDrop;
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
    levelUpTimer = 0;
    perfectClearTimer = 0;
    tSpinTimer   = 0;
    comboCount   = 0;
    b2bActive    = false;
    comboTimer   = 0;
    b2bTimer     = 0;
    piecesSpawnedCount = 0;
    lastKickIndex      = 0;
    keyStrokesCount    = 0;
    gameElapsedTime    = 0;
    das = parseInt(localStorage.getItem(STORAGE_KEY_DAS) || DEFAULT_DAS, 10);
    arr = parseInt(localStorage.getItem(STORAGE_KEY_ARR) || DEFAULT_ARR, 10);
    sdr = parseInt(localStorage.getItem(STORAGE_KEY_SDR) || DEFAULT_SDR, 10);

    activeKeys = {}; // Clear all active keys
    lastMoveWasRotate = false;
    clearParticles();
    nextQueue    = [randomType(), randomType(), randomType()];
    spawnPiece();
    updateUI();
}

function saveGame() {
    if (gameState !== 'playing' && gameState !== 'paused') return;
    const state = {
        board, currentPiece, nextQueue, holdType, holdUsed,
        score, level, linesCleared, comboCount, b2bActive, zenMode,
        piecesSpawnedCount, keyStrokesCount, gameElapsedTime, bag
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadGame(state) {
    board = state.board;
    currentPiece = state.currentPiece;
    nextQueue = state.nextQueue;
    holdType = state.holdType;
    holdUsed = state.holdUsed;
    score = state.score;
    level = state.level;
    linesCleared = state.linesCleared;
    comboCount = state.comboCount;
    b2bActive = state.b2bActive;
    piecesSpawnedCount = state.piecesSpawnedCount;
    zenMode = state.zenMode;
    if (UI_ELEMENTS.zenCheck) UI_ELEMENTS.zenCheck.checked = zenMode;
    keyStrokesCount = state.keyStrokesCount;
    gameElapsedTime = state.gameElapsedTime;
    bag = state.bag || [];

    // Reset transient timers
    dropTimer = 0;
    lockPending = false;
    lockTimer = 0;
    lockMoves = 0;
    levelUpTimer = 0;
    perfectClearTimer = 0;
    tSpinTimer = 0;
    comboTimer = 0;
    b2bTimer = 0;
    clearParticles();
}

function spawnPiece() {
    lockPending  = false;
    lockTimer    = 0;
    lockMoves    = 0;
    lastMoveWasRotate = false;
    const type   = nextQueue.shift();
    piecesSpawnedCount++;
    currentPiece = { type, rotation: 0, row: 0, col: 3 };
    nextQueue.push(randomType());
    if (!isValid(currentPiece)) gameOver();
}

// ─── Movement ─────────────────────────────────────────────────────────────────
function moveLeft() {
    const p = { ...currentPiece, col: currentPiece.col - 1 };
    if (isValid(p)) {
        currentPiece = p;
        AudioManager.sfx('move');
        if (lockPending) handleLockReset(); // Movement resets lock timer
        lastMoveWasRotate = false;
    }
}

function moveRight() {
    const p = { ...currentPiece, col: currentPiece.col + 1 };
    if (isValid(p)) {
        currentPiece = p;
        AudioManager.sfx('move');
        if (lockPending) handleLockReset(); // Movement resets lock timer
        lastMoveWasRotate = false;
    }
}

function tryMoveDown() {
    const p = { ...currentPiece, row: currentPiece.row + 1 };
    if (isValid(p)) { currentPiece = p; return true; }
    return false;
}

function softDrop() { // Renamed from moveDown
    if (tryMoveDown()) { dropTimer = 0; lastMoveWasRotate = false; return true; }
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
    while (tryMoveDown()) {
        // Continue moving down until a collision is detected
    }
    triggerShake(4, 100);    // Subtle shake on impact
    lockPiece();
    dropTimer = 0;
}

function rotate(dir = 1) {
    if (currentPiece.type === 'O') return;

    const startRot = currentPiece.rotation;
    const nextRot = (startRot + dir + 4) % 4;
    const key = `${startRot}-${nextRot}`;
    const kicks = currentPiece.type === 'I' ? SRS_KICKS_I[key] : SRS_KICKS[key];

    for (let i = 0; i < kicks.length; i++) {
        const [dc, dr] = kicks[i];
        const p = { ...currentPiece, rotation: nextRot, col: currentPiece.col + dc, row: currentPiece.row + dr };
        if (isValid(p)) {
            currentPiece = p;
            lastKickIndex = i;
            AudioManager.sfx('rotate');
            if (lockPending) handleLockReset();
            lastMoveWasRotate = true;
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
    lastMoveWasRotate = false;
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

function checkTSpin() {
    if (currentPiece.type !== 'T' || !lastMoveWasRotate) return null;
    const { row: r, col: c, rotation: rot } = currentPiece;
    // Check the 4 corners relative to the T-piece center (1,1)
    const corners = [
        [r, c], [r, c + 2], [r + 2, c], [r + 2, c + 2]
    ];
    let occupied = 0;
    const isOccupied = corners.map(([cr, cc]) => {
        const occ = cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS || board[cr][cc];
        if (occ) occupied++;
        return !!occ;
    });

    if (occupied < 3) return null;

    // If the 5th SRS kick (index 4) was used, it is always a regular T-Spin
    if (lastKickIndex === 4) return 'regular';

    // Check "front" corners relative to orientation to distinguish Mini
    // Indices: 0:TL, 1:TR, 2:BL, 3:BR
    let frontIndices;
    if (rot === 0) frontIndices = [0, 1];      // Pointing Up
    else if (rot === 1) frontIndices = [1, 3]; // Pointing Right
    else if (rot === 2) frontIndices = [2, 3]; // Pointing Down
    else if (rot === 3) frontIndices = [0, 2]; // Pointing Left

    const bothFrontOccupied = isOccupied[frontIndices[0]] && isOccupied[frontIndices[1]];
    return bothFrontOccupied ? 'regular' : 'mini';
}

// ─── Locking & Line Clearing ──────────────────────────────────────────────────
function lockPiece() {
    holdUsed = false;
    const tSpinResult = checkTSpin();
    const isTSpin = tSpinResult === 'regular';
    const isTSpinMini = tSpinResult === 'mini';

    cells(currentPiece).forEach(([r, c]) => { board[r][c] = COLORS[currentPiece.type]; });
    const cleared = clearLines();

    if (cleared > 0 || isTSpin || isTSpinMini) {
        const isPerfectClear = board.every(row => row.every(cell => cell === null));
        const difficultClear = (cleared === 4 || ((isTSpin || isTSpinMini) && cleared > 0));
        
        let points = SCORE_TABLE[cleared];

        if (cleared > 0) {
            const theme = LEVEL_THEMES[(level - 1) % LEVEL_THEMES.length];
            createExplosion(canvas.width / 2, canvas.height / 2, theme.accent, cleared * 20);
        }

        if (isTSpin || isTSpinMini) {
            if (isTSpin) {
                points = TSPIN_SCORES[cleared] || points;
                tSpinType = cleared === 0 ? 'T-SPIN' : `T-SPIN ${['','SINGLE','DOUBLE','TRIPLE'][cleared]}`;
            } else {
                points = TSPIN_MINI_SCORES[cleared] || points;
                tSpinType = cleared === 0 ? 'T-SPIN MINI' : `T-SPIN MINI ${['','SINGLE','DOUBLE'][cleared]}`;
            }
            tSpinTimer = 2000;
            createExplosion(canvas.width / 2, canvas.height / 2, COLORS.T, 40);
        }

        // Back-to-Back Logic
        if (difficultClear) {
            if (b2bActive) {
                points *= B2B_MULTIPLIER;
                b2bTimer = 2000;
            }
            b2bActive = true;
        } else if (cleared > 0) {
            b2bActive = false;
        }

        // Combo Logic
        if (cleared > 0) {
            if (comboCount > 0) {
                points += COMBO_BONUS * comboCount * level;
                comboTimer = 2000;
            }
            comboCount++;
        }

        if (isPerfectClear) {
            points += PERFECT_CLEAR_BONUS;
            perfectClearTimer = 2000;
            createExplosion(canvas.width / 2, canvas.height / 2, '#ffd700', 100);
            triggerShake(15, 500); // Massive shake for All Clear
        } else if (cleared === 4) {
            createExplosion(canvas.width / 2, canvas.height / 2, COLORS.I, 60);
            triggerShake(10, 300); // Strong shake for Tetris
        } else if (cleared > 0) {
            triggerShake(cleared * 2 + 1, 100 + cleared * 50); // Proportional shake for Single/Double/Triple
        }
        score        += points * level;
        linesCleared += cleared;
        const newLevel = zenMode ? 1 : Math.floor(linesCleared / 10) + 1;
        if (newLevel > level) {
            AudioManager.sfx('levelup');
            levelUpTimer = 1500;
        }
        level = newLevel;
        AudioManager.sfx('clear', cleared);
        updateUI();
    } else {
        comboCount = 0;
        AudioManager.sfx('land');
    }
    spawnPiece();
    saveGame();
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
    if (!currentPiece) return null;
    let g = { ...currentPiece };
    while (isValid({ ...g, row: g.row + 1 })) g = { ...g, row: g.row + 1 };
    return g;
}

function draw() {
    drawBoard(ctx, board, currentPiece, cells(ghostPiece()), level, zenMode, showGhost);
    drawNextQueue(nextCtx, nextCanvas, nextQueue);
    drawPreview(holdCtx, holdCanvas, holdType, holdUsed);
    if (levelUpTimer > 0) drawLevelUp(ctx, levelUpTimer);
    if (perfectClearTimer > 0) drawPerfectClear(ctx, perfectClearTimer);
    if (tSpinTimer > 0) drawTSpin(ctx, tSpinTimer, tSpinType);
    if (comboTimer > 0) drawCombo(ctx, comboTimer, comboCount - 1);
    if (b2bTimer > 0) drawB2B(ctx, b2bTimer);
    drawParticles(ctx);
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateUI() {
    updateUIElements(UI_ELEMENTS, { 
        score, 
        highScore, 
        level, 
        linesCleared, 
        musicMuted: AudioManager.musicMuted, 
        sfxMuted: AudioManager.sfxMuted 
    });
    updateFrequentUI();
}

function updateFrequentUI() {
    const pps = gameElapsedTime > 0 ? (piecesSpawnedCount / (gameElapsedTime / 1000)).toFixed(2) : '0.00';
    const kpp = piecesSpawnedCount > 0 ? (keyStrokesCount / piecesSpawnedCount).toFixed(2) : '0.00';
    updateMetrics(UI_ELEMENTS, { pps, kpp });
}

// ─── Game State ───────────────────────────────────────────────────────────────
function startGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved && gameState === 'idle') {
        try {
            loadGame(JSON.parse(saved));
            updateUI();
        } catch (e) {
            console.error("Failed to load save", e);
            initGame();
        }
    } else {
        initGame();
    }
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
    localStorage.removeItem(SAVE_KEY);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem(STORAGE_KEY, highScore);
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

    if (levelUpTimer > 0) levelUpTimer -= delta;
    if (perfectClearTimer > 0) perfectClearTimer -= delta;
    if (tSpinTimer > 0) tSpinTimer -= delta;
    if (comboTimer > 0) comboTimer -= delta;
    if (b2bTimer > 0) b2bTimer -= delta;
    gameElapsedTime += delta;
    updateAnimations(delta, level);
    // Handle DAS/ARR for horizontal movement
    if (activeKeys.left) {
        activeKeys.left.timeHeld += delta;
        if (activeKeys.left.timeHeld >= das && (timestamp - activeKeys.left.lastActionTime) >= Math.max(16, arr)) {
            moveLeft();
            activeKeys.left.lastActionTime = timestamp;
        }
    }
    if (activeKeys.right) {
        activeKeys.right.timeHeld += delta;
        if (activeKeys.right.timeHeld >= das && (timestamp - activeKeys.right.lastActionTime) >= Math.max(16, arr)) {
            moveRight();
            activeKeys.right.lastActionTime = timestamp;
        }
    }

    // Soft drop auto-repeat is handled by the modified dropSpeed

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
        updateFrequentUI();
        draw();
        animId = requestAnimationFrame(loop);
    }
}

// ─── Input ────────────────────────────────────────────────────────────────────
const KEY_MAP = {
    'ArrowLeft':  'left',
    'ArrowRight': 'right',
    'ArrowDown':  'softDrop',
    'ArrowUp':    'rotateCW',
    'KeyZ':       'rotateCCW',
    'KeyC':       'hold',
    'ShiftLeft':  'hold',
    'ShiftRight': 'hold',
    'Space':      'hardDrop',
    'KeyP':       'pause',
    'KeyM':       'mute',
};

document.addEventListener('keydown', e => {
    if (e.repeat) return; // Ignore native key repeat

    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();

    if (action === 'hardDrop') {
        if (gameState === 'idle' || gameState === 'over') startGame();
        else if (gameState === 'playing') hardDrop();
        return;
    }
    if (action === 'pause') {
        if (gameState === 'playing' || gameState === 'paused') pauseGame();
        return;
    }
    if (action === 'mute') {
        const target = !(AudioManager.musicMuted && AudioManager.sfxMuted);
        AudioManager.setMusicMuted(target);
        AudioManager.setSfxMuted(target);
        updateUI();
        return;
    }

    if (gameState !== 'playing') return;

    // Count for KPP (Keys Per Piece)
    if (!['pause', 'mute'].includes(action)) {
        keyStrokesCount++;
    }

    if (action === 'left') {
        moveLeft();
        activeKeys.left = { timeHeld: 0, lastActionTime: performance.now() };
    } else if (action === 'right') {
        moveRight();
        activeKeys.right = { timeHeld: 0, lastActionTime: performance.now() };
    } else if (action === 'softDrop') {
        softDrop();
        activeKeys.softDrop = true;
    } else if (action === 'rotateCW')  rotate(1);
    else if (action === 'rotateCCW') rotate(-1);
    else if (action === 'hold')      holdPiece();
});

document.addEventListener('keyup', e => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    if (action === 'left') delete activeKeys.left;
    else if (action === 'right') delete activeKeys.right;
    else if (action === 'softDrop') delete activeKeys.softDrop;
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
        if (elapsed > 250) holdPiece(); else rotate();
        keyStrokesCount++;
    } else if (adx > ady) {
        if (dx < 0) moveLeft(); else moveRight();
        keyStrokesCount++;
    } else if (dy < 0) {
        hardDrop();   // swipe up → hard drop
        keyStrokesCount++;
    } else {
        softDrop();   // swipe down → soft drop
        keyStrokesCount++;
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

UI_ELEMENTS.musicCheck.addEventListener('change', e => {
    AudioManager.setMusicMuted(!e.target.checked);
    updateUI();
});

UI_ELEMENTS.sfxCheck.addEventListener('change', e => {
    AudioManager.setSfxMuted(!e.target.checked);
    updateUI();
});

UI_ELEMENTS.musicVol.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    AudioManager.setMusicVolume(val);
    localStorage.setItem('tetrisMusicVol', val);
});

UI_ELEMENTS.sfxVol.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    AudioManager.setSfxVolume(val);
    localStorage.setItem('tetrisSfxVol', val);
});

UI_ELEMENTS.dasSlider.addEventListener('input', e => {
    das = parseInt(e.target.value, 10);
    localStorage.setItem(STORAGE_KEY_DAS, das);
});

UI_ELEMENTS.arrSlider.addEventListener('input', e => {
    arr = parseInt(e.target.value, 10);
    localStorage.setItem(STORAGE_KEY_ARR, arr);
});

UI_ELEMENTS.sdrSlider.addEventListener('input', e => {
    sdr = parseInt(e.target.value, 10);
    localStorage.setItem(STORAGE_KEY_SDR, sdr);
});

UI_ELEMENTS.zenCheck.addEventListener('change', e => {
    zenMode = e.target.checked;
    localStorage.setItem(STORAGE_KEY_ZEN, zenMode);
});

UI_ELEMENTS.ghostCheck.addEventListener('change', e => {
    showGhost = e.target.checked;
    localStorage.setItem(STORAGE_KEY_GHOST, showGhost);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
gameState               = 'idle';
score                   = 0;
level                   = 1;
linesCleared            = 0;
levelUpTimer            = 0;
perfectClearTimer       = 0;
tSpinTimer              = 0;
comboCount              = 0;
b2bActive               = false;
comboTimer              = 0;
b2bTimer                = 0;
das                     = parseInt(localStorage.getItem(STORAGE_KEY_DAS) || DEFAULT_DAS, 10);
arr                     = parseInt(localStorage.getItem(STORAGE_KEY_ARR) || DEFAULT_ARR, 10);
sdr                     = parseInt(localStorage.getItem(STORAGE_KEY_SDR) || DEFAULT_SDR, 10);
zenMode                 = localStorage.getItem(STORAGE_KEY_ZEN) === 'true';
const savedGhost        = localStorage.getItem(STORAGE_KEY_GHOST);
showGhost               = savedGhost === null ? true : savedGhost === 'true';
highScore               = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

const savedMusicVol = localStorage.getItem('tetrisMusicVol');
if (savedMusicVol !== null) {
    UI_ELEMENTS.musicVol.value = savedMusicVol;
    AudioManager.setMusicVolume(parseFloat(savedMusicVol));
}
const savedSfxVol = localStorage.getItem('tetrisSfxVol');
if (savedSfxVol !== null) {
    UI_ELEMENTS.sfxVol.value = savedSfxVol;
    AudioManager.setSfxVolume(parseFloat(savedSfxVol));
}

// Set initial slider values
UI_ELEMENTS.dasSlider.value = das;
UI_ELEMENTS.arrSlider.value = arr;
UI_ELEMENTS.sdrSlider.value = sdr;
UI_ELEMENTS.zenCheck.checked = zenMode;
UI_ELEMENTS.ghostCheck.checked = showGhost;

const savedState = localStorage.getItem(SAVE_KEY);
if (savedState) {
    overlayMsg.textContent = 'RESTORED\nPress Space to Resume';
}

updateUI();
ctx.fillStyle           = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
