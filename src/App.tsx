import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Music, ListMusic, Settings, Play, Pause, SkipForward, SlidersIcon,
  Volume2, ShieldAlert, Sparkles, Sun, Moon, Hourglass, X, Search, Library
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Song, Playlist, EqualizerBand, SleepTimer, ActiveTab, RepeatMode } from './types';
import { MOCK_SONGS } from './mockData';
import { 
  getAllSongs, saveSong, getPlaylists, savePlaylist, deletePlaylistDB, 
  getSetting, saveSetting, deleteSong 
} from './utils/db';
import { 
  setupAudioPipeline, startOfflineSynth, stopOfflineSynth, updateEQBandValue, getAudioContext 
} from './utils/audioEngine';
import { SongEmotion } from './utils/emotionClassifier';
import { parseShareablePlaylist } from './utils/shareHelper';

// Firebase and Auth
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth, syncUserDataToCloud, fetchUserDataFromCloud } from './utils/firebase';
import AuthModal from './components/AuthModal';
import SoundMeaningIdentifierModal from './components/SoundMeaningIdentifierModal';

// Subviews
import HomeView from './components/HomeView';
import SongsView from './components/SongsView';
import PlaylistsView from './components/PlaylistsView';
import EqualizerView from './components/EqualizerView';
import SettingsView from './components/SettingsView';
import PlayerView from './components/PlayerView';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<ActiveTab | 'equalizer'>('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTheme, setActiveTheme] = useState('indigo');

  // Music state
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [recentSongIds, setRecentSongIds] = useState<string[]>([]);
  const [excludedFolders, setExcludedFolders] = useState<string[]>(['podcasts', 'calls']);

  // Custom Playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [continuousPlay, setContinuousPlay] = useState<boolean>(true);

  // Active custom responsive skin style preset
  const [activeSkin, setActiveSkin] = useState<string>('modern');

  // Manual Song emotions state override map
  const [manualEmotions, setManualEmotions] = useState<Record<string, SongEmotion>>({});
  
  // Floating Toast Mix Alert state
  const [toastMessage, setToastMessage] = useState<{ text: string; details?: string } | null>(null);

  // Sound Equalizer setup
  const [eqBands, setEqBands] = useState<EqualizerBand[]>([
    { hz: 60, gain: 0 },
    { hz: 230, gain: 0 },
    { hz: 910, gain: 0 },
    { hz: 4000, gain: 0 },
    { hz: 14000, gain: 0 }
  ]);

  // Sleep Timer
  const [sleepTimer, setSleepTimer] = useState<SleepTimer>({
    durationMinutes: 0,
    timeLeftSeconds: 0,
    isActive: false,
  });

  // Full Screen / Bottom-sheet player state
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Sound & Meaning Identifier state for custom song imports
  const [pendingSongsToIdentify, setPendingSongsToIdentify] = useState<Song[]>([]);

  // Account Cloud Auth states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isLocalStorageLoaded, setIsLocalStorageLoaded] = useState(false);

  // PWA installation trigger state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Installer completed choice:', outcome);
    setDeferredPrompt(null);
  };

  // HTML Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedSongIdRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const sleepIntervalRef = useRef<any>(null);
  const compactPlayerDragRef = useRef<boolean>(false);

  // Reusable loadData function to refresh app state dynamically upon restore
  const loadData = async () => {
    // Dark mode loader
    const darkSetting = await getSetting<boolean>('isDarkMode', true);
    setIsDarkMode(darkSetting);
    if (darkSetting) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Accent color loader
    const themeSetting = await getSetting<string>('activeTheme', 'indigo');
    setActiveTheme(themeSetting);

    // Excluded folders loader
    const foldersSetting = await getSetting<string[]>('excludedFolders', ['podcasts', 'calls']);
    setExcludedFolders(foldersSetting);

    // EQ bands loader
    const storedBands = await getSetting<EqualizerBand[]>('eqBands', eqBands);
    setEqBands(storedBands);

    // Continuous play loader
    const storedContinuous = await getSetting<boolean>('continuousPlay', true);
    setContinuousPlay(storedContinuous);

    // Active skin layout loader
    const storedSkin = await getSetting<string>('activeSkin', 'modern');
    setActiveSkin(storedSkin);

    // Manual song emotions manual overrides loader
    const storedManual = await getSetting<Record<string, SongEmotion>>('manualEmotions', {});
    setManualEmotions(storedManual);
    setIsLocalStorageLoaded(true);
  };

  // Initial load from local IndexedDB and Sync Firebase Auth
  useEffect(() => {
    loadData();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncingCloud(true);
        try {
          // 1. Load user's private songs from local IndexedDB
          let storedSongs = await getAllSongs();
          
          // Cleanup/delete any existing Imagine Dragons songs that were previously seeded
          let didCleanup = false;
          const imagineSongs = storedSongs.filter(s => s.artist === 'Imagine Dragons' || s.id.startsWith('imagine-'));
          for (const s of imagineSongs) {
            await deleteSong(s.id);
            didCleanup = true;
          }
          if (didCleanup) {
            storedSongs = await getAllSongs();
          }

          let missingAdded = false;
          const deletedDefaultSongs = await getSetting<string[]>('deletedDefaultSongs', []);
          for (const defaultSong of MOCK_SONGS) {
            if (!deletedDefaultSongs.includes(defaultSong.id) && !storedSongs.some(item => item.id === defaultSong.id)) {
              await saveSong(defaultSong);
              missingAdded = true;
            }
          }
          if (missingAdded) {
            storedSongs = await getAllSongs();
          }
          
          // 2. Fetch profile from Cloud Firestore
          const profile = await fetchUserDataFromCloud(user.uid);
          
          if (profile) {
            // Restoring cloud configurations
            if (profile.activeTheme) {
              setActiveTheme(profile.activeTheme);
              saveSetting('activeTheme', profile.activeTheme);
            }
            if (profile.activeSkin) {
              setActiveSkin(profile.activeSkin);
              saveSetting('activeSkin', profile.activeSkin);
            }
            if (profile.recentSongIds) {
              setRecentSongIds(profile.recentSongIds);
              saveSetting('recentSongIds', profile.recentSongIds);
            } else {
              setRecentSongIds([]);
            }
            
            // Sync Playlists
            if (profile.playlists && profile.playlists.length > 0) {
              for (const pl of profile.playlists) {
                await savePlaylist(pl);
              }
              const localPlaylists = await getPlaylists();
              setPlaylists(localPlaylists);
            } else {
              setPlaylists([]);
            }

            // Sync Favorites
            const favoriteIds = profile.favoriteSongIds || [];
            const updatedSongs = storedSongs.map(s => {
              const fav = favoriteIds.includes(s.id);
              return { ...s, isFavorite: fav };
            });
            
            // Save updated songs with favorites to IndexedDB so local is synced
            for (const s of updatedSongs) {
              if (s.id.startsWith('uploaded-')) {
                await saveSong(s);
              }
            }
            setSongs(updatedSongs);

            setToastMessage({
              text: `Sync complete! Cloud Profile loaded`,
              details: `Logged in as ${user.displayName || user.email}. Preferences restored.`
            });
          } else {
            // Profile not yet in cloud, load from local IndexedDB
            setSongs(storedSongs);
            const localPlaylists = await getPlaylists();
            setPlaylists(localPlaylists);
            const storedRecents = await getSetting<string[]>('recentSongIds', []);
            setRecentSongIds(storedRecents);
          }
        } catch (err: any) {
          if (err?.code === 'unavailable' || !navigator.onLine || err?.message?.includes('offline')) {
            console.warn("Cloud Sync is working offline. Changes will save locally and sync when connection is restabilized.");
          } else {
            console.warn("Auto Sync system notice:", err);
          }
          // Fallback to local on error
          try {
            let storedSongs = await getAllSongs();
            
            // Cleanup/delete any existing Imagine Dragons songs that were previously seeded
            let didCleanup = false;
            const imagineSongs = storedSongs.filter(s => s.artist === 'Imagine Dragons' || s.id.startsWith('imagine-'));
            for (const s of imagineSongs) {
              await deleteSong(s.id);
              didCleanup = true;
            }
            if (didCleanup) {
              storedSongs = await getAllSongs();
            }

            let missingAdded = false;
            const deletedDefaultSongs = await getSetting<string[]>('deletedDefaultSongs', []);
            for (const defaultSong of MOCK_SONGS) {
              if (!deletedDefaultSongs.includes(defaultSong.id) && !storedSongs.some(item => item.id === defaultSong.id)) {
                await saveSong(defaultSong);
                missingAdded = true;
              }
            }
            if (missingAdded) {
              storedSongs = await getAllSongs();
            }
            setSongs(storedSongs);
            const localPlaylists = await getPlaylists();
            setPlaylists(localPlaylists);
            const storedRecents = await getSetting<string[]>('recentSongIds', []);
            setRecentSongIds(storedRecents);
          } catch (localErr) {
            console.warn("Local fallback loading failed:", localErr);
          }
        } finally {
          setIsSyncingCloud(false);
        }
      } else {
        // Logged out: strictly show NO user progress whatsoever
        setSongs([]);
        setPlaylists([]);
        setRecentSongIds([]);
        setQueue([]);
        setCurrentSong(null);
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
        }
        stopOfflineSynth();
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-sync configuration and state changes to Cloud in real-time
  useEffect(() => {
    if (!currentUser || !isLocalStorageLoaded || isSyncingCloud) return;

    // Use a slight debounce to prevent spamming write requests during rapid operations like adding songs of active list
    const delayDebounceFn = setTimeout(async () => {
      try {
        const favIds = songs.filter(s => s.isFavorite).map(s => s.id);
        await syncUserDataToCloud(currentUser.uid, {
          email: currentUser.email,
          displayName: currentUser.displayName,
          playlists: playlists,
          recentSongIds: recentSongIds,
          favoriteSongIds: favIds,
          activeTheme: activeTheme,
          activeSkin: activeSkin
        });
        console.log("Account changes automatically synchronized to secure cloud folder ✓");
      } catch (err: any) {
        if (err?.code === 'unavailable' || !navigator.onLine || err?.message?.includes('offline')) {
          console.warn("Auto background sync will resume once device connection is restabilized.");
        } else {
          console.warn("Auto background sync deferred:", err);
        }
      }
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [playlists, recentSongIds, songs, activeTheme, activeSkin, currentUser, isLocalStorageLoaded]);

  // Manual logout
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setToastMessage({
        text: "Logged out",
        details: "You have disconnected your cloud account. Back to local playback mode."
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Manual configuration push to Cloud
  const handleSyncWithCloud = async () => {
    if (!currentUser) return;
    setIsSyncingCloud(true);
    try {
      const favIds = songs.filter(s => s.isFavorite).map(s => s.id);
      await syncUserDataToCloud(currentUser.uid, {
        email: currentUser.email,
        displayName: currentUser.displayName,
        playlists: playlists,
        recentSongIds: recentSongIds,
        favoriteSongIds: favIds,
        activeTheme: activeTheme,
        activeSkin: activeSkin
      });
      setToastMessage({
        text: "Cloud backup success! ☁️",
        details: "All local playlists, favorite indicators, and active theme profiles saved securely."
      });
    } catch (err) {
      console.error("Failed manual backup:", err);
      setToastMessage({
        text: "Backup failed ⚠️",
        details: "Could not upload setup to Firestore."
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Update Manual Song Emotion Overrides
  const handleSetManualEmotion = (songId: string, emotion: SongEmotion) => {
    setManualEmotions((prev) => {
      const updated = { ...prev, [songId]: emotion };
      saveSetting('manualEmotions', updated);
      return updated;
    });
  };

  // Change Active Design Skin styling dynamically
  const handleSelectSkin = (skin: string) => {
    setActiveSkin(skin);
    saveSetting('activeSkin', skin);
  };

  // URL Hash Listener for shared Mixtape playlist imports
  useEffect(() => {
    const checkForImport = async () => {
      const hash = window.location.hash;
      if (hash && (hash.includes('import-mix=') || hash.includes('share-mix='))) {
        const parsed = parseShareablePlaylist(hash);
        if (parsed && parsed.name && parsed.songIds) {
          // Check if playlist with same name or ID already exists to prevent duplicate spamming
          const exists = playlists.some(p => p.name === parsed.name);
          if (exists) {
            setToastMessage({
              text: "Playlist Already Imported",
              details: `"${parsed.name}" is already available in your smart playlist inventory.`
            });
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }

          // Generate complete Playlist object
          const newPlaylist: Playlist = {
            id: parsed.id || `shared-${Date.now()}`,
            name: parsed.name,
            description: parsed.description || 'Shared offline mixtape',
            songIds: parsed.songIds,
            createdAt: parsed.createdAt || Date.now(),
            isCustom: true
          };

          // Save to local state and DB
          setPlaylists(prev => {
            const updated = [...prev, newPlaylist];
            return updated;
          });
          await savePlaylist(newPlaylist);

          // Alert user with gorgeous toast
          setToastMessage({
            text: "Mixtape Imported Successfully! 📼",
            details: `"${parsed.name}" containing ${parsed.songIds.length} tracks registered to your offline library!`
          });

          // Clean url hash safely without reload
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    // Delay slightly to ensure playlists and songs are loaded first
    const timer = setTimeout(() => {
      checkForImport();
    }, 1000);

    // Also listen to hash changes
    const onHashChange = () => checkForImport();
    window.addEventListener('hashchange', onHashChange);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [playlists]);

  // Update Dark Mode styling change
  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    saveSetting('isDarkMode', nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSelectTheme = (themeId: string) => {
    setActiveTheme(themeId);
    saveSetting('activeTheme', themeId);
  };

  // Connect Web Audio API Pipeline once element is ready
  useEffect(() => {
    if (audioRef.current) {
      setupAudioPipeline(audioRef.current, eqBands);
    }
  }, [audioRef.current]);

  // Synchronize playing states safely to support instant resumption and dynamic user gestures
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      // Ensure the AudioContext is resumed synchronously inside the audio stream pipeline context if possible
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      } catch (e) {
        console.warn('AudioContext state synch check:', e);
      }

      // If song played is a true uploaded physical file (has local Blob), play using browser HTMLAudioElement URL
      if (currentSong.blob) {
        stopOfflineSynth();
        
        const isSameSong = loadedSongIdRef.current === currentSong.id;
        
        if (!isSameSong) {
          // Revoke the old object URL to prevent memory leaks and free up layout space
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          
          const objUrl = URL.createObjectURL(currentSong.blob);
          objectUrlRef.current = objUrl;
          loadedSongIdRef.current = currentSong.id;
          
          audioRef.current.src = objUrl;
          audioRef.current.loop = false; // Real uploaded audio files shouldn't loop directly unless repeatMode requires
          audioRef.current.load();
        }
        
        // Handle play promise to avoid chrome autoplay race
        audioRef.current.play().catch((e) => {
          console.warn('HTML Audio playback paused or blocked by browser permission gesture:', e);
        });
      } else {
        // Mock default songs fall back to our algorithmic real-time synthesizer!
        // This guarantees actual, charming localized audio plays without requiring network!
        const SILENT_TRACK_URL = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        
        const isSameSong = loadedSongIdRef.current === currentSong.id;
        if (!isSameSong) {
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          loadedSongIdRef.current = currentSong.id;
          audioRef.current.src = SILENT_TRACK_URL;
          audioRef.current.loop = true;
          audioRef.current.load();
        }

        // Play the silent audio to register active sound playing and keep timers alive in background
        audioRef.current.play().catch((e) => {
          console.warn('Silent tracker playback failed:', e);
        });

        stopOfflineSynth();
        startOfflineSynth(currentSong.genre);
      }
    } else {
      audioRef.current.pause();
      stopOfflineSynth();
    }
  }, [isPlaying, currentSong]);

  // Play a song & register stats ensuring correct user action permissions
  const handlePlaySong = (song: Song) => {
    // Proactively initiate and resume AudioContext on active user gesture
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (audioRef.current) {
        setupAudioPipeline(audioRef.current, eqBands);
      }
    } catch (e) {
      console.warn('Proactive AudioContext resume failed on user play click:', e);
    }

    const isNewSong = !currentSong || currentSong.id !== song.id;
    setCurrentSong(song);
    setIsPlaying(true);

    if (isNewSong) {
      setPlaybackProgress(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }

      // Add to recently played list
      const updatedRecents = [song.id, ...recentSongIds.filter(id => id !== song.id)].slice(0, 15);
      setRecentSongIds(updatedRecents);
      saveSetting('recentSongIds', updatedRecents);

      // Increment play count statistcs
      const updatedSongs = songs.map((s) => {
        if (s.id === song.id) {
          const nextCount = s.playCount + 1;
          const nextSong = { ...s, playCount: nextCount };
          if (song.id.startsWith('uploaded-')) {
            saveSong(nextSong);
          }
          return nextSong;
        }
        return s;
      });
      setSongs(updatedSongs);

      // Set up queue sequence if not defined yet
      if (queue.length === 0 || !queue.some(q => q.id === song.id)) {
        setQueue(isShuffle ? shuffleArray([...songs]) : [...songs]);
      }
    }
  };

  // Toggle play/pause
  const handleTogglePlay = () => {
    // Proactively initiate and resume AudioContext on active user gesture
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (audioRef.current) {
        setupAudioPipeline(audioRef.current, eqBands);
      }
    } catch (e) {
      console.warn('Proactive AudioContext resume failed on user toggle play:', e);
    }

    if (!currentSong && songs.length > 0) {
      handlePlaySong(songs[0]);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Music Seeker
  const handleSeek = (seconds: number) => {
    setPlaybackProgress(seconds);
    if (audioRef.current && currentSong?.blob) {
      audioRef.current.currentTime = seconds;
    }
  };

  // Media ticking handler
  const handleTimeUpdate = () => {
    if (audioRef.current && currentSong?.blob) {
      setPlaybackProgress(audioRef.current.currentTime);
    } else if (isPlaying && currentSong) {
      // Simulated ticking for synthesized tracks
      setPlaybackProgress((prev) => {
        if (prev >= currentSong.duration) {
          handleNext();
          return 0;
        }
        return prev + 1;
      });
    }
  };

  // Custom shuffler helper
  const shuffleArray = (arr: any[]) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // Auto-advance or explicit skip
  const handleNext = () => {
    if (queue.length === 0) return;
    
    if (repeatMode === 'one' && currentSong) {
      setPlaybackProgress(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      // Re-trigger play state
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
      return;
    }

    const currentIdx = queue.findIndex(s => s.id === currentSong?.id);
    let nextIdx = currentIdx + 1;

    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else if (continuousPlay) {
        // Continuous playback: recommend and play a random song from all available songs
        const availableSongs = songs.filter(s => s.id !== currentSong?.id && !excludedFolders.some(folder => 
          s.path?.toLowerCase().includes(`/${folder.toLowerCase()}/`) ||
          s.path?.toLowerCase().startsWith(`${folder.toLowerCase()}/`)
        ));
        if (availableSongs.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableSongs.length);
          handlePlaySong(availableSongs[randomIndex]);
          return;
        } else {
          nextIdx = 0;
        }
      } else {
        setIsPlaying(false);
        setPlaybackProgress(0);
        return;
      }
    }

    handlePlaySong(queue[nextIdx]);
  };

  const handlePrev = () => {
    if (queue.length === 0 || !currentSong) return;

    const currentIdx = queue.findIndex(s => s.id === currentSong.id);
    let prevIdx = currentIdx - 1;

    if (prevIdx < 0) {
      if (repeatMode === 'all') {
        prevIdx = queue.length - 1;
      } else {
        prevIdx = 0; // Hold at first track
      }
    }

    handlePlaySong(queue[prevIdx]);
  };

  // Setup HTML5 Media Session for System Background Audio & Lock Screen Controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    // Update system-level metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || 'Synth Collection',
      artwork: [
        {
          src: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=256&h=256',
          sizes: '256x256',
          type: 'image/jpeg',
        },
        {
          src: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=512&h=512',
          sizes: '512x512',
          type: 'image/jpeg',
        },
      ],
    });

    // Sync media session playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentSong, isPlaying]);

  // Bind playback action handlers to Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNext();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        if (audioRef.current && currentSong?.blob) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
        } else {
          setPlaybackProgress(prev => Math.max(prev - offset, 0));
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        if (audioRef.current && currentSong?.blob) {
          const duration = audioRef.current.duration || currentSong.duration;
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + offset, duration);
        } else {
          setPlaybackProgress(prev => Math.min(prev + offset, currentSong ? currentSong.duration : 120));
        }
      });
    } catch (e) {
      console.warn('Media session action handler binding error:', e);
    }

    return () => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, [currentSong, handleNext, handlePrev]);

  // Toggle Repeat Mode state
  const handleToggleRepeatMode = () => {
    setRepeatMode((prev) => {
      if (prev === 'none') return 'one';
      if (prev === 'one') return 'all';
      return 'none';
    });
  };

  // Toggle Shuffle state
  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);
    
    if (nextShuffle) {
      setQueue(shuffleArray([...songs]));
    } else {
      setQueue([...songs]);
    }
  };

  // Favorites tag toggler
  const handleToggleFavorite = (id: string) => {
    const updatedSongs = songs.map((s) => {
      if (s.id === id) {
        const nextFav = !s.isFavorite;
        const nextSong = { ...s, isFavorite: nextFav };
        if (id.startsWith('uploaded-')) {
          saveSong(nextSong);
        }
        return nextSong;
      }
      return s;
    });
    setSongs(updatedSongs);

    // Also update active track favorites indicator state
    if (currentSong?.id === id) {
      setCurrentSong(prev => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  // EQ Band Adjustments
  const handleChangeEQBand = (hz: number, gain: number) => {
    const updatedBands = eqBands.map(b => b.hz === hz ? { ...b, gain } : b);
    setEqBands(updatedBands);
    saveSetting('eqBands', updatedBands);
    updateEQBandValue(hz, gain);
  };

  // Sleep Timer countdown loops
  const handleStartSleepTimer = (mins: number) => {
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);

    setSleepTimer({
      durationMinutes: mins,
      timeLeftSeconds: mins * 60,
      isActive: true,
    });

    sleepIntervalRef.current = setInterval(() => {
      setSleepTimer((prev) => {
        if (!prev.isActive || prev.timeLeftSeconds <= 1) {
          clearInterval(sleepIntervalRef.current);
          setIsPlaying(false); // Stop song!
          stopOfflineSynth();
          return { durationMinutes: 0, timeLeftSeconds: 0, isActive: false };
        }
        return {
          ...prev,
          timeLeftSeconds: prev.timeLeftSeconds - 1,
        };
      });
    }, 1000);
  };

  const handleStopSleepTimer = () => {
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
    }
    setSleepTimer({
      durationMinutes: 0,
      timeLeftSeconds: 0,
      isActive: false,
    });
  };

  // Scans device storage using HTML FileReader and sets dynamic parameters!
  const handleImportSongs = async (files: FileList) => {
    const scannedList: Song[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() as any;
      const formatsAllowed = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];

      if (!formatsAllowed.includes(ext)) {
        continue;
      }

      // Guess metadata from file name structure gracefully
      let guessedTitle = file.name.replace(/\.[^/.]+$/, ""); // Strip file extension
      let guessedArtist = 'Device Scanned File';
      if (guessedTitle.includes('-')) {
        const parts = guessedTitle.split('-');
        guessedArtist = parts[0].trim();
        guessedTitle = parts[1].trim();
      }

      // Read audio file duration using browser HTML audio loader
      const durationPromise = new Promise<number>((resolve) => {
        const tempAudio = new Audio();
        tempAudio.src = URL.createObjectURL(file);
        tempAudio.onloadedmetadata = () => {
          resolve(Math.round(tempAudio.duration) || 120);
          URL.revokeObjectURL(tempAudio.src);
        };
        tempAudio.onerror = () => {
          resolve(120); // Default placeholder duration to prevent failure
        };
      });

      const actualDuration = await durationPromise;

      const newSong: Song = {
        id: `uploaded-${Date.now()}-${i}`,
        title: guessedTitle,
        artist: guessedArtist,
        album: 'Offline Local Folder',
        genre: 'Audio Import',
        duration: actualDuration,
        format: ext,
        blob: file, // Save the actual binary Blob in db
        albumArt: '📁',
        path: `/scanned/storage/emulated/0/Music/${file.name}`,
        playCount: 0,
        addedAt: Date.now(),
        isFavorite: false,
        lyrics: `[00:00.00] (Instrumental • Playing "${guessedTitle}")\n[00:02.00] Offline music stream active without network tracking.`
      };

      scannedList.push(newSong);
    }

    if (scannedList.length > 0) {
      setPendingSongsToIdentify(scannedList);
    }
  };

  // Called when song in the flow gets its category assigned explicitly or as automatic fallback
  const handleSetIdentifierCategory = async (songId: string, category: SongEmotion) => {
    const song = pendingSongsToIdentify.find(s => s.id === songId);
    if (!song) return;

    // 1. Assign manual emotion category
    setManualEmotions((prev) => {
      const updated = { ...prev, [songId]: category };
      saveSetting('manualEmotions', updated);
      return updated;
    });

    // 2. Commit the song binary to local IndexedDB
    await saveSong(song);

    // 3. Insert into current active tracks models
    setSongs((prev) => {
      const updated = [song, ...prev];
      return updated;
    });

    setQueue((prev) => {
      const updated = [song, ...prev];
      return updated;
    });
  };

  // Clean library database
  const handleClearLibrary = async () => {
    // Delete all songs
    for (const song of songs) {
      await deleteSong(song.id);
    }
    // Set to empty song list
    setSongs([]);
  };

  // Delete individual custom song (works on any song)
  const handleDeleteSong = async (id: string) => {
    try {
      await deleteSong(id);
    } catch (err) {
      console.warn("Could not delete from IndexedDB (might be default track):", err);
    }

    try {
      const deletedDefault = await getSetting<string[]>('deletedDefaultSongs', []);
      if (!deletedDefault.includes(id)) {
        const updatedDeletedDefault = [...deletedDefault, id];
        await saveSetting('deletedDefaultSongs', updatedDeletedDefault);
      }
    } catch (err) {
      console.warn("Could not persist deleted song ID state:", err);
    }
    
    // Remove from master list
    setSongs(prev => prev.filter(s => s.id !== id));
    
    // Remove from playing queue
    setQueue(prev => prev.filter(s => s.id !== id));
    
    // Remote from playlists
    setPlaylists(prevPlaylists => {
      const updated = prevPlaylists.map(pl => {
        if (pl.songIds.includes(id)) {
          const freshPl = { ...pl, songIds: pl.songIds.filter(sid => sid !== id) };
          savePlaylist(freshPl); // persist updated playlist
          return freshPl;
        }
        return pl;
      });
      return updated;
    });

    // If deleting the active song
    if (currentSong?.id === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentSong(null);
      setPlaybackProgress(0);
    }
  };

  // Remove individual song from queue
  const handleRemoveFromQueue = (songId: string) => {
    setQueue(prev => prev.filter(s => s.id !== songId));
  };

  // Playlist management
  const handleCreatePlaylist = async (name: string, description?: string) => {
    const newPlay: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      description,
      songIds: [],
      createdAt: Date.now(),
      isCustom: true
    };
    await savePlaylist(newPlay);
    setPlaylists(prev => [newPlay, ...prev]);
  };

  const handleDeletePlaylist = async (id: string) => {
    await deletePlaylistDB(id);
    setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const handleAddSongToPlaylist = async (songId: string, playlistId: string) => {
    const updatedPlaylists = playlists.map(p => {
      if (p.id === playlistId) {
        if (p.songIds.includes(songId)) return p;
        const updated = { ...p, songIds: [...p.songIds, songId] };
        savePlaylist(updated);
        return updated;
      }
      return p;
    });
    setPlaylists(updatedPlaylists);
  };

  const handleRemoveSongFromPlaylist = async (songId: string, playlistId: string) => {
    const updatedPlaylists = playlists.map(p => {
      if (p.id === playlistId) {
        const updated = { ...p, songIds: p.songIds.filter(id => id !== songId) };
        savePlaylist(updated);
        return updated;
      }
      return p;
    });
    setPlaylists(updatedPlaylists);
  };

  const handleToggleContinuousPlay = () => {
    const nextContinuous = !continuousPlay;
    setContinuousPlay(nextContinuous);
    saveSetting('continuousPlay', nextContinuous);
  };

  // Trigger JSON file downloads of current playlists configuration
  const handleBackupPlaylists = () => {
    const backupData = {
      version: 'v2.4.2',
      playlists: playlists.map(p => ({
        name: p.name,
        description: p.description,
        songIds: p.songIds,
      })),
      favorites: songs.filter(s => s.isFavorite).map(s => s.title),
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MyOfflineMusic_Mixtapes_Backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Restores playlists JSON string format
  const handleRestorePlaylists = async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.playlists || !Array.isArray(parsed.playlists)) return false;

      for (const rawPlay of parsed.playlists) {
        const newPlay: Playlist = {
          id: `playlist-restored-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: rawPlay.name || 'Restored Mix',
          description: rawPlay.description || 'Verified Restore',
          songIds: rawPlay.songIds || [],
          createdAt: Date.now(),
          isCustom: true
        };
        await savePlaylist(newPlay);
        setPlaylists(prev => [newPlay, ...prev]);
      }
      return true;
    } catch {
      return false;
    }
  };

  // Play whole playlist sequence
  const handlePlayPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || playlist.songIds.length === 0) return;

    const playSongs = playlist.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s);

    if (playSongs.length > 0) {
      setQueue(playSongs);
      handlePlaySong(playSongs[0]);
    }
  };

  // Add folder exclusion names
  const handleAddExcludedFolder = (folderName: string) => {
    if (!excludedFolders.includes(folderName)) {
      const updated = [...excludedFolders, folderName];
      setExcludedFolders(updated);
      saveSetting('excludedFolders', updated);
    }
  };

  const handleRemoveExcludedFolder = (folderName: string) => {
    const updated = excludedFolders.filter(f => f !== folderName);
    setExcludedFolders(updated);
    saveSetting('excludedFolders', updated);
  };

  // Theme style selector classes
  const getThemeColorClass = () => {
    switch (activeTheme) {
      case 'amber': return 'from-amber-500 to-amber-700';
      case 'emerald': return 'from-emerald-600 to-emerald-800';
      case 'rose': return 'from-rose-500 to-rose-700';
      case 'slate': return 'from-slate-750 to-slate-800';
      default: return 'from-indigo-600 to-indigo-800';
    }
  };

  const getSkinContainerClass = () => {
    switch (activeSkin) {
      case 'aurora':
        return 'bg-gradient-to-b from-[#100b26] via-[#060410] to-[#010104] text-indigo-100 font-sans border-x border-indigo-950/50 relative duration-500 transition-all';
      case 'brutalist':
        return 'bg-[#0d0d0f] text-white font-sans border-x-4 border-yellow-400 relative duration-300';
      case 'cyberpunk':
        return 'bg-[#020503] text-emerald-400 font-mono border-x border-emerald-950/60 duration-300 antialiased relative';
      case 'organic':
        return 'bg-gradient-to-b from-[#1c1a17] via-[#11100f] to-[#070707] text-[#ece9e0] font-sans border-x border-stone-800 duration-500';
      default: // 'modern' (standard black first Spotify style)
        return 'bg-[#121212] text-zinc-100 font-sans border-x border-zinc-900 duration-300';
    }
  };

  return (
    <div className="flex justify-center bg-[#09090b] w-full min-h-screen text-zinc-150 antialiased transition-colors duration-300">
      {/* Responsive unified player container - flows beautifully on small mobile screens to large desktop monitors */}
      <div className={`w-full max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl md:rounded-2xl md:my-4 md:h-[95vh] md:shadow-2xl md:ring-1 md:ring-zinc-800/60 relative flex flex-col h-screen overflow-hidden ${getSkinContainerClass()}`}>
        
        {/* Main Viewport Router with Page Transitions */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full"
            >
              {activeTab === 'home' && (
                <HomeView
                  songs={songs}
                  playlists={playlists}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlaySong={handlePlaySong}
                  onTogglePlay={handleTogglePlay}
                  onNavigate={(tab) => {
                    if (tab === 'songs' || tab === 'playlists' || tab === 'settings' || (tab as string) === 'home') {
                      setActiveTab(tab as any);
                    }
                  }}
                  sleepTimer={sleepTimer}
                  onStartSleepTimer={handleStartSleepTimer}
                  manualEmotions={manualEmotions}
                  onSetManualEmotion={handleSetManualEmotion}
                  activeSkin={activeSkin}
                  onSelectSkin={handleSelectSkin}
                  activeTheme={activeTheme}
                  onSelectTheme={handleSelectTheme}
                  onDeleteSong={handleDeleteSong}
                />
              )}

              {activeTab === 'songs' && (
                <SongsView
                  songs={songs}
                  isPlaying={isPlaying}
                  currentSong={currentSong}
                  onPlaySong={handlePlaySong}
                  onToggleFavorite={handleToggleFavorite}
                  onImportSongs={handleImportSongs}
                  onDeleteSong={handleDeleteSong}
                  excludedFolders={excludedFolders}
                  onAddExcludedFolder={handleAddExcludedFolder}
                  onRemoveExcludedFolder={handleRemoveExcludedFolder}
                  playlists={playlists}
                  onAddSongToPlaylist={handleAddSongToPlaylist}
                  onCreatePlaylist={handleCreatePlaylist}
                />
              )}

              {activeTab === 'playlists' && (
                <PlaylistsView
                  playlists={playlists}
                  songs={songs}
                  recentSongIds={recentSongIds}
                  onPlaySong={handlePlaySong}
                  onPlayPlaylist={handlePlayPlaylist}
                  onCreatePlaylist={handleCreatePlaylist}
                  onDeletePlaylist={handleDeletePlaylist}
                  onBackupPlaylists={handleBackupPlaylists}
                  onRestorePlaylists={handleRestorePlaylists}
                  onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
                />
              )}

              {activeTab === 'equalizer' && (
                <EqualizerView
                  eqBands={eqBands}
                  onChangeEQBand={handleChangeEQBand}
                  isPlaying={isPlaying}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={handleToggleDarkMode}
                  activeTheme={activeTheme}
                  onSelectTheme={handleSelectTheme}
                  sleepTimer={sleepTimer}
                  onStartSleepTimer={handleStartSleepTimer}
                  onStopSleepTimer={handleStopSleepTimer}
                  excludedFolders={excludedFolders}
                  songs={songs}
                  onClearLibrary={handleClearLibrary}
                  onAddExcludedFolder={handleAddExcludedFolder}
                  onRemoveExcludedFolder={handleRemoveExcludedFolder}
                  continuousPlay={continuousPlay}
                  onToggleContinuousPlay={handleToggleContinuousPlay}
                  onRefreshAppState={loadData}
                  activeSkin={activeSkin}
                  onSelectSkin={handleSelectSkin}
                  currentUser={currentUser}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  onSignOut={handleSignOut}
                  onSyncWithCloud={handleSyncWithCloud}
                  isSyncingCloud={isSyncingCloud}
                  deferredPrompt={deferredPrompt}
                  onTriggerInstall={handleTriggerInstall}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dynamic Compact Floating Mini Player Bar - Spotify Style (Support Swipe-to-Skip Gestures) */}
        {currentSong && !isPlayerOpen && (
          <motion.div 
            id="compact-dock-player"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.65}
            onDragStart={() => {
              compactPlayerDragRef.current = false;
            }}
            onDrag={(event, info) => {
              if (Math.abs(info.offset.x) > 10) {
                compactPlayerDragRef.current = true;
              }
            }}
            onDragEnd={(event, info) => {
              const threshold = 60;
              if (info.offset.x < -threshold) {
                handleNext();
              } else if (info.offset.x > threshold) {
                handlePrev();
              }
              setTimeout(() => {
                compactPlayerDragRef.current = false;
              }, 100);
            }}
            onClick={() => {
              if (compactPlayerDragRef.current) return;
              setIsPlayerOpen(true);
            }}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mx-3.5 mb-2.5 p-2 bg-zinc-900/90 backdrop-blur-md text-white rounded-xl flex items-center justify-between cursor-pointer shadow-2xl border border-zinc-800/50 z-30 hover:bg-zinc-850 active:scale-98 transition duration-250 animate-fade-in touch-none"
          >
            <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0 select-none shadow-md overflow-hidden relative">
                {currentSong.albumArt || '🎵'}
                {isPlaying && (
                  <span className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse mx-0.5" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1 h-4 bg-green-500 rounded-full animate-pulse mx-0.5" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1 h-2 bg-green-500 rounded-full animate-pulse mx-0.5" style={{ animationDelay: '0.5s' }} />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-100 truncate">{currentSong.title}</p>
                <p className="text-[10px] text-zinc-400 font-semibold truncate mt-0.5">{currentSong.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* Sound visual equalizer shortcut button */}
              <button
                onClick={() => setActiveTab('equalizer')}
                className={`p-1.5 rounded-full hover:bg-zinc-800 transition ${activeTab === 'equalizer' ? 'text-green-400 font-bold' : 'text-zinc-400'}`}
                title="Open sound equalizer"
              >
                <SlidersIcon className="w-4 h-4" />
              </button>
              
              {/* Play/Pause control */}
              <button
                id="dock-play-btn"
                onClick={handleTogglePlay}
                className="w-8.5 h-8.5 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center font-bold text-sm shadow transition"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current text-black" /> : <Play className="w-3.5 h-3.5 fill-current text-black ml-0.5" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* Floating Capsule Bottom Navigation Menu tabs */}
        <div className="px-4 pb-3">
          <nav className="p-1.5 bg-zinc-950/90 backdrop-blur-xl border border-zinc-900 rounded-2xl flex justify-around items-center flex-shrink-0 z-20 shadow-2xl">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'songs', label: 'Search', icon: Search },
              { id: 'playlists', label: 'Library', icon: Library },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Define skin color accents
              let activeColorClass = 'text-green-500';
              let activeBgClass = 'bg-zinc-900/70';

              if (activeSkin === 'cyberpunk') {
                activeColorClass = 'text-emerald-400';
                activeBgClass = 'bg-emerald-950/20';
              } else if (activeSkin === 'brutalist') {
                activeColorClass = 'text-yellow-400';
                activeBgClass = 'bg-zinc-900';
              } else if (activeSkin === 'organic') {
                activeColorClass = 'text-[#cca56f]';
                activeBgClass = 'bg-[#cca56f]/10';
              } else if (activeSkin === 'aurora') {
                activeColorClass = 'text-indigo-400';
                activeBgClass = 'bg-indigo-950/40';
              }

              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex flex-col items-center justify-center py-1 flex-1 group transition cursor-pointer"
                >
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-1.5 px-3.5 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? `${activeBgClass} ${activeColorClass} font-bold` 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </motion.div>
                  <span className={`text-[9px] mt-0.5 tracking-wider font-extrabold uppercase transition-colors duration-200 ${
                    isActive ? activeColorClass : 'text-zinc-500'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dedicated Hidden HTMLAudioElement used for exact clock synchronizations and Blob streaming */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNext}
          className="hidden"
          controls={false}
          autoPlay={false}
        />

        {/* Fullscreen Expandable Active Player bottom-sheet */}
        {isPlayerOpen && (
          <PlayerView
            currentSong={currentSong}
            isPlaying={isPlaying}
            playbackProgress={playbackProgress}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onPrev={handlePrev}
            onNext={handleNext}
            repeatMode={repeatMode}
            onToggleRepeatMode={handleToggleRepeatMode}
            isShuffle={isShuffle}
            onToggleShuffle={handleToggleShuffle}
            onToggleFavorite={handleToggleFavorite}
            queue={queue}
            onPlaySong={handlePlaySong}
            onClose={() => setIsPlayerOpen(false)}
            continuousPlay={continuousPlay}
            onToggleContinuousPlay={handleToggleContinuousPlay}
            onRemoveFromQueue={handleRemoveFromQueue}
            onDeleteSong={handleDeleteSong}
          />
        )}

        {/* Floating Toast notification for Playlist imports */}
        {toastMessage && (
          <div id="import-notification-toast" className="absolute top-4 left-4 right-4 bg-slate-900 border border-slate-800 text-white p-3.5 rounded-2xl shadow-2xl z-50 flex items-start gap-3 animate-slide-down">
            <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 animate-pulse">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black tracking-tight">{toastMessage.text}</p>
              {toastMessage.details && (
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">{toastMessage.details}</p>
              )}
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Auth modal overlay popup */}
        {isAuthModalOpen && (
          <AuthModal 
            onClose={() => setIsAuthModalOpen(false)} 
            onAuthSuccess={(email, name) => {
              // Modal closes automatically, state changes are captured via our onAuthStateChanged listener
            }} 
          />
        )}

        {/* Sound & Meaning cognitive classifier wizard */}
        {pendingSongsToIdentify.length > 0 && (
          <SoundMeaningIdentifierModal 
            songsToIdentify={pendingSongsToIdentify}
            onSetCategory={handleSetIdentifierCategory}
            onFinish={() => setPendingSongsToIdentify([])}
          />
        )}
      </div>
    </div>
  );
}
