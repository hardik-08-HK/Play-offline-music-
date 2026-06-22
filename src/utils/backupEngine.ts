import { Song, Playlist, EqualizerBand } from '../types';
import { getAllSongs, saveSong, getPlaylists, savePlaylist, getSetting, saveSetting } from './db';
import { SongEmotion } from './emotionClassifier';

export interface BackupPayload {
  version: string;
  songs: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    genre: string;
    duration: number;
    format: string;
    albumArt?: string;
    path?: string;
    playCount: number;
    addedAt: number;
    isFavorite: boolean;
    lyrics?: string;
    audioBase64?: string; // Serialized uploaded song file
  }[];
  playlists: Playlist[];
  settings: {
    isDarkMode: boolean;
    activeTheme: string;
    continuousPlay: boolean;
    manualEmotions: Record<string, SongEmotion>;
    recentSongIds: string[];
    eqBands: EqualizerBand[];
    excludedFolders: string[];
  };
  exportedAt: number;
}

/**
 * Converts a standard Blob/File object to a Base64 data URL.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a Base64 data URL back into a standard Blob file.
 */
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'audio/mpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Extracts and compiles the entire application indexedDB contents into a single transportable backup payload.
 */
export async function createAccountBackup(
  onProgress?: (percent: number, statusText: string) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(10, 'Retrieving catalogs...');
    const allSongs = await getAllSongs();
    
    if (onProgress) onProgress(30, 'Retrieving mixtapes...');
    const playlists = await getPlaylists();

    if (onProgress) onProgress(40, 'Retrieving settings...');
    const isDarkMode = await getSetting<boolean>('isDarkMode', true);
    const activeTheme = await getSetting<string>('activeTheme', 'indigo');
    const continuousPlay = await getSetting<boolean>('continuousPlay', true);
    const manualEmotions = await getSetting<Record<string, SongEmotion>>('manualEmotions', {});
    const recentSongIds = await getSetting<string[]>('recentSongIds', []);
    const eqBands = await getSetting<EqualizerBand[]>('eqBands', []);
    const excludedFolders = await getSetting<string[]>('excludedFolders', []);

    const backupSongs: BackupPayload['songs'] = [];

    const totalToProcess = allSongs.length;
    for (let i = 0; i < totalToProcess; i++) {
      const song = allSongs[i];
      if (onProgress) {
        onProgress(
          Math.min(90, 40 + Math.floor((i / totalToProcess) * 45)),
          `Packing tracks: ${song.title}...`
        );
      }

      let audioBase64: string | undefined = undefined;

      // If the song is custom uploaded and has a binary blob file, serialize it to Base64
      if (song.blob && song.id.startsWith('uploaded-')) {
        try {
          audioBase64 = await blobToBase64(song.blob);
        } catch (err) {
          console.warn(`Could not serialize track file for ${song.title}:`, err);
        }
      }

      backupSongs.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        genre: song.genre,
        duration: song.duration,
        format: song.format,
        albumArt: song.albumArt,
        path: song.path,
        playCount: song.playCount,
        addedAt: song.addedAt,
        isFavorite: song.isFavorite,
        lyrics: song.lyrics,
        audioBase64
      });
    }

    const payload: BackupPayload = {
      version: 'v2.4.2-sync',
      songs: backupSongs,
      playlists,
      settings: {
        isDarkMode,
        activeTheme,
        continuousPlay,
        manualEmotions,
        recentSongIds,
        eqBands,
        excludedFolders
      },
      exportedAt: Date.now()
    };

    if (onProgress) onProgress(95, 'Compiling secure transport block...');
    const payloadStr = JSON.stringify(payload);
    
    if (onProgress) onProgress(100, 'Backup package completed!');
    return payloadStr;
  } catch (error) {
    console.error('Failed to create state account backup:', error);
    throw error;
  }
}

/**
 * Restores a state account backup payload back into local indexedDB.
 */
export async function restoreAccountBackup(
  backupJson: string,
  onProgress?: (percent: number, statusText: string) => void
): Promise<{
  restoredSongsCount: number;
  restoredPlaylistsCount: number;
  settings: BackupPayload['settings'];
}> {
  try {
    if (onProgress) onProgress(10, 'Decrypting and parsing file structure...');
    const payload: BackupPayload = JSON.parse(backupJson);

    if (payload.version !== 'v2.4.2-sync' && !payload.songs) {
      throw new Error('Invalid or corrupted account backup configuration format.');
    }

    // 1. Restore Custom Songs
    const totalSongs = payload.songs.length;
    let restoredSongsCount = 0;

    for (let i = 0; i < totalSongs; i++) {
      const s = payload.songs[i];
      if (onProgress) {
        onProgress(
          Math.min(60, 15 + Math.floor((i / totalSongs) * 45)),
          `Hydrating file buffers: ${s.title}...`
        );
      }

      let restoredBlob: Blob | undefined = undefined;
      // Re-hydrate the original music file Blob from the Base64 string if present
      if (s.audioBase64) {
        try {
          restoredBlob = dataURLtoBlob(s.audioBase64);
        } catch (err) {
          console.warn(`Failed to recreate audio file Blob for ${s.title}:`, err);
        }
      }

      const song: Song = {
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        genre: s.genre,
        duration: s.duration,
        format: s.format as any,
        albumArt: s.albumArt,
        path: s.path,
        playCount: s.playCount,
        addedAt: s.addedAt,
        isFavorite: s.isFavorite,
        lyrics: s.lyrics,
        blob: restoredBlob
      };

      await saveSong(song);
      restoredSongsCount++;
    }

    // 2. Restore Playlists
    if (onProgress) onProgress(70, 'Rebuilding mixtapes inventory...');
    for (const playlist of payload.playlists) {
      await savePlaylist(playlist);
    }

    // 3. Restore Settings Config
    if (onProgress) onProgress(85, 'Configuring personalized environment parameters...');
    const { settings } = payload;
    
    await saveSetting('isDarkMode', settings.isDarkMode);
    await saveSetting('activeTheme', settings.activeTheme);
    await saveSetting('continuousPlay', settings.continuousPlay);
    await saveSetting('manualEmotions', settings.manualEmotions);
    await saveSetting('recentSongIds', settings.recentSongIds);
    await saveSetting('eqBands', settings.eqBands);
    await saveSetting('excludedFolders', settings.excludedFolders);

    if (onProgress) onProgress(100, 'Synchronization complete!');
    return {
      restoredSongsCount,
      restoredPlaylistsCount: payload.playlists.length,
      settings
    };
  } catch (error) {
    console.error('Failed to import and restore offline account profile:', error);
    throw error;
  }
}
