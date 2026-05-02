import { CELL, PIECES, COLORS, ROWS, COLS, LEVEL_THEMES, BPM, STAR_COUNT } from './constants.js';

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

const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * (COLS * CELL),
    y: Math.random() * (ROWS * CELL),
    size: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.02 + 0.01
}));

export function drawBoard(ctx, board, currentPiece, ghostCells, level = 1, zenMode = false, showGhost = true, lockPending = false, lockTimer = 0) {
    const theme = zenMode 
        ? { bg: '#110b1c', accent: '#c084fc', grid: 'rgba(192, 132, 252, 0.08)' }
        : LEVEL_THEMES[(level - 1) % LEVEL_THEMES.length];

    const freq = (2 * Math.PI * BPM) / 60000;
    const pulse = 0.7 + Math.sin(totalTime * freq) * 0.3;

    // Local helper to draw the "physical" game content (grid + pieces)
    const drawGameContent = (targetCtx, offset = 0) => {
        targetCtx.save();
        if (offset !== 0) targetCtx.translate(offset, 0);
        
        targetCtx.strokeStyle = theme.grid;
        targetCtx.lineWidth = 1;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                targetCtx.strokeRect(c * CELL, r * CELL, CELL, CELL);
                if (board[r][c]) drawCell(targetCtx, r, c, board[r][c]);
            }
        }

        if (currentPiece) {
            if (showGhost && ghostCells) {
                ghostCells.forEach(([r, c]) => {
                    drawCell(targetCtx, r, c, COLORS[currentPiece.type], 0.2);
                });
            }
            PIECES[currentPiece.type][currentPiece.rotation].forEach(([r, c]) => {
                drawCell(targetCtx, currentPiece.row + r, currentPiece.col + c, COLORS[currentPiece.type]);
            });

            if (lockPending) {
                const flashAlpha = Math.sin(lockTimer * 0.03) * 0.3 + 0.3;
                PIECES[currentPiece.type][currentPiece.rotation].forEach(([r, c]) => {
                    drawCell(targetCtx, currentPiece.row + r, currentPiece.col + c, '#ffffff', flashAlpha);
                });
            }
        }
        targetCtx.restore();
    };

    ctx.save();
    if (shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
    }
    
    ctx.fillStyle = theme.bg;
    ctx.fillRect(-20, -20, ctx.canvas.width + 40, ctx.canvas.height + 40);

    // Nebula clouds
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    
    // Drifting radial gradients to create nebula effect based on level theme
    const x1 = w * 0.2 + Math.cos(totalTime * 0.0003) * 60;
    const y1 = h * 0.3 + Math.sin(totalTime * 0.0005) * 80;
    const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, w * 0.8);
    g1.addColorStop(0, theme.accent + '44'); // Subtle 8-digit hex transparency
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    const x2 = w * 0.8 + Math.sin(totalTime * 0.0004) * 70;
    const y2 = h * 0.7 + Math.cos(totalTime * 0.0002) * 50;
    const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, w * 0.7);
    g2.addColorStop(0, theme.accent + '33');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.restore();

    // Draw Starfield
    ctx.fillStyle = '#ffffff';
    stars.forEach(s => {
        // parralax effect: faster stars are brighter/closer
        ctx.globalAlpha = s.speed * 30 * (zenMode ? pulse : 1);
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;

    // Apply chromatic aberration if shaking
    if (shakeTimer > 0) {
        const amt = shakeIntensity * 0.3; // Shift amount
        ctx.save();
        // Using 'screen' blending to create the color-bleed look
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5;
        drawGameContent(ctx, -amt); // Shift Left (simulating Cyan/Blue)
        drawGameContent(ctx, amt);  // Shift Right (simulating Red)
        ctx.restore();
    }

    // Draw the main game content (center/normal)
    drawGameContent(ctx, 0);

    if (zenMode) {
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = `rgba(192, 132, 252, ${pulse})`;
        ctx.textAlign = 'right';
        ctx.fillText('ZEN MODE', ctx.canvas.width - 8, 24);
    }

    // Draw internal level-based border
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 4;
    if (zenMode) {
        const glowPulse = 8 + Math.sin(totalTime * freq) * 6;
        // Add a glow effect to the border in Zen Mode
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = glowPulse;
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
let totalTime = 0;

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
            decay: Math.random() * 0.02 + 0.015,
            history: []
        });
    }
}

export function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeTimer = duration;
}

export function updateAnimations(delta, level = 1) {
    totalTime += delta;
    if (shakeTimer > 0) shakeTimer -= delta;
    updateParticles(delta);

    // Update Starfield
    const speedMult = 1 + (level - 1) * 0.2;
    stars.forEach(s => {
        s.y += s.speed * delta * speedMult;
        if (s.y > ROWS * CELL) s.y -= ROWS * CELL;
    });
}

export function updateParticles(delta) {
    // Normalize decay to frame rate (assuming ~60fps)
    const step = delta / 16.67;
    particles = particles.filter(p => {
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 6) p.history.shift();
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.life -= p.decay * step;
        return p.life > 0;
    });
}

export function drawParticles(ctx) {
    ctx.save();
    const freq = (2 * Math.PI * BPM) / 60000;
    const pulse = 1 + Math.sin(totalTime * freq) * 0.3;
    particles.forEach(p => {
        // Draw trail segments
        p.history.forEach((pos, i) => {
            const ratio = i / p.history.length;
            ctx.globalAlpha = p.life * ratio * 0.4;
            ctx.fillStyle = p.color;
            const s = p.size * pulse * ratio;
            ctx.fillRect(pos.x - s / 2, pos.y - s / 2, s, s);
        });

        // Draw main particle
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        const s = p.size * pulse;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    });
    ctx.restore();
}

export function clearParticles() {
    particles = [];
    shakeTimer = 0;
    totalTime = 0;
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