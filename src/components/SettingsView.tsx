import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, ArrowLeft, Settings, HelpCircle, ShieldAlert, 
  Moon, Sun, Github, FileEdit, Check, FolderMinus, Trash,
  Upload, RefreshCcw, Cloud, CloudLightning, LogIn, LogOut, User,
  Share2, Smartphone, QrCode, X, Copy
} from 'lucide-react';
import QRCode from 'qrcode';
import { ActiveTab, Song } from '../types';
import { createAccountBackup, restoreAccountBackup } from '../utils/backupEngine';

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  activeTheme: string;
  onSelectTheme: (theme: string) => void;
  sleepTimer: { durationMinutes: number; timeLeftSeconds: number; isActive: boolean };
  onStartSleepTimer: (m: number) => void;
  onStopSleepTimer: () => void;
  excludedFolders: string[];
  songs: Song[];
  onClearLibrary: () => void;
  onAddExcludedFolder: (name: string) => void;
  onRemoveExcludedFolder: (name: string) => void;
  continuousPlay: boolean;
  onToggleContinuousPlay: () => void;
  onRefreshAppState: () => void;
  activeSkin: string;
  onSelectSkin: (skin: string) => void;
  currentUser: any;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onSyncWithCloud: () => void;
  isSyncingCloud: boolean;
  deferredPrompt?: any;
  onTriggerInstall?: () => void;
}

const THEME_OPTIONS = [
  { id: 'indigo', name: 'Material Indigo', bg: 'bg-indigo-600' },
  { id: 'amber', name: 'Cosmic Gold', bg: 'bg-amber-500' },
  { id: 'emerald', name: 'Pine Emerald', bg: 'bg-emerald-600' },
  { id: 'rose', name: 'Vibrant Rose', bg: 'bg-rose-500' },
  { id: 'slate', name: 'Monochrome Slate', bg: 'bg-slate-700' },
];

