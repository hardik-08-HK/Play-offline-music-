import { Song, Playlist } from '../types';

const DB_NAME = 'MyOfflineMusicDB';
const DB_VERSION = 2;
const SONGS_STORE = 'songs';
const PLAYLISTS_STORE = 'playlists';
const SETTINGS_STORE = 'settings';

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store user-uploaded or scanned songs (index by artist, album, format)
      if (!db.objectStoreNames.contains(SONGS_STORE)) {
        const songStore = db.createObjectStore(SONGS_STORE, { keyPath: 'id' });
        songStore.createIndex('artist', 'artist', { unique: false });
        songStore.createIndex('album', 'album', { unique: false });
        songStore.createIndex('addedAt', 'addedAt', { unique: false });
      }

      // Store playlists
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
      }

      // Store settings / stats
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    };
  });
}

// SONG METADATA STORES
export async function saveSong(song: Song): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, 'readwrite');
    const store = transaction.objectStore(transaction.objectStoreNames[0]);
    // Native indexedDB requires exact name or fallback
    const request = store.put(song);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSongs(): Promise<Song[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, 'readonly');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSong(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, 'readwrite');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// PLAYLIST METADATA STORES
export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLAYLISTS_STORE, 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.put(playlist);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPlaylists(): Promise<Playlist[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLAYLISTS_STORE, 'readonly');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePlaylistDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLAYLISTS_STORE, 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// GENERIC SETTINGS / STATE PERSISTENCE
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result !== undefined ? request.result as T : defaultValue);
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save setting', e);
  }
}
