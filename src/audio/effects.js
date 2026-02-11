// Guitar Effects - Web Audio API implementations
import { getAudioContext } from './audioEngine.js';

// ===================== DISTORTION =====================
export function createDistortion(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const waveshaper = ctx.createWaveShaper();
    const preGain = ctx.createGain();
    const toneFilter = ctx.createBiquadFilter();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    const gain = params.gain ?? 50;
    const tone = params.tone ?? 5000;
    const mix = params.mix ?? 80;

    preGain.gain.value = gain / 10;
    waveshaper.curve = makeDistortionCurve(gain * 4);
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
        name: 'Distortion',
        color: '#ff4444',
        params: {
            gain: { value: gain, min: 0, max: 100, label: 'Gain' },
            tone: { value: tone, min: 500, max: 10000, label: 'Tone' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.gain !== undefined) {
                preGain.gain.setTargetAtTime(p.gain / 10, ctx.currentTime, 0.01);
                waveshaper.curve = makeDistortionCurve(p.gain * 4);
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
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

// ===================== REVERB =====================
export function createReverb(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const convolver = ctx.createConvolver();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    const roomSize = params.roomSize ?? 50;
    const damping = params.damping ?? 50;
    const mix = params.mix ?? 40;

    convolver.buffer = generateImpulseResponse(ctx, roomSize / 25, damping / 100);
    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

    input.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'Reverb',
        color: '#4488ff',
        params: {
            roomSize: { value: roomSize, min: 0, max: 100, label: 'Room' },
            damping: { value: damping, min: 0, max: 100, label: 'Damp' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.roomSize !== undefined || p.damping !== undefined) {
                const rs = p.roomSize ?? this.params.roomSize.value;
                const dp = p.damping ?? this.params.damping.value;
                convolver.buffer = generateImpulseResponse(ctx, rs / 25, dp / 100);
                if (p.roomSize !== undefined) this.params.roomSize.value = rs;
                if (p.damping !== undefined) this.params.damping.value = dp;
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
    const length = Math.max(ctx.sampleRate * duration, ctx.sampleRate * 0.1);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay * 3 + 1);
        }
    }
    return impulse;
}

// ===================== DELAY =====================
export function createDelay(params = {}) {
    const ctx = getAudioContext();
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delay = ctx.createDelay(5.0);
    const feedback = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const time = params.time ?? 400;
    const fb = params.feedback ?? 40;
    const mix = params.mix ?? 35;

    delay.delayTime.value = time / 1000;
    feedback.gain.value = fb / 100;
    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

    filter.type = 'lowpass';
    filter.frequency.value = 4000;

    input.connect(delay);
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);
    filter.connect(wetGain);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);

    return {
        node: input,
        outputNode: output,
        name: 'Delay',
        color: '#44cc88',
        params: {
            time: { value: time, min: 10, max: 2000, label: 'Time' },
            feedback: { value: fb, min: 0, max: 90, label: 'Fdbk' },
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.time !== undefined) {
                delay.delayTime.setTargetAtTime(p.time / 1000, ctx.currentTime, 0.01);
                this.params.time.value = p.time;
            }
            if (p.feedback !== undefined) {
                feedback.gain.setTargetAtTime(p.feedback / 100, ctx.currentTime, 0.01);
                this.params.feedback.value = p.feedback;
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
        color: '#ff8844',
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
        color: '#888888',
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
        color: '#44ddaa',
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
        color: '#dd44aa',
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

// Effect factory
export const EFFECT_TYPES = [
    { id: 'distortion', name: 'Distortion', create: createDistortion, icon: '🔥' },
    { id: 'reverb', name: 'Reverb', create: createReverb, icon: '🏛️' },
    { id: 'delay', name: 'Delay', create: createDelay, icon: '📡' },
    { id: 'chorus', name: 'Chorus', create: createChorus, icon: '🌊' },
    { id: 'eq', name: 'EQ', create: createEQ, icon: '📊' },
    { id: 'compressor', name: 'Compressor', create: createCompressor, icon: '🗜️' },
    { id: 'noisegate', name: 'Noise Gate', create: createNoiseGate, icon: '🚪' },
    { id: 'tremolo', name: 'Tremolo', create: createTremolo, icon: '〰️' },
    { id: 'phaser', name: 'Phaser', create: createPhaser, icon: '🌀' }
];
