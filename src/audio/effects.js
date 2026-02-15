// Guitar Effects - Web Audio API implementations
import { getAudioContext } from './audioEngine.js';

// ===================== DISTORTION =====================
// ===================== DISTORTION =====================
const DIST_MODELS = {
    // === OVERDRIVES ===
    'green_od': { name: 'Green OD', type: 'soft', gainMult: 4, toneFreq: 720, color: '#55ff55', label: 'Drive' },
    'yellow_od': { name: 'Yellow OD', type: 'soft', gainMult: 5, toneFreq: 800, color: '#ffcc00', label: 'Drive' },
    'blues': { name: 'Blues OD', type: 'soft', gainMult: 3, toneFreq: 1500, color: '#4488ff', label: 'Gain' },
    'klon': { name: 'Centaur', type: 'soft', gainMult: 3.5, toneFreq: 1200, color: '#c0c0c0', label: 'Gain' }, // Transparent
    'tube': { name: 'Tube Driver', type: 'soft', gainMult: 4, toneFreq: 600, color: '#ddddaa', label: 'Tube' },
    'ocd': { name: 'OC Drive', type: 'hard', gainMult: 6, toneFreq: 900, color: '#ffffff', label: 'Drive' },
    'timmy': { name: 'Timmy', type: 'soft', gainMult: 3, toneFreq: 2000, color: '#aaddff', label: 'Gain' },
    'bb_pre': { name: 'BB Pre', type: 'soft', gainMult: 4.5, toneFreq: 1100, color: '#ffaa55', label: 'Gain' },
    'ac_boost': { name: 'AC Boost', type: 'soft', gainMult: 3.5, toneFreq: 1000, color: '#ffff55', label: 'Gain' },

    // === DISTORTIONS ===
    'rat': { name: 'Rat Dist', type: 'hard', gainMult: 12, toneFreq: 1000, color: '#333333', label: 'Dist' },
    'ds1': { name: 'Orange Dist', type: 'hard', gainMult: 15, toneFreq: 2500, color: '#ff8800', label: 'Dist' },
    'guvnor': { name: 'Guv\'nor', type: 'hard', gainMult: 10, toneFreq: 800, color: '#333333', label: 'Gain' },
    'mxr_dist': { name: 'D-Plus', type: 'hard', gainMult: 9, toneFreq: 1800, color: '#ddaa00', label: 'Dist' },
    'crunch': { name: 'Crunch Box', type: 'hard', gainMult: 18, toneFreq: 1200, color: '#dd3333', label: 'Gain' },
    'hm2': { name: 'Swede Metal', type: 'hard', gainMult: 25, toneFreq: 900, color: '#222222', label: 'Dist' },
    'metal': { name: 'Metal Zone', type: 'hard', gainMult: 40, toneFreq: 3500, color: '#111111', label: 'Dist' },

    // === FUZZES ===
    'fuzz': { name: 'Big Fuzz', type: 'fuzz', gainMult: 25, toneFreq: 400, color: '#cc4422', label: 'Sustain' },
    'face_germ': { name: 'Fuzz Face Ge', type: 'fuzz', gainMult: 18, toneFreq: 350, color: '#3333cc', label: 'Fuzz' }, // Warm
    'face_si': { name: 'Fuzz Face Si', type: 'fuzz', gainMult: 22, toneFreq: 1500, color: '#33aacccc', label: 'Fuzz' }, // Bright
    'tone_bender': { name: 'Tone Bender', type: 'fuzz', gainMult: 20, toneFreq: 1000, color: '#888888', label: 'Attack' },
    'muff_gr': { name: 'Green Muff', type: 'fuzz', gainMult: 30, toneFreq: 300, color: '#446644', label: 'Sustain' },
    'octavia': { name: 'Octavia', type: 'octave', gainMult: 15, toneFreq: 2000, color: '#eeeeee', label: 'Boost' }
};

