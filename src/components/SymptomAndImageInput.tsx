import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckSquare, Square, Loader2, Sparkles, Mic, MicOff, Globe, AlertCircle } from 'lucide-react';
import { getKnownCropSymptoms, getFallbackCropSymptoms } from '../utils/cropSymptoms.ts';
import { LanguageCode, getStoredLanguage } from '../utils/i18n.ts';
import { useVoiceInput, VOICE_LANGUAGE_OPTIONS } from '../utils/voiceInput.ts';

interface SymptomAndImageInputProps {
  cropName: string;
  selectedSymptoms: string[];
  onToggleSymptom: (symptom: string) => void;
  descriptionText: string;
  onChangeDescription: (text: string) => void;
  imagePreview: string | null;
  onSetImage: (base64: string | null) => void;
  language?: LanguageCode;
}

export const SymptomAndImageInput: React.FC<SymptomAndImageInputProps> = ({
  cropName,
  selectedSymptoms,
  onToggleSymptom,
  descriptionText,
  onChangeDescription,
  imagePreview,
  onSetImage,
  language,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [symptomOptions, setSymptomOptions] = useState<string[]>(() => {
    return getKnownCropSymptoms(cropName) || getFallbackCropSymptoms(cropName);
  });
  const [isLoadingSymptoms, setIsLoadingSymptoms] = useState<boolean>(false);
  const [symptomSource, setSymptomSource] = useState<'verified' | 'ai' | 'fallback'>('verified');

  const activeAppLang = language || getStoredLanguage();
  const {
    isListening,
    isTranscribing,
    voiceLang,
    setVoiceLang,
    speechLocale,
    error: voiceError,
    clearError: clearVoiceError,
    toggleListening,
  } = useVoiceInput({
    value: descriptionText,
    onChange: onChangeDescription,
    languageCode: activeAppLang,
  });

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  useEffect(() => {
    const trimmed = (cropName || '').trim();
    if (!trimmed) {
      setSymptomOptions(getFallbackCropSymptoms('Crop'));
      setSymptomSource('fallback');
      setIsLoadingSymptoms(false);
      return;
    }

    // Immediate lookup from verified ICAR/FAO/TNAU botanical dictionary
    const known = getKnownCropSymptoms(trimmed);
    if (known) {
      setSymptomOptions(known);
      setSymptomSource('verified');
      setIsLoadingSymptoms(false);
      return;
    }

    // Unlisted custom crop: query backend Gemini crop-symptom endpoint with abort guard
    const controller = new AbortController();
    setIsLoadingSymptoms(true);
    setSymptomOptions(getFallbackCropSymptoms(trimmed));

    fetch(`/api/crop-symptoms?crop=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load crop symptoms');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.symptoms) && data.symptoms.length > 0) {
          setSymptomOptions(data.symptoms);
          setSymptomSource(data.source === 'gemini' || data.source === 'gemini_ai' ? 'ai' : data.source === 'dictionary' ? 'verified' : 'fallback');
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setSymptomOptions(getFallbackCropSymptoms(trimmed));
          setSymptomSource('fallback');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingSymptoms(false);
        }
      });

    return () => controller.abort();
  }, [cropName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError('Invalid file format. Allowed types: JPEG, PNG, WebP only.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size exceeds 5MB limit. Please upload a smaller image.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onSetImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFileError(null);
    onSetImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-base sm:text-lg font-bold text-[#1C1917] tracking-tight">
          2. What symptoms do you see on <span className="text-[#166534]">{cropName || 'your crop'}</span>?
        </label>
        <div className="flex items-center gap-2 text-xs text-[#57534E]">
          {isLoadingSymptoms ? (
            <span className="inline-flex items-center gap-1.5 text-[#166534] font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading symptoms for {cropName}...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[11px] font-semibold text-[#C2410C]">
              <Sparkles className="w-3 h-3" />
              <span>
                {symptomSource === 'ai'
                  ? `AI Agronomic Symptoms • ${cropName}`
                  : `Crop-Specific Pathology • ${cropName}`}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Crop-Specific Symptom Tag Pills / Checkboxes */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {symptomOptions.map((symptom) => {
            const isChecked = selectedSymptoms.includes(symptom);
            return (
              <button
                key={symptom}
                type="button"
                onClick={() => onToggleSymptom(symptom)}
                className={`flex items-start gap-3 p-3.5 rounded-xl text-left text-xs sm:text-sm transition-all border cursor-pointer ${
                  isChecked
                    ? 'bg-[#166534] border-[#166534] text-white shadow-xs'
                    : 'bg-[#F5F2EB] border-[#E5DFD3] text-[#57534E] hover:border-[#166534]/50 hover:text-[#1C1917] hover:bg-white'
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${isChecked ? 'text-white' : 'text-[#57534E]'}`}>
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-white" />
                  ) : (
                    <Square className="w-4 h-4 text-[#A8A29E]" />
                  )}
                </div>
                <span className="font-medium leading-relaxed">{symptom}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Field Notes & Description Input with Voice Input */}
      <div>
        <label className="text-xs sm:text-sm font-semibold text-[#1C1917] block mb-1.5">
          Describe the problem (optional — type or speak):
        </label>
        <div
          className={`rounded-xl bg-[#F5F2EB] border transition-all overflow-hidden ${
            isListening
              ? 'border-[#DC2626] bg-white ring-1 ring-[#DC2626]'
              : 'border-[#E5DFD3] focus-within:bg-white focus-within:border-[#166534] focus-within:ring-1 focus-within:ring-[#166534]'
          }`}
        >
          <textarea
            rows={3}
            value={descriptionText}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder={`e.g. Describe spots, wilting, insects, or spread pattern observed on your ${cropName || 'crop'}...`}
            className="w-full px-4 pt-3 pb-2 bg-transparent text-xs sm:text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none resize-y"
          />

          {/* Voice Toolbar Inside Symptom Description Box */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-[#E5DFD3]/80 bg-[#F5F2EB]/70">
            <div className="flex items-center gap-2 min-w-0">
              {isListening ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DC2626] animate-pulse whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                  <span>Listening... Tap to stop ({speechLocale})</span>
                </span>
              ) : isTranscribing ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] whitespace-nowrap">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transcribing audio with Gemini...</span>
                </span>
              ) : (
                <span className="text-[11px] text-[#57534E] truncate">
                  Tap mic to record symptoms in any Indian language
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {/* Optional Quick Voice Language Override */}
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#E5DFD3] text-[11px] text-[#1C1917]">
                <Globe className="w-3 h-3 text-[#166534] shrink-0" />
                <select
                  aria-label="Voice input language"
                  disabled={isTranscribing}
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value as LanguageCode)}
                  className="bg-transparent text-[11px] font-semibold text-[#1C1917] focus:outline-none cursor-pointer pr-0.5 disabled:opacity-50"
                >
                  {VOICE_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.nativeLabel} ({opt.speechLocale})
                    </option>
                  ))}
                </select>
              </div>

              {/* Microphone Button */}
              <button
                type="button"
                disabled={isTranscribing}
                onClick={toggleListening}
                aria-label={isListening ? 'Stop voice recording' : 'Start voice input'}
                title={isListening ? 'Tap to stop recording' : `Speak symptoms in ${speechLocale}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                  isListening
                    ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm animate-pulse'
                    : 'bg-white hover:bg-[#FFEDD5] border border-[#E5DFD3] hover:border-[#FED7AA] text-[#57534E] hover:text-[#C2410C]'
                }`}
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transcribing...</span>
                  </>
                ) : isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Listening... Tap to stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {voiceError && (
          <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E]">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={clearVoiceError}
              className="p-0.5 rounded text-[#D97706] hover:text-[#1C1917] cursor-pointer shrink-0"
              aria-label="Dismiss voice input message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Photo Upload Zone */}
      <div>
        <label className="text-xs sm:text-sm font-semibold text-[#1C1917] block mb-1.5">
          Upload plant photo (optional):
        </label>

        {imagePreview ? (
          <div className="relative inline-block border-2 border-[#166534] rounded-xl overflow-hidden shadow-md">
            <img
              src={imagePreview}
              alt="Uploaded crop symptom"
              className="w-48 h-36 object-cover"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[#1C1917]/80 hover:bg-[#C2410C] text-white transition-colors cursor-pointer"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-[#1C1917]/75 px-2 py-0.5 text-[10px] text-white font-medium text-center">
              Photo Attached
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-5 rounded-xl border border-dashed border-[#D6CFC1] hover:border-[#166534] bg-[#F5F2EB] hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E5DFD3] flex items-center justify-center text-[#166534] shadow-2xs">
              <Camera className="w-5 h-5 text-[#166534]" />
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#1C1917]">
              Click to upload a leaf or fruit photo
            </div>
            <span className="text-xs text-[#57534E]">
              Supports JPG, PNG, WebP up to 5MB
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {fileError && (
          <div className="mt-2 p-2.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] text-xs font-semibold">
            {fileError}
          </div>
        )}
      </div>
    </div>
  );
};
