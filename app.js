const trackCount = 5;
const tracksEl = document.getElementById('tracks');
const trackTemplate = document.getElementById('trackTemplate');
const statusEl = document.getElementById('status');
const bpmEl = document.getElementById('bpm');
const initAudioBtn = document.getElementById('initAudio');
const metronomeBtn = document.getElementById('metronome');

let audioCtx;
let mediaStream;
let metronomeInterval = null;
let metronomeOn = false;

const state = Array.from({ length: trackCount }, (_, index) => ({
  id: index + 1,
  status: 'leer',
  chunks: [],
  recorder: null,
  startedAt: 0,
  source: null,
  buffer: null,
  gain: null,
  volume: 0.9,
  loopDuration: 0,
}));

const setStatus = (message) => (statusEl.textContent = message);

function createTrackUI(track) {
  const node = trackTemplate.content.cloneNode(true);
  const article = node.querySelector('.track');
  const title = node.querySelector('h2');
  const pill = node.querySelector('.pill');
  const [recordBtn, playBtn, stopBtn, clearBtn] = node.querySelectorAll('button');
  const volume = node.querySelector('input[type="range"]');

  title.textContent = `Track ${track.id}`;

  const refresh = () => {
    pill.textContent = track.status;
    pill.className = 'pill';
    if (track.status.includes('REC')) pill.classList.add('rec');
    if (track.status.includes('PLAY')) pill.classList.add('play');
    if (track.status.includes('STOP')) pill.classList.add('stop');
  };

  recordBtn.addEventListener('click', async () => {
    if (!audioCtx || !mediaStream) return setStatus('Bitte zuerst Audio starten.');

    if (track.recorder?.state === 'recording') {
      track.recorder.stop();
      track.status = 'Verarbeite...';
      refresh();
      return;
    }

    track.chunks = [];
    track.recorder = new MediaRecorder(mediaStream);
    track.startedAt = performance.now();

    track.recorder.ondataavailable = (evt) => track.chunks.push(evt.data);
    track.recorder.onstop = async () => {
      const blob = new Blob(track.chunks, { type: 'audio/webm' });
      const arr = await blob.arrayBuffer();
      const rawBuffer = await audioCtx.decodeAudioData(arr);
      const beatSec = 60 / Number(bpmEl.value || 120);
      const barSec = beatSec * 4;
      const measured = (performance.now() - track.startedAt) / 1000;
      const bars = Math.max(1, Math.round(measured / barSec));
      track.loopDuration = bars * barSec;

      track.buffer = fitBufferToDuration(rawBuffer, track.loopDuration);
      track.status = `STOP (${bars} Bar)`;
      refresh();
      setStatus(`Track ${track.id} aufgenommen: ${bars} Takt(e), ${track.loopDuration.toFixed(2)}s`);
    };

    track.recorder.start();
    track.status = 'REC';
    refresh();
    setStatus(`Track ${track.id} nimmt auf... REC erneut drücken zum Stoppen.`);
  });

  playBtn.addEventListener('click', () => {
    if (!track.buffer) return setStatus(`Track ${track.id} ist leer.`);
    stopTrack(track);

    const source = audioCtx.createBufferSource();
    if (!track.gain) {
      track.gain = audioCtx.createGain();
      track.gain.connect(audioCtx.destination);
    }
    track.gain.gain.value = track.volume;
    source.buffer = track.buffer;
    source.loop = true;
    source.connect(track.gain);
    source.start();

    track.source = source;
    track.status = 'PLAY';
    refresh();
  });

  stopBtn.addEventListener('click', () => {
    stopTrack(track);
    track.status = track.buffer ? 'STOP' : 'leer';
    refresh();
  });

  clearBtn.addEventListener('click', () => {
    stopTrack(track);
    track.buffer = null;
    track.chunks = [];
    track.status = 'leer';
    refresh();
  });

  volume.addEventListener('input', (evt) => {
    track.volume = Number(evt.target.value);
    if (track.gain) track.gain.gain.value = track.volume;
  });

  refresh();
  article.dataset.track = track.id;
  tracksEl.appendChild(node);
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

initAudioBtn.addEventListener('click', async () => {
  if (audioCtx) return;
  audioCtx = new AudioContext({ latencyHint: 'interactive' });
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  setStatus('Audio aktiv. Du kannst jetzt auf den Tracks aufnehmen.');
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
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  };

  tick();
  metronomeInterval = setInterval(tick, (60 / Number(bpmEl.value || 120)) * 1000);
});

state.forEach(createTrackUI);
