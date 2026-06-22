import React, { useState, useRef } from 'react';
import { Search, FolderSync, Plus, Trash2, FolderMinus, Radio, ShieldAlert, ListPlus, Music, Heart, Disc, Check, Folder } from 'lucide-react';
import { Song, Playlist } from '../types';

interface SongsViewProps {
  songs: Song[];
  isPlaying: boolean;
  currentSong: Song | null;
  onPlaySong: (song: Song) => void;
  onToggleFavorite: (id: string) => void;
  onImportSongs: (files: FileList) => void;
  onDeleteSong: (id: string) => void;
  excludedFolders: string[];
  onAddExcludedFolder: (folderName: string) => void;
  onRemoveExcludedFolder: (folderName: string) => void;
  playlists: Playlist[];
  onAddSongToPlaylist: (songId: string, playlistId: string) => void;
  onCreatePlaylist: (name: string, description?: string) => void;
}

type SubTab = 'all' | 'albums' | 'artists' | 'genres' | 'folders';

export default function SongsView({
  songs,
  isPlaying,
  currentSong,
  onPlaySong,
  onToggleFavorite,
  onImportSongs,
  onDeleteSong,
  excludedFolders,
  onAddExcludedFolder,
  onRemoveExcludedFolder,
  playlists,
  onAddSongToPlaylist,
  onCreatePlaylist,
}: SongsViewProps) {
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showFolderExclusionDialog, setShowFolderExclusionDialog] = useState(false);
  const [newExcludedFolder, setNewExcludedFolder] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activePlaylistMenuSongId, setActivePlaylistMenuSongId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Grouping Helpers
  const isIncluded = (song: Song) => {
    if (!song.path) return true;
    return !excludedFolders.some(folder => 
      song.path?.toLowerCase().includes(`/${folder.toLowerCase()}/`) ||
      song.path?.toLowerCase().startsWith(`${folder.toLowerCase()}/`)
    );
  };

  const filteredSongs = songs
    .filter(isIncluded)
    .filter(song => {
      const match = searchQuery.toLowerCase();
      return (
        song.title.toLowerCase().includes(match) ||
        song.artist.toLowerCase().includes(match) ||
        song.album.toLowerCase().includes(match) ||
        song.genre.toLowerCase().includes(match)
      );
    });

  // Unique Albums
  const albumGroups = filteredSongs.reduce<Record<string, Song[]>>((acc, song) => {
    const albumName = song.album || 'Unknown Album';
    if (!acc[albumName]) acc[acc[albumName] ? albumName + ' ' : albumName] = [];
    acc[albumName].push(song);
    return acc;
  }, {});

  // Unique Artists
  const artistGroups = filteredSongs.reduce<Record<string, Song[]>>((acc, song) => {
    const artistName = song.artist || 'Unknown Artist';
    if (!acc[artistName]) acc[artistName] = [];
    acc[artistName].push(song);
    return acc;
  }, {});

  // Unique Genres
  const genreGroups = filteredSongs.reduce<Record<string, Song[]>>((acc, song) => {
    const genreName = song.genre || 'Other';
    if (!acc[genreName]) acc[genreName] = [];
    acc[genreName].push(song);
    return acc;
  }, {});

  // Unique Folders
  const folderGroups = filteredSongs.reduce<Record<string, Song[]>>((acc, song) => {
    const pathParts = song.path ? song.path.split('/') : ['Sandbox Store'];
    const folderName = pathParts.length > 2 ? pathParts[pathParts.length - 2] : 'Music Standard';
    if (!acc[folderName]) acc[folderName] = [];
    acc[folderName].push(song);
    return acc;
  }, {});

  // Drag and Drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportSongs(e.dataTransfer.files);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="songs-view-container" className="flex flex-col h-full overflow-hidden">
      
      {/* 1. Header with Search controls */}
      <div className="p-4 pt-6 bg-gradient-to-b from-zinc-900 to-[#121212] flex flex-col gap-3.5 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase sm:normal-case">Search Catalogue</h1>
            <p className="text-[10px] text-zinc-400 font-bold tracking-widest mt-0.5">
              {filteredSongs.length} TRACKS READY • {songs.length - filteredSongs.length} EXCLUDED
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              id="exclude-folder-btn"
              onClick={() => setShowFolderExclusionDialog(!showFolderExclusionDialog)}
              className={`p-2 rounded-xl transition duration-250 ${
                showFolderExclusionDialog 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title="Configure exclusions"
            >
              <FolderMinus className="w-4 h-4" />
            </button>
            <button
              id="import-toggle-btn"
              onClick={() => setShowScanner(!showScanner)}
              className="flex items-center gap-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black px-3 py-1.5 rounded-full text-xs font-black transition uppercase tracking-wider"
            >
              <FolderSync className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>
        </div>

        {/* Unified clean search field */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
          <input
            id="search-songs-input"
            type="text"
            placeholder="What do you want to listen to?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 focus:bg-zinc-850 border border-zinc-800/60 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#1db954] transition duration-200 font-medium"
          />
        </div>

        {/* Dynamic Category Pill Selectors */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', name: 'Songs' },
            { id: 'albums', name: 'Albums' },
            { id: 'artists', name: 'Artists' },
            { id: 'genres', name: 'Genres' },
            { id: 'folders', name: 'Folders' },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`subtab-${tab.id}`}
              onClick={() => setSubTab(tab.id as SubTab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition ${
                subTab === tab.id
                  ? 'bg-white text-black font-extrabold shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-205 hover:bg-zinc-850'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Directory excluder slider panel */}
      {showFolderExclusionDialog && (
        <div className="p-4 bg-amber-950/15 border-b border-amber-900/30 font-sans">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Folder Exclusion filters</h3>
            <button 
              onClick={() => setShowFolderExclusionDialog(false)}
              className="text-[9px] text-amber-500 hover:underline font-extrabold uppercase"
            >
              Close
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
            Simulate folder excluders (e.g. "Recordings", "Podcasts") to keep your music library pristine.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Case-sensitive index name..."
              value={newExcludedFolder}
              onChange={(e) => setNewExcludedFolder(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-zinc-800 rounded-lg text-xs bg-zinc-950 text-white placeholder-zinc-650"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newExcludedFolder.trim()) {
                  onAddExcludedFolder(newExcludedFolder.trim());
                  setNewExcludedFolder('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newExcludedFolder.trim()) {
                  onAddExcludedFolder(newExcludedFolder.trim());
                  setNewExcludedFolder('');
                }
              }}
              className="bg-amber-550 hover:bg-amber-600 px-3.5 py-1.5 text-zinc-950 font-black rounded-lg text-xs uppercase"
            >
              Exclude
            </button>
          </div>

          {excludedFolders.length === 0 ? (
            <p className="text-[10px] text-zinc-500 italic">No excluded selectors configured.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {excludedFolders.map(folder => (
                <span 
                  key={folder}
                  className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold"
                >
                  <span>{folder}</span>
                  <button 
                    onClick={() => onRemoveExcludedFolder(folder)}
                    className="hover:text-red-400 font-extrabold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modern drag and drop file scanner zone */}
      {showScanner && (
        <div 
          id="music-dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`p-5 m-3 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition ${
            dragActive 
              ? 'border-[#1db954] bg-[#1db954]/5' 
              : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70'
          }`}
        >
          <FolderSync className="w-8 h-8 text-[#1db954] mb-2 animate-bounce" />
          <h2 className="text-xs font-black text-white uppercase tracking-wider">
            Sandboxed Audio Importer
          </h2>
          <p className="text-[10px] text-zinc-400 max-w-sm my-1.5 leading-relaxed">
            Drag music tracks or click button to import. Files are parsed entirely client-side, encrypted and saved securely into local sandbox.
          </p>
          <div className="pt-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-1.5 bg-white text-black font-black hover:scale-103 rounded-full text-xs uppercase transition shadow-lg"
            >
              Choose track files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onImportSongs(e.target.files);
                  setShowScanner(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main content viewports based on category tab selection */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-none">
        {filteredSongs.length === 0 ? (
          /* Empty catalogue guidance display */
          <div className="text-center py-24 px-6 flex flex-col justify-center items-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex justify-center items-center mb-4 text-3xl">
              💿
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Sandbox Library Empty</h3>
            <p className="text-[10px] text-zinc-400 leading-relaxed max-w-[240px] mt-2">
              Get started by importing music files or choosing from preset catalog tracks in settings!
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="mt-4 px-5 py-1.5 bg-zinc-805 hover:bg-zinc-800 border border-zinc-700/50 rounded-full text-[10px] uppercase font-bold text-green-400 shadow transition"
            >
              Import Files Now
            </button>
          </div>
        ) : (
          <div>
            {/* RENDER SONGS TAB */}
            {subTab === 'all' && (
              <div className="space-y-1.5">
                {filteredSongs.map((song, index) => {
                  const isCurrent = currentSong?.id === song.id;
                  return (
                    <div
                      key={`song-${song.id}`}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer group transition ${
                        isCurrent 
                          ? 'bg-zinc-900 border border-zinc-800' 
                          : 'hover:bg-zinc-900/40 border border-transparent'
                      }`}
                      onClick={() => onPlaySong(song)}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0 select-none shadow-sm relative">
                          {song.albumArt || '🎧'}
                          {isCurrent && isPlaying && (
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 flex justify-center py-0.5">
                              <span className="w-1 h-2 bg-green-500 rounded-full animate-bounce mx-0.5" />
                              <span className="w-1 h-3 bg-green-500 rounded-full animate-bounce mx-0.5" style={{ animationDelay: '0.2s' }} />
                              <span className="w-1 h-1.5 bg-green-500 rounded-full animate-bounce mx-0.5" style={{ animationDelay: '0.4s' }} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-extrabold truncate ${isCurrent ? 'text-green-400' : 'text-zinc-150'}`}>
                            {song.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      {/* Control buttons inside list item */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Playlists append button dropdown menu trigger */}
                        <div className="relative">
                          <button
                            onClick={() => setActivePlaylistMenuSongId(activePlaylistMenuSongId === song.id ? null : song.id)}
                            className="p-1 px-1.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                            title="Add to offline playlist"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                          </button>

                          {activePlaylistMenuSongId === song.id && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl z-55 py-1.5 text-left animate-fade-in font-sans">
                              <p className="text-[8px] text-zinc-550 font-black uppercase tracking-widest px-2.5 pb-1 mb-1 border-b border-zinc-850">
                                Save to playlist
                              </p>
                              {playlists.length === 0 ? (
                                <button
                                  onClick={() => {
                                    onCreatePlaylist('New Mixtape', 'Offline playlist creator');
                                    setActivePlaylistMenuSongId(null);
                                  }}
                                  className="w-full px-2.5 py-1 text-[10px] text-zinc-400 hover:bg-zinc-900 hover:text-white flex items-center justify-between font-semibold"
                                >
                                  <span>+ Create Playlist</span>
                                </button>
                              ) : (
                                playlists.map((pl) => {
                                  const contains = pl.songIds.includes(song.id);
                                  return (
                                    <button
                                      key={pl.id}
                                      onClick={() => {
                                        onAddSongToPlaylist(song.id, pl.id);
                                        setActivePlaylistMenuSongId(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-[10px] text-zinc-200 hover:bg-zinc-900 flex items-center justify-between font-semibold"
                                    >
                                      <span className="truncate max-w-[110px]">{pl.name}</span>
                                      {contains ? <Check className="w-3 h-3 text-green-500" /> : <Plus className="w-3 h-3 opacity-30" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>

                        {/* Favorite button */}
                        <button
                          onClick={() => onToggleFavorite(song.id)}
                          className="p-1.5 hover:text-red-500 text-zinc-500 transition-colors duration-250"
                        >
                          <Heart className={`w-3.5 h-3.5 ${song.isFavorite ? 'text-red-500 fill-current' : ''}`} />
                        </button>

                        {/* Delete offline song file */}
                        <div className="flex items-center min-w-[28px] justify-center">
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
                              className="p-1.5 text-zinc-500 hover:text-red-500 opacity-60 hover:opacity-100 transition duration-200"
                              title="Delete from Sandbox Store"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-zinc-500 min-w-[28px] text-right">
                          {formatDuration(song.duration)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RENDER ALBUMS TAB */}
            {subTab === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
                {Object.keys(albumGroups).map((albumName) => {
                  const albumTracks = albumGroups[albumName];
                  const artwork = albumTracks[0]?.albumArt || '📀';
                  const artists = Array.from(new Set(albumTracks.map(t => t.artist))).join(', ');

                  return (
                    <div
                      key={albumName}
                      className="p-3 bg-zinc-900/60 border border-zinc-800/40 rounded-xl hover:bg-zinc-905 transition cursor-pointer active:scale-98"
                      onClick={() => {
                        onPlaySong(albumTracks[0]);
                      }}
                    >
                      <div className="w-full aspect-square rounded-lg bg-zinc-800 flex items-center justify-center text-5xl mb-2.5 shadow">
                        {artwork}
                      </div>
                      <p className="text-xs font-extrabold text-white truncate max-w-full">{albumName}</p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5 max-w-full">{artists}</p>
                      <p className="text-[8px] bg-zinc-800 text-zinc-450 px-2 py-0.5 rounded-full inline-block font-mono tracking-widest mt-2">
                        {albumTracks.length} TRACK{albumTracks.length !== 1 ? 'S' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RENDER ARTISTS TAB */}
            {subTab === 'artists' && (
              <div className="space-y-1.5">
                {Object.keys(artistGroups).map((artistName) => {
                  const artistTracks = artistGroups[artistName];
                  return (
                    <div
                      key={artistName}
                      onClick={() => onPlaySong(artistTracks[0])}
                      className="p-3 bg-zinc-900/60 border border-zinc-800/30 rounded-xl hover:bg-zinc-850 flex items-center justify-between cursor-pointer transition active:scale-99"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1db954]/15 border border-[#1db954]/25 flex items-center justify-center text-sm font-black text-[#1db954]">
                          {artistName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-white">{artistName}</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">
                            {artistTracks.length} offline album tracks grouped
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-505 font-medium bg-zinc-800 px-2 py-0.5 rounded">
                        Browse Group
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RENDER GENRES TAB */}
            {subTab === 'genres' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {Object.keys(genreGroups).map((genreName) => {
                  const genreTracks = genreGroups[genreName];
                  return (
                    <div
                      key={genreName}
                      onClick={() => onPlaySong(genreTracks[0])}
                      className="p-3 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-850 rounded-xl hover:scale-101 active:scale-99 transition cursor-pointer flex flex-col justify-between h-24"
                    >
                      <p className="text-sm font-black text-white capitalize">{genreName}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] font-mono text-green-400">
                          {genreTracks.length} files
                        </span>
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex justify-center items-center text-xs">
                          🎸
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RENDER FOLDERS TAB */}
            {subTab === 'folders' && (
              <div className="space-y-1.5">
                {Object.keys(folderGroups).map((folderName) => {
                  const folderTracks = folderGroups[folderName];
                  return (
                    <div
                      key={folderName}
                      onClick={() => onPlaySong(folderTracks[0])}
                      className="p-3 bg-zinc-900/60 border border-zinc-800/35 rounded-xl hover:bg-zinc-850 flex items-center justify-between cursor-pointer transition active:scale-99"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Folder className="w-5 h-5 text-yellow-450 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-white truncate">{folderName}</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5 truncate">
                            {folderTracks[0]?.path || 'Indexed Device storage block'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-450 font-bold bg-zinc-805 px-2 py-0.5 rounded flex-shrink-0">
                        {folderTracks.length} loaded
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