export function createDistortion(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const waveshaper = ctx.createWaveShaper();
    const preGain = ctx.createGain();
    const toneFilter = ctx.createBiquadFilter();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    const modelId = params.model || 'green_od';
    let currentModel = DIST_MODELS[modelId] || DIST_MODELS['green_od'];

    const gain = params.gain ?? 50;
    const tone = params.tone ?? currentModel.toneFreq;
    const mix = params.mix ?? 80;

    preGain.gain.value = gain / 10;
    updateCurve(currentModel, gain);
    waveshaper.oversample = '4x';

    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = tone;
    toneFilter.Q.value = 0.7;

    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

    input.connect(preGain);
    preGain.connect(waveshaper);
    waveshaper.connect(toneFilter);
    toneFilter.connect(wetGain);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);

    function updateCurve(model, gainVal) {
        const amount = gainVal * model.gainMult;
        switch (model.type) {
            case 'hard': waveshaper.curve = makeHardClipCurve(amount); break;
            case 'fuzz': waveshaper.curve = makeFuzzCurve(amount); break;
            case 'octave': waveshaper.curve = makeOctaveCurve(amount); break;
            case 'soft':
            default: waveshaper.curve = makeDistortionCurve(amount); break;
        }
    }

    return {
        node: input,
        outputNode: output,
        name: currentModel.name,
        color: currentModel.color,
        params: {
            model: {
                value: modelId,
                type: 'select',
                options: Object.keys(DIST_MODELS).map(k => ({ value: k, label: DIST_MODELS[k].name })),
                label: 'Model'
            },
            gain: { value: gain, min: 0, max: 100, label: currentModel.label },
            tone: { value: tone, min: 100, max: 8000, label: 'Tone' }, // Expanded range
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.model !== undefined && DIST_MODELS[p.model]) {
                currentModel = DIST_MODELS[p.model];
                this.name = currentModel.name;
                this.color = currentModel.color;
                this.params.model.value = p.model;
                this.params.gain.label = currentModel.label;
                updateCurve(currentModel, this.params.gain.value);
            }
            if (p.gain !== undefined) {
                preGain.gain.setTargetAtTime(p.gain / 10, ctx.currentTime, 0.01);
                updateCurve(currentModel, p.gain);
                this.params.gain.value = p.gain;
            }
            if (p.tone !== undefined) {
                toneFilter.frequency.setTargetAtTime(p.tone, ctx.currentTime, 0.01);
                this.params.tone.value = p.tone;
            }
            if (p.mix !== undefined) {
                wetGain.gain.setTargetAtTime(p.mix / 100, ctx.currentTime, 0.01);
                dryGain.gain.setTargetAtTime(1 - p.mix / 100, ctx.currentTime, 0.01);
                this.params.mix.value = p.mix;
            }
        }
    };
}

// Standard Soft Clip / Overdrive
function makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

// Hard Clipping (Square-ish)
function makeHardClipCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = amount * 0.5;
    for (let i = 0; i < samples; i++) {
        let x = (i * 2) / samples - 1;
        x = x * k;
        if (x > 1) x = 1;
        if (x < -1) x = -1;
        curve[i] = x;
    }
    return curve;
}

// Fuzz (Asymmetric / Gated)
function makeFuzzCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = amount;
    for (let i = 0; i < samples; i++) {
        let x = (i * 2) / samples - 1;
        // Asymmetric
        if (x > 0) x = 1 - Math.exp(-x * k);
        else x = -1 + Math.exp(x * k * 0.5); // Different slope for negative
        curve[i] = x;
    }
    return curve;
}

// Octave (Full Wave Rectification)
function makeOctaveCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        // Full wave rectification = absolute value -> doubling frequency
        // Mixed with some original signal for flavor? Pure octave here.
        curve[i] = (Math.abs(x) * 2 - 1) * 0.8;
    }
    return curve;
}

// ===================== REVERB =====================
const REVERB_MODELS = {
    'spring': { name: 'Spring', duration: 1.5, decay: 3.0, color: '#44aa44', label: 'Dwell' },
    'room': { name: 'Room', duration: 0.8, decay: 5.0, color: '#4444ff', label: 'Decay' },
    'plate': { name: 'Plate', duration: 2.0, decay: 2.0, color: '#eeeeee', label: 'Decay' },
    'hall': { name: 'Hall', duration: 3.5, decay: 1.5, color: '#cc44cc', label: 'Decay' },
    'shimmer': { name: 'Shimmer', duration: 4.0, decay: 1.0, color: '#ff88dd', label: 'Decay' } // Placeholder for shimmer
};

