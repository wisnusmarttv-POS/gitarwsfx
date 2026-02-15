import { useState, useCallback, useRef, useEffect } from 'react';
import LCDScreen from './components/LCDScreen.jsx';
import Footswitches from './components/Footswitches.jsx';
import ExpressionPedal from './components/ExpressionPedal.jsx';
import AmpPanel from './components/AmpPanel.jsx';
import CabinetPanel from './components/CabinetPanel.jsx';
import EffectPedal from './components/EffectPedal.jsx';
import SignalChain from './components/SignalChain.jsx';
import Knob from './components/Knob.jsx';
import VUMeter from './components/VUMeter.jsx';
import PatchList from './components/PatchList.jsx';
import Tuner from './components/Tuner.jsx';
import { initAudioEngine, connectInput, disconnectInput, buildSignalChain, setMasterVolume, setGlobalBypass, getInputAnalyser, getOutputAnalyser } from './audio/audioEngine.js';
import { EFFECT_TYPES } from './audio/effects.js';
import { createAmp, AMP_MODELS } from './audio/ampModels.js';
import { createCabinet } from './audio/cabinetSim.js';
import { getAllPresets, savePreset, deletePreset, exportPreset, importPreset, createPresetSnapshot, renamePreset } from './presets/presetManager.js';
import './index.css';

const BANK_SIZE = 4;

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  const [masterVol, setMasterVol] = useState(80);
  const [bypass, setBypass] = useState(false);
  const [presets, setPresets] = useState([]);
  const [currentPresetId, setCurrentPresetId] = useState(null);

  // Bank State
  const [currentBank, setCurrentBank] = useState(0);

  // Selection state for Multi-FX UI
  const [selectedBlockId, setSelectedBlockId] = useState('amp');

  const handleBlockSelect = useCallback((id) => {
    setSelectedBlockId(prev => (prev === id ? null : id));
  }, []);

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
  const [cabEnabled, setCabEnabled] = useState(true);
  const cabRef = useRef(null);

  // Initialize
  useEffect(() => {
    initAudioEngine();
    setPresets(getAllPresets());

    // Initialize or Sync effects
    // We check if we already have effects (from partial state? or previous init) 
    // But since this is mount, usually we enable defaults. 
    // To support adding new effect types during dev without full reset, we can merge.

    setEffects(prev => {
      const currentIds = new Set(prev.map(fx => fx.typeId));
      const missingTypes = EFFECT_TYPES.filter(t => !currentIds.has(t.id));

      if (prev.length === 0) {
        // First init
        return EFFECT_TYPES.map((type, index) => {
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
      }

      if (missingTypes.length > 0) {
        // Append missing
        const newEffects = missingTypes.map((type, index) => {
          const effect = type.create();
          return {
            id: `${type.id}_${prev.length + index}`,
            typeId: type.id,
            effect,
            enabled: false,
            node: effect.node,
            outputNode: effect.outputNode
          };
        });
        return [...prev, ...newEffects];
      }

      return prev;
    });

    const amp = createAmp('marshall_jcm800');
    ampRef.current = amp;
    setAmpParams({ ...amp.params });

    const cab = createCabinet('4x12_closed', 'close', 100);
    cabRef.current = cab;
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    // Pass cabEnabled to buildSignalChain (need to update audioEngine too or handle here?)
    // Actually, buildSignalChain takes 'cabinet' object. We can pass null if disabled, 
    // or better yet, let's update buildSignalChain signature or logic to respect enabled flag.
    // For now, let's pass cabRef.current only if enabled.
    buildSignalChain(effects, ampRef.current, cabEnabled ? cabRef.current : null);
  }, [effects, isConnected, ampModelId, cabType, micPos, ampChannel, cabEnabled]);

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

  const handleColorChange = useCallback((id, color) => {
    setEffects(prev => prev.map(fx => {
      if (fx.id === id) {
        // Update the effect object itself if necessary for persistence/engine
        if (fx.effect) fx.effect.color = color;
        // Search in params if color is stored there? No, usually top level on effect object.
        return { ...fx, effect: { ...fx.effect, color } };
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
    // ... logic same ...
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    setCurrentPresetId(presetId);

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
      setCabEnabled(preset.cabinet.enabled !== undefined ? preset.cabinet.enabled : true); // Default true
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
            if (pe.color) newEffects[idx].effect.color = pe.color; // Load color from preset
          }
        });
        return newEffects;
      });
    }
  }, [presets]);

  const handleRenamePreset = useCallback((id, newName) => {
    const updated = renamePreset(id, newName);
    if (updated) {
      setPresets(getAllPresets());
    }
  }, []);

  const handleSaveNewPreset = useCallback((name) => {
    const snapshot = createPresetSnapshot(
      name,
      '',
      effects,
      { modelId: ampModelId, params: ampRef.current.params },
      { cabinetId: cabType, micPosition: micPos, params: { mix: { value: cabMix } } }
    );
    const saved = savePreset(snapshot);
    setPresets(getAllPresets());
    setCurrentPresetId(saved.id);
  }, [effects, ampModelId, cabType, micPos, cabMix]);

  const handleDeletePreset = useCallback((id) => {
    deletePreset(id);
    setPresets(getAllPresets());
    if (currentPresetId === id) {
      setCurrentPresetId(null);
    }
  }, [currentPresetId]);

  const handleOverwritePreset = useCallback(() => {
    const currentPreset = presets.find(p => p.id === currentPresetId);
    if (!currentPreset || currentPreset.isFactory) return;

    if (window.confirm(`Overwrite preset "${currentPreset.name}" with current settings?`)) {
      const snapshot = createPresetSnapshot(
        currentPreset.name,
        currentPreset.description,
        effects,
        { modelId: ampModelId, params: ampRef.current.params },
        { cabinetId: cabType, micPosition: micPos, params: { mix: { value: cabMix } }, enabled: cabEnabled },
        currentPresetId // Pass existing ID to overwrite
      );
      savePreset(snapshot);
      setPresets(getAllPresets());
    }
  }, [currentPresetId, presets, effects, ampModelId, cabType, micPos, cabMix]);

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

  // Drag and Drop State
  const [draggedEffectId, setDraggedEffectId] = useState(null);

  const handleDragStart = useCallback((e, id) => {
    setDraggedEffectId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image or default? Default is fine for now, or we can set a ghost image.
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    if (!draggedEffectId || draggedEffectId === targetId) return;

    setEffects(prev => {
      const newEffects = [...prev];
      const draggedIndex = newEffects.findIndex(fx => fx.id === draggedEffectId);
      const targetIndex = newEffects.findIndex(fx => fx.id === targetId);

      if (draggedIndex < 0 || targetIndex < 0) return prev;

      // Move the item
      const [removed] = newEffects.splice(draggedIndex, 1);
      newEffects.splice(targetIndex, 0, removed);

      return newEffects;
    });
    setDraggedEffectId(null);
  }, [draggedEffectId]);

  const handleDragEnd = useCallback(() => {
    setDraggedEffectId(null);
  }, []);

  // Render
  const renderEditArea = () => {
    // If Amp is explicitly selected, show full Amp panel
    if (selectedBlockId === 'amp') {
      return (
        <AmpPanel
          currentModel={ampModelId}
          params={ampParams}
          channel={ampChannel}
          onModelChange={handleAmpModelChange}
          onParamChange={handleAmpParamChange}
          onChannelChange={handleChannelChange}
        />
      );
    }

    if (selectedBlockId === 'cab') return (
      <CabinetPanel
        cabinetType={cabType}
        micPosition={micPos}
        mix={cabMix}
        enabled={cabEnabled}
        onCabinetChange={handleCabChange}
        onMicChange={handleMicChange}
        onMixChange={handleCabMixChange}
        onToggle={() => setCabEnabled(prev => !prev)}
      />
    );
    if (selectedBlockId === 'input') return <div style={{ color: 'white', textAlign: 'center' }}><h3>INPUT / GATE</h3><p>Global Input Settings</p></div>;
    if (selectedBlockId === 'output') return <div style={{ color: 'white', textAlign: 'center' }}><h3>MASTER OUTPUT</h3><VUMeter analyser={getOutputAnalyser()} label="OUT" color="#4488ff" /></div>;

    const effect = effects.find(fx => fx.id === selectedBlockId);
    if (effect) {
      return (
        <div className="edit-stack">
          {/* Always show Amp in compact mode above effects */}
          <div className="stack-top">
            <AmpPanel
              currentModel={ampModelId}
              params={ampParams}
              channel={ampChannel}
              onModelChange={handleAmpModelChange}
              onParamChange={handleAmpParamChange}
              onChannelChange={handleChannelChange}
              compact={true}
            />
          </div>

          <div className="stack-divider"></div>

          <div className="stack-bottom">
            <div className="single-effect-editor">
              <EffectPedal
                effect={effect.effect}
                enabled={effect.enabled}
                onToggle={() => handleToggleEffect(effect.id)}
                onParamChange={(param, val) => handleParamChange(effect.id, param, val)}
                onColorChange={(color) => handleColorChange(effect.id, color)}
                color={effect.effect.color}
              />
            </div>
          </div>
        </div>
      );
    }

    // Default or empty state (also show Amp?) - For now kept simple
    return <div className="empty-edit" style={{ color: '#555' }}>SELECT BLOCK</div>;
  };

  // Render
  return (
    <div className="app-editor-container">
      {/* HEADER */}
      <header className="editor-header">
        <div className="header-logo">
          <h1>JAGAT<span>FX</span> <span className="logo-subtitle">by Wisnu Wardana</span></h1>
        </div>
        <div className="header-controls">
          <a
            href="https://www.tiktok.com/@wardana2508?is_from_webapp=1&sender_device=pc"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', marginRight: '15px', color: 'white', textDecoration: 'none' }}
            title="Follow on TikTok"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V0h-3.45v13.67a6.43 6.43 0 1 1-6.43-6.42 6.43 6.43 0 0 1 1 .09v3.45a3 3 0 1 0 1.93 2.87V0h3.48a4.81 4.81 0 0 0 \
              1.25-.17 7.79 7.79 0 0 1 3.74 1.96V5.7a4.39 4.39 0 0 0-1.2 1z"/>
            </svg>
          </a>
          <button className={`tuner-btn ${showTuner ? 'active' : ''}`} onClick={() => setShowTuner(true)}>
            TUNER
          </button>
          <div className="bpm-display">120 BPM</div>
          <button className={`connect-btn ${isConnected ? 'connected' : ''}`} onClick={isConnected ? handleDisconnect : handleConnect}>
            {isConnected ? 'LINKED' : 'CONNECT'}
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="editor-body">

        {/* CENTER STAGE */}
        <div className="center-stage">
          {/* VISUAL EDITOR */}
          <div className="visual-editor">
            {/* TOP ROW: AMP & CAB */}
            <div className="amp-section">
              {/* Amp */}
              <div
                className={`pedal-wrapper amp-wrapper ${selectedBlockId === 'amp' ? 'selected-pedal' : ''}`}
                onClick={() => handleBlockSelect('amp')}
              >
                <AmpPanel
                  currentModel={ampModelId}
                  params={ampParams}
                  channel={ampChannel}
                  onModelChange={handleAmpModelChange}
                  onParamChange={handleAmpParamChange}
                  onChannelChange={handleChannelChange}
                  compact={true}
                />
              </div>

              {/* Cab */}
              <div
                className={`pedal-wrapper cab-wrapper ${selectedBlockId === 'cab' ? 'selected-pedal' : ''}`}
                onClick={() => handleBlockSelect('cab')}
              >
                <CabinetPanel
                  cabinetType={cabType}
                  micPosition={micPos}
                  mix={cabMix}
                  enabled={cabEnabled}
                  onCabinetChange={handleCabChange}
                  onMicChange={handleMicChange}
                  onMixChange={handleCabMixChange}
                  onToggle={() => setCabEnabled(prev => !prev)}
                  compact={true}
                />
              </div>
            </div>

            {/* BOTTOM ROW: EFFECTS */}
            <div className="pedalboard-section">
              <div className="pedalboard-container">
                {effects.map((fx) => (
                  <div
                    key={fx.id}
                    className={`pedal-wrapper ${selectedBlockId === fx.id ? 'selected-pedal' : ''} ${draggedEffectId === fx.id ? 'dragging' : ''}`}
                    onClick={() => handleBlockSelect(fx.id)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, fx.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, fx.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <EffectPedal
                      effect={fx.effect}
                      enabled={fx.enabled}
                      onToggle={(e) => {
                        e?.stopPropagation();
                        handleToggleEffect(fx.id);
                      }}
                      onParamChange={(param, val) => handleParamChange(fx.id, param, val)}
                      onColorChange={(color) => handleColorChange(fx.id, color)}
                      color={fx.effect.color}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SIGNAL CHAIN STRIP */}
          <div className="chain-container">
            {/* We need to import SignalChain first, let me make sure to add the import */}
            <SignalChain
              effects={effects}
              amp={{ model: ampModelId }}
              cabinet={{ type: cabType, enabled: cabEnabled }}
              selectedBlockId={selectedBlockId}
              onSelectBlock={handleBlockSelect}
              onToggleBlock={(id) => {
                if (id === 'amp') return;
                if (id === 'cab') {
                  setCabEnabled(prev => !prev);
                  return;
                }
                handleToggleEffect(id);
              }}
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR - PRESETS */}
        <div className="preset-sidebar">
          <PatchList
            presets={presets}
            currentPresetId={currentPresetId}
            onSelect={handlePresetSelect}
            onSave={handleSaveNewPreset}
            onDelete={handleDeletePreset}
            onOverwrite={handleOverwritePreset}
            onRename={handleRenamePreset}
          />
        </div>
      </div>

      {/* TUNER OVERLAY */}
      <Tuner isOpen={showTuner} onClose={() => setShowTuner(false)} />
    </div>
  );
}

export default App;
