// Audio Engine - Core audio processing manager
let audioContext = null;
let inputNode = null;
let outputNode = null;
let analyserInput = null;
let analyserOutput = null;
let mediaStream = null;
let isInitialized = false;

// Signal chain nodes
let effectNodes = [];
let ampNode = null;
let cabinetNode = null;
let masterGain = null;

let wetGain = null;
let dryGain = null;
let testOsc = null;
let testGain = null;
let inputGainNode = null; // Stores the mono summing node from connectInput
let inputHighPass = null; // High-pass filter to block hum

// Built-in input noise gate
let inputGateNode = null;
let inputGateAnalyser = null;
let inputGateFrame = null;
let inputGateThreshold = -70; // dB threshold - lowered further to prevent cutting off sustain

export function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export async function initAudioEngine() {
  if (isInitialized) return;

  const ctx = getAudioContext();

  // Create master gain
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;

  // Create wet gain for effect chain output
  wetGain = ctx.createGain();
  wetGain.gain.value = 1;

  // Dry gain for bypass
  dryGain = ctx.createGain();
  dryGain.gain.value = 0;

  // Connect both paths to Master
  dryGain.connect(masterGain);
  wetGain.connect(masterGain);

  // Create analysers for VU meters
  analyserInput = ctx.createAnalyser();
  analyserInput.fftSize = 2048;
  analyserInput.smoothingTimeConstant = 0.8;

  analyserOutput = ctx.createAnalyser();
  analyserOutput.fftSize = 2048;
  analyserOutput.smoothingTimeConstant = 0.8;

  // Connect master -> analyser -> destination
  masterGain.connect(analyserOutput);
  analyserOutput.connect(ctx.destination);

  isInitialized = true;
}

export async function getAudioInputDevices() {
  const ctx = getAudioContext();
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function getAudioOutputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audiooutput');
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function setAudioOutputDevice(deviceId) {
  const ctx = getAudioContext();
  if (ctx.setSinkId) {
    try {
      await ctx.setSinkId(deviceId);
      console.log('Audio Output set to:', deviceId);
      return true;
    } catch (err) {
      console.error('Failed to set audio output:', err);
      return false;
    }
  } else {
    console.warn('Browser does not support AudioContext.setSinkId');
    return false;
  }
}


export async function connectInput(deviceId = null, channel = 0) {
  const ctx = getAudioContext();

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 2 }
      }
    });

    console.log('Got media stream, tracks:', mediaStream.getAudioTracks().length);
    const track = mediaStream.getAudioTracks()[0];
    const settings = track.getSettings();
    console.log('Track settings:', settings);

    inputNode = ctx.createMediaStreamSource(mediaStream);

    // Channel Routing - handle both mono and stereo inputs
    const numChannels = settings.channelCount || 1;
    const monoGain = ctx.createGain();
    monoGain.gain.value = 1.0; // Restored to 100% for proper drive
    inputGainNode = monoGain;

    if (numChannels >= 2) {
      const splitter = ctx.createChannelSplitter(2);
      inputNode.connect(splitter);

      if (channel === 'mix') {
        splitter.connect(monoGain, 0);
        splitter.connect(monoGain, 1);
        console.log('Audio Input: Stereo Mix');
      } else if (channel === 0) {
        splitter.connect(monoGain, 0);
        console.log('Audio Input: Left/Input 1 Only');
      } else if (channel === 1) {
        splitter.connect(monoGain, 1);
        console.log('Audio Input: Right/Input 2 Only');
      }
    } else {
      inputNode.connect(monoGain);
      console.log('Audio Input: Mono (single channel)');
    }

    // === Input cleanup filters ===
    inputHighPass = ctx.createBiquadFilter();
    inputHighPass.type = 'highpass';
    inputHighPass.frequency.value = 80;
    inputHighPass.Q.value = 0.7;

    const notch50 = ctx.createBiquadFilter();
    notch50.type = 'notch';
    notch50.frequency.value = 50;
    notch50.Q.value = 5; // Wider notch (Q=5) to catch drifting hum

    const notch60 = ctx.createBiquadFilter();
    notch60.type = 'notch';
    notch60.frequency.value = 60;
    notch60.Q.value = 5;

    const notch100 = ctx.createBiquadFilter();
    notch100.type = 'notch';
    notch100.frequency.value = 100;
    notch100.Q.value = 10;

    const notch150 = ctx.createBiquadFilter();
    notch150.type = 'notch';
    notch150.frequency.value = 150;
    notch150.Q.value = 10;

    // === Built-in noise gate DISABLED (Causing signal cutouts) ===
    // We will rely on the Pedal Noise Gate which has visual controls
    inputGateNode = ctx.createGain();
    inputGateNode.gain.value = 1.0; // Always open by default
    inputGateAnalyser = ctx.createAnalyser();
    inputGateAnalyser.fftSize = 256;

    // Disable internal gate processing to stop signal cutting
    /* 
    const gateDataArray = new Float32Array(inputGateAnalyser.fftSize);
    function processInputGate() {
      // ... disabled ...
      inputGateFrame = requestAnimationFrame(processInputGate);
    } 
    processInputGate(); 
    */

    // Chain: monoGain -> highPass -> notch50 -> notch100 -> notch150 -> gateAnalyser + gateNode -> analyserInput
    monoGain.connect(inputHighPass);
    inputHighPass.connect(notch50);
    notch50.connect(notch100);
    notch100.connect(notch150);
    notch150.connect(inputGateAnalyser);
    notch150.connect(inputGateNode);
    inputGateNode.connect(analyserInput);

    return true;
  } catch (err) {
    console.error('Failed to connect audio input:', err);
    return false;
  }
}

