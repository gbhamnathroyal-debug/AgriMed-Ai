import { useState, useRef, useEffect, useCallback } from 'react';
import {
  LanguageCode,
  LANGUAGE_OPTIONS,
  normalizeLanguageCode,
} from './i18n.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const SPEECH_LOCALE_MAP: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
  gu: 'gu-IN',
  ml: 'ml-IN',
};

export interface VoiceLanguageOption {
  code: LanguageCode;
  speechLocale: string;
  nativeLabel: string;
  englishName: string;
}

export const VOICE_LANGUAGE_OPTIONS: VoiceLanguageOption[] = LANGUAGE_OPTIONS.map((opt) => ({
  code: opt.code,
  speechLocale: SPEECH_LOCALE_MAP[opt.code] || 'en-IN',
  nativeLabel: opt.nativeLabel,
  englishName: opt.englishName,
}));

export const MIC_IFRAME_BLOCKED_MESSAGE =
  "Mic blocked by preview iframe—click 'Open in New Tab' or deploy to Cloud Run to use voice.";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_RECORDING_MS = 90_000;

export function getSpeechLocale(lang?: string | null): string {
  const code = normalizeLanguageCode(lang);
  return SPEECH_LOCALE_MAP[code] || 'en-IN';
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

function selectBestAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return 'audio/webm';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const mime of candidates) {
    try {
      if (typeof window.MediaRecorder.isTypeSupported === 'function' && window.MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    } catch {
      // Ignore probe error
    }
  }
  return '';
}

function getFileExtensionForMime(mimeType: string): string {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('mp4') || lower.includes('m4a')) return 'mp4';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
  return 'webm';
}

function combineBaseAndTranscript(base: string, spoken: string): string {
  const cleanSpoken = spoken.replace(/\s+/g, ' ').trim();
  if (!cleanSpoken) return base;
  if (!base) return cleanSpoken;
  const needsSpace = !/\s$/.test(base);
  return `${base}${needsSpace ? ' ' : ''}${cleanSpoken}`;
}

export interface UseVoiceInputOptions {
  value: string;
  onChange: (nextValue: string) => void;
  languageCode?: LanguageCode;
}

