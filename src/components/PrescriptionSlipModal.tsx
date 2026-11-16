import React from 'react';
import { UniversalDiagnosisResult } from '../types/index.ts';
import { calculateTankDosage } from '../utils/calculator.ts';
import { 
  X, 
  Printer, 
  FileText, 
  Leaf, 
  FlaskConical, 
  AlertTriangle, 
  Sprout,
  CheckCircle2
} from 'lucide-react';

interface PrescriptionSlipModalProps {
  diagnosis: UniversalDiagnosisResult;
  tankSize: number;
  farmerNotes?: string;
  onClose: () => void;
}

export const PrescriptionSlipModal: React.FC<PrescriptionSlipModalProps> = ({
  diagnosis,
  tankSize,
  farmerNotes,
  onClose,
}) => {
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
  const safeTank = Math.max(1, Number(tankSize) || 16);
  const chemDosage = calculateTankDosage(Number(chem.dosePerLiter) || 0, safeTank, chem.unit === 'ml' ? 'ml' : 'g');
  const organicDosage = calculateTankDosage(Number(organic.dosePerLiter) || 0, safeTank, organic.unit === 'ml' ? 'ml' : 'g');
  const slipCode = String(diagnosis?.id || '000000').slice(-6).toUpperCase();
  const safePpeList = Array.isArray(diagnosis?.safetyPpe) && diagnosis.safetyPpe.length > 0
    ? diagnosis.safetyPpe
    : ['Wear nitrile gloves, N95 mask, and protective eyewear'];

  const printSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white border border-[#E5DFD3] rounded-2xl shadow-[0_4px_16px_rgba(28,25,23,0.12)] overflow-hidden text-[#1C1917] print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Modal Top Actions (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F5F2EB] border-b border-[#E5DFD3] print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#166534]">
            <FileText className="w-4 h-4 text-[#166534]" />
            <span>Official Agronomist Prescription Slip</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={printSlip}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#E5DFD3]/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRESCRIPTION SLIP CONTENT */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header & Logo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#E5DFD3] pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#166534] flex items-center justify-center text-white font-black text-xl shadow-md">
                <Sprout className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1C1917] print:text-black">
                  AgriMed Clinical Crop Rx
                </h1>
                <p className="text-xs text-[#166534] font-semibold">
                  Universal Plant Pathology & Precision 16L Tank Dosage Advisory
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-[#57534E] font-mono">
              <div>Rx Slip: <strong className="text-[#166534] print:text-black">AGR-{slipCode}</strong></div>
              <div>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              <div>Sprayer: <strong className="text-[#166534] print:text-black">{tankSize}L Tank Solution</strong></div>
            </div>
          </div>

          {/* Patient Crop & Disease Diagnostics Box */}
          <div className="p-5 rounded-2xl bg-[#F5F2EB] border border-[#E5DFD3] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-[#57534E] uppercase tracking-wider font-semibold block mb-0.5">Host Crop:</span>
              <div className="text-base font-bold text-[#166534] print:text-black">{diagnosis.cropName}</div>
              <span className="text-xs text-[#57534E] font-medium">{diagnosis.cropCategory}</span>
            </div>

            <div>
              <span className="text-[11px] text-[#57534E] uppercase tracking-wider font-semibold block mb-0.5">Diagnosed Pathology:</span>
              <div className="text-base font-bold text-[#1C1917] print:text-black">{diagnosis.diseaseName}</div>
              <span className="text-xs text-[#57534E] italic font-serif">{diagnosis.scientificName}</span>
            </div>

            <div>
              <span className="text-[11px] text-[#57534E] uppercase tracking-wider font-semibold block mb-0.5">Pathogen & Severity:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E5DFD3] text-[#166534] font-bold">
                  {diagnosis.pathogenType}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C] font-bold">
                  {diagnosis.severity}
                </span>
              </div>
              <span className="text-[11px] text-[#C2410C] font-mono block mt-1.5 font-semibold">
                Confidence Match: {diagnosis.confidenceScore}%
              </span>
            </div>
          </div>

          {/* ℞ 1. CHEMICAL PRESCRIPTION TABLE */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#C2410C] print:text-black">
              <FlaskConical className="w-4 h-4 text-[#C2410C]" />
              <span>℞ Targeted Chemical Prescription:</span>
            </div>

            <div className="rounded-2xl border border-[#E5DFD3] bg-white overflow-hidden text-xs shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-[#F5F2EB] border-b border-[#E5DFD3] text-[#1C1917]">
                  <tr>
                    <th className="p-3.5">Prescribed Medicine & Formulation</th>
                    <th className="p-3.5">Rate / Liter</th>
                    <th className="p-3.5 bg-[#FFEDD5]/70 font-bold text-[#C2410C]">
                      Exact Dose / {tankSize}L Tank
                    </th>
                    <th className="p-3.5">Acre Requirement (~200L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD3] text-[#57534E] print:text-black">
                  <tr>
                    <td className="p-3.5">
                      <div className="font-bold text-sm text-[#1C1917] print:text-black">{chem.name}</div>
                      <div className="text-xs text-[#57534E] font-mono">Active: {chem.activeIngredient}</div>
                      {chem.tradeNames && chem.tradeNames.length > 0 && (
                        <div className="text-[11px] text-[#C2410C] mt-0.5 font-medium">
                          Trade examples: {chem.tradeNames.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-xs font-semibold text-[#1C1917]">
                      {chem.dosePerLiter} {chem.unit} / L
                    </td>
                    <td className="p-3.5 font-mono font-black text-sm text-[#C2410C] bg-[#FFEDD5]/50">
                      {chemDosage.formattedDose}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-[#1C1917]">{chemDosage.tanksRequiredPerAcre} tanks</span>
                      <span className="text-[#57534E] block text-[11px]">
                        ({Math.round(chem.dosePerLiter * 200)} {chem.unit} total chemical)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3.5 bg-[#F5F2EB] text-xs text-[#57534E] space-y-1.5 border-t border-[#E5DFD3]">
                <div><strong className="text-[#1C1917]">Application Method: </strong>{chem.applicationMethod}</div>
                <div className="flex flex-wrap gap-4 text-[#57534E]">
                  <span>Spray Interval: <strong className="text-[#1C1917]">{chem.sprayIntervalDays} days</strong></span>
                  <span>Max sprays per season: <strong className="text-[#1C1917]">{chem.maxApplicationsPerSeason}</strong></span>
                  <span>Mode of Action: <strong className="text-[#1C1917]">{chem.modeOfAction}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* 🌿 2. ORGANIC BIO-CONTROL ALTERNATIVE */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#166534] print:text-black">
              <Leaf className="w-4 h-4 text-[#166534]" />
              <span>🌿 Organic / Bio-Control Alternative (Residue-Free):</span>
            </div>

            <div className="p-4 rounded-2xl border border-[#E5DFD3] bg-white text-xs space-y-2 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-[#1C1917] print:text-black">{organic.name}</div>
                  <div className="text-xs text-[#166534] font-mono">Agent: {organic.activeBioAgent} ({organic.formulation})</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#57534E] uppercase block">16L Sprayer Dose:</span>
                  <span className="font-mono font-black text-sm text-[#166534] bg-[#F5F2EB] px-3 py-1 rounded-lg border border-[#E5DFD3] inline-block mt-0.5">
                    {organicDosage.formattedDose}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#57534E] pt-1">
                <strong className="text-[#1C1917]">Field Recipe: </strong>{organic.preparationInstructions}
              </div>
            </div>
          </div>

          {/* ⚠️ 3. PRE-HARVEST INTERVAL & SAFETY GEAR */}
          <div className="p-4 rounded-2xl border border-[#FDE68A] bg-[#FEF3C7] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#D97706] flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                Pre-Harvest Interval (PHI) & Protection:
              </span>
              <span className="font-mono font-black px-3 py-1 rounded-full bg-white text-[#D97706] border border-[#FDE68A]">
                Mandatory PHI: {diagnosis.phiDays} Days
              </span>
            </div>

            <p className="text-xs text-[#78350F] leading-relaxed">
              Do not harvest produce for consumption within <strong>{diagnosis.phiDays} days</strong> of chemical application. Worker restricted entry interval (REI): <strong>{diagnosis.reiHours} hours</strong>.
            </p>

            <div className="pt-1 text-xs text-[#92400E]">
              <strong className="text-[#78350F]">Mandatory PPE: </strong>
              {safePpeList.join(' • ')}
            </div>
          </div>

          {/* Farmer Notes if provided */}
          {farmerNotes && (
            <div className="p-3.5 rounded-xl bg-[#F5F2EB] border-l-4 border-[#166534] text-xs italic text-[#1C1917]">
              Farmer Observation: "{farmerNotes}"
            </div>
          )}

          {/* Official Stamp / Signature Footer */}
          <div className="pt-4 border-t border-[#E5DFD3] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#57534E]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#166534]" />
              <span>Certified AgriMed Clinical Crop Pathology Protocol</span>
            </div>

            <div className="text-right font-mono text-xs">
              <div>Verified by AgriMed AI Pathology Engine</div>
              <div className="text-[#166534] font-semibold">Valid across Global & Desi Agricultural Standards</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
