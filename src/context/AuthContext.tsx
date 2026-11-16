import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User } from '../types/index.ts';
import { signOutGoogleAccount } from '../utils/firebaseGoogleAuth.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isAdmin: boolean;
  isAuthModalOpen: boolean;
  authModalReason: string;
  initialAuthTab: 'signup' | 'login';
  signup: (data: { name: string; email: string; password: string }) => Promise<{ success: boolean; error?: string; code?: string; email?: string }>;
  login: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string; code?: string; email?: string }>;
  loginWithGoogle: (payload: {
    mode?: 'signup' | 'login';
    credential?: string;
    accessToken?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string; code?: string; email?: string }>;
  logout: () => Promise<void>;
  openAuthModal: (reason?: string, defaultTab?: 'signup' | 'login') => void;
  closeAuthModal: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PRIMARY_TOKEN_KEY = 'agrimed_token';
const LEGACY_TOKEN_KEY = 'agrimed_auth_token';
const PRIMARY_USER_KEY = 'agrimed_user';
const LEGACY_USER_KEY = 'agrimed_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(PRIMARY_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(PRIMARY_USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthReady, setIsAuthReady] = useState<boolean>(() => {
    const initialToken = localStorage.getItem(PRIMARY_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    return !initialToken;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalReason, setAuthModalReason] = useState<string>('Sign in to access your agricultural diagnostic workspace');
  const [initialAuthTab, setInitialAuthTab] = useState<'signup' | 'login'>('signup');

  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const clearAuthStorage = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    try {
      localStorage.clear();
    } catch {
      localStorage.removeItem(PRIMARY_TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(PRIMARY_USER_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
    }
  }, []);

  // Verify stored session cleanly before marking auth ready
  useEffect(() => {
    if (!token) {
      setIsAuthReady(true);
      return;
    }

    let cancelled = false;
    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-auth-token': token,
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Session expired');
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.user) {
          const verifiedUser: User = {
            ...data.user,
            role: data.user.role === 'admin' ? 'admin' : 'farmer',
          };
          setUser(verifiedUser);
          localStorage.setItem(PRIMARY_USER_KEY, JSON.stringify(verifiedUser));
          localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(verifiedUser));
        } else {
          clearAuthStorage();
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthStorage();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, clearAuthStorage]);

  const openAuthModal = useCallback((reason?: string, defaultTab: 'signup' | 'login' = 'signup') => {
    if (reason) setAuthModalReason(reason);
    setInitialAuthTab(defaultTab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const persistAuthSession = useCallback((sessionToken: string, sessionUser: User) => {
    const normalizedUser: User = {
      ...sessionUser,
      role: sessionUser?.role === 'admin' ? 'admin' : 'farmer',
    };
    tokenRef.current = sessionToken;
    setToken(sessionToken);
    setUser(normalizedUser);
    setIsAuthReady(true);
    localStorage.setItem(PRIMARY_TOKEN_KEY, sessionToken);
    localStorage.setItem(LEGACY_TOKEN_KEY, sessionToken);
    localStorage.setItem(PRIMARY_USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(normalizedUser));
    setIsAuthModalOpen(false);
  }, []);

  const signup = async (data: { name: string; email: string; password: string }) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: body.error || 'Failed to create account.',
          code: body.code,
          email: body.email || data.email,
        };
      }

      persistAuthSession(body.token, body.user);
      return { success: true };
    } catch (err: any) {
      console.error('Signup network error:', err);
      return {
        success: false,
        error: err.message || 'Network error connecting to authentication service.',
      };
    }
  };

  const login = async (data: { email: string; password: string }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: body.error || 'Login failed. Please check your credentials.',
          code: body.code,
          email: body.email || data.email,
        };
      }

      persistAuthSession(body.token, body.user);
      return { success: true };
    } catch (err: any) {
      console.error('Login network error:', err);
      return {
        success: false,
        error: err.message || 'Network error connecting to authentication service.',
      };
    }
  };

  const loginWithGoogle = async (payload: {
    mode?: 'signup' | 'login';
    credential?: string;
    accessToken?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string; code?: string; email?: string }> => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: body.error || `Google authentication failed (status ${res.status})`,
          code: body.code,
          email: body.email || payload.email,
        };
      }

      persistAuthSession(body.token, body.user);
      return { success: true };
    } catch (err: any) {
      console.error('Google login error:', err);
      return {
        success: false,
        error: err.message || 'Could not reach authentication server.',
      };
    }
  };

  const logout = useCallback(async () => {
    const activeToken = tokenRef.current;
    if (activeToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'x-auth-token': activeToken,
          },
        });
      } catch (err) {
        console.warn('Logout notification error:', err);
      }
    }
    await signOutGoogleAccount();
    clearAuthStorage();
  }, [clearAuthStorage]);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      const activeToken = tokenRef.current;
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
        headers.set('x-auth-token', activeToken);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        clearAuthStorage();
        openAuthModal('Your session has expired. Please log in again to continue.', 'login');
      }

      return response;
    },
    [clearAuthStorage, openAuthModal]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAuthReady,
        isAdmin: user?.role === 'admin',
        isAuthModalOpen,
        authModalReason,
        initialAuthTab,
        signup,
        login,
        loginWithGoogle,
        logout,
        openAuthModal,
        closeAuthModal,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
