import React, { useState, useEffect } from 'react';
import { ConsultationRecord, UniversalDiagnosisResult, User } from '../types/index.ts';
import { 
  History, 
  Trash2, 
  Droplet, 
  AlertTriangle, 
  Leaf, 
  FlaskConical, 
  Search, 
  RefreshCw,
  Clock,
  Sparkles,
  Printer,
  FileText,
  Users,
  Database,
  ShieldCheck
} from 'lucide-react';
import { PrescriptionSlipModal } from './PrescriptionSlipModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface ConsultationHistoryProps {
  records: ConsultationRecord[];
  onDeleteRecord: (id: string | number) => Promise<void>;
  onRefresh: () => void;
  onConsultAiOnRecord: (query: string, crop: string) => void;
}

type AdminSection = 'all' | 'escalated' | 'users';

export const ConsultationHistory: React.FC<ConsultationHistoryProps> = ({
  records,
  onDeleteRecord,
  onRefresh,
  onConsultAiOnRecord,
}) => {
  const { user, isAdmin, authFetch } = useAuth();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [selectedRecordForSlip, setSelectedRecordForSlip] = useState<ConsultationRecord | null>(null);

  // Admin-only state (only populated when role === 'admin' in MongoDB agrimed.users)
  const [adminSection, setAdminSection] = useState<AdminSection>('all');
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  useEffect(() => {
    if (!isAdmin) {
      setAdminUsers([]);
      setAdminSection('all');
      return;
    }
    let cancelled = false;
    const loadAdminUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await authFetch('/api/admin/users');
        if (res.ok && !cancelled) {
          const data = await res.json();
          setAdminUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load registered users:', err);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    loadAdminUsers();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, authFetch]);

  const categories = [
    'All',
    'Grains & Cereals',
    'Vegetables',
    'Fruits',
    'Cash Crops',
    'Pulses & Legumes',
    'Spices & Plantation',
  ];

  const isEscalatedRecord = (r: ConsultationRecord) =>
    r.confidenceLevel === 'Low' ||
    r.confidenceScore < 65 ||
    r.isPlantImageValid === false ||
    r.verifiedTreatmentId === null;

  const escalatedCount = records.filter(isEscalatedRecord).length;

  const safeFormatDate = (value?: string) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const filteredRecords = (Array.isArray(records) ? records : []).filter((r) => {
    if (!r) return false;
    if (isAdmin && adminSection === 'escalated' && !isEscalatedRecord(r)) {
      return false;
    }
    const matchesCat =
      selectedCategoryFilter === 'All' ||
      (r.cropCategory && r.cropCategory.toLowerCase() === selectedCategoryFilter.toLowerCase());
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      (r.crop || '').toLowerCase().includes(query) ||
      (r.diseaseName || '').toLowerCase().includes(query) ||
      (r.notes && r.notes.toLowerCase().includes(query)) ||
      (Array.isArray(r.symptoms) ? r.symptoms : []).some((s) => String(s || '').toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  const handleDelete = async (id: string | number) => {
    setDeletingId(id);
    await onDeleteRecord(id);
    setDeletingId(null);
  };

  // Convert ConsultationRecord to UniversalDiagnosisResult for the slip modal
  const createDiagnosisFromRecord = (rec: ConsultationRecord): UniversalDiagnosisResult => {
    const recId = String(rec.id || rec._id || Date.now());
    const safeChem = rec.prescribedChemical || 'Targeted Crop Treatment';
    const safeOrg = rec.organicAlternative || 'Trichoderma + Neem Bio-Control';
    const doseMatch = String(rec.chemicalDosagePerTank || '').match(/([\d.]+)\s*(ml|g)/i);
    const parsedDose16 = doseMatch ? parseFloat(doseMatch[1]) : 40;
    const parsedUnit: 'g' | 'ml' = doseMatch && doseMatch[2].toLowerCase() === 'ml' ? 'ml' : 'g';

    return {
      id: `hist-${recId}`,
      cropName: rec.crop || 'Crop',
      cropCategory: (rec.cropCategory as any) || 'Vegetables',
      diseaseName: rec.diseaseName || 'Recorded Pathology',
      scientificName: rec.scientificName || 'Scientific taxon',
      pathogenType: (rec.pathogenType as any) || 'Fungal',
      severity: 'High',
      confidenceScore: Number(rec.confidenceScore ?? 85),
      keySymptomsIdentified: Array.isArray(rec.symptoms) ? rec.symptoms : [],
      causeAndTriggers: 'Favorable field humidity and canopy density.',
      chemicalPrescription: {
        name: safeChem,
        activeIngredient: safeChem,
        tradeNames: [],
        formulation: 'Standard formulation',
        dosePerLiter: Math.round((parsedDose16 / 16) * 100) / 100,
        unit: parsedUnit,
        dosePer16LTank: parsedDose16,
        applicationMethod: 'Foliar spray canopy coverage',
        sprayIntervalDays: 7,
        maxApplicationsPerSeason: 3,
        modeOfAction: 'Protective & systemic activity',
        targetStage: 'Field symptoms onset',
      },
      organicControl: {
        name: safeOrg,
        activeBioAgent: safeOrg,
        formulation: 'Bio-formulation',
        dosePerLiter: 5,
        unit: 'g',
        dosePer16LTank: 80,
        preparationInstructions: 'Mix with non-chlorinated water and apply in late afternoon.',
        applicationMethod: 'Foliar / soil drench',
        mechanism: 'Induced systemic resistance and competitive bio-suppression',
      },
      phiDays: Number(rec.phiDays ?? 7),
      reiHours: 24,
      safetyPpe: ['Wear nitrile gloves and N95 mask', 'Avoid spraying against wind'],
      culturalPractices: ['Prune diseased plant debris and maintain balanced nutrition'],
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5DFD3] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]">
              <History className="w-5 h-5 text-[#C2410C]" />
            </span>
            <h1 className="text-xl font-bold text-[#1C1917] tracking-tight">
              Consultation History
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F5F2EB] border border-[#E5DFD3] text-[#166534] flex items-center gap-1">
              <Database className="w-3 h-3 text-[#166534]" />
              NoSQL Store
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              isAdmin 
                ? 'bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706]' 
                : 'bg-[#F5F2EB] border border-[#E5DFD3] text-[#57534E]'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              {isAdmin ? 'Admin View: All Records' : 'User-Scoped: My Consultations'}
            </span>
          </div>
          <p className="text-sm text-[#57534E] mt-1.5">
            {isAdmin 
              ? 'Agronomist Admin access to all saved consultations, escalated cases, and registered accounts in MongoDB.' 
              : `Personalized consultation records saved under account (${user?.email || 'authenticated'}).`}
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="self-start md:self-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-white" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Admin Oversight Switcher (strictly visible only when MongoDB user role === 'admin') */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A]">
          <button
            type="button"
            onClick={() => setAdminSection('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              adminSection === 'all'
                ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs'
                : 'bg-white text-[#D97706] hover:bg-[#F5F2EB] border border-[#FDE68A]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>All Cases ({records.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSection('escalated')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              adminSection === 'escalated'
                ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs'
                : 'bg-white text-[#D97706] hover:bg-[#F5F2EB] border border-[#FDE68A]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Escalated / Low-Confidence ({escalatedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSection('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              adminSection === 'users'
                ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs'
                : 'bg-white text-[#D97706] hover:bg-[#F5F2EB] border border-[#FDE68A]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registered Users ({adminUsers.length})</span>
          </button>
        </div>
      )}

      {/* Admin Registered Users Directory */}
      {isAdmin && adminSection === 'users' ? (
        <div className="p-5 rounded-2xl bg-white border border-[#E5DFD3] shadow-[0_4px_16px_rgba(28,25,23,0.05)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1917] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#D97706]" />
              <span>Registered Accounts (agrimed.users)</span>
            </h2>
            <span className="text-[11px] text-[#57534E]">
              Roles enforced directly from MongoDB
            </span>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center text-xs text-[#57534E]">Loading accounts...</div>
          ) : adminUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#57534E]">No users found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {adminUsers.map((u) => (
                <div
                  key={u._id}
                  className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#1C1917] truncate">{u.fullName || u.name}</div>
                    <div className="text-[11px] text-[#57534E] truncate">{u.email}</div>
                    <div className="text-[10px] text-[#57534E] mt-0.5">
                      Provider: {u.authProvider || 'local'} • Joined {safeFormatDate(u.createdAt)}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      u.role === 'admin'
                        ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                        : 'bg-[#166534] text-white'
                    }`}
                  >
                    {u.role === 'admin' ? 'Admin' : 'Farmer'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search consultation logs by crop, disease, symptom, or notes..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5DFD3] rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#166534]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1.5 bg-white border border-[#E5DFD3] rounded-xl scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Records Grid */}
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[#E5DFD3] bg-white space-y-2.5 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
              <History className="w-10 h-10 text-[#A8A29E] mx-auto" />
              <h2 className="font-bold text-base text-[#1C1917]">
                No Consultations Found
              </h2>
              <p className="text-xs sm:text-sm text-[#57534E] max-w-sm mx-auto">
                Diagnose any crop and click "Save Consultation" to record treatments and spray formulas here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.map((rec) => (
                <div
                  key={rec._id || rec.id}
                  className="p-5 rounded-2xl bg-white border border-[#E5DFD3] hover:border-[#166534]/50 transition-all space-y-3.5 shadow-[0_4px_16px_rgba(28,25,23,0.05)]"
                >
              {/* Record Top */}
              <div className="flex items-start justify-between gap-2 border-b border-[#E5DFD3] pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-base text-[#1C1917]">
                      {rec.crop}
                    </span>
                    <span className="text-xs text-white font-semibold px-2 py-0.5 rounded-full bg-[#166534]">
                      {rec.cropCategory}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C]">
                      {rec.confidenceScore}% Match
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#1C1917] mt-1">
                    {rec.diseaseName}
                  </div>
                  <span className="text-xs text-[#57534E] font-serif italic block">
                    Pathogen: {rec.scientificName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedRecordForSlip(rec)}
                    className="p-2 rounded-lg bg-[#F5F2EB] hover:bg-[#166534] border border-[#E5DFD3] text-[#166534] hover:text-white transition-colors cursor-pointer"
                    title="Print Prescription Slip"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(rec._id || rec.id || '')}
                    disabled={deletingId === (rec._id || rec.id)}
                    className="text-[#78716C] hover:text-[#C2410C] p-2 rounded transition-colors cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Symptoms */}
              {rec.symptoms && rec.symptoms.length > 0 && (
                <div className="text-xs">
                  <span className="text-[11px] text-[#57534E] font-semibold block mb-1">
                    Observed Symptoms:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rec.symptoms.map((s, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#F5F2EB] border border-[#E5DFD3] text-[#57534E]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prescription Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#FFEDD5]/60 border border-[#FED7AA]">
                  <div className="flex items-center gap-1 text-[11px] text-[#C2410C] font-semibold mb-0.5">
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Chemical Medicine:</span>
                  </div>
                  <div className="font-semibold text-[#1C1917] line-clamp-1">{rec.prescribedChemical}</div>
                  <div className="text-xs text-[#C2410C] font-mono font-bold mt-0.5">{rec.chemicalDosagePerTank}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3]">
                  <div className="flex items-center gap-1 text-[11px] text-[#166534] font-semibold mb-0.5">
                    <Leaf className="w-3.5 h-3.5" />
                    <span>Organic Alternative:</span>
                  </div>
                  <div className="font-semibold text-[#1C1917] line-clamp-1">{rec.organicAlternative}</div>
                  <div className="text-xs text-[#166534] font-mono mt-0.5">Zero Residue</div>
                </div>
              </div>

              {/* Tank & Safety Metadata */}
              <div className="flex items-center justify-between text-xs text-[#57534E] pt-1.5 border-t border-[#E5DFD3]">
                <span className="flex items-center gap-1">
                  <Droplet className="w-3.5 h-3.5 text-[#166534]" />
                  Tank: <strong className="text-[#1C1917] font-mono">{rec.tankSizeLiters}L</strong>
                </span>

                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  PHI: {rec.phiDays} Days
                </span>

                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-[#78716C]" />
                  {safeFormatDate(rec.createdAt)}
                </span>
              </div>

              {rec.notes && (
                <div className="text-xs p-2.5 rounded-lg bg-[#F5F2EB] border border-[#E5DFD3] text-[#57534E] italic">
                  Note: "{rec.notes}"
                </div>
              )}

              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  onClick={() => setSelectedRecordForSlip(rec)}
                  className="text-[#166534] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Prescription Slip
                </button>

                <button
                  onClick={() =>
                    onConsultAiOnRecord(
                      `I recorded a consultation for ${rec.diseaseName} on ${rec.crop}. What follow-up steps should I take 5 days after applying ${rec.prescribedChemical}?`,
                      rec.crop
                    )
                  }
                  className="text-[#C2410C] hover:text-[#1C1917] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
                  Ask Follow-up
                </button>
              </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}

      {/* Slip Modal */}
      {selectedRecordForSlip && (
        <PrescriptionSlipModal
          diagnosis={createDiagnosisFromRecord(selectedRecordForSlip)}
          tankSize={selectedRecordForSlip.tankSizeLiters || 16}
          farmerNotes={selectedRecordForSlip.notes}
          onClose={() => setSelectedRecordForSlip(null)}
        />
      )}
    </div>
  );
};