export interface UseVoiceInputResult {
  isListening: boolean;
  isTranscribing: boolean;
  isSupported: boolean;
  voiceLang: LanguageCode;
  setVoiceLang: (lang: LanguageCode) => void;
  speechLocale: string;
  error: string | null;
  clearError: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceInput({
  value,
  onChange,
  languageCode = 'en',
}: UseVoiceInputOptions): UseVoiceInputResult {
  const { authFetch, isAuthenticated, openAuthModal } = useAuth();
  const [voiceLang, setVoiceLangState] = useState<LanguageCode>(() =>
    normalizeLanguageCode(languageCode)
  );
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState<boolean>(() => isMediaRecorderSupported());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxDurationTimerRef = useRef<number | null>(null);
  const skipTranscribeOnStopRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const latestValueRef = useRef<string>(value);
  const onChangeRef = useRef(onChange);
  const voiceLangRef = useRef<LanguageCode>(voiceLang);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    voiceLangRef.current = voiceLang;
  }, [voiceLang]);

  // Sync voice language automatically when app-level language changes
  useEffect(() => {
    setVoiceLangState(normalizeLanguageCode(languageCode));
  }, [languageCode]);

  const clearMaxTimer = useCallback(() => {
    if (maxDurationTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore track stop errors
      }
      streamRef.current = null;
    }
  }, []);

  const transcribeRecordedBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!isMountedRef.current) return;

      if (!blob || blob.size === 0) {
        setError('No audio captured. Tap the microphone, speak clearly, then tap again to stop.');
        return;
      }

      if (blob.size > MAX_AUDIO_BYTES) {
        setError('Recording exceeds the 5 MB audio limit. Please record a shorter clip.');
        return;
      }

      setIsTranscribing(true);
      setError(null);

      try {
        const effectiveMime = (mimeType || blob.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';
        const ext = getFileExtensionForMime(effectiveMime);
        const audioFile = new File([blob], `voice_input.${ext}`, { type: effectiveMime });

        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('language', voiceLangRef.current);

        const res = await authFetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!isMountedRef.current) return;

        if (!res.ok) {
          setError(data?.error || 'Audio transcription failed. Please try again or type your message.');
          return;
        }

        const transcript = typeof data?.transcript === 'string' ? data.transcript.trim() : '';
        if (!transcript) {
          setError('No speech detected in the recording. Please try speaking closer to the mic.');
          return;
        }

        const nextText = combineBaseAndTranscript(latestValueRef.current, transcript);
        onChangeRef.current(nextText);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(err?.message || 'Network error while transcribing audio. Please try again.');
      } finally {
        if (isMountedRef.current) {
          setIsTranscribing(false);
        }
      }
    },
    [authFetch]
  );

  const stopListening = useCallback(() => {
    clearMaxTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        releaseStream();
        setIsListening(false);
      }
    } else {
      releaseStream();
      setIsListening(false);
    }
  }, [clearMaxTimer, releaseStream]);

  const startListening = useCallback(async () => {
    if (isTranscribing) return;
    setError(null);

    if (!isAuthenticated) {
      openAuthModal('Sign in to use multi-language voice input.');
      return;
    }

    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder === 'undefined'
    ) {
      setError(MIC_IFRAME_BLOCKED_MESSAGE);
      setIsListening(false);
      return;
    }

    skipTranscribeOnStopRef.current = false;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const preferredMime = selectBestAudioMimeType();
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      const activeMime = recorder.mimeType || preferredMime || 'audio/webm';

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearMaxTimer();
        releaseStream();
        mediaRecorderRef.current = null;
        if (isMountedRef.current) {
          setIsListening(false);
          setError('Audio recording error occurred. Please check microphone permissions or type.');
        }
      };

      recorder.onstop = () => {
        clearMaxTimer();
        releaseStream();
        mediaRecorderRef.current = null;
        if (isMountedRef.current) {
          setIsListening(false);
        }
        const shouldSkip = skipTranscribeOnStopRef.current;
        const recordedChunks = chunksRef.current;
        chunksRef.current = [];

        if (!shouldSkip && recordedChunks.length > 0 && isMountedRef.current) {
          const blob = new Blob(recordedChunks, { type: activeMime });
          void transcribeRecordedBlob(blob, activeMime);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsListening(true);

      // Auto-stop safely before reaching 5 MB limit on long recordings
      clearMaxTimer();
      maxDurationTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current === recorder && recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // Ignore auto-stop error
          }
        }
      }, MAX_RECORDING_MS);
    } catch (err: any) {
      clearMaxTimer();
      releaseStream();
      mediaRecorderRef.current = null;
      if (isMountedRef.current) {
        setIsListening(false);
        const errName = String(err?.name || '');
        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errName === 'SecurityError'
        ) {
          setError(MIC_IFRAME_BLOCKED_MESSAGE);
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setError('No microphone detected—please connect a microphone or type your message.');
        } else {
          setError(MIC_IFRAME_BLOCKED_MESSAGE);
        }
      }
    }
  }, [
    clearMaxTimer,
    isAuthenticated,
    isTranscribing,
    openAuthModal,
    releaseStream,
    transcribeRecordedBlob,
  ]);

  const toggleListening = useCallback(() => {
    if (isTranscribing) return;
    if (isListening) {
      stopListening();
    } else {
      void startListening();
    }
  }, [isListening, isTranscribing, startListening, stopListening]);

  const setVoiceLang = useCallback(
    (nextLang: LanguageCode) => {
      const normalized = normalizeLanguageCode(nextLang);
      setVoiceLangState(normalized);
      if (isListening) {
        skipTranscribeOnStopRef.current = true;
        stopListening();
      }
    },
    [isListening, stopListening]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      skipTranscribeOnStopRef.current = true;
      clearMaxTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore unmount stop errors
        }
      }
      mediaRecorderRef.current = null;
      releaseStream();
    };
  }, [clearMaxTimer, releaseStream]);

  return {
    isListening,
    isTranscribing,
    isSupported,
    voiceLang,
    setVoiceLang,
    speechLocale: getSpeechLocale(voiceLang),
    error,
    clearError,
    startListening,
    stopListening,
    toggleListening,
  };
}
