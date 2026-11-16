import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Sprout,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { signInWithGoogleAccountChooser, signOutGoogleAccount } from '../utils/firebaseGoogleAuth.ts';

interface DbStatusResponse {
  configured: boolean;
  connected: boolean;
  database: string;
  mode: 'mongodb_atlas' | 'local_fallback';
  error: string | null;
  label: string;
  lastCheckedAt: string;
  collections?: {
    users: number;
    diagnoses: number;
    disease_information: number;
  };
}

const SIGNUP_SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?\/]/g;
const SIGNUP_PASSWORD_POLICY_ERROR =
  'Password must be 8 characters: 1 uppercase letter, 1 special character, and 6 numbers.';

function evaluateSignupPassword(password: string) {
  const hasExactLength = password.length === 8;
  const hasOneUppercase = (password.match(/[A-Z]/g) || []).length === 1;
  const hasOneSpecial = (password.match(SIGNUP_SPECIAL_CHAR_REGEX) || []).length === 1;
  const hasSixNumbers = (password.match(/[0-9]/g) || []).length === 6;

  return {
    hasExactLength,
    hasOneUppercase,
    hasOneSpecial,
    hasSixNumbers,
    isValid: hasExactLength && hasOneUppercase && hasOneSpecial && hasSixNumbers,
  };
}

