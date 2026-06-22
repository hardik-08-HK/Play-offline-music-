import React, { useState } from 'react';
import { 
  X, Mail, Lock, User as UserIcon, LogIn, UserPlus, 
  Sparkles, CheckCircle, AlertCircle, ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../utils/firebase';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (userEmail: string, displayName?: string) => void;
}

export default function AuthModal({ onClose, onAuthSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // UX Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic client validation
    if (!email || !password) {
      setErrorMessage('Please fill in all credentials.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        setSuccessMessage(`Welcome back, ${user.displayName || user.email}!`);
        onAuthSuccess(user.email || '', user.displayName || '');
        setTimeout(() => onClose(), 1500);
      } else {
        if (!displayName) {
          setErrorMessage('Please provide your name.');
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update Firebase User Profile
        await updateProfile(user, { displayName });
        
        setSuccessMessage('Account registered successfully! Welcome aboard.');
        onAuthSuccess(user.email || '', displayName);
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      console.error('Firebase Auth Action Failed:', err);
      let localizedError = 'An unexpected error occurred.';
      if (err.code === 'auth/email-already-in-use') {
        localizedError = 'This email is already linked to an account.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        localizedError = 'Invalid email or password parameters.';
      } else if (err.code === 'auth/user-not-found') {
        localizedError = 'No registered user profile found with this email.';
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedError = 'Email/Password sign-in is currently disabled. Please enable "Email/Password" under the "Sign-in method" tab in the Firebase Console for your project.';
      } else if (err.code === 'auth/invalid-email') {
        localizedError = 'Please specify a properly formatted email.';
      } else {
        localizedError = err.message || localizedError;
      }
      setErrorMessage(localizedError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      // Use standard popup sign in
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setSuccessMessage(`Welcome back, ${user.displayName || user.email}! Connecting cloud folder...`);
      onAuthSuccess(user.email || '', user.displayName || undefined);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      console.error('Google sign in failure:', err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMessage('The sign-in popup was blocked by your browser. Please allow popups or open this player in a new tab.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled. Please complete the login process in the popup window.');
      } else {
        setErrorMessage(`Google authentication failed: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/92 backdrop-blur-md flex items-center justify-center p-4 z-55 animate-fade-in">
      <motion.div 
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative font-sans text-zinc-300"
      >
        {/* Header Branding */}
        <div className="p-5 pb-4 bg-gradient-to-b from-zinc-950 to-zinc-900 border-b border-zinc-850 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1db954]/10 text-[#1db954] flex items-center justify-center font-bold text-sm">
              🔑
            </div>
            <div>
              <h3 className="text-xs font-black tracking-widest text-[#1db954] uppercase">My Offline Music</h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Secure Cloud Account</p>
            </div>
          </div>
          
          <button 
            id="auth-close-btn"
            onClick={onClose}
            className="w-7 h-7 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 rounded-full transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="p-4 pb-0 grid grid-cols-2 gap-1 bg-zinc-900">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-black font-extrabold shadow-md'
                : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('signup');
              setErrorMessage(null);
            }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-white text-black font-extrabold shadow-md'
                : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Core Auth Forms */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="bg-red-950/30 border border-red-900/30 p-2.5 rounded-xl flex items-start gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] leading-relaxed font-medium">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-950/30 border border-green-900/30 p-2.5 rounded-xl flex items-start gap-2 text-green-400">
              <CheckCircle className="w-4 h-4 text-[#1db954] mt-0.5 flex-shrink-0" />
              <p className="text-[10px] leading-relaxed font-medium">{successMessage}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            
            {activeTab === 'signup' && (
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-450 block pl-0.5">Your Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    id="auth-register-name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 outline-none focus:ring-1 focus:ring-[#1db954]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-450 block pl-0.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 outline-none focus:ring-1 focus:ring-[#1db954]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-450 block pl-0.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 outline-none focus:ring-1 focus:ring-[#1db954]"
                />
              </div>
            </div>
            
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4.5 h-4.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-black" />
                <span>{activeTab === 'login' ? 'Confirm & Sign In' : 'Sign Up & Sync data'}</span>
              </>
            )}
          </button>

          {/* Elegant Divider */}
          <div className="flex items-center gap-2 py-1 select-none">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Or Continue With</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Prominent Google Sign-In Option */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-black text-xs uppercase tracking-wider rounded-xl border border-zinc-800 hover:border-zinc-700 shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.22-3.22C17.56 1.62 14.99 1 12 1 7.35 1 3.39 3.68 1.48 7.6l3.78 2.93C6.16 7.42 8.87 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.71 2.87c2.17-2 3.72-4.94 3.72-8.55z" />
              <path fill="#FBBC05" d="M5.26 14.53c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.48 7.04C.54 8.94 0 11.07 0 13.33s.54 4.39 1.48 6.29l3.78-3.09z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.71-2.87c-1.03.69-2.35 1.11-4.25 1.11-3.13 0-5.84-2.38-6.76-5.49L1.48 16.93C3.39 20.32 7.35 23 12 23z" />
            </svg>
            <span>Sign In with Google</span>
          </button>

          <p className="text-[9px] text-zinc-500 text-center leading-relaxed">
            By registering or signing in, we generate a secure cloud folder for your custom playlists, local themes, favorite indicators, and equalizer presets.
          </p>

        </form>
      </motion.div>
    </div>
  );
}
