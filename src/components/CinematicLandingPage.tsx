import React, { useState, useRef, useEffect } from 'react';
import { 
  Sprout, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Bot, 
  CheckCircle2, 
  ChevronRight,
  Globe,
  ChevronDown,
  Check
} from 'lucide-react';
import { ActiveTab } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LanguageCode,
  LANGUAGE_OPTIONS,
  LANDING_TRANSLATIONS,
  getLanguageOption,
  getStoredLanguage,
  setStoredLanguage,
} from '../utils/i18n.ts';

interface CinematicLandingPageProps {
  onEnterDashboard: (targetTab?: ActiveTab, prefillCrop?: string) => void;
  consultationCount: number;
  language?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
}

export const CinematicLandingPage: React.FC<CinematicLandingPageProps> = ({
  onEnterDashboard,
  consultationCount,
  language: controlledLanguage,
  onLanguageChange,
}) => {
  const { user, isAuthenticated, isAdmin, openAuthModal } = useAuth();
  const [internalLanguage, setInternalLanguage] = useState<LanguageCode>(() => getStoredLanguage());
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const activeLanguage = controlledLanguage ?? internalLanguage;
  const activeOption = getLanguageOption(activeLanguage);
  const t = LANDING_TRANSLATIONS[activeLanguage] || LANDING_TRANSLATIONS.en;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelectLanguage = (code: LanguageCode) => {
    setStoredLanguage(code);
    setInternalLanguage(code);
    if (onLanguageChange) {
      onLanguageChange(code);
    }
    setIsLangMenuOpen(false);
  };

  const handleAction = (targetTab?: ActiveTab, prefillCrop?: string) => {
    if (!isAuthenticated) {
      openAuthModal(t.authPrompt);
      return;
    }
    onEnterDashboard(targetTab, prefillCrop);
  };

  return (
    <div className="min-h-screen max-w-full w-full overflow-x-hidden bg-[#18120E] text-[#D6CFC7] flex flex-col selection:bg-green-600/30 selection:text-green-200 relative font-sans">
      
      {/* 4-Panel Desi Indian Farming Background Collage (2x2 Grid) */}
      <div className="absolute inset-0 z-0 grid grid-cols-1 sm:grid-cols-2 grid-rows-4 sm:grid-rows-2 w-full h-full overflow-hidden">
        {/* Panel 1: Godavari / Kerala Rice Paddy Fields */}
        <div className="relative w-full h-full overflow-hidden group">
          <img
            src="/images/paddy-field.png"
            alt="Lush green Indian rice paddy fields with coconut palm trees at golden sunrise"
            className="w-full h-full object-cover object-center scale-102 filter brightness-105 contrast-105"
          />
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#18120E]/80 border border-[#3D2F27] text-[10px] font-bold text-green-300 backdrop-blur-md shadow-sm">
            🌾 Godavari / Kerala Paddy
          </div>
        </div>

        {/* Panel 2: Indian Farmer Inspecting Crops */}
        <div className="relative w-full h-full overflow-hidden group">
          <img
            src="/images/indian-farmer.png"
            alt="Indian farmer in traditional attire inspecting healthy green crops in sunlit field"
            className="w-full h-full object-cover object-center scale-102 filter brightness-105 contrast-105"
          />
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#18120E]/80 border border-[#3D2F27] text-[10px] font-bold text-green-300 backdrop-blur-md shadow-sm">
            👨‍🌾 Indian Farmer Precision
          </div>
        </div>

        {/* Panel 3: Punjab Golden Wheat Harvest */}
        <div className="relative w-full h-full overflow-hidden group">
          <img
            src="/images/wheat-harvest.png"
            alt="Golden wheat fields in Punjab with rural farmland scenery"
            className="w-full h-full object-cover object-center scale-102 filter brightness-105 contrast-105"
          />
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#18120E]/80 border border-amber-500/40 text-[10px] font-bold text-amber-300 backdrop-blur-md shadow-sm">
            🚜 Punjab Golden Wheat
          </div>
        </div>

        {/* Panel 4: Chikmagalur & Western Ghats Spice Terraces */}
        <div className="relative w-full h-full overflow-hidden group">
          <img
            src="/images/spice-farm.png"
            alt="Green terraced vegetable and spice plantation in South India"
            className="w-full h-full object-cover object-center scale-102 filter brightness-105 contrast-105"
          />
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-[#18120E]/80 border border-[#3D2F27] text-[10px] font-bold text-green-300 backdrop-blur-md shadow-sm">
            ☕ South Indian Terraces
          </div>
        </div>
      </div>

      {/* Warm walnut-to-transparent gradient (rgba(24, 18, 14, 0.58)) with a soft golden amber radial glow behind hero title */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{ backgroundColor: 'rgba(24, 18, 14, 0.58)' }} 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#18120E] via-[#18120E]/50 to-[#18120E]/80 pointer-events-none" />
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 28%, rgba(245, 158, 11, 0.22) 0%, rgba(34, 197, 94, 0.08) 38%, transparent 68%)'
        }}
      />

      {/* Top Navbar */}
      <header className="relative z-30 border-b border-[#3D2F27]/80 bg-[#18120E]/85 backdrop-blur-xl px-3 sm:px-8 py-3 sm:py-4 w-full max-w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 w-full flex-nowrap">
          
          {/* Brand: Single line on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg shadow-green-600/25 ring-1 ring-green-400/40 shrink-0">
              <Sprout className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-xl tracking-tight text-[#FAF7F2] whitespace-nowrap">
                  AgriMed AI
                </span>
                <span className="hidden md:inline-flex text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/40 text-green-300 uppercase whitespace-nowrap">
                  {t.regionPill}
                </span>
              </div>
              <p className="text-[11px] text-[#D6CFC7] font-medium hidden sm:block truncate">
                {t.brandSubline}
              </p>
            </div>
          </div>

          {/* Right Controls: Indian Language Selector + Auth / Workspace Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-nowrap">
            {/* Compact Indian Language Selector */}
            <div className="relative shrink-0" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isLangMenuOpen}
                aria-label="Select Language"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#241B16] hover:bg-[#2F231D] border border-[#3D2F27] hover:border-green-500/50 text-[11px] sm:text-xs font-bold text-[#FAF7F2] shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Globe className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="max-w-[78px] sm:max-w-none truncate">{activeOption.nativeLabel}</span>
                <ChevronDown className={`w-3 h-3 text-[#A89F96] shrink-0 transition-transform duration-150 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangMenuOpen && (
                <div
                  role="listbox"
                  aria-label={t.languageTitle}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#241B16]/98 border border-[#3D2F27] shadow-2xl shadow-black/75 py-1.5 z-50 backdrop-blur-xl max-h-[75vh] overflow-y-auto"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A89F96] border-b border-[#3D2F27]/70 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-green-400" />
                    <span>{t.languageTitle}</span>
                  </div>
                  {LANGUAGE_OPTIONS.map((option) => {
                    const isSelected = option.code === activeLanguage;
                    return (
                      <button
                        key={option.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectLanguage(option.code)}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-green-500/15 text-green-300 font-bold'
                            : 'text-[#FAF7F2] hover:bg-[#2F231D] font-medium'
                        }`}
                      >
                        <span className="truncate whitespace-nowrap">{option.fullLabel}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-[#241B16] border border-[#3D2F27] shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-green-400/40 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-[#FAF7F2] hidden sm:inline truncate max-w-[90px] whitespace-nowrap">
                    {user.name}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                    isAdmin 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {isAdmin ? t.adminRole : t.farmerRole}
                  </span>
                </div>

                <button
                  onClick={() => onEnterDashboard('diagnostics')}
                  className="group hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-green-600/30 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{t.openWorkspace}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
                <button
                  onClick={() => openAuthModal(undefined, 'login')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#241B16] hover:bg-[#2F231D] border border-[#3D2F27] text-[11px] sm:text-sm font-bold text-[#FAF7F2] hover:text-green-300 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="whitespace-nowrap">{t.signIn}</span>
                </button>

                {/* Top-bar Get Started hidden on mobile screens, shown on md+ */}
                <button
                  onClick={() => handleAction('diagnostics')}
                  className="group hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-green-600/30 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{t.getStarted}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Hero Body Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-16 space-y-10 sm:space-y-12">
        
        {/* Main Hero Header Block */}
        <div className="max-w-4xl space-y-6">
          
          {/* Responsive Hero Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#241B16]/90 border border-[#3D2F27] text-green-300 text-xs font-semibold backdrop-blur-md shadow-md shadow-black/40 flex-wrap">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="hidden sm:inline tracking-wide">{t.heroBadgeDesktop}</span>
            <span className="sm:hidden tracking-wide">{t.heroBadgeMobile}</span>
            <span className="hidden sm:inline text-[#3D2F27]">•</span>
            <span className="hidden sm:inline text-[#FAF7F2] font-mono text-[11px] whitespace-nowrap">{t.heroCropCount}</span>
          </div>

          {/* Title & Tagline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#FAF7F2] tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-r from-[#FAF7F2] via-amber-200 to-green-400 bg-clip-text text-transparent">
                AgriMed AI
              </span>
            </h1>

            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#FAF7F2] tracking-tight leading-snug">
              {t.heroTagline}
            </p>

            <p className="text-sm sm:text-lg text-[#D6CFC7] leading-relaxed max-w-3xl pt-1">
              {t.heroDescription}
            </p>
          </div>

          {/* Glowing Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 w-full max-w-full">
            <button
              onClick={() => handleAction('diagnostics')}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-sm sm:text-base shadow-xl shadow-green-600/35 hover:shadow-green-500/50 transition-all duration-200 active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <Sparkles className="w-5 h-5 text-white fill-white shrink-0" />
              <span>{t.ctaGetStarted}</span>
              <ArrowRight className="w-5 h-5 text-white transition-transform group-hover:translate-x-1 shrink-0" />
            </button>

            <button
              onClick={() => handleAction('chat')}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#241B16]/90 hover:bg-[#2F231D] border border-[#3D2F27] hover:border-green-500/50 text-[#FAF7F2] font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-md backdrop-blur-md w-full sm:w-auto"
            >
              <Bot className="w-5 h-5 text-green-400 shrink-0" />
              <span>{t.ctaAskAi}</span>
            </button>

            <button
              onClick={() => handleAction('calculator')}
              className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[#241B16]/70 hover:bg-[#241B16] border border-[#3D2F27] text-[#D6CFC7] hover:text-[#FAF7F2] text-sm font-semibold transition-all cursor-pointer backdrop-blur-md w-full sm:w-auto"
            >
              <span>{t.ctaTankMath}</span>
            </button>
          </div>

          {/* Quick Value Points */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[#D6CFC7]">
            <span className="flex items-center gap-1.5 text-green-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> {t.bulletTank}
            </span>
            <span className="text-[#3D2F27]">•</span>
            <span className="flex items-center gap-1.5 text-green-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> {t.bulletOrganic}
            </span>
            <span className="text-[#3D2F27]">•</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" /> {t.bulletPhi}
            </span>
          </div>

        </div>

        {/* 4-Card Foreground Agronomic Capabilities Showcase (Distinct from Background Collage) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-bold tracking-widest text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span>{t.suiteHeading}</span>
            </h2>
            <span className="text-xs text-[#A89F96] hidden sm:block">{t.suiteSubheading}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Macro Leaf Pathology */}
            <div 
              onClick={() => handleAction('diagnostics', 'Rice')}
              className="group rounded-2xl overflow-hidden bg-[#241B16] border border-[#3D2F27] hover:border-green-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-black/60 hover:-translate-y-1 flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src="/images/leaf-pathology.jpg"
                  alt="Close-up botanical inspection of leaf blight lesions with a field loupe"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#241B16] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#18120E]/90 border border-[#3D2F27] text-[10px] font-bold text-green-300 uppercase tracking-wider backdrop-blur-md">
                  {t.cards.leafBadge}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#FAF7F2] group-hover:text-green-300 transition-colors">
                    {t.cards.leafTitle}
                  </h3>
                  <p className="text-xs text-[#D6CFC7] mt-1 leading-relaxed">
                    {t.cards.leafDesc}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-green-400 flex items-center justify-between pt-1 border-t border-[#3D2F27]">
                  <span>{t.cards.leafCta}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Card 2: 16L Knapsack Tank Calibration */}
            <div 
              onClick={() => handleAction('calculator')}
              className="group rounded-2xl overflow-hidden bg-[#241B16] border border-[#3D2F27] hover:border-green-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-black/60 hover:-translate-y-1 flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src="/images/knapsack-sprayer.jpg"
                  alt="Indian farmer measuring exact agricultural solution beside a 16-liter knapsack sprayer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#241B16] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#18120E]/90 border border-[#3D2F27] text-[10px] font-bold text-green-300 uppercase tracking-wider backdrop-blur-md">
                  {t.cards.tankBadge}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#FAF7F2] group-hover:text-green-300 transition-colors">
                    {t.cards.tankTitle}
                  </h3>
                  <p className="text-xs text-[#D6CFC7] mt-1 leading-relaxed">
                    {t.cards.tankDesc}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-green-400 flex items-center justify-between pt-1 border-t border-[#3D2F27]">
                  <span>{t.cards.tankCta}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Card 3: Residue-Free Organic Harvest */}
            <div 
              onClick={() => handleAction('diagnostics', 'Tomato')}
              className="group rounded-2xl overflow-hidden bg-[#241B16] border border-[#3D2F27] hover:border-green-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-black/60 hover:-translate-y-1 flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src="/images/organic-harvest.jpg"
                  alt="Woven basket of fresh heirloom tomatoes, chillies, and neem leaves"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#241B16] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#18120E]/90 border border-amber-500/40 text-[10px] font-bold text-amber-300 uppercase tracking-wider backdrop-blur-md">
                  {t.cards.organicBadge}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#FAF7F2] group-hover:text-amber-300 transition-colors">
                    {t.cards.organicTitle}
                  </h3>
                  <p className="text-xs text-[#D6CFC7] mt-1 leading-relaxed">
                    {t.cards.organicDesc}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between pt-1 border-t border-[#3D2F27]">
                  <span>{t.cards.organicCta}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Card 4: AI Agronomist & Field Advisory */}
            <div 
              onClick={() => handleAction('chat', 'Coffee')}
              className="group rounded-2xl overflow-hidden bg-[#241B16] border border-[#3D2F27] hover:border-green-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-black/60 hover:-translate-y-1 flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src="/images/field-advisory.jpg"
                  alt="Indian agronomist and farmer discussing crop protection plans in the field"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#241B16] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#18120E]/90 border border-[#3D2F27] text-[10px] font-bold text-green-300 uppercase tracking-wider backdrop-blur-md">
                  {t.cards.advisoryBadge}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#FAF7F2] group-hover:text-green-300 transition-colors">
                    {t.cards.advisoryTitle}
                  </h3>
                  <p className="text-xs text-[#D6CFC7] mt-1 leading-relaxed">
                    {t.cards.advisoryDesc}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-green-400 flex items-center justify-between pt-1 border-t border-[#3D2F27]">
                  <span>{t.cards.advisoryCta}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 1-Click Crop Presets Bar */}
        <section className="p-4 sm:p-5 rounded-2xl bg-[#241B16] border border-[#3D2F27] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
              <span>🌾</span> {t.presetsBadge}
            </span>
            <p className="text-xs text-[#D6CFC7]">{t.presetsDesc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { name: 'Rice' as const, label: t.cropNames.Rice, emoji: '🍚' },
                { name: 'Wheat' as const, label: t.cropNames.Wheat, emoji: '🌾' },
                { name: 'Chilli' as const, label: t.cropNames.Chilli, emoji: '🌶️' },
                { name: 'Tomato' as const, label: t.cropNames.Tomato, emoji: '🍅' },
                { name: 'Cotton' as const, label: t.cropNames.Cotton, emoji: '☁️' },
                { name: 'Coffee' as const, label: t.cropNames.Coffee, emoji: '☕' },
              ]
            ).map((crop) => (
              <button
                key={crop.name}
                onClick={() => handleAction('diagnostics', crop.name)}
                className="px-3 py-1.5 rounded-lg bg-[#18120E] hover:bg-green-500/15 border border-[#3D2F27] hover:border-green-500/50 text-[#FAF7F2] hover:text-green-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{crop.emoji}</span>
                <span>{crop.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Platform Telemetry Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#241B16] border border-[#3D2F27] text-center">
          <div className="space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black text-[#FAF7F2]">190+</div>
            <div className="text-xs font-bold text-green-400">{t.telemetry.cropsTitle}</div>
            <div className="text-[11px] text-[#A89F96]">{t.telemetry.cropsSub}</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black text-[#FAF7F2]">{t.telemetry.tankValue}</div>
            <div className="text-xs font-bold text-green-400">{t.telemetry.tankTitle}</div>
            <div className="text-[11px] text-[#A89F96]">{t.telemetry.tankSub}</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black text-[#FAF7F2]">{consultationCount}</div>
            <div className="text-xs font-bold text-green-400">{t.telemetry.savedTitle}</div>
            <div className="text-[11px] text-[#A89F96]">{t.telemetry.savedSub}</div>
          </div>

          <div className="space-y-0.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30" style={{ boxShadow: '0 0 18px rgba(245, 158, 11, 0.25)' }}>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">{t.telemetry.safetyValue}</div>
            <div className="text-xs font-bold text-amber-300">{t.telemetry.safetyTitle}</div>
            <div className="text-[11px] text-amber-200/80">{t.telemetry.safetySub}</div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#3D2F27]/80 bg-[#140F0C]/95 px-5 sm:px-8 py-5 text-xs text-[#A89F96] relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-400">AgriMed AI</span>
            <span>•</span>
            <span className="text-[#D6CFC7]">{t.footerTagline}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#A89F96]">
            <span>{t.footerPrescriptions}</span>
            <span>•</span>
            <span className="text-green-400 font-medium">{t.footerCalibration}</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