export const GoogleAuthModal: React.FC = () => {
  const {
    user,
    isAuthModalOpen,
    closeAuthModal,
    authModalReason,
    authModalError,
    clearAuthModalError,
    initialAuthTab,
    signup,
    login,
    loginWithGoogle,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [showGoogleStep, setShowGoogleStep] = useState<boolean>(false);
  const [forgotMode, setForgotMode] = useState<'none' | 'request_otp' | 'verify_otp'>('none');

  // Standard email/password fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Forgot / Set Password OTP fields
  const [resetOtp, setResetOtp] = useState<string>('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Google Account Sign-In Step fields (used when VITE_GOOGLE_CLIENT_ID is unset in preview mode)
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [googleName, setGoogleName] = useState<string>('');

  // Status & feedback states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSetPasswordQuickAction, setShowSetPasswordQuickAction] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);

  const resetFormFields = () => {
    setName('');
    setEmail('');
    setPassword('');
    setResetOtp('');
    setDemoOtp(null);
    setNewPassword('');
    setShowNewPassword(false);
    setForgotMode('none');
    setGoogleEmail('');
    setGoogleName('');
    setShowPassword(false);
    setShowGoogleStep(false);
    setErrorMessage(null);
    setShowSetPasswordQuickAction(false);
    setInfoMessage(null);
    setSuccessMessage(null);
    setIsLoading(false);
    setIsGoogleLoading(false);
  };

  // Clear all previous user data whenever user signs out
  useEffect(() => {
    if (!user) {
      resetFormFields();
    }
  }, [user]);

  // Reset form fields and check MongoDB Atlas status whenever modal opens or closes
  useEffect(() => {
    if (isAuthModalOpen) {
      resetFormFields();
      setActiveTab(initialAuthTab || 'signup');
      if (authModalError) {
        setErrorMessage(authModalError);
        clearAuthModalError();
      }

      let cancelled = false;
      setIsCheckingDb(true);
      fetch('/api/db-status')
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok || !data) {
            throw new Error(data?.error || 'Unable to reach /api/db-status endpoint.');
          }
          return data as DbStatusResponse;
        })
        .then((data: DbStatusResponse) => {
          if (!cancelled) setDbStatus(data);
        })
        .catch((err: any) => {
          if (!cancelled) {
            setDbStatus({
              configured: false,
              connected: false,
              database: 'agrimed',
              mode: 'local_fallback',
              error: err?.message || 'Unable to reach /api/db-status endpoint.',
              label: 'Status check unavailable',
              lastCheckedAt: new Date().toISOString(),
            });
          }
        })
        .finally(() => {
          if (!cancelled) setIsCheckingDb(false);
        });

      return () => {
        cancelled = true;
      };
    } else {
      resetFormFields();
    }
  }, [isAuthModalOpen, initialAuthTab, authModalError, clearAuthModalError]);

  const signupPasswordCheck = evaluateSignupPassword(password);
  const resetPasswordCheck = evaluateSignupPassword(newPassword);

  if (!isAuthModalOpen) return null;

  const handleTabSwitch = (newTab: 'signup' | 'login') => {
    setActiveTab(newTab);
    setShowGoogleStep(false);
    setForgotMode('none');
    setErrorMessage(null);
    setShowSetPasswordQuickAction(false);
    setInfoMessage(null);
    setSuccessMessage(null);
  };

  const openForgotPasswordFlow = (prefillEmail?: string) => {
    if (prefillEmail) setEmail(prefillEmail);
    setForgotMode('request_otp');
    setShowGoogleStep(false);
    setResetOtp('');
    setDemoOtp(null);
    setNewPassword('');
    setShowNewPassword(false);
    setErrorMessage(null);
    setShowSetPasswordQuickAction(false);
    setInfoMessage(null);
    setSuccessMessage(null);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowSetPasswordQuickAction(false);
    setInfoMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!signupPasswordCheck.isValid) {
      setErrorMessage(SIGNUP_PASSWORD_POLICY_ERROR);
      return;
    }

    setIsLoading(true);
    try {
      const res = await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (!res.success) {
        if (res.code === 'ACCOUNT_EXISTS') {
          setInfoMessage(res.error || 'Account already exists—switching to Log In.');
          setActiveTab('login');
          if (res.email) setEmail(res.email);
        } else {
          setErrorMessage(res.error || 'Failed to create account.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowSetPasswordQuickAction(false);
    setInfoMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (!res.success) {
        if (res.code === 'ACCOUNT_NOT_FOUND') {
          setInfoMessage(res.error || 'Account not found—please Create Account first.');
          setActiveTab('signup');
          if (res.email) setEmail(res.email);
        } else if (res.code === 'GOOGLE_ACCOUNT_NO_PASSWORD' || res.code === 'USE_GOOGLE_LOGIN') {
          setErrorMessage(
            res.error ||
              "This account was created with Google Sign-In and has no password yet. Use 'Continue with Google' or click 'Forgot / Set Password' to add an 8-character password."
          );
          setShowSetPasswordQuickAction(true);
        } else {
          setErrorMessage(res.error || 'Incorrect password');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowSetPasswordQuickAction(false);
    setInfoMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.error || 'No account found with this email.');
        return;
      }

      setEmail(normalizedEmail);
      setDemoOtp(data.demoOtp || null);
      setResetOtp('');
      setForgotMode('verify_otp');
      setInfoMessage(
        data.demoOtp
          ? 'Reset code generated below. Enter the 6-digit code and choose your new 8-character password.'
          : data.message || 'Reset code sent to your email address.'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to request reset code right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowSetPasswordQuickAction(false);
    setInfoMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\d{6}$/.test(resetOtp.trim())) {
      setErrorMessage('Please enter the valid 6-digit OTP code.');
      return;
    }
    if (!resetPasswordCheck.isValid) {
      setErrorMessage(SIGNUP_PASSWORD_POLICY_ERROR);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          otp: resetOtp.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to verify reset code. Please try again.');
        return;
      }

      setForgotMode('none');
      setActiveTab('login');
      setPassword('');
      setNewPassword('');
      setResetOtp('');
      setDemoOtp(null);
      setSuccessMessage(data.message || 'Password updated! You can now log in.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to update password right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleResponseFailure = async (res: { error?: string; code?: string; email?: string }) => {
    await signOutGoogleAccount();
    setShowGoogleStep(false);
    setInfoMessage(null);

    if (res.code === 'ACCOUNT_EXISTS') {
      setErrorMessage(res.error || 'This Google account already exists. Please switch to Log In.');
      setActiveTab('login');
      if (res.email) setEmail(res.email);
      return;
    }

    if (res.code === 'ACCOUNT_NOT_FOUND') {
      setErrorMessage(res.error || 'No account found for this Google email. Please Create Account first.');
      setActiveTab('signup');
      if (res.email) setEmail(res.email);
      return;
    }

    setErrorMessage(res.error || 'Google sign-in failed. Please try again.');
  };

  const handleGoogleButtonClick = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    const currentMode: 'signup' | 'login' = activeTab;
    const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

    if (googleClientId) {
      setIsGoogleLoading(true);
      sessionStorage.setItem('agrimed_google_mode', currentMode);
      const oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}` +
        `&redirect_uri=${encodeURIComponent(window.location.origin)}` +
        `&response_type=token&scope=openid%20email%20profile&prompt=select_account`;
      window.location.href = oauthUrl;
      return;
    }

    setIsGoogleLoading(true);
    try {
      const googleResult = await signInWithGoogleAccountChooser();
      const res = await loginWithGoogle({
        mode: currentMode,
        accessToken: googleResult.accessToken,
        credential: googleResult.idToken,
        email: googleResult.email,
        name: googleResult.name,
        avatarUrl: googleResult.avatarUrl,
      });
      if (!res.success) {
        await handleGoogleResponseFailure(res);
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setInfoMessage('Google account selection was cancelled. Click the Google button again to choose your email.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage('Your browser blocked the Google account selection window. Please allow pop-ups for this site and click again.');
      } else if (code === 'auth/unauthorized-domain' || code === 'auth/operation-not-supported-in-this-environment') {
        setGoogleEmail('');
        setGoogleName('');
        setShowGoogleStep(true);
        setInfoMessage('Google sign-in window is unavailable in this browser context. Enter your Google email below to continue.');
      } else {
        setErrorMessage(err?.message || 'Could not sign in with Google. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanedEmail = googleEmail.trim().toLowerCase();
    const cleanedName = googleName.trim();

    if (!cleanedEmail || !cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
      setErrorMessage('Please enter your valid Google email address (e.g. name@gmail.com).');
      return;
    }

    if (!cleanedName) {
      setErrorMessage('Please enter your full name for your Google profile.');
      return;
    }

    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle({
        mode: activeTab,
        email: cleanedEmail,
        name: cleanedName,
      });
      if (!res.success) {
        await handleGoogleResponseFailure(res);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not sign in with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div
        className="relative w-full max-w-md bg-white border border-[#E2E8E1] rounded-3xl shadow-2xl overflow-hidden text-[#111827] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Forest Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-[#15803D] via-[#22C55E] to-[#F59E0B]" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          disabled={isLoading || isGoogleLoading}
          className="absolute top-4 right-4 p-2 rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-[#15803D] shadow-xs">
              {showGoogleStep ? (
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              ) : (
                <Sprout className="w-6 h-6 text-[#15803D]" />
              )}
            </div>

            <h2 className="text-2xl font-black text-[#111827] tracking-tight">
              {showGoogleStep
                ? 'Google Account Sign-In'
                : forgotMode !== 'none'
                  ? 'Set or Reset Password'
                  : activeTab === 'signup'
                    ? 'Create Your Account'
                    : 'Welcome Back'}
            </h2>
            <p className="text-xs text-[#4B5563] max-w-xs mx-auto leading-relaxed">
              {showGoogleStep
                ? 'Enter your Google email and full name to sign in or create your AgriMed AI profile.'
                : forgotMode !== 'none'
                  ? 'Verify your registered email with a 6-digit code to set or update your 8-character password.'
                  : authModalReason || 'Access Universal Crop Pathology, Precision 16L Spray Dosages, and AI Agronomist Advisory.'}
            </p>

            {/* Live MongoDB Atlas Connection Badge */}
            <div className="pt-1 flex justify-center">
              {isCheckingDb ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-medium text-[#4B5563]">
                  <Loader2 className="w-3 h-3 animate-spin text-[#15803D]" />
                  <span>Checking MongoDB Atlas...</span>
                </div>
              ) : dbStatus?.connected ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                  <span>{dbStatus.label}</span>
                </div>
              ) : dbStatus?.configured ? (
                <div className="w-full p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] text-left flex items-start gap-2">
                  <Database className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 break-words">
                    <span className="font-bold block text-rose-950">MongoDB Atlas Connection Error</span>
                    <span>{dbStatus.error || 'Failed to connect to Cluster0 (agrimed).'}</span>
                  </div>
                </div>
              ) : dbStatus ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                  <Database className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Local NoSQL Fallback (Set MONGODB_URI secret for Atlas)</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Success Message Banner */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-semibold block text-[#166534]">Success</strong>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Informational Message Banner */}
          {infoMessage && (
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-semibold block text-blue-950">Notice</strong>
                <span>{infoMessage}</span>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-semibold block text-rose-950">Authentication Error</strong>
                <span>{errorMessage}</span>
                {showSetPasswordQuickAction && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => openForgotPasswordFlow(email.trim().toLowerCase())}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#166534] hover:text-[#14532D] underline underline-offset-2 cursor-pointer"
                    >
                      <span>Set a Password Now →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {forgotMode === 'request_otp' ? (
            /* FORGOT / SET PASSWORD — STEP 1: REQUEST 6-DIGIT OTP */
            <form onSubmit={handleRequestResetOtp} autoComplete="off" className="space-y-3.5 animate-fadeIn">
              <div>
                <label className="text-xs font-semibold text-[#111827] block mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="off"
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Generating 6-digit code...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-Digit Reset Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setForgotMode('none');
                  setErrorMessage(null);
                  setShowSetPasswordQuickAction(false);
                  setInfoMessage(null);
                }}
                className="w-full py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Log In</span>
              </button>
            </form>
          ) : forgotMode === 'verify_otp' ? (
            /* FORGOT / SET PASSWORD — STEP 2: VERIFY OTP & SET NEW 8-CHAR PASSWORD */
            <form onSubmit={handleResetPasswordSubmit} autoComplete="off" className="space-y-3.5 animate-fadeIn">
              {demoOtp && (
                <div className="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold block text-[11px] text-[#78350F]">
                      Verification Code (Instant Test Mode)
                    </span>
                    <span className="font-mono font-extrabold text-sm tracking-widest text-[#1C1917]">
                      {demoOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetOtp(demoOtp)}
                    className="px-2.5 py-1 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                  >
                    Fill Code
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#111827] block mb-1">
                  6-Digit Reset Code (for {email})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="off"
                  value={resetOtp}
                  disabled={isLoading}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 py-2.5 bg-white border border-[#E2E8E1] rounded-xl text-xs font-mono tracking-widest text-[#111827] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111827] block mb-1">
                  New Password{' '}
                  <span className="text-[11px] font-normal text-[#6B7280]">
                    (8 chars: 1 uppercase, 1 special, 6 numbers)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoComplete="off"
                    value={newPassword}
                    disabled={isLoading}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. A@123456"
                    className="w-full pl-9 pr-10 py-2 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live 4-Item Password Policy Checklist */}
                <div className="mt-2 p-2.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-1.5">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    {[
                      { label: 'Exactly 8 characters', met: resetPasswordCheck.hasExactLength },
                      { label: '1 uppercase letter (A-Z)', met: resetPasswordCheck.hasOneUppercase },
                      { label: '1 special character (!@#$...)', met: resetPasswordCheck.hasOneSpecial },
                      { label: '6 numbers (0-9)', met: resetPasswordCheck.hasSixNumbers },
                    ].map((rule) => (
                      <div
                        key={rule.label}
                        className={`flex items-center gap-1.5 font-medium transition-colors ${
                          rule.met ? 'text-[#166534]' : 'text-[#57534E]'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold shrink-0 ${
                            rule.met
                              ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                              : 'bg-gray-200 text-[#57534E]'
                          }`}
                        >
                          {rule.met ? '✓' : '•'}
                        </span>
                        <span className="truncate">{rule.label}</span>
                      </div>
                    ))}
                  </div>

                  {newPassword.length > 0 && !resetPasswordCheck.isValid && (
                    <p className="text-[11px] font-medium text-rose-600 leading-snug pt-0.5">
                      {SIGNUP_PASSWORD_POLICY_ERROR}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !/^\d{6}$/.test(resetOtp.trim()) || !resetPasswordCheck.isValid}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setForgotMode('request_otp');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="text-xs font-semibold text-[#166534] hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setForgotMode('none');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="text-xs font-semibold text-[#4B5563] hover:text-[#111827] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Log In</span>
                </button>
              </div>
            </form>
          ) : showGoogleStep ? (
            /* CLEAN IN-MODAL GOOGLE ACCOUNT SIGN-IN STEP (NO POPUP / NO ORIGIN MISMATCH) */
            <form onSubmit={handleGoogleStepSubmit} autoComplete="off" className="space-y-3.5 animate-fadeIn">
              <div>
                <label className="text-xs font-semibold text-[#111827] block mb-1">
                  Google Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="off"
                    value={googleEmail}
                    disabled={isGoogleLoading}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111827] block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={googleName}
                    disabled={isGoogleLoading}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGoogleLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => {
                  setShowGoogleStep(false);
                  setErrorMessage(null);
                }}
                className="w-full py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Email & Password</span>
              </button>
            </form>
          ) : (
            <>
              {/* Two-Tab Segmented Selector with Animated Green Active Pill */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="relative p-1 rounded-2xl bg-[#F5F2EB] border border-[#E5DFD3] grid grid-cols-2"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl bg-[#166534] shadow-sm transition-transform duration-200 ease-out ${
                    activeTab === 'login' ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'signup'}
                  disabled={isLoading || isGoogleLoading}
                  onClick={() => handleTabSwitch('signup')}
                  className={`relative z-10 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'signup'
                      ? 'text-white'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  <span>Create Account</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  disabled={isLoading || isGoogleLoading}
                  onClick={() => handleTabSwitch('login')}
                  className={`relative z-10 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'login'
                      ? 'text-white'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  <span>Log In</span>
                </button>
              </div>

              {/* TAB 1: CREATE ACCOUNT (SIGN UP) */}
              {activeTab === 'signup' && (
                <form onSubmit={handleCreateAccount} autoComplete="off" className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-[#111827] block mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        value={name}
                        disabled={isLoading || isGoogleLoading}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Patel"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D]"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="text-xs font-semibold text-[#111827] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        value={email}
                        disabled={isLoading || isGoogleLoading}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-semibold text-[#111827] block mb-1">
                      Password{' '}
                      <span className="text-[11px] font-normal text-[#6B7280]">
                        (8 chars: 1 uppercase, 1 special, 6 numbers)
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="off"
                        value={password}
                        disabled={isLoading || isGoogleLoading}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="e.g. A@123456"
                        className="w-full pl-9 pr-10 py-2 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Compact Live Password Policy Checklist */}
                    <div className="mt-2 p-2.5 rounded-xl bg-[#F7F9F6] border border-[#E2E8E1] space-y-1.5">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                        {[
                          { label: 'Exactly 8 characters', met: signupPasswordCheck.hasExactLength },
                          { label: '1 uppercase letter (A-Z)', met: signupPasswordCheck.hasOneUppercase },
                          { label: '1 special character (!@#$...)', met: signupPasswordCheck.hasOneSpecial },
                          { label: '6 numbers (0-9)', met: signupPasswordCheck.hasSixNumbers },
                        ].map((rule) => (
                          <div
                            key={rule.label}
                            className={`flex items-center gap-1.5 font-medium transition-colors ${
                              rule.met ? 'text-[#15803D]' : 'text-[#6B7280]'
                            }`}
                          >
                            <span
                              className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold shrink-0 ${
                                rule.met
                                  ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                                  : 'bg-gray-200 text-[#6B7280]'
                              }`}
                            >
                              {rule.met ? '✓' : '•'}
                            </span>
                            <span className="truncate">{rule.label}</span>
                          </div>
                        ))}
                      </div>

                      {password.length > 0 && !signupPasswordCheck.isValid && (
                        <p className="text-[11px] font-medium text-rose-600 leading-snug pt-0.5">
                          {SIGNUP_PASSWORD_POLICY_ERROR}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Create Account Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || isGoogleLoading || !signupPasswordCheck.isValid}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: LOG IN (EXISTING USERS) */}
              {activeTab === 'login' && (
                <form onSubmit={handleLogIn} autoComplete="off" className="space-y-3.5">
                  {/* Email Address */}
                  <div>
                    <label className="text-xs font-semibold text-[#111827] block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        value={email}
                        disabled={isLoading || isGoogleLoading}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-semibold text-[#111827] block mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="off"
                        value={password}
                        disabled={isLoading || isGoogleLoading}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-white border border-[#E2E8E1] rounded-xl text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9CA3AF] hover:text-[#4B5563]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        disabled={isLoading || isGoogleLoading}
                        onClick={() => openForgotPasswordFlow(email.trim().toLowerCase())}
                        className="text-[11px] font-semibold text-[#166534] hover:text-[#14532D] hover:underline underline-offset-2 cursor-pointer"
                      >
                        Forgot / Set Password?
                      </button>
                    </div>
                  </div>

                  {/* Log In Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || isGoogleLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Logging in...</span>
                      </>
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E2E8E1]"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  or continue with
                </span>
                <div className="flex-grow border-t border-[#E2E8E1]"></div>
              </div>

              {/* Google Auth Button (Opens Google Account Chooser with user's Google email addresses) */}
              <button
                type="button"
                disabled={isLoading || isGoogleLoading}
                onClick={handleGoogleButtonClick}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F7F9F6] border border-[#E2E8E1] hover:border-gray-300 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs active:scale-[0.99] text-xs font-semibold text-[#111827] disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#15803D]" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {isGoogleLoading
                    ? 'Connecting to Google...'
                    : activeTab === 'signup'
                      ? 'Sign up with Google'
                      : 'Continue with Google'}
                </span>
              </button>
            </>
          )}

          {/* Footer Security Badges */}
          <div className="pt-2 border-t border-[#E2E8E1] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
              <span>User-Scoped Consultations</span>
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Persistent NoSQL Auth</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
