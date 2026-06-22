import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Check, HelpCircle, Shield, AlertTriangle, ArrowRight,
  TrendingUp, Compass, Heart, Cloud, Disc, Music, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song } from '../types';
import { SongEmotion, EMOTIONS, classifySongEmotion } from '../utils/emotionClassifier';

interface SoundMeaningIdentifierModalProps {
  songsToIdentify: Song[];
  onSetCategory: (songId: string, category: SongEmotion) => void;
  onFinish: () => void;
}

export default function SoundMeaningIdentifierModal({
  songsToIdentify,
  onSetCategory,
  onFinish
}: SoundMeaningIdentifierModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [spectralScore, setSpectralScore] = useState<number>(0);
  const [systemSuggestion, setSystemSuggestion] = useState<SongEmotion>('Chill');

  const currentSong = songsToIdentify[currentIndex];

  // Reset analysis animation for each song
  useEffect(() => {
    if (!currentSong) return;
    setIsAnalyzing(true);
    
    // Determine system recommendation
    const recommendation = classifySongEmotion(currentSong);
    setSystemSuggestion(recommendation);

    // Generate simulated spectral score based on title characters
    const score = 55 + (currentSong.title.length * 3) % 40;
    setSpectralScore(score);

    const timer = setTimeout(() => {
      setIsAnalyzing(false);
    }, 1800); // 1.8s scanning effect for delightful UX

    return () => clearTimeout(timer);
  }, [currentIndex, currentSong]);

  if (!currentSong) {
    return null;
  }

  const handleSelectCategory = (category: SongEmotion) => {
    onSetCategory(currentSong.id, category);
    goToNext();
  };

  const handleSkipAndAuto = () => {
    // If skipped, use the systemSuggestion determined by classifySongEmotion
    onSetCategory(currentSong.id, systemSuggestion);
    goToNext();
  };

  const goToNext = () => {
    if (currentIndex < songsToIdentify.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-55 font-sans text-zinc-350 select-none">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#1db954]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header Branding */}
        <div className="p-5 pb-4 bg-gradient-to-b from-zinc-950 to-zinc-900 border-b border-zinc-850 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1db954]/10 text-[#1db954] flex items-center justify-center font-bold text-sm">
              🔮
            </div>
            <div>
              <h3 className="text-xs font-black tracking-widest text-[#1db954] uppercase">SOUND & MEANING IDENTIFIER</h3>
              <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Acoustic Emotion Intelligence</p>
            </div>
          </div>
          
          <div className="bg-zinc-950/80 px-2.5 py-1 border border-zinc-800 rounded-lg text-[9px] font-mono font-black text-zinc-400">
            {currentIndex + 1} / {songsToIdentify.length} TRACKS
          </div>
        </div>

        {/* Analyzing Waveform Visualizer Stage */}
        <div className="p-6 bg-zinc-950/40 relative overflow-hidden flex flex-col items-center justify-center text-center border-b border-zinc-850">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div 
                key="is-analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 flex flex-col items-center justify-center space-y-4"
              >
                <div className="relative flex items-center justify-center">
                  {/* Glowing central pulse ring */}
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 animate-ping absolute" />
                  <div className="w-14 h-14 rounded-full bg-[#1db954]/10 border border-[#1db954]/40 flex items-center justify-center relative shadow-inner">
                    <Activity className="w-6 h-6 text-[#1db954] animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5 px-6">
                  <h4 className="text-xs font-black uppercase text-white tracking-widest animate-pulse">Scanning Audio Vectors</h4>
                  <p className="text-[10px] text-zinc-400 font-mono italic">spectral-intensity & lyric-semantics check...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="analysis-done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-4 space-y-3 w-full"
              >
                {/* Meta block of parsed song */}
                <div className="flex items-center gap-3 bg-zinc-90 w-full p-3 rounded-2xl border border-zinc-850 text-left">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl shadow-md">
                    {currentSong.albumArt || '🎧'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-white truncate uppercase">{currentSong.title}</h4>
                    <p className="text-[10px] text-zinc-400 truncate -mt-0.5">{currentSong.artist}</p>
                  </div>
                </div>

                {/* Cognitive Engine Recommendation Indicator */}
                <div className="bg-zinc-900/60 border border-emerald-500/10 p-3.5 rounded-2xl text-left space-y-2">
                  <span className="text-[8px] bg-emerald-500/10 text-[#1db954] border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Semantic match completed
                  </span>
                  
                  <p className="text-[10.5px] leading-relaxed text-zinc-300">
                    We decoded the signal vectors! This composition evokes standard acoustic criteria matching:
                    <strong className="text-white ml-1">
                      {systemSuggestion}
                    </strong>
                    {EMOTIONS[systemSuggestion] ? (
                      <span className="ml-1 text-sm">{EMOTIONS[systemSuggestion].emoji}</span>
                    ) : ''}
                  </p>

                  <div className="flex gap-4 text-[9px] font-mono text-zinc-500 mt-0.5">
                    <span>MATCH CONFIDENCE: <strong className="text-zinc-300">{spectralScore}%</strong></span>
                    <span>•</span>
                    <span>GENRE CLASS: <strong className="text-zinc-300">{currentSong.genre}</strong></span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Panel - Where to assign */}
        <div className="p-5.5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Configure Placement Location</h4>
            <p className="text-[9.5px] text-zinc-500">Pick where this track belongs or click skip to apply recommendations:</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(EMOTIONS) as SongEmotion[]).map((emo) => {
              const meta = EMOTIONS[emo];
              const isRecommended = emo === systemSuggestion && !isAnalyzing;
              return (
                <button
                  key={emo}
                  disabled={isAnalyzing}
                  onClick={() => handleSelectCategory(emo)}
                  className={`p-2.5 rounded-xl text-left border flex items-center justify-between text-[11px] font-bold transition-all relative overflow-hidden ${
                    isRecommended 
                      ? 'bg-[#1db954]/5 border-[#1db954]/50 text-white shadow-md' 
                      : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:bg-zinc-850 hover:text-white hover:border-zinc-700'
                  } disabled:opacity-30 disabled:pointer-events-none cursor-pointer`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">{meta.emoji}</span>
                    <span>{emo}</span>
                  </div>
                  {isRecommended && (
                    <span className="text-[8px] bg-[#1db954] text-black font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      Pick
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Skip Button and Disclaimer */}
          <div className="pt-2 border-t border-zinc-850/65 flex flex-col gap-2.5">
            <button
              onClick={handleSkipAndAuto}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-extrabold text-[11px] uppercase rounded-xl border border-zinc-800 transition shadow-inner disabled:opacity-35 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-zinc-450" />
              <span>Skip & Let System Decide ({systemSuggestion})</span>
            </button>
            <p className="text-[8.5px] text-zinc-500 leading-relaxed text-center italic">
              * Skipping automatically places tracks under our computed recommendations so your playlists remain beautifully balanced.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
