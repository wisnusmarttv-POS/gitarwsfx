import VUMeter from './VUMeter.jsx';

export default function InputControls({
    isConnected,
    masterVolume,
    inputGain,
    globalBypass,
    inputAnalyser,
    outputAnalyser,
    onConnect,
    onDisconnect,
    onVolumeChange,
    onInputGainChange,
    onBypassToggle
}) {
    return (
        <div className="input-controls">
            <div className="input-section">
                <button
                    className={`connect-btn ${isConnected ? 'connected' : ''}`}
                    onClick={isConnected ? onDisconnect : onConnect}
                >
                    {isConnected ? '🔌 Connected' : '🎸 Connect Guitar'}
                </button>

                {isConnected && (
                    <div className="input-level-control" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px' }}>
                        <label style={{ fontSize: '10px', marginBottom: '2px' }}>INPUT LEVEL</label>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={inputGain}
                            onChange={(e) => onInputGainChange(Number(e.target.value))}
                            style={{ width: '80px', accentColor: '#00ff88' }}
                        />
                        <span style={{ fontSize: '10px' }}>{inputGain}%</span>
                    </div>
                )}

                {isConnected && (
                    <VUMeter analyser={inputAnalyser} label="IN" color="#00ff88" />
                )}
            </div>

            <div className="master-section">
                <div className="volume-control">
                    <label className="volume-label">🔊 Master</label>
                    <input
                        type="range"
                        className="master-slider"
                        min="0"
                        max="100"
                        value={masterVolume}
                        onChange={(e) => onVolumeChange(Number(e.target.value))}
                    />
                    <span className="volume-value">{masterVolume}%</span>
                </div>

                <button
                    className={`bypass-btn ${globalBypass ? 'active' : ''}`}
                    onClick={onBypassToggle}
                >
                    {globalBypass ? '🔇 BYPASSED' : '🔊 ACTIVE'}
                </button>
            </div>

            {isConnected && (
                <div className="output-section">
                    <VUMeter analyser={outputAnalyser} label="OUT" color="#4488ff" />
                </div>
            )}
        </div>
    );
}
