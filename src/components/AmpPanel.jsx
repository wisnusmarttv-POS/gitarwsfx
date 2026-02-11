import Knob from './Knob.jsx';
import { AMP_MODELS, AMP_CHANNELS } from '../audio/ampModels.js';

export default function AmpPanel({ currentModel, params, channel, onModelChange, onParamChange, onChannelChange }) {
    const model = AMP_MODELS.find(m => m.id === currentModel) || AMP_MODELS[0];

    return (
        <div className="amp-panel">
            <div className="amp-header">
                <div className="amp-logo">
                    <span className="amp-icon">{model.icon}</span>
                    <h3>AMP HEAD</h3>
                </div>
                <select
                    className="amp-selector"
                    value={currentModel}
                    onChange={(e) => onModelChange(e.target.value)}
                >
                    {AMP_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            <div className="amp-description">{model.description}</div>

            <div className="amp-channels">
                {AMP_CHANNELS.map(ch => (
                    <button
                        key={ch.id}
                        className={`channel-btn ${channel === ch.id ? 'active' : ''}`}
                        style={{ '--channel-color': ch.color }}
                        onClick={() => onChannelChange(ch.id)}
                    >
                        <div className={`channel-led ${channel === ch.id ? 'on' : ''}`} />
                        {ch.name}
                    </button>
                ))}
            </div>

            <div className="amp-knobs">
                {params && Object.entries(params).map(([key, param]) => (
                    <Knob
                        key={key}
                        value={param.value}
                        min={param.min}
                        max={param.max}
                        label={param.label}
                        color="#ffcc00"
                        size={56}
                        onChange={(val) => onParamChange(key, val)}
                    />
                ))}
            </div>

            <div className="amp-badge">{model.name}</div>
        </div>
    );
}
