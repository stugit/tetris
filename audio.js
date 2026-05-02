import { BPM } from './constants.js';
const E8 = 60 / BPM / 2;   // eighth-note duration in seconds

// ─── Frequency table (octaves 3–5) ────────────────────────────────────────────
const FREQ = {
    // Bass register
    E3: 164.81, F3: 174.61, 'F#3': 185.00, G3: 196.00, A3: 220.00, B3: 246.94,
    // Mid register
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, 'F#4': 369.99,
    G4: 392.00, 'G#4': 415.30, A4: 440.00, B4: 493.88,
    // Upper register
    C5: 523.25, D5: 587.33, E5: 659.25,
    F5: 698.46, 'F#5': 739.99, G5: 783.99, A5: 880.00, B5: 987.77,
};

// ─── Theme A: Korobeiniki (GB Tetris Type A, A minor) ─────────────────────────
// Tuple: [melody_note, eighths, bass_note?]  bass_note only on chord changes
const THEME_A = [
    ['E5',2,'A3'],['B4',1],   ['C5',1],   ['D5',2],   ['C5',1],['B4',1],
    ['A4',2],     ['A4',1],   ['C5',1],   ['E5',2],   ['D5',1],['C5',1],
    ['B4',3,'G3'],['C5',1],   ['D5',2,'E3'],['E5',2],
    ['C5',2,'A3'],['A4',2],   ['A4',4],
    [null,1],     ['A4',1],   ['B4',2],   ['C5',4],
    ['D5',3,'F3'],['F5',1],   ['A5',2,'G3'],['G5',1],['F5',1],
    ['E5',3,'A3'],['C5',1],   ['E5',2,'E3'],['D5',1],['C5',1],
    ['B4',2],     ['B4',1],   ['C5',1,'A3'],['D5',2],['E5',2],
    ['C5',2],     ['A4',2],   ['A4',4],
];

// ─── Theme B: GB Tetris Type B (E minor → G major) ────────────────────────────
const THEME_B = [
    // Phrase A – E minor, running eighths
    ['E5',1,'E3'],['D5',1],   ['C5',1],   ['B4',1],
    ['A4',1,'A3'],['G4',1],   ['A4',1],   ['B4',1],
    ['C5',1,'C4'],['D5',1],   ['E5',1],   ['F#5',1],
    ['G5',2,'G3'],['E5',2],
    ['F#5',1,'B3'],['E5',1],  ['D5',1],   ['C5',1],
    ['B4',1,'E3'], ['A4',1],  ['B4',1],   ['C5',1],
    ['D5',2,'G3'], ['B4',2],  ['G4',4],

    ['E5',1,'E3'],['D5',1],   ['C5',1],   ['B4',1],
    ['A4',1,'A3'],['G4',1],   ['A4',1],   ['B4',1],
    ['C5',1,'C4'],['D5',1],   ['E5',1],   ['F#5',1],
    ['G5',2,'G3'],['B5',2],
    ['A5',1,'A3'],['G5',1],   ['F#5',1],  ['E5',1],
    ['D5',1,'D4'],['C5',1],   ['B4',1],   ['A4',1],
    ['G4',4,'E3'],['E4',4],

    // Phrase B – G major
    ['G4',2,'G3'],['B4',2],   ['D5',2],   ['G5',2],
    ['F#5',2,'D4'],['E5',2],  ['D5',2],   ['C5',2],
    ['B4',1,'G3'],['C5',1],   ['D5',1],   ['E5',1],
    ['F#5',2,'D4'],['D5',2],
    ['G5',4,'G3'],['G4',4],

    ['G4',2,'G3'],['B4',2],   ['D5',2],   ['G5',2],
    ['A5',2,'A3'],['G5',2],   ['F#5',2],  ['E5',2],
    ['D5',1,'B3'],['E5',1],   ['D5',1],   ['C5',1],
    ['B4',1,'E3'],['A4',1],   ['G4',1],   ['F#4',1],
    ['E4',4],     ['E4',4],
];

// ─── Theme C: Bach Menuet BWV 814 arr. (A minor waltz) ────────────────────────
// Quarter note = 3 eighth units → ≈ 107 BPM feel (noticeably slower than A/B)
const THEME_C = [
    ['A4',3,'A3'],['C5',3],   ['E5',3],
    ['A5',3,'F3'],['G5',3],   ['F5',3],
    ['E5',3,'E3'],['D5',3],   ['C5',3],
    ['B4',6,'G3'],['A4',3],

    ['G4',3,'G3'],['B4',3],   ['D5',3],
    ['G5',3,'D4'],['F5',3],   ['E5',3],
    ['D5',3,'A3'],['C5',3],   ['B4',3],
    ['A4',9],

    ['C5',3,'C4'],['E5',3],   ['A5',3],
    ['G5',3,'G3'],['E5',3],   ['C5',3],
    ['F5',3,'F3'],['D5',3],   ['B4',3],
    ['E5',9,'E3'],

    ['E5',3,'A3'],['D5',3],   ['C5',3],
    ['B4',3,'E3'],['A4',3],   ['G#4',3],
    ['A4',6,'A3'],['B4',3],
    ['A4',9],
];

