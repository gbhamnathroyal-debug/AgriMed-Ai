import React, { useState } from 'react';
import { calculateTankDosage, evaluatePhiSafety } from '../utils/calculator.ts';
import { 
  Calculator, 
  Layers, 
  ShieldAlert, 
  Info
} from 'lucide-react';

export const TankCalculatorModal: React.FC = () => {
  const [tankSize, setTankSize] = useState<number>(16);
  const [dosePerLiter, setDosePerLiter] = useState<number>(2.5);
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [sprayVolumePerAcre, setSprayVolumePerAcre] = useState<number>(200);
  const [acreage, setAcreage] = useState<number>(1);
  const [phiDays, setPhiDays] = useState<number>(14);
  const [harvestDays, setHarvestDays] = useState<number>(21);

  const dosageResult = calculateTankDosage(dosePerLiter, tankSize, unit, sprayVolumePerAcre);
  const totalSprayWaterLiters = Math.round(sprayVolumePerAcre * acreage);
  const totalTanksNeeded = Math.ceil(totalSprayWaterLiters / tankSize);
  const totalChemicalNeeded = Math.round(dosePerLiter * totalSprayWaterLiters * 100) / 100;

  const phiEvaluation = evaluatePhiSafety(phiDays, harvestDays);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5DFD3] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C]">
              <Calculator className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
              Sprayer Tank & Acreage Calculator
            </h2>
          </div>
          <p className="text-sm text-[#57534E] mt-1">
            Calculate accurate liquid and powder dilutions for 16L knapsack sprayers and total acreage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INPUTS PANEL */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5DFD3] space-y-5 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
          <h3 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#166534]" />
            <span>Sprayer & Chemical Parameters</span>
          </h3>

          {/* Tank Size Presets */}
          <div>
            <label className="text-xs font-semibold text-[#1C1917] block mb-2">
              Sprayer Tank Capacity:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
              {[12, 15, 16, 20].map((liters) => (
                <button
                  key={liters}
                  type="button"
                  onClick={() => setTankSize(liters)}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    tankSize === liters
                      ? 'bg-[#166534] hover:bg-[#14532D] text-white border-[#166534] font-bold shadow-sm'
                      : 'bg-[#F5F2EB] border-[#E5DFD3] text-[#57534E] hover:border-[#166534]/50 hover:text-[#1C1917]'
                  }`}
                >
                  {liters} Liters {liters === 16 ? '★' : ''}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#57534E]">
              <span>Custom Tank Volume:</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={tankSize}
                onChange={(e) => setTankSize(Math.max(1, parseFloat(e.target.value) || 16))}
                className="w-20 px-3 py-1.5 bg-[#F5F2EB] border border-[#E5DFD3] rounded-lg text-[#1C1917] font-mono text-center font-bold focus:outline-none focus:bg-white focus:border-[#166534]"
              />
              <span>Liters</span>
            </div>
          </div>

          {/* Recommended Concentration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-[#1C1917] block mb-1.5">
                Recommended Dose Rate:
              </label>
              <input
                type="number"
                step="0.1"
                min="0.01"
                value={dosePerLiter}
                onChange={(e) => setDosePerLiter(Math.max(0.01, parseFloat(e.target.value) || 1))}
                className="w-full px-3.5 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-sm text-[#1C1917] font-mono font-bold focus:outline-none focus:bg-white focus:border-[#166534]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1C1917] block mb-1.5">
                Formulation Type:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUnit('g')}
                  className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                    unit === 'g'
                      ? 'bg-[#166534] hover:bg-[#14532D] text-white border-[#166534] font-bold shadow-sm'
                      : 'bg-[#F5F2EB] border-[#E5DFD3] text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Grams (g)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('ml')}
                  className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                    unit === 'ml'
                      ? 'bg-[#166534] hover:bg-[#14532D] text-white border-[#166534] font-bold shadow-sm'
                      : 'bg-[#F5F2EB] border-[#E5DFD3] text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Milliliters (ml)
                </button>
              </div>
            </div>
          </div>

          {/* Acreage & Water Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-[#E5DFD3]">
            <div>
              <label className="text-xs font-semibold text-[#1C1917] block mb-1.5">
                Farm Field Size:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="1000"
                  value={acreage}
                  onChange={(e) => setAcreage(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-sm text-[#1C1917] font-mono font-bold focus:outline-none focus:bg-white focus:border-[#166534]"
                />
                <span className="text-xs font-medium text-[#57534E]">Acres</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1C1917] block mb-1.5">
                Water Volume / Acre:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={sprayVolumePerAcre}
                  onChange={(e) => setSprayVolumePerAcre(Math.max(10, parseInt(e.target.value) || 200))}
                  className="w-full px-3.5 py-2 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-sm text-[#1C1917] font-mono font-bold focus:outline-none focus:bg-white focus:border-[#166534]"
                />
                <span className="text-xs font-medium text-[#57534E]">Liters</span>
              </div>
            </div>
          </div>

          {/* PHI Verification */}
          <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] space-y-2.5">
            <span className="text-xs font-bold text-[#D97706] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#D97706]" />
              Pre-Harvest Safety Quick-Check
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-[#78350F] block mb-1 font-medium">Pesticide PHI (Days):</span>
                <input
                  type="number"
                  min="0"
                  value={phiDays}
                  onChange={(e) => setPhiDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-white border border-[#FDE68A] rounded-lg text-[#1C1917] font-mono font-bold focus:outline-none focus:border-[#D97706]"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#78350F] block mb-1 font-medium">Planned Harvest In (Days):</span>
                <input
                  type="number"
                  min="0"
                  value={harvestDays}
                  onChange={(e) => setHarvestDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-white border border-[#FDE68A] rounded-lg text-[#1C1917] font-mono font-bold focus:outline-none focus:border-[#D97706]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* OUTPUTS CARD */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5DFD3] flex flex-col justify-between space-y-5 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DFD3] pb-3">
              <span className="text-xs font-bold text-[#166534] uppercase tracking-wider">
                Precise Mixing Prescription
              </span>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C] font-bold">
                {tankSize}L Tank Solution
              </span>
            </div>

            {/* BIG DOSAGE CALLOUT */}
            <div className="p-5 rounded-2xl bg-[#FFEDD5]/70 border border-[#FED7AA] space-y-1.5">
              <span className="text-xs font-semibold text-[#C2410C] uppercase tracking-wider block">
                Required per {tankSize}L Backpack Tank:
              </span>
              <div className="text-4xl font-black text-[#C2410C] font-mono tabular-nums flex items-baseline gap-2">
                {dosageResult.formattedDose}
                <span className="text-xs font-medium text-[#57534E]">
                  in clean water
                </span>
              </div>
              <p className="text-xs text-[#57534E] pt-1">
                Concentration rate: {dosePerLiter} {unit} per liter of water
              </p>
            </div>

            {/* Farm Acreage Breakdown */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-[#1C1917] block">
                Total Requirement for {acreage} Acre{acreage > 1 ? 's' : ''}:
              </span>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3]">
                  <span className="text-[11px] text-[#57534E] block font-medium">Tanks Needed:</span>
                  <div className="text-2xl font-black text-[#166534] font-mono tabular-nums mt-0.5">
                    {totalTanksNeeded} tanks
                  </div>
                  <span className="text-[10px] text-[#57534E]">at {tankSize}L / tank</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3]">
                  <span className="text-[11px] text-[#57534E] block font-medium">Total Spray Water:</span>
                  <div className="text-2xl font-black text-[#166534] font-mono tabular-nums mt-0.5">
                    {totalSprayWaterLiters} L
                  </div>
                  <span className="text-[10px] text-[#57534E]">solution volume</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#57534E]">Total Chemical Required:</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[#C2410C]">
                    {totalChemicalNeeded >= 1000
                      ? `${(totalChemicalNeeded / 1000).toFixed(2)} ${unit === 'g' ? 'kg' : 'L'}`
                      : `${totalChemicalNeeded} ${unit}`}
                  </span>
                </div>
              </div>
            </div>

            {/* PHI Status Card */}
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              phiEvaluation.riskLevel === 'danger'
                ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
                : 'bg-[#F5F2EB] border-[#E5DFD3] text-[#1C1917]'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span>Pre-Harvest Safety Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                  phiEvaluation.riskLevel === 'danger'
                    ? 'bg-white text-[#D97706] border border-[#FDE68A]'
                    : 'bg-[#166534] text-white'
                }`}>{phiEvaluation.badgeLabel}</span>
              </div>
              <p className="text-xs leading-relaxed text-[#57534E]">
                {phiEvaluation.description}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] flex items-center gap-2.5 text-xs text-[#57534E]">
            <Info className="w-4 h-4 text-[#166534] flex-shrink-0" />
            <span>
              Tip: Calibrate nozzle flow rate before field application to avoid chemical runoff or under-application.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