export function createReverb(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const convolver = ctx.createConvolver();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const toneFilter = ctx.createBiquadFilter(); // Add tone control for reverb

    const modelId = params.model || 'spring';
    let currentModel = REVERB_MODELS[modelId] || REVERB_MODELS['spring'];

    const mix = params.mix ?? 30;
    const tone = params.tone ?? 50;
    const decay = params.decay ?? 50; // Maps to duration/decay tweak

    // Initial Impulse
    updateImpulse(currentModel, decay);

    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = 3000 + (tone * 100); // Simple tone mapping

    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

    input.connect(convolver);
    convolver.connect(toneFilter);
    toneFilter.connect(wetGain);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);

    function updateImpulse(model, decayVal) {
        // Adjust duration/decay based on knob (decayVal 0-100)
        // Base duration * (0.5 to 1.5 multiplier)
        const dMult = 0.5 + (decayVal / 100);
        const effectiveDuration = model.duration * dMult;
        convolver.buffer = generateImpulseResponse(ctx, effectiveDuration, model.decay);
    }

    return {
        node: input,
        outputNode: output,
        name: currentModel.name,
        color: currentModel.color,
        params: {
            model: {
                value: modelId,
                type: 'select',
                options: Object.keys(REVERB_MODELS).map(k => ({ value: k, label: REVERB_MODELS[k].name })),
                label: 'Model'
            },
            decay: { value: decay, min: 0, max: 100, label: currentModel.label },
            tone: { value: tone, min: 0, max: 100, label: 'Tone' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.model !== undefined && REVERB_MODELS[p.model]) {
                currentModel = REVERB_MODELS[p.model];
                this.name = currentModel.name;
                this.color = currentModel.color;
                this.params.model.value = p.model;
                this.params.decay.label = currentModel.label;
                updateImpulse(currentModel, this.params.decay.value);
            }
            if (p.decay !== undefined) {
                updateImpulse(currentModel, p.decay);
                this.params.decay.value = p.decay;
            }
            if (p.tone !== undefined) {
                toneFilter.frequency.setTargetAtTime(3000 + (p.tone * 100), ctx.currentTime, 0.01);
                this.params.tone.value = p.tone;
            }
            if (p.mix !== undefined) {
                wetGain.gain.setTargetAtTime(p.mix / 100, ctx.currentTime, 0.01);
                dryGain.gain.setTargetAtTime(1 - p.mix / 100, ctx.currentTime, 0.01);
                this.params.mix.value = p.mix;
            }
        }
    };
}

function generateImpulseResponse(ctx, duration, decay) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i;
        // Simple exponential decay noise
        let val = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        left[i] = val;
        right[i] = val;
    }
    return impulse;
}

// ===================== DELAY =====================
// ===================== DELAY =====================
const DELAY_MODELS = {
    'digital': { name: 'Digital Dly', color: '#44cc88', filterFreq: 10000, q: 0, drive: 0 },
    'analog': { name: 'Analog Dly', color: '#aa8844', filterFreq: 2500, q: 0.5, drive: 0.2 },
    'tape': { name: 'Tape Echo', color: '#ccaa66', filterFreq: 4000, q: 0.2, drive: 0.5 },
    'slap': { name: 'Slapback', color: '#dd6644', filterFreq: 6000, q: 0, drive: 0.1, fixedTime: 120 }
};

export function createDelay(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delay = ctx.createDelay(5.0);
    const feedback = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    // Character shaping
    const filter = ctx.createBiquadFilter(); // Lowpass for analog/tape roll-off
    const saturate = ctx.createWaveShaper(); // Saturation for tape/analog grit

    const modelId = params.model || 'digital';
    let currentModel = DELAY_MODELS[modelId] || DELAY_MODELS['digital'];

    const time = params.time ?? (currentModel.fixedTime || 400);
    const fb = params.feedback ?? 40;
    const mix = params.mix ?? 35;
    const tone = params.tone ?? 50; // Modifies filter freq relative to model base

    // Initial Setup
    updateModelChar(currentModel);

    // Filter setup
    filter.type = 'lowpass';

    // Saturation curve
    function makeDriveCurve(amount) {
        const k = amount * 10;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }
    saturate.curve = makeDriveCurve(currentModel.drive);
    saturate.oversample = '2x';

    delay.delayTime.value = time / 1000;
    feedback.gain.value = fb / 100;
    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

    // Routing: Input -> Dry
    input.connect(dryGain);
    dryGain.connect(output);

    // Routing: Input -> Delay -> Saturate -> Filter -> Wet
    // Feedback: Filter -> Feedback -> Delay
    input.connect(delay);
    delay.connect(saturate);
    saturate.connect(filter);
    filter.connect(wetGain);
    wetGain.connect(output);

    filter.connect(feedback);
    feedback.connect(delay);

    function updateModelChar(model) {
        // Update physics/character based on model
        // Base tone adjusted by Tone params
        const toneMod = (tone / 50);
        filter.frequency.value = model.filterFreq * toneMod;
        filter.Q.value = model.q;
        saturate.curve = makeDriveCurve(model.drive);
    }

    return {
        node: input,
        outputNode: output,
        name: currentModel.name,
        color: currentModel.color,
        params: {
            model: {
                value: modelId,
                type: 'select',
                options: Object.keys(DELAY_MODELS).map(k => ({ value: k, label: DELAY_MODELS[k].name })),
                label: 'Model'
            },
            time: { value: time, min: 10, max: 2000, label: 'Time' },
            feedback: { value: fb, min: 0, max: 110, label: 'Fdbk' }, // Allow self-oscillation
            tone: { value: tone, min: 10, max: 100, label: 'Tone' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.model !== undefined && DELAY_MODELS[p.model]) {
                currentModel = DELAY_MODELS[p.model];
                this.name = currentModel.name;
                this.color = currentModel.color;
                this.params.model.value = p.model;

                if (currentModel.fixedTime) {
                    p.time = currentModel.fixedTime; // Force time change for slapback
                    this.update({ time: currentModel.fixedTime });
                }
                updateModelChar(currentModel);
            }
            if (p.time !== undefined) {
                delay.delayTime.setTargetAtTime(p.time / 1000, ctx.currentTime, 0.01);
                this.params.time.value = p.time;
            }
            if (p.feedback !== undefined) {
                feedback.gain.setTargetAtTime(p.feedback / 100, ctx.currentTime, 0.01);
                this.params.feedback.value = p.feedback;
            }
            if (p.tone !== undefined) {
                const toneMod = (p.tone / 50);
                filter.frequency.setTargetAtTime(currentModel.filterFreq * toneMod, ctx.currentTime, 0.01);
                this.params.tone.value = p.tone;
            }
            if (p.mix !== undefined) {
                wetGain.gain.setTargetAtTime(p.mix / 100, ctx.currentTime, 0.01);
                dryGain.gain.setTargetAtTime(1 - p.mix / 100, ctx.currentTime, 0.01);
                this.params.mix.value = p.mix;
            }
        }
    };
}

