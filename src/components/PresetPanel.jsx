import { useState, useRef } from 'react';

export default function PresetPanel({ presets, currentPresetId, onSelect, onSave, onDelete, onImport, onExport }) {
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [presetDesc, setPresetDesc] = useState('');
    const fileInputRef = useRef(null);

    const currentPreset = presets.find(p => p.id === currentPresetId);

    const handleSave = () => {
        if (presetName.trim()) {
            onSave(presetName.trim(), presetDesc.trim());
            setShowSaveModal(false);
            setPresetName('');
            setPresetDesc('');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onImport(file);
            e.target.value = '';
        }
    };

    return (
        <div className="preset-panel">
            <div className="preset-header">
                <h3>🎛️ PRESETS</h3>
            </div>

            <div className="preset-selector">
                <select
                    className="preset-dropdown"
                    value={currentPresetId || ''}
                    onChange={(e) => onSelect(e.target.value)}
                >
                    <option value="" disabled>Select Preset...</option>
                    <optgroup label="🏭 Factory Presets">
                        {presets.filter(p => p.isFactory).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </optgroup>
                    {presets.filter(p => !p.isFactory).length > 0 && (
                        <optgroup label="👤 User Presets">
                            {presets.filter(p => !p.isFactory).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </optgroup>
                    )}
                </select>
            </div>

            {currentPreset && (
                <div className="preset-info">
                    <span className="preset-info-name">{currentPreset.name}</span>
                    {currentPreset.description && (
                        <span className="preset-info-desc">{currentPreset.description}</span>
                    )}
                </div>
            )}

            <div className="preset-actions">
                <button className="preset-btn save" onClick={() => setShowSaveModal(true)} title="Save As">
                    💾 Save
                </button>
                {currentPreset && !currentPreset.isFactory && (
                    <button className="preset-btn delete" onClick={() => onDelete(currentPresetId)} title="Delete">
                        🗑️
                    </button>
                )}
                {currentPreset && (
                    <button className="preset-btn export" onClick={() => onExport(currentPreset)} title="Export">
                        📤
                    </button>
                )}
                <button className="preset-btn import" onClick={handleImportClick} title="Import">
                    📥
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            {showSaveModal && (
                <div className="save-modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="save-modal" onClick={e => e.stopPropagation()}>
                        <h4>💾 Save Preset</h4>
                        <input
                            type="text"
                            className="save-input"
                            placeholder="Preset name..."
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            autoFocus
                        />
                        <input
                            type="text"
                            className="save-input"
                            placeholder="Description (optional)..."
                            value={presetDesc}
                            onChange={(e) => setPresetDesc(e.target.value)}
                        />
                        <div className="save-modal-actions">
                            <button className="modal-btn confirm" onClick={handleSave}>Save</button>
                            <button className="modal-btn cancel" onClick={() => setShowSaveModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
