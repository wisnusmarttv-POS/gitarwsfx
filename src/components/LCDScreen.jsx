import React, { useMemo } from 'react';
import { EFFECT_TYPES } from '../audio/effects.js';
import '../index.css';

const LCDScreen = ({
    presetName,
    effects,
    amp,
    cabinet,
    selectedBlockId,
    onSelectBlock
}) => {

    // Flatten the chain for display
    const chain = useMemo(() => {
        const items = [
            { id: 'input', type: 'input', label: 'INPUT', icon: '🎸', enabled: true },
            ...effects.map(fx => {
                const effectType = EFFECT_TYPES.find(t => t.id === fx.typeId);
                return {
                    id: fx.id,
                    type: 'effect',
                    label: (fx.effect.name || fx.typeId).toUpperCase().substring(0, 4),
                    fullLabel: fx.effect.name || fx.typeId,
                    icon: effectType?.icon || '📦',
                    enabled: fx.enabled,
                    data: fx
                };
            }),
            { id: 'amp', type: 'amp', label: 'AMP', icon: '⚡', enabled: true, data: amp },
            { id: 'cab', type: 'cab', label: 'CAB', icon: '🔊', enabled: true, data: cabinet },
            { id: 'output', type: 'output', label: 'OUT', icon: '👂', enabled: true }
        ];
        return items;
    }, [effects, amp, cabinet]);

    const selectedBlock = chain.find(b => b.id === selectedBlockId);

    return (
        <div className="lcd-screen">
            <div className="lcd-header-bar">
                <div className="preset-info">
                    <span className="bank-num">01A</span>
                    <span className="preset-title">{presetName || "USER PRESET"}</span>
                </div>
                <div className="dsp-load">
                    DSP: <div className="dsp-bar"><div className="dsp-fill" style={{ width: '45%' }}></div></div>
                </div>
            </div>

            <div className="signal-chain-container">
                <div className="signal-chain-display">
                    {chain.map((block, index) => (
                        <React.Fragment key={block.id}>
                            {index > 0 && <div className="chain-arrow">→</div>}
                            <div
                                className={`chain-block ${block.type} ${selectedBlockId === block.id ? 'active' : ''} ${!block.enabled ? 'bypassed' : ''}`}
                                onClick={() => onSelectBlock(block.id)}
                            >
                                <span className="block-icon">{block.icon}</span>
                                <span className="block-label">{block.label}</span>
                                {block.enabled && <div className="led-dot"></div>}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="lcd-parameter-preview">
                {selectedBlock?.type === 'input' && <span>INPUT GATE / LEVEL</span>}
                {selectedBlock?.type === 'amp' && <span>{amp?.model?.replace('_', ' ').toUpperCase() || 'AMP'}</span>}
                {selectedBlock?.type === 'cab' && <span>{cabinet?.type?.replace('_', ' ').toUpperCase() || 'CAB'}</span>}
                {selectedBlock?.type === 'output' && <span>MASTER OUTPUT</span>}
                {selectedBlock?.type === 'effect' && <span>{selectedBlock.fullLabel.toUpperCase()}</span>}
            </div>
        </div>
    );
};

export default LCDScreen;
