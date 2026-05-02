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

// ─── Audio ────────────────────────────────────────────────────────────────────
const AudioManager = (() => {
    let actx = null, masterGain = null, musicGain = null;
    let melodyTimer = null, musicActive = false, muted = false;

    const BPM = 160;
    const E8  = 60 / BPM / 2; // seconds per eighth note

    const FREQ = {
        A4:440.00, B4:493.88, C5:523.25, D5:587.33,
        E5:659.25, F5:698.46, G5:783.99, A5:880.00,
    };

    // Tetris Type A (Korobeiniki) — [note_key | null, eighth_note_count]
    const MELODY = [
        // Part A
        ['E5',2],['B4',1],['C5',1],['D5',2],['C5',1],['B4',1],
        ['A4',2],['A4',1],['C5',1],['E5',2],['D5',1],['C5',1],
        ['B4',3],['C5',1],['D5',2],['E5',2],
        ['C5',2],['A4',2],['A4',4],
        // Part B
        [null,1],['A4',1],['B4',2],['C5',4],
        ['D5',3],['F5',1],['A5',2],['G5',1],['F5',1],
        ['E5',3],['C5',1],['E5',2],['D5',1],['C5',1],
        ['B4',2],['B4',1],['C5',1],['D5',2],['E5',2],
        ['C5',2],['A4',2],['A4',4],
    ];
    const MELODY_S = MELODY.reduce((s, [, e]) => s + e * E8, 0);

    function setup() {
        actx       = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = actx.createGain();
        masterGain.gain.value = muted ? 0 : 1;
        masterGain.connect(actx.destination);
        musicGain  = actx.createGain();
        musicGain.gain.value = 0;
        musicGain.connect(masterGain);
    }

    function ensureCtx() {
        if (!actx) setup();
        if (actx.state === 'suspended') actx.resume();
    }

    function scheduleLoop(loopStart) {
        let t = loopStart;
        for (const [note, eighths] of MELODY) {
            const dur = eighths * E8;
            if (note && FREQ[note]) {
                const osc = actx.createOscillator();
                const env = actx.createGain();
                osc.type = 'square';
                osc.frequency.value = FREQ[note];
                osc.connect(env);
                env.connect(musicGain);
                env.gain.setValueAtTime(0, t);
                env.gain.linearRampToValueAtTime(1, t + 0.01);
                env.gain.setValueAtTime(1, t + dur * 0.75);
                env.gain.linearRampToValueAtTime(0, t + dur * 0.92);
                osc.start(t);
                osc.stop(t + dur);
            }
            t += dur;
        }
        melodyTimer = setTimeout(
            () => { if (musicActive) scheduleLoop(loopStart + MELODY_S); },
            (MELODY_S - 0.2) * 1000
        );
    }

    function tone(freq, start, dur, wave = 'sine', vol = 0.15) {
        const osc = actx.createOscillator();
        const g   = actx.createGain();
        osc.type = wave;
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(masterGain);
        g.gain.setValueAtTime(vol, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.start(start);
        osc.stop(start + dur);
    }

    return {
        startMusic() {
            ensureCtx();
            if (musicActive) return;
            musicActive = true;
            musicGain.gain.setTargetAtTime(0.12, actx.currentTime, 0.3);
            scheduleLoop(actx.currentTime + 0.05);
        },
        pauseMusic() {
            if (!actx) return;
            musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.2);
        },
        resumeMusic() {
            if (!actx || muted) return;
            musicGain.gain.setTargetAtTime(0.12, actx.currentTime, 0.2);
        },
        stopMusic() {
            musicActive = false;
            clearTimeout(melodyTimer);
            if (actx) musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.15);
        },
        sfx(type, count = 1) {
            ensureCtx();
            if (muted) return;
            const now = actx.currentTime;
            switch (type) {
                case 'move':    tone(220, now, 0.04, 'sine', 0.08); break;
                case 'rotate':  tone(440, now, 0.06, 'sine', 0.10); break;
                case 'land':    tone(110, now, 0.10, 'sine', 0.12); break;
                case 'clear': {
                    const freqs = [523, 659, 784, 1047, 1319];
                    freqs.slice(0, Math.min(count + 1, 5)).forEach(
                        (f, i) => tone(f, now + i * 0.07, 0.20, 'sine', 0.20)
                    );
                    break;
                }
                case 'levelup':
                    [523, 659, 784, 1047].forEach(
                        (f, i) => tone(f, now + i * 0.10, 0.15, 'square', 0.12)
                    );
                    break;
                case 'gameover':
                    [440, 415, 392, 370, 349, 330].forEach(
                        (f, i) => tone(f, now + i * 0.13, 0.18, 'sawtooth', 0.18)
                    );
                    break;
            }
        },
        toggleMute() {
            muted = !muted;
            ensureCtx();
            masterGain.gain.setTargetAtTime(muted ? 0 : 1, actx.currentTime, 0.1);
            return muted;
        },
        get muted() { return muted; },
    };
})();

// ─── DOM ──────────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('board');
const ctx         = canvas.getContext('2d');
const nextCanvas  = document.getElementById('next');
const nextCtx     = nextCanvas.getContext('2d');
const holdCanvas  = document.getElementById('hold');
const holdCtx     = holdCanvas.getContext('2d');
const overlay     = document.getElementById('overlay');
const overlayMsg  = document.getElementById('overlay-msg');
const scoreEl     = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl     = document.getElementById('level');
const linesEl     = document.getElementById('lines');

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

    // Hold piece preview (dimmed while holdUsed)
    holdCtx.fillStyle = '#16213e';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdType) {
        const hCells = PIECES[holdType][0];
        const hRs = hCells.map(([r]) => r), hCs = hCells.map(([, c]) => c);
        const hH = Math.max(...hRs) - Math.min(...hRs) + 1;
        const hW = Math.max(...hCs) - Math.min(...hCs) + 1;
        const hOR = Math.floor((4 - hH) / 2) - Math.min(...hRs);
        const hOC = Math.floor((4 - hW) / 2) - Math.min(...hCs);
        holdCtx.globalAlpha = holdUsed ? 0.3 : 1;
        hCells.forEach(([r, c]) => {
            const x = (c + hOC) * CELL + 1, y = (r + hOR) * CELL + 1, s = CELL - 2;
            holdCtx.fillStyle = COLORS[holdType];
            holdCtx.fillRect(x, y, s, s);
            holdCtx.fillStyle = 'rgba(255,255,255,0.25)';
            holdCtx.fillRect(x, y, s, 3);
            holdCtx.fillRect(x, y, 3, s);
        });
        holdCtx.globalAlpha = 1;
    }
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
function updateMuteBtn() {
    const btn = document.getElementById('mute-btn');
    if (btn) btn.textContent = AudioManager.muted ? 'SOUND: OFF' : 'SOUND: ON';
}

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
        updateMuteBtn();
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
    updateMuteBtn();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
gameState               = 'idle';
highScore               = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
highScoreEl.textContent = highScore;
ctx.fillStyle           = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