const LONG_MELODY = [...THEME_A, ...THEME_A, ...THEME_B, ...THEME_A, ...THEME_C];
let currentMelody = LONG_MELODY;

let nextNoteTime = 0;
let noteIndex    = 0;
let lastBassNote = null;
const LOOKAHEAD         = 0.3;
const SCHEDULE_INTERVAL = 25;

let actx = null, masterGain = null, musicGain = null, sfxGain = null;
let musicDry = null, reverbNode = null, reverbWet = null;
let melodyTimer     = null;
let musicActive     = false;
let musicShouldPlay = false;
let musicMuted = false, sfxMuted = false;
let musicVol = 0.12, sfxVol = 1.0;

// ─── Reverb: stereo convolution, 2 s tail, 20 ms pre-delay ───────────────────
function buildReverb() {
    const conv     = actx.createConvolver();
    const srate    = actx.sampleRate;
    const len      = Math.floor(srate * 2.0);
    const predelay = Math.floor(srate * 0.020);
    const buf      = actx.createBuffer(2, len, srate);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) {
            if (i < predelay) { d[i] = 0; continue; }
            const t = (i - predelay) / (len - predelay);
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.0) * (c === 0 ? 1.0 : 0.96);
        }
    }
    conv.buffer = buf;
    return conv;
}

// ─── Audio graph ──────────────────────────────────────────────────────────────
function setup() {
    actx = new (window.AudioContext || window.webkitAudioContext)();

    // Master compressor → destination (glues the mix, prevents clipping)
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value      =  10;
    comp.ratio.value     =   4;
    comp.attack.value    = 0.003;
    comp.release.value   = 0.25;
    comp.connect(actx.destination);

    masterGain = actx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(comp);

    musicGain = actx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(masterGain);

    // 65 % dry / 35 % reverb
    musicDry = actx.createGain();
    musicDry.gain.value = 0.65;
    musicDry.connect(musicGain);

    reverbNode = buildReverb();
    reverbWet  = actx.createGain();
    reverbWet.gain.value = 0.35;
    reverbNode.connect(reverbWet);
    reverbWet.connect(musicGain);

    sfxGain = actx.createGain();
    sfxGain.gain.value = sfxVol;
    sfxGain.connect(masterGain);
}

function ensureCtx() {
    if (!actx) setup();
    if (actx.state === 'suspended') actx.resume();
}

// ─── Bass note (sine, long sustain, dry only) ─────────────────────────────────
function scheduleBass(note, time) {
    const freq = FREQ[note];
    const osc  = actx.createOscillator();
    const env  = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(env);
    env.connect(musicDry);

    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.30, time + 0.020);
    env.gain.setTargetAtTime(0.18,         time + 0.020, 0.12);
    env.gain.setTargetAtTime(0.001,        time + 1.0,   0.18);

    osc.start(time);
    osc.stop(time + 1.6);
}

