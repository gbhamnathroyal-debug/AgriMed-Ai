import React, { useState, useEffect } from 'react';
import { UniversalCropSelector } from './UniversalCropSelector.tsx';
import { SymptomAndImageInput } from './SymptomAndImageInput.tsx';
import { UniversalDiagnosticResult } from './UniversalDiagnosticResult.tsx';
import { UniversalDiagnosisResult, CropCategory } from '../types/index.ts';
import { Stethoscope, Sparkles, AlertCircle, ArrowRight, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { LanguageCode, getLanguageOption, getStoredLanguage } from '../utils/i18n.ts';

interface UniversalDiagnosticEngineProps {
  onConsultationSaved: () => void;
  onNavigateToChatWithQuery: (query: string, crop: string) => void;
  initialCrop?: string;
  initialSymptoms?: string[];
  language?: LanguageCode;
}

interface DiagnosisOverride {
  cropName?: string;
  cropCategory?: CropCategory;
  symptoms?: string[];
  problemDescription?: string;
  imageBase64?: string | null;
}

export const UniversalDiagnosticEngine: React.FC<UniversalDiagnosticEngineProps> = ({
  onConsultationSaved,
  onNavigateToChatWithQuery,
  initialCrop,
  initialSymptoms,
  language,
}) => {
  const { authFetch, isAuthenticated, isAuthReady, openAuthModal } = useAuth();
  const activeLang = language || getStoredLanguage();
  const activeLangOption = getLanguageOption(activeLang);
  const [selectedCrop, setSelectedCrop] = useState<string>(initialCrop || 'Wheat');
  const [selectedCategory, setSelectedCategory] = useState<CropCategory>('Grains & Cereals');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(() =>
    Array.isArray(initialSymptoms) && initialSymptoms.length > 0
      ? initialSymptoms
      : [
          'Orange or reddish-brown pustules on leaves and stems (Rust)',
          'Yellowish stripe lesions running parallel along leaf veins (Yellow Rust)',
        ]
  );
  const [descriptionText, setDescriptionText] = useState<string>(
    'Linear yellow-orange pustules appearing on flag leaves after morning mist and cool days. Spreading across the field.'
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [diagnosisResult, setDiagnosisResult] = useState<UniversalDiagnosisResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialCrop && initialCrop.trim()) {
      const normalizedNext = initialCrop.trim();
      if (normalizedNext.toLowerCase() !== selectedCrop.toLowerCase()) {
        setSelectedCrop(normalizedNext);
        setSelectedSymptoms(Array.isArray(initialSymptoms) && initialSymptoms.length > 0 ? initialSymptoms : []);
        setDescriptionText('');
      } else if (Array.isArray(initialSymptoms) && initialSymptoms.length > 0) {
        setSelectedSymptoms(initialSymptoms);
      }
    }
  }, [initialCrop, initialSymptoms]);

  const handleToggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSelectCrop = (cropName: string, category: CropCategory) => {
    if (cropName.trim().toLowerCase() !== selectedCrop.trim().toLowerCase()) {
      setSelectedSymptoms([]);
      setDescriptionText('');
    }
    setSelectedCrop(cropName);
    setSelectedCategory(category);
    setHasSaved(false);
  };

  const runDiagnosis = async (override?: DiagnosisOverride) => {
    const targetCrop = (override?.cropName ?? selectedCrop).trim();
    if (!targetCrop) return;

    if (!isAuthenticated) {
      openAuthModal('Sign in with your Google account to run intelligent crop disease diagnosis.');
      return;
    }

    const targetCategory = override?.cropCategory ?? selectedCategory;
    const targetSymptoms = override?.symptoms ?? selectedSymptoms;
    const targetDescription = override?.problemDescription ?? descriptionText;
    const targetImage = override?.imageBase64 !== undefined ? override.imageBase64 : imagePreview;

    setIsDiagnosing(true);
    setErrorMessage(null);
    setHasSaved(false);

    try {
      const res = await authFetch('/api/diagnose-universal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: targetCrop,
          cropCategory: targetCategory,
          symptoms: targetSymptoms,
          problemDescription: targetDescription,
          imageBase64: targetImage || undefined,
          language: activeLang,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || 'Diagnostic service failed');
      }

      const data: UniversalDiagnosisResult = await res.json();
      setDiagnosisResult(data);
    } catch (err: any) {
      console.error('Diagnosis error:', err);
      setErrorMessage(err?.message || 'Could not complete diagnosis. Please try again.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      runDiagnosis();
    }
  }, [isAuthReady, isAuthenticated]);

  const handleSaveToDb = async (notes: string, tankSize: number) => {
    if (!diagnosisResult || hasSaved) return;

    setIsSaving(true);
    try {
      const payload = {
        crop: diagnosisResult.cropName,
        cropCategory: diagnosisResult.cropCategory,
        symptoms: selectedSymptoms,
        diseaseName: diagnosisResult.diseaseName,
        scientificName: diagnosisResult.scientificName,
        pathogenType: diagnosisResult.pathogenType,
        confidenceScore: diagnosisResult.confidenceScore,
        confidenceLevel: diagnosisResult.confidenceLevel,
        uncertaintyReason: diagnosisResult.uncertaintyReason,
        alternativeDiagnoses: diagnosisResult.alternativeDiagnoses,
        recommendedNextSteps: diagnosisResult.recommendedNextSteps,
        whenToConsultExpert: diagnosisResult.whenToConsultExpert,
        prescribedChemical: diagnosisResult.chemicalPrescription.name,
        chemicalDosagePerTank: `${diagnosisResult.chemicalPrescription.dosePer16LTank} ${diagnosisResult.chemicalPrescription.unit} per 16L tank`,
        organicAlternative: diagnosisResult.organicControl.name,
        phiDays: diagnosisResult.phiDays,
        verifiedTreatmentId: diagnosisResult.verifiedTreatmentId,
        sourceReference: diagnosisResult.sourceReference,
        tankSizeLiters: tankSize,
        notes,
      };

      const res = await authFetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save to database');
      }

      setHasSaved(true);
      onConsultationSaved();
    } catch (err) {
      console.error('Error saving consultation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tool Header & Quick Presets */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E5DFD3] shadow-[0_4px_16px_rgba(28,25,23,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]">
              <Stethoscope className="w-5 h-5 text-[#C2410C]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
              Crop Disease & Medicine Advisor
            </h1>
            {activeLang !== 'en' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[11px] font-bold text-[#D97706] whitespace-nowrap">
                <Globe className="w-3 h-3" />
                {activeLangOption.nativeLabel}
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-[#57534E] mt-2 max-w-2xl leading-relaxed">
            Enter any crop and describe what you see on the plant to get instant treatment and spray dosages.
          </p>
        </div>

        {/* Quick Example Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#57534E] mr-1">Quick examples:</span>
          <button
            type="button"
            onClick={() => {
              const nextSymptoms = [
                'Orange or reddish-brown pustules on leaves and stems (Rust)',
                'Yellowish stripe lesions running parallel along leaf veins (Yellow Rust)',
              ];
              const nextDesc = 'Yellow-orange stripe rust on wheat flag leaves.';
              setSelectedCrop('Wheat');
              setSelectedCategory('Grains & Cereals');
              setSelectedSymptoms(nextSymptoms);
              setDescriptionText(nextDesc);
              runDiagnosis({
                cropName: 'Wheat',
                cropCategory: 'Grains & Cereals',
                symptoms: nextSymptoms,
                problemDescription: nextDesc,
              });
            }}
            className="text-xs px-3 py-1.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] text-[#1C1917] hover:border-[#166534] hover:bg-[#166534] hover:text-white font-medium cursor-pointer shadow-2xs transition-colors"
          >
            🌾 Wheat Rust
          </button>
          <button
            type="button"
            onClick={() => {
              const nextSymptoms = [
                'Dark brown concentric target-board rings on older leaves (Early Blight)',
                'Water-soaked dark greasy patches on leaves and stems (Late Blight)',
              ];
              const nextDesc = 'Target-board dark concentric rings on tomato foliage.';
              setSelectedCrop('Tomato');
              setSelectedCategory('Vegetables');
              setSelectedSymptoms(nextSymptoms);
              setDescriptionText(nextDesc);
              runDiagnosis({
                cropName: 'Tomato',
                cropCategory: 'Vegetables',
                symptoms: nextSymptoms,
                problemDescription: nextDesc,
              });
            }}
            className="text-xs px-3 py-1.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] text-[#1C1917] hover:border-[#166534] hover:bg-[#166534] hover:text-white font-medium cursor-pointer shadow-2xs transition-colors"
          >
            🍅 Tomato Blight
          </button>
          <button
            type="button"
            onClick={() => {
              const nextSymptoms = [
                'Orange-yellow powdery rust spots on undersides of leaves (Coffee Leaf Rust / Roya)',
              ];
              const nextDesc = 'Orange powdery rust pustules under coffee leaves causing defoliation.';
              setSelectedCrop('Coffee');
              setSelectedCategory('Spices & Plantation');
              setSelectedSymptoms(nextSymptoms);
              setDescriptionText(nextDesc);
              runDiagnosis({
                cropName: 'Coffee',
                cropCategory: 'Spices & Plantation',
                symptoms: nextSymptoms,
                problemDescription: nextDesc,
              });
            }}
            className="text-xs px-3 py-1.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] text-[#1C1917] hover:border-[#166534] hover:bg-[#166534] hover:text-white font-medium cursor-pointer shadow-2xs transition-colors"
          >
            ☕ Coffee Rust
          </button>
        </div>
      </div>

      {/* Step 1: Which crop are you growing? */}
      <div id="step-1-crop-section" className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E5DFD3] shadow-[0_4px_16px_rgba(28,25,23,0.05)] scroll-mt-6">
        <UniversalCropSelector
          selectedCrop={selectedCrop}
          selectedCategory={selectedCategory}
          onSelectCrop={handleSelectCrop}
        />
      </div>

      {/* Step 2: What symptoms do you see? */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E5DFD3] shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
        <SymptomAndImageInput
          cropName={selectedCrop}
          selectedSymptoms={selectedSymptoms}
          onToggleSymptom={handleToggleSymptom}
          descriptionText={descriptionText}
          onChangeDescription={setDescriptionText}
          imagePreview={imagePreview}
          onSetImage={setImagePreview}
          language={activeLang}
        />

        {/* Diagnosis Trigger Button */}
        <div className="mt-6 pt-5 border-t border-[#E5DFD3] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs sm:text-sm text-[#57534E]">
            Selected: <strong className="text-[#1C1917] font-bold">{selectedCrop}</strong> ({selectedCategory}) • {selectedSymptoms.length} symptoms selected
          </span>

          <button
            type="button"
            onClick={() => runDiagnosis()}
            disabled={isDiagnosing}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-extrabold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isDiagnosing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Diagnosing {selectedCrop}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white fill-white" />
                <span>Get Treatment & Spray Dosages</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step 3: Diagnostic Results */}
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => runDiagnosis()}
              className="px-3 py-1 rounded-lg bg-white border border-[#FDE68A] text-[#D97706] font-bold hover:bg-[#F5F2EB] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {diagnosisResult && (
          <UniversalDiagnosticResult
            diagnosis={diagnosisResult}
            onSaveConsultation={handleSaveToDb}
            onAskAi={onNavigateToChatWithQuery}
            isSaving={isSaving}
            hasSaved={hasSaved}
          />
        )}
      </div>
    </div>
  );
};
