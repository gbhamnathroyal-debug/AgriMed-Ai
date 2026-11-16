import React, { useState } from 'react';
import { DiagnosticMatch } from '../utils/diagnostics.ts';
import { calculateTankDosage, evaluatePhiSafety } from '../utils/calculator.ts';
import { 
  AlertTriangle, 
  FlaskConical, 
  Leaf, 
  ShieldCheck, 
  Clock, 
  CloudRain, 
  Save, 
  MessageSquare, 
  Check, 
  Info,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';

interface DiagnosisResultCardProps {
  match: DiagnosticMatch;
  rank: number;
  onSaveConsultation: (notes: string, tankSize: number) => Promise<void>;
  onAskAiAboutDisease: (diseaseName: string, cropName: string) => void;
  isSaving: boolean;
  hasSaved: boolean;
}

export const DiagnosisResultCard: React.FC<DiagnosisResultCardProps> = ({
  match,
  rank,
  onSaveConsultation,
  onAskAiAboutDisease,
  isSaving,
  hasSaved,
}) => {
  const { disease, confidenceScore } = match;
  const [tankSize, setTankSize] = useState<number>(16); // Default 16L backpack
  const [plannedHarvestDays, setPlannedHarvestDays] = useState<number | undefined>(undefined);
  const [farmerNotes, setFarmerNotes] = useState<string>('');
  const [showFullDetails, setShowFullDetails] = useState<boolean>(rank === 0); // Expand top result by default

  const chem = disease.chemicalPrescription;
  const organic = disease.organicControl;

  // Real-time dosage calculations
  const chemDosage = calculateTankDosage(chem.dosePerLiter, tankSize, chem.unit);
  const organicDosage = calculateTankDosage(organic.dosePerLiter, tankSize, organic.unit);
  const phiEval = evaluatePhiSafety(disease.phiDays, plannedHarvestDays);

  const severityColors: Record<string, string> = {
    Low: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
    Moderate: 'text-yellow-400 bg-yellow-950/60 border-yellow-500/30',
    High: 'text-orange-400 bg-orange-950/60 border-orange-500/30',
    Critical: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
  };

  const handleSave = async () => {
    if (hasSaved) return;
    await onSaveConsultation(farmerNotes, tankSize);
  };

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${
      rank === 0
        ? 'bg-gradient-to-b from-[#101b16] to-[#0c1411] border-emerald-500/40 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/30'
        : 'bg-[#0f1713]/80 border-emerald-900/30 hover:border-emerald-700/40'
    }`}>
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-900/40">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
            rank === 0
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300'
              : 'bg-emerald-950 border border-emerald-700/50 text-emerald-300'
          }`}>
            #{rank + 1}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-100 tracking-tight">
                {disease.name}
              </h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${severityColors[disease.severity]}`}>
                {disease.severity} Severity
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/30 text-emerald-300">
                {disease.pathogenType}
              </span>
            </div>
            <p className="text-xs italic font-serif text-emerald-400/80 mt-0.5">
              Pathogen: {disease.scientificName}
            </p>
          </div>
        </div>

        {/* Confidence Badge & Quick Actions */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
              Diagnostic Match
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                {confidenceScore}%
              </span>
              <div className="w-16 h-2 rounded-full bg-emerald-950 border border-emerald-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  style={{ width: `${confidenceScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="p-1.5 rounded-lg border border-emerald-900/50 text-slate-400 hover:text-emerald-300 hover:bg-emerald-900/30 transition-colors ml-2"
            title={showFullDetails ? 'Collapse details' : 'Expand full details'}
            aria-label={showFullDetails ? 'Collapse details' : 'Expand full details'}
          >
            {showFullDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {showFullDetails && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Weather Trigger Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-xs">
            <CloudRain className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-emerald-200">Epidemic Trigger Conditions: </span>
              <span className="text-slate-300">{disease.weatherConditions.trigger}</span>
              <span className="text-emerald-400/80 ml-2 font-mono text-[11px]">
                ({disease.weatherConditions.temperature}, {disease.weatherConditions.humidity} RH)
              </span>
            </div>
          </div>

          {/* Tank Capacity Adjuster Bar */}
          <div className="p-3.5 rounded-xl bg-[#09100d] border border-emerald-800/40 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Adjust Sprayer Tank Capacity (Dosage adapts automatically):</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-600/40">
                Current: {tankSize} Liters
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[12, 15, 16, 20, 25].map((liters) => (
                <button
                  key={liters}
                  type="button"
                  onClick={() => setTankSize(liters)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    tankSize === liters
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-950/50 border border-emerald-900/50 text-slate-300 hover:text-emerald-200 hover:border-emerald-700'
                  }`}
                >
                  {liters}L {liters === 16 ? '(Standard Backpack)' : ''}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-400">
                <span>Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={tankSize}
                  onChange={(e) => setTankSize(Math.max(1, parseInt(e.target.value) || 16))}
                  className="w-16 px-2 py-0.5 bg-[#0e1713] border border-emerald-900/60 rounded text-center text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                />
                <span>L</span>
              </div>
            </div>
          </div>

          {/* DUAL PRESCRIPTIONS GRID: Chemical vs Organic */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. CHEMICAL PRESCRIPTION */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#121e18] to-[#0c1511] border border-teal-800/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-teal-200">Chemical Prescription</h4>
                    <span className="text-[10px] text-teal-400/70 font-mono">Targeted Chemical Control</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-950 border border-teal-600/30 text-teal-300">
                  {chem.formulation}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Recommended Medicine & AI:</div>
                  <div className="text-sm font-bold text-slate-100">{chem.name}</div>
                  <div className="text-[11px] text-teal-400/80 font-mono">{chem.activeIngredient}</div>
                </div>

                {/* EXACT TANK DOSAGE CALLOUT */}
                <div className="p-3 rounded-xl bg-[#09120e] border border-teal-500/30 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-teal-400 flex items-center justify-between">
                    <span>Exact Dosage per {tankSize}L Tank:</span>
                    <span className="text-[11px] text-slate-400 lowercase">({chem.dosePerLiter} {chem.unit}/L)</span>
                  </div>
                  <div className="text-2xl font-black text-teal-300 font-mono flex items-baseline gap-2">
                    {chemDosage.formattedDose}
                    <span className="text-xs font-normal text-slate-400">
                      per {tankSize}L backpack sprayer
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-teal-900/40 flex items-center justify-between">
                    <span>Acre Coverage (~200L):</span>
                    <span className="text-teal-200 font-semibold">{chemDosage.tanksRequiredPerAcre} tanks / acre</span>
                  </div>
                </div>

                {/* Application Method & Interval */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-[#0e1713] border border-teal-900/30">
                    <span className="text-[10px] text-slate-400 block">Spray Interval:</span>
                    <span className="font-semibold text-slate-200">{chem.sprayIntervalDays} days</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0e1713] border border-teal-900/30">
                    <span className="text-[10px] text-slate-400 block">Season Max:</span>
                    <span className="font-semibold text-slate-200">{chem.maxApplicationsPerSeason} applications</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-teal-300">Application: </strong>
                  {chem.applicationMethod} ({chem.modeOfAction})
                </div>
              </div>
            </div>

            {/* 2. ORGANIC / BIO-CONTROL ALTERNATIVE */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#101e14] to-[#0c150e] border border-emerald-800/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-200">Organic Bio-Control</h4>
                    <span className="text-[10px] text-emerald-400/70 font-mono">Residue-Free Solution</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600/30 text-emerald-300">
                  {organic.formulation}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Bio-Agent Formulation:</div>
                  <div className="text-sm font-bold text-slate-100">{organic.name}</div>
                  <div className="text-[11px] text-emerald-400/80 font-mono">{organic.activeBioAgent}</div>
                </div>

                {/* EXACT ORGANIC TANK DOSAGE */}
                <div className="p-3 rounded-xl bg-[#09120b] border border-emerald-500/30 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 flex items-center justify-between">
                    <span>Organic Dose per {tankSize}L Tank:</span>
                    <span className="text-[11px] text-slate-400 lowercase">({organic.dosePerLiter} {organic.unit}/L)</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-300 font-mono flex items-baseline gap-2">
                    {organicDosage.formattedDose}
                    <span className="text-xs font-normal text-slate-400">
                      per {tankSize}L sprayer
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-emerald-900/40 flex items-center justify-between">
                    <span>Mechanism:</span>
                    <span className="text-emerald-200 font-semibold">{organic.mechanism}</span>
                  </div>
                </div>

                {/* Preparation Recipe */}
                <div className="p-2.5 rounded-lg bg-[#0e1710] border border-emerald-900/30 text-xs">
                  <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">
                    Field Preparation Instructions:
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {organic.preparationInstructions}
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-emerald-300">Bio Method: </strong>
                  {organic.applicationMethod}
                </div>
              </div>
            </div>
          </div>

          {/* SAFETY & PRE-HARVEST INTERVAL (PHI) WARNING SECTION */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#17130c] to-[#120f09] border border-amber-600/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm text-amber-200">
                    Pre-Harvest Interval (PHI) & Farmer Safety Warning
                  </h4>
                  <p className="text-[11px] text-amber-400/80">
                    Mandatory minimum days required between chemical application and food harvest
                  </p>
                </div>
              </div>

              {/* PHI Badge */}
              <div className={`px-3 py-1 rounded-lg border text-xs font-bold font-mono ${
                phiEval.riskLevel === 'danger'
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  : phiEval.riskLevel === 'caution' || phiEval.riskLevel === 'warning'
                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                  : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              }`}>
                Mandatory PHI: {disease.phiDays} Days
              </div>
            </div>

            {/* Interactive Harvest Buffer Tester */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 rounded-lg bg-[#0d0a07] border border-amber-900/40 text-xs">
              <div className="flex items-center gap-2 flex-1">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-slate-300">When is your planned crop harvest?</span>
                <input
                  type="number"
                  min="0"
                  max="90"
                  placeholder="e.g. 10"
                  value={plannedHarvestDays ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                    setPlannedHarvestDays(val);
                  }}
                  className="w-16 px-2 py-0.5 bg-[#17120a] border border-amber-700/50 rounded text-center text-amber-200 font-mono focus:outline-none focus:border-amber-400"
                />
                <span className="text-slate-400">days away</span>
              </div>

              {plannedHarvestDays !== undefined && (
                <div className={`px-2.5 py-1 rounded font-bold text-[11px] ${
                  phiEval.riskLevel === 'danger'
                    ? 'text-rose-300 bg-rose-950 border border-rose-800'
                    : phiEval.riskLevel === 'warning'
                    ? 'text-amber-300 bg-amber-950 border border-amber-800'
                    : 'text-emerald-300 bg-emerald-950 border border-emerald-800'
                }`}>
                  {phiEval.badgeLabel}
                </div>
              )}
            </div>

            {plannedHarvestDays !== undefined && (
              <p className={`text-[11px] leading-relaxed ${
                phiEval.riskLevel === 'danger' ? 'text-rose-300 font-medium' : 'text-slate-300'
              }`}>
                {phiEval.description}
              </p>
            )}

            {/* PPE Checklist & REI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
              <div className="space-y-1">
                <span className="font-semibold text-amber-300 text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Mandatory PPE Requirements:
                </span>
                <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                  {disease.safetyWarnings.map((warn: string, i: number) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-amber-300 text-[11px] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Restricted Entry & Cultural Advice:
                </span>
                <div className="text-[11px] text-slate-300">
                  <span className="text-amber-200 font-medium">REI (Worker Entry):</span> {disease.reiHours} hours after spray.
                </div>
                <div className="text-[11px] text-slate-400">
                  {disease.culturalPractices[0]}
                </div>
              </div>
            </div>
          </div>

          {/* CONSULTATION LOGGING & INTERACTION FOOTER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-emerald-900/40">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Optional notes (e.g. Field #3, North plot, high dew)..."
                value={farmerNotes}
                onChange={(e) => setFarmerNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#09100d] border border-emerald-900/50 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || hasSaved}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  hasSaved
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95'
                }`}
              >
                {hasSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    <span>Saved to Database</span>
                  </>
                ) : isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Consultation</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onAskAiAboutDisease(disease.name, disease.crop)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950 hover:bg-emerald-900/80 border border-emerald-700/50 text-emerald-300 transition-all hover:text-emerald-100"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ask AI Agronomist</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
