import Knob from './Knob.jsx';
import { CABINET_TYPES, MIC_POSITIONS } from '../audio/cabinetSim.js';

export default function CabinetPanel({ cabinetType, micPosition, mix, enabled = true, onCabinetChange, onMicChange, onMixChange, onToggle, compact = false }) {
    const cab = CABINET_TYPES.find(c => c.id === cabinetType) || CABINET_TYPES[0];

    return (
        <div className={`cabinet-panel ${compact ? 'compact' : ''} ${!enabled ? 'bypassed' : ''}`}>
            {!compact && (
                <div className="cabinet-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="cabinet-icon">{cab ? cab.icon : '🔈'}</span>
                        <h3>CABINET</h3>
                    </div>
                    {onToggle && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            style={{
                                background: enabled ? '#44ff44' : '#555',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                boxShadow: enabled ? '0 0 10px #44ff44' : 'none'
                            }}
                            title={enabled ? "Bypass" : "Enable"}
                        />
                    )}
                </div>
            )}

            <div className="cabinet-visual">
                <div className={`cabinet-box cab-${cabinetType} ${compact ? 'small' : ''}`}>
                    {cabinetType.includes('4x12') ? (
                        <div className="speakers-grid four">
                            <div className="speaker" /><div className="speaker" />
                            <div className="speaker" /><div className="speaker" />
                        </div>
                    ) : cabinetType === '2x12' ? (
                        <div className="speakers-grid two">
                            <div className="speaker" /><div className="speaker" />
                        </div>
                    ) : (
                        <div className="speakers-grid one">
                            <div className="speaker" />
                        </div>
                    )}
                </div>
            </div>

            <div className="cabinet-controls">
                <div className="cabinet-select-group">
                    <label>Type</label>
                    <select
                        className="cabinet-selector"
                        value={cabinetType}
                        onChange={(e) => onCabinetChange(e.target.value)}
                    >
                        {CABINET_TYPES.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="cabinet-select-group">
                    <div className="mic-toggle-header">
                        <label>Mic</label>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className={`mic-toggle-btn ${enabled ? 'on' : 'off'}`}
                            title={enabled ? "Disable Mic/Cab Sim" : "Enable Mic/Cab Sim"}
                        >
                            {enabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <select
                        className="cabinet-selector"
                        value={micPosition}
                        onChange={(e) => onMicChange(e.target.value)}
                        disabled={!enabled}
                        style={{ opacity: enabled ? 1 : 0.5 }}
                    >
                        {MIC_POSITIONS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <Knob
                    value={mix}
                    min={0}
                    max={100}
                    label="Mix"
                    color="#88ccff"
                    size={compact ? 40 : 50}
                    onChange={onMixChange}
                />
            </div>
        </div>
    );
}
