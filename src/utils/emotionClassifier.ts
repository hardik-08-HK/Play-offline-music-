import { Song } from '../types';

export type SongEmotion = 'Romantic' | 'Sad' | 'Happiness' | 'Fighting' | 'Chill' | 'Calm' | 'Anime';

export interface EmotionMeta {
  emoji: string;
  color: string; // Tailwind class
  bgClass: string; // Tailwind bg class
  textClass: string; // Tailwind text class
  gradient: string; // Background gradient for display and moods
}

export const EMOTIONS: Record<SongEmotion, EmotionMeta> = {
  Romantic: {
    emoji: '🌸',
    color: 'emerald-500',
    bgClass: 'bg-rose-50 dark:bg-rose-950/20',
    textClass: 'text-rose-600 dark:text-rose-400',
    gradient: 'from-pink-500 to-rose-600'
  },
  Sad: {
    emoji: '💧',
    color: 'amber-500',
    bgClass: 'bg-sky-50 dark:bg-sky-950/20',
    textClass: 'text-sky-600 dark:text-sky-400',
    gradient: 'from-blue-600 to-indigo-800'
  },
  Happiness: {
    emoji: '😄',
    color: 'rose-500',
    bgClass: 'bg-amber-50 dark:bg-amber-950/20',
    textClass: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-400 to-orange-500'
  },
  Fighting: {
    emoji: '⚡',
    color: 'indigo-500',
    bgClass: 'bg-red-50 dark:bg-red-950/20',
    textClass: 'text-red-650 dark:text-red-400',
    gradient: 'from-red-600 to-pink-700'
  },
  Chill: {
    emoji: '✨',
    color: 'violet-500',
    bgClass: 'bg-teal-50 dark:bg-teal-950/20',
    textClass: 'text-teal-650 dark:text-teal-400',
    gradient: 'from-teal-400 to-emerald-600'
  },
  Calm: {
    emoji: '🍃',
    color: 'indigo-400',
    bgClass: 'bg-violet-50 dark:bg-violet-950/20',
    textClass: 'text-violet-600 dark:text-violet-400',
    gradient: 'from-purple-500 to-indigo-600'
  },
  Anime: {
    emoji: '🏮',
    color: 'sky-500',
    bgClass: 'bg-fuchsia-100/60 dark:bg-fuchsia-950/20',
    textClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    gradient: 'from-fuchsia-500 to-purple-600'
  }
};

/**
 * Deterministically classifies a song based on title, artist, genre, or path.
 */
export function classifySongEmotion(song: Song): SongEmotion {
  // If the user has manual preset overrides in a hidden meta or path:
  const text = `${song.title} ${song.artist} ${song.genre} ${song.album} ${song.path || ''}`.toLowerCase();
  
  if (text.includes('anime') || text.includes('jpop') || text.includes('j-pop') || text.includes('otaku') || text.includes('vocaloid') || text.includes('naruto') || text.includes('ost') || text.includes('shippuden') || text.includes('beethoven')) {
    if (text.includes('beethoven') || text.includes('sonata') || text.includes('moonlight')) {
      return 'Calm'; // Exception for classical
    }
    return 'Anime';
  }

  if (text.includes('coffee') || text.includes('lofi') || text.includes('lo-fi') || text.includes('lounge') || text.includes('chill') || text.includes('relax') || text.includes('afternoon') || text.includes('lazy') || text.includes('breeze')) {
    return 'Chill';
  }

  if (text.includes('midnight') || text.includes('ambient') || text.includes('subliminal') || text.includes('meditation') || text.includes('peace') || text.includes('sleep') || text.includes('classical') || text.includes('calm') || text.includes('quiet') || text.includes('triplets')) {
    return 'Calm';
  }

  if (text.includes('love') || text.includes('heart') || text.includes('romantic') || text.includes('acoustic') || text.includes('ballad') || text.includes('sweet') || text.includes('feelings') || text.includes('forever') || text.includes('you')) {
    return 'Romantic';
  }

  if (text.includes('sad') || text.includes('cry') || text.includes('alone') || text.includes('tears') || text.includes('rain') || text.includes('lonely') || text.includes('lost') || text.includes('blue') || text.includes('sorrow')) {
    return 'Sad';
  }

  if (text.includes('cyber') || text.includes('beat') || text.includes('electric') || text.includes('electro') || text.includes('hyper') || text.includes('fight') || text.includes('power') || text.includes('action') || text.includes('heavy') || text.includes('bold') || text.includes('strike') || text.includes('synthwave') || text.includes('horizon')) {
    return 'Fighting';
  }

  if (text.includes('happy') || text.includes('joy') || text.includes('bright') || text.includes('fun') || text.includes('summer') || text.includes('dance') || text.includes('party') || text.includes('shine') || text.includes('gold')) {
    return 'Happiness';
  }

  // Fallback defaults by index hash
  const emotions: SongEmotion[] = ['Chill', 'Calm', 'Romantic', 'Sad', 'Fighting', 'Happiness', 'Anime'];
  const charSum = song.title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return emotions[charSum % emotions.length];
}
