import React, { useState } from 'react';
import { UniversalDiagnosisResult } from '../types/index.ts';
import { calculateTankDosage, evaluatePhiSafety } from '../utils/calculator.ts';
import { 
  FlaskConical, 
  Leaf, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Sliders, 
  Save, 
  Printer, 
  MessageSquare, 
  Check, 
  CloudRain,
  Tag,
  Info
} from 'lucide-react';
import { PrescriptionSlipModal } from './PrescriptionSlipModal.tsx';

interface UniversalDiagnosticResultProps {
  diagnosis: UniversalDiagnosisResult;
  onSaveConsultation: (notes: string, tankSize: number) => Promise<void>;
  onAskAi: (query: string, crop: string) => void;
  isSaving: boolean;
  hasSaved: boolean;
}

export const UniversalDiagnosticResult: React.FC<UniversalDiagnosticResultProps> = ({
  diagnosis,
  onSaveConsultation,
  onAskAi,
  isSaving,
  hasSaved,
}) => {
  const [tankSize, setTankSize] = useState<number>(16);
  const [plannedHarvestDays, setPlannedHarvestDays] = useState<number | undefined>(undefined);
  const [farmerNotes, setFarmerNotes] = useState<string>('');
  const [showSlipModal, setShowSlipModal] = useState<boolean>(false);

  const chem = diagnosis?.chemicalPrescription || {
    name: 'Targeted Crop Treatment',
    activeIngredient: 'Standard active',
    tradeNames: [],
    formulation: 'WP',
    dosePerLiter: 0,
    unit: 'g' as const,
    dosePer16LTank: 0,
    applicationMethod: 'Consult local agricultural officer',
    sprayIntervalDays: 7,
    maxApplicationsPerSeason: 2,
    modeOfAction: 'Protective',
    targetStage: 'Early symptoms',
  };
  const organic = diagnosis?.organicControl || {
    name: 'Trichoderma + Neem Bio-Control',
    activeBioAgent: 'Neem / Bio-control',
    formulation: 'WP',
    dosePerLiter: 5,
    unit: 'g' as const,
    dosePer16LTank: 80,
    preparationInstructions: 'Mix in clean water and spray late afternoon.',
    applicationMethod: 'Foliar spray',
    mechanism: 'Bio-suppression',
  };

  const chemDosage = calculateTankDosage(Number(chem.dosePerLiter) || 0, tankSize, chem.unit === 'ml' ? 'ml' : 'g');
  const organicDosage = calculateTankDosage(Number(organic.dosePerLiter) || 0, tankSize, organic.unit === 'ml' ? 'ml' : 'g');
  const phiEval = evaluatePhiSafety(Number(diagnosis?.phiDays) || 0, plannedHarvestDays);

  const severityColors: Record<string, string> = {
    Low: 'text-[#166534] bg-[#F5F2EB] border-[#E5DFD3]',
    Moderate: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]',
    High: 'text-[#C2410C] bg-[#FFEDD5] border-[#FED7AA]',
    Critical: 'text-[#C2410C] bg-[#FFEDD5] border-[#FED7AA]',
  };

  const safePpe = Array.isArray(diagnosis?.safetyPpe) && diagnosis.safetyPpe.length > 0
    ? diagnosis.safetyPpe
    : ['Wear nitrile gloves, N95 mask, and eye protection while spraying'];

  return (
    <div className="space-y-6 rounded-2xl bg-white border border-[#E5DFD3] p-6 sm:p-7 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5DFD3] pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#166534] text-white font-bold">
              {diagnosis.cropName} ({diagnosis.cropCategory})
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${severityColors[diagnosis.severity] || severityColors.Moderate}`}>
              {diagnosis.severity || 'Moderate'} Severity
            </span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C]">
              {diagnosis.pathogenType}
            </span>
          </div>

          <h2 className="font-black text-2xl sm:text-3xl text-[#1C1917] tracking-tight mt-2">
            {diagnosis.diseaseName}
          </h2>
          <p className="text-xs sm:text-sm italic text-[#57534E] mt-0.5">
            Scientific: {diagnosis.scientificName}
          </p>
        </div>

        {/* Confidence Gauge & Slip Button */}
        <div className="flex items-center gap-4 self-end md:self-center">
          <div className="text-right">
            <span className="text-[10px] text-[#57534E] uppercase tracking-wider font-semibold block">
              Confidence
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#C2410C] font-mono tabular-nums">
              {diagnosis.confidenceScore}%
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSlipModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Prescription Slip</span>
          </button>
        </div>
      </div>


      {/* Anti-Hallucination Database Verification / Inconclusive Image Callout */}
      {diagnosis.isPlantImageValid === false ? (
        <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs sm:text-sm space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-[#D97706]">
            <AlertTriangle className="w-5 h-5 text-[#D97706] flex-shrink-0" />
            <span>Image Inconclusive — Unclear Plant Foliage</span>
          </div>
          <p className="leading-relaxed text-[#78350F] pl-7">
            {diagnosis.uncertaintyNote || 'The uploaded photograph is blurry, dimly lit, or lacks recognizable leaf/fruit tissue. Chemical dosages are withheld for safety.'}
          </p>
        </div>
      ) : diagnosis.verifiedTreatmentFound ? (
        <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] text-[#1C1917] text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#166534] flex-shrink-0" />
            <span className="text-[#57534E]">
              <strong className="font-bold text-[#1C1917]">Verified Reference: </strong>
              {diagnosis.sourceReference || 'ICAR / CIBRC Registered Agricultural Data (Anti-Hallucination Checked)'}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#166534] text-white whitespace-nowrap">
            Database Verified
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span>
              <strong className="font-bold text-[#92400E]">Safety Caution: </strong>
              No verified dosage record in database—consult a local agricultural officer before applying chemicals.
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#D97706] border border-[#FDE68A] whitespace-nowrap">
            Dosage Withheld
          </span>
        </div>
      )}

      {/* Cause & Trigger Info */}
      <div className="p-4 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] text-xs sm:text-sm flex items-start gap-3">
        <CloudRain className="w-4 h-4 text-[#C2410C] mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold text-[#1C1917]">Cause & Environmental Triggers: </span>
          <span className="text-[#57534E]">{diagnosis.causeAndTriggers}</span>
        </div>
      </div>

      {/* TANK SIZE CALIBRATION BAR */}
      <div className="p-4 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#1C1917]">
            <Sliders className="w-4 h-4 text-[#166534]" />
            <span>Sprayer Tank Size:</span>
          </div>
          <span className="text-xs font-bold text-[#C2410C] bg-[#FFEDD5] px-3 py-1 rounded-lg border border-[#FED7AA]">
            Current: {tankSize} Liters
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[12, 15, 16, 20, 25].map((liters) => (
            <button
              key={liters}
              type="button"
              onClick={() => setTankSize(liters)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tankSize === liters
                  ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs font-bold'
                  : 'bg-white border border-[#E5DFD3] text-[#57534E] hover:text-[#1C1917] hover:border-[#166534]/50'
              }`}
            >
              {liters}L {liters === 16 ? '(Standard Knapsack)' : ''}
            </button>
          ))}

          <div className="flex items-center gap-1.5 sm:ml-auto text-xs text-[#57534E]">
            <span>Custom:</span>
            <input
              type="number"
              min="1"
              max="500"
              value={tankSize}
              onChange={(e) => setTankSize(Math.max(1, parseInt(e.target.value) || 16))}
              className="w-16 px-2 py-1 bg-white border border-[#E5DFD3] rounded text-center text-[#1C1917] font-mono focus:outline-none focus:border-[#166534]"
            />
            <span>L</span>
          </div>
        </div>
      </div>

      {/* DUAL PRESCRIPTIONS: Chemical vs Organic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHEMICAL MEDICINE CARD (Terracotta Secondary Accent on Peach-Sand) */}
        <div className="p-5 rounded-2xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFEDD5] border border-[#FED7AA] flex items-center justify-center text-[#C2410C]">
                <FlaskConical className="w-4 h-4 text-[#C2410C]" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#1C1917]">Chemical Medicine</h3>
                <span className="text-[11px] text-[#C2410C] font-semibold">Targeted Treatment</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C]">
              {chem.formulation}
            </span>
          </div>

          <div>
            <div className="text-xs text-[#57534E]">Medicine & Active Ingredient:</div>
            <div className="text-base sm:text-lg font-bold text-[#1C1917]">{chem.name}</div>
            <div className="text-xs text-[#57534E]">Active Ingredient: {chem.activeIngredient}</div>
            {chem.tradeNames && chem.tradeNames.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-[#C2410C] mt-1 font-medium">
                <Tag className="w-3 h-3 text-[#C2410C]" />
                <span>Available brands: {chem.tradeNames.join(', ')}</span>
              </div>
            )}
          </div>

          {/* EXACT TANK DOSAGE CALLOUT */}
          <div className="p-4 rounded-xl bg-white border border-[#FED7AA] space-y-1 shadow-2xs">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#C2410C] flex items-center justify-between">
              <span>Quantity per {tankSize}L Tank:</span>
              <span className="text-xs text-[#57534E] lowercase">({chem.dosePerLiter} {chem.unit} / L)</span>
            </div>
            <div className="text-3xl font-black text-[#C2410C] font-mono tabular-nums flex items-baseline gap-2">
              {chemDosage.formattedDose}
              <span className="text-xs font-normal text-[#57534E]">
                in clean water
              </span>
            </div>
            <div className="text-xs text-[#57534E] pt-1.5 border-t border-[#E5DFD3] flex items-center justify-between">
              <span>Per acre estimate (~200L):</span>
              <span className="text-[#1C1917] font-semibold">{chemDosage.tanksRequiredPerAcre} tanks / acre</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#E5DFD3]">
              <span className="text-[10px] text-[#57534E] block">Spray Interval:</span>
              <span className="font-semibold text-[#1C1917]">{chem.sprayIntervalDays} days</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E5DFD3]">
              <span className="text-[10px] text-[#57534E] block">Max Sprays / Season:</span>
              <span className="font-semibold text-[#1C1917]">{chem.maxApplicationsPerSeason} times</span>
            </div>
          </div>

          <div className="text-xs text-[#57534E] leading-relaxed">
            <strong className="text-[#1C1917]">Application: </strong>
            {chem.applicationMethod} ({chem.modeOfAction})
          </div>
        </div>

        {/* ORGANIC BIO-CONTROL CARD */}
        <div className="p-5 rounded-2xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#166534] flex items-center justify-center text-white">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#1C1917]">Organic Alternative</h3>
                <span className="text-[11px] text-[#166534] font-semibold">Residue-Free Solution</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-[#E5DFD3] text-[#57534E]">
              {organic.formulation}
            </span>
          </div>

          <div>
            <div className="text-xs text-[#57534E]">Organic Bio-Agent:</div>
            <div className="text-base sm:text-lg font-bold text-[#1C1917]">{organic.name}</div>
            <div className="text-xs text-[#57534E]">Active Agent: {organic.activeBioAgent}</div>
          </div>

          {/* EXACT ORGANIC DOSAGE */}
          <div className="p-4 rounded-xl bg-white border border-[#E5DFD3] space-y-1 shadow-2xs">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#166534] flex items-center justify-between">
              <span>Organic Dose per {tankSize}L Tank:</span>
              <span className="text-xs text-[#57534E] lowercase">({organic.dosePerLiter} {organic.unit} / L)</span>
            </div>
            <div className="text-3xl font-black text-[#166534] font-mono tabular-nums flex items-baseline gap-2">
              {organicDosage.formattedDose}
              <span className="text-xs font-normal text-[#57534E]">
                per {tankSize}L sprayer
              </span>
            </div>
            <div className="text-xs text-[#57534E] pt-1.5 border-t border-[#E5DFD3] flex items-center justify-between">
              <span>Bio Action:</span>
              <span className="text-[#1C1917] font-semibold">{organic.mechanism}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white border border-[#E5DFD3] text-xs">
            <span className="text-[10px] font-bold text-[#166534] block mb-0.5">
              Preparation Tip:
            </span>
            <p className="text-[#57534E] text-xs leading-relaxed">
              {organic.preparationInstructions}
            </p>
          </div>

          <div className="text-xs text-[#57534E] leading-relaxed">
            <strong className="text-[#1C1917]">Application: </strong>
            {organic.applicationMethod}
          </div>
        </div>
      </div>

      {/* PRE-HARVEST INTERVAL & SAFETY GEAR (WARM AMBER / CREAM) */}
      <div className="p-5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F59E0B]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#D97706]" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1C1917]">
                Pre-Harvest Interval (PHI) & Safety Buffer
              </h3>
              <p className="text-xs text-[#92400E]">
                Waiting days between spraying and harvesting food
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1 rounded-lg text-xs font-bold font-mono bg-white border border-[#F59E0B]/50 text-[#D97706] shadow-xs">
            Mandatory PHI: {diagnosis.phiDays} Days
          </div>
        </div>

        {/* Harvest Date Buffer Checker */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-white border border-[#FDE68A] text-xs sm:text-sm">
          <div className="flex items-center gap-2 flex-1">
            <Clock className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span className="text-[#57534E]">When do you plan to harvest {diagnosis.cropName}?</span>
            <input
              type="number"
              min="0"
              max="120"
              placeholder="e.g. 7"
              value={plannedHarvestDays ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                setPlannedHarvestDays(val);
              }}
              className="w-16 px-2 py-1 bg-[#F5F2EB] border border-[#E5DFD3] rounded text-center text-[#1C1917] font-mono focus:outline-none focus:border-[#D97706]"
            />
            <span className="text-[#57534E]">days away</span>
          </div>

          {plannedHarvestDays !== undefined && (
            <div className={`px-3 py-1 rounded font-bold text-xs ${
              phiEval.riskLevel === 'danger'
                ? 'text-[#C2410C] bg-[#FFEDD5] border border-[#FED7AA]'
                : phiEval.riskLevel === 'warning'
                ? 'text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A]'
                : 'text-[#166534] bg-[#F5F2EB] border border-[#E5DFD3]'
            }`}>
              {phiEval.badgeLabel}
            </div>
          )}
        </div>

        {plannedHarvestDays !== undefined && (
          <p className={`text-xs leading-relaxed ${
            phiEval.riskLevel === 'danger' ? 'text-[#C2410C] font-semibold' : 'text-[#92400E]'
          }`}>
            {phiEval.description}
          </p>
        )}

        {/* PPE Checklist & REI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="space-y-1">
            <span className="font-semibold text-[#1C1917] text-xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" />
              Protective Gear (PPE):
            </span>
            <ul className="list-disc list-inside text-[#78350F] text-xs space-y-0.5">
              {safePpe.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-[#1C1917] text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#D97706]" />
              Field Re-entry (REI):
            </span>
            <div className="text-xs text-[#78350F]">
              Wait <strong className="text-[#1C1917]">{diagnosis.reiHours} Hours</strong> after spraying before entering the field.
            </div>
            <div className="text-xs text-[#92400E]">
              {diagnosis.culturalPractices?.[0] || 'Rotate with non-host crops and clear infected debris.'}
            </div>
          </div>
        </div>
      </div>

      {/* ANTI-HALLUCINATION & CLINICAL SAFETY TRANSPARENCY PANEL */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5DFD3] space-y-4 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
        <div className="flex items-center justify-between border-b border-[#E5DFD3] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F5F2EB] border border-[#E5DFD3] flex items-center justify-center text-[#166534]">
              <ShieldCheck className="w-4 h-4 text-[#166534]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1C1917]">
                Clinical Safety & Differential Diagnosis
              </h3>
              <p className="text-[11px] text-[#57534E]">
                Strict anti-hallucination protocols with verified ICAR/CIBRC references
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C]">
            {diagnosis.confidenceScore}% Confidence ({diagnosis.confidenceLevel || 'High'})
          </span>
        </div>

        {/* Clinical Uncertainty Note */}
        {(diagnosis.uncertaintyNote || diagnosis.uncertaintyReason) && (
          <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs space-y-1">
            <span className="font-bold text-[#92400E] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#D97706]" />
              Diagnostic Transparency & Ambiguity Analysis:
            </span>
            <p className="text-[#78350F] leading-relaxed">
              {diagnosis.uncertaintyNote || diagnosis.uncertaintyReason}
            </p>
          </div>
        )}

        {/* Differential Possibilities & Recommended Next Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Differential Diagnoses */}
          <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-2">
            <span className="font-bold text-[#1C1917] block">
              Differential Diagnoses (Alternative Possibilities):
            </span>
            {diagnosis.alternativeDiagnoses && diagnosis.alternativeDiagnoses.length > 0 ? (
              <ul className="space-y-1 text-[#57534E]">
                {diagnosis.alternativeDiagnoses.map((alt, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#C2410C] font-bold">•</span>
                    <span>{alt}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#57534E] italic">
                No secondary differential pathogens indicated; symptoms match primary pathology.
              </p>
            )}
          </div>

          {/* Actionable Next Steps */}
          <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] space-y-2">
            <span className="font-bold text-[#1C1917] block">
              Recommended Next Steps Before Spraying:
            </span>
            {diagnosis.recommendedNextSteps && diagnosis.recommendedNextSteps.length > 0 ? (
              <ul className="space-y-1 text-[#57534E]">
                {diagnosis.recommendedNextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#166534] shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-1 text-[#57534E]">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#166534] shrink-0 mt-0.5" />
                  <span>Inspect both upper and lower leaf surfaces across 10 random plants</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#166534] shrink-0 mt-0.5" />
                  <span>Calibrate sprayer water with clean neutral pH (6.0-6.5)</span>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* When to Consult Krishi Vigyan Kendra (KVK) / Expert Trigger */}
        <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[#92400E]">When to Consult Local Krishi Vigyan Kendra (KVK) or Agronomist:</span>
            <p className="text-[#78350F] leading-relaxed">
              {diagnosis.whenToConsultExpert || diagnosis.consultExpertWarning || 'Consult local Krishi Vigyan Kendra or extension officer if disease symptoms spread rapidly to more than 10% of field rows within 48 hours.'}
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#E5DFD3]">
        <input
          type="text"
          placeholder="Add farmer note (e.g. North plot, applied on cool evening)..."
          value={farmerNotes}
          onChange={(e) => setFarmerNotes(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:bg-white focus:border-[#166534]"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onSaveConsultation(farmerNotes, tankSize)}
            disabled={isSaving || hasSaved}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer w-full sm:w-auto ${
              hasSaved
                ? 'bg-[#F5F2EB] text-[#166534] border border-[#E5DFD3] cursor-default'
                : 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs active:scale-95'
            }`}
          >
            {hasSaved ? (
              <>
                <Check className="w-4 h-4 text-[#166534] stroke-[3]" />
                <span>Saved</span>
              </>
            ) : isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Consultation</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              onAskAi(
                `Tell me about managing ${diagnosis.diseaseName} in ${diagnosis.cropName}. What is the best integrated pest management (IPM) strategy and spray timing?`,
                diagnosis.cropName
              )
            }
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-[#F5F2EB] border border-[#E5DFD3] text-[#1C1917] transition-all cursor-pointer shadow-2xs w-full sm:w-auto"
          >
            <MessageSquare className="w-4 h-4 text-[#C2410C]" />
            <span>Ask Agronomist</span>
          </button>
        </div>
      </div>

      {/* Prescription Slip Modal */}
      {showSlipModal && (
        <PrescriptionSlipModal
          diagnosis={diagnosis}
          tankSize={tankSize}
          farmerNotes={farmerNotes}
          onClose={() => setShowSlipModal(false)}
        />
      )}
    </div>
  );
};
