// Amp Models - Simulations of iconic guitar amplifiers
import { getAudioContext } from './audioEngine.js';

// Amp model definitions
export const AMP_MODELS = [
    {
        id: 'fender_twin',
        name: 'Fender Twin Clean',
        description: 'Warm, sparkly clean tone',
        category: 'clean',
        icon: '🎸',
        color: '#f5e6c8',
        defaults: { gain: 30, bass: 5, mid: 5, treble: 6, presence: 5, master: 70 }
    },
    {
        id: 'vox_ac30',
        name: 'Vox AC30',
        description: 'Chimey British crunch',
        category: 'crunch',
        icon: '🇬🇧',
        color: '#cc9966',
        defaults: { gain: 55, bass: 5, mid: 7, treble: 7, presence: 6, master: 65 }
    },
    {
        id: 'marshall_plexi',
        name: 'Marshall Plexi 1959',
        description: 'Classic rock crunch',
        category: 'crunch',
        icon: '🤘',
        color: '#d4af37',
        defaults: { gain: 60, bass: 6, mid: 8, treble: 7, presence: 6, master: 70 }
    },
    {
        id: 'marshall_jcm800',
        name: 'Marshall JCM800',
        description: 'British high gain',
        category: 'highgain',
        icon: '⚡',
        color: '#d4af37',
        defaults: { gain: 75, bass: 6, mid: 7, treble: 7, presence: 7, master: 65 }
    },
    {
        id: 'peavey_6505',
        name: 'Peavey 6505+',
        description: 'Aggressive modern distortion',
        category: 'highgain',
        icon: '💀',
        color: '#333333',
        defaults: { gain: 80, bass: 7, mid: 5, treble: 7, presence: 6, master: 60 }
    },
    {
        id: 'evh_5150',
        name: 'EVH 5150 III',
        description: 'Tight, punchy high gain',
        category: 'highgain',
        icon: '🎯',
        color: '#cc0000',
        defaults: { gain: 78, bass: 6, mid: 6, treble: 8, presence: 7, master: 60 }
    },
    {
        id: 'soldano_slo',
        name: 'Soldano SLO-100',
        description: 'Smooth, creamy lead overdrive',
        category: 'highgain',
        icon: '🔥',
        color: '#8b0000',
        defaults: { gain: 70, bass: 5, mid: 7, treble: 6, presence: 6, master: 65 }
    },
    {
        id: 'mesa_rectifier',
        name: 'Mesa Dual Rectifier',
        description: 'Heavy, thick saturation',
        category: 'highgain',
        icon: '💥',
        color: '#1a1a2e',
        defaults: { gain: 85, bass: 8, mid: 5, treble: 6, presence: 5, master: 55 }
    }
];

// Channel definitions
export const AMP_CHANNELS = [
    { id: 'clean', name: 'Clean', color: '#44ff88' },
    { id: 'crunch', name: 'Crunch', color: '#ffaa44' },
    { id: 'highgain', name: 'High Gain', color: '#ff4444' }
];

// Generate amp-specific distortion curves
function makeAmpCurve(amount, model) {
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;

        switch (model) {
            case 'fender_twin':
                // Soft, warm clipping
                curve[i] = Math.tanh(x * (amount / 30));
                break;
            case 'vox_ac30':
                // Asymmetric clipping for chimey tone
                curve[i] = x > 0
                    ? Math.tanh(x * (amount / 25))
                    : Math.tanh(x * (amount / 35)) * 0.9;
                break;
            case 'marshall_plexi':
                // Classic tube-like saturation
                curve[i] = (Math.PI / 4) * Math.tanh(x * (amount / 20)) +
                    0.1 * Math.sin(x * amount / 20);
                break;
            case 'marshall_jcm800': {
                // Harder clipping with more harmonics
                const k = amount / 12;
                curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x * k)));
                break;
            }
            case 'peavey_6505': {
                // Very aggressive, tight clipping
                const drive = amount / 10;
                curve[i] = Math.tanh(x * drive) * 0.8 +
                    0.2 * Math.sign(x) * Math.pow(Math.abs(Math.tanh(x * drive)), 0.5);
                break;
            }
            case 'evh_5150': {
                // Punchy with tight low end
                const g = amount / 14;
                curve[i] = Math.tanh(x * g) * (1 + 0.1 * Math.sin(x * g * Math.PI));
                break;
            }
            case 'soldano_slo':
                // Smooth, creamy overdrive
                curve[i] = (2 / Math.PI) * Math.atan(x * (amount / 18)) *
                    (1 + 0.05 * Math.cos(x * Math.PI * 2));
                break;
            case 'mesa_rectifier': {
                // Heavy, thick saturation
                const gr = amount / 8;
                curve[i] = Math.tanh(x * gr) * 0.7 +
                    0.3 * Math.sign(x) * (1 - Math.exp(-Math.abs(x * gr * 2)));
                break;
            }
            default:
                curve[i] = Math.tanh(x * (amount / 15));
        }
    }
    return curve;
}