export function disconnectInput() {
  if (inputNode) {
    inputNode.disconnect();
    inputNode = null;
  }
  if (inputGainNode) {
    try { inputGainNode.disconnect(); } catch (e) { }
    inputGainNode = null;
  }
  if (inputHighPass) {
    try { inputHighPass.disconnect(); } catch (e) { }
    inputHighPass = null;
  }
  if (inputGateNode) {
    try { inputGateNode.disconnect(); } catch (e) { }
    inputGateNode = null;
  }
  if (inputGateAnalyser) {
    try { inputGateAnalyser.disconnect(); } catch (e) { }
    inputGateAnalyser = null;
  }
  if (inputGateFrame) {
    cancelAnimationFrame(inputGateFrame);
    inputGateFrame = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

export function setInputVolume(value) {
  if (inputGainNode) {
    inputGainNode.gain.setTargetAtTime(value, getAudioContext().currentTime, 0.01);
  }
}

export function setInputGateThreshold(value) {
  // value: -80 to 0 dB
  inputGateThreshold = value;
}

export function buildSignalChain(effects, amp, cabinet) {
  const ctx = getAudioContext();
  if (!inputNode || !ctx || !analyserInput || !wetGain || !masterGain) {
    console.warn('buildSignalChain: missing required nodes', {
      inputNode: !!inputNode, ctx: !!ctx, analyserInput: !!analyserInput,
      wetGain: !!wetGain, masterGain: !!masterGain
    });
    return;
  }

  console.log('=== Building Signal Chain ===');
  console.log('  amp:', amp?.modelId, '| amp.inputNode:', !!amp?.inputNode);
  console.log('  cabinet:', cabinet?.cabinetId, '| cabinet.node:', !!cabinet?.node);
  console.log('  effects count:', effects?.length, '| enabled:', effects?.filter(e => e.enabled).length);

  // SAFE DISCONNECT: analyserInput.disconnect() only removes OUTGOING connections.
  analyserInput.disconnect();

  // Rebuild dry path
  analyserInput.connect(dryGain);
  dryGain.disconnect();
  dryGain.connect(masterGain);

  // Disconnect wetGain outputs and reconnect to master
  wetGain.disconnect();
  wetGain.connect(masterGain);

  // Build wet chain: analyserInput -> [noisegate FIRST] -> [effects] -> [amp] -> [cabinet] -> wetGain
  let lastNode = analyserInput;

  // NOISE GATE FIRST - before any gain stages to prevent noise amplification
  const gateEffects = effects.filter(e => e.node && e.enabled && e.typeId === 'noisegate');
  gateEffects.forEach(effect => {
    lastNode.connect(effect.node);
    lastNode = effect.outputNode || effect.node;
    console.log('  -> Noise Gate (PRE-EFFECTS)');
  });

  // Then other effects (distortion, delay, chorus, etc)
  const otherEffects = effects.filter(e => e.node && e.enabled && e.typeId !== 'noisegate');
  otherEffects.forEach(effect => {
    lastNode.connect(effect.node);
    lastNode = effect.outputNode || effect.node;
    console.log('  -> Effect:', effect.typeId);
  });

  // Amp
  ampNode = amp;
  if (amp && amp.inputNode) {
    lastNode.connect(amp.inputNode);
    lastNode = amp.outputNode || amp.inputNode;
    console.log('  -> Amp:', amp.modelId);
  }

  // Cabinet
  cabinetNode = cabinet;
  if (cabinet && cabinet.node) {
    lastNode.connect(cabinet.node);
    lastNode = cabinet.outputNode || cabinet.node;
    console.log('  -> Cabinet:', cabinet.cabinetId);
  }

  // Final: connect to wet output
  lastNode.connect(wetGain);

  console.log('=== Signal Chain Built OK ===');
}

export function setAmpParams(params) {
  if (ampNode && ampNode.updateParams) {
    ampNode.updateParams(params);
  }
}

export function setMasterVolume(value) {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(value, getAudioContext().currentTime, 0.01);
  }
}

export function setGlobalBypass(bypassed) {
  if (wetGain && dryGain) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    if (bypassed) {
      dryGain.gain.setTargetAtTime(1, now, 0.01);
      wetGain.gain.setTargetAtTime(0, now, 0.01);
    } else {
      dryGain.gain.setTargetAtTime(0, now, 0.01);
      wetGain.gain.setTargetAtTime(1, now, 0.01);
    }
  }
}

