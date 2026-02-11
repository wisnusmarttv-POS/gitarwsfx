import Knob from './Knob.jsx';

export default function EffectPedal({ effect, enabled, onToggle, onParamChange, color }) {
    const pedalColor = color || effect.color || '#00ccff';

    return (
        <div className={`effect-pedal ${enabled ? 'active' : 'bypassed'}`} style={{ '--pedal-color': pedalColor }}>
            <div className="pedal-top">
                <div className="pedal-name">{effect.name}</div>
            </div>

            <div className="pedal-knobs">
                {Object.entries(effect.params).map(([key, param]) => (
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

            <button className="stomp-switch" onClick={onToggle}>
                <div className={`led ${enabled ? 'on' : ''}`} style={{ '--led-color': pedalColor }} />
                <div className="stomp-cap" />
            </button>
        </div>
    );
}
