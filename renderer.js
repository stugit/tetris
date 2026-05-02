import { CELL, PIECES, COLORS, ROWS, COLS, LEVEL_THEMES } from './constants.js';

export function drawCell(context, r, c, color, alpha = 1) {
    const x = c * CELL + 1, y = r * CELL + 1, s = CELL - 2;
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x, y, s, s);
    context.fillStyle = 'rgba(255,255,255,0.25)';
    context.fillRect(x, y, s, 3);
    context.fillRect(x, y, 3, s);
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.fillRect(x, y + s - 3, s, 3);
    context.fillRect(x + s - 3, y, 3, s);
    context.globalAlpha = 1;
}

export function drawPreview(context, canvasObj, type, isUsed = false) {
    context.fillStyle = '#16213e';
    context.fillRect(0, 0, canvasObj.width, canvasObj.height);
    if (!type) return;

    const previewCells = PIECES[type][0];
    const rs = previewCells.map(([r]) => r), cs = previewCells.map(([, c]) => c);
    const pH = Math.max(...rs) - Math.min(...rs) + 1;
    const pW = Math.max(...cs) - Math.min(...cs) + 1;
    const offR = Math.floor((4 - pH) / 2) - Math.min(...rs);
    const offC = Math.floor((4 - pW) / 2) - Math.min(...cs);

    context.globalAlpha = isUsed ? 0.3 : 1;
    previewCells.forEach(([r, c]) => {
        const x = (c + offC) * CELL + 1, y = (r + offR) * CELL + 1, s = CELL - 2;
        context.fillStyle = COLORS[type];
        context.fillRect(x, y, s, s);
        context.fillStyle = 'rgba(255,255,255,0.25)';
        context.fillRect(x, y, s, 3);
        context.fillRect(x, y, 3, s);
    });
    context.globalAlpha = 1;
}

export function drawNextQueue(context, canvasObj, queue) {
    context.fillStyle = '#16213e';
    context.fillRect(0, 0, canvasObj.width, canvasObj.height);
    if (!queue || queue.length === 0) return;

    queue.forEach((type, index) => {
        const previewCells = PIECES[type][0];
        const rs = previewCells.map(([r]) => r), cs = previewCells.map(([, c]) => c);
        const pH = Math.max(...rs) - Math.min(...rs) + 1;
        const pW = Math.max(...cs) - Math.min(...cs) + 1;

        // Each piece gets a 4-cell high slot (120px)
        const offC = Math.floor((4 - pW) / 2) - Math.min(...cs);
        const baseY = index * 4;
        const offR = baseY + Math.floor((4 - pH) / 2) - Math.min(...rs);

        previewCells.forEach(([r, c]) => {
            const x = (c + offC) * CELL + 1;
            const y = (r + offR) * CELL + 1;
            const s = CELL - 2;
            context.fillStyle = COLORS[type];
            context.fillRect(x, y, s, s);
            context.fillStyle = 'rgba(255,255,255,0.25)';
            context.fillRect(x, y, s, 3);
            context.fillRect(x, y, 3, s);
        });
    });
}

let shakeTimer = 0;
let shakeIntensity = 0;

export function drawBoard(ctx, board, currentPiece, ghostCells, level = 1, zenMode = false) {
    const theme = LEVEL_THEMES[(level - 1) % LEVEL_THEMES.length];

    ctx.save();
    if (shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
    }
    
    ctx.fillStyle = theme.bg;
    ctx.fillRect(-20, -20, ctx.canvas.width + 40, ctx.canvas.height + 40);

    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
            if (board[r][c]) drawCell(ctx, r, c, board[r][c]);
        }
    }

    if (currentPiece) {
        // Draw Ghost
        ghostCells.forEach(([r, c]) => {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = COLORS[currentPiece.type];
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
            ctx.globalAlpha = 1;
        });

        // Draw Active Piece
        PIECES[currentPiece.type][currentPiece.rotation].forEach(([r, c]) => {
            drawCell(ctx, currentPiece.row + r, currentPiece.col + c, COLORS[currentPiece.type]);
        });
    }

    if (zenMode) {
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = '#c084fc';
        ctx.textAlign = 'right';
        ctx.fillText('ZEN', ctx.canvas.width - 8, 18);
    }

    // Draw internal level-based border
    ctx.strokeStyle = zenMode ? '#c084fc' : theme.accent;
    ctx.lineWidth = 4;
    if (zenMode) {
        // Add a glow effect to the border in Zen Mode
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
    }
    ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.restore();
}

