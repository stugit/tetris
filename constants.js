export const COLS = 10;
export const ROWS = 20;
export const CELL = 30;
export const BPM = 160;

export const COLORS = {
    I: '#00BCD4', O: '#FDD835', T: '#AB47BC',
    S: '#66BB6A', Z: '#EF5350', J: '#42A5F5', L: '#FFA726',
};

export const PIECES = {
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

export const PIECE_TYPES = Object.keys(PIECES);
export const SCORE_TABLE  = [0, 100, 300, 500, 800];
export const TSPIN_SCORES = [400, 800, 1200, 1600]; // 0, 1, 2, 3 lines
export const TSPIN_MINI_SCORES = [100, 200, 400];   // 0, 1, 2 lines
export const COMBO_BONUS  = 50;
export const B2B_MULTIPLIER = 1.5;
export const BASE_SPEED   = 800;
export const MIN_SPEED    = 100;
export const SPEED_STEP   = 50;

export const STORAGE_KEY = 'tetrisHighScore';
export const PERFECT_CLEAR_BONUS = 3000;
export const SAVE_KEY = 'tetrisSaveState';

export const DEFAULT_DAS = 150; // ms - Delayed Auto-Shift
export const DEFAULT_ARR = 30;  // ms - Auto-Repeat Rate
export const DEFAULT_SDR = 20;  // multiplier for soft drop speed
export const STORAGE_KEY_DAS = 'tetrisDAS';
export const STORAGE_KEY_ARR = 'tetrisARR';
export const STORAGE_KEY_SDR = 'tetrisSDR';
export const STORAGE_KEY_ZEN = 'tetrisZenMode';
export const STORAGE_KEY_GHOST = 'tetrisShowGhost';

export const SRS_KICKS = {
    '0-1': [[0, 0], [-1, 0], [-1, -1], [ 0,  2], [-1,  2]],
    '1-0': [[0, 0], [ 1, 0], [ 1,  1], [ 0, -2], [ 1, -2]],
    '1-2': [[0, 0], [ 1, 0], [ 1,  1], [ 0, -2], [ 1, -2]],
    '2-1': [[0, 0], [-1, 0], [-1, -1], [ 0,  2], [-1,  2]],
    '2-3': [[0, 0], [ 1, 0], [ 1, -1], [ 0,  2], [ 1, -2]],
    '3-2': [[0, 0], [-1, 0], [-1,  1], [ 0, -2], [-1,  2]],
    '3-0': [[0, 0], [-1, 0], [-1,  1], [ 0, -2], [-1,  2]],
    '0-3': [[0, 0], [ 1, 0], [ 1, -1], [ 0,  2], [ 1, -2]]
};

export const SRS_KICKS_I = {
    '0-1': [[0, 0], [-2, 0], [ 1, 0], [-2,  1], [ 1, -2]],
    '1-0': [[0, 0], [ 2, 0], [-1, 0], [ 2, -1], [-1,  2]],
    '1-2': [[0, 0], [-1, 0], [ 2, 0], [-1, -2], [ 2,  1]],
    '2-1': [[0, 0], [ 1, 0], [-2, 0], [ 1,  2], [-2, -1]],
    '2-3': [[0, 0], [ 2, 0], [-1, 0], [ 2, -1], [-1,  2]],
    '3-2': [[0, 0], [-2, 0], [ 1, 0], [-2,  1], [ 1, -2]],
    '3-0': [[0, 0], [ 1, 0], [-2, 0], [ 1,  2], [-2, -1]],
    '0-3': [[0, 0], [-1, 0], [ 2, 0], [-1, -2], [ 2,  1]]
};

export const LEVEL_THEMES = [
    { bg: '#1a1a2e', accent: '#3b3b5c', grid: 'rgba(255, 255, 255, 0.04)' }, // Purple/Default
    { bg: '#1c0b0b', accent: '#5c3b3b', grid: 'rgba(255, 100, 100, 0.06)' }, // Deep Red
    { bg: '#0b1c0b', accent: '#3b5c3b', grid: 'rgba(100, 255, 100, 0.06)' }, // Forest Green
    { bg: '#0b1c1c', accent: '#3b5c5c', grid: 'rgba(100, 255, 255, 0.06)' }, // Teal
    { bg: '#1c1c0b', accent: '#5c5c3b', grid: 'rgba(255, 255, 100, 0.06)' }, // Amber
    { bg: '#110b1c', accent: '#443b5c', grid: 'rgba(200, 100, 255, 0.06)' }  // Indigo
];

export const STAR_COUNT = 100;