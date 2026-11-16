import React from 'react';
import { 
  X, 
  Home, 
  Sprout, 
  LogOut, 
  ShieldCheck, 
  LogIn
} from 'lucide-react';
import { ActiveTab } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export type { ActiveTab };

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  historyCount: number;
  onNavigateToLanding: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  historyCount,
  onNavigateToLanding,
}) => {
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();

  const navItems = [
    {
      id: 'diagnostics' as ActiveTab,
      label: 'Crop Diagnosis',
      sublabel: 'Universal pathology & 16L spray Rx',
      icon: '🔬',
      badge: 'Universal',
    },
    {
      id: 'chat' as ActiveTab,
      label: 'AI Agronomist Chat',
      sublabel: 'Gemini conversational field advisor',
      icon: '🤖',
      badge: '24/7 AI',
    },
    {
      id: 'calculator' as ActiveTab,
      label: '16L Tank Calculator',
      sublabel: 'Precision knapsack dilution & acreage',
      icon: '📐',
      badge: 'Zero Waste',
    },
    {
      id: 'history' as ActiveTab,
      label: 'Consultation History',
      sublabel: isAdmin ? 'All user cases & escalations' : 'Personalized NoSQL document store',
      icon: '🗄️',
      count: historyCount,
    },
    {
      id: 'directory' as ActiveTab,
      label: 'Pathology Directory',
      sublabel: isAdmin ? 'Manage & edit crop disease dosages' : 'Searchable pest & disease reference',
      icon: '📖',
      badge: isAdmin ? 'Admin Access' : 'Field Guide',
    },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    if (!isAuthenticated) {
      openAuthModal(`Log in or create an account to access ${tabId === 'history' ? 'your Consultation History' : 'the diagnostic workspace'}.`);
      return;
    }
    setActiveTab(tabId);
    onClose();
  };

  return (
    <>
      {/* Subtle Backdrop */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/35 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Slide-Out Drawer Sidebar (Crisp White with Warm Stone Border & Soft Shadow) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs sm:w-80 bg-white border-r border-[#E5DFD3] shadow-[0_4px_16px_rgba(28,25,23,0.08)] flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isOpen 
            ? 'translate-x-0 opacity-100 visible pointer-events-auto' 
            : '-translate-x-full opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Drawer Brand Header with Close Button */}
        <div className="p-5 border-b border-[#E5DFD3] flex items-center justify-between bg-[#F5F2EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center shadow-sm text-white font-extrabold flex-shrink-0">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-[#1C1917] tracking-tight">
                  AgriMed AI
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFEDD5] text-[#C2410C]">
                  Field Tools
                </span>
              </div>
              <p className="text-xs text-[#57534E] mt-0.5">
                Crop Health & Spray Advisory
              </p>
            </div>
          </div>

          {/* Close ✕ Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-[#F5F2EB] border border-[#E5DFD3] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Authenticated User Profile Card inside Drawer */}
        <div className="p-4 border-b border-[#E5DFD3] bg-white">
          {isAuthenticated && user ? (
            <div className="p-3.5 rounded-2xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-2.5">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-2xs flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#166534] text-white text-sm font-bold flex items-center justify-center border-2 border-white shadow-2xs flex-shrink-0">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-[#1C1917] truncate block">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-[#57534E] truncate block">
                    {user.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#E5DFD3]">
                {/* Read-Only Role Badge (Server-governed via MongoDB agrimed.users) */}
                <div
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                    isAdmin 
                      ? 'bg-[#FEF3C7] text-[#D97706]' 
                      : 'bg-[#166534]/10 text-[#166534]'
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Sprout className="w-3 h-3" />}
                  <span>{isAdmin ? 'Agronomist Admin' : 'Farmer'}</span>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onNavigateToLanding();
                    onClose();
                  }}
                  className="text-xs text-[#C2410C] hover:text-[#9A3412] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                openAuthModal();
                onClose();
              }}
              className="w-full p-3 rounded-2xl bg-[#166534] hover:bg-[#14532D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        {/* Taskbar Tool Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 bg-white">
          <div className="px-3 pb-2 text-[11px] uppercase font-bold tracking-wider text-[#57534E]">
            Workspace Navigation
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left cursor-pointer group relative ${
                  isActive
                    ? 'bg-[#166534] hover:bg-[#14532D] border border-[#166534] text-white shadow-[0_4px_16px_rgba(28,25,23,0.08)]'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB] border border-transparent'
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5 select-none">{item.icon}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-[#1C1917]'}`}>
                      {item.label}
                    </span>

                    {item.badge && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F5F2EB] text-[#57534E] border border-[#E5DFD3]'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white text-[#166534]' : 'bg-[#166534] text-white'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs truncate mt-0.5 ${isActive ? 'text-white/85' : 'text-[#57534E]'}`}>
                    {item.sublabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer Footer & Back to Intro */}
        <div className="p-4 border-t border-[#E5DFD3] space-y-3 bg-[#F5F2EB]">
          {/* Back to Intro Button */}
          <button
            onClick={() => {
              onNavigateToLanding();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFEDD5]/60 border border-[#E5DFD3] hover:border-[#C2410C]/40 text-[#1C1917] text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs active:scale-98"
          >
            <Home className="w-4 h-4 text-[#57534E]" />
            <span>Return to Intro Page</span>
          </button>
        </div>
      </aside>
    </>
  );
};
