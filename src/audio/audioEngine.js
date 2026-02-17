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
  wetGain.gain.value = 1; // Default Active (Normal Mode)

  // Dry gain for bypass (signal bypasses effects)
  dryGain = ctx.createGain();
  dryGain.gain.value = 0; // Default Muted (Normal Mode)

  // Connect both paths to Master
  dryGain.connect(masterGain);
  wetGain.connect(masterGain); // Wet Chain -> Master

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
  const ctx = getAudioContext(); // Ensure context created
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


export async function connectInput(deviceId = null, channel = 'mix') {
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
        latencyHint: 'interactive'
      }
    });

    inputNode = ctx.createMediaStreamSource(mediaStream);

    // Channel Routing
    const splitter = ctx.createChannelSplitter(2);
    const monoGain = ctx.createGain();
    inputGainNode = monoGain; // Store reference

    inputNode.connect(splitter);

    if (channel === 'mix') {
      // Sum L+R (Default)
      splitter.connect(monoGain, 0);
      splitter.connect(monoGain, 1);
      console.log(`Audio Input: ${mediaStream.id} (Stereo Mix)`);
    } else if (channel === 0) {
      // Left Channel Only (Input 1)
      splitter.connect(monoGain, 0);
      console.log(`Audio Input: ${mediaStream.id} (Left/Input 1 Only)`);
    } else if (channel === 1) {
      // Right Channel Only (Input 2)
      splitter.connect(monoGain, 1);
      console.log(`Audio Input: ${mediaStream.id} (Right/Input 2 Only)`);
    }

    // Connect summed/selected signal to input analyser and chain
    monoGain.connect(analyserInput);

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
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

export function setInputVolume(value) {
  if (inputGainNode) {
    // Value 0-2 (0% to 200%)
    inputGainNode.gain.setTargetAtTime(value, getAudioContext().currentTime, 0.01);
  }
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
  // The incoming connection (monoGain -> analyserInput) remains intact.
  analyserInput.disconnect();

  // Rebuild dry path (for bypass mode)
  analyserInput.connect(dryGain);
  dryGain.disconnect();
  dryGain.connect(masterGain);

  // Disconnect wetGain outputs and reconnect to master
  wetGain.disconnect();
  wetGain.connect(masterGain);

  // Build wet chain: analyserInput -> [effects] -> [amp] -> [cabinet] -> wetGain
  let lastNode = analyserInput;

  // Pre-cab effects (everything except noisegate)
  const preCabEffects = effects.filter(e => e.node && e.enabled && e.typeId !== 'noisegate');
  const postCabEffects = effects.filter(e => e.node && e.enabled && e.typeId === 'noisegate');

  preCabEffects.forEach(effect => {
    lastNode.connect(effect.node);
    lastNode = effect.outputNode || effect.node;
    console.log('  -> Pre-Cab Effect:', effect.typeId);
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

  // Post-cab effects (noisegate)
  postCabEffects.forEach(effect => {
    lastNode.connect(effect.node);
    lastNode = effect.outputNode || effect.node;
    console.log('  -> Post-Cab Effect:', effect.typeId);
  });

  // Final: connect to wet output
  lastNode.connect(wetGain);

  console.log('=== Signal Chain Built OK ===');
}

export function setAmpParams(params) {
  // If ampNode exists and has updateParams method
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
      // Bypass Mode: Hear Clean Only
      dryGain.gain.setTargetAtTime(1, now, 0.01);     // Open Dry Path
      wetGain.gain.setTargetAtTime(0, now, 0.01);     // Mute Wet Path
    } else {
      // Normal Mode
      dryGain.gain.setTargetAtTime(0, now, 0.01);     // Mute Dry Path
      wetGain.gain.setTargetAtTime(1, now, 0.01);     // Open Wet Path
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
      // Also connect directly to masterGain so test tone works without input connected
      if (masterGain) {
        testGain.connect(masterGain);
      }
      testOsc.start();
      console.log('Test Tone ON: analyserInput:', !!analyserInput, '| masterGain:', !!masterGain);
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
    analyserOut: analyserOutput ? 'active' : 'null'
  };
}
