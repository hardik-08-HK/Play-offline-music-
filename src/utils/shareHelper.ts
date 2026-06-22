import { Playlist } from '../types';

/**
 * Serializes a playlist into a compact base64 hash string.
 */
export function generateShareablePlaylistLink(playlist: Playlist): string {
  try {
    const minifiedData = {
      n: playlist.name,
      d: playlist.description || '',
      s: playlist.songIds
    };
    const jsonStr = JSON.stringify(minifiedData);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `${window.location.origin}${window.location.pathname}#import-mix=${b64}`;
  } catch (error) {
    console.error('Failed to generate sharing token', error);
    return '';
  }
}

/**
 * Deserializes a base64 hash string back into a Playlist template.
 */
export function parseShareablePlaylist(hash: string): Partial<Playlist> | null {
  try {
    if (!hash) return null;
    let b64 = hash;
    if (hash.includes('import-mix=')) {
      b64 = hash.split('import-mix=')[1];
    }
    // Clean trailing params if any
    b64 = b64.split('&')[0];
    
    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const minifiedData = JSON.parse(jsonStr);
    
    if (!minifiedData.n || !Array.isArray(minifiedData.s)) {
      return null;
    }

    return {
      id: `shared-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: minifiedData.n,
      description: minifiedData.d || 'Shared offline mixtape',
      songIds: minifiedData.s,
      createdAt: Date.now(),
      isCustom: true
    };
  } catch (error) {
    console.error('Failed to parse sharing token', error);
    return null;
  }
}
