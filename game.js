'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const CELL = 30;

const COLORS = {
    I: '#00BCD4', O: '#FDD835', T: '#AB47BC',
    S: '#66BB6A', Z: '#EF5350', J: '#42A5F5', L: '#FFA726',
};

// Each rotation state is an array of [row, col] offsets within the 4×4 bounding box
const PIECES = {
    I: [
        [[1,0],[1,1],[1,2],[1,3]],
        [[0,2],[1,2],[2,2],[3,2]],
        [[2,0],[2,1],[2,2],[2,3]],
        [[0,1],[1,1],[2,1],[3,1]],
    ],
    O: [
        [[0,1],[0,2],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[1,2]],
    ],
    T: [
        [[0,1],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[1,2],[2,1]],
        [[0,1],[1,0],[1,1],[2,1]],
    ],
    S: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,1],[1,1],[1,2],[2,2]],
        [[1,1],[1,2],[2,0],[2,1]],
        [[0,0],[1,0],[1,1],[2,1]],
    ],
    Z: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,2],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[2,1],[2,2]],
        [[0,1],[1,0],[1,1],[2,0]],
    ],
    J: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[2,1]],
        [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,0],[2,1]],
    ],
    L: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]],
        [[1,0],[1,1],[1,2],[2,0]],
        [[0,0],[0,1],[1,1],[2,1]],
    ],
};

const PIECE_TYPES = Object.keys(PIECES);
const SCORE_TABLE  = [0, 100, 300, 500, 800];
const BASE_SPEED   = 800;  // ms per gravity drop
const MIN_SPEED    = 100;
const SPEED_STEP   = 50;   // ms reduction per level

// ─── DOM ──────────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('board');
const ctx         = canvas.getContext('2d');
const nextCanvas  = document.getElementById('next');
const nextCtx     = nextCanvas.getContext('2d');
const overlay     = document.getElementById('overlay');
const overlayMsg  = document.getElementById('overlay-msg');
const scoreEl     = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl     = document.getElementById('level');
const linesEl     = document.getElementById('lines');

// ─── State ────────────────────────────────────────────────────────────────────
let board, currentPiece, nextType;
let score, highScore, level, linesCleared;
let gameState;   // 'idle' | 'playing' | 'paused' | 'over'
let dropTimer, lastTime, animId;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const randomType = () => PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];

function cells(piece) {
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
    highScore    = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
    nextType     = randomType();
    spawnPiece();
    updateUI();
}

function spawnPiece() {
    currentPiece = { type: nextType, rotation: 0, row: 0, col: 3 };
    nextType     = randomType();
    if (!isValid(currentPiece)) gameOver();
}

// ─── Movement ─────────────────────────────────────────────────────────────────
function moveLeft() {
    const p = { ...currentPiece, col: currentPiece.col - 1 };
    if (isValid(p)) currentPiece = p;
}

function moveRight() {
    const p = { ...currentPiece, col: currentPiece.col + 1 };
    if (isValid(p)) currentPiece = p;
}

function moveDown() {
    const p = { ...currentPiece, row: currentPiece.row + 1 };
    if (isValid(p)) { currentPiece = p; return true; }
    lockPiece();
    return false;
}

function hardDrop() {
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
        if (isValid(p)) { currentPiece = p; return; }
    }
}