export function drawLevelUp(ctx, timer) {
    const opacity = Math.min(1, timer / 500); // Fade out in last 500ms
    ctx.save();
    ctx.fillStyle = `rgba(192, 132, 252, ${opacity * 0.8})`; // Purple theme (#c084fc)
    ctx.font = 'bold 30px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Centered text with shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    
    const x = ctx.canvas.width / 2;
    const y = ctx.canvas.height / 2;
    
    // Subtle scale animation
    const scale = 1 + (1500 - timer) / 3000;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText('LEVEL UP!', 0, 0);
    ctx.restore();
}

export function drawPerfectClear(ctx, timer) {
    const opacity = Math.min(1, timer / 500);
    ctx.save();
    ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`; // Gold color
    ctx.font = 'bold 34px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 10;
    
    const x = ctx.canvas.width / 2;
    const y = ctx.canvas.height / 2 - 50; // Positioned slightly above center
    
    // Pulsing scale animation
    const scale = 1 + Math.sin(timer / 150) * 0.1;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText('PERFECT CLEAR!', 0, 0);
    ctx.restore();
}

export function drawTSpin(ctx, timer, text) {
    const opacity = Math.min(1, timer / 500);
    ctx.save();
    ctx.fillStyle = `rgba(171, 71, 188, ${opacity})`; // T-piece color (#AB47BC)
    ctx.font = 'bold 24px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    
    const x = ctx.canvas.width / 2;
    const y = ctx.canvas.height / 2 + 50; // Positioned slightly below center
    
    const scale = 1 + (2000 - timer) / 4000;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

export function drawCombo(ctx, timer, count) {
    const opacity = Math.min(1, timer / 500);
    ctx.save();
    ctx.fillStyle = `rgba(102, 187, 106, ${opacity})`; // S-piece color (#66BB6A)
    ctx.font = 'bold 20px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = ctx.canvas.width / 2;
    const y = ctx.canvas.height / 2 + 85;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    
    ctx.translate(x, y);
    ctx.fillText(`${count} COMBO`, 0, 0);
    ctx.restore();
}

export function drawB2B(ctx, timer) {
    const opacity = Math.min(1, timer / 500);
    ctx.save();
    ctx.fillStyle = `rgba(239, 83, 80, ${opacity})`; // Z-piece color (#EF5350)
    ctx.font = 'italic bold 18px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = ctx.canvas.width / 2;
    const y = ctx.canvas.height / 2 - 85;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    
    // Slight rocking animation
    const angle = Math.sin(timer / 100) * 0.05;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillText('BACK-TO-BACK', 0, 0);
    ctx.restore();
}

let particles = [];

/**
 * Creates a burst of square particles at a specific location.
 */
export function createExplosion(x, y, color, count = 30) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 5 + 2,
            color,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.015
        });
    }
}

export function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeTimer = duration;
}

export function updateAnimations(delta) {
    if (shakeTimer > 0) shakeTimer -= delta;
    updateParticles(delta);
}

export function updateParticles(delta) {
    // Normalize decay to frame rate (assuming ~60fps)
    const step = delta / 16.67;
    particles = particles.filter(p => {
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.life -= p.decay * step;
        return p.life > 0;
    });
}

export function drawParticles(ctx) {
    ctx.save();
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.restore();
}

export function clearParticles() {
    particles = [];
    shakeTimer = 0;
}

export function updateMetrics(elements, state) {
    if (elements.pps) elements.pps.textContent = state.pps;
    if (elements.kpp) elements.kpp.textContent = state.kpp;
}

export function updateUIElements(elements, state) {
    elements.score.textContent = state.score;
    elements.highScore.textContent = state.highScore;
    elements.level.textContent = state.level;
    elements.lines.textContent = state.linesCleared;

    if (elements.musicCheck) elements.musicCheck.checked = !state.musicMuted;
    if (elements.sfxCheck) elements.sfxCheck.checked = !state.sfxMuted;
}