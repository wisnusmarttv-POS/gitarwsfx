import Knob from './Knob.jsx';

export default function EffectPedal({ effect, enabled, onToggle, onParamChange, onColorChange, color }) {
    const pedalColor = color || effect.color || '#00ccff';

    return (
        <div className={`effect-pedal ${enabled ? 'active' : 'bypassed'}`} style={{ '--pedal-color': pedalColor }}>
            <div className="pedal-top">
                {/* Check if there's a select param, use it as the "Header" control */}
                {Object.entries(effect.params).some(([_, p]) => p.type === 'select') ? (
                    Object.entries(effect.params)
                        .filter(([_, p]) => p.type === 'select')
                        .slice(0, 1) // Only show the first select in header (usually 'model')
                        .map(([key, param]) => (
                            <div key={key} className="pedal-header-select">
                                <select
                                    value={param.value}
                                    onChange={(e) => onParamChange(key, e.target.value)}
                                    className="pedal-title-select"
                                >
                                    {param.options.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        ))
                ) : (
                    <div className="pedal-name">{effect.name}</div>
                )}

                {onColorChange && (
                    <div className="color-picker-wrapper" title="Change Color">
                        <input
                            type="color"
                            value={pedalColor}
                            onChange={(e) => onColorChange(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <div className="pedal-controls">
                {/* Knobs (Bottom) */}
                <div className="pedal-knobs">
                    {Object.entries(effect.params)
                        .filter(([_, param]) => param.type !== 'select')
                        .map(([key, param]) => (
                            <Knob
                                key={key}
                                value={param.value}
                                min={param.min}
                                max={param.max}
                                label={param.label}
                                color={pedalColor}
                                size={48}
                                step={param.step}
                                onChange={(val) => onParamChange(key, val)}
                            />
                        ))}
                </div>
            </div>

            <button className="stomp-switch" onClick={onToggle}>
                <div className={`led ${enabled ? 'on' : ''}`} style={{ '--led-color': pedalColor }} />
                <div className="stomp-cap" />
            </button>
        </div>
    );
}
