import { EqualizerBand } from '../types';

let audioContext: AudioContext | null = null;
let elementSource: MediaElementAudioSourceNode | null = null;
let synthNode: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let filters: BiquadFilterNode[] = [];
let sequencerInterval: any = null;

// Frequencies for the 5-band equalizer
const EQ_FREQUENCIES = [60, 230, 910, 4000, 14000];

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    // Standard AudioContext fallback check
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function setupAudioPipeline(audioElement: HTMLAudioElement, eqBands: EqualizerBand[]): {
  analyser: AnalyserNode;
  filters: BiquadFilterNode[];
} {
  const ctx = getAudioContext();

  // Create an AnalyserNode for real-time frequency dancing bars
  if (!analyser) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128; // Low count for elegant 10-14 retro bar rows
  }

  // Create BiquadFilters if not already initialized
  if (filters.length === 0) {
    let previousNode: AudioNode = analyser;

    EQ_FREQUENCIES.forEach((freq, idx) => {
      const filter = ctx.createBiquadFilter();
      filter.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      
      const savedBand = eqBands.find(b => b.hz === freq);
      filter.gain.value = savedBand ? savedBand.gain : 0;

      filters.push(filter);
    });

    // Cascade them: Analyser -> Filter1 -> Filter2 -> Filter3 -> Filter4 -> Filter5 -> Destination
    for (let i = 0; i < filters.length; i++) {
      if (i === 0) {
        analyser.connect(filters[0]);
      } else {
        filters[i - 1].connect(filters[i]);
      }
    }
    filters[filters.length - 1].connect(ctx.destination);
  }

  // Connect the HTMLAudioElement to the pipeline
  if (audioElement && !elementSource) {
    try {
      elementSource = ctx.createMediaElementSource(audioElement);
      elementSource.connect(analyser);
    } catch (e) {
      console.warn('Media element already routed or failed:', e);
    }
  }

  // Set up synth gain output
  if (!synthNode) {
    synthNode = ctx.createGain();
    synthNode.gain.value = 0.45; // balanced synth volume
    synthNode.connect(analyser);
  }

  return { analyser, filters };
}

export function updateEQBandValue(hz: number, gain: number) {
  const filter = filters.find(f => f.frequency.value === hz);
  if (filter) {
    filter.gain.value = gain;
  }
}

export function getFrequencyData(): Uint8Array {
  if (!analyser) return new Uint8Array(0);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}

