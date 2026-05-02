const BPM = 160;
const E8  = 60 / BPM / 2;

const FREQ = {
    A4:440.00, B4:493.88, C5:523.25, D5:587.33,
    E5:659.25, F5:698.46, G5:783.99, A5:880.00,
};

const MELODY = [
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

const MELODY_S = MELODY.reduce((s, [, e]) => s + e * E8, 0);

let actx = null, masterGain = null, musicGain = null;
let melodyTimer = null, musicActive = false, musicMuted = false, sfxMuted = false;

function setup() {
    actx       = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = actx.createGain();
    masterGain.gain.value = 1;
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

export const AudioManager = {
    startMusic() {
        ensureCtx();
        if (musicActive) return;
        musicActive = true;
        if (!musicMuted) musicGain.gain.setTargetAtTime(0.12, actx.currentTime, 0.3);
        scheduleLoop(actx.currentTime + 0.05);
    },
    pauseMusic() {
        if (!actx) return;
        musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.2);
    },
    resumeMusic() {
        if (!actx || musicMuted) return;
        musicGain.gain.setTargetAtTime(0.12, actx.currentTime, 0.2);
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
    setSfxMuted(val) {
        sfxMuted = val;
    },
    get musicMuted() { return musicMuted; },
    get sfxMuted() { return sfxMuted; }
};