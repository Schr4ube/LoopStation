const trackCount = 5;
const SESSION_KEY = 'loopstation-live-session-v2';

const tracksEl = document.getElementById('tracks');
const trackTemplate = document.getElementById('trackTemplate');
const statusEl = document.getElementById('status');
const bpmEl = document.getElementById('bpm');
const initAudioBtn = document.getElementById('initAudio');
const metronomeBtn = document.getElementById('metronome');
const playAllBtn = document.getElementById('playAll');
const stopAllBtn = document.getElementById('stopAll');
const masterVolumeEl = document.getElementById('masterVolume');
const saveSessionBtn = document.getElementById('saveSession');
const loadSessionBtn = document.getElementById('loadSession');

let audioCtx;
let mediaStream;
let metronomeInterval = null;
let metronomeOn = false;
let masterGain;

const hasNativeProjectIO = Boolean(window.loopstationFiles?.saveProject && window.loopstationFiles?.loadProject);

const state = Array.from({ length: trackCount }, (_, index) => ({
  id: index + 1,
  status: 'leer',
  chunks: [],
  recorder: null,
  startedAt: 0,
  source: null,
  buffer: null,
  previousBuffer: null,
  gain: null,
  volume: 0.9,
  loopDuration: 0,
  isMuted: false,
  refresh: null,
  controls: null,
}));

const setStatus = (message) => (statusEl.textContent = message);

function ensureAudioGraph() {
  if (!audioCtx) return;
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = Number(masterVolumeEl.value);
    masterGain.connect(audioCtx.destination);
  }
}

function ensureTrackGain(track) {
  if (!track.gain) {
    track.gain = audioCtx.createGain();
    track.gain.connect(masterGain);
  }
  track.gain.gain.value = track.isMuted ? 0 : track.volume;
}

async function startCapture() {
  if (!audioCtx) {
    audioCtx = new AudioContext({ latencyHint: 'interactive' });
  }
  ensureAudioGraph();

  if (!mediaStream) {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

function refreshTrackStatus(track, nextStatus) {
  track.status = nextStatus;
  track.refresh?.();
}

function stopTrack(track) {
  if (!track.source) return;
  try {
    track.source.stop();
  } catch {
    // no-op
  }
  track.source.disconnect();
  track.source = null;
}

function playTrack(track, syncTime = null) {
  if (!audioCtx || !track.buffer) return;
  stopTrack(track);
  ensureTrackGain(track);

  const source = audioCtx.createBufferSource();
  source.buffer = track.buffer;
  source.loop = true;
  source.connect(track.gain);
  source.start(syncTime ?? audioCtx.currentTime);

  track.source = source;
  refreshTrackStatus(track, track.isMuted ? 'PLAY (MUTE)' : 'PLAY');
}

function fitBufferToDuration(buffer, durationSec) {
  const targetSamples = Math.max(1, Math.floor(buffer.sampleRate * durationSec));
  const out = audioCtx.createBuffer(buffer.numberOfChannels, targetSamples, buffer.sampleRate);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    const len = Math.min(src.length, dst.length);
    dst.set(src.subarray(0, len));
  }
  return out;
}

function mixBuffers(base, addon) {
  const channels = Math.max(base.numberOfChannels, addon.numberOfChannels);
  const length = Math.max(base.length, addon.length);
  const sampleRate = base.sampleRate;
  const mixed = audioCtx.createBuffer(channels, length, sampleRate);

  for (let ch = 0; ch < channels; ch++) {
    const out = mixed.getChannelData(ch);
    const baseData = base.getChannelData(Math.min(ch, base.numberOfChannels - 1));
    const addData = addon.getChannelData(Math.min(ch, addon.numberOfChannels - 1));

    for (let i = 0; i < length; i++) {
      const summed = (baseData[i] || 0) + (addData[i] || 0);
      out[i] = Math.max(-1, Math.min(1, summed));
    }
  }
  return mixed;
}

async function decodeChunks(chunks) {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const arr = await blob.arrayBuffer();
  return audioCtx.decodeAudioData(arr);
}

function calcBarsAndDuration(startedAt) {
  const beatSec = 60 / Number(bpmEl.value || 120);
  const barSec = beatSec * 4;
  const measured = (performance.now() - startedAt) / 1000;
  const bars = Math.max(1, Math.round(measured / barSec));
  return { bars, loopDuration: bars * barSec };
}

function armRecording(track, mode) {
  track.chunks = [];
  track.recorder = new MediaRecorder(mediaStream);
  track.startedAt = performance.now();

  track.recorder.ondataavailable = (evt) => track.chunks.push(evt.data);
  track.recorder.start();

  if (mode === 'overdub') {
    refreshTrackStatus(track, 'OD REC');
    setStatus(`Track ${track.id}: Overdub läuft (${track.loopDuration.toFixed(2)}s)...`);
    setTimeout(() => {
      if (track.recorder?.state === 'recording') track.recorder.stop();
    }, Math.floor(track.loopDuration * 1000));
    return;
  }

  refreshTrackStatus(track, 'REC');
  setStatus(`Track ${track.id} nimmt auf... REC erneut drücken zum Stoppen.`);
}

function encodeWavFromAudioBuffer(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataLength = buffer.length * blockAlign;

  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);

  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return wavBuffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function createProjectPayload() {
  const tracks = state.map((track) => {
    const hasAudio = Boolean(track.buffer);
    return {
      id: track.id,
      volume: track.volume,
      isMuted: track.isMuted,
      loopDuration: track.loopDuration,
      hasAudio,
      audioFile: hasAudio ? `track-${track.id}.wav` : null,
    };
  });

  const audioFiles = state
    .filter((track) => track.buffer)
    .map((track) => ({
      trackId: track.id,
      filename: `track-${track.id}.wav`,
      base64: arrayBufferToBase64(encodeWavFromAudioBuffer(track.buffer)),
    }));

  return {
    bpm: Number(bpmEl.value),
    masterVolume: Number(masterVolumeEl.value),
    tracks,
    audioFiles,
  };
}

async function saveSessionAsProject() {
  if (!hasNativeProjectIO) {
    const payload = {
      bpm: Number(bpmEl.value),
      masterVolume: Number(masterVolumeEl.value),
      tracks: state.map((track) => ({
        id: track.id,
        volume: track.volume,
        isMuted: track.isMuted,
        loopDuration: track.loopDuration,
        status: track.status,
        hasAudio: Boolean(track.buffer),
      })),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    setStatus('Im Browser nur Settings gespeichert. Für WAV-Projekt-Recall Electron verwenden.');
    return;
  }

  const result = await window.loopstationFiles.saveProject(createProjectPayload());
  if (result.canceled) return setStatus('Speichern abgebrochen.');
  setStatus(`Projekt gespeichert: ${result.filePath} (${result.writtenFiles} WAV-Dateien)`);
}

async function loadSessionFromProject() {
  if (!audioCtx) {
    await startCapture();
    initAudioBtn.disabled = true;
  }

  if (!hasNativeProjectIO) {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return setStatus('Keine gespeicherte Session gefunden.');

    const payload = JSON.parse(raw);
    bpmEl.value = payload.bpm || 120;
    masterVolumeEl.value = payload.masterVolume ?? 0.9;
    if (masterGain) masterGain.gain.value = Number(masterVolumeEl.value);

    payload.tracks?.forEach((saved, idx) => {
      const track = state[idx];
      if (!track) return;
      track.volume = saved.volume ?? 0.9;
      track.isMuted = Boolean(saved.isMuted);
      track.loopDuration = saved.loopDuration || 0;
      if (track.controls) {
        track.controls.volume.value = String(track.volume);
        track.controls.muteBtn.textContent = track.isMuted ? 'UNMUTE' : 'MUTE';
      }
      track.status = saved.hasAudio ? 'STOP (Session)' : 'leer';
      track.refresh?.();
    });

    setStatus('Browser-Modus: nur Settings geladen (keine Audio-Dateien).');
    return;
  }

  const result = await window.loopstationFiles.loadProject();
  if (result.canceled) return setStatus('Laden abgebrochen.');

  const { project, audioFiles } = result;
  const audioMap = new Map(audioFiles.map((f) => [f.trackId, f.base64]));

  bpmEl.value = project.bpm || 120;
  masterVolumeEl.value = project.masterVolume ?? 0.9;
  if (masterGain) masterGain.gain.value = Number(masterVolumeEl.value);

  for (const track of state) {
    stopTrack(track);
    track.previousBuffer = null;
    track.buffer = null;
  }

  for (const saved of project.tracks || []) {
    const track = state[saved.id - 1];
    if (!track) continue;

    track.volume = saved.volume ?? 0.9;
    track.isMuted = Boolean(saved.isMuted);
    track.loopDuration = saved.loopDuration || 0;

    if (track.controls) {
      track.controls.volume.value = String(track.volume);
      track.controls.muteBtn.textContent = track.isMuted ? 'UNMUTE' : 'MUTE';
    }

    if (saved.hasAudio && audioMap.has(saved.id)) {
      const wavArr = base64ToArrayBuffer(audioMap.get(saved.id));
      const decoded = await audioCtx.decodeAudioData(wavArr.slice(0));
      track.buffer = decoded;
      refreshTrackStatus(track, 'STOP (Projekt)');
    } else {
      refreshTrackStatus(track, 'leer');
    }

    if (track.gain) track.gain.gain.value = track.isMuted ? 0 : track.volume;
  }

  setStatus(`Projekt geladen: ${result.filePath}`);
}

function wireTrackEvents(track, controls) {
  const { recordBtn, overdubBtn, playBtn, stopBtn, muteBtn, undoBtn, clearBtn, volume } = controls;

  recordBtn.addEventListener('click', async () => {
    if (!audioCtx || !mediaStream) return setStatus('Bitte zuerst Audio starten.');

    if (track.recorder?.state === 'recording') {
      track.recorder.stop();
      refreshTrackStatus(track, 'Verarbeite...');
      return;
    }

    armRecording(track, 'record');
    track.recorder.onstop = async () => {
      const rawBuffer = await decodeChunks(track.chunks);
      const { bars, loopDuration } = calcBarsAndDuration(track.startedAt);
      track.previousBuffer = track.buffer;
      track.loopDuration = loopDuration;
      track.buffer = fitBufferToDuration(rawBuffer, track.loopDuration);
      refreshTrackStatus(track, `STOP (${bars} Bar)`);
      setStatus(`Track ${track.id} aufgenommen: ${bars} Takt(e), ${track.loopDuration.toFixed(2)}s`);
    };
  });

  overdubBtn.addEventListener('click', async () => {
    if (!audioCtx || !mediaStream) return setStatus('Bitte zuerst Audio starten.');
    if (!track.buffer || !track.loopDuration) return setStatus(`Track ${track.id}: erst REC aufnehmen.`);
    if (track.recorder?.state === 'recording') return setStatus(`Track ${track.id}: Aufnahme läuft bereits.`);

    track.previousBuffer = track.buffer;
    armRecording(track, 'overdub');
    playTrack(track);

    track.recorder.onstop = async () => {
      const overdubRaw = await decodeChunks(track.chunks);
      const overdubFixed = fitBufferToDuration(overdubRaw, track.loopDuration);
      track.buffer = mixBuffers(track.previousBuffer, overdubFixed);
      playTrack(track);
      setStatus(`Track ${track.id}: Overdub angewendet.`);
    };
  });

  playBtn.addEventListener('click', () => {
    if (!track.buffer) return setStatus(`Track ${track.id} ist leer.`);
    playTrack(track);
  });

  stopBtn.addEventListener('click', () => {
    stopTrack(track);
    refreshTrackStatus(track, track.buffer ? 'STOP' : 'leer');
  });

  muteBtn.addEventListener('click', () => {
    track.isMuted = !track.isMuted;
    if (track.gain) track.gain.gain.value = track.isMuted ? 0 : track.volume;
    muteBtn.textContent = track.isMuted ? 'UNMUTE' : 'MUTE';
    if (track.source) refreshTrackStatus(track, track.isMuted ? 'PLAY (MUTE)' : 'PLAY');
  });

  undoBtn.addEventListener('click', () => {
    if (!track.previousBuffer) return setStatus(`Track ${track.id}: nichts zum Undo.`);
    track.buffer = track.previousBuffer;
    track.previousBuffer = null;
    if (track.source) playTrack(track);
    refreshTrackStatus(track, track.source ? 'PLAY' : 'STOP');
    setStatus(`Track ${track.id}: letzter Schritt rückgängig.`);
  });

  clearBtn.addEventListener('click', () => {
    stopTrack(track);
    track.previousBuffer = track.buffer;
    track.buffer = null;
    track.chunks = [];
    track.loopDuration = 0;
    refreshTrackStatus(track, 'leer');
  });

  volume.addEventListener('input', (evt) => {
    track.volume = Number(evt.target.value);
    if (track.gain && !track.isMuted) track.gain.gain.value = track.volume;
  });
}

function createTrackUI(track) {
  const node = trackTemplate.content.cloneNode(true);
  const article = node.querySelector('.track');
  const title = node.querySelector('h2');
  const pill = node.querySelector('.pill');

  const controls = {
    recordBtn: node.querySelector('[data-action="record"]'),
    overdubBtn: node.querySelector('[data-action="overdub"]'),
    playBtn: node.querySelector('[data-action="play"]'),
    stopBtn: node.querySelector('[data-action="stop"]'),
    muteBtn: node.querySelector('[data-action="mute"]'),
    undoBtn: node.querySelector('[data-action="undo"]'),
    clearBtn: node.querySelector('[data-action="clear"]'),
    volume: node.querySelector('[data-action="volume"]'),
  };

  track.controls = controls;
  title.textContent = `Track ${track.id}`;

  track.refresh = () => {
    pill.textContent = track.status;
    pill.className = 'pill';
    if (track.status.includes('REC') || track.status.includes('OD')) pill.classList.add('rec');
    if (track.status.includes('PLAY')) pill.classList.add('play');
    if (track.status.includes('STOP')) pill.classList.add('stop');
    if (track.status.includes('MUTE')) pill.classList.add('muted');
  };

  wireTrackEvents(track, controls);

  track.refresh();
  article.dataset.track = track.id;
  tracksEl.appendChild(node);
}

initAudioBtn.addEventListener('click', async () => {
  if (audioCtx && mediaStream) return;
  await startCapture();
  setStatus('Audio aktiv. Du kannst jetzt aufnehmen, overdubben und als Projekt speichern.');
  initAudioBtn.disabled = true;
});

metronomeBtn.addEventListener('click', () => {
  if (!audioCtx) return setStatus('Bitte zuerst Audio starten.');

  metronomeOn = !metronomeOn;
  metronomeBtn.textContent = `Metronom: ${metronomeOn ? 'An' : 'Aus'}`;

  clearInterval(metronomeInterval);
  if (!metronomeOn) return;

  const tick = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1200;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  };

  tick();
  metronomeInterval = setInterval(tick, (60 / Number(bpmEl.value || 120)) * 1000);
});

playAllBtn.addEventListener('click', () => {
  if (!audioCtx) return setStatus('Bitte zuerst Audio starten.');
  const syncTime = audioCtx.currentTime + 0.03;
  state.forEach((track) => track.buffer && playTrack(track, syncTime));
  setStatus('Alle Tracks gestartet.');
});

stopAllBtn.addEventListener('click', () => {
  state.forEach((track) => {
    stopTrack(track);
    if (track.buffer) refreshTrackStatus(track, 'STOP');
  });
  setStatus('Alle Tracks gestoppt.');
});

masterVolumeEl.addEventListener('input', () => {
  if (masterGain) masterGain.gain.value = Number(masterVolumeEl.value);
});

saveSessionBtn.addEventListener('click', async () => {
  try {
    await saveSessionAsProject();
  } catch (error) {
    setStatus(`Speichern fehlgeschlagen: ${error.message}`);
  }
});

loadSessionBtn.addEventListener('click', async () => {
  try {
    await loadSessionFromProject();
  } catch (error) {
    setStatus(`Laden fehlgeschlagen: ${error.message}`);
  }
});

document.addEventListener('keydown', (evt) => {
  if (evt.target.tagName === 'INPUT') return;

  if (evt.code === 'Space') {
    evt.preventDefault();
    stopAllBtn.click();
    return;
  }

  const key = Number(evt.key);
  if (Number.isInteger(key) && key >= 1 && key <= 5) {
    const track = state[key - 1];
    if (!track) return;

    if (track.source) {
      stopTrack(track);
      refreshTrackStatus(track, track.buffer ? 'STOP' : 'leer');
    } else if (track.buffer) {
      playTrack(track);
    }
  }
});

state.forEach(createTrackUI);