// ===================== CHORUS =====================
// ===================== CHORUS =====================
const CHORUS_MODELS = {
    'ce-1': { name: 'CE-1 Chorus', color: '#6666ff', rate: 1.5, depth: 50, mix: 50, type: 'sine' },
    'tri': { name: 'Tri-Chorus', color: '#aa44ff', rate: 2.0, depth: 60, mix: 60, type: 'triangle' },
    'vibrato': { name: 'Vibrato', color: '#ff66aa', rate: 4.0, depth: 40, mix: 100, type: 'sine' }, // 100% wet
    'dim': { name: 'Dimension', color: '#ccccff', rate: 0.5, depth: 80, mix: 40, type: 'sine' } // Subtle, wide
};

export function createChorus(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delay = ctx.createDelay();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    const modelId = params.model || 'ce-1';
    let currentModel = CHORUS_MODELS[modelId] || CHORUS_MODELS['ce-1'];

    const rate = params.rate ?? currentModel.rate;
    const depth = params.depth ?? currentModel.depth;
    const mix = params.mix ?? currentModel.mix;

    delay.delayTime.value = 0.02; // 20ms base delay
    lfo.type = currentModel.type;
    lfo.frequency.value = rate;
    lfoGain.gain.value = (depth / 100) * 0.004; // scaled depth

    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - (mix / 100);

    // Routing
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();

    input.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: currentModel.name,
        color: currentModel.color,
        params: {
            model: {
                value: modelId,
                type: 'select',
                options: Object.keys(CHORUS_MODELS).map(k => ({ value: k, label: CHORUS_MODELS[k].name })),
                label: 'Model'
            },
            rate: { value: rate, min: 0.1, max: 10, label: 'Rate', step: 0.1 },
            depth: { value: depth, min: 0, max: 100, label: 'Depth' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.model !== undefined && CHORUS_MODELS[p.model]) {
                currentModel = CHORUS_MODELS[p.model];
                this.name = currentModel.name;
                this.color = currentModel.color;
                this.params.model.value = p.model;

                // Update LFO shape
                lfo.type = currentModel.type;

                // Force mix for Vibrato if needed, or let user adjust? 
                // Let's reset default mix if switching TO vibrato to ensure effect is heard correctly
                if (p.model === 'vibrato' && this.params.mix.value < 90) {
                    this.update({ mix: 100 });
                }
            }
            if (p.rate !== undefined) {
                lfo.frequency.setTargetAtTime(p.rate, ctx.currentTime, 0.01);
                this.params.rate.value = p.rate;
            }
            if (p.depth !== undefined) {
                lfoGain.gain.setTargetAtTime((p.depth / 100) * 0.004, ctx.currentTime, 0.01);
                this.params.depth.value = p.depth;
            }
            if (p.mix !== undefined) {
                wetGain.gain.setTargetAtTime(p.mix / 100, ctx.currentTime, 0.01);
                dryGain.gain.setTargetAtTime(1 - p.mix / 100, ctx.currentTime, 0.01);
                this.params.mix.value = p.mix;
            }
        }
    };
}

// ===================== EQ (3-Band) =====================
// ===================== EQ (3-Band) =====================
const EQ_MODELS = {
    'studio': { name: 'Studio EQ', color: '#ffaa00', low: 100, mid: 800, high: 5000, lowType: 'lowshelf', highType: 'highshelf', midQ: 1.0 },
    'vintage': { name: 'Vintage EQ', color: '#dd9933', low: 200, mid: 1200, high: 4000, lowType: 'lowshelf', highType: 'highshelf', midQ: 0.5 }, // Warmer, broader
    'scoop': { name: 'Scoop EQ', color: '#cc4400', low: 150, mid: 600, high: 3500, lowType: 'peaking', highType: 'peaking', midQ: 2.0 }, // Aggressive mid cut
    'boost': { name: 'Mid Boost', color: '#ffcc00', low: 250, mid: 1000, high: 3000, lowType: 'lowshelf', highType: 'highshelf', midQ: 0.7 }
};

