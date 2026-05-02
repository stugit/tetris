import { CELL, PIECES, COLORS, ROWS, COLS } from './constants.js';

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

export function drawBoard(ctx, board, currentPiece, ghostCells) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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
}

export function updateUIElements(elements, state) {
    elements.score.textContent = state.score;
    elements.highScore.textContent = state.highScore;
    elements.level.textContent = state.level;
    elements.lines.textContent = state.linesCleared;

    if (elements.musicCheck) elements.musicCheck.checked = !state.musicMuted;
    if (elements.sfxCheck) elements.sfxCheck.checked = !state.sfxMuted;
}