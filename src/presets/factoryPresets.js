// Factory Presets - Pre-configured effect & amp settings
export const FACTORY_PRESETS = [
    {
        id: 'clean',
        name: '✨ Clean',
        description: 'Crystal clear clean tone',
        amp: { model: 'fender_twin', params: { gain: 25, bass: 5, mid: 5, treble: 6, presence: 5, master: 75 } },
        cabinet: { type: '1x12', mic: 'close', mix: 85 },
        effects: [
            { type: 'compressor', enabled: true, params: { threshold: -20, ratio: 3, attack: 5, release: 200 } },
            { type: 'eq', enabled: true, params: { low: 1, mid: 0, high: 2 } },
            { type: 'reverb', enabled: true, params: { roomSize: 30, damping: 40, mix: 25 } }
        ]
    },
    {
        id: 'blues',
        name: '🎵 Blues',
        description: 'Warm bluesy crunch',
        amp: { model: 'vox_ac30', params: { gain: 55, bass: 6, mid: 7, treble: 6, presence: 5, master: 65 } },
        cabinet: { type: '2x12', mic: 'close', mix: 90 },
        effects: [
            { type: 'compressor', enabled: true, params: { threshold: -18, ratio: 3, attack: 10, release: 250 } },
            { type: 'distortion', enabled: true, params: { gain: 30, tone: 4000, mix: 60 } },
            { type: 'reverb', enabled: true, params: { roomSize: 40, damping: 50, mix: 30 } },
            { type: 'delay', enabled: false, params: { time: 350, feedback: 25, mix: 20 } }
        ]
    },
    {
        id: 'rock',
        name: '🤘 Rock',
        description: 'Classic rock crunch',
        amp: { model: 'marshall_plexi', params: { gain: 65, bass: 6, mid: 8, treble: 7, presence: 6, master: 70 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 95 },
        effects: [
            { type: 'compressor', enabled: true, params: { threshold: -15, ratio: 4, attack: 5, release: 200 } },
            { type: 'distortion', enabled: true, params: { gain: 45, tone: 5000, mix: 70 } },
            { type: 'eq', enabled: true, params: { low: 2, mid: 3, high: 1 } },
            { type: 'reverb', enabled: true, params: { roomSize: 35, damping: 45, mix: 20 } }
        ]
    },
    {
        id: 'metal',
        name: '💀 Metal',
        description: 'Brutal high gain',
        amp: { model: 'peavey_6505', params: { gain: 85, bass: 7, mid: 4, treble: 7, presence: 6, master: 55 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'noisegate', enabled: true, params: { threshold: -35 } },
            { type: 'compressor', enabled: true, params: { threshold: -12, ratio: 6, attack: 2, release: 150 } },
            { type: 'eq', enabled: true, params: { low: 3, mid: -2, high: 2 } },
            { type: 'reverb', enabled: false, params: { roomSize: 20, damping: 60, mix: 10 } }
        ]
    },
    {
        id: 'ambient',
        name: '🌌 Ambient',
        description: 'Dreamy atmospheric texture',
        amp: { model: 'fender_twin', params: { gain: 20, bass: 4, mid: 4, treble: 7, presence: 6, master: 60 } },
        cabinet: { type: '1x12', mic: 'room', mix: 75 },
        effects: [
            { type: 'compressor', enabled: true, params: { threshold: -20, ratio: 3, attack: 20, release: 500 } },
            { type: 'chorus', enabled: true, params: { rate: 0.8, depth: 60, mix: 50 } },
            { type: 'delay', enabled: true, params: { time: 500, feedback: 55, mix: 45 } },
            { type: 'reverb', enabled: true, params: { roomSize: 80, damping: 30, mix: 60 } },
            { type: 'phaser', enabled: false, params: { rate: 0.3, depth: 40, mix: 30 } }
        ]
    },
    {
        id: 'funk',
        name: '🕺 Funk',
        description: 'Tight, funky crunch',
        amp: { model: 'fender_twin', params: { gain: 35, bass: 4, mid: 7, treble: 8, presence: 7, master: 70 } },
        cabinet: { type: '2x12', mic: 'close', mix: 85 },
        effects: [
            { type: 'compressor', enabled: true, params: { threshold: -10, ratio: 8, attack: 1, release: 100 } },
            { type: 'eq', enabled: true, params: { low: -2, mid: 3, high: 4 } },
            { type: 'phaser', enabled: true, params: { rate: 1.5, depth: 50, mix: 40 } },
            { type: 'tremolo', enabled: false, params: { rate: 6, depth: 40 } }
        ]
    },
    {
        id: 'acoustic_sim',
        name: '🪕 Acoustic Sim',
        description: 'Acoustic guitar simulation',
        amp: { model: 'fender_twin', params: { gain: 15, bass: 3, mid: 5, treble: 8, presence: 7, master: 65 } },
        cabinet: { type: '1x12', mic: 'room', mix: 60 },
        effects: [
            { type: 'compressor', enabled: true, params: { threshold: -18, ratio: 3, attack: 10, release: 300 } },
            { type: 'eq', enabled: true, params: { low: -3, mid: 2, high: 5 } },
            { type: 'chorus', enabled: true, params: { rate: 0.5, depth: 20, mix: 20 } },
            { type: 'reverb', enabled: true, params: { roomSize: 45, damping: 40, mix: 30 } }
        ]
    },
    {
        id: '80s_lead',
        name: '🎸 80s Lead',
        description: 'Shredding 80s solo tone',
        amp: { model: 'soldano_slo', params: { gain: 72, bass: 5, mid: 7, treble: 7, presence: 6, master: 65 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 95 },
        effects: [
            { type: 'noisegate', enabled: true, params: { threshold: -40 } },
            { type: 'compressor', enabled: true, params: { threshold: -15, ratio: 4, attack: 5, release: 200 } },
            { type: 'distortion', enabled: true, params: { gain: 55, tone: 5500, mix: 65 } },
            { type: 'delay', enabled: true, params: { time: 320, feedback: 30, mix: 25 } },
            { type: 'reverb', enabled: true, params: { roomSize: 40, damping: 50, mix: 20 } }
        ]
    }
];
