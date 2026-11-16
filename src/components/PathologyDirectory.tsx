import React, { useState, useMemo } from 'react';
import { DiseaseRule, CropType } from '../types/index.ts';
import { 
  BookOpen, 
  Search, 
  FlaskConical, 
  Leaf, 
  AlertTriangle, 
  CloudRain, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Trash2,
  Edit2,
  X,
  Database,
  Globe,
  ExternalLink,
  Loader2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface PathologyDirectoryProps {
  diseases: DiseaseRule[];
  onSelectForDiagnostic: (crop: CropType, symptoms: string[]) => void;
  onRefreshDiseases?: () => void | Promise<void>;
}

export const PathologyDirectory: React.FC<PathologyDirectoryProps> = ({
  diseases,
  onSelectForDiagnostic,
  onRefreshDiseases,
}) => {
  const { isAdmin, authFetch } = useAuth();
  const [selectedCrop, setSelectedCrop] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Global AI + Google Search Grounding Research State
  const [isResearchingGlobal, setIsResearchingGlobal] = useState<boolean>(false);
  const [globalSearchNotice, setGlobalSearchNotice] = useState<string | null>(null);
  const [globalSearchError, setGlobalSearchError] = useState<string | null>(null);

  // Admin Add / Edit Modal State
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Rule Form Data
  const [newCrop, setNewCrop] = useState<string>('Tomato');
  const [newName, setNewName] = useState<string>('');
  const [newScientificName, setNewScientificName] = useState<string>('');
  const [newPathogenType, setNewPathogenType] = useState<string>('Fungal');
  const [newSeverity, setNewSeverity] = useState<string>('Moderate');
  const [newSymptomsText, setNewSymptomsText] = useState<string>('');
  const [newChemicalName, setNewChemicalName] = useState<string>('');
  const [newChemicalActive, setNewChemicalActive] = useState<string>('');
  const [newChemicalDose16L, setNewChemicalDose16L] = useState<number>(32);
  const [newChemicalUnit, setNewChemicalUnit] = useState<'g' | 'ml'>('g');
  const [newOrganicName, setNewOrganicName] = useState<string>('');
  const [newOrganicDose16L, setNewOrganicDose16L] = useState<number>(50);
  const [newOrganicUnit, setNewOrganicUnit] = useState<'g' | 'ml'>('g');
  const [newPhiDays, setNewPhiDays] = useState<number>(7);

  const safeDiseases = Array.isArray(diseases) ? diseases : [];

  // Build crop chips dynamically: baseline common crops + any AI-researched/cached crops in MongoDB
  const crops = useMemo(() => {
    const base = ['All', 'Tomato', 'Potato', 'Rice', 'Wheat', 'Chilli', 'Cotton'];
    const seen = new Set(base.map((c) => c.toLowerCase()));
    const dynamic: string[] = [...base];
    for (const d of safeDiseases) {
      const c = (d?.crop || '').trim();
      if (c && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        dynamic.push(c);
      }
    }
    return dynamic;
  }, [safeDiseases]);

  const filteredDiseases = safeDiseases.filter((d) => {
    if (!d) return false;
    const cropName = String(d?.crop || '');
    const matchesCrop = selectedCrop === 'All' || cropName.toLowerCase() === selectedCrop.toLowerCase();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesCrop;

    const searchableText = [
      d?.name,
      (d as any)?.diseaseName,
      d?.scientificName,
      d?.crop,
      d?.pathogenType,
      d?.chemicalPrescription?.name,
      d?.chemicalPrescription?.activeIngredient,
      (d as any)?.verifiedChemical,
      d?.organicControl?.name,
      ...(Array.isArray(d?.symptoms) ? d.symptoms : []),
      ...(Array.isArray(d?.culturalPractices) ? d.culturalPractices : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      searchableText.includes(q) ||
      q.split(/\s+/).filter((t) => t.length >= 2).every((t) => searchableText.includes(t));

    return matchesCrop && matchesSearch;
  });

  const cropEmojis: Record<string, string> = {
    Tomato: '🍅',
    Potato: '🥔',
    Rice: '🌾',
    Wheat: '🌾',
    Chilli: '🌶️',
    Cotton: '☁️',
    Coffee: '☕',
    Mango: '🥭',
    Banana: '🍌',
    Sugarcane: '🎋',
    Onion: '🧅',
    Soybean: '🫘',
    Turmeric: '🧡',
    Grape: '🍇',
    Apple: '🍎',
    Corn: '🌽',
  };

  const getCropEmoji = (cropName?: string) => {
    const c = (cropName || '').trim();
    if (!c) return '🌱';
    const matchKey = Object.keys(cropEmojis).find((k) => c.toLowerCase().includes(k.toLowerCase()));
    return matchKey ? cropEmojis[matchKey] : '🌱';
  };

  const handleResearchWorldwide = async (forceAi = false) => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setGlobalSearchError('Please enter a crop or plant disease name (at least 2 characters) to research worldwide.');
      return;
    }

    setIsResearchingGlobal(true);
    setGlobalSearchError(null);
    setGlobalSearchNotice(null);

    try {
      const res = await authFetch('/api/diseases/search-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          crop: selectedCrop !== 'All' ? selectedCrop : undefined,
          forceAi,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Worldwide AI research failed. Please try again.');
      }

      if (onRefreshDiseases) {
        await onRefreshDiseases();
      }

      const firstDoc = Array.isArray(data?.results) ? data.results[0] : null;
      if (firstDoc) {
        const docId = String(firstDoc._id || firstDoc.id || '');
        // Ensure the newly cached card is immediately visible even if a different crop tab was selected
        setSelectedCrop('All');
        if (docId) setExpandedId(docId);
        if (data?.source === 'gemini_google_search') {
          setGlobalSearchNotice(
            `Researched "${firstDoc.diseaseName || query}" (${firstDoc.crop || 'Crop'}) via Google Search Grounding and cached permanently in MongoDB.`
          );
        } else {
          setGlobalSearchNotice(
            `Found ${data?.results?.length || 1} verified protocol(s) in MongoDB for "${query}".`
          );
        }
      }
    } catch (err: any) {
      setGlobalSearchError(err?.message || 'Could not complete worldwide research.');
    } finally {
      setIsResearchingGlobal(false);
    }
  };

  const openCreateModal = () => {
    setEditingRuleId(null);
    setFormError(null);
    setNewCrop('Tomato');
    setNewName('');
    setNewScientificName('');
    setNewPathogenType('Fungal');
    setNewSeverity('Moderate');
    setNewSymptomsText('');
    setNewChemicalName('');
    setNewChemicalActive('');
    setNewChemicalDose16L(32);
    setNewChemicalUnit('g');
    setNewOrganicName('');
    setNewOrganicDose16L(50);
    setNewOrganicUnit('g');
    setNewPhiDays(7);
    setShowRuleModal(true);
  };

  const openEditModal = (rule: DiseaseRule) => {
    setEditingRuleId(rule?.id || (rule as any)?._id || null);
    setFormError(null);
    setNewCrop(rule?.crop || 'Universal');
    setNewName(rule?.name || (rule as any)?.diseaseName || '');
    setNewScientificName(rule?.scientificName || '');
    setNewPathogenType(String(rule?.pathogenType || 'Fungal'));
    setNewSeverity(String(rule?.severity || 'High'));
    setNewSymptomsText((rule?.culturalPractices || rule?.symptoms || []).join('\n'));
    setNewChemicalName(rule?.chemicalPrescription?.name || (rule as any)?.verifiedChemical || '');
    setNewChemicalActive(rule?.chemicalPrescription?.activeIngredient || '');
    setNewChemicalDose16L(Number(rule?.chemicalPrescription?.dosePer16LTank ?? 40));
    setNewChemicalUnit(rule?.chemicalPrescription?.unit === 'ml' ? 'ml' : 'g');
    setNewOrganicName(rule?.organicControl?.name || (rule as any)?.organicAlternative || '');
    setNewOrganicDose16L(Number(rule?.organicControl?.dosePer16LTank ?? 80));
    setNewOrganicUnit(rule?.organicControl?.unit === 'ml' ? 'ml' : 'g');
    setNewPhiDays(Number(rule?.phiDays ?? 7));
    setShowRuleModal(true);
  };

  const handleSaveRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCrop.trim()) {
      setFormError('Disease name and crop are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const practicesArray = newSymptomsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      ...(editingRuleId ? { _id: editingRuleId } : {}),
      crop: newCrop.trim(),
      diseaseName: newName.trim(),
      name: newName.trim(),
      scientificName: newScientificName.trim() || `${newName.trim()} pathogen`,
      pathogenType: newPathogenType,
      severity: newSeverity,
      verifiedChemical: newChemicalName.trim() || 'Targeted Protective Fungicide',
      activeIngredient: newChemicalActive.trim() || newChemicalName.trim() || 'Active ingredient',
      safeDosagePer16LTank: newChemicalDose16L,
      safeDosagePerLiter: Math.round((newChemicalDose16L / 16) * 100) / 100,
      dosageUnit: newChemicalUnit,
      organicAlternative: newOrganicName.trim() || 'Neem & Bio-formulation',
      organicDosagePer16LTank: newOrganicDose16L,
      organicUnit: newOrganicUnit,
      phiDays: newPhiDays,
      reiHours: 24,
      culturalPractices: practicesArray.length > 0 ? practicesArray : ['Ensure proper drainage and sanitize field tools'],
      safetyWarnings: ['Wear nitrile gloves, mask, and eye protection while spraying'],
    };

    try {
      const endpoint = editingRuleId ? `/api/diseases/${editingRuleId}` : '/api/diseases';
      const method = editingRuleId ? 'PUT' : 'POST';

      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save pathology rule');
      }

      setShowRuleModal(false);
      setEditingRuleId(null);
      if (onRefreshDiseases) await onRefreshDiseases();
    } catch (err: any) {
      setFormError(err?.message || 'Error saving pathology rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await authFetch(`/api/diseases/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        if (onRefreshDiseases) await onRefreshDiseases();
      }
    } catch (err) {
      console.error('Failed to delete disease rule:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Directory Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5DFD3] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C]">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
              Unlimited Crop Disease & Treatment Directory
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F5F2EB] border border-[#E5DFD3] text-[#166534] flex items-center gap-1">
              <Database className="w-3 h-3 text-[#166534]" />
              MongoDB + Google Search Grounding
            </span>
            {isAdmin && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Agronomist Admin Controls Active
              </span>
            )}
          </div>
          <p className="text-sm text-[#57534E] mt-1">
            Search cached ICAR/CIBRC protocols or research any crop & plant disease worldwide with live Google Search grounding—results auto-save to MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Pathology Rule</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-[#57534E] bg-[#F5F2EB] px-3 py-2 rounded-xl border border-[#E5DFD3]">
            <span className="font-mono tabular-nums text-[#C2410C] font-bold text-sm">{filteredDiseases.length}</span>
            <span>pathologies</span>
          </div>
        </div>
      </div>

      {/* Live Unlimited Search & Worldwide Research Bar */}
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (filteredDiseases.length === 0 && searchQuery.trim().length >= 2) {
              handleResearchWorldwide(false);
            }
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setGlobalSearchError(null);
              }}
              placeholder="Search ANY crop or disease worldwide (e.g. Banana Panama Wilt, Turmeric Leaf Blotch, Apple Scab)..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E5DFD3] rounded-xl text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/15 shadow-[0_4px_16px_rgba(28,25,23,0.05)] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGlobalSearchError(null);
                  setGlobalSearchNotice(null);
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={isResearchingGlobal || searchQuery.trim().length < 2}
            onClick={() => handleResearchWorldwide(filteredDiseases.length > 0)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] disabled:bg-[#E5DFD3] disabled:text-[#78716C] text-white font-bold text-xs shadow-sm cursor-pointer disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0"
          >
            {isResearchingGlobal ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Researching Worldwide...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>🔍 Research Worldwide with AI</span>
              </>
            )}
          </button>
        </form>

        {/* Crop Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full p-1.5 bg-white border border-[#E5DFD3] rounded-xl shadow-[0_4px_16px_rgba(28,25,23,0.05)] scrollbar-none">
          {crops.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCrop(c)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCrop === c
                  ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-sm'
                  : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB]'
              }`}
            >
              {c !== 'All' ? `${getCropEmoji(c)} ${c}` : 'All Crops'}
            </button>
          ))}
        </div>

        {/* Worldwide Search Feedback Banners */}
        {globalSearchNotice && (
          <div className="p-3 rounded-xl bg-white border border-[#E5DFD3] text-[#1C1917] text-xs flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
              <span>{globalSearchNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalSearchNotice(null)}
              className="text-[#57534E] hover:text-[#1C1917] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {globalSearchError && (
          <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>{globalSearchError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalSearchError(null)}
              className="text-[#D97706] hover:text-[#1C1917] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Empty Local Search State -> Worldwide AI Grounding Prompt */}
      {filteredDiseases.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-2xl border border-[#E5DFD3] bg-white space-y-4 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFEDD5] border border-[#FED7AA] flex items-center justify-center text-[#C2410C]">
            <Globe className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-[#1C1917]">
              {searchQuery.trim()
                ? `"${searchQuery.trim()}" is not cached in MongoDB yet`
                : 'No pathologies match the selected crop filter'}
            </h3>
            <p className="text-xs sm:text-sm text-[#57534E] max-w-lg mx-auto">
              {searchQuery.trim()
                ? 'Research this crop disease live across ICAR, FAO, and university plant pathology extensions using Google Search Grounding—and cache it permanently for future farmers.'
                : 'Try selecting "All Crops" or enter any crop and disease name above to research worldwide.'}
            </p>
          </div>

          {searchQuery.trim().length >= 2 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={isResearchingGlobal}
                onClick={() => handleResearchWorldwide(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60 transition-all"
              >
                {isResearchingGlobal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching ICAR / FAO & Caching in MongoDB...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>🔍 Research "{searchQuery.trim()}" Worldwide with AI</span>
                  </>
                )}
              </button>

              {selectedCrop !== 'All' && (
                <button
                  type="button"
                  onClick={() => setSelectedCrop('All')}
                  className="px-4 py-2.5 rounded-xl bg-[#F5F2EB] hover:bg-[#FFEDD5] border border-[#E5DFD3] text-[#57534E] hover:text-[#1C1917] text-xs font-semibold cursor-pointer"
                >
                  Search Across All Crops
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Diseases Accordion Grid */
        <div className="space-y-3">
          {filteredDiseases.map((d, idx) => {
            const cardId = String(d?.id || (d as any)?._id || `disease-${idx}`);
            const isExpanded = expandedId === cardId;
            const diseaseName = d?.name || (d as any)?.diseaseName || 'Verified Pathology';
            const cropName = d?.crop || 'Universal';
            const scientificName = d?.scientificName || 'Agricultural taxon';
            const pathogenType = d?.pathogenType || 'Fungal';
            const symptomsList = Array.isArray(d?.symptoms) && d.symptoms.length > 0
              ? d.symptoms
              : Array.isArray(d?.culturalPractices) && d.culturalPractices.length > 0
                ? d.culturalPractices
                : ['Field symptoms on leaves, stems, or fruiting structures'];
            const chemName = d?.chemicalPrescription?.name || (d as any)?.verifiedChemical || 'Targeted Fungicide';
            const chemActive = d?.chemicalPrescription?.activeIngredient || (d as any)?.activeIngredient || chemName;
            const chemDose16 = Number(d?.chemicalPrescription?.dosePer16LTank ?? (d as any)?.safeDosagePer16LTank ?? 40);
            const chemUnit = d?.chemicalPrescription?.unit || (d as any)?.dosageUnit || 'g';
            const chemMethod = d?.chemicalPrescription?.applicationMethod || 'Uniform foliar spray coverage';
            const orgName = d?.organicControl?.name || (d as any)?.organicAlternative || 'Trichoderma + Neem Bio-Control';
            const orgAgent = d?.organicControl?.activeBioAgent || orgName;
            const orgDose16 = Number(d?.organicControl?.dosePer16LTank ?? (d as any)?.organicDosagePer16LTank ?? 80);
            const orgUnit = d?.organicControl?.unit || (d as any)?.organicUnit || 'g';
            const orgPrep = d?.organicControl?.preparationInstructions || 'Dilute in clean non-chlorinated water and spray in late afternoon.';
            const weatherTrigger = d?.weatherConditions?.trigger || d?.sourceReference || 'Favorable humid canopy conditions';
            const weatherTemp = d?.weatherConditions?.temperature || 'Field ambient';
            const weatherHumidity = d?.weatherConditions?.humidity || 'High canopy humidity';
            const phiDays = Number(d?.phiDays ?? 7);
            const sourceUrls = Array.isArray(d?.sourceUrls) ? d.sourceUrls : [];
            const isAiResearched = String(d?.verificationStatus || '').toLowerCase().includes('ai-researched');

            return (
              <div
                key={cardId}
                className="rounded-2xl border border-[#E5DFD3] bg-white hover:border-[#166534]/50 transition-all overflow-hidden shadow-[0_4px_16px_rgba(28,25,23,0.05)]"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : cardId)}
                  className="p-5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-3xl p-2 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] shrink-0">
                      {getCropEmoji(cropName)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-[#1C1917]">{diseaseName}</h3>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#166534] text-white">
                          {cropName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C] font-medium">
                          {pathogenType}
                        </span>
                        {d?.verificationStatus && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isAiResearched
                                ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#D97706]'
                                : 'bg-[#F5F2EB] border-[#E5DFD3] text-[#166534]'
                            }`}
                          >
                            {d.verificationStatus}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#57534E] font-serif italic mt-0.5 block">
                        {scientificName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block text-xs">
                      <span className="text-[11px] text-[#57534E] block font-medium">16L Tank Dose:</span>
                      <span className="font-mono tabular-nums text-[#C2410C] font-bold text-sm">
                        {chemDose16} {chemUnit}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl text-[#57534E] hover:bg-[#F5F2EB] transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-[#E5DFD3] mt-1 space-y-4 text-xs bg-[#F5F2EB]">
                    {/* Weather Trigger */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-[#E5DFD3] text-[#57534E] shadow-2xs mt-3">
                      <CloudRain className="w-4 h-4 text-[#C2410C] mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-[#1C1917]">Favorable Conditions: </strong>
                        {weatherTrigger} ({weatherTemp}, {weatherHumidity})
                      </div>
                    </div>

                    {/* Hallmarks */}
                    <div className="p-3.5 rounded-xl bg-white border border-[#E5DFD3] shadow-2xs">
                      <strong className="text-[#1C1917] text-xs font-bold block mb-2">Key Diagnostic Symptoms:</strong>
                      <ul className="list-disc list-inside space-y-1 text-[#57534E]">
                        {symptomsList.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Prescriptions side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-xl bg-white border border-[#E5DFD3] shadow-2xs space-y-2">
                        <div className="flex items-center gap-1.5 text-[#C2410C] font-bold text-sm">
                          <FlaskConical className="w-4 h-4" />
                          <span>{chemName}</span>
                        </div>
                        <div className="text-xs text-[#57534E] font-mono">
                          Active: {chemActive}
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C] font-bold font-mono text-xs">
                          16L Backpack Tank: {chemDose16} {chemUnit} ({Math.round((chemDose16 / 16) * 100) / 100} {chemUnit}/L)
                        </div>
                        <div className="text-xs text-[#57534E] leading-relaxed">
                          {chemMethod}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-[#E5DFD3] shadow-2xs space-y-2">
                        <div className="flex items-center gap-1.5 text-[#166534] font-bold text-sm">
                          <Leaf className="w-4 h-4" />
                          <span>{orgName}</span>
                        </div>
                        <div className="text-xs text-[#57534E] font-mono">
                          Agent: {orgAgent}
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F5F2EB] border border-[#E5DFD3] text-[#166534] font-bold font-mono text-xs">
                          16L Organic Dose: {orgDose16} {orgUnit}
                        </div>
                        <div className="text-xs text-[#57534E] leading-relaxed">
                          {orgPrep}
                        </div>
                      </div>
                    </div>

                    {/* Grounded Agricultural Source Citations & Clickable URLs */}
                    {(d?.sourceReference || sourceUrls.length > 0) && (
                      <div className="p-3.5 rounded-xl bg-white border border-[#E5DFD3] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <strong className="text-[#1C1917] text-xs font-bold flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-[#166534]" />
                            <span>Source Citation & Grounded References:</span>
                          </strong>
                          {d?.sourceReference && (
                            <span className="text-[11px] text-[#57534E]">{d.sourceReference}</span>
                          )}
                        </div>

                        {sourceUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {sourceUrls.map((src, sIdx) => (
                              <a
                                key={`${cardId}-src-${sIdx}`}
                                href={src?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F2EB] hover:bg-[#166534] border border-[#E5DFD3] hover:border-[#166534] text-[11px] font-semibold text-[#166534] hover:text-white transition-colors max-w-full"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[260px]">{src?.title || src?.url}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A]">
                      <span className="text-[#D97706] font-semibold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                        Pre-Harvest Interval (PHI): {phiDays} Days Waiting Period
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(d)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F2EB] text-[#D97706] border border-[#FDE68A] font-bold text-xs shadow-2xs cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Dosage</span>
                            </button>

                            {confirmDeleteId === cardId ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(cardId)}
                                  className="px-3 py-1.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-xs shadow-2xs cursor-pointer transition-all"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1.5 rounded-xl bg-white text-[#57534E] border border-[#E5DFD3] font-semibold text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(cardId)}
                                className="px-3 py-1.5 rounded-xl bg-[#FFEDD5] hover:bg-[#FED7AA] text-[#C2410C] border border-[#FED7AA] font-bold text-xs shadow-2xs cursor-pointer transition-all flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectForDiagnostic(cropName, symptomsList.slice(0, 2))}
                          className="px-4 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
                        >
                          Diagnose With These Symptoms
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Add / Edit Disease Rule Modal (strictly gated on isAdmin) */}
      {isAdmin && showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-[#E5DFD3] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 my-8 text-[#1C1917]">
            <div className="flex items-center justify-between border-b border-[#E5DFD3] pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#F5F2EB] text-[#166534]">
                  {editingRuleId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="font-bold text-base text-[#1C1917]">
                    {editingRuleId
                      ? 'Edit Verified Dosage & Pathology Protocol'
                      : 'Add New Pathology Rule to MongoDB'}
                  </h3>
                  <p className="text-xs text-[#57534E]">
                    Authorized Agronomist Admin control — saves directly to agrimed.disease_information.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRuleModal(false);
                  setEditingRuleId(null);
                }}
                className="p-2 rounded-xl text-[#57534E] hover:bg-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRuleSubmit} autoComplete="off" className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1C1917] block mb-1">Target Crop:</label>
                  <input
                    type="text"
                    value={newCrop}
                    onChange={(e) => setNewCrop(e.target.value)}
                    placeholder="e.g. Cotton, Cardamom, Mango"
                    className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-xs font-semibold text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#166534]"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1C1917] block mb-1">Pathology Common Name:</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Boll Rot / Anthracnose"
                    className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-xs font-semibold text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#166534]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[#1C1917] block mb-1">Scientific Name:</label>
                  <input
                    type="text"
                    value={newScientificName}
                    onChange={(e) => setNewScientificName(e.target.value)}
                    placeholder="e.g. Fusarium moniliforme"
                    className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#166534]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1C1917] block mb-1">Pathogen Type:</label>
                  <select
                    value={newPathogenType}
                    onChange={(e) => setNewPathogenType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#166534]"
                  >
                    <option value="Fungal">Fungal</option>
                    <option value="Bacterial">Bacterial</option>
                    <option value="Viral">Viral</option>
                    <option value="Oomycete">Oomycete</option>
                    <option value="Pest / Insect / Mite">Pest / Insect</option>
                    <option value="Nutrient Deficiency">Nutrient Deficiency</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#1C1917] block mb-1">Severity Level:</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#166534]"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1C1917] block mb-1">Observed Symptoms / Practices (one per line):</label>
                <textarea
                  rows={2}
                  value={newSymptomsText}
                  onChange={(e) => setNewSymptomsText(e.target.value)}
                  placeholder="Water soaked lesions on square buds&#10;Discoloration and boll rotting"
                  className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#166534]"
                />
              </div>

              {/* Chemical Rx */}
              <div className="p-3.5 rounded-2xl bg-[#FFEDD5]/60 border border-[#FED7AA] space-y-2">
                <span className="font-bold text-[#C2410C] block">1. Targeted Chemical Treatment:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#57534E] block">Brand/Product Name:</label>
                    <input
                      type="text"
                      value={newChemicalName}
                      onChange={(e) => setNewChemicalName(e.target.value)}
                      placeholder="e.g. Copper Oxychloride 50 WP"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5DFD3] rounded-lg text-xs text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#57534E] block">Active Ingredient:</label>
                    <input
                      type="text"
                      value={newChemicalActive}
                      onChange={(e) => setNewChemicalActive(e.target.value)}
                      placeholder="e.g. Copper Oxychloride 50%"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5DFD3] rounded-lg text-xs text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#57534E] block">16L Tank Dose:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={newChemicalDose16L}
                        onChange={(e) => setNewChemicalDose16L(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-white border border-[#E5DFD3] rounded-lg text-xs font-mono font-bold text-[#1C1917]"
                      />
                      <select
                        value={newChemicalUnit}
                        onChange={(e) => setNewChemicalUnit(e.target.value as 'g' | 'ml')}
                        className="px-1.5 py-1.5 bg-white border border-[#E5DFD3] rounded-lg text-xs text-[#1C1917]"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organic Rx & PHI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-2">
                  <span className="font-bold text-[#166534] block">2. Organic Alternative:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-[#57534E] block">Bio-Control Agent:</label>
                      <input
                        type="text"
                        value={newOrganicName}
                        onChange={(e) => setNewOrganicName(e.target.value)}
                        placeholder="e.g. Pseudomonas fluorescens"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E5DFD3] rounded-lg text-xs text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#57534E] block">16L Dose:</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={newOrganicDose16L}
                          onChange={(e) => setNewOrganicDose16L(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-white border border-[#E5DFD3] rounded-lg text-xs font-mono font-bold text-[#1C1917]"
                        />
                        <select
                          value={newOrganicUnit}
                          onChange={(e) => setNewOrganicUnit(e.target.value as 'g' | 'ml')}
                          className="px-1.5 py-1.5 bg-white border border-[#E5DFD3] rounded-lg text-xs text-[#1C1917]"
                        >
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] space-y-2">
                  <span className="font-bold text-[#D97706] block">3. Safety Waiting Period:</span>
                  <div>
                    <label className="text-[10px] text-[#78350F] block">PHI Days (Pre-Harvest Interval):</label>
                    <input
                      type="number"
                      value={newPhiDays}
                      onChange={(e) => setNewPhiDays(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#FDE68A] rounded-lg text-xs font-mono font-bold text-[#92400E]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DFD3]">
                <button
                  type="button"
                  onClick={() => {
                    setShowRuleModal(false);
                    setEditingRuleId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#F5F2EB] text-[#57534E] font-semibold text-xs cursor-pointer hover:text-[#1C1917]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
                >
                  {isSubmitting ? 'Saving...' : editingRuleId ? 'Update Dosage Protocol' : 'Save to MongoDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