// Create amp instance
export function createAmp(modelId = 'marshall_jcm800', params = {}) {
    const ctx = getAudioContext();
    const model = AMP_MODELS.find(m => m.id === modelId) || AMP_MODELS[3];

    const input = ctx.createGain();
    const output = ctx.createGain();

    // Pre-gain
    const preGain = ctx.createGain();
    // Tightness filter (Tube Screamer style low cut before distortion)
    const tightFilter = ctx.createBiquadFilter();
    tightFilter.type = 'highpass';
    tightFilter.frequency.value = 250; // Classic tightening freq
    tightFilter.Q.value = 0.7;

    const gain = params.gain ?? model.defaults.gain;

    // Gain Staging per Category
    let gainMult = 0.20; // Default crunch
    if (model.category === 'clean') gainMult = 0.05; // Low gain for headroom
    else if (model.category === 'highgain') gainMult = 0.60; // Extreme gain for metal

    // Pre-gain: map 0-100 to appropriate gain level
    preGain.gain.value = 1 + (gain * gainMult);

    // Waveshaper for amp distortion character
    const waveshaper = ctx.createWaveShaper();
    waveshaper.curve = makeAmpCurve(gain, modelId);
    waveshaper.oversample = '4x';

    // Tone stack (3-band EQ)
    const bassFilter = ctx.createBiquadFilter();
    const midFilter = ctx.createBiquadFilter();
    const trebleFilter = ctx.createBiquadFilter();
    const presenceFilter = ctx.createBiquadFilter();

    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 250;
    bassFilter.gain.value = ((params.bass ?? model.defaults.bass) - 5) * 3;

    midFilter.type = 'peaking';
    midFilter.frequency.value = 800;
    midFilter.Q.value = 1.5;
    midFilter.gain.value = ((params.mid ?? model.defaults.mid) - 5) * 3;

    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 3500;
    trebleFilter.gain.value = ((params.treble ?? model.defaults.treble) - 5) * 3;

    presenceFilter.type = 'highshelf';
    presenceFilter.frequency.value = 5000;
    presenceFilter.gain.value = ((params.presence ?? model.defaults.presence) - 5) * 2;

    // Master volume - adjusted for consistency
    const masterGain = ctx.createGain();
    // Clean amps need more volume because they have less compression/gain
    const masterMult = model.category === 'clean' ? 1.5 : 0.8;
    masterGain.gain.value = (params.master ?? model.defaults.master) / 80 * masterMult;

    // Output limiter to prevent clipping
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 6;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    // Signal chain
    input.connect(tightFilter);

    // Bypass tight filter for clean/crunch amps to keep body
    if (model.category === 'clean' || model.category === 'crunch') {
        tightFilter.frequency.value = 60; // Just rumble filter
    }

    tightFilter.connect(preGain);
    preGain.connect(waveshaper);
    waveshaper.connect(bassFilter);
    bassFilter.connect(midFilter);
    midFilter.connect(trebleFilter);
    trebleFilter.connect(presenceFilter);
    presenceFilter.connect(masterGain);
    masterGain.connect(limiter);
    limiter.connect(output);

    return {
        inputNode: input,
        outputNode: output,
        modelId,
        model,
        params: {
            gain: { value: gain, min: 0, max: 100, label: 'Gain' },
            bass: { value: params.bass ?? model.defaults.bass, min: 0, max: 10, label: 'Bass' },
            mid: { value: params.mid ?? model.defaults.mid, min: 0, max: 10, label: 'Mid' },
            treble: { value: params.treble ?? model.defaults.treble, min: 0, max: 10, label: 'Treble' },
            presence: { value: params.presence ?? model.defaults.presence, min: 0, max: 10, label: 'Presence' },
            master: { value: params.master ?? model.defaults.master, min: 0, max: 100, label: 'Master' }
        },
        update(p) {
            if (p.gain !== undefined) {
                // Update pre-gain with category scaling
                preGain.gain.setTargetAtTime(1 + (p.gain * gainMult), ctx.currentTime, 0.01);
                waveshaper.curve = makeAmpCurve(p.gain, modelId);
                this.params.gain.value = p.gain;
            }
            if (p.bass !== undefined) {
                bassFilter.gain.setTargetAtTime((p.bass - 5) * 3, ctx.currentTime, 0.01);
                this.params.bass.value = p.bass;
            }
            if (p.mid !== undefined) {
                midFilter.gain.setTargetAtTime((p.mid - 5) * 3, ctx.currentTime, 0.01);
                this.params.mid.value = p.mid;
            }
            if (p.treble !== undefined) {
                trebleFilter.gain.setTargetAtTime((p.treble - 5) * 3, ctx.currentTime, 0.01);
                this.params.treble.value = p.treble;
            }
            if (p.presence !== undefined) {
                presenceFilter.gain.setTargetAtTime((p.presence - 5) * 2, ctx.currentTime, 0.01);
                this.params.presence.value = p.presence;
            }
            if (p.master !== undefined) {
                masterGain.gain.setTargetAtTime(p.master / 150, ctx.currentTime, 0.01);
                this.params.master.value = p.master;
            }
        }
    };
}
