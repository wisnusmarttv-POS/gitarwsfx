// Factory Presets - Pre-configured effect & amp settings
export const FACTORY_PRESETS = [
    {
        id: 'clean',
        name: '✨ Clean',
        description: 'Crystal clear clean tone',
        amp: { model: 'fender_twin', params: { gain: 40, bass: 5, mid: 5, treble: 6, presence: 5, master: 75 } },
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
        amp: { model: 'vox_ac30', params: { gain: 30, bass: 6, mid: 7, treble: 6, presence: 5, master: 65 } },
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
        amp: { model: 'marshall_plexi', params: { gain: 40, bass: 6, mid: 8, treble: 7, presence: 6, master: 70 } },
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
        amp: { model: 'peavey_6505', params: { gain: 65, bass: 7, mid: 4, treble: 7, presence: 6, master: 60 } },
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
            { type: 'distortion', enabled: true, params: { model: 'ds1', gain: 55, tone: 5500, mix: 65 } },
            { type: 'delay', enabled: true, params: { model: 'digital', time: 320, feedback: 30, mix: 25 } },
            { type: 'reverb', enabled: true, params: { model: 'plate', decay: 4, tone: 50, mix: 20 } }
        ]
    },
    // === ARTIST PRESETS ===
    {
        id: 'slash_sweet',
        name: '🎩 Slash Sweet',
        description: 'Iconic Intro Tone',
        amp: { model: 'marshall_jcm800', params: { gain: 65, bass: 7, mid: 4, treble: 6, presence: 5, master: 80 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'distortion', enabled: true, params: { model: 'green_od', gain: 30, tone: 6000, mix: 60 } }, // Boost
            { type: 'delay', enabled: true, params: { model: 'digital', time: 420, feedback: 25, mix: 15 } },
            { type: 'reverb', enabled: true, params: { model: 'hall', decay: 3, tone: 40, mix: 15 } }
        ]
    },
    {
        id: 'brian_may_boh',
        name: '👑 Brian Boh',
        description: 'Queen Bohemian Tone',
        amp: { model: 'vox_ac30', params: { gain: 100, bass: 4, mid: 8, treble: 8, presence: 8, master: 100 } },
        cabinet: { type: '2x12', mic: 'close', mix: 100 },
        effects: [
            { type: 'distortion', enabled: true, params: { model: 'ac_boost', gain: 70, tone: 7000, mix: 100 } }, // Treble Booster
            { type: 'chorus', enabled: true, params: { model: 'ce1', rate: 0.4, depth: 30, mix: 40 } }, // Thickener
            { type: 'reverb', enabled: true, params: { model: 'room', decay: 2, tone: 60, mix: 10 } }
        ]
    },
    {
        id: 'gary_moore_par',
        name: '🇮🇪 Gary Paris',
        description: 'Sustain for days',
        amp: { model: 'marshall_jcm800', params: { gain: 85, bass: 6, mid: 7, treble: 5, presence: 4, master: 70 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 95 },
        effects: [
            { type: 'distortion', enabled: true, params: { model: 'guvnor', gain: 60, tone: 4000, mix: 80 } },
            { type: 'reverb', enabled: true, params: { model: 'hall', decay: 5, tone: 30, mix: 35 } },
            { type: 'delay', enabled: true, params: { model: 'analog', time: 550, feedback: 40, mix: 25 } }
        ]
    },
    {
        id: 'kirk_sandman',
        name: '💤 Enter Kirk',
        description: 'Heavy Riff Machine',
        amp: { model: 'peavey_6505', params: { gain: 75, bass: 8, mid: 3, treble: 7, presence: 6, master: 60 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'noisegate', enabled: true, params: { threshold: -30 } },
            { type: 'distortion', enabled: true, params: { model: 'metal', gain: 50, tone: 2000, mix: 60 } }, // Tightener
            { type: 'eq', enabled: true, params: { model: 'scoop', low: 4, mid: -4, high: 3 } }
        ]
    },
    {
        id: 'james_master',
        name: '🦁 Master Het',
        description: 'Downpicked Thrash',
        amp: { model: 'mesa_rectifier', params: { gain: 70, bass: 7, mid: 2, treble: 6, presence: 5, master: 55 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'noisegate', enabled: true, params: { threshold: -45 } },
            { type: 'distortion', enabled: true, params: { model: 'green_od', gain: 0, tone: 5000, mix: 100 } }, // Tight boost
            { type: 'eq', enabled: true, params: { model: 'active', low: 2, mid: -2, high: 2 } }
        ]
    },
    {
        id: 'petrucci_dream',
        name: '🎭 Dream Tone',
        description: 'Prog Metal Lead',
        amp: { model: 'mesa_rectifier', params: { gain: 85, bass: 6, mid: 6, treble: 7, presence: 6, master: 60 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'chorus', enabled: true, params: { model: 'tri', rate: 0.6, depth: 40, mix: 30 } },
            { type: 'delay', enabled: true, params: { model: 'digital', time: 480, feedback: 45, mix: 35 } },
            { type: 'reverb', enabled: true, params: { model: 'plate', decay: 4, tone: 60, mix: 25 } }
        ]
    },
    {
        id: 'yngwie_rising',
        name: '🏎️ Neo Classic',
        description: 'Release the Fury',
        amp: { model: 'marshall_plexi', params: { gain: 100, bass: 5, mid: 6, treble: 8, presence: 8, master: 100 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 90 },
        effects: [
            { type: 'noisegate', enabled: true, params: { threshold: -40 } },
            { type: 'distortion', enabled: true, params: { model: 'green_od', gain: 80, tone: 6000, mix: 80 } }, // DOD 250 style
            { type: 'reverb', enabled: true, params: { model: 'hall', decay: 4, tone: 40, mix: 30 } }
        ]
    },
    {
        id: 'evh_eruption',
        name: '🌋 Eruption',
        description: 'Brown Sound',
        amp: { model: 'evh_5150', params: { gain: 85, bass: 6, mid: 4, treble: 7, presence: 7, master: 70 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'phaser', enabled: true, params: { rate: 0.5, depth: 60, mix: 40 } }, // Phase 90
            { type: 'delay', enabled: true, params: { model: 'tape', time: 300, feedback: 10, mix: 20 } },
            { type: 'reverb', enabled: true, params: { model: 'plate', decay: 3, tone: 50, mix: 25 } }
        ]
    },
    {
        id: 'synyster_gates',
        name: '🦇 Synyster',
        description: 'Avenged Tone',
        amp: { model: 'mesa_rectifier', params: { gain: 80, bass: 7, mid: 5, treble: 7, presence: 7, master: 60 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 95 },
        effects: [
            { type: 'compsustainer', enabled: true, params: { model: 'blue', threshold: -35, attack: 10, level: 60 } },
            { type: 'chorus', enabled: true, params: { model: 'dim', rate: 0.4, depth: 50, mix: 30 } },
            { type: 'reverb', enabled: true, params: { model: 'shimmer', decay: 5, tone: 70, mix: 40 } }
        ]
    },
    {
        id: 'paul_gilbert',
        name: '🏎️ Racer X',
        description: 'Technical Drill',
        amp: { model: 'marshall_jcm800', params: { gain: 70, bass: 5, mid: 6, treble: 7, presence: 6, master: 75 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 95 },
        effects: [
            { type: 'distortion', enabled: true, params: { model: 'ds1', gain: 65, tone: 4000, mix: 100 } },
            { type: 'chorus', enabled: true, params: { model: 'ce1', rate: 2.0, depth: 30, mix: 20 } }, // Flanger-ish
            { type: 'delay', enabled: true, params: { model: 'digital', time: 350, feedback: 30, mix: 20 } }
        ]
    },
    {
        id: 'vito_bratta',
        name: '🦁 White Lion',
        description: 'Melodic Tapping',
        amp: { model: 'soldano_slo', params: { gain: 75, bass: 6, mid: 6, treble: 7, presence: 6, master: 65 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'compressor', enabled: true, params: { model: 'studio', threshold: -20, ratio: 4, attack: 10 } },
            { type: 'chorus', enabled: true, params: { model: 'tri', rate: 0.5, depth: 60, mix: 40 } },
            { type: 'delay', enabled: true, params: { model: 'digital', time: 420, feedback: 35, mix: 30 } }
        ]
    },
    {
        id: 'marty_friedman',
        name: '🌪️ Tornado',
        description: 'Exotic Thrash Lead',
        amp: { model: 'peavey_6505', params: { gain: 88, bass: 6, mid: 7, treble: 8, presence: 7, master: 60 } },
        cabinet: { type: '4x12_closed', mic: 'close', mix: 100 },
        effects: [
            { type: 'distortion', enabled: true, params: { model: 'tube', gain: 40, tone: 6000, mix: 70 } }, // Boost
            { type: 'eq', enabled: true, params: { model: 'vintage', low: 0, mid: 3, high: 2 } }, // Mid Boost
            { type: 'reverb', enabled: true, params: { model: 'hall', decay: 3, tone: 50, mix: 20 } }
        ]
    }
];