export function createEQ(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();

    const lowBand = ctx.createBiquadFilter();
    const midBand = ctx.createBiquadFilter();
    const highBand = ctx.createBiquadFilter();

    const modelId = params.model || 'studio';
    let currentModel = EQ_MODELS[modelId] || EQ_MODELS['studio'];

    const low = params.low ?? 0;
    const mid = params.mid ?? 0;
    const high = params.high ?? 0;

    applyModel(currentModel);

    lowBand.gain.value = low;
    midBand.gain.value = mid;
    highBand.gain.value = high;

    input.connect(lowBand);
    lowBand.connect(midBand);
    midBand.connect(highBand);
    highBand.connect(output);

    function applyModel(model) {
        lowBand.type = model.lowType;
        lowBand.frequency.value = model.low;

        midBand.type = 'peaking';
        midBand.frequency.value = model.mid;
        midBand.Q.value = model.midQ;

        highBand.type = model.highType;
        highBand.frequency.value = model.high;
    }

    return {
        node: input,
        outputNode: output,
        name: currentModel.name,
        color: currentModel.color,
        params: {
            model: {
                value: modelId,
                type: 'select',
                options: Object.keys(EQ_MODELS).map(k => ({ value: k, label: EQ_MODELS[k].name })),
                label: 'Model'
            },
            low: { value: low, min: -15, max: 15, label: 'Low' },
            mid: { value: mid, min: -15, max: 15, label: 'Mid' },
            high: { value: high, min: -15, max: 15, label: 'High' }
        },
        update(p) {
            if (p.model !== undefined && EQ_MODELS[p.model]) {
                currentModel = EQ_MODELS[p.model];
                this.name = currentModel.name;
                this.color = currentModel.color;
                this.params.model.value = p.model;
                applyModel(currentModel);
            }
            if (p.low !== undefined) {
                lowBand.gain.setTargetAtTime(p.low, ctx.currentTime, 0.01);
                this.params.low.value = p.low;
            }
            if (p.mid !== undefined) {
                midBand.gain.setTargetAtTime(p.mid, ctx.currentTime, 0.01);
                this.params.mid.value = p.mid;
            }
            if (p.high !== undefined) {
                highBand.gain.setTargetAtTime(p.high, ctx.currentTime, 0.01);
                this.params.high.value = p.high;
            }
        }
    };
}

// ===================== COMPRESSOR =====================
// ===================== COMPRESSOR =====================
const COMP_MODELS = {
    'studio': { name: 'Studio Comp', color: '#FFD700', ratio: 4, attack: 0.01, release: 0.1, knee: 5 },
    'ross': { name: 'Vintage Ross', color: '#aa8822', ratio: 8, attack: 0.005, release: 0.2, knee: 20 },
    'optical': { name: 'Optical', color: '#eeeeee', ratio: 3, attack: 0.03, release: 0.5, knee: 30 }
};

export function createCompressor(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const makeupGain = ctx.createGain();

    const modelId = params.model || 'studio';
    let currentModel = COMP_MODELS[modelId] || COMP_MODELS['studio'];

    const threshold = params.threshold ?? -24;
    const ratio = params.ratio ?? currentModel.ratio;
    const attack = params.attack ?? currentModel.attack;
    const release = params.release ?? currentModel.release;

    applyModel(currentModel);

    compressor.threshold.value = threshold;
    compressor.ratio.value = ratio;
    compressor.attack.value = attack;
    compressor.release.value = release;

    // Auto-makeup or manual level? Let's use manual level for "Level" knob if we had one, 
    // but here we just have standard controls. Let's add a fixed makeup based on threshold for now or keep unit gain.
    makeupGain.gain.value = 1.0;

    input.connect(compressor);
    compressor.connect(makeupGain);
    makeupGain.connect(output);

    function applyModel(model) {
        compressor.knee.value = model.knee;
    }

    return {
        node: input,
        outputNode: output,
        name: currentModel.name,
        color: currentModel.color,
        params: {
            model: {
                value: modelId,
                type: 'select',
                options: Object.keys(COMP_MODELS).map(k => ({ value: k, label: COMP_MODELS[k].name })),
                label: 'Model'
            },
            threshold: { value: threshold, min: -60, max: 0, label: 'Thresh' },
            ratio: { value: ratio, min: 1, max: 20, label: 'Ratio' },
            attack: { value: attack * 1000, min: 0, max: 100, label: 'Attack', step: 1 },
            release: { value: release * 1000, min: 10, max: 1000, label: 'Release', step: 10 }
        },
        update(p) {
            if (p.model !== undefined && COMP_MODELS[p.model]) {
                currentModel = COMP_MODELS[p.model];
                this.name = currentModel.name;
                this.color = currentModel.color;
                this.params.model.value = p.model;
                applyModel(currentModel);

                // Optional: reset params to model defaults? Or keep user settings?
                // Keeping user settings for ratio/attack/release is flexible, 
                // but knee changes internally.
            }
            if (p.threshold !== undefined) {
                compressor.threshold.setTargetAtTime(p.threshold, ctx.currentTime, 0.01);
                this.params.threshold.value = p.threshold;
            }
            if (p.ratio !== undefined) {
                compressor.ratio.setTargetAtTime(p.ratio, ctx.currentTime, 0.01);
                this.params.ratio.value = p.ratio;
            }
            if (p.attack !== undefined) {
                compressor.attack.setTargetAtTime(p.attack / 1000, ctx.currentTime, 0.01);
                this.params.attack.value = p.attack;
            }
            if (p.release !== undefined) {
                compressor.release.setTargetAtTime(p.release / 1000, ctx.currentTime, 0.01);
                this.params.release.value = p.release;
            }
        }
    };
}

