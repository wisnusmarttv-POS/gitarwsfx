// Preset Manager - Save/Load/Export/Import presets via LocalStorage
import { FACTORY_PRESETS } from './factoryPresets.js';

const STORAGE_KEY = 'guitarEffectsPresets';

export function getFactoryPresets() {
    return FACTORY_PRESETS.map(p => ({ ...p, isFactory: true }));
}

export function getUserPresets() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data).map(p => ({ ...p, isFactory: false }));
        }
    } catch (e) {
        console.error('Failed to load presets:', e);
    }
    return [];
}

export function getAllPresets() {
    return [...getFactoryPresets(), ...getUserPresets()];
}

export function savePreset(preset) {
    const userPresets = getUserPresets();
    const existingIndex = userPresets.findIndex(p => p.id === preset.id);

    const presetData = {
        ...preset,
        id: preset.id || `user_${Date.now()}`,
        isFactory: false,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        userPresets[existingIndex] = presetData;
    } else {
        presetData.createdAt = new Date().toISOString();
        userPresets.push(presetData);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
    return presetData;
}

export function deletePreset(presetId) {
    const userPresets = getUserPresets().filter(p => p.id !== presetId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
}

export function exportPreset(preset) {
    const data = JSON.stringify(preset, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function importPreset(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const preset = JSON.parse(e.target.result);
                if (!preset.name || !preset.effects) {
                    reject(new Error('Invalid preset file'));
                    return;
                }
                preset.id = `imported_${Date.now()}`;
                preset.isFactory = false;
                const saved = savePreset(preset);
                resolve(saved);
            } catch (err) {
                reject(new Error('Failed to parse preset file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Serialize current app state into a preset object
export function createPresetSnapshot(name, description, effects, amp, cabinet, id = null) {
    return {
        id: id || `user_${Date.now()}`,
        name,
        description: description || '',
        amp: {
            model: amp.modelId,
            params: Object.fromEntries(
                Object.entries(amp.params).map(([k, v]) => [k, v.value])
            )
        },
        cabinet: {
            type: cabinet.cabinetId,
            mic: cabinet.micPosition,
            mix: cabinet.params.mix.value
        },
        effects: effects.map(e => ({
            type: e.typeId,
            enabled: e.enabled,
            color: e.effect.color, // Save custom color
            params: Object.fromEntries(
                Object.entries(e.effect.params).map(([k, v]) => [k, v.value])
            )
        }))
    };
}
