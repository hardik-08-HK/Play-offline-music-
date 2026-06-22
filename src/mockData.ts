import { Song } from './types';

export const MOCK_SONGS: Song[] = [
  {
    id: 'mock-1',
    title: 'Neon Horizon',
    artist: 'RetroFuture',
    album: 'Synthwave Odyssey',
    genre: 'Synthwave',
    duration: 180,
    format: 'mp3',
    albumArt: '🌆',
    path: '/music/synthwave/neon_horizon.mp3',
    playCount: 24,
    addedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    isFavorite: true,
    lyrics: `[00:00.00] (Instrumental Synth-Intro)
[00:10.00] Speeding through the grid at midnight
[00:15.00] Neon lines flash in the rear view
[00:20.00] Synthwave frequencies in my mind
[00:25.00] Everything feels brand new
[00:30.00] (Bright laser riffs and drums)
[00:40.00] Driving on a neon horizon
[00:45.00] The night is ours, the sun is rising
[00:50.00] Through the digitized dreams we go
[00:55.00] Speeding up the tempo, watch it flow
[01:05.00] (Guitar-Synth Solo Section)
[01:25.00] No connection, just the internal drive
[01:30.00] Music keeps the virtual soul alive
[01:35.00] Local state is absolute and real
[01:40.00] Feel the digital pulse behind the wheel
[01:50.00] Driving on a neon horizon
[01:55.00] The night is ours, the sun is rising
[02:00.00] (Outro - Smooth synthesizer fadeout)`
  },
  {
    id: 'mock-2',
    title: 'Midnight Coffee',
    artist: 'Lofi Chilled',
    album: 'Rainy Day Session',
    genre: 'Lo-Fi Lounge',
    duration: 145,
    format: 'mp3',
    albumArt: '☕',
    path: '/music/lofi/midnight_coffee.mp3',
    playCount: 42,
    addedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    isFavorite: false,
    lyrics: `[00:00.00] (Rain falling sound and soft piano keys)
[00:12.00] Pour the coffee, watch the steam float
[00:18.00] Quiet streets outside, a distant boat
[00:24.00] Reading static lines of pretty old drafts
[00:30.00] Warm yellow lamp and local crafts
[00:36.00] Scratchy vinyl spin, the perfect groove
[00:42.00] Running in circular state, no need to move
[00:50.00] (Smooth saxophone entry)
[01:10.00] Midnight aroma, minds in ease
[01:16.00] Offline vibes drifting on the breeze
[01:22.00] All files stored on standard client shelf
[01:28.00] Peaceful acoustic moment with oneself
[01:35.00] (Relaxing drumbeat fades away)`
  },
  {
    id: 'mock-3',
    title: 'Subliminal Frequency',
    artist: 'Ether Space',
    album: 'Deep Meditations',
    genre: 'Ambient',
    duration: 210,
    format: 'wav',
    albumArt: '🌌',
    path: '/music/ambient/subliminal.wav',
    playCount: 15,
    addedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    isFavorite: true,
    lyrics: `[00:00.00] (Cosmic ambient pads fading in)
[00:15.00] Float in the quiet vacuum of space
[00:30.00] No networks, no signals, no chase
[00:45.00] Pure resonant waves of high degree
[01:00.00] Finding peace in the local frequency
[01:20.00] (Deep sub-bass swell and crystal chimes)
[01:45.00] Rest your eyes, let the timer wind down
[02:00.00] Safe and sound in this offline town...
[02:30.00] (Ethereal chimes echoing in silence)`
  },
  {
    id: 'mock-4',
    title: 'Cybernetic Beat',
    artist: 'Voltex',
    album: 'Hyperdrive',
    genre: 'Electro',
    duration: 160,
    format: 'flac',
    albumArt: '⚡',
    path: '/music/electro/cybernetic_beat.flac',
    playCount: 31,
    addedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    isFavorite: false,
    lyrics: `[00:00.00] (High voltage electricity sparks)
[00:08.00] 808 kicker blasting through speakers
[00:12.00] Sound waves bouncing off concrete structures
[00:16.00] Code in motion, low latency sparks
[00:20.00] Glowing bright through the computer parks
[00:24.00] (Aggressive synth-bass breakdown!)
[00:40.00] Unleash the algorithm, beat is supreme!
[00:44.00] Living inside a localized dream!
[00:48.00] We do not need the cloud to create
[00:52.00] Our storage is safe and ready to state!
[01:10.00] (Industrial beat rolls and metallic hits)
[01:30.00] Cybernetic heartbeat, binary drive
[01:35.00] Keep the sound system fully alive!
[01:50.00] (Sudden spark short-circuit finish)`
  },
  {
    id: 'mock-5',
    title: 'Moonlight Sonata (Adagio)',
    artist: 'Ludwig van Beethoven',
    album: 'Classic Masterpieces',
    genre: 'Classical',
    duration: 300,
    format: 'aac',
    albumArt: '🎹',
    path: '/music/classical/moonlight.aac',
    playCount: 8,
    addedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    isFavorite: false,
    lyrics: `[00:00.00] (Continuous triplets in G-sharp minor)
[00:20.00] Standard classical masterpiece
[00:45.00] Deep, quiet emotional resonance
[01:10.00] Peaceful triplets guiding the harmony
[01:40.00] Elegant, solemn moonlit keys
[02:20.00] Beethoven's timeless local masterwork
[03:10.00] Gently rising to the second movement theme
[04:00.00] Triplet arpeggios slowly descending
[04:40.00] (Fading G-sharp minor resolve)`
  }
];
