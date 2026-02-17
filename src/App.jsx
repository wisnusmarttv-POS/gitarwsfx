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
import InputControls from './components/InputControls.jsx';
import Tuner from './components/Tuner.jsx';
import { initAudioEngine, connectInput, disconnectInput, buildSignalChain, setAmpParams, setMasterVolume, setGlobalBypass, toggleTestTone, getAudioContext, getOutputAnalyser, getInputAnalyser, setAudioOutputDevice, getDiagnostics, setInputVolume } from './audio/audioEngine';
import { EFFECT_TYPES } from './audio/effects.js';
import { createAmp, AMP_MODELS } from './audio/ampModels.js';
import { createCabinet } from './audio/cabinetSim.js';
import { getAllPresets, savePreset, deletePreset, exportPreset, importPreset, createPresetSnapshot, renamePreset } from './presets/presetManager.js';
import './index.css';

const BANK_SIZE = 4;

function App() {
  // alert('2. APP COMPONENT START');
  const [isConnected, setIsConnected] = useState(false);
  const [inputDevices, setInputDevices] = useState([]);

  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');
  // Channel Selection: 'mix', 0 (Left), or 1 (Right)
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [diagnostics, setDiagnostics] = useState({});
  const [showTuner, setShowTuner] = useState(false);
  const [isTestToneActive, setIsTestToneActive] = useState(false);
  const [masterVol, setMasterVol] = useState(40);
  const [inputGain, setInputGainState] = useState(50);
  const [gateThreshold, setGateThresholdState] = useState(-60);
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

  // Initialize - Only load presets and UI placeholders (NO AudioContext here)
  useEffect(() => {
    console.log('App v2.1 Loaded - AudioContext Creation Deferred');
    setPresets(getAllPresets());

    // Create placeholder effect entries for UI (no audio nodes yet)
    // Enable Noise Gate by default to help with high-gain hum
    setEffects(EFFECT_TYPES.map((type, index) => ({
      id: `${type.id}_${index}`,
      typeId: type.id,
      effect: { name: type.name, color: '#666', params: {}, update: () => { } },
      enabled: type.id === 'noisegate', // Default enable Noise Gate
      node: null,
      outputNode: null
    })));
  }, []);

  // Build signal chain when connected and dependencies change
  useEffect(() => {
    if (!isConnected) return;

    // Ensure Amp exists (Safety Check)
    if (!ampRef.current) {
      console.warn('AmpRef was null during build. Creating default amp.');
      const amp = createAmp(ampModelId);
      ampRef.current = amp;
      setAmpParams({ ...amp.params });
    }

    console.log('Building Chain with Amp:', ampRef.current?.modelId);
    buildSignalChain(effects, ampRef.current, cabEnabled ? cabRef.current : null);
  }, [effects, isConnected, ampModelId, cabType, micPos, ampChannel, cabEnabled]);

  const handleConnect = useCallback(async () => {
    // Init audio engine FIRST (creates AudioContext after user gesture)
    await initAudioEngine();

    // Now create effects with real audio nodes (AudioContext exists and is allowed)
    setEffects(prev => {
      return EFFECT_TYPES.map((type, index) => {
        // Check if we already have a real audio node for this effect
        const existing = prev.find(fx => fx.typeId === type.id && fx.node);
        if (existing) return existing;

        const effect = type.create();
        const prevFx = prev.find(fx => fx.typeId === type.id);
        return {
          id: `${type.id}_${index}`,
          typeId: type.id,
          effect,
          enabled: prevFx ? prevFx.enabled : false,
          node: effect.node,
          outputNode: effect.outputNode
        };
      });
    });

    // Create amp and cabinet with real audio nodes
    if (!ampRef.current) {
      const amp = createAmp(ampModelId);
      ampRef.current = amp;
      setAmpParams({ ...amp.params });
    }
    if (!cabRef.current) {
      const cab = createCabinet(cabType, micPos, cabMix);
      cabRef.current = cab;
    }

    // Step 1: Get mic permission first with a temp stream to enumerate devices
    let tempStream = null;
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Mic permission denied:', err);
      return;
    }

    // Step 2: Enumerate devices (now we have permission, labels will be available)
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
    setInputDevices(audioInputs);
    setOutputDevices(audioOutputs);

    // Stop temp stream immediately
    tempStream.getTracks().forEach(t => t.stop());

    // Step 3: Auto-select best device (prefer external/USB over built-in)
    let bestDeviceId = selectedDeviceId;
    if (!bestDeviceId || bestDeviceId === '') {
      // Try to find an external audio interface (USB, external, line-in)
      const externalDevice = audioInputs.find(d => {
        const label = (d.label || '').toLowerCase();
        return label.includes('usb') || label.includes('interface') ||
          label.includes('line') || label.includes('audio') ||
          label.includes('scarlett') || label.includes('focusrite') ||
          label.includes('behringer') || label.includes('steinberg') ||
          label.includes('presonus') || label.includes('m-audio') ||
          label.includes('asio') || label.includes('external');
      });

      if (externalDevice) {
        bestDeviceId = externalDevice.deviceId;
        setSelectedDeviceId(bestDeviceId);
        console.log('Auto-selected external device:', externalDevice.label);
      } else if (audioInputs.length > 0) {
        // If no external found, just use the first device  
        bestDeviceId = audioInputs[0].deviceId;
        setSelectedDeviceId(bestDeviceId);
        console.log('Using first available device:', audioInputs[0].label);
      }
    }

    // Step 4: Connect to the selected device
    const success = await connectInput(bestDeviceId, selectedChannel);
    if (success) {
      setIsConnected(true);
      console.log('Connected to device:', bestDeviceId);
    }
  }, [selectedDeviceId, selectedChannel, ampModelId, cabType, micPos, cabMix]);

  const handleDisconnect = useCallback(() => {
    disconnectInput();
    setIsConnected(false);
  }, []);

  const handleVolume = useCallback((val) => {
    setMasterVol(val);
    setMasterVolume(val / 100);
  }, []);

  const handleInputGain = useCallback((val) => {
    setInputGainState(val);
    setInputVolume(val / 100);
  }, []);

  const handleBypassToggle = useCallback(() => {
    setBypass(prev => {
      const newState = !prev;
      setGlobalBypass(newState);
      return newState;
    });
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
    if (selectedBlockId === 'output') return <div style={{ color: 'white', textAlign: 'center' }}><h3>MASTER OUTPUT</h3><p>Output Visualization Unavailable</p></div>;

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

  const handleGateThreshold = useCallback((val) => {
    setGateThresholdState(prev => {
      // Ensure value is between -80 and 0
      const newVal = Math.max(-80, Math.min(0, val));
      setInputGateThreshold(newVal);
      return newVal;
    });
  }, []);

  // Render
  return (
    <div className="app-editor-container">


      {/* HEADER */}
      <header className="editor-header">
        <div className="header-logo">
          <h1>JAGAT<span>FX</span> <span className="logo-subtitle">by Wisnu Wardana</span></h1>
        </div>
        <div className="header-controls">
          <div className="status-indicators" style={{ display: 'flex', gap: '8px', marginRight: '15px' }}>
            <div
              title="Input Status"
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#00ff88' : '#333',
                boxShadow: isConnected ? '0 0 5px #00ff88' : 'none'
              }}
            />

          </div>

          {/* Device Selector - show when devices are available */}
          {inputDevices.length > 0 && (
            <>
              <select
                value={selectedDeviceId}
                onChange={async (e) => {
                  const newId = e.target.value;
                  setSelectedDeviceId(newId);
                  if (isConnected) {
                    await disconnectInput();
                    const success = await connectInput(newId, selectedChannel);
                    if (success) setIsConnected(true);
                  }
                }}
                style={{
                  marginRight: '10px',
                  padding: '5px',
                  backgroundColor: '#222',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  maxWidth: '200px'
                }}
              >
                {inputDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                  </option>
                ))}
              </select>

              {/* Channel Selector */}
              <select
                value={selectedChannel}
                onChange={async (e) => {
                  const newChannel = e.target.value === 'mix' ? 'mix' : Number(e.target.value);
                  setSelectedChannel(newChannel);
                  if (isConnected) {
                    await disconnectInput();
                    const success = await connectInput(selectedDeviceId, newChannel);
                    if (success) setIsConnected(true);
                  }
                }}
                style={{
                  marginRight: '10px',
                  padding: '5px',
                  backgroundColor: '#222',
                  color: '#00ff88',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  maxWidth: '120px'
                }}
              >
                <option value="mix">Stereo Mix</option>
                <option value="0">Input 1 (L)</option>
                <option value="1">Input 2 (R)</option>
              </select>
            </>
          )}

          {/* Output Selector */}
          {isConnected && outputDevices.length > 0 && (
            <select
              value={selectedOutputId}
              onChange={async (e) => {
                const newId = e.target.value;
                setSelectedOutputId(newId);
                await setAudioOutputDevice(newId);
              }}
              style={{
                marginRight: '10px',
                padding: '5px',
                backgroundColor: '#222',
                color: '#4488ff', // Blue text for output
                border: '1px solid #444',
                borderRadius: '4px',
                maxWidth: '200px'
              }}
            >
              <option value="">Default Output</option>
              {outputDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Output ${device.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          )}

          <div style={{ width: '1px', height: '30px', backgroundColor: '#444', margin: '0 15px' }} />

          <button
            className={`bypass-btn ${bypass ? 'active' : ''}`}
            onClick={handleBypassToggle}
            style={{
              backgroundColor: bypass ? '#ffaa00' : '#333',
              color: bypass ? 'black' : 'white',
              border: '1px solid #555',
              padding: '5px 10px',
              marginRight: '10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            BYPASS
          </button>

          <a
            href="https://www.tiktok.com/@wardana2508?is_from_webapp=1&sender_device=pc"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', marginRight: '15px', color: 'white', textDecoration: 'none' }}
            title="Follow on TikTok"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
          </a>
          <button
            className={`test-tone-btn ${isTestToneActive ? 'active' : ''}`}
            onClick={() => {
              const newState = !isTestToneActive;
              setIsTestToneActive(newState);
              toggleTestTone(newState);
            }}
            style={{
              backgroundColor: isTestToneActive ? '#ff4444' : '#333',
              color: 'white',
              border: '1px solid #555',
              padding: '5px 10px',
              marginRight: '10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            TEST TONE
          </button>
          <button className={`tuner-btn ${showTuner ? 'active' : ''}`} onClick={() => setShowTuner(true)}>
            TUNER
          </button>

          <InputControls
            isConnected={isConnected}
            masterVolume={masterVol}
            inputGain={inputGain}
            globalBypass={bypass}
            inputAnalyser={getInputAnalyser()}
            outputAnalyser={getOutputAnalyser()}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onVolumeChange={handleVolume}
            onInputGainChange={handleInputGain}
            onBypassToggle={handleBypassToggle}
            gateThreshold={gateThreshold}
            onGateThresholdChange={handleGateThreshold}
          />
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
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
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
