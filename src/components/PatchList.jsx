import React, { useState } from 'react';
import '../index.css';

export default function PatchList({ presets, currentPresetId, onSelect, onSave, onDelete, onOverwrite, onRename }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const handleSaveClick = () => {
        if (newPresetName.trim()) {
            onSave(newPresetName);
            setNewPresetName('');
            setIsCreating(false);
        }
    };

    const startEditing = (preset, e) => {
        e.stopPropagation();
        setEditingId(preset.id);
        setEditName(preset.name);
    };

    const saveEdit = (e) => {
        e.stopPropagation();
        if (editName.trim()) {
            const preset = presets.find(p => p.id === editingId);
            if (preset && preset.isFactory) {
                // If renaming a factory preset, save as NEW user preset
                onSave(editName);
            } else {
                // Rename existing user preset
                onRename(editingId, editName);
            }
            setEditingId(null);
        }
    };

    const cancelEdit = (e) => {
        e.stopPropagation();
        setEditingId(null);
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
                            {editingId === preset.id ? (
                                <div className="rename-container" style={{ display: 'flex', gap: '5px', flex: 1 }}>
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="new-patch-input"
                                        autoFocus
                                    />
                                    <button onClick={saveEdit} className="overwrite-patch-btn">💾</button>
                                    <button onClick={cancelEdit} className="delete-patch-btn" style={{ opacity: 1 }}>❌</button>
                                </div>
                            ) : (
                                <>
                                    <span className="patch-name">{preset.name}</span>
                                    <div className="patch-meta">
                                        {preset.isFactory ? (
                                            <button
                                                className="overwrite-patch-btn"
                                                onClick={(e) => startEditing(preset, e)}
                                                title="Unlock & Rename (Save as New)"
                                                style={{ opacity: 0.5, cursor: 'pointer' }}
                                            >🔒</button>
                                        ) : (
                                            <>
                                                {currentPresetId === preset.id && !editingId && (
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
                                                    className="overwrite-patch-btn" // Reusing style
                                                    onClick={(e) => startEditing(preset, e)}
                                                    title="Rename Preset"
                                                >✏️</button>
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
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