// SYNTHESIS ENGINE (PLAYS REALTIME INSTRUMENTS OFFLINE FOR PRE-LOADED SONGS)
export function startOfflineSynth(genre: string, speedMultiplier = 1) {
  stopOfflineSynth();
  
  const ctx = getAudioContext();
  if (!synthNode) {
    synthNode = ctx.createGain();
    synthNode.gain.value = 0.45;
    if (analyser) {
      synthNode.connect(analyser);
    } else {
      synthNode.connect(ctx.destination);
    }
  }

  let step = 0;
  const tempo = 120 * speedMultiplier;
  const stepTime = (60 / tempo) * 0.5; // Eighth notes

  // Standard musical notes for synthesis
  const notes: Record<string, number> = {
    C3: 130.81, D3: 146.83, Eb3: 155.56, F3: 174.61, G3: 196.00, Ab3: 207.65, Bb3: 233.08,
    C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
    C5: 523.25, D5: 587.33, Eb5: 622.25, G5: 783.99, Bb5: 932.33
  };

  const playNote = (freq: number, type: OscillatorType, dur: number, gainVal: number) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      
      osc.connect(gain);
      gain.connect(synthNode!);
      
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {
      // Audio element security constraint fallback
    }
  };

  // Create sequencer loop based on genre
  sequencerInterval = setInterval(() => {
    if (ctx.state === 'suspended') return;

    if (genre.toLowerCase().includes('synthwave')) {
      // 🌆 Retro Synthwave bassline & sparkling lead arpeggios
      // Bassline in C minor
      const bassPattern = ['C3', 'C3', 'Eb3', 'Eb3', 'G3', 'G3', 'Bb3', 'G3'];
      const bassNote = bassPattern[step % bassPattern.length];
      playNote(notes[bassNote], 'sawtooth', 0.25, 0.08);

      // Lead arpeggio
      if (step % 2 === 0) {
        const leadPattern = ['C4', 'Eb4', 'G4', 'Bb4', 'C5', 'Bb4', 'G4', 'Eb4'];
        const note = leadPattern[(step / 2) % leadPattern.length];
        playNote(notes[note], 'sawtooth', 0.35, 0.04);
      }
      // Simulate drum snare accent on steps 4, 12
      if (step % 8 === 4) {
        playNote(100, 'triangle', 0.1, 0.2); // Kick drum feel
      }
    } else if (genre.toLowerCase().includes('lo-fi')) {
      // ☕ Rainy cozy warm chords and Rhodes keys
      const chordC = ['C4', 'Eb4', 'G4', 'Bb4'];
      const chordAb = ['Ab3', 'C4', 'Eb4', 'G4'];
      const activeChord = (step % 16 < 8) ? chordC : chordAb;
      
      if (step % 4 === 0) {
        // Play chord arpeggiated
        activeChord.forEach((note, offset) => {
          setTimeout(() => {
            playNote(notes[note] * 0.5, 'sine', 1.2, 0.05);
          }, offset * 60);
        });
      }
      // Soft vinyl crackle simulation via highpass filter pulse
      if (Math.random() > 0.70) {
        playNote(Math.random() * 8000 + 1000, 'triangle', 0.01, 0.01);
      }
    } else if (genre.toLowerCase().includes('ambient')) {
      // 🌌 Swelling spaceships pad frequencies
      if (step % 8 === 0) {
        const noteRow = ['C3', 'Eb3', 'Ab3', 'Bb3'];
        const ambientNote = noteRow[(step / 8) % noteRow.length];
        playNote(notes[ambientNote], 'sine', 3.0, 0.08);
        playNote(notes[ambientNote] * 1.5, 'sine', 2.0, 0.04);
      }
    } else if (genre.toLowerCase().includes('electro')) {
      // ⚡ Sub-bass pulse, techno percussion, high frequency industrial sparks
      if (step % 4 === 0) {
        playNote(65, 'triangle', 0.15, 0.25); // Hard sub bass kick
      }
      if (step % 4 === 2) {
        playNote(1800, 'sawtooth', 0.05, 0.03); // Retro metal snare spark
      }
      const bleeps = ['C5', 'Eb5', 'G5', 'Bb5'];
      if (step % 8 === 1 || step % 8 === 5) {
        playNote(notes[bleeps[Math.floor(Math.random() * bleeps.length)]], 'square', 0.08, 0.02);
      }
    } else if (genre.toLowerCase().includes('classic')) {
      // 🎹 Moonlight Sonata Piano Arpeggios (G# minor triplets theme!)
      // Triplet steps
      const tripletNotes = [
        ['G3', 'C#4', 'E4'], // Triplet 1
        ['G3', 'C#4', 'E4'], 
        ['A3', 'C#4', 'E4'], // Triplet 2
        ['A3', 'D4', 'F#4']
      ];
      const activeTripletGroup = tripletNotes[Math.floor(step / 3) % tripletNotes.length];
      const noteToPlay = activeTripletGroup[step % 3];
      playNote(notes[noteToPlay] * 0.5, 'triangle', 0.6, 0.06); // Triplet note
      
      // Deep bass anchor under the first note
      if (step % 12 === 0) {
        const bassKeys = [32.7, 36.7, 27.5, 29.1]; // low Hz nodes
        playNote(bassKeys[Math.floor(step / 12) % bassKeys.length], 'sine', 2.5, 0.1);
      }
    } else {
      // Generic fallback arpeggiator
      const noteList = ['C4', 'E4', 'G4', 'C5'];
      playNote(notes[noteList[step % noteList.length]], 'sine', 0.2, 0.08);
    }

    step++;
  }, stepTime * 1000);
}

export function stopOfflineSynth() {
  if (sequencerInterval) {
    clearInterval(sequencerInterval);
    sequencerInterval = null;
  }
}