export function getInputAnalyser() {
  return analyserInput;
}

export function toggleTestTone(enabled) {
  const ctx = getAudioContext();
  if (enabled) {
    if (!testOsc) {
      testOsc = ctx.createOscillator();
      testOsc.type = 'sine';
      testOsc.frequency.value = 440;
      testGain = ctx.createGain();
      testGain.gain.value = 0.5;
      testOsc.connect(testGain);
      if (analyserInput) {
        testGain.connect(analyserInput);
      }
      if (masterGain) {
        testGain.connect(masterGain);
      }
      testOsc.start();
      console.log('Test Tone ON');
    }
  } else {
    if (testOsc) {
      try {
        testOsc.stop();
        testOsc.disconnect();
        testGain.disconnect();
      } catch (e) {
        console.error(e);
      }
      testOsc = null;
      testGain = null;
    }
  }
}

export function getOutputAnalyser() {
  return analyserOutput;
}

export function getDiagnostics() {
  const ctx = getAudioContext();
  return {
    ctxState: ctx ? ctx.state : 'null',
    masterGain: masterGain ? masterGain.gain.value : 'null',
    wetGain: wetGain ? wetGain.gain.value : 'null',
    dryGain: dryGain ? dryGain.gain.value : 'null',
    inputConnected: !!inputNode,
    testOsc: !!testOsc,
    analyserIn: analyserInput ? 'active' : 'null',
    analyserOut: analyserOutput ? 'active' : 'null',
    inputGateThreshold: inputGateThreshold
  };
}
