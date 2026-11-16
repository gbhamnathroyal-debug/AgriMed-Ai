import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  Home, 
  LogOut, 
  LogIn, 
  ShieldCheck 
} from 'lucide-react';
import { Sidebar, ActiveTab } from './components/Sidebar.tsx';
import { CinematicLandingPage } from './components/CinematicLandingPage.tsx';
import { UniversalDiagnosticEngine } from './components/UniversalDiagnosticEngine.tsx';
import { AgronomistChat } from './components/AgronomistChat.tsx';
import { ConsultationHistory } from './components/ConsultationHistory.tsx';
import { PathologyDirectory } from './components/PathologyDirectory.tsx';
import { TankCalculatorModal } from './components/TankCalculatorModal.tsx';
import { GoogleAuthModal } from './components/GoogleAuthModal.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DiseaseRule, ConsultationRecord } from './types/index.ts';
import { LanguageCode, getStoredLanguage, setStoredLanguage } from './utils/i18n.ts';

export type AppView = 'landing' | 'dashboard';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class WorkspaceErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode; resetKey?: string }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected rendering issue' };
  }

  componentDidUpdate(prevProps: { resetKey?: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
          <div className="p-8 rounded-2xl bg-white border border-[#E5DFD3] text-center space-y-3 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
            <h2 className="text-base font-bold text-[#1C1917]">Something went wrong loading this view</h2>
            <p className="text-xs text-[#C2410C] bg-[#FFEDD5] px-3 py-1.5 rounded-lg inline-block">{this.state.message}</p>
            <div>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="px-4 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Reload View
              </button>
            </div>
          </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { 
    user, 
    isAuthenticated, 
    isAuthReady,
    isAdmin, 
    logout, 
    openAuthModal, 
    loginWithGoogle,
    authFetch 
  } = useAuth();

  const [appView, setAppView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<ActiveTab>('diagnostics');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [diseases, setDiseases] = useState<DiseaseRule[]>([]);
  const [history, setHistory] = useState<ConsultationRecord[]>([]);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>(undefined);
  const [chatCrop, setChatCrop] = useState<string | undefined>(undefined);
  const [selectedDiagnosticCrop, setSelectedDiagnosticCrop] = useState<string | undefined>(undefined);
  const [selectedDiagnosticSymptoms, setSelectedDiagnosticSymptoms] = useState<string[] | undefined>(undefined);
  const [language, setLanguage] = useState<LanguageCode>(() => getStoredLanguage());
  const [isCompletingGoogleAuth, setIsCompletingGoogleAuth] = useState<boolean>(false);

  const handleLanguageChange = (nextLang: LanguageCode) => {
    setLanguage(nextLang);
    setStoredLanguage(nextLang);
  };

  // Handle Google OAuth 2.0 Redirect response (#access_token=...) on page load
  const handledOAuthRedirectRef = React.useRef(false);
  useEffect(() => {
    if (handledOAuthRedirectRef.current) return;
    const rawHash = window.location.hash;
    if (!rawHash) return;

    const hashParams = new URLSearchParams(rawHash.startsWith('#') ? rawHash.slice(1) : rawHash);
    const accessToken = hashParams.get('access_token');
    const oauthError = hashParams.get('error');

    if (!accessToken && !oauthError) return;
    handledOAuthRedirectRef.current = true;

    // Clear the OAuth hash from the URL bar immediately
    window.history.replaceState(null, '', window.location.pathname);

    const savedMode = sessionStorage.getItem('agrimed_google_mode');
    const mode: 'signup' | 'login' = savedMode === 'login' ? 'login' : 'signup';
    sessionStorage.removeItem('agrimed_google_mode');

    if (oauthError) {
      openAuthModal(
        undefined,
        mode,
        oauthError === 'access_denied'
          ? 'Google sign-in was cancelled. Click the Google button to choose your email again.'
          : `Google sign-in returned an error: ${oauthError}`
      );
      return;
    }

    if (!accessToken) return;

    setIsCompletingGoogleAuth(true);
    (async () => {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoRes.ok) {
          throw new Error('Could not verify your Google profile. Please try signing in again.');
        }

        const profile = await userInfoRes.json();
        const email = typeof profile?.email === 'string' ? profile.email.trim() : '';
        if (!email) {
          throw new Error('Google did not return an email address.');
        }

        const name = String(profile?.name || profile?.given_name || email.split('@')[0]).trim();
        const sub = typeof profile?.sub === 'string' ? profile.sub : '';
        const picture = typeof profile?.picture === 'string' ? profile.picture : undefined;

        const res = await loginWithGoogle({
          email,
          name,
          googleId: sub,
          avatarUrl: picture,
          mode,
        });

        if (!res.success) {
          if (res.code === 'ACCOUNT_EXISTS') {
            openAuthModal(
              undefined,
              'login',
              res.error || 'This Google account already exists. Please switch to Log In.'
            );
          } else if (res.code === 'ACCOUNT_NOT_FOUND') {
            openAuthModal(
              undefined,
              'signup',
              res.error || 'No account found for this Google email. Please Create Account first.'
            );
          } else {
            openAuthModal(undefined, mode, res.error || 'Google sign-in failed. Please try again.');
          }
        }
      } catch (err: any) {
        openAuthModal(
          undefined,
          mode,
          err?.message || 'Unable to complete Google sign-in. Please try again.'
        );
      } finally {
        setIsCompletingGoogleAuth(false);
      }
    })();
  }, [loginWithGoogle, openAuthModal]);

  // Smoothly transition into the Main Workspace immediately upon signing in
  const prevAuthRef = React.useRef(isAuthenticated);
  useEffect(() => {
    if (!prevAuthRef.current && isAuthenticated) {
      setAppView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const fetchHistory = async () => {
    if (!isAuthReady || !isAuthenticated) {
      setHistory([]);
      return;
    }
    try {
      const res = await authFetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load consultation history:', err);
    }
  };

  const fetchDiseases = async () => {
    try {
      const res = await fetch('/api/diseases');
      if (res.ok) {
        const data = await res.json();
        const normalized: DiseaseRule[] = (Array.isArray(data) ? data : []).map((d: any) => {
          const chemDose16 = Number(d.safeDosagePer16LTank ?? d.chemicalPrescription?.dosePer16LTank ?? 40);
          const chemUnit: 'g' | 'ml' = (d.dosageUnit || d.chemicalPrescription?.unit) === 'ml' ? 'ml' : 'g';
          const chemDoseL = Number(d.safeDosagePerLiter ?? d.chemicalPrescription?.dosePerLiter ?? Math.round((chemDose16 / 16) * 100) / 100);
          const orgDose16 = Number(d.organicDosagePer16LTank ?? d.organicControl?.dosePer16LTank ?? 80);
          const orgUnit: 'g' | 'ml' = (d.organicUnit || d.organicControl?.unit) === 'ml' ? 'ml' : 'g';
          const orgDoseL = Number(d.organicControl?.dosePerLiter ?? Math.round((orgDose16 / 16) * 100) / 100);

          return {
            id: String(d.id || d._id),
            crop: d.crop || 'Universal',
            name: d.name || d.diseaseName || 'Verified Pathology',
            scientificName: d.scientificName || 'Scientific taxon',
            pathogenType: d.pathogenType || 'Fungal',
            severity: d.severity || 'High',
            affectedParts: Array.isArray(d.affectedParts) ? d.affectedParts : ['Leaves'],
            symptoms: Array.isArray(d.symptoms) && d.symptoms.length > 0
              ? d.symptoms
              : Array.isArray(d.culturalPractices) && d.culturalPractices.length > 0
                ? d.culturalPractices
                : ['Diagnostic lesions on canopy foliage'],
            keyIndicators: Array.isArray(d.keyIndicators) ? d.keyIndicators : [],
            weatherConditions: d.weatherConditions || {
              temperature: 'Field ambient',
              humidity: 'High canopy humidity',
              trigger: d.sourceReference || 'ICAR / CIBRC verified field threshold',
            },
            chemicalPrescription: d.chemicalPrescription || {
              name: d.verifiedChemical || 'Targeted Fungicide',
              activeIngredient: d.activeIngredient || d.verifiedChemical || 'Active ingredient',
              tradeNames: Array.isArray(d.tradeNames) ? d.tradeNames : [],
              formulation: d.formulation || 'WP',
              dosePerLiter: chemDoseL,
              unit: chemUnit,
              dosePer16LTank: chemDose16,
              applicationMethod: 'Foliar spray coverage across upper & lower leaf surfaces',
              sprayIntervalDays: 10,
              maxApplicationsPerSeason: 3,
              modeOfAction: 'Protective & curative foliar activity',
              targetStage: 'Early symptom onset',
            },
            organicControl: d.organicControl || {
              name: d.organicAlternative || 'Trichoderma + Cold-Pressed Neem Oil',
              activeBioAgent: d.organicAlternative || 'Bio-control formulation',
              formulation: 'Bio-WP / Liquid',
              dosePerLiter: orgDoseL,
              unit: orgUnit,
              dosePer16LTank: orgDose16,
              preparationInstructions: 'Dilute thoroughly in clean non-chlorinated water and spray during late afternoon.',
              applicationMethod: 'Foliar / root zone application',
              mechanism: 'Competitive antagonism and induced systemic resistance',
            },
            phiDays: Number(d.phiDays ?? 7),
            reiHours: Number(d.reiHours ?? 24),
            safetyWarnings: Array.isArray(d.safetyWarnings) ? d.safetyWarnings : ['Wear gloves and protective mask'],
            culturalPractices: Array.isArray(d.culturalPractices) ? d.culturalPractices : ['Sanitize tools and prune infected debris'],
            sourceReference: d.sourceReference || 'ICAR / CIBRC Field Guide',
            sourceUrls: Array.isArray(d.sourceUrls) ? d.sourceUrls : [],
            verificationStatus: d.verificationStatus || 'ICAR / CIBRC Verified',
          };
        });
        setDiseases(normalized);
      }
    } catch (err) {
      console.error('Failed to load directory diseases:', err);
    }
  };

  useEffect(() => {
    fetchDiseases();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchHistory();
  }, [isAuthReady, isAuthenticated, user?.role]);

  const handleDeleteHistory = async (id: string | number) => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory((prev) => prev.filter((r) => (r._id !== id && String(r.id) !== String(id))));
      }
    } catch (err) {
      console.error('Failed to delete history record:', err);
    }
  };

  const handleNavigateToChat = (query: string, crop: string) => {
    if (!isAuthenticated) {
      openAuthModal('Log in or create an account to consult the AI Agronomist on this finding.');
      return;
    }
    setChatPrompt(query);
    setChatCrop(crop);
    setActiveTab('chat');
    setAppView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterDashboard = (targetTab?: ActiveTab, prefillCrop?: string) => {
    if (!isAuthenticated) {
      openAuthModal('Create an account or log in to access your personalized agricultural workspace.');
      return;
    }
    if (targetTab) {
      setActiveTab(targetTab);
    }
    if (prefillCrop) {
      setSelectedDiagnosticCrop(prefillCrop);
      setChatCrop(prefillCrop);
    }
    setAppView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnToLanding = () => {
    setAppView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    setHistory([]);
    setChatPrompt(undefined);
    setChatCrop(undefined);
    setSelectedDiagnosticCrop(undefined);
    setSelectedDiagnosticSymptoms(undefined);
    setActiveTab('diagnostics');
    handleReturnToLanding();
  };

  // View 1: Cinematic Desi Indian Farming Intro (Publicly Accessible — Untouched)
  if (appView === 'landing') {
    return (
      <>
        <CinematicLandingPage
          onEnterDashboard={handleEnterDashboard}
          consultationCount={history.length}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
        <GoogleAuthModal />
        {isCompletingGoogleAuth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E5DFD3] rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3 text-[#1C1917] text-sm font-bold">
              <span className="w-4 h-4 rounded-full border-2 border-[#166534] border-t-transparent animate-spin" />
              <span>Completing Google Sign-In...</span>
            </div>
          </div>
        )}
      </>
    );
  }

  // View 2: Main Workspace with Slide-Out Drawer (Warm Sand & Forest Palette)
  return (
    <div key={user?._id || 'anon'} className="min-h-screen max-w-full w-full overflow-x-hidden bg-[#F5F2EB] text-[#57534E] flex flex-col selection:bg-[#FFEDD5] selection:text-[#1C1917] font-sans">
      {/* Slide-Out Drawer Sidebar (Hidden by default, slides out when ☰ Menu is clicked) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={history.length}
        onNavigateToLanding={handleReturnToLanding}
      />

      {/* Deep Forest Green Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#166534] border-b border-[#14532D] px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-white shadow-[0_4px_16px_rgba(28,25,23,0.08)] max-w-full w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* ☰ Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-[#F5F2EB] border border-white/25 hover:border-[#F5F2EB] text-white hover:text-[#1C1917] font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            aria-label="Open Navigation Menu"
          >
            <span className="tracking-wide">☰ Menu</span>
          </button>

          {/* AgriMed AI Brand: Single Line */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-white/20 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight whitespace-nowrap">
              AgriMed AI
            </span>
          </div>
        </div>

        {/* Top-Right: User Profile, Role Badge, Sign Out, Back to Intro */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Profile Card */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#14532D]/80 border border-white/20 shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-white/40 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-[#166534] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-white hidden md:inline truncate max-w-[120px]">
                  {user.name}
                </span>

                {/* Read-only Role Badge governed by MongoDB agrimed.users */}
                <div
                  className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap ${
                    isAdmin 
                      ? 'bg-[#FEF3C7] text-[#D97706]' 
                      : 'bg-[#F5F2EB] text-[#166534]'
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Sprout className="w-3 h-3" />}
                  <span>{isAdmin ? 'Admin' : 'Farmer'}</span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-[#F5F2EB] border border-white/25 hover:border-[#F5F2EB] text-xs font-semibold text-white hover:text-[#C2410C] transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                title="Sign out of current session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white hover:bg-[#F5F2EB] text-[#166534] text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Back to Intro Button */}
          <button
            onClick={handleReturnToLanding}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-[#F5F2EB] border border-white/25 hover:border-[#F5F2EB] text-xs font-semibold text-white hover:text-[#1C1917] transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Intro</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-h-[calc(100vh-61px)] w-full max-w-full overflow-x-hidden">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <WorkspaceErrorBoundary resetKey={activeTab}>
            {activeTab === 'diagnostics' && (
              <UniversalDiagnosticEngine
                onConsultationSaved={fetchHistory}
                onNavigateToChatWithQuery={handleNavigateToChat}
                initialCrop={selectedDiagnosticCrop}
                initialSymptoms={selectedDiagnosticSymptoms}
                language={language}
              />
            )}

            {activeTab === 'chat' && (
              <AgronomistChat
                initialPrompt={chatPrompt}
                initialCrop={chatCrop}
                onClearInitialPrompt={() => setChatPrompt(undefined)}
                language={language}
              />
            )}

            {activeTab === 'calculator' && (
              <TankCalculatorModal />
            )}

            {activeTab === 'history' && (
              <ConsultationHistory
                records={history}
                onDeleteRecord={handleDeleteHistory}
                onRefresh={fetchHistory}
                onConsultAiOnRecord={handleNavigateToChat}
              />
            )}

            {activeTab === 'directory' && (
              <PathologyDirectory
                diseases={diseases}
                onRefreshDiseases={fetchDiseases}
                onSelectForDiagnostic={(crop, symptoms) => {
                  setSelectedDiagnosticCrop(crop);
                  setSelectedDiagnosticSymptoms(Array.isArray(symptoms) && symptoms.length > 0 ? symptoms : undefined);
                  setActiveTab('diagnostics');
                }}
              />
            )}
          </WorkspaceErrorBoundary>
        </main>

        {/* Clean Warm Stone Workspace Footer */}
        <footer className="border-t border-[#E5DFD3] bg-white px-4 lg:px-8 py-4 text-xs text-[#57534E] mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#166534]">AgriMed AI</span>
              <span>•</span>
              <span className="text-[#57534E]">NoSQL Document Engine</span>
              <span>•</span>
              <span className="text-[#C2410C] font-medium">Persistent User &amp; Diagnosis Auth</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#57534E]">
              <span>User-Scoped Consultations</span>
              <span className="text-[#166534] font-medium">Role-Based Access Control</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Google Authentication Gate Modal */}
      <GoogleAuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
