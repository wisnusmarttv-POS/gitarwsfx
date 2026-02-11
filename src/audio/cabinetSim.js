// Cabinet Simulation - Speaker cabinet impulse response emulation
import { getAudioContext } from './audioEngine.js';

export const CABINET_TYPES = [
    { id: '1x12', name: '1x12 Open Back', description: 'Bright, open sound', icon: '🔈' },
    { id: '2x12', name: '2x12 Closed', description: 'Balanced, punchy', icon: '🔉' },
    { id: '4x12_closed', name: '4x12 Closed Back', description: 'Thick, heavy bottom', icon: '🔊' },
    { id: '4x12_open', name: '4x12 Open Back', description: 'Full, warm sound', icon: '📢' }
];

export const MIC_POSITIONS = [
    { id: 'close', name: 'Close Mic', description: 'Direct, focused tone' },
    { id: 'room', name: 'Room Mic', description: 'Ambient, natural' },
    { id: 'far', name: 'Far Mic', description: 'Spacious, diffused' }
];

// Generate cabinet-specific impulse responses
function generateCabinetIR(ctx, cabinetId, micPosition) {
    const sampleRate = ctx.sampleRate;
    let irLength, decay, lowCut, highCut, resonance, roomSize;

    // Cabinet character
    switch (cabinetId) {
        case '1x12':
            irLength = 0.15;
            decay = 2.5;
            lowCut = 150;
            highCut = 6000;
            resonance = 1.2;
            roomSize = 0.3;
            break;
        case '2x12':
            irLength = 0.2;
            decay = 3.0;
            lowCut = 100;
            highCut = 5500;
            resonance = 1.5;
            roomSize = 0.4;
            break;
        case '4x12_closed':
            irLength = 0.25;
            decay = 3.5;
            lowCut = 80;
            highCut = 5000;
            resonance = 2.0;
            roomSize = 0.5;
            break;
        case '4x12_open':
            irLength = 0.3;
            decay = 3.0;
            lowCut = 90;
            highCut = 5500;
            resonance = 1.8;
            roomSize = 0.6;
            break;
        default:
            irLength = 0.2;
            decay = 3.0;
            lowCut = 100;
            highCut = 5500;
            resonance = 1.5;
            roomSize = 0.4;
    }

    // Mic position adjustments
    switch (micPosition) {
        case 'close':
            irLength *= 0.5;
            highCut *= 1.2;
            resonance *= 1.3;
            break;
        case 'room':
            irLength *= 1.5;
            roomSize *= 1.5;
            break;
        case 'far':
            irLength *= 2.0;
            highCut *= 0.8;
            roomSize *= 2.0;
            resonance *= 0.7;
            break;
    }

    const length = Math.ceil(sampleRate * irLength);
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const progress = i / length;

            // Base impulse response
            let sample = (Math.random() * 2 - 1) * Math.pow(1 - progress, decay);

            // Add speaker resonance
            sample += Math.sin(2 * Math.PI * resonance * 100 * t) *
                Math.exp(-t * 20) * 0.3;

            // Cabinet body resonance
            sample += Math.sin(2 * Math.PI * 120 * t) *
                Math.exp(-t * 15) * 0.2;

            // Room reflections
            if (roomSize > 0.3) {
                const reflectionDelay = Math.floor(sampleRate * roomSize * 0.01);
                if (i > reflectionDelay) {
                    sample += data[i - reflectionDelay] * 0.15;
                }
            }

            // Stereo widening
            if (channel === 1) {
                sample *= 0.95 + Math.random() * 0.1;
            }

            data[i] = sample;
        }
    }

    return buffer;
}

export function createCabinet(cabinetId = '4x12_closed', micPosition = 'close', mix = 100) {
    const ctx = getAudioContext();

    const input = ctx.createGain();
    const output = ctx.createGain();
    const convolver = ctx.createConvolver();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();

    // Low-pass filter to simulate speaker frequency response
    const speakerFilter = ctx.createBiquadFilter();
    speakerFilter.type = 'lowpass';
    speakerFilter.frequency.value = 5000;
    speakerFilter.Q.value = 0.7;

    // High-pass filter to remove sub-bass rumble
    const highpassFilter = ctx.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 80;
    highpassFilter.Q.value = 0.5;

    convolver.buffer = generateCabinetIR(ctx, cabinetId, micPosition);

    wetGain.gain.value = mix / 100;
    dryGain.gain.value = 1 - mix / 100;

    // Wet path: input -> convolver -> speakerFilter -> highpass -> wetGain -> output
    input.connect(convolver);
    convolver.connect(speakerFilter);
    speakerFilter.connect(highpassFilter);
    highpassFilter.connect(wetGain);
    wetGain.connect(output);

    // Dry path
    input.connect(dryGain);
    dryGain.connect(output);

    return {
        node: input,
        outputNode: output,
        cabinetId,
        micPosition,
        params: {
            mix: { value: mix, min: 0, max: 100, label: 'Mix' }
        },
        update(p) {
            if (p.cabinetId !== undefined || p.micPosition !== undefined) {
                const newCab = p.cabinetId ?? cabinetId;
                const newMic = p.micPosition ?? micPosition;
                convolver.buffer = generateCabinetIR(ctx, newCab, newMic);
                if (p.cabinetId) cabinetId = p.cabinetId;
                if (p.micPosition) micPosition = p.micPosition;
            }
            if (p.mix !== undefined) {
                wetGain.gain.setTargetAtTime(p.mix / 100, ctx.currentTime, 0.01);
                dryGain.gain.setTargetAtTime(1 - p.mix / 100, ctx.currentTime, 0.01);
                this.params.mix.value = p.mix;
            }
        }
    };
}