// ─── Melody note: triangle chorus + lowpass filter + vibrato + sub ────────────
function scheduleNote(noteData, time) {
    const [note, eighths, bassNote] = noteData;
    const dur = eighths * E8;

    // Bass: only retrigger when chord root changes
    if (bassNote && FREQ[bassNote] && bassNote !== lastBassNote) {
        lastBassNote = bassNote;
        scheduleBass(bassNote, time);
    }

    if (!note || !FREQ[note]) return;
    const freq = FREQ[note];

    // Two triangle oscillators detuned ~10 cents (chorus warmth)
    const osc1 = actx.createOscillator();
    const osc2 = actx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq,         time);
    osc2.frequency.setValueAtTime(freq * 1.006, time + 0.001); // tiny offset → phasing

    // Vibrato LFO (only for notes ≥ 3 eighth units; kicks in after attack)
    if (eighths >= 3) {
        const lfo     = actx.createOscillator();
        const lfoGain = actx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(5.5, time);
        lfoGain.gain.setValueAtTime(0, time);
        lfoGain.gain.setTargetAtTime(freq * 0.004, time + 0.10, 0.04);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
        lfo.start(time);
        lfo.stop(time + dur + 0.05);
    }

    const env = actx.createGain();
    osc1.connect(env);
    osc2.connect(env);

    // Low-pass filter removes harshness; Q adds slight warmth resonance
    const lpf = actx.createBiquadFilter();
    lpf.type            = 'lowpass';
    lpf.frequency.value = 3800;
    lpf.Q.value         = 0.9;
    env.connect(lpf);

    // Sub-oscillator one octave below (body/warmth, dry only)
    const sub    = actx.createOscillator();
    const subEnv = actx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(freq * 0.5, time);
    sub.connect(subEnv);

    // Main ADSR
    const peak = 0.28;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak,       time + 0.007);
    env.gain.setTargetAtTime(peak * 0.65,        time + 0.007, 0.055);
    env.gain.setTargetAtTime(0.001, time + dur * 0.78, 0.038);

    // Sub envelope (punchy, fades faster than melody)
    subEnv.gain.setValueAtTime(0, time);
    subEnv.gain.linearRampToValueAtTime(0.12,   time + 0.010);
    subEnv.gain.setTargetAtTime(0.001, time + dur * 0.52, 0.048);

    // Filtered melody → dry path + reverb send; sub → dry only
    lpf.connect(musicDry);
    lpf.connect(reverbNode);
    subEnv.connect(musicDry);

    const stop = time + dur + 0.15;
    osc1.start(time);       osc1.stop(stop);
    osc2.start(time);       osc2.stop(stop);
    sub.start(time);        sub.stop(stop);
}

function advanceNote() {
    nextNoteTime += currentMelody[noteIndex][1] * E8;
    noteIndex = (noteIndex + 1) % currentMelody.length;
}

function scheduler() {
    if (!musicActive) return;
    while (nextNoteTime < actx.currentTime + LOOKAHEAD) {
        if (nextNoteTime > actx.currentTime - 0.05) {
            scheduleNote(currentMelody[noteIndex], nextNoteTime);
        }
        advanceNote();
    }
    melodyTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
}

// ─── SFX helper ───────────────────────────────────────────────────────────────
function tone(freq, start, dur, wave = 'sine', vol = 0.15) {
    const osc = actx.createOscillator();
    const g   = actx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(g);
    g.connect(sfxGain);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const AudioManager = {
    startMusic() {
        ensureCtx();
        if (musicActive) return;
        musicShouldPlay = true;
        this.startMusicInternal(true);
    },
    pauseMusic() {
        if (musicActive) {
            musicActive = false;
            clearTimeout(melodyTimer);
        }
    },
    resumeMusic() {
        if (!actx || musicActive || !musicShouldPlay || musicMuted || !currentMelody) return;
        this.startMusicInternal(false);
    },
    stopMusic() {
        musicActive     = false;
        musicShouldPlay = false;
        clearTimeout(melodyTimer);
        if (actx) musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.15);
    },
    startMusicInternal(resetIndex = false) {
        if (resetIndex) { noteIndex = 0; lastBassNote = null; }
        musicActive  = true;
        nextNoteTime = actx.currentTime + 0.05;
        if (!musicMuted) musicGain.gain.setTargetAtTime(musicVol, actx.currentTime, 0.1);
        scheduler();
    },
    sfx(type, count = 1) {
        ensureCtx();
        if (sfxMuted) return;
        const now = actx.currentTime;
        switch (type) {
            case 'move':     tone(220, now, 0.04, 'sine',     0.08); break;
            case 'rotate':   tone(440, now, 0.06, 'sine',     0.10); break;
            case 'harddrop': tone(80,  now, 0.12, 'sine',     0.40); break;
            case 'land':     tone(110, now, 0.10, 'sine',     0.12); break;
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
        if (musicMuted) {
            musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.1);
        } else {
            if (musicShouldPlay && !musicActive) this.startMusicInternal(false);
            else if (musicShouldPlay && musicActive) musicGain.gain.setTargetAtTime(musicVol, actx.currentTime, 0.1);
        }
    },
    setMusicVolume(val) {
        musicVol = val * 0.3;
        if (actx && musicActive && !musicMuted) {
            musicGain.gain.setTargetAtTime(musicVol, actx.currentTime, 0.1);
        }
    },
    setSfxVolume(val) {
        sfxVol = val;
        if (sfxGain) sfxGain.gain.setTargetAtTime(sfxVol, actx.currentTime, 0.1);
    },
    setSfxMuted(val) { sfxMuted = val; },
    get musicMuted() { return musicMuted; },
    get sfxMuted()   { return sfxMuted; },
};