// ─── Locking & Line Clearing ──────────────────────────────────────────────────
function lockPiece() {
    cells(currentPiece).forEach(([r, c]) => { board[r][c] = COLORS[currentPiece.type]; });
    const cleared = clearLines();
    if (cleared > 0) {
        score        += SCORE_TABLE[cleared] * level;
        linesCleared += cleared;
        level         = Math.floor(linesCleared / 10) + 1;
        updateUI();
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

// ─── Drawing ──────────────────────────────────────────────────────────────────
function drawCell(context, r, c, color, alpha = 1) {
    const x = c * CELL + 1, y = r * CELL + 1, s = CELL - 2;
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x, y, s, s);
    // Bevel highlight
    context.fillStyle = 'rgba(255,255,255,0.25)';
    context.fillRect(x, y, s, 3);
    context.fillRect(x, y, 3, s);
    // Bevel shadow
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.fillRect(x, y + s - 3, s, 3);
    context.fillRect(x + s - 3, y, 3, s);
    context.globalAlpha = 1;
}

function draw() {
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);

    // Locked cells
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            if (board[r][c]) drawCell(ctx, r, c, board[r][c]);

    if (currentPiece) {
        // Ghost
        cells(ghostPiece()).forEach(([r, c]) => {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = COLORS[currentPiece.type];
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
            ctx.globalAlpha = 1;
        });
        // Active piece
        cells(currentPiece).forEach(([r, c]) => drawCell(ctx, r, c, COLORS[currentPiece.type]));
    }

    // Next piece preview
    nextCtx.fillStyle = '#16213e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const previewCells = PIECES[nextType][0];
    const rs = previewCells.map(([r]) => r), cs = previewCells.map(([, c]) => c);
    const pH = Math.max(...rs) - Math.min(...rs) + 1;
    const pW = Math.max(...cs) - Math.min(...cs) + 1;
    const offR = Math.floor((4 - pH) / 2) - Math.min(...rs);
    const offC = Math.floor((4 - pW) / 2) - Math.min(...cs);
    previewCells.forEach(([r, c]) => {
        const x = (c + offC) * CELL + 1, y = (r + offR) * CELL + 1, s = CELL - 2;
        nextCtx.fillStyle = COLORS[nextType];
        nextCtx.fillRect(x, y, s, s);
        nextCtx.fillStyle = 'rgba(255,255,255,0.25)';
        nextCtx.fillRect(x, y, s, 3);
        nextCtx.fillRect(x, y, 3, s);
    });
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateUI() {
    scoreEl.textContent     = score;
    highScoreEl.textContent = highScore;
    levelEl.textContent     = level;
    linesEl.textContent     = linesCleared;
}

// ─── Game State ───────────────────────────────────────────────────────────────
function startGame() {
    initGame();
    gameState        = 'playing';
    overlay.style.display = 'none';
    lastTime         = null;
    animId           = requestAnimationFrame(loop);
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        cancelAnimationFrame(animId);
        overlayMsg.textContent = 'PAUSED\nPress P to Resume';
        overlay.style.display  = 'flex';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        overlay.style.display = 'none';
        lastTime = null;
        animId   = requestAnimationFrame(loop);
    }
}

function gameOver() {
    gameState = 'over';
    cancelAnimationFrame(animId);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore);
        highScoreEl.textContent = highScore;
        overlayMsg.textContent  = `NEW BEST!\n${score} pts\nPress Space to Restart`;
    } else {
        overlayMsg.textContent = `GAME OVER\n${score} pts\nPress Space to Restart`;
    }
    overlay.style.display = 'flex';
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
function loop(timestamp) {
    if (gameState !== 'playing') return;
    const delta = lastTime ? timestamp - lastTime : 0;
    lastTime    = timestamp;
    dropTimer  += delta;
    if (dropTimer >= dropSpeed()) {
        moveDown();
        dropTimer = 0;
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
    if (gameState !== 'playing') return;
    switch (e.code) {
        case 'ArrowLeft':  e.preventDefault(); moveLeft();                          break;
        case 'ArrowRight': e.preventDefault(); moveRight();                         break;
        case 'ArrowDown':  e.preventDefault(); if (moveDown()) dropTimer = 0;       break;
        case 'ArrowUp':    e.preventDefault(); rotate();                            break;
        case 'KeyZ':       e.preventDefault(); rotate();                            break;
    }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
gameState               = 'idle';
highScore               = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
highScoreEl.textContent = highScore;
ctx.fillStyle           = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