// ===================== NOISE GATE =====================
export function createNoiseGate(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const gate = ctx.createGain();
    const analyser = ctx.createAnalyser();

    const threshold = params.threshold ?? -40;

    analyser.fftSize = 256;
    gate.gain.value = 1;

    input.connect(analyser);
    input.connect(gate);
    gate.connect(output);

    let animFrame;
    const dataArray = new Float32Array(analyser.fftSize);

    function processGate() {
        analyser.getFloatTimeDomainData(dataArray);
        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) rms += dataArray[i] ** 2;
        rms = 10 * Math.log10(rms / dataArray.length);

        const currentThreshold = params._currentThreshold ?? threshold;
        gate.gain.setTargetAtTime(rms > currentThreshold ? 1 : 0, ctx.currentTime, 0.005);
        animFrame = requestAnimationFrame(processGate);
    }
    processGate();

    return {
        node: input,
        outputNode: output,
        name: 'Noise Gate',
        color: '#32CD32',
        params: {
            threshold: { value: threshold, min: -80, max: 0, label: 'Thresh' }
        },
        update(p) {
            if (p.threshold !== undefined) {
                params._currentThreshold = p.threshold;
                this.params.threshold.value = p.threshold;
            }
        },
        destroy() {
            cancelAnimationFrame(animFrame);
        }
    };
}

// ===================== TREMOLO =====================
export function createTremolo(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const tremGain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    const rate = params.rate ?? 5;
    const depth = params.depth ?? 50;

    tremGain.gain.value = 1;
    lfo.type = 'sine';
    lfo.frequency.value = rate;
    lfoGain.gain.value = depth / 100;

    lfo.connect(lfoGain);
    lfoGain.connect(tremGain.gain);
    lfo.start();

    input.connect(tremGain);
    tremGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'Tremolo',
        color: '#8A2BE2',
        params: {
            rate: { value: rate, min: 0.5, max: 15, label: 'Rate', step: 0.5 },
            depth: { value: depth, min: 0, max: 100, label: 'Depth' }
        },
        update(p) {
            if (p.rate !== undefined) {
                lfo.frequency.setTargetAtTime(p.rate, ctx.currentTime, 0.01);
                this.params.rate.value = p.rate;
            }
            if (p.depth !== undefined) {
                lfoGain.gain.setTargetAtTime(p.depth / 100, ctx.currentTime, 0.01);
                this.params.depth.value = p.depth;
            }
        }
    };
}

// ===================== PHASER =====================
export function createPhaser(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    const rate = params.rate ?? 0.5;
    const depth = params.depth ?? 60;
    const mix = params.mix ?? 50;

    const stages = [];
    const frequencies = [200, 400, 800, 1600];
    let lastNode = input;

    frequencies.forEach(freq => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'allpass';
        filter.frequency.value = freq;
        filter.Q.value = 5;
        lastNode.connect(filter);
        lastNode = filter;
        stages.push(filter);
    });

    lfo.type = 'sine';
    lfo.frequency.value = rate;
    lfoGain.gain.value = depth * 20;

    lfo.connect(lfoGain);
    stages.forEach(filter => {
        lfoGain.connect(filter.frequency);
    });
    lfo.start();

    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

    lastNode.connect(wetGain);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'Phaser',
        color: '#FF1493',
        params: {
            rate: { value: rate, min: 0.1, max: 5, label: 'Rate', step: 0.1 },
            depth: { value: depth, min: 0, max: 100, label: 'Depth' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.rate !== undefined) {
                lfo.frequency.setTargetAtTime(p.rate, ctx.currentTime, 0.01);
                this.params.rate.value = p.rate;
            }
            if (p.depth !== undefined) {
                lfoGain.gain.setTargetAtTime(p.depth * 20, ctx.currentTime, 0.01);
                this.params.depth.value = p.depth;
            }
            if (p.mix !== undefined) {
                wetGain.gain.setTargetAtTime(p.mix / 100, ctx.currentTime, 0.01);
                dryGain.gain.setTargetAtTime(1 - p.mix / 100, ctx.currentTime, 0.01);
                this.params.mix.value = p.mix;
            }
        }
    };
}

