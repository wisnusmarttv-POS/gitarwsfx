import Knob from './Knob.jsx';
import { CABINET_TYPES, MIC_POSITIONS } from '../audio/cabinetSim.js';

export default function CabinetPanel({ cabinetType, micPosition, mix, onCabinetChange, onMicChange, onMixChange }) {
    const cab = CABINET_TYPES.find(c => c.id === cabinetType) || CABINET_TYPES[0];

    return (
        <div className="cabinet-panel">
            <div className="cabinet-header">
                <span className="cabinet-icon">{cab.icon}</span>
                <h3>CABINET</h3>
            </div>

            <div className="cabinet-visual">
                <div className={`cabinet-box cab-${cabinetType}`}>
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
                    <label>Cabinet Type</label>
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
                    <label>Mic Position</label>
                    <select
                        className="cabinet-selector"
                        value={micPosition}
                        onChange={(e) => onMicChange(e.target.value)}
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
                    size={50}
                    onChange={onMixChange}
                />
            </div>
        </div>
    );
}
