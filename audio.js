import { BPM } from './constants.js';
const E8  = 60 / BPM / 2;

const FREQ = {
    A4:440.00, B4:493.88, C5:523.25, D5:587.33,
    E5:659.25, F5:698.46, G5:783.99, A5:880.00,
};

const MELODY_A = [
    ['E5',2],['B4',1],['C5',1],['D5',2],['C5',1],['B4',1],
    ['A4',2],['A4',1],['C5',1],['E5',2],['D5',1],['C5',1],
    ['B4',3],['C5',1],['D5',2],['E5',2],
    ['C5',2],['A4',2],['A4',4],
    [null,1],['A4',1],['B4',2],['C5',4],
    ['D5',3],['F5',1],['A5',2],['G5',1],['F5',1],
    ['E5',3],['C5',1],['E5',2],['D5',1],['C5',1],
    ['B4',2],['B4',1],['C5',1],['D5',2],['E5',2],
    ['C5',2],['A4',2],['A4',4],
];

// A second melody variation
const MELODY_B = [
    ['C5',2],['G4',1],['A4',1],['B4',2],['A4',1],['G4',1],
    ['F4',2],['F4',1],['A4',1],['C5',2],['B4',1],['A4',1],
    ['G4',3],['A4',1],['B4',2],['C5',2],
    ['A4',2],['F4',2],['F4',4],
    [null,1],['F4',1],['G4',2],['A4',4],
    ['B4',3],['D5',1],['F5',2],['E5',1],['D5',1],
    ['C5',3],['A4',1],['C5',2],['B4',1],['A4',1],
    ['G4',2],['G4',1],['A4',1],['B4',2],['C5',2],
    ['A4',2],['F4',2],['F4',4],
];

// A third melody variation
const MELODY_C = [
    ['D5',2],['A4',1],['B4',1],['C5',2],['B4',1],['A4',1],
    ['G4',2],['G4',1],['B4',1],['D5',2],['C5',1],['B4',1],
    ['A4',3],['B4',1],['C5',2],['D5',2],
    ['B4',2],['G4',2],['G4',4],
    [null,1],['G4',1],['A4',2],['B4',4],
    ['C5',3],['E5',1],['G5',2],['F5',1],['E5',1],
    ['D5',3],['B4',1],['D5',2],['C5',1],['B4',1],
    ['A4',2],['A4',1],['B4',1],['C5',2],['D5',2],
    ['B4',2],['G4',2],['G4',4],
];

const ALL_MELODIES = [MELODY_A, MELODY_B, MELODY_C];
let currentMelody = null; // Will hold the active melody array

let nextNoteTime = 0;
let noteIndex = 0;
const LOOKAHEAD = 0.1; // How far to schedule (seconds)
const SCHEDULE_INTERVAL = 25; // How often to check (ms)

let actx = null, masterGain = null, musicGain = null, sfxGain = null;
let melodyTimer = null, musicActive = false, musicMuted = false, sfxMuted = false;
let musicVol = 0.12, sfxVol = 1.0;

function setup() {
    actx       = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = actx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(actx.destination);
    musicGain  = actx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(masterGain);
    sfxGain    = actx.createGain();
    sfxGain.gain.value = sfxVol;
    sfxGain.connect(masterGain);
}

function ensureCtx() {
    if (!actx) setup();
    if (actx.state === 'suspended') actx.resume();
}

function scheduler() {
    if (!musicActive) return;

    // If we've fallen behind (e.g. tab backgrounded), sync to current time
    if (nextNoteTime < actx.currentTime) {
        nextNoteTime = actx.currentTime + 0.05;
    }

    // Schedule notes that fall within the lookahead window
    while (nextNoteTime < actx.currentTime + LOOKAHEAD) {
        scheduleNote(currentMelody[noteIndex], nextNoteTime);
        advanceNote();
    }
    melodyTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
}

function scheduleNote(noteData, time) {
    const [note, eighths] = noteData;
    const dur = eighths * E8;

    if (note && FREQ[note]) {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = FREQ[note];
        osc.connect(env);
        env.connect(musicGain);
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(1, time + 0.01);
        env.gain.setValueAtTime(1, time + dur * 0.75);
        env.gain.linearRampToValueAtTime(0, time + dur * 0.92);
        osc.start(time);
        osc.stop(time + dur);
    }
}

function advanceNote() {
    const eighths = currentMelody[noteIndex][1];
    nextNoteTime += eighths * E8;
    noteIndex = (noteIndex + 1) % currentMelody.length;
}

function tone(freq, start, dur, wave = 'sine', vol = 0.15) {
    const osc = actx.createOscillator();
    const g   = actx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(sfxGain);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur);
}

export const AudioManager = {
    startMusic() {
        ensureCtx();
        if (musicActive) return;
        musicActive = true;

        // Randomly select a melody
        const randomIndex = Math.floor(Math.random() * ALL_MELODIES.length);
        currentMelody = ALL_MELODIES[randomIndex];
        noteIndex = 0;
        nextNoteTime = actx.currentTime + 0.05;
        if (!musicMuted) musicGain.gain.setTargetAtTime(musicVol, actx.currentTime, 0.3);
        scheduler();
    },
    pauseMusic() {
        if (!actx) return;
        musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.2);
    },
    resumeMusic() {
        if (!actx || musicMuted) return;
        musicGain.gain.setTargetAtTime(musicVol, actx.currentTime, 0.2);
    },
    stopMusic() {
        musicActive = false;
        clearTimeout(melodyTimer);
        if (actx) musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.15);
    },
    sfx(type, count = 1) {
        ensureCtx();
        if (sfxMuted) return;
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
                [523, 659, 784, 1047].forEach((f, i) => tone(f, now + i * 0.10, 0.15, 'square', 0.12));
                break;
            case 'gameover':
                [440, 415, 392, 370, 349, 330].forEach((f, i) => tone(f, now + i * 0.13, 0.18, 'sawtooth', 0.18));
                break;
        }
    },
    setMusicMuted(val) {
        musicMuted = val;
        if (!actx) return;
        if (musicMuted) this.pauseMusic();
        else if (musicActive) this.resumeMusic();
    },
    setMusicVolume(val) {
        musicVol = val * 0.3; // Scale range [0, 1] to [0, 0.3] for comfortable background level
        if (actx && musicActive && !musicMuted) {
            musicGain.gain.setTargetAtTime(musicVol, actx.currentTime, 0.1);
        }
    },
    setSfxVolume(val) {
        sfxVol = val;
        if (sfxGain) sfxGain.gain.setTargetAtTime(sfxVol, actx.currentTime, 0.1);
    },
    setSfxMuted(val) {
        sfxMuted = val;
    },
    get musicMuted() { return musicMuted; },
    get sfxMuted() { return sfxMuted; }
};