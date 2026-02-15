// Guitar Effects - Web Audio API implementations
import { getAudioContext } from './audioEngine.js';

// ===================== DISTORTION =====================
const DIST_MODELS = {
    'green_od': { name: 'Green OD', gainMult: 4, toneFreq: 720, color: '#55ff55', label: 'Drive' },
    'yellow_od': { name: 'Yellow OD', gainMult: 5, toneFreq: 800, color: '#ffcc00', label: 'Drive' },
    'rat': { name: 'Rat Dist', gainMult: 12, toneFreq: 1000, color: '#444444', label: 'Dist' },
    'blues': { name: 'Blues OD', gainMult: 3, toneFreq: 1500, color: '#4488ff', label: 'Gain' },
    'fuzz': { name: 'Big Fuzz', gainMult: 25, toneFreq: 400, color: '#cc4422', label: 'Sustain' },
    'metal': { name: 'Metal Zone', gainMult: 40, toneFreq: 2500, color: '#333333', label: 'Dist' }
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
    const tone = params.tone ?? 5000;
    const mix = params.mix ?? 80;

    preGain.gain.value = gain / 10;
    waveshaper.curve = makeDistortionCurve(gain * currentModel.gainMult);
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
            tone: { value: tone, min: 500, max: 10000, label: 'Tone' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.model !== undefined) {
                const newModelId = p.model;
                if (DIST_MODELS[newModelId]) {
                    currentModel = DIST_MODELS[newModelId];
                    this.name = currentModel.name;
                    this.color = currentModel.color;
                    this.params.model.value = newModelId;
                    this.params.gain.label = currentModel.label;

                    // Re-apply gain curve with new multiplier
                    waveshaper.curve = makeDistortionCurve(this.params.gain.value * currentModel.gainMult);
                }
            }
            if (p.gain !== undefined) {
                preGain.gain.setTargetAtTime(p.gain / 10, ctx.currentTime, 0.01);
                waveshaper.curve = makeDistortionCurve(p.gain * currentModel.gainMult);
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

function makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        // Adjusted sigmal function for varied character
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
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
export function createChorus(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delay = ctx.createDelay();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    const rate = params.rate ?? 1.5;
    const depth = params.depth ?? 50;
    const mix = params.mix ?? 50;

    delay.delayTime.value = 0.02;
    lfo.type = 'sine';
    lfo.frequency.value = rate;
    lfoGain.gain.value = (depth / 100) * 0.01;

    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

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
        name: 'Chorus',
        color: '#aa44ff',
        params: {
            rate: { value: rate, min: 0.1, max: 10, label: 'Rate', step: 0.1 },
            depth: { value: depth, min: 0, max: 100, label: 'Depth' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.rate !== undefined) {
                lfo.frequency.setTargetAtTime(p.rate, ctx.currentTime, 0.01);
                this.params.rate.value = p.rate;
            }
            if (p.depth !== undefined) {
                lfoGain.gain.setTargetAtTime((p.depth / 100) * 0.01, ctx.currentTime, 0.01);
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
export function createEQ(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();

    const lowShelf = ctx.createBiquadFilter();
    const midPeak = ctx.createBiquadFilter();
    const highShelf = ctx.createBiquadFilter();

    const low = params.low ?? 0;
    const mid = params.mid ?? 0;
    const high = params.high ?? 0;

    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 320;
    lowShelf.gain.value = low;

    midPeak.type = 'peaking';
    midPeak.frequency.value = 1000;
    midPeak.Q.value = 1;
    midPeak.gain.value = mid;

    highShelf.type = 'highshelf';
    highShelf.frequency.value = 3200;
    highShelf.gain.value = high;

    input.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'EQ',
        color: '#ffaa00',
        params: {
            low: { value: low, min: -12, max: 12, label: 'Low' },
            mid: { value: mid, min: -12, max: 12, label: 'Mid' },
            high: { value: high, min: -12, max: 12, label: 'High' }
        },
        update(p) {
            if (p.low !== undefined) {
                lowShelf.gain.setTargetAtTime(p.low, ctx.currentTime, 0.01);
                this.params.low.value = p.low;
            }
            if (p.mid !== undefined) {
                midPeak.gain.setTargetAtTime(p.mid, ctx.currentTime, 0.01);
                this.params.mid.value = p.mid;
            }
            if (p.high !== undefined) {
                highShelf.gain.setTargetAtTime(p.high, ctx.currentTime, 0.01);
                this.params.high.value = p.high;
            }
        }
    };
}

// ===================== COMPRESSOR =====================
export function createCompressor(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const makeupGain = ctx.createGain();

    const threshold = params.threshold ?? -24;
    const ratio = params.ratio ?? 4;
    const attack = params.attack ?? 0.003;
    const release = params.release ?? 0.25;

    compressor.threshold.value = threshold;
    compressor.ratio.value = ratio;
    compressor.attack.value = attack;
    compressor.release.value = release;
    compressor.knee.value = 6;
    makeupGain.gain.value = 1.5;

    input.connect(compressor);
    compressor.connect(makeupGain);
    makeupGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'Compressor',
        color: '#FFD700',
        params: {
            threshold: { value: threshold, min: -60, max: 0, label: 'Thresh' },
            ratio: { value: ratio, min: 1, max: 20, label: 'Ratio' },
            attack: { value: attack * 1000, min: 0, max: 100, label: 'Attack', step: 1 },
            release: { value: release * 1000, min: 10, max: 1000, label: 'Release', step: 10 }
        },
        update(p) {
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
export function createCompSustainer(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const makeupGain = ctx.createGain();

    // Sustainer defaults: Lower threshold, Higher ratio, Slower release
    const threshold = params.threshold ?? -30;
    const ratio = params.ratio ?? 12;
    const attack = params.attack ?? 0.002;
    const release = params.release ?? 0.5;
    const level = params.level ?? 60; // Output level

    compressor.threshold.value = threshold;
    compressor.ratio.value = ratio;
    compressor.attack.value = attack;
    compressor.release.value = release;
    compressor.knee.value = 10;

    // Auto-makeup or manual level? Let's use manual level for "Level" knob
    makeupGain.gain.value = (level / 50) * 2; // Rough mapping

    input.connect(compressor);
    compressor.connect(makeupGain);
    makeupGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'Comp Sustainer',
        color: '#0099CC', // Blue-ish like CS-3
        params: {
            threshold: { value: threshold, min: -60, max: -10, label: 'Sustain' }, // Sustain maps to threshold (inverse logic visually, but here direct value) - let's keep it 'Sustain' label but logic is: Lower threshold = More sustain. 
            // Wait, standard compressor param is Threshold. if I label it "Sustain", user expects turning UP to give MORE sustain.
            // If I map "Sustain" 0-100 to Threshold -60 to -10, effectively turning UP increases threshold (less sustain).
            // So "Sustain" knob should invert: 0 -> -10dB, 100 -> -60dB.
            // But `EffectPedal` passes raw value. I should keep it simple for now or basic 'Threshold'.
            // Let's stick to standard controls to ensure stability, just renamed/retuned.
            threshold: { value: threshold, min: -60, max: 0, label: 'Thresh' },
            ratio: { value: ratio, min: 1, max: 20, label: 'Ratio' },
            attack: { value: attack * 1000, min: 0, max: 100, label: 'Attack', step: 1 },
            level: { value: level, min: 0, max: 100, label: 'Level' }
        },
        update(p) {
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
            if (p.level !== undefined) {
                makeupGain.gain.setTargetAtTime((p.level / 50) * 2, ctx.currentTime, 0.01);
                this.params.level.value = p.level;
            }
        }
    };
}

// ===================== STRING ENSEMBLE =====================
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
    const mode = params.mode ?? 1; // 1-9

    // Apply initial params
    toneFilter.frequency.value = 500 + (tone * 100); // 500Hz to 10kHz

    dryGain.gain.value = dry / 100;
    wetGain.gain.value = vol / 100;

    // LFO rates based on mode + modulation
    const setLfoRates = (m, depth) => {
        const baseRates = [
            [0.6, 0.83, 1.1], // Mode 1: Symphonic (Slow, deep)
            [4.0, 4.5, 5.0], // Mode 2: June-O (Fast)
            [0.1, 0.2, 0.3], // Mode 3: PCM (Very slow)
            [6.0, 7.0, 8.0], // Mode 4: Floppy (Vibrato-ish)
            [1.5, 2.0, 2.5],  // Mode 5: AARP (Medium)
            [0.5, 1.0, 1.5],  // Mode 6: Crewman
            [0.2, 0.4, 0.6],  // Mode 7: Orch Freeze
            [2.5, 3.5, 4.5],  // Mode 8: Synth Freeze
            [3.0, 5.0, 7.0]   // Mode 9: Vox Freeze
        ];

        const rates = baseRates[(m - 1) % 9];
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
            vol: { value: vol, min: 0, max: 100, label: 'Vol' },
            dry: { value: dry, min: 0, max: 100, label: 'Dry' },
            ctrl1: { value: tone, min: 0, max: 100, label: 'Tone' },
            ctrl2: { value: sustain, min: 0, max: 100, label: 'Mod' },
            mode: { value: mode, min: 1, max: 9, label: 'Mode', step: 1 }
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
