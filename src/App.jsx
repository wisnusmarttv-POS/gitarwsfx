import { useState, useCallback, useRef, useEffect } from 'react';
import LCDScreen from './components/LCDScreen.jsx';
import Footswitches from './components/Footswitches.jsx';
import ExpressionPedal from './components/ExpressionPedal.jsx';
import AmpPanel from './components/AmpPanel.jsx';
import CabinetPanel from './components/CabinetPanel.jsx';
import EffectPedal from './components/EffectPedal.jsx';
import Knob from './components/Knob.jsx';
import VUMeter from './components/VUMeter.jsx';
import { initAudioEngine, connectInput, disconnectInput, buildSignalChain, setMasterVolume, setGlobalBypass, getInputAnalyser, getOutputAnalyser } from './audio/audioEngine.js';
import { EFFECT_TYPES } from './audio/effects.js';
import { createAmp, AMP_MODELS } from './audio/ampModels.js';
import { createCabinet } from './audio/cabinetSim.js';
import { getAllPresets, savePreset, deletePreset, exportPreset, importPreset, createPresetSnapshot } from './presets/presetManager.js';
import './index.css';

const BANK_SIZE = 4;

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [masterVol, setMasterVol] = useState(80);
  const [bypass, setBypass] = useState(false);
  const [presets, setPresets] = useState([]);
  const [currentPresetId, setCurrentPresetId] = useState(null);

  // Bank State
  const [currentBank, setCurrentBank] = useState(0);

  // Selection state for Multi-FX UI
  const [selectedBlockId, setSelectedBlockId] = useState('amp');

  // Effects state
  const [effects, setEffects] = useState([]);

  // Amp state
  const [ampModelId, setAmpModelId] = useState('marshall_jcm800');
  const [ampParams, setAmpParams] = useState(null);
  const [ampChannel, setAmpChannel] = useState('crunch');
  const ampRef = useRef(null);

  // Cabinet state
  const [cabType, setCabType] = useState('4x12_closed');
  const [micPos, setMicPos] = useState('close');
  const [cabMix, setCabMix] = useState(100);
  const cabRef = useRef(null);

  // Initialize
  useEffect(() => {
    initAudioEngine();
    setPresets(getAllPresets());

    const defaultEffects = EFFECT_TYPES.map((type, index) => {
      const effect = type.create();
      return {
        id: `${type.id}_${index}`,
        typeId: type.id,
        effect,
        enabled: false,
        node: effect.node,
        outputNode: effect.outputNode
      };
    });
    setEffects(defaultEffects);

    const amp = createAmp('marshall_jcm800');
    ampRef.current = amp;
    setAmpParams({ ...amp.params });

    const cab = createCabinet('4x12_closed', 'close', 100);
    cabRef.current = cab;
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    buildSignalChain(effects, ampRef.current, cabRef.current);
  }, [effects, isConnected, ampModelId, cabType, micPos, ampChannel]);

  const handleConnect = useCallback(async () => {
    await initAudioEngine();
    const success = await connectInput();
    if (success) setIsConnected(true);
  }, [effects]);

  const handleDisconnect = useCallback(() => {
    disconnectInput();
    setIsConnected(false);
  }, []);

  const handleVolume = useCallback((val) => {
    setMasterVol(val);
    setMasterVolume(val / 100);
  }, []);

  const handleToggleEffect = useCallback((id) => {
    setEffects(prev => prev.map(fx =>
      fx.id === id ? { ...fx, enabled: !fx.enabled } : fx
    ));
  }, []);

  const handleParamChange = useCallback((id, param, val) => {
    setEffects(prev => prev.map(fx => {
      if (fx.id === id) {
        fx.effect.update({ [param]: val });
        return { ...fx };
      }
      return fx;
    }));
  }, []);

  const handleAmpModelChange = useCallback((modelId) => {
    const model = AMP_MODELS.find(m => m.id === modelId);
    if (!model) return;
    const amp = createAmp(modelId, model.defaults);
    ampRef.current = amp;
    setAmpModelId(modelId);
    setAmpParams({ ...amp.params });
  }, []);

  const handleAmpParamChange = useCallback((param, val) => {
    if (ampRef.current) {
      ampRef.current.update({ [param]: val });
      setAmpParams({ ...ampRef.current.params });
    }
  }, []);

  const handleChannelChange = useCallback((channel) => {
    setAmpChannel(channel);
    const channelGains = { clean: 25, crunch: 55, highgain: 80 };
    if (ampRef.current) {
      ampRef.current.update({ gain: channelGains[channel] });
      setAmpParams({ ...ampRef.current.params });
    }
  }, []);

  const handleCabChange = useCallback((type) => {
    setCabType(type);
    const cab = createCabinet(type, micPos, cabMix);
    cabRef.current = cab;
  }, [micPos, cabMix]);

  const handleMicChange = useCallback((pos) => {
    setMicPos(pos);
    const cab = createCabinet(cabType, pos, cabMix);
    cabRef.current = cab;
  }, [cabType, cabMix]);

  const handleCabMixChange = useCallback((mix) => {
    setCabMix(mix);
    if (cabRef.current) {
      cabRef.current.update({ mix });
    }
  }, []);

  // Preset Logic
  const handlePresetSelect = useCallback((presetId) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    setCurrentPresetId(presetId);

    // Logic to select appropriate bank if loaded directly
    // Not implemented for generic load, but handled in footswitch

    if (preset.amp) {
      const amp = createAmp(preset.amp.model, preset.amp.params);
      ampRef.current = amp;
      setAmpModelId(preset.amp.model);
      setAmpParams({ ...amp.params });
    }
    if (preset.cabinet) {
      setCabType(preset.cabinet.type);
      setMicPos(preset.cabinet.mic);
      setCabMix(preset.cabinet.mix);
      const cab = createCabinet(preset.cabinet.type, preset.cabinet.mic, preset.cabinet.mix);
      cabRef.current = cab;
    }
    if (preset.effects) {
      setEffects(prev => {
        const newEffects = prev.map(fx => ({ ...fx, enabled: false }));
        preset.effects.forEach(pe => {
          const idx = newEffects.findIndex(fx => fx.typeId === pe.type);
          if (idx >= 0) {
            newEffects[idx].enabled = pe.enabled;
            if (pe.params) newEffects[idx].effect.update(pe.params);
          }
        });
        return newEffects;
      });
    }
  }, [presets]);

  // Footswitches Handlers
  const handlePrevBank = useCallback(() => {
    setCurrentBank(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextBank = useCallback(() => {
    const maxBank = Math.ceil(presets.length / BANK_SIZE) - 1;
    setCurrentBank(prev => (prev < maxBank ? prev + 1 : prev));
  }, [presets]);

  const handleSelectPresetInBank = useCallback((index) => {
    const globalIndex = currentBank * BANK_SIZE + index;
    if (globalIndex < presets.length) {
      handlePresetSelect(presets[globalIndex].id);
    }
  }, [currentBank, presets, handlePresetSelect]);

  const getActivePresetIndexInBank = () => {
    if (!currentPresetId) return -1;
    const index = presets.findIndex(p => p.id === currentPresetId);
    if (index === -1) return -1;
    const bank = Math.floor(index / BANK_SIZE);
    if (bank !== currentBank) return -1;
    return index % BANK_SIZE;
  };

  const activePresetIndex = getActivePresetIndexInBank();

  // Render
  const renderEditArea = () => {
    if (selectedBlockId === 'amp') return <AmpPanel currentModel={ampModelId} params={ampParams} channel={ampChannel} onModelChange={handleAmpModelChange} onParamChange={handleAmpParamChange} onChannelChange={handleChannelChange} />;
    if (selectedBlockId === 'cab') return <CabinetPanel cabinetType={cabType} micPosition={micPos} mix={cabMix} onCabinetChange={handleCabChange} onMicChange={handleMicChange} onMixChange={handleCabMixChange} />;
    if (selectedBlockId === 'input') return <div style={{ color: 'white', textAlign: 'center' }}><h3>INPUT / GATE</h3><p>Global Input Settings</p></div>;
    if (selectedBlockId === 'output') return <div style={{ color: 'white', textAlign: 'center' }}><h3>MASTER OUTPUT</h3><VUMeter analyser={getOutputAnalyser()} label="OUT" color="#4488ff" /></div>;

    const effect = effects.find(fx => fx.id === selectedBlockId);
    if (effect) return <div className="single-effect-editor" style={{ display: 'flex', justifyContent: 'center' }}><EffectPedal effect={effect.effect} enabled={effect.enabled} onToggle={() => handleToggleEffect(effect.id)} onParamChange={(param, val) => handleParamChange(effect.id, param, val)} color={effect.effect.color} /></div>;
    return <div className="empty-edit" style={{ color: '#555' }}>SELECT BLOCK</div>;
  };

  return (
    <div className="multi-fx-console">
      <div className="console-main-area">
        <div className="top-panel">
          <div className="lcd-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: '#0cc', fontSize: '12px' }}>BANK {currentBank + 1}</span>
              <button className={`connect-btn ${isConnected ? 'connected' : ''}`} onClick={isConnected ? handleDisconnect : handleConnect} style={{ padding: '2px 8px', fontSize: '10px' }}>
                {isConnected ? 'LIVE' : 'BYPASS'}
              </button>
            </div>
            <LCDScreen
              presetName={presets.find(p => p.id === currentPresetId)?.name}
              effects={effects}
              amp={{ model: ampModelId, params: ampParams }}
              cabinet={{ type: cabType, mic: micPos }}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
            />
          </div>

          <div className="knob-section">
            {/* Global/Quick Knobs mimicking GP-200 */}
            <Knob value={masterVol} min={0} max={100} label="MASTER" size={40} onChange={handleVolume} color="#fff" />
            <div style={{ width: 20 }}></div> {/* Spacer */}
            <Knob value={ampParams?.gain ?? 50} min={0} max={100} label="GAIN" size={40} onChange={(v) => handleAmpParamChange('gain', v)} color="#ffcc00" />
            <Knob value={ampParams?.presence ?? 50} min={0} max={100} label="PRESENCE" size={40} onChange={(v) => handleAmpParamChange('presence', v)} color="#ffcc00" />

            {/* Row 2 */}
            <Knob value={ampParams?.bass ?? 50} min={0} max={100} label="BASS" size={40} onChange={(v) => handleAmpParamChange('bass', v)} color="#ffcc00" />
            <Knob value={ampParams?.mid ?? 50} min={0} max={100} label="MID" size={40} onChange={(v) => handleAmpParamChange('mid', v)} color="#ffcc00" />
            <Knob value={ampParams?.treble ?? 50} min={0} max={100} label="TREBLE" size={40} onChange={(v) => handleAmpParamChange('treble', v)} color="#ffcc00" />
            <div>{/* Placeholder for Para/Encode */}</div>
          </div>
        </div>

        <div className="edit-display-area">
          {renderEditArea()}
        </div>

        <div className="bottom-panel">
          <Footswitches
            onPrevBank={handlePrevBank}
            onNextBank={handleNextBank}
            onSelectPreset={handleSelectPresetInBank}
            activePresetIndex={activePresetIndex}
          />
        </div>
      </div>

      <div className="console-right">
        <ExpressionPedal />
      </div>
    </div>
  );
}

export default App;
