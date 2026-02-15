import React, { useState } from 'react';
import '../index.css';

export default function PatchList({ presets, currentPresetId, onSelect, onSave, onDelete, onOverwrite }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const handleSaveClick = () => {
        if (newPresetName.trim()) {
            onSave(newPresetName);
            setNewPresetName('');
            setIsCreating(false);
        }
    };

    return (
        <div className="patch-list-container">
            <div className="patch-list-header">
                <h3>PATCH LIST</h3>
                <button
                    className="add-patch-btn"
                    onClick={() => setIsCreating(true)}
                    title="New Data"
                >+</button>
            </div>

            {isCreating && (
                <div className="new-patch-form">
                    <input
                        type="text"
                        placeholder="Patch Name..."
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="new-patch-input"
                        autoFocus
                    />
                    <div className="new-patch-actions">
                        <button onClick={handleSaveClick} className="save-btn">💾</button>
                        <button onClick={() => setIsCreating(false)} className="cancel-btn">❌</button>
                    </div>
                </div>
            )}

            <div className="patch-list-scroll">
                {presets.map((preset, index) => (
                    <div
                        key={preset.id}
                        className={`patch-item ${currentPresetId === preset.id ? 'active' : ''}`}
                        onClick={() => onSelect(preset.id)}
                    >
                        <span className="patch-index">{index + 1}</span>
                        <div className="patch-info">
                            <span className="patch-name">{preset.name}</span>
                            <div className="patch-meta">
                                {preset.isFactory ? (
                                    <span className="patch-icon" title="Factory Preset">🔒</span>
                                ) : (
                                    <>
                                        {currentPresetId === preset.id && (
                                            <button
                                                className="overwrite-patch-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOverwrite();
                                                }}
                                                title="Overwrite / Save Changes"
                                            >💾</button>
                                        )}
                                        <button
                                            className="delete-patch-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Delete preset "${preset.name}"?`)) onDelete(preset.id);
                                            }}
                                            title="Delete Preset"
                                        >🗑️</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
