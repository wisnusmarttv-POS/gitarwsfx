import EffectPedal from './EffectPedal.jsx';

export default function Pedalboard({ effects, onToggleEffect, onParamChange }) {
    return (
        <div className="pedalboard">
            <div className="pedalboard-header">
                <h3>⚡ PEDALBOARD</h3>
                <div className="signal-flow-label">Signal Flow →</div>
            </div>
            <div className="pedalboard-grid">
                {effects.map((fx, index) => (
                    <div className="pedal-wrapper" key={fx.id}>
                        {index > 0 && <div className="signal-wire" />}
                        <EffectPedal
                            effect={fx.effect}
                            enabled={fx.enabled}
                            color={fx.effect.color}
                            onToggle={() => onToggleEffect(fx.id)}
                            onParamChange={(param, val) => onParamChange(fx.id, param, val)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
