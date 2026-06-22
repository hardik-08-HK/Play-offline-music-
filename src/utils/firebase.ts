import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBFeev2JP-3XqPd-Xguo3il88a094JOyEo",
  authDomain: "adept-monitor-cr6mz.firebaseapp.com",
  projectId: "adept-monitor-cr6mz",
  storageBucket: "adept-monitor-cr6mz.firebasestorage.app",
  messagingSenderId: "786035571696",
  appId: "1:786035571696:web:584d47b5be7c9c48417b35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserCloudProfile {
  email: string | null;
  displayName: string | null;
  updatedAt: number;
  playlists: Array<{
    id: string;
    name: string;
    description?: string;
    songIds: string[];
    createdAt: number;
    isCustom: boolean;
  }>;
  recentSongIds: string[];
  favoriteSongIds: string[];
  activeTheme?: string;
  activeSkin?: string;
}

// Save user data to Firestore
export async function syncUserDataToCloud(userId: string, data: Partial<UserCloudProfile>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    ...data,
    updatedAt: Date.now()
  }, { merge: true });
}

// Fetch user data from Firestore
export async function fetchUserDataFromCloud(userId: string): Promise<UserCloudProfile | null> {
  const userDocRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserCloudProfile;
  }
  return null;
}
