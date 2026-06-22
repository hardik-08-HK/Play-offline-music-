import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, 
  ChevronDown, ListMusic, Volume2, Clock, Music, Heart, Sparkles, SlidersIcon, Trash2, MoreVertical 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, RepeatMode } from '../types';
import { getFrequencyData } from '../utils/audioEngine';

interface PlayerViewProps {
  currentSong: Song | null;
  isPlaying: boolean;
  playbackProgress: number; // Current seconds
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onPrev: () => void;
  onNext: () => void;
  repeatMode: RepeatMode;
  onToggleRepeatMode: () => void;
  isShuffle: boolean;
  onToggleShuffle: () => void;
  onToggleFavorite: (id: string) => void;
  queue: Song[];
  onPlaySong: (song: Song) => void;
  onClose: () => void;
  continuousPlay: boolean;
  onToggleContinuousPlay: () => void;
  onRemoveFromQueue?: (songId: string) => void;
  onDeleteSong?: (id: string) => void;
}

export default function PlayerView({
  currentSong,
  isPlaying,
  playbackProgress,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  repeatMode,
  onToggleRepeatMode,
  isShuffle,
  onToggleShuffle,
  onToggleFavorite,
  queue,
  onPlaySong,
  onClose,
  continuousPlay,
  onToggleContinuousPlay,
  onRemoveFromQueue,
  onDeleteSong,
}: PlayerViewProps) {
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [useVinylLayout, setUseVinylLayout] = useState(false); // Let them toggle if they want!
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Swipe gesture tracking
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 55;   // Left Swipe = Next Song
    const isRightSwipe = distance < -55; // Right Swipe = Prev Song

    if (isLeftSwipe) {
      onNext();
    } else if (isRightSwipe) {
      onPrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Frequency spectrum drawing loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderVisuals = () => {
      animationFrameId = requestAnimationFrame(renderVisuals);
      
      const dataArray = getFrequencyData();
      if (dataArray.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(29, 185, 84, 0.45)'; // Spotify Green
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, canvas.height / 2);
        
        const time = Date.now() * 0.0035;
        for (let i = 0; i < canvas.width; i++) {
          const y = canvas.height / 2 + Math.sin(i * 0.075 + time) * (isPlaying ? 4 : 0.8);
          ctx.lineTo(i, y);
        }
        ctx.stroke();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / (dataArray.length * 0.65));
      let barHeight;
      let x = 0;

      for (let i = 0; i < Math.floor(dataArray.length * 0.8); i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        const val = dataArray[i];
        ctx.fillStyle = `rgba(29, 185, 84, ${val / 255 * 0.75 + 0.25})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    renderVisuals();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  // Parse LRC Lyrics on-the-fly
  interface LyricLine {
    time: number; // in seconds
    text: string;
  }

  const parsedLyrics = React.useMemo<LyricLine[]>(() => {
    if (!currentSong || !currentSong.lyrics) return [];
    
    const lines = currentSong.lyrics.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;

    lines.forEach((line) => {
      const match = timeRegex.exec(line);
      if (match) {
        const m = parseInt(match[1]);
        const s = parseInt(match[2]);
        const ms = match[3] ? parseInt(match[3]) : 0;
        const totalSeconds = m * 60 + s + ms / 100;
        const text = line.replace(timeRegex, '').trim();
        result.push({ time: totalSeconds, text });
      }
    });

    return result.sort((a, b) => a.time - b.time);
  }, [currentSong]);

  // Find active lyric index
  const activeLyricIdx = React.useMemo(() => {
    if (parsedLyrics.length === 0) return -1;
    let index = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (playbackProgress >= parsedLyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [parsedLyrics, playbackProgress]);

  // Smooth scroll lyrics container
  useEffect(() => {
    if (lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector('.active-lyric-item');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIdx]);

  if (!currentSong) return null;

  // Resolve currently active track index inside the current queue
  const currentIdxInQueue = queue.findIndex(s => s.id === currentSong.id);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Immersive Ambient backdrops based on current song artwork
  const getGradientForArtwork = (art: string) => {
    const char = art ? art.trim().substring(0, 2) : '';
    if (['🪐', '🧬', '🌌', '⚡', '🛸', '🔮'].includes(char)) {
      return 'from-purple-950/45 via-[#0b081e] to-black';
    } else if (['❤️', '🌹', '🍒', '🔥', '🍷', '🎸'].includes(char)) {
      return 'from-red-950/40 via-[#100305] to-black';
    } else if (['📟', '🍃', '🌱', '🥝', '🌳', '🌲', '🍀'].includes(char)) {
      return 'from-emerald-950/40 via-[#020d04] to-black';
    } else if (['💛', '⭐', '☀️', '🍋', '🥞', '⚡'].includes(char)) {
      return 'from-yellow-950/30 via-[#120f01] to-black';
    } else if (['🌊', '❄️', '🌈', '🧩', '💎', '🥣', '🦕'].includes(char)) {
      return 'from-cyan-950/40 via-[#010915] to-black';
    }
    return 'from-green-950/30 via-zinc-950 to-black';
  };

  const dynamicBgGradient = getGradientForArtwork(currentSong.albumArt || '');

  return (
    <div 
      id="full-screen-player"
      className={`absolute inset-0 z-50 flex flex-col bg-gradient-to-b ${dynamicBgGradient} text-white animate-slide-up select-none`}
    >
      {/* 1. Header Toolbar */}
      <div className="p-5 flex justify-between items-center bg-transparent relative z-10 flex-shrink-0">
        <button
          id="close-player-btn"
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition active:scale-95"
          title="Minimize player"
        >
          <ChevronDown className="w-5 h-5 text-zinc-300" />
        </button>

        <div className="text-center min-w-0 flex-1 px-4">
          <p className="text-[9px] font-mono tracking-widest text-zinc-400 font-bold uppercase">
            NOW PLAYING FROM SANDBOX
          </p>
          <p className="text-xs font-black truncate text-zinc-200 mt-0.5">
            {currentSong.album || 'Single Album'}
          </p>
        </div>

        {/* Layout Mode visual options selector */}
        <div className="flex gap-1 relative">
          <button
            onClick={() => setUseVinylLayout(!useVinylLayout)}
            className={`p-2 rounded-full transition ${useVinylLayout ? 'bg-white/15 text-yellow-405 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Toggle Vinyl / High-Art Layout"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          
          <button
            id="queue-toggle-btn"
            onClick={() => {
              setShowQueue(!showQueue);
              setShowLyrics(false);
            }}
            className={`p-2 rounded-full transition ${showQueue ? 'bg-white/15 text-[#1db954] font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Current Play Queue"
          >
            <ListMusic className="w-5.0 h-5.0" />
          </button>

          <div className="relative">
            <button
              id="player-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              className={`p-2 rounded-full transition ${showMenu ? 'bg-white/15 text-[#1db954]' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => { setShowMenu(false); setConfirmDelete(false); }} />
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-40 animate-fade-in text-left">
                  <button
                    onClick={() => {
                      if (currentSong && onDeleteSong) {
                        if (!confirmDelete) {
                          setConfirmDelete(true);
                        } else {
                          onDeleteSong(currentSong.id);
                          setConfirmDelete(false);
                          setShowMenu(false);
                        }
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs rounded-lg font-bold flex items-center gap-2.5 transition cursor-pointer ${confirmDelete ? 'bg-red-900/30 text-red-400 hover:bg-red-950/45' : 'text-red-550 hover:bg-zinc-800/60'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{confirmDelete ? 'Confirm Delete?' : 'Remove Song'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Interactive Stage (Touch Swipe Listener is Active!) */}
      <div 
        className="flex-1 flex flex-col p-5 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Premium Segmented Tab Switcher */}
        <div className="mb-4 flex justify-center flex-shrink-0 relative z-10">
          <div className="flex bg-black/50 p-1 rounded-full border border-white/5 w-full max-w-xs shadow-2xl backdrop-blur-md">
            <button
              onClick={() => {
                setShowQueue(false);
                setShowLyrics(false);
              }}
              className={`flex-1 py-1.5 text-[9px] uppercase font-black tracking-wider rounded-full transition-all duration-300 cursor-pointer ${
                !showQueue && !showLyrics 
                  ? 'bg-[#1db954] text-black shadow-md font-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Art / Player
            </button>
            <button
              onClick={() => {
                setShowQueue(false);
                setShowLyrics(true);
              }}
              className={`flex-1 py-1.5 text-[9px] uppercase font-black tracking-wider rounded-full transition-all duration-300 cursor-pointer ${
                !showQueue && showLyrics 
                  ? 'bg-[#1db954] text-black shadow-md font-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Lyrics
            </button>
            <button
              onClick={() => {
                setShowQueue(true);
                setShowLyrics(false);
              }}
              className={`flex-1 py-1.5 text-[9px] uppercase font-black tracking-wider rounded-full transition-all duration-300 cursor-pointer ${
                showQueue 
                  ? 'bg-[#1db954] text-black shadow-md font-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Queue ({queue.length})
            </button>
          </div>
        </div>

        {/* Touch Swipe instruction overlay */}
        <div className="text-center text-[8px] text-zinc-500 tracking-wider font-extrabold uppercase mb-2">
          ← Swipe Left/Right to Skip tracks →
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-hidden">
          {showQueue ? (
            /* Immersive sandbox play queue view */
            <div className="w-full h-full flex flex-col p-3 overflow-hidden">
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sandbox Queue ({queue.length})</h3>
                <span className="text-[9px] font-mono text-[#1db954] font-black">PLAY ORDER</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                {queue.map((song, idx) => {
                  const isCurrent = song.id === currentSong.id;
                  return (
                    <div
                      key={`queue-${song.id}-${idx}`}
                      className={`flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition ${
                        isCurrent ? 'bg-white/10 border-l-2 border-[#1db954]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer" onClick={() => onPlaySong(song)}>
                        <span className="text-[10px] font-mono text-zinc-500 w-4 pl-0.5">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-black truncate ${isCurrent ? 'text-[#1db954]' : 'text-zinc-200'}`}>
                            {song.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-semibold text-zinc-500">
                          {formatTime(song.duration)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromQueue?.(song.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-500 transition cursor-pointer"
                          title="Remove from play queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {showLyrics ? (
                <motion.div
                  key="lyrics-overlay-view"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full relative flex flex-col p-3 overflow-hidden rounded-2xl"
                >
                  {/* Faded background artwork */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden rounded-2xl">
                    <div 
                      className="text-8.5xl sm:text-9.5xl opacity-15 filter blur-xs transform transition duration-500 scale-125 animate-pulse w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center bg-zinc-900/30 rounded-2xl"
                    >
                      {currentSong.albumArt || '🎵'}
                    </div>
                  </div>

                  {/* High contrast visual background shield */}
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-xs pointer-events-none rounded-2xl" />

                  {/* Container contents */}
                  <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-1 pb-2 border-b border-white/5">
                      <span className="text-[9px] font-mono tracking-widest text-[#1db954] font-extrabold uppercase flex items-center gap-1.5">
                        🗣️ Overlay Lyrics
                      </span>
                      <button
                        onClick={() => setShowLyrics(false)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[9px] font-extrabold tracking-wider uppercase transition flex items-center gap-1 cursor-pointer active:scale-95 text-zinc-250 hover:text-white"
                      >
                        Show Album Art
                      </button>
                    </div>

                    {parsedLyrics.length > 0 ? (
                      <div 
                        ref={lyricsContainerRef}
                        className="flex-1 overflow-y-auto space-y-5 px-3 py-10 scrollbar-none text-center animate-fade-in"
                      >
                        {parsedLyrics.map((item, idx) => {
                          const isActive = idx === activeLyricIdx;
                          return (
                            <p
                              key={idx}
                              className={`text-sm sm:text-base leading-relaxed transition-all duration-300 cursor-pointer ${
                                isActive 
                                  ? 'text-[#1db954] font-black scale-103 active-lyric-item text-shadow-md font-sans' 
                                  : 'text-zinc-400 font-bold hover:text-white font-sans'
                              }`}
                              style={{
                                textShadow: isActive ? '0 0 12px rgba(29, 185, 84, 0.4)' : 'none'
                              }}
                              onClick={() => {
                                onSeek(item.time);
                              }}
                            >
                              {item.text}
                            </p>
                          );
                        })}
                      </div>
                    ) : currentSong.lyrics && currentSong.lyrics.trim().length > 0 ? (
                      /* Elegant full scrollable text format fallback */
                      <div className="flex-1 overflow-y-auto space-y-4 px-5 py-8 scrollbar-none text-center animate-fade-in">
                        <div className="mb-4">
                          <span className="text-[9px] font-mono tracking-widest text-[#1db954] font-extrabold uppercase border border-[#1db954]/20 px-2.5 py-0.5 rounded-full bg-[#1db954]/5">
                            📖 Lyrics Document
                          </span>
                        </div>
                        {currentSong.lyrics.split('\n').map((line, idx) => (
                          <p key={idx} className="text-sm text-zinc-300 hover:text-white transition font-medium leading-relaxed font-sans">
                            {line.trim()}
                          </p>
                        ))}
                      </div>
                    ) : (
                      /* Breathtaking minimal typographic identity as request fallback */
                      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 relative overflow-hidden select-none w-full h-full animate-fade-in">
                        <div className="absolute top-6 left-6 text-zinc-550 font-mono text-[8px] uppercase tracking-widest select-none opacity-30">
                          Studio Player View
                        </div>
                        <div className="absolute bottom-6 right-6 text-zinc-550 font-mono text-[8px] uppercase tracking-widest select-none opacity-30">
                          Offline Mode Active
                        </div>

                        {/* Large elegant background music symbol icon */}
                        <div className="absolute text-[12rem] font-serif hover:scale-103 transition-transform duration-700 text-zinc-900 select-none -z-0 opacity-10 leading-none">
                          ♫
                        </div>

                        <div className="relative z-10 max-w-sm space-y-6">
                          <div className="space-y-4">
                            <span className="text-[9px] font-mono tracking-widest text-[#1db954] font-black uppercase bg-[#1db954]/10 border border-[#1db954]/20 px-3.5 py-1 rounded-full">
                              No lyrics available
                            </span>
                            
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight font-sans text-shadow-lg">
                              {currentSong.title}
                            </h2>
                            
                            <div className="w-12 h-0.5 bg-[#1db954]/50 mx-auto rounded-full" />
                            
                            <p className="text-sm text-zinc-400 font-extrabold tracking-widest uppercase font-mono">
                              {currentSong.artist}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-white/5">
                            <p className="text-[10px] text-zinc-500 italic max-w-xs mx-auto leading-relaxed">
                              "Music expresses that which cannot be said and on which it is impossible to be silent." 
                              <span className="block mt-1 font-mono text-[8px] tracking-widest text-zinc-600 uppercase">— Victor Hugo</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="album-art-default-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex flex-col items-center justify-center animate-fade-in"
                >
                  {useVinylLayout ? (
                    /* Retro physical spinning vinyl model */
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div 
                        className="relative cursor-pointer group"
                        onClick={() => setShowLyrics(true)}
                        title="Click to view lyrics"
                      >
                        <div 
                          className={`w-64 h-64 rounded-full bg-zinc-950 flex items-center justify-center border-4 border-zinc-900 shadow-2xl relative select-none pointer-events-none ${
                            isPlaying ? 'animate-spin-slow' : ''
                          }`}
                          style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 0 25px rgba(255,255,255,0.05)'
                          }}
                        >
                          <div className="absolute inset-4 rounded-full border border-white/5 opacity-40" />
                          <div className="absolute inset-8 rounded-full border border-white/5 opacity-30" />
                          <div className="absolute inset-16 rounded-full border border-white/5 opacity-20" />
                          <div className="absolute inset-24 rounded-full border border-white/5 opacity-10" />

                          <div className="w-28 h-28 rounded-full bg-zinc-800 border-2 border-white/10 flex items-center justify-center text-6xl shadow-inner select-none relative">
                            {currentSong.albumArt || '🎧'}
                          </div>

                          <div className="absolute w-5 h-5 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        </div>

                        {/* Interactive Vinyl cover hover overlay */}
                        <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col items-center justify-center">
                          <Music className="w-6 h-6 text-[#1db954] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#1db954] mt-1">View Lyrics</span>
                        </div>

                        {/* Vinyl physical armature needle hand */}
                        <div 
                          className="absolute top-0 right-1 w-14 h-32 origin-top transform transition-transform duration-500 select-none pointer-events-none"
                          style={{
                            transform: isPlaying ? 'rotate(18deg)' : 'rotate(-10deg)',
                            right: '-20px',
                            top: '-15px'
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 absolute left-0 top-0 shadow" />
                          <div className="w-1.5 h-24 bg-gradient-to-b from-zinc-400 to-zinc-200 absolute left-0.5 top-1 origin-top transform skew-x-3" />
                          <div className="w-4 h-6 bg-zinc-600 rounded-sm absolute bottom-0 left-[-4px] shadow-sm flex items-center justify-center">
                            <div className="w-1 h-3 bg-green-500" />
                          </div>
                        </div>
                      </div>

                      {/* Title descriptions below vinyl */}
                      <div className="text-center px-4 max-w-sm">
                        <h2 className="text-lg font-black tracking-tight text-white truncate text-shadow">
                          {currentSong.title}
                        </h2>
                        <p className="text-xs text-[#1db954] font-bold truncate mt-1">
                          {currentSong.artist}
                        </p>
                        {/* Synced Subtitle Lyrics Overlay */}
                        {activeLyricIdx !== -1 && parsedLyrics[activeLyricIdx] && (
                          <div className="mt-3.5 px-4 py-2 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md max-w-[280px] text-center mx-auto shadow-lg cursor-pointer hover:bg-black/80 transition" onClick={() => setShowLyrics(true)}>
                            <p className="text-[11px] font-bold text-green-400 leading-normal line-clamp-2">
                              🗣️ {parsedLyrics[activeLyricIdx].text}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Modern Spotify Immersive High-Art Centered Cover Layout */
                    <div className="flex flex-col items-center justify-center w-full space-y-6">
                      {/* Massive center cover card */}
                      <div 
                        className="w-64 h-64 sm:w-72 sm:h-72 bg-gradient-to-tr from-zinc-850 to-zinc-800 rounded-2xl flex items-center justify-center text-8xl shadow-2xl relative select-none cursor-pointer transform hover:scale-101 active:scale-99 transition duration-300 border border-zinc-700/30 overflow-hidden group"
                        style={{
                          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)'
                        }}
                        onClick={() => setShowLyrics(true)}
                        title="Click to view lyrics"
                      >
                        {currentSong.albumArt || '🎵'}
                        
                        {/* Interactive cover hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col items-center justify-center gap-2">
                          <Music className="w-6 h-6 text-[#1db954] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#1db954]">View Lyrics</span>
                        </div>

                        {/* Micro reflection shimmer glaze */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                      </div>

                      {/* Title description block centered */}
                      <div className="text-center w-full px-4 max-w-sm">
                        <h2 className="text-xl font-black tracking-tight text-white truncate text-shadow-md">
                          {currentSong.title}
                        </h2>
                        <p className="text-xs text-green-400 font-extrabold truncate mt-1 tracking-wider uppercase">
                          {currentSong.artist}
                        </p>
                        <div className="text-center mt-2.5">
                          <span className="inline-block text-[9px] font-extrabold tracking-widest border border-white/10 px-3 py-0.5 rounded-full text-zinc-400 bg-black/40 uppercase">
                            {currentSong.genre || 'Soundtrack'}
                          </span>
                        </div>
                        {/* Synced Subtitle Lyrics Overlay */}
                        {activeLyricIdx !== -1 && parsedLyrics[activeLyricIdx] && (
                          <div className="mt-4 px-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md max-w-[300px] text-center mx-auto shadow-lg cursor-pointer hover:bg-black/80 transition" onClick={() => setShowLyrics(true)}>
                            <p className="text-xs font-bold text-green-400 leading-relaxed line-clamp-2">
                              🗣️ {parsedLyrics[activeLyricIdx].text}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* 3. Player controls bottom tray */}
      <div className="p-5 pt-0 flex flex-col justify-end space-y-6 flex-shrink-0 bg-transparent relative z-10 w-full max-w-md mx-auto">
        
        {/* Dynamic Canvas live spectrum analyzer indicator footer */}
        <div className="w-full h-4 relative flex items-center justify-center opacity-60 px-4 mt-2 select-none pointer-events-none">
          <canvas 
            ref={canvasRef} 
            width="260" 
            height="14"
            className="rounded-lg"
          />
        </div>

        {/* Timeline Seeker with formatted clocks */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono font-bold">
            <span>{formatTime(playbackProgress)}</span>
            <span>{formatTime(currentSong.duration)}</span>
          </div>
          
          <input
            id="playback-seeker"
            type="range"
            min="0"
            max={currentSong.duration}
            value={playbackProgress}
            onChange={(e) => onSeek(parseInt(e.target.value))}
            className="w-full accent-[#1db954] bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Command deck layout */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            
            {/* Toggle Shuffle */}
            <button
              id="player-shuffle-btn"
              onClick={onToggleShuffle}
              className={`p-2 rounded-full transition ${isShuffle ? 'text-[#1db954] font-black' : 'text-zinc-500 hover:text-white'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4.5 h-4.5" />
            </button>

            {/* Back Prev button */}
            <button
              id="player-prev-btn"
              onClick={onPrev}
              disabled={currentIdxInQueue <= 0 && repeatMode !== 'all'}
              className="p-2.5 text-white hover:text-green-400 active:scale-90 transition disabled:opacity-30"
            >
              <SkipBack className="w-5.5 h-5.5 fill-current" />
            </button>

            {/* Pulsing Large Play/Pause Trigger */}
            <button
              id="player-play-btn"
              onClick={onTogglePlay}
              className="w-16 h-16 rounded-full bg-white hover:scale-105 active:scale-95 text-black shadow-2xl transition flex items-center justify-center font-bold text-xl"
            >
              {isPlaying ? (
                <Pause className="w-6.5 h-6.5 fill-current text-black" />
              ) : (
                <Play className="w-6.5 h-6.5 fill-current text-black ml-1" />
              )}
            </button>

            {/* Next song button */}
            <button
              id="player-next-btn"
              onClick={onNext}
              disabled={currentIdxInQueue >= queue.length - 1 && repeatMode !== 'all'}
              className="p-2.5 text-white hover:text-green-400 active:scale-90 transition disabled:opacity-30"
            >
              <SkipForward className="w-5.5 h-5.5 fill-current" />
            </button>

            {/* Toggle Repeat list/track */}
            <button
              id="player-repeat-btn"
              onClick={onToggleRepeatMode}
              className={`p-2 rounded-full transition ${repeatMode !== 'none' ? 'text-[#1db954] font-black' : 'text-zinc-500 hover:text-white'}`}
              title={repeatMode === 'one' ? 'Repeat track (one)' : repeatMode === 'all' ? 'Repeat all' : 'Looping off'}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4.5 h-4.5" /> : <Repeat className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Favorites & Lossless specs row */}
          <div className="flex items-center justify-between border-t border-zinc-800/40 pt-4 px-1.5 pb-2.5">
            <button
              id="player-fav-btn"
              onClick={() => onToggleFavorite(currentSong.id)}
              className={`p-2 py-1 bg-zinc-900 border rounded-full flex items-center gap-1.5 transition text-[10px] font-extrabold uppercase ${
                currentSong.isFavorite 
                  ? 'border-red-550/20 text-red-500 bg-red-950/20' 
                  : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${currentSong.isFavorite ? 'fill-current' : ''}`} />
              <span>{currentSong.isFavorite ? 'In Favorites' : 'Add Favorite'}</span>
            </button>

            {/* Interactive synchronized lyrics selector button */}
            <button
              onClick={() => {
                setShowLyrics(!showLyrics);
                setShowQueue(false);
              }}
              className={`px-3 py-1 bg-zinc-900 border rounded-full text-[10px] uppercase font-extrabold tracking-wider transition ${
                showLyrics 
                  ? 'border-green-550/20 text-[#1db954] bg-[#1db954]/10' 
                  : 'border-zinc-800 text-zinc-400 hover:text-zinc-205'
              }`}
            >
              Lyrics
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleContinuousPlay}
                className={`px-2.5 py-1 rounded-full border text-[9px] font-mono font-bold uppercase transition ${
                  continuousPlay 
                    ? 'border-green-500/20 text-[#1db954] bg-zinc-800/60' 
                    : 'border-zinc-800 text-zinc-500'
                }`}
                title="Continuous playback modes"
              >
                {continuousPlay ? 'CONT PLAY' : 'CONT OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
