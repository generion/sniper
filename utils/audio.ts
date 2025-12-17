// Audio Engine using Web Audio API to generate sounds without external assets

let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// 1. Sniper Shot Sound (Noise Burst + Lowpass Filter)
export const playShootSound = () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const t = ctx.currentTime;

  // Create Noise Buffer
  const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Filter to make it sound like a heavy gun, not static TV
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);

  // Gain Envelope (Attack & Decay)
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + 0.01); // Fast attack
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3); // Short decay

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + 0.3);
};

// 1.5 Machine Gun Sound (Faster, shorter decay)
export const playMachineGunSound = () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const t = ctx.currentTime;

  const bufferSize = ctx.sampleRate * 0.1; 
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, t); // Higher pitch
  filter.frequency.exponentialRampToValueAtTime(500, t + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.8, t + 0.005); 
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1); 

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + 0.1);
};

// 2. Hit Sound (Metal Ping)
export const playHitSound = () => {
  const ctx = getCtx();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.1);
};

// 3. Bullseye / Good Shot Sound (Chime + Speech)
export const playBullseyeSound = () => {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Harmonic Chime
  const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major Chord
  
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05 + (i * 0.02));
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 1);
  });

  // Speech Synthesis for "Excellent"
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance("Good Shot");
    utter.rate = 1.2;
    utter.pitch = 0.8;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  }
};

// 4. Empty Mag / Dry Fire
export const playEmptyClick = () => {
  const ctx = getCtx();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, t);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(t);
  osc.stop(t + 0.05);
};