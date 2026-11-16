import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Keep OAuth access token strictly in memory (never in localStorage/sessionStorage)
let cachedGoogleAccessToken: string | null = null;

onAuthStateChanged(firebaseAuth, (user) => {
  if (!user) {
    cachedGoogleAccessToken = null;
  }
});

export interface GooglePopupResult {
  accessToken?: string;
  idToken?: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export async function signInWithGoogleAccountChooser(): Promise<GooglePopupResult> {
  const result = await signInWithPopup(firebaseAuth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedGoogleAccessToken = credential?.accessToken || null;

  const email = result.user?.email || '';
  if (!email) {
    throw new Error('Google did not return an email address for the selected account.');
  }

  return {
    accessToken: credential?.accessToken || undefined,
    idToken: credential?.idToken || undefined,
    email,
    name: result.user?.displayName || email.split('@')[0],
    avatarUrl: result.user?.photoURL || undefined,
  };
}

export async function signOutGoogleAccount(): Promise<void> {
  cachedGoogleAccessToken = null;
  try {
    await signOut(firebaseAuth);
  } catch {
    // Ignore Firebase sign-out cleanup errors
  }
}

export function getCachedGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}
