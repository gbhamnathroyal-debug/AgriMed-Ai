import React, { useState, useMemo } from 'react';
import { CropType, DiseaseRule } from '../types/index.ts';
import { CropSelector } from './CropSelector.tsx';
import { SymptomChecklist } from './SymptomChecklist.tsx';
import { DiagnosisResultCard } from './DiagnosisResultCard.tsx';
import { diagnoseCropSymptoms } from '../utils/diagnostics.ts';
import { Stethoscope, AlertCircle, Sparkles } from 'lucide-react';

interface DiagnosticEngineProps {
  diseases: DiseaseRule[];
  onConsultationSaved: () => void;
  onNavigateToChatWithQuery: (query: string, crop: CropType) => void;
}

export const DiagnosticEngine: React.FC<DiagnosticEngineProps> = ({
  diseases,
  onConsultationSaved,
  onNavigateToChatWithQuery,
}) => {
  const [selectedCrop, setSelectedCrop] = useState<CropType>('Tomato');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'Concentric target-board rings on older leaves',
    'Yellow chlorotic halos surrounding brown spots',
  ]);
  const [savingDiseaseId, setSavingDiseaseId] = useState<string | null>(null);
  const [savedDiseaseIds, setSavedDiseaseIds] = useState<Set<string>>(new Set());

  // Filter diseases by current crop
  const cropDiseases = useMemo(() => {
    return diseases.filter(
      (d) => d.crop.toLowerCase() === selectedCrop.toLowerCase()
    );
  }, [diseases, selectedCrop]);

  // Run diagnosis
  const matches = useMemo(() => {
    return diagnoseCropSymptoms(selectedCrop, selectedSymptoms, diseases);
  }, [selectedCrop, selectedSymptoms, diseases]);

  const handleToggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleClearSymptoms = () => {
    setSelectedSymptoms([]);
  };

  const handleCropChange = (crop: CropType) => {
    setSelectedCrop(crop);
    // Suggest default first 2 hallmark symptoms of that crop to give immediate interactive value
    const newCropDiseases = diseases.filter((d) => d.crop.toLowerCase() === crop.toLowerCase());
    if (newCropDiseases.length > 0) {
      setSelectedSymptoms(newCropDiseases[0].symptoms.slice(0, 2));
    } else {
      setSelectedSymptoms([]);
    }
  };

  const handleSaveConsultation = async (
    disease: DiseaseRule,
    confidenceScore: number,
    notes: string,
    tankSize: number
  ) => {
    try {
      setSavingDiseaseId(disease.id);
      const recordPayload = {
        crop: disease.crop,
        symptoms: selectedSymptoms,
        diseaseName: disease.name,
        scientificName: disease.scientificName,
        confidenceScore,
        prescribedChemical: disease.chemicalPrescription.name,
        chemicalDosagePerTank: `${disease.chemicalPrescription.dosePer16LTank} ${disease.chemicalPrescription.unit} per 16L tank`,
        organicAlternative: disease.organicControl.name,
        phiDays: disease.phiDays,
        tankSizeLiters: tankSize,
        notes,
      };

      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordPayload),
      });

      if (!res.ok) {
        throw new Error('Failed to save to database');
      }

      setSavedDiseaseIds((prev) => new Set([...prev, disease.id]));
      onConsultationSaved();
    } catch (err) {
      console.error('Error saving consultation:', err);
    } finally {
      setSavingDiseaseId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d1813] via-[#10221a] to-[#0c1813] border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <Stethoscope className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Expert Crop Pathology Diagnostic Engine
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-emerald-300/80 mt-1 max-w-2xl leading-relaxed">
            Select your crop and observed field symptoms to identify pathogens, calculate exact chemical doses per 16L spray tank, obtain organic alternatives, and verify Pre-Harvest Interval (PHI) safety.
          </p>
        </div>

        {/* Quick presets chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Common Presets:
          </span>
          {cropDiseases.slice(0, 3).map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedSymptoms(d.symptoms.slice(0, 2))}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-700/40 text-emerald-200 hover:border-emerald-400 hover:text-white transition-all font-medium"
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Crop Selection */}
      <div className="p-5 rounded-2xl bg-[#0d1411]/90 border border-emerald-900/30">
        <CropSelector
          selectedCrop={selectedCrop}
          onSelectCrop={handleCropChange}
        />
      </div>

      {/* Step 2: Symptom Selection */}
      <div className="p-5 rounded-2xl bg-[#0d1411]/90 border border-emerald-900/30">
        <SymptomChecklist
          cropDiseases={cropDiseases}
          selectedSymptoms={selectedSymptoms}
          onToggleSymptom={handleToggleSymptom}
          onClearSymptoms={handleClearSymptoms}
        />
      </div>

      {/* Step 3: Diagnostic Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-emerald-200 tracking-wide flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
              3
            </span>
            Diagnostic Prescriptions & Safety Findings
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} found
          </span>
        </div>

        {selectedSymptoms.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-emerald-900/30 bg-[#0d1411]/50 space-y-2">
            <AlertCircle className="w-8 h-8 text-emerald-500/60 mx-auto" />
            <h4 className="font-semibold text-sm text-slate-200">
              No Symptoms Selected
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Please select one or more observed symptoms above (e.g. leaf spots, wilting, curling) to run the diagnostic engine.
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-emerald-900/30 bg-[#0d1411]/50 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500/60 mx-auto" />
            <h4 className="font-semibold text-sm text-slate-200">
              No Direct Pathology Match in Database
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The selected symptoms did not trigger a known rule for {selectedCrop}. You can consult the AI Agronomist for open-ended symptoms or nutrient deficiency analysis.
            </p>
            <button
              onClick={() =>
                onNavigateToChatWithQuery(
                  `My ${selectedCrop} shows these symptoms: ${selectedSymptoms.join(', ')}. What could be causing this?`,
                  selectedCrop
                )
              }
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
            >
              <span>Ask AI Agronomist</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, idx) => (
              <DiagnosisResultCard
                key={match.disease.id}
                match={match}
                rank={idx}
                onSaveConsultation={(notes, tankSize) =>
                  handleSaveConsultation(match.disease, match.confidenceScore, notes, tankSize)
                }
                onAskAiAboutDisease={(diseaseName, cropName) =>
                  onNavigateToChatWithQuery(
                    `Tell me about managing ${diseaseName} in ${cropName}. What is the best integrated pest management (IPM) strategy and spray timing?`,
                    cropName as CropType
                  )
                }
                isSaving={savingDiseaseId === match.disease.id}
                hasSaved={savedDiseaseIds.has(match.disease.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