// ===================== COMPRESSOR SUSTAINER =====================
const SUSTAINER_MODELS = {
    'blue': { name: 'Blue CS', color: '#0099CC', attack: 0.005, release: 0.5, ratio: 12 },
    'orange': { name: 'Orange Sq', color: '#ff8800', attack: 0.002, release: 0.8, ratio: 20 },
    'ross': { name: 'Ross Comp', color: '#888888', attack: 0.01, release: 0.2, ratio: 8 }
};

export function createCompSustainer(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const makeupGain = ctx.createGain();

    const modelId = params.model || 'blue';
    let currentModel = SUSTAINER_MODELS[modelId] || SUSTAINER_MODELS['blue'];

    // Sustainer defaults: Lower threshold, Higher ratio, Slower release
    const threshold = params.threshold ?? -30;
    const ratio = params.ratio ?? currentModel.ratio;
    const attack = params.attack ?? currentModel.attack;
    const release = params.release ?? 0.25; // Release often manual on pedal
    const level = params.level ?? 60; // Output level

    applyModel(currentModel);

    compressor.threshold.value = threshold;
    compressor.release.value = release;
    compressor.knee.value = 10;

    // Auto-makeup or manual level? Let's use manual level for "Level" knob
    makeupGain.gain.value = (level / 50) * 2; // Rough mapping

    input.connect(compressor);
    compressor.connect(makeupGain);
    makeupGain.connect(output);

    function applyModel(model) {
        compressor.attack.value = model.attack;
        compressor.ratio.value = model.ratio;
    }

    return {
        node: input,
        outputNode: output,
        name: currentModel.name,
        color: currentModel.color,
        params: {
            model: {
                value: modelId,
                type: 'select',
                options: Object.keys(SUSTAINER_MODELS).map(k => ({ value: k, label: SUSTAINER_MODELS[k].name })),
                label: 'Model'
            },
            threshold: { value: threshold, min: -60, max: 0, label: 'Thresh' },
            // Removed ratio control for simpler UI, usually fixed in pedal sustains
            // Added Attack control? Sustainer usually has Level, Tone, Attack, Sustain.
            attack: { value: attack * 1000, min: 0, max: 100, label: 'Attack' },
            level: { value: level, min: 0, max: 100, label: 'Level' }
        },
        update(p) {
            if (p.model !== undefined && SUSTAINER_MODELS[p.model]) {
                currentModel = SUSTAINER_MODELS[p.model];
                this.name = currentModel.name;
                this.color = currentModel.color;
                this.params.model.value = p.model;
                applyModel(currentModel);
            }
            if (p.threshold !== undefined) {
                compressor.threshold.setTargetAtTime(p.threshold, ctx.currentTime, 0.01);
                this.params.threshold.value = p.threshold;
            }
            // Ratio is fixed per model for simplicity here
            if (p.attack !== undefined) {
                compressor.attack.setTargetAtTime(p.attack / 1000, ctx.currentTime, 0.01);
                this.params.attack.value = p.attack;
            }
            if (p.level !== undefined) {
                makeupGain.gain.setTargetAtTime((p.level / 50) * 2, ctx.currentTime, 0.01);
                this.params.level.value = p.level;
            }
        }
    };
}

// ===================== STRING ENSEMBLE =====================
const STRING_MODELS = {
    '1': { name: 'Symphonic', rates: [0.6, 0.83, 1.1] },
    '2': { name: 'June-O', rates: [4.0, 4.5, 5.0] },
    '3': { name: 'PCM', rates: [0.1, 0.2, 0.3] },
    '4': { name: 'Floppy', rates: [6.0, 7.0, 8.0] },
    '5': { name: 'AARP', rates: [1.5, 2.0, 2.5] },
    '6': { name: 'Crewman', rates: [0.5, 1.0, 1.5] },
    '7': { name: 'Orch Freeze', rates: [0.2, 0.4, 0.6] },
    '8': { name: 'Synth Freeze', rates: [2.5, 3.5, 4.5] },
    '9': { name: 'Vox Freeze', rates: [3.0, 5.0, 7.0] }
};