export default function SettingsView({
  isDarkMode,
  onToggleDarkMode,
  activeTheme,
  onSelectTheme,
  sleepTimer,
  onStartSleepTimer,
  onStopSleepTimer,
  excludedFolders,
  songs,
  onClearLibrary,
  onAddExcludedFolder,
  onRemoveExcludedFolder,
  continuousPlay,
  onToggleContinuousPlay,
  onRefreshAppState,
  activeSkin,
  onSelectSkin,
  currentUser,
  onOpenAuthModal,
  onSignOut,
  onSyncWithCloud,
  isSyncingCloud,
  deferredPrompt,
  onTriggerInstall,
}: SettingsViewProps) {
  // Account synchronization & device backup states
  const [syncStatus, setSyncStatus] = useState<'idle' | 'backing_up' | 'restoring' | 'success' | 'failed'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);

  // App Sharing and PWA states
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [customShareUrl, setCustomShareUrl] = useState(() => {
    return localStorage.getItem('my_offline_music_custom_share_url') || '';
  });

  const isGoogleSandbox = 
    window.location.hostname.includes('google') || 
    window.location.hostname.includes('aistudio') || 
    window.location.hostname.includes('ais-dev-') || 
    !window.location.hostname.includes('run.app');

  const getEffectiveShareUrl = () => {
    if (customShareUrl.trim()) {
      return customShareUrl.trim();
    }
    const origin = window.location.origin;
    // Automatically convert private dev links to public pre (Shared App) links
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-') + window.location.pathname;
    }
    // If running in Google developer platform sandbox, default to the official public Shared App URL
    if (isGoogleSandbox) {
      return 'https://ais-pre-rqmp4lop5cvbxrm73qqyk2-433366378925.asia-southeast1.run.app';
    }
    return origin + window.location.pathname;
  };

  useEffect(() => {
    if (showQRModal && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        getEffectiveShareUrl(),
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#121212',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error rendering QR code:', error);
        }
      );
    }
  }, [showQRModal, customShareUrl]);

  const handleNativeShare = async () => {
    const appUrl = getEffectiveShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Offline Music Player',
          text: 'Check out this offline-first music player and real-time synthesizer app, installable on mobile!',
          url: appUrl,
        });
      } catch (err) {
        console.log('User cancelled or native sharing failed:', err);
      }
    } else {
      // Fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(appUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch (err) {
        console.error('Failed to copy App URL:', err);
      }
    }
  };

  const handleExportAccountProfile = async () => {
    try {
      setSyncStatus('backing_up');
      setSyncProgress(0);
      setSyncMessage('Starting offline state export routine...');
      setSyncError(null);

      const backupStr = await createAccountBackup((percent, msg) => {
        setSyncProgress(percent);
        setSyncMessage(msg);
      });

      // Download profile package (.musicprofile)
      const blob = new Blob([backupStr], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MyOfflineMusic_AccountProfile_${new Date().toISOString().slice(0, 10)}.musicprofile`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSyncStatus('success');
      setSyncMessage('State package (.musicprofile) generated! All custom uploaded audio, catalogs, track play stats, mood tags, and EQ models have been encrypted locally. Open this file on other devices to clone this player precisely.');
    } catch (err: any) {
      setSyncStatus('failed');
      setSyncError(err?.message || 'State serialization compile crash.');
    }
  };

  const handleImportAccountProfile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the user accidentally selected a music file instead of a backup profile configuration file
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAudio = file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(ext || '');

    if (isAudio) {
      setSyncStatus('failed');
      setSyncError(`Oops! You selected an audio track ("${file.name}") instead of an app backup profile. To import songs into your library, please click the "Search" tab on the bottom bar, and then click the "Import" button at the top-right!`);
      e.target.value = '';
      return;
    }

    try {
      setSyncStatus('restoring');
      setSyncProgress(0);
      setSyncMessage('Checking block integrity and payload specs...');
      setSyncError(null);

      const text = await file.text();
      const result = await restoreAccountBackup(text, (percent, msg) => {
        setSyncProgress(percent);
        setSyncMessage(msg);
      });

      setSyncStatus('success');
      setSyncMessage(`System synchronization success! Restored ${result.restoredSongsCount} catalog files, custom playlists, manual mood mappings, and equalizer shapes perfectly.`);
      
      onRefreshAppState();
    } catch (err: any) {
      setSyncStatus('failed');
      setSyncError(err?.message || 'Restore halted due to invalid file schema.');
    }

    e.target.value = '';
  };

  const formatSleepTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="settings-view-container" className="flex flex-col h-full overflow-hidden bg-[#121212]">
      
      {/* Header Panel */}
      <div className="p-4 pt-6 bg-gradient-to-b from-zinc-900 to-[#121212] border-b border-zinc-900/40 flex-shrink-0">
        <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#1db954]" />
          System Settings
        </h1>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
          Local Profile Sandbox & Updates
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24 scrollbar-none">
        
        {/* Toggle Controls Theme */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-4">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#1db954] pl-0.5">
            Interface Design
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Aesthetic Dark Mode</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Toggle dark and light view templates</span>
            </div>
            <button
              id="theme-darkmode-toggle"
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-850 transition"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-505" /> : <Moon className="w-4 h-4 text-zinc-450" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-3.5 border-t border-zinc-805">
            <div>
              <span className="text-xs font-bold text-white block">Continuous Playback</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Auto-plays intelligent random cues upon queue depletion</span>
            </div>
            <button
              id="continuousplay-toggle"
              onClick={onToggleContinuousPlay}
              className={`relative inline-flex h-5.5 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer ${
                continuousPlay ? 'bg-[#1db954]' : 'bg-zinc-950 border border-zinc-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${
                  continuousPlay ? 'translate-x-[23px]' : 'translate-x-[4px]'
                }`}
              />
            </button>
          </div>

          <div className="pt-3.5 border-t border-zinc-805 space-y-2">
            <span className="text-xs font-bold text-white block">Accent Dynamic Color</span>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  id={`theme-accent-${theme.id}`}
                  onClick={() => onSelectTheme(theme.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition ${theme.bg} ${
                    activeTheme === theme.id ? 'ring-2 ring-offset-2 ring-white ring-offset-zinc-900 border-none' : 'hover:scale-105'
                  }`}
                  title={theme.name}
                >
                  {activeTheme === theme.id && <Check className="w-3.5 h-3.5 font-bold" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3.5 border-t border-zinc-805 space-y-2">
            <div>
              <span className="text-xs font-bold text-white block">Visual Design Skin Engine</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Instantly adjust general spacing, fonts and design skins</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {[
                { id: 'modern', name: 'Material UI 🧬' },
                { id: 'aurora', name: 'Space Aurora 🪐' },
                { id: 'brutalist', name: 'Pop Art ⚡' },
                { id: 'cyberpunk', name: 'Cyber Terminal 📟' },
                { id: 'organic', name: 'Sandstone Flax 🪵' },
              ].map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => onSelectSkin(skin.id)}
                  className={`py-2 px-3 border rounded-xl text-left text-[11px] font-semibold transition flex items-center justify-between cursor-pointer active:scale-98 ${
                    activeSkin === skin.id
                      ? 'bg-zinc-850 text-[#1db954] border-[#1db954] font-bold'
                      : 'bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                  }`}
                >
                  <span>{skin.name}</span>
                  {activeSkin === skin.id && <Check className="w-3.5 h-3.5 font-black text-[#1db954]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* sleep Timer controls */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1db954] pl-0.5">Sleep Timers</span>
            {sleepTimer.isActive && (
              <span className="text-[9px] font-extrabold text-black bg-[#1db954] px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            )}
          </div>

          {sleepTimer.isActive ? (
            <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
              <div>
                <p className="text-xs font-extrabold text-white">
                  {formatSleepTime(sleepTimer.timeLeftSeconds)} remaining
                </p>
                <p className="text-[10px] text-zinc-405 mt-0.5">Count counts down till sound fade</p>
              </div>
              <button
                onClick={onStopSleepTimer}
                className="bg-red-650 hover:bg-red-600 text-white font-extrabold text-[9px] px-3.5 py-1.5 rounded-full tracking-wider uppercase transition"
              >
                Disable
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                id="custom-sleep-input"
                type="number"
                min="1"
                max="180"
                placeholder="Minutes (e.g. 45)"
                className="w-28 px-3 py-1.5 border border-zinc-800 rounded-xl text-xs bg-zinc-950 text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-[#1db954]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (val > 0) onStartSleepTimer(val);
                  }
                }}
              />
              <button
                onClick={() => {
                  const el = document.getElementById('custom-sleep-input') as HTMLInputElement;
                  const val = parseInt(el?.value || '0');
                  if (val > 0) onStartSleepTimer(val);
                }}
                className="bg-white text-black hover:scale-103 text-xs font-black py-1.5 px-3.5 rounded-full tracking-wider uppercase transition"
              >
                Start Timer
              </button>
            </div>
          )}
        </div>

        {/* Cloud synchronization & Account Sync */}
        <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl relative overflow-hidden shadow-xl space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[#1db954]" />
              <div>
                <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#1db954] pl-0.5">Account & Cloud Sync</h2>
                <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Secure Backup & Multi-device Sync</p>
              </div>
            </div>
            {currentUser ? (
              <span className="text-[8px] bg-green-500/10 text-[#1db954] border border-green-500/20 font-bold px-2.0 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#1db954] rounded-full animate-pulse" />
                Logged In
              </span>
            ) : (
              <span className="text-[8px] bg-zinc-950 text-zinc-500 border border-zinc-805 font-bold px-2 py-0.5 rounded-full uppercase">
                Local-Only
              </span>
            )}
          </div>

          {currentUser ? (
            <div className="space-y-4">
              {/* Logged in User Profile Info */}
              <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-850">
                <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700/65 flex items-center justify-center text-white font-black text-sm relative">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : <User className="w-4 h-4 text-zinc-450" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-white truncate">{currentUser.displayName || 'Offline Listener'}</p>
                  <p className="text-[10px] text-zinc-500 truncate -mt-0.5">{currentUser.email}</p>
                </div>
                <button
                  onClick={onSignOut}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:text-red-400 border border-zinc-800 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isSyncingCloud}
                  onClick={onSyncWithCloud}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-black text-xs uppercase rounded-full shadow-lg transition active:scale-98 disabled:opacity-40"
                >
                  {isSyncingCloud ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCcw className="w-3.5 h-3.5 text-black" />
                  )}
                  <span>{isSyncingCloud ? 'Syncing...' : 'Sync Settings & Playlists'}</span>
                </button>
                <p className="text-[9px] text-zinc-500 text-center leading-relaxed">
                  Automatically synchronize your offline song stats, custom mixtapes and audio tuning presets to your cloud folder.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Connect your account to save custom mixtapes, favorite indices, custom skins, and equalizer structures securely to the cloud. Access your profile instantly from any screen.
              </p>
              
              <button
                id="open-auth-modal-setting-btn"
                onClick={onOpenAuthModal}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-black text-xs uppercase rounded-full border border-zinc-800 hover:text-green-400 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#1db954]" />
                <span>Login or Create Account</span>
              </button>
            </div>
          )}

          {/* Backup profile locally (File-based) as an advanced offline option */}
          <div className="pt-3 border-t border-zinc-850/65 space-y-2.5">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Advanced File Backup (Offline)</span>
            
            {syncStatus !== 'idle' && (
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className={`font-black uppercase tracking-wider ${
                    syncStatus === 'failed' ? 'text-red-405 font-bold' :
                    syncStatus === 'success' ? 'text-green-400 font-bold' : 'text-[#1db954]'
                  }`}>
                    {syncStatus === 'backing_up' && 'Compiling Profile...'}
                    {syncStatus === 'restoring' && 'Restoring DB indexes...'}
                    {syncStatus === 'success' && 'Operation Complete! ✓'}
                    {syncStatus === 'failed' ? 'Operation Failed ⚠' : ''}
                  </span>
                  {syncStatus !== 'success' && syncStatus !== 'failed' && (
                    <span className="font-mono text-zinc-400">{syncProgress}%</span>
                  )}
                </div>

                {(syncStatus === 'backing_up' || syncStatus === 'restoring') && (
                  <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-[#1db954] h-1 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                )}

                <p className="text-[10px] text-zinc-400 leading-relaxed">{syncMessage}</p>

                {syncError && (
                  <p className="text-[9px] text-red-400 bg-red-950/25 p-2 rounded-lg">{syncError}</p>
                )}

                {syncStatus === 'success' && (
                  <button
                    type="button"
                    onClick={() => setSyncStatus('idle')}
                    className="w-full py-1 bg-zinc-900 text-zinc-300 text-[9px] uppercase font-bold tracking-wider rounded-lg transition"
                  >
                    Dismiss Status
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pb-0.5">
              <button
                type="button"
                disabled={syncStatus === 'backing_up' || syncStatus === 'restoring'}
                onClick={handleExportAccountProfile}
                className="flex items-center justify-center gap-1.5 py-2 bg-zinc-950 text-zinc-300 text-[10px] uppercase font-bold rounded-xl border border-zinc-850 hover:bg-zinc-850 hover:text-white transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-500" />
                <span>Local Export</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 py-2 bg-zinc-950 text-zinc-300 text-[10px] uppercase font-bold rounded-xl border border-zinc-850 hover:bg-zinc-850 hover:text-white transition cursor-pointer">
                <Download className="w-3.5 h-3.5 text-zinc-500" />
                <span>Local Import</span>
                <input
                  type="file"
                  accept=".musicprofile"
                  onChange={handleImportAccountProfile}
                  disabled={syncStatus === 'backing_up' || syncStatus === 'restoring'}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Mobile Download & Cross-Device Sharing Panel */}
        <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl relative overflow-hidden shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#1db954]" />
            <div>
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#1db954] pl-0.5">Mobile & Multi-Device Sync</h2>
              <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Install on Mobile & Share Library</p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Take this app wherever you go! Install it as a native Progressive Web App (PWA) on your mobile or share it directly with companion devices.
          </p>

          {/* Sandbox Warning alert */}
          {isGoogleSandbox && (
            <div className="bg-[#1db954]/10 border border-[#1db954]/30 p-3 rounded-xl space-y-1.5 text-left">
              <span className="text-[9px] font-black uppercase text-[#1db954] tracking-wider flex items-center gap-1.5">
                🛡️ Live Link Auto-Corrected
              </span>
              <p className="text-[9px] text-zinc-300 leading-relaxed font-sans">
                Since you are currently in the <strong>Google AI Studio builder</strong>, regular links would trigger a Google 403 authorization error on other devices.
              </p>
              <p className="text-[9px] text-zinc-200 leading-relaxed font-medium font-sans">
                We have <strong>automatically configured</strong> your QR Code and Share button to point directly to your public Live Shared App URL:
              </p>
              <div className="bg-black/40 p-1.5 rounded border border-zinc-800 text-[8.5px] font-mono text-zinc-400 select-all truncate">
                {getEffectiveShareUrl()}
              </div>
              <p className="text-[8px] text-zinc-500 italic block font-sans">
                💡 Scan or copy the link below with full assurance—your mobile device and other users will load the app instantly with zero error screens!
              </p>
            </div>
          )}

          {/* Public App Link override box */}
          <div className="space-y-2 text-left bg-zinc-955 p-3 rounded-xl border border-zinc-850">
            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">
              Public App URL (Optional override)
            </label>
            <div className="flex gap-2 font-sans">
              <input
                type="text"
                value={customShareUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomShareUrl(val);
                  if (val.trim()) {
                    localStorage.setItem('my_offline_music_custom_share_url', val.trim());
                  } else {
                    localStorage.removeItem('my_offline_music_custom_share_url');
                  }
                }}
                placeholder="https://ais-pre-...run.app"
                className="bg-zinc-900 border border-zinc-800 text-[10px] px-3 py-1.5 text-white placeholder-zinc-600 rounded-lg focus:outline-none focus:border-[#1db954] font-mono flex-1"
              />
              {customShareUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomShareUrl('');
                    localStorage.removeItem('my_offline_music_custom_share_url');
                  }}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white rounded-lg text-[9px] font-bold uppercase transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[8px] text-zinc-500 leading-relaxed">
              If running under AI Studio, paste your <strong>Development</strong> or <strong>Shared App URL</strong> here so QR-codes and installation links open correctly on external devices.
            </p>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-855 space-y-3">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block font-mono">1. Install on this Device</span>
            
            {deferredPrompt ? (
              <button
                type="button"
                onClick={onTriggerInstall}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-black text-xs uppercase rounded-full shadow-lg transition active:scale-98 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-black" />
                <span>Download App</span>
              </button>
            ) : (
              <div className="text-[10px] text-zinc-400 leading-relaxed bg-[#121212] p-2.5 rounded-lg border border-zinc-805 space-y-2">
                <p>
                  💡 <strong>How to install on Mobile:</strong>
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Apple iOS (Safari):</strong> Tap the <span className="text-[#1db954] font-bold">Share 📤</span> button, then select <span className="text-[#1db954] font-bold">"Add to Home Screen ➕"</span></li>
                  <li><strong>Google Android (Chrome):</strong> Tap the options menu (three dots) and tap <span className="text-[#1db954] font-bold">"Install app"</span> or <span className="text-[#1db954] font-bold">"Add to Home screen"</span></li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block font-mono">2. Share App to Other Devices</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-zinc-950 text-zinc-300 text-[10px] uppercase font-bold rounded-xl border border-zinc-850 hover:bg-zinc-850 hover:text-white transition cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-zinc-500" />
                <span>Show QR Code</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-zinc-950 text-zinc-300 text-[10px] uppercase font-bold rounded-xl border border-zinc-850 hover:bg-zinc-850 hover:text-white transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                <span>{copiedLink ? 'Copied URL!' : 'Share Link'}</span>
              </button>
            </div>
            
            <p className="text-[9px] text-zinc-500 leading-relaxed text-center">
              💡 <strong>To sync custom audio files:</strong> First share the app, then download your <strong>Local Export (.musicprofile)</strong> above and import it on the secondary device!
            </p>
          </div>
        </div>

        {/* Data resetting utilities */}
        <div className="p-4 bg-zinc-950 border border-zinc-855 rounded-2xl space-y-3">
          <span className="text-[9px] font-extrabold text-zinc-500 tracking-wider uppercase block">LOCAL DATA CLEANING</span>
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Deletes all local IndexedDB cache elements, scanned indexes, and audio chunks instantly. This process is irreversible offline.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClearLibrary}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 font-extrabold hover:underline"
              title="Delete all scanned records"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Reset IndexedDB Cache</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Code and Sharing Modal Overlay */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-tight font-sans">Scan App QR Code</h3>
              <p className="text-[10px] text-zinc-400 leading-relaxed">Scan this code with another device to open the player instantly!</p>
            </div>

            <div className="bg-white p-3 rounded-xl flex items-center justify-center w-48 h-48 mx-auto shadow-inner">
              <canvas ref={canvasRef} className="w-44 h-44" />
            </div>

            <div className="space-y-3">
              <div className="flex bg-zinc-950 p-2 rounded-xl border border-zinc-850 text-[10px] items-center justify-between">
                <span className="text-zinc-500 font-mono truncate mr-2 text-left flex-1" title={getEffectiveShareUrl()}>
                  {getEffectiveShareUrl()}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(getEffectiveShareUrl());
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex-shrink-0 text-zinc-900 hover:text-black font-extrabold text-[9px] uppercase px-2.5 py-1.5 bg-[#1db954] hover:bg-[#1ed760] rounded transition cursor-pointer"
                >
                  {copiedLink ? 'Copied' : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {isGoogleSandbox && !customShareUrl && (
                <p className="text-[9px] text-amber-500 font-medium leading-relaxed bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                  ⚠️ Note: Add a custom override above or paste a shared public link to avoid the Google 403 screen on other devices.
                </p>
              )}
              
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="w-full py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold uppercase rounded-full transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
