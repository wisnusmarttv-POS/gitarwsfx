import React from 'react';
import '../index.css';
import { EFFECT_TYPES } from '../audio/effects.js';

export default function SignalChain({
    effects,
    amp,
    cabinet,
    selectedBlockId,
    onSelectBlock,
    onToggleBlock,
    onDragStart,
    onDragOver,
    onDrop
}) {
    // Helper to get color for a block type
    const getBlockColor = (typeId) => {
        // Colors similar to GP-200 screenshot
        if (typeId === 'input') return '#222'; // Pre handled separately
        if (typeId === 'amp') return '#F5A623'; // Gold/Orange
        if (typeId === 'cab') return '#D2691E'; // Chocolate/Brown
        if (typeId === 'output') return '#E6E6E6'; // Light Grey/White

        const type = EFFECT_TYPES.find(t => t.id === typeId);
        // if (!type) return '#555'; // Fallback

        switch (typeId) {
            case 'distortion': return '#ff4444'; // Red
            case 'delay': return '#ff88dd'; // Pink
            case 'reverb': return '#44aaff'; // Light Blue
            case 'modulation': return '#44ffaa'; // Cyan/Green
            case 'eq': return '#44ffff'; // Cyan
            case 'comp':
            case 'compressor': return '#FFD700'; // Yellow (Compressor)
            case 'noisegate': return '#32CD32'; // Lime Green
            case 'tremolo': return '#8A2BE2'; // Blue Violet
            case 'phaser': return '#FF1493'; // Deep Pink
            case 'compSustainer': return '#00BFFF'; // Deep Sky Blue (More vibrant than #0099CC)
            case 'stringEnsemble': return '#FFD700'; // Gold/Yellow (Vibrant)
            // Add more as needed
            default: return type ? (type.color || '#555') : '#999';
        }
    };

    const renderBlock = (id, type, label, isActive, isEnabled, onClick, onDoubleClick, draggable = false) => {
        const color = getBlockColor(type);

        return (
            <div
                key={id}
                className={`chain-node ${isActive ? 'selected' : ''} ${!isEnabled ? 'bypassed' : ''}`}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                style={{ '--block-color': color }}
                draggable={draggable}
                onDragStart={(e) => draggable && onDragStart && onDragStart(e, id)}
                onDragOver={(e) => draggable && onDragOver && onDragOver(e)}
                onDrop={(e) => draggable && onDrop && onDrop(e, id)}
            >
                <div className="node-icon-area">
                    <div className="node-icon">
                        {/* Simple icon representation */}
                        <div className="icon-badge" style={{ backgroundColor: color }}>
                            {label.substring(0, 3)}
                        </div>
                    </div>
                    <div className="node-led" style={{ backgroundColor: isEnabled ? color : '#333', boxShadow: isEnabled ? `0 0 10px ${color}` : 'none' }}></div>
                </div>
                <div className="node-label">{label}</div>
                <div className="node-arrow"></div>
            </div>
        );
    };

    return (
        <div className="signal-chain-strip">
            <div className="chain-scroll-area">
                {/* Effects Chain (Pre-Cab) */}
                {effects.filter(fx => fx.typeId !== 'noisegate').map((fx) => {
                    const type = EFFECT_TYPES.find(t => t.id === fx.typeId);
                    return renderBlock(
                        fx.id,
                        fx.typeId,
                        (type?.name || fx.typeId).toUpperCase(),
                        selectedBlockId === fx.id,
                        fx.enabled,
                        () => onSelectBlock(fx.id),
                        () => onToggleBlock(fx.id),
                        true // draggable
                    );
                })}

                {/* Amp */}
                {renderBlock(
                    'amp', 'amp', 'AMP',
                    selectedBlockId === 'amp', true,
                    () => onSelectBlock('amp'), () => { },
                    false
                )}

                {/* Cab */}
                {renderBlock(
                    'cab', 'cab', 'CAB',
                    selectedBlockId === 'cab', cabinet.enabled !== undefined ? cabinet.enabled : true,
                    () => onSelectBlock('cab'), () => onToggleBlock('cab'),
                    false
                )}

                {/* Effects Chain (Post-Cab: Noise Gate) */}
                {effects.filter(fx => fx.typeId === 'noisegate').map((fx) => {
                    const type = EFFECT_TYPES.find(t => t.id === fx.typeId);
                    return renderBlock(
                        fx.id,
                        fx.typeId,
                        (type?.name || fx.typeId).toUpperCase(),
                        selectedBlockId === fx.id,
                        fx.enabled,
                        () => onSelectBlock(fx.id),
                        () => onToggleBlock(fx.id),
                        true // draggable
                    );
                })}

                {/* VOL/Output (Placeholder for now) */}
                {renderBlock(
                    'output', 'output', 'VOL',
                    selectedBlockId === 'output', true,
                    () => onSelectBlock('output'), () => { }
                )}
            </div>
        </div>
    );
}
