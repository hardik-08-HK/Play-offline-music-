import React, { useEffect, useRef, useState } from 'react';
import { SlidersIcon, Volume2, Sparkles, Activity } from 'lucide-react';
import { EqualizerBand } from '../types';
import { getFrequencyData } from '../utils/audioEngine';

interface EqualizerViewProps {
  eqBands: EqualizerBand[];
  onChangeEQBand: (hz: number, gain: number) => void;
  isPlaying: boolean;
}

const PRESETS: Record<string, number[]> = {
  'Flat': [0, 0, 0, 0, 0],
  'Bass Booster': [10, 6, 2, 0, -1],
  'Vocal / Podcasts': [-4, 3, 8, 5, -2],
  'Acoustic Warm': [4, 1, 3, 2, 4],
  'Synth Electronic': [6, 4, -1, 5, 8],
  'Classic Concert': [2, 3, 1, -2, -3]
};

export default function EqualizerView({
  eqBands,
  onChangeEQBand,
  isPlaying,
}: EqualizerViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('Flat');

  const handleApplyPreset = (presetName: string) => {
    const values = PRESETS[presetName];
    if (!values) return;
    
    setSelectedPreset(presetName);
    const frequencies = [60, 230, 910, 4000, 14000];
    frequencies.forEach((freq, idx) => {
      onChangeEQBand(freq, values[idx]);
    });
  };

  // Canvas Drawing Spectrogram Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      const freqData = getFrequencyData();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (freqData.length === 0) {
        const time = Date.now() * 0.0035;
        ctx.strokeStyle = '#282828';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i++) {
          const y = canvas.height / 2 + Math.sin(i * 0.05 + time) * 12;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
        return;
      }

      // Draw active spectrum bars matching Green neon
      const barCount = 18; 
      const barWidth = (canvas.width / barCount) - 3;
      const heightMultiplier = canvas.height / 255;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[Math.floor(i * (freqData.length / barCount))] || 0;
        const barHeight = Math.max(3, val * heightMultiplier * 0.85);
        const x = i * (barWidth + 3) + 1.5;
        const y = canvas.height - barHeight;

        // Visualizer Gradient
        const grad = ctx.createLinearGradient(x, y, x, canvas.height);
        grad.addColorStop(0, '#1ed760'); // Spotify light green
        grad.addColorStop(1, '#1db954'); // Spotify theme green

        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div id="equalizer-view-container" className="flex flex-col h-full overflow-hidden bg-[#121212]">
      
      {/* Header Panel */}
      <div className="p-4 pt-6 bg-gradient-to-b from-zinc-900 to-[#121212] flex-shrink-0">
        <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <SlidersIcon className="w-5 h-5 text-[#1db954]" />
          Hardware Equalizer
        </h1>
        <p className="text-[10px] text-zinc-400 font-bold tracking-widest mt-0.5 uppercase">
          Configure 5 frequency zones in real-time
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20 scrollbar-none">
        {/* Responsive visualizer canvas board card */}
        <div className="bg-zinc-90 w-full border border-zinc-800 p-3.5 rounded-2xl">
          <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-0.5">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-[#1db954] animate-pulse" />
              Live Spectrogram
            </span>
            <span className="text-zinc-500 font-mono">Web Audio Engine</span>
          </div>
          
          <canvas
            ref={canvasRef}
            width={320}
            height={68}
            className="w-full h-18 rounded-xl bg-[#121212] select-none pointer-events-none"
          />
        </div>

        {/* Acoustic presets matrix board */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#1db954] pl-0.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1db954]" />
            Acoustic Tuning Presets
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.keys(PRESETS).map((presetName) => (
              <button
                key={presetName}
                id={`preset-btn-${presetName.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => handleApplyPreset(presetName)}
                className={`py-2 px-1 text-[9px] font-black uppercase tracking-wider rounded-xl truncate border transition-all ${
                  selectedPreset === presetName
                    ? 'bg-white border-white text-black font-extrabold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                {presetName}
              </button>
            ))}
          </div>
        </div>

        {/* EQ Hardware Dial Knobs Sliders panel */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex justify-around items-center h-48 relative">
            {eqBands.map((band) => (
              <div key={band.hz} className="flex flex-col items-center h-full justify-between">
                {/* Gain level feedback label */}
                <span className="text-[9px] font-bold text-zinc-400 font-mono uppercase bg-zinc-950 px-1.5 py-0.5 rounded">
                  {band.gain > 0 ? '+' : ''}{band.gain}dB
                </span>

                {/* Core Vertical range input knob slider */}
                <div className="relative flex-1 group py-3.5 flex justify-center items-center">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={band.gain}
                    onChange={(e) => {
                      onChangeEQBand(band.hz, parseInt(e.target.value));
                      setSelectedPreset('Custom');
                    }}
                    className="vertical-slider appearance-none bg-zinc-800 w-1.5 h-28 rounded-full outline-none cursor-pointer accent-[#1db954] hover:bg-zinc-700"
                    style={{
                      writingMode: 'bt-lr',
                      WebkitAppearance: 'slider-vertical',
                    }}
                  />
                </div>

                {/* Sub category Hz labels */}
                <div className="text-center">
                  <span className="text-[10px] font-black text-white block">
                    {band.hz >= 1000 ? `${band.hz / 1000}kHz` : `${band.hz}Hz`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