export function createStringEnsemble(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();

    // Tone shaping
    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';

    // Compressor for sustain/evenness
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.05;
    compressor.release.value = 0.2;

    // 3 parallel modulated delay lines (Tri-Chorus)
    const delays = [];
    const lfos = [];
    const lfoGains = [];
    const subGains = [];

    // Create tri-chorus structure
    for (let i = 0; i < 3; i++) {
        const d = ctx.createDelay();
        d.delayTime.value = 0.02 + (i * 0.005); // slightly different base times

        const l = ctx.createOscillator();
        l.type = 'sine';

        const lg = ctx.createGain();
        lg.gain.value = 0.002; // Modulation depth

        const sg = ctx.createGain();
        sg.gain.value = 0.5; // Gain per voice

        l.connect(lg);
        lg.connect(d.delayTime);
        l.start();

        delays.push(d);
        lfos.push(l);
        lfoGains.push(lg);
        subGains.push(sg);

        // Signal path
        compressor.connect(d);
        d.connect(sg);
        sg.connect(wetGain);
    }

    const vol = params.vol ?? 80;
    const dry = params.dry ?? 0;
    const tone = params.ctrl1 ?? 50; // Filter Cutoff
    const sustain = params.ctrl2 ?? 50; // Mod Depth
    const mode = params.mode ?? '1'; // Default mode key

    // Apply initial params
    toneFilter.frequency.value = 500 + (tone * 100); // 500Hz to 10kHz

    dryGain.gain.value = dry / 100;
    wetGain.gain.value = vol / 100;

    // LFO rates based on mode + modulation
    const setLfoRates = (m, depth) => {
        const modelData = STRING_MODELS[m] || STRING_MODELS['1'];
        const rates = modelData.rates;

        lfos.forEach((lfo, i) => {
            lfo.frequency.setTargetAtTime(rates[i], ctx.currentTime, 0.01);
            // Depth modulation by sustain param
            lfoGains[i].gain.setTargetAtTime((0.001 + (depth / 100 * 0.004)), ctx.currentTime, 0.01);
        });
    };

    setLfoRates(mode, sustain);

    // Routing
    input.connect(dryGain);
    input.connect(toneFilter);
    toneFilter.connect(compressor);
    // compressor connected to delays in loop
    dryGain.connect(output);
    wetGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'String Ensemble',
        color: '#f0e68c', // Khaki/Cream color like String9
        params: {
            mode: {
                value: mode,
                type: 'select',
                options: Object.keys(STRING_MODELS).map(k => ({ value: k, label: STRING_MODELS[k].name })),
                label: 'Mode'
            },
            vol: { value: vol, min: 0, max: 100, label: 'Vol' },
            dry: { value: dry, min: 0, max: 100, label: 'Dry' },
            ctrl1: { value: tone, min: 0, max: 100, label: 'Tone' },
            ctrl2: { value: sustain, min: 0, max: 100, label: 'Mod' }
        },
        update(p) {
            if (p.vol !== undefined) {
                wetGain.gain.setTargetAtTime(p.vol / 100, ctx.currentTime, 0.01);
                this.params.vol.value = p.vol;
            }
            if (p.dry !== undefined) {
                dryGain.gain.setTargetAtTime(p.dry / 100, ctx.currentTime, 0.01);
                this.params.dry.value = p.dry;
            }
            if (p.ctrl1 !== undefined) { // Tone
                // Logarithmic mapping for filter
                const freq = 200 * Math.pow(10, (p.ctrl1 / 100) * 1.7); // 200Hz to ~10kHz
                toneFilter.frequency.setTargetAtTime(freq, ctx.currentTime, 0.01);
                this.params.ctrl1.value = p.ctrl1;
            }
            if (p.ctrl2 !== undefined) { // Sustain/Mod
                setLfoRates(this.params.mode.value, p.ctrl2);
                this.params.ctrl2.value = p.ctrl2;
            }
            if (p.mode !== undefined) {
                setLfoRates(p.mode, this.params.ctrl2.value);
                this.params.mode.value = p.mode;
            }
        }
    };
}

// Effect factory
export const EFFECT_TYPES = [
    { id: 'distortion', name: 'Distortion', create: createDistortion, icon: '🔥' },
    { id: 'reverb', name: 'Reverb', create: createReverb, icon: '🏛️' },
    { id: 'delay', name: 'Delay', create: createDelay, icon: '📡' },
    { id: 'chorus', name: 'Chorus', create: createChorus, icon: '🌊' },
    { id: 'eq', name: 'EQ', create: createEQ, icon: '📊' },
    { id: 'compressor', name: 'Compressor', create: createCompressor, icon: '🗜️' },
    { id: 'compSustainer', name: 'Comp Sustainer', create: createCompSustainer, icon: '🔉' },
    { id: 'stringEnsemble', name: 'String Ens', create: createStringEnsemble, icon: '🎻' },
    { id: 'noisegate', name: 'Noise Gate', create: createNoiseGate, icon: '🚪' },
    { id: 'tremolo', name: 'Tremolo', create: createTremolo, icon: '〰️' },
    { id: 'phaser', name: 'Phaser', create: createPhaser, icon: '🌀' }
];
