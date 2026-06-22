import React, { useState } from 'react';
import { 
  Play, Plus, Trash2, Heart, History, Award, Download, Upload, ClipboardCheck, ArrowLeft,
  Share2, Copy, Check, Grid, List, Disc, Calendar, Music, Clock
} from 'lucide-react';
import { Song, Playlist } from '../types';
import { generateShareablePlaylistLink } from '../utils/shareHelper';

interface PlaylistsViewProps {
  playlists: Playlist[];
  songs: Song[];
  recentSongIds: string[];
  onPlaySong: (song: Song) => void;
  onPlayPlaylist: (playlistId: string) => void;
  onCreatePlaylist: (name: string, description?: string) => void;
  onDeletePlaylist: (id: string) => void;
  onBackupPlaylists: () => void;
  onRestorePlaylists: (jsonString: string) => Promise<boolean>;
  onRemoveSongFromPlaylist: (songId: string, playlistId: string) => void;
}

export default function PlaylistsView({
  playlists,
  songs,
  recentSongIds,
  onPlaySong,
  onPlayPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onBackupPlaylists,
  onRestorePlaylists,
  onRemoveSongFromPlaylist,
}: PlaylistsViewProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'done' | 'fail'; text: string } | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Sharing States
  const [activeSharePlaylist, setActiveSharePlaylist] = useState<Playlist | null>(null);
  const [copiedShareSuccess, setCopiedShareSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derive favorite songs
  const favoriteSongs = songs.filter(s => s.isFavorite);

  // Derive recently played
  const recentSongs = recentSongIds
    .map(id => songs.find(s => s.id === id))
    .filter((s): s is Song => !!s);

  // Derive most played
  const mostPlayedSongs = [...songs]
    .filter(s => s.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 10);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setShowCreateModal(false);
  };

  const handleJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the user accidentally selected a music file instead of a playlist backup file
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAudio = file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(ext || '');

    if (isAudio) {
      setRestoreMessage({ 
        type: 'fail', 
        text: `Oops! You selected an audio track ("${file.name}"). To import songs, please click the "Search" tab on the bottom bar, and then click the "Import" button!` 
      });
      e.target.value = '';
      setTimeout(() => setRestoreMessage(null), 6000);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const success = await onRestorePlaylists(text);
        if (success) {
          setRestoreMessage({ type: 'done', text: 'Playlists restored successfully!' });
        } else {
          setRestoreMessage({ type: 'fail', text: 'Failed to parse playlist backup format.' });
        }
      } catch {
        setRestoreMessage({ type: 'fail', text: 'Error reading backup file.' });
      }
      setTimeout(() => setRestoreMessage(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render detail view of a selected playlist
  if (selectedPlaylistId) {
    const activePlaylist = playlists.find(p => p.id === selectedPlaylistId);
    if (!activePlaylist) {
      setSelectedPlaylistId(null);
      return null;
    }

    const playlistSongs = activePlaylist.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s);

    const playlistDuration = playlistSongs.reduce((sum, s) => sum + s.duration, 0);

    return (
      <div id="playlist-detail-container" className="flex flex-col h-full overflow-hidden bg-zinc-950 animate-fade-in">
        
        {/* Detail view banner header */}
        <div className="p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-900 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSelectedPlaylistId(null)}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300 transition"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-black text-white truncate">{activePlaylist.name}</h1>
              <p className="text-[10px] text-zinc-400 truncate tracking-wide max-w-[180px] uppercase mt-0.5 font-bold">
                {activePlaylist.description || 'Offline Playlist'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onPlayPlaylist(activePlaylist.id)}
            disabled={playlistSongs.length === 0}
            className="flex items-center gap-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black px-4 py-1.5 rounded-full text-xs font-black transition disabled:opacity-30 tracking-wider uppercase shadow-md"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Shuffle play</span>
          </button>
        </div>

        {/* 1. Large playlist cover image section with stats */}
        <div className="p-5 bg-gradient-to-b from-zinc-950 via-zinc-900/45 to-transparent flex flex-col items-center justify-center text-center flex-shrink-0 border-b border-zinc-900/30">
          <div className="w-36 h-36 bg-gradient-to-tr from-green-950 to-zinc-850 text-white text-6xl rounded-2xl flex items-center justify-center shadow-2xl relative border border-zinc-805">
            📚
            <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#1db954] flex items-center justify-center text-[10px]">
              ✓
            </div>
          </div>

          <div className="mt-3.5 space-y-1">
            <p className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-widest">
              {playlistSongs.length} track{playlistSongs.length !== 1 ? 's' : ''} • {Math.floor(playlistDuration / 60)} minutes
            </p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Offline compilation • Created local Sandbox
            </p>
          </div>
        </div>

        {/* List of track list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 scrollbar-none">
          {playlistSongs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-zinc-900 text-zinc-650 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
                💿
              </div>
              <p className="text-xs font-bold text-zinc-400">Your playlist is quiet</p>
              <p className="text-[10px] text-zinc-500 mt-2 max-w-[240px] mx-auto leading-relaxed">
                Add tracks from the <span className="font-extrabold text-zinc-300">Search</span> library menu to customize this offline compilation.
              </p>
              <button
                onClick={() => setSelectedPlaylistId(null)}
                className="mt-4 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-full text-[10px] text-zinc-300 font-extrabold uppercase"
              >
                Go back library
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {playlistSongs.map((song, idx) => (
                <div
                  key={`${song.id}-${idx}`}
                  onClick={() => onPlaySong(song)}
                  className="p-1.5 bg-zinc-900/20 hover:bg-zinc-900/80 rounded-xl flex items-center justify-between cursor-pointer group border border-transparent transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] text-zinc-500 font-mono w-4 text-center font-bold">
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded bg-zinc-800 flex items-center justify-center text-lg shadow flex-shrink-0">
                      {song.albumArt || '🎵'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white truncate">{song.title}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onRemoveSongFromPlaylist(song.id, activePlaylist.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 transition"
                      title="Remove track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-500 min-w-[28px] text-right">
                      {formatTime(song.duration)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="playlists-view-container" className="flex flex-col h-full overflow-hidden bg-[#121212]">
      
      {/* 2. Top Banner Header */}
      <div className="p-4 pt-6 bg-gradient-to-b from-zinc-900 to-[#121212] flex flex-col gap-3.5 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Your Library</h1>
            <p className="text-[10px] text-zinc-400 tracking-widest font-bold mt-0.5">
              {playlists.length} CUSTOM TRACK MIXES PLANNED
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800/60 rounded-xl text-zinc-400 transition"
              title={viewMode === 'grid' ? 'Switch to List view' : 'Switch to Grid view'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            <button
              id="create-playlist-btn"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black px-4.5 py-1.5 rounded-full text-xs font-black transition tracking-wider uppercase shadow-md"
            >
              <Plus className="w-3.5 h-3.5 text-black" />
              <span>Create</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 scrollbar-none">
        
        {/* Backup and restore panels */}
        <div className="bg-zinc-900/60 border border-zinc-800/40 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5 text-[#1db954]" />
            Migration Manager
          </h2>
          <p className="text-[10px] text-zinc-400 mb-3.5 leading-relaxed">
            Download your playlist indices as an offline JSON config backup, or restore custom playlist parameters from any device.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              id="backup-playlists-btn"
              onClick={onBackupPlaylists}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700/30 hover:bg-zinc-700 text-zinc-200 text-[10.5px] rounded-full font-bold transition"
            >
              <Download className="w-3 h-3" />
              <span>Backup</span>
            </button>
            <label className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700/30 hover:bg-zinc-700 text-zinc-205 text-[10.5px] rounded-full font-bold cursor-pointer transition">
              <Upload className="w-3 h-3" />
              <span>Restore JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleJSONUpload}
                className="hidden"
              />
            </label>
          </div>
          {restoreMessage && (
            <div className={`mt-3 p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
              restoreMessage.type === 'done' 
                ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-450 border border-rose-550/20'
            }`}>
              {restoreMessage.text}
            </div>
          )}
        </div>

        {/* SMART/AUTOMATIC COLLECTION CARDS */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#1db954] pl-0.5">
            Smart Selections
          </h2>

          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-2'}>
            
            {/* FAVORITES SPOTLIGHT COVER */}
            <div
              onClick={() => {
                // If clicked, build an arbitrary custom list or navigate
                if (favoriteSongs.length > 0) {
                  const favId = 'favorites-smart';
                  setSelectedPlaylistId(null);
                  onPlaySong(favoriteSongs[0]);
                }
              }}
              className="p-3 bg-gradient-to-br from-zinc-900 to-[#121212] border border-zinc-800/40 rounded-2xl flex flex-col justify-between h-28 cursor-pointer hover:border-red-500/30 transition group active:scale-98"
            >
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-lg">
                  ❤️
                </div>
                {favoriteSongs.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      songs.filter(s => s.isFavorite).forEach(s => onPlaySong(s));
                    }}
                    className="w-7 h-7 rounded-full bg-white text-black hidden group-hover:flex items-center justify-center shadow-lg hover:scale-105"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>
                )}
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase tracking-wider">Favorites</p>
                <p className="text-[9px] text-zinc-400 mt-0.5">{favoriteSongs.length} offline tracks</p>
              </div>
            </div>

            {/* RECENTLY PLAYED SMART COVER */}
            <div
              onClick={() => {
                if (recentSongs.length > 0) onPlaySong(recentSongs[0]);
              }}
              className="p-3 bg-gradient-to-br from-zinc-900 to-[#121212] border border-zinc-800/40 rounded-2xl flex flex-col justify-between h-28 cursor-pointer hover:border-zinc-700 transition group active:scale-98"
            >
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-450 flex items-center justify-center text-lg">
                  🕒
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase tracking-wider">Recently Play</p>
                <p className="text-[9px] text-zinc-400 mt-0.5">
                  {recentSongs.length} tracks catalogued
                </p>
              </div>
            </div>

            {/* MOST PLAYED SMART COVER */}
            <div
              onClick={() => {
                if (mostPlayedSongs.length > 0) onPlaySong(mostPlayedSongs[0]);
              }}
              className="p-3 bg-gradient-to-br from-zinc-900 to-[#121212] border border-zinc-800/40 rounded-2xl flex flex-col justify-between h-28 cursor-pointer hover:border-green-500/30 transition group active:scale-98"
            >
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-xl bg-green-500/10 text-[#1db954] flex items-center justify-center text-lg">
                  🏆
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase tracking-wider">Most Played</p>
                <p className="text-[9px] text-zinc-400 mt-0.5">{mostPlayedSongs.length} active tracks</p>
              </div>
            </div>

            {/* TOTAL STATS INDEX BLOCK */}
            <div className="p-3 bg-gradient-to-br from-zinc-900 to-[#121212] border border-zinc-800/30 rounded-2xl flex flex-col justify-between h-28">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-450 flex items-center justify-center text-lg">
                📁
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase tracking-wider">Storage Index</p>
                <p className="text-[9px] text-zinc-400 mt-0.5">Device secure IndexedDB</p>
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOM MIXES */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#1db954] pl-0.5">
            Your Playlists ({playlists.length})
          </h2>
          {playlists.length === 0 ? (
            <div className="text-center py-7 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
              <p className="text-[11px] text-zinc-400 italic">No custom playlists created yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs text-green-400 hover:underline mt-1 font-black uppercase tracking-wider"
              >
                + Create playlist
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-1.5"}>
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  id={`playlist-card-${playlist.id}`}
                  className="bg-zinc-900 border border-zinc-800/60 p-3 rounded-2xl flex flex-col md:flex-row justify-between hover:border-zinc-700 transition relative animate-fade-in group active:scale-98"
                >
                  <div 
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-2 pb-2.5 md:pb-0"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                      📚
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-white truncate">
                        {playlist.name}
                      </h3>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5 uppercase tracking-wide font-bold">
                        {playlist.songIds.length} track{playlist.songIds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onPlayPlaylist(playlist.id)}
                      className="p-1 px-2.0 bg-zinc-800 hover:bg-zinc-750 text-white text-[9px] font-black uppercase rounded-full transition"
                      title="Play Mix"
                    >
                      Play
                    </button>
                    <button
                      onClick={() => {
                        setActiveSharePlaylist(playlist);
                        setCopiedShareSuccess(false);
                      }}
                      className="p-1 px-2.0 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white text-[9px] font-black uppercase rounded-full transition"
                      title="Share Playlist"
                    >
                      Share
                    </button>
                    <div className="flex items-center min-w-[28px] justify-center">
                      {deletingId === playlist.id ? (
                        <button
                          onClick={() => {
                            onDeletePlaylist(playlist.id);
                            setDeletingId(null);
                          }}
                          className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white text-[8px] font-bold rounded transition cursor-pointer"
                        >
                          Confirm?
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setDeletingId(playlist.id);
                            setTimeout(() => setDeletingId(prev => prev === playlist.id ? null : prev), 3000);
                          }}
                          className="p-1.5 text-zinc-550 hover:text-red-500 rounded-full transition"
                          title="Delete Mix"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sharing modal Overlay link box */}
      {activeSharePlaylist && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-55">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-scale-up font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#1db954]">Share compilation</h3>
              <button onClick={() => setActiveSharePlaylist(null)} className="text-zinc-500 hover:text-white text-sm font-bold">×</button>
            </div>
            
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Generate a shareable URL containing the IDs of tracks in <span className="font-extrabold text-white">"{activeSharePlaylist.name}"</span> so friends can auto-import this playlist config!
            </p>

            <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center justify-between gap-2.5">
              <span className="text-[9px] font-mono text-zinc-400 truncate max-w-[210px]">
                {generateShareablePlaylistLink(activeSharePlaylist)}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateShareablePlaylistLink(activeSharePlaylist));
                  setCopiedShareSuccess(true);
                  setTimeout(() => setCopiedShareSuccess(false), 2000);
                }}
                className="p-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black rounded font-black text-[9px] uppercase transition flex-shrink-0"
              >
                {copiedShareSuccess ? 'Copied' : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <button 
              onClick={() => setActiveSharePlaylist(null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-1.5 rounded-full text-xs uppercase"
            >
              Done close
            </button>
          </div>
        </div>
      )}

      {/* Playlist visual create pop-up modal dialog box overlay */}
      {showCreateModal && (
        <div className="absolute inset-x-0 bottom-0 bg-black/90 backdrop-blur-md border-t border-zinc-800 max-w-md mx-auto z-55 p-5 shadow-2xl font-sans rounded-t-3xl animate-slide-up">
          <div className="flex justify-between items-center pb-2 mb-3 border-b border-zinc-850">
            <h3 className="text-xs font-black text-[#1db954] uppercase tracking-widest">New Offline Play Mix</h3>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-zinc-500 hover:text-white text-lg font-bold"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest pl-0.5">Playlist Name</label>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="e.g. Summer Hits, Chill Gym"
                className="w-full text-xs p-2.5 bg-zinc-950 text-white border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1db954]"
                required
                maxLength={40}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest pl-0.5">Description (Optional)</label>
              <input
                type="text"
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                placeholder="Offline track mixtape compilation..."
                className="w-full text-xs p-2.5 bg-zinc-950 text-white border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1db954]"
                maxLength={90}
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-full text-xs font-bold uppercase transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#1db954] hover:bg-[#1ed760] text-black py-2 rounded-full text-xs font-black uppercase transition shadow-lg"
              >
                Form Build mix
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
