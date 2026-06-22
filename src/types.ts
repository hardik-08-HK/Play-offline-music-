export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number; // in seconds
  url?: string; // URL for web-hosted fallback
  blob?: Blob; // File blob for user-uploaded offline song
  fileSize?: string;
  format: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg' | 'm4a';
  albumArt?: string; // Base64 or object URL or placeholder emoji
  path?: string; // Simulate directory path
  playCount: number;
  addedAt: number;
  isFavorite: boolean;
  lyrics?: string; // LRC format or simple multi-line text
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  createdAt: number;
  isCustom: boolean; // Custom vs System (Favorites, Recently Played)
}

export interface EqualizerBand {
  hz: number;
  gain: number; // -12 to +12 dB
}

export interface SleepTimer {
  durationMinutes: number;
  timeLeftSeconds: number;
  isActive: boolean;
}

export interface APKUpdateState {
  status: 'idle' | 'downloading' | 'verifying' | 'ready_to_install' | 'installing' | 'success' | 'failed' | 'permission_error';
  progress: number; // 0 to 100
  fileSize: string; // e.g., "18.4 MB"
  downloadSpeed: string; // e.g., "2.4 MB/s"
  eta: string; // e.g., "0h 0m 3s"
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

export type ActiveTab = 'home' | 'songs' | 'playlists' | 'settings';
export type RepeatMode = 'none' | 'one' | 'all';
