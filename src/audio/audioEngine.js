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
let bypassGain = null;
let dryGain = null;

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

  // Create bypass gain (for global bypass)
  bypassGain = ctx.createGain();
  bypassGain.gain.value = 0;

  // Dry gain for bypass
  dryGain = ctx.createGain();
  dryGain.gain.value = 0;

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

export async function connectInput() {
  const ctx = getAudioContext();

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        latencyHint: 'interactive'
      }
    });

    inputNode = ctx.createMediaStreamSource(mediaStream);
    inputNode.connect(analyserInput);

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
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

export function buildSignalChain(effects, amp, cabinet) {
  const ctx = getAudioContext();
  if (!inputNode || !ctx) return;

  // Disconnect everything from input analyser
  analyserInput.disconnect();

  // Disconnect dry bypass
  dryGain.disconnect();

  // Build chain: Input Analyser -> Effects -> Amp -> Cabinet -> Master
  let lastNode = analyserInput;

  // Also connect dry path for bypass
  analyserInput.connect(dryGain);
  dryGain.connect(masterGain);

  // Connect effects in order
  const activeEffects = effects.filter(e => e.node && e.enabled);
  activeEffects.forEach(effect => {
    // Disconnect previous connections of this effect
    try { effect.node.disconnect(); } catch (e) { }
    try { if (effect.outputNode) effect.outputNode.disconnect(); } catch (e) { }

    lastNode.connect(effect.node);
    lastNode = effect.outputNode || effect.node;
  });

  // Connect amp if present
  if (amp && amp.inputNode) {
    try { amp.inputNode.disconnect(); } catch (e) { }
    try { if (amp.outputNode) amp.outputNode.disconnect(); } catch (e) { }

    lastNode.connect(amp.inputNode);
    lastNode = amp.outputNode || amp.inputNode;
  }

  // Connect cabinet if present
  if (cabinet && cabinet.node) {
    try { cabinet.node.disconnect(); } catch (e) { }
    try { if (cabinet.outputNode) cabinet.outputNode.disconnect(); } catch (e) { }

    lastNode.connect(cabinet.node);
    lastNode = cabinet.outputNode || cabinet.node;
  }

  // Connect to master output
  lastNode.connect(masterGain);
}

export function setMasterVolume(value) {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(value, getAudioContext().currentTime, 0.01);
  }
}

export function setGlobalBypass(bypassed) {
  if (bypassGain && dryGain) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    if (bypassed) {
      dryGain.gain.setTargetAtTime(1, now, 0.01);
    } else {
      dryGain.gain.setTargetAtTime(0, now, 0.01);
    }
  }
}

export function getInputAnalyser() {
  return analyserInput;
}

export function getOutputAnalyser() {
  return analyserOutput;
}

export function getAudioContextState() {
  return audioContext ? audioContext.state : 'closed';
}
