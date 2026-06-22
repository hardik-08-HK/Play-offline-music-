import React, { useState } from 'react';
import { 
  Play, Calendar, Music, Sliders, Hourglass, Lock, AppWindow, 
  Search, Smile, Tag, ChevronDown, Check, Volume2, Sparkles, Heart, Trophy, Compass, Plus, SlidersIcon, Shield, Trash2
} from 'lucide-react';
import { Song, Playlist } from '../types';
import { classifySongEmotion, EMOTIONS, SongEmotion } from '../utils/emotionClassifier';

interface HomeViewProps {
  songs: Song[];
  playlists: Playlist[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onTogglePlay: () => void;
  onNavigate: (tab: 'songs' | 'playlists' | 'settings') => void;
  sleepTimer: { durationMinutes: number; timeLeftSeconds: number; isActive: boolean };
  onStartSleepTimer: (m: number) => void;
  manualEmotions: Record<string, SongEmotion>;
  onSetManualEmotion: (songId: string, emotion: SongEmotion) => void;
  activeSkin: string;
  onSelectSkin: (skin: string) => void;
  activeTheme: string;
  onSelectTheme: (theme: string) => void;
  onDeleteSong?: (id: string) => void;
}

export default function HomeView({
  songs,
  playlists,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  onNavigate,
  sleepTimer,
  onStartSleepTimer,
  manualEmotions,
  onSetManualEmotion,
  activeSkin,
  onSelectSkin,
  activeTheme,
  onSelectTheme,
  onDeleteSong,
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<SongEmotion | 'All'>('All');
  const [activeMoodSelectorId, setActiveMoodSelectorId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic Greeting based on current local time
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const totalPlayCount = songs.reduce((sum, s) => sum + s.playCount, 0);

  // Quick select a random track to shuffle
  const handleQuickShuffle = () => {
    if (songs.length === 0) return;
    const randIdx = Math.floor(Math.random() * songs.length);
    onPlaySong(songs[randIdx]);
  };

  const formatSleepTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper to resolve a song's classified or overridden mood
  const getSongEmotion = (song: Song): SongEmotion => {
    return manualEmotions[song.id] || classifySongEmotion(song);
  };

  // Filter songs based on search and selected mood category
  const filteredSongs = songs.filter(song => {
    const matchesSearch = 
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.genre.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedMood === 'All') return true;

    return getSongEmotion(song) === selectedMood;
  });

  // Dynamic Spotify style lists computed from state
  const recentlyPlayed = [...songs]
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, 6);

  const favoriteSongs = songs.filter((s) => s.isFavorite).slice(0, 6);

  const mostPlayed = [...songs]
    .filter((s) => s.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5);

  const getSkinStyle = () => {
    switch (activeSkin) {
      case 'aurora':
        return {
          card: 'bg-[#15103a]/30 border border-purple-900/40 text-purple-200 backdrop-blur-md p-4 rounded-2xl shadow-lg relative overflow-hidden',
          textTitle: 'text-purple-300 uppercase tracking-widest text-[11px] font-black flex items-center gap-1.5',
          buttonPrimary: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-650 hover:to-indigo-700 text-white font-bold px-4 py-2 rounded-full transition shadow-md active:scale-95 text-xs tracking-wide uppercase',
          buttonSecondary: 'bg-purple-950/40 hover:bg-purple-900/50 active:scale-95 border border-purple-800/30 rounded-full px-4 py-2 text-xs text-purple-200 font-bold transition',
          badge: 'bg-purple-500/20 text-purple-300 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[8px]',
          accentText: 'text-purple-400 font-extrabold',
          input: 'w-full pl-9 pr-4 py-2 text-xs bg-[#0b0821]/60 text-purple-105 border border-purple-900 rounded-xl focus:ring-1 focus:ring-purple-500 font-medium placeholder-purple-300/30',
        };
      case 'brutalist':
        return {
          card: 'bg-black border-3 border-yellow-400 p-4 rounded-none shadow-[4px_4px_0px_#facc15]',
          textTitle: 'text-yellow-400 uppercase tracking-wider font-extrabold text-[12px] flex items-center gap-1.5',
          buttonPrimary: 'bg-yellow-400 hover:bg-yellow-500 text-slate-950 border-2 border-slate-950 font-black px-4 py-2 rounded-none transition active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0] text-xs uppercase',
          buttonSecondary: 'bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-yellow-400 font-black px-4 py-2 rounded-none transition shadow-[2px_2px_0_#facc15] text-xs uppercase',
          badge: 'bg-yellow-405 text-black font-black px-2 py-0.5 rounded-none uppercase tracking-widest text-[8px]',
          accentText: 'text-yellow-400 font-black',
          input: 'w-full pl-9 pr-4 py-2 text-xs bg-zinc-950 text-white border-2 border-yellow-450 rounded-none focus:outline-none font-bold',
        };
      case 'cyberpunk':
        return {
          card: 'bg-black border border-emerald-500/30 p-4 rounded-none shadow-[0_0_12px_rgba(16,185,129,0.06)] relative',
          textTitle: 'text-emerald-400 font-mono tracking-widest uppercase text-xs font-bold leading-none flex items-center gap-1.5',
          buttonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-none uppercase tracking-wider text-xs transition active:scale-95',
          buttonSecondary: 'bg-black border border-emerald-500/55 hover:bg-emerald-950/20 text-emerald-400 font-black px-4 py-2 rounded-none uppercase text-xs transition',
          badge: 'bg-[#051c0f] text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-none text-[8px] uppercase tracking-widest font-bold',
          accentText: 'text-emerald-400 font-bold font-mono',
          input: 'w-full pl-9 pr-4 py-2 text-xs bg-black text-emerald-400 border border-emerald-900/80 rounded-none font-mono focus:outline-none focus:border-emerald-400',
        };
      case 'organic':
        return {
          card: 'bg-[#1e1c19]/60 border border-[#3c342b] p-4 rounded-3xl shadow-sm',
          textTitle: 'text-[#e5cca4] tracking-wide text-xs font-bold font-serif flex items-center gap-1.5',
          buttonPrimary: 'bg-[#6c7d6b] hover:bg-[#5b6a5a] text-[#fbfaf8] font-bold px-4 py-2 rounded-full transition active:scale-97 text-xs',
          buttonSecondary: 'bg-[#292621] border border-[#4d4439] text-[#e5cca4] font-bold px-4 py-2 rounded-full text-xs transition',
          badge: 'bg-[#3c342b]/60 text-[#e5cca4] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[8px]',
          accentText: 'text-[#cca56f] font-bold',
          input: 'w-full pl-9 pr-4 py-2.5 text-xs bg-stone-900 text-[#eae6da] border border-[#4d453c] rounded-2xl focus:outline-none focus:border-[#cca56f] font-medium placeholder-stone-500',
        };
      default: // 'modern' (Premium Dark-First Spotify style)
        return {
          card: 'bg-zinc-900/70 border border-zinc-800/40 p-4 rounded-2xl shadow-xl backdrop-blur-md',
          textTitle: 'text-xs font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5',
          buttonPrimary: 'bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 active:scale-95 text-black font-black px-5 py-2 rounded-full transition shadow-lg text-xs uppercase tracking-wider',
          buttonSecondary: 'bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-150 rounded-full px-4 py-2 text-xs font-bold transition border border-zinc-700/30',
          badge: 'bg-[#1db954]/10 text-[#1db954] border border-[#1db954]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[8px] font-black',
          accentText: 'text-green-400 font-extrabold',
          input: 'w-full pl-9 pr-4 py-2.5 text-xs bg-zinc-950 text-zinc-100 border border-zinc-805 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1db954] font-semibold placeholder-zinc-500',
        };
    }
  };

  const style = getSkinStyle();

  return (
    <div id="home-view-container" className="flex flex-col h-full overflow-hidden">
      {/* 1. Header Splash Banner with Spotify vibe */}
      <div className="p-5 pt-7 pb-6 bg-gradient-to-b from-zinc-850/50 via-zinc-900/25 to-transparent flex justify-between items-center relative overflow-hidden flex-shrink-0">
        <div className="space-y-1 z-10 w-full">
          {/* Top user-greeting area */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {getGreeting()}
            </h1>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1db954] to-emerald-400 flex items-center justify-center text-xs text-black font-black shadow-lg">
              OP
            </div>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-1">
            Offline Sandbox Workspace
          </p>

          <div className="pt-3 flex gap-2">
            <button
              id="quick-shuffle-btn"
              onClick={handleQuickShuffle}
              className={style.buttonPrimary}
            >
              Shuffle Play
            </button>
            <button
              onClick={() => onNavigate('songs')}
              className={style.buttonSecondary}
            >
              Browse Library
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-5 scrollbar-none">
        
        {/* Core Live Skins Interactive Customizer Sandbox */}
        <div className={style.card}>
          <div className="flex justify-between items-center mb-1.5">
            <h2 className={style.textTitle}>🎨 Design Skin Sandbox</h2>
            <span className={style.badge}>
              5 Designs Live
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
            Change visual engines to alter page layout lines, button radiuses, shadows, backgrounds, and brand colors immediately!
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'modern', name: 'Spotify Theme', emoji: '🧬' },
              { id: 'aurora', name: 'Deep Cosmic', emoji: '🪐' },
              { id: 'brutalist', name: 'Pop Brutal', emoji: '⚡' },
              { id: 'cyberpunk', name: 'Matrix Terminal', emoji: '📟' },
              { id: 'organic', name: 'Linen Wood', emoji: '🪵' },
            ].map((skin) => (
              <button
                key={skin.id}
                onClick={() => onSelectSkin(skin.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer select-none flex items-center gap-1 border active:scale-95 ${
                  activeSkin === skin.id
                    ? 'bg-zinc-800 text-white border-transparent font-black shadow-lg'
                    : 'bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 border-zinc-800/40'
                }`}
              >
                <span>{skin.emoji}</span>
                <span>{skin.name}</span>
                {activeSkin === skin.id && <span className="text-[9px] text-[#1db954]">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 2. CONTINUE LISTENING (Bento Spotlight Card) */}
        {currentSong && (
          <div className={style.card}>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-800/30">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1db954] flex items-center gap-1">
                <Compass className="w-3 h-3 animate-spin-slow" /> Continue Listening
              </span>
              <span className="text-[9px] text-zinc-400">Current Track</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-zinc-805 rounded-xl text-3xl flex items-center justify-center shadow-lg relative cursor-pointer group flex-shrink-0" onClick={() => onPlaySong(currentSong)}>
                {currentSong.albumArt || '🎧'}
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-current" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white truncate">{currentSong.title}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{currentSong.artist}</p>
                <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-wide">
                  {currentSong.album} • {currentSong.genre}
                </p>
              </div>
              <button
                onClick={onTogglePlay}
                className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 active:scale-95 text-black flex items-center justify-center font-bold text-xs shadow-md"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
        )}

        {/* 3. RECENTLY PLAYED CAROUSEL */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Recently Added
            </h2>
            <button onClick={() => onNavigate('songs')} className="text-[10px] text-green-500 font-bold hover:underline">
              See all
            </button>
          </div>
          {songs.length === 0 ? (
            <div className="text-center p-6 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-xl hover:border-zinc-700 transition cursor-pointer" onClick={() => onNavigate('songs')}>
              <Music className="w-5 h-5 mx-auto text-zinc-500 mb-1.5" />
              <p className="text-[11px] text-zinc-400">No tracks inside offline Sandbox.</p>
              <p className="text-[9px] text-zinc-500 mt-1">Tap here to import sound files</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
              {recentlyPlayed.map((song) => (
                <div
                  key={`recent-${song.id}`}
                  onClick={() => onPlaySong(song)}
                  className="w-24 flex-shrink-0 cursor-pointer group active:scale-98 transition duration-150"
                >
                  <div className="w-24 h-24 bg-zinc-800 rounded-xl flex items-center justify-center text-3.5xl relative overflow-hidden shadow-md group-hover:shadow-lg hover:border hover:border-zinc-700/60">
                    {song.albumArt || '🎵'}
                    {currentSong?.id === song.id && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                        {isPlaying ? (
                          <span className="text-[9px] bg-[#1db954] text-black px-1.5 py-0.5 rounded-full font-black animate-bounce">
                            PLAYING
                          </span>
                        ) : (
                          <Play className="w-6 h-6 text-white text-opacity-80" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-zinc-100 truncate mt-1.5 mb-0.5 max-w-full">
                    {song.title}
                  </p>
                  <p className="text-[9px] text-zinc-500 truncate max-w-full">
                    {song.artist}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. PLAYLISTS GRID with covers */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Your Playlists
            </h2>
            <button onClick={() => onNavigate('playlists')} className="text-[10px] text-green-500 font-bold hover:underline">
              Library View
            </button>
          </div>
          {playlists.length === 0 ? (
            <div className="text-center p-4 bg-zinc-900/30 rounded-xl text-zinc-500 text-xs italic">
              Create offline playlists in the Library tab.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {playlists.slice(0, 4).map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => onNavigate('playlists')}
                  className="p-2 bg-zinc-900/50 hover:bg-zinc-850/60 border border-zinc-800/30 rounded-xl flex items-center gap-2.5 cursor-pointer transition active:scale-98"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-lg shadow">
                    📚
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold text-white truncate">{pl.name}</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate">
                      {pl.songIds.length} song{pl.songIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. MOOD DISCOVERY & INTELLIGENT SEARCH EMBEDDED */}
        <div className={style.card}>
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/30 mb-3">
            <h2 className={style.textTitle}>
              <Sparkles className="w-3.5 h-3.5 text-[#1db954]" />
              Tag & Emotion Sandbox
            </h2>
            <span className={style.badge}>
              Auto Moods
            </span>
          </div>

          <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
            Search songs offline or tap a Mood bubble to instantly filter your sandbox music tracks!
          </p>

          <div className="relative pt-1 pb-3">
            <Search className="absolute left-3 top-4.5 text-zinc-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search offline tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={style.input}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest pl-1 lg:pl-0">
              Discovery Mood filter Bubbles
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedMood('All')}
                className={`py-1 px-3 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer select-none ${
                  selectedMood === 'All'
                    ? 'bg-[#1db954] text-black shadow-sm'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                🌈 All Tracks
              </button>
              {(Object.keys(EMOTIONS) as SongEmotion[]).map((emotion) => {
                const meta = EMOTIONS[emotion];
                return (
                  <button
                    key={emotion}
                    onClick={() => setSelectedMood(emotion)}
                    className={`py-1 px-3 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer select-none flex items-center gap-1 ${
                      selectedMood === emotion
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-black shadow-sm font-extrabold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    <span>{emotion}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* filtered songs catalog display list */}
          <div className="pt-2 border-t border-zinc-805">
            {filteredSongs.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-[11px] italic">
                No matching tracks in your sandbox folder.
              </div>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-none pr-1">
                {filteredSongs.map((song) => {
                  const resolvedEmotion = getSongEmotion(song);
                  const meta = EMOTIONS[resolvedEmotion];
                  const isCurrent = currentSong?.id === song.id;

                  return (
                    <div
                      key={song.id}
                      onClick={() => onPlaySong(song)}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition ${
                        isCurrent 
                          ? 'bg-zinc-800/80 border border-zinc-700/50' 
                          : 'hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-base flex-shrink-0 relative">
                          <span>{song.albumArt || '🎧'}</span>
                          {isCurrent && isPlaying && (
                            <span className="absolute bottom-[-1px] right-[-1px] bg-green-500 rounded-full p-0.5 text-[7px] text-black">
                              <Volume2 className="w-2 h-2 animate-pulse" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[11px] font-bold truncate ${isCurrent ? 'text-green-405' : 'text-zinc-150'}`}>
                            {song.title}
                          </p>
                          <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => {
                              setActiveMoodSelectorId(prev => prev === song.id ? null : song.id);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border transition ${meta.bgClass} ${meta.textClass} border-transparent bg-zinc-800 text-zinc-300 hover:border-zinc-700`}
                          >
                            <span>{meta.emoji}</span>
                            <span className="hidden sm:inline">{resolvedEmotion}</span>
                            <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-55" />
                          </button>

                          {activeMoodSelectorId === song.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-950 border border-zinc-850 rounded-lg shadow-2xl z-50 py-1 font-sans">
                              {(Object.keys(EMOTIONS) as SongEmotion[]).map((emo) => {
                                const m = EMOTIONS[emo];
                                const isSelected = resolvedEmotion === emo;
                                return (
                                  <button
                                    key={emo}
                                    onClick={() => {
                                      onSetManualEmotion(song.id, emo);
                                      setActiveMoodSelectorId(null);
                                    }}
                                    className="w-full px-2 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-900 flex items-center justify-between"
                                  >
                                    <span className="flex items-center gap-1">
                                      <span>{m.emoji}</span>
                                      <span>{emo}</span>
                                    </span>
                                    {isSelected && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] font-mono text-zinc-500">
                          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                        </span>

                        {onDeleteSong && (
                          <div className="flex items-center">
                            {deletingId === song.id ? (
                              <button
                                onClick={() => {
                                  onDeleteSong(song.id);
                                  setDeletingId(null);
                                }}
                                className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[8px] font-bold rounded transition cursor-pointer"
                              >
                                Confirm?
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeletingId(song.id);
                                  setTimeout(() => setDeletingId(prev => prev === song.id ? null : prev), 3000);
                                }}
                                className="p-1 text-zinc-500 hover:text-red-500 transition cursor-pointer"
                                title="Delete track"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 6. FAVORITE SONGS IN HOME */}
        {favoriteSongs.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Your Favorites
            </h2>
            <div className="grid grid-cols-1 gap-1.5">
              {favoriteSongs.map((song) => (
                <div
                  key={`fav-${song.id}`}
                  onClick={() => onPlaySong(song)}
                  className="p-2 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-850/40 rounded-xl flex items-center justify-between cursor-pointer transition active:scale-99"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl select-none">{song.albumArt || '❤️'}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{song.title}</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5 truncate">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {onDeleteSong && (
                      <div className="flex items-center">
                        {deletingId === song.id ? (
                          <button
                            onClick={() => {
                              onDeleteSong(song.id);
                              setDeletingId(null);
                            }}
                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[8px] font-bold rounded transition cursor-pointer"
                          >
                            Confirm?
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setDeletingId(song.id);
                              setTimeout(() => setDeletingId(prev => prev === song.id ? null : prev), 3000);
                            }}
                            className="p-1 text-zinc-500 hover:text-red-500 transition cursor-pointer"
                            title="Delete track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-current flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. MOST PLAYED (Stats Ranking) */}
        {mostPlayed.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-550" /> Most Played Tracks
            </h2>
            <div className="bg-zinc-900/30 border border-zinc-850/30 rounded-xl overflow-hidden">
              {mostPlayed.map((song, idx) => (
                <div
                  key={`most-${song.id}`}
                  onClick={() => onPlaySong(song)}
                  className="p-2.5 hover:bg-zinc-900/50 flex items-center justify-between cursor-pointer transition border-b border-zinc-900 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-black text-zinc-500 w-4 pl-0.5 font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-lg select-none">{song.albumArt || '🔥'}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{song.title}</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5 truncate">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {onDeleteSong && (
                      <div className="flex items-center">
                        {deletingId === song.id ? (
                          <button
                            onClick={() => {
                              onDeleteSong(song.id);
                              setDeletingId(null);
                            }}
                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[8px] font-bold rounded transition cursor-pointer"
                          >
                            Confirm?
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setDeletingId(song.id);
                              setTimeout(() => setDeletingId(prev => prev === song.id ? null : prev), 3000);
                            }}
                            className="p-1 text-zinc-500 hover:text-red-500 transition cursor-pointer"
                            title="Delete track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    <span className="text-[8px] bg-zinc-800 text-green-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                      {song.playCount} play{song.playCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Sleep Timer Widget */}
        <div className={style.card}>
          <div className="flex justify-between items-center pb-2 border-b border-zinc-850 mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-zinc-300">
              <Hourglass className="w-3.5 h-3.5 text-violet-500" />
              Sleep Timer
            </h2>
            {sleepTimer.isActive && (
              <span className="text-[10px] font-bold text-violet-400 bg-violet-950/20 px-20 py-0.5 rounded-full animate-pulse">
                {formatSleepTime(sleepTimer.timeLeftSeconds)} remaining
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
            Auto-fades and stops your local music playback when you fall asleep:
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[5, 15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => onStartSleepTimer(mins)}
                className={`py-1 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  sleepTimer.isActive && sleepTimer.durationMinutes === mins
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {mins} mins
              </button>
            ))}
          </div>
        </div>

        {/* Security / Privacy Guarantee Badge */}
        <div className={`p-4 bg-emerald-500/5 border border-emerald-500/20 ${activeSkin === 'brutalist' ? 'rounded-none' : 'rounded-2xl'} flex items-start gap-3`}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm flex-shrink-0">
            <Shield className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <h3 className="text-xs font-black text-emerald-400">Total Offline Privacy</h3>
            <p className="text-[10px] text-zinc-400 leading-relaxed mt-0.5">
              Zero telemetry, zero trace. Your song files and playlist databases are fully sandboxed offline on this device via IndexedDB.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
