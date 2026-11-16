import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatAttachment } from '../types/index.ts';
import { 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Copy, 
  Check, 
  Lightbulb,
  Globe,
  Paperclip,
  X,
  FileText,
  AlertCircle,
  Mic,
  MicOff,
  Loader2
} from 'lucide-react';
import { LanguageCode, getLanguageOption, getStoredLanguage } from '../utils/i18n.ts';
import { useVoiceInput, VOICE_LANGUAGE_OPTIONS } from '../utils/voiceInput.ts';

const MAX_CHAT_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CHAT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
];

function resolveChatFileMimeType(file: File): string {
  if (file.type && ALLOWED_CHAT_MIME_TYPES.includes(file.type)) {
    return file.type;
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain';
  return file.type || '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface AgronomistChatProps {
  initialPrompt?: string;
  initialCrop?: string;
  onClearInitialPrompt?: () => void;
  language?: LanguageCode;
}

const SAMPLE_PROMPTS = [
  {
    title: 'Wheat Rust Management',
    prompt: 'What is the most effective fungicide spray protocol and 16L tank dose for Yellow / Stripe Rust in Wheat during the flag leaf stage?',
    crop: 'Wheat',
  },
  {
    title: 'Tomato Blossom End Rot',
    prompt: 'How do I differentiate between blossom end rot (calcium deficiency) and early fruit rot in Tomato? What foliar spray corrects it?',
    crop: 'Tomato',
  },
  {
    title: 'Coffee Leaf Rust IPM',
    prompt: 'What is the IPM schedule for Coffee Leaf Rust (Hemileia vastatrix) balancing Hexaconazole sprays with bio-control?',
    crop: 'Coffee',
  },
  {
    title: 'Soil pH 7.8 Micronutrients',
    prompt: 'My soil test shows pH 7.8 with low zinc and iron availability. How should I adjust fertilizer choices and foliar micronutrient sprays?',
    crop: 'General',
  },
  {
    title: 'Mango Anthracnose & Bloom',
    prompt: 'How to control blossom blight and anthracnose tear-stain on developing Mango panicles without killing pollinating insects?',
    crop: 'Mango',
  },
  {
    title: 'Trichoderma Bio-Slurry',
    prompt: 'What is the step-by-step recipe to enrich Farm Yard Manure (FYM) with Trichoderma harzianum for soil application?',
    crop: 'General',
  },
];

import { useAuth } from '../context/AuthContext.tsx';

export const AgronomistChat: React.FC<AgronomistChatProps> = ({
  initialPrompt,
  initialCrop,
  onClearInitialPrompt,
  language,
}) => {
  const { authFetch, isAuthenticated, openAuthModal } = useAuth();
  const activeLang = language || getStoredLanguage();
  const activeLangOption = getLanguageOption(activeLang);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am **AgriMed AI's Universal Master Agronomist**, powered by Google Gemini. 

I provide clinical field advice for **ANY crop in the world**:
- **Cereals & Grains:** Wheat, Rice, Corn/Maize, Barley, Millets, Sorghum...
- **Vegetables:** Tomato, Potato, Chilli, Onion, Garlic, Brinjal, Cabbage, Okra...
- **Fruits & Plantation:** Mango, Banana, Apple, Citrus, Grape, Coffee, Tea, Rubber...
- **Cash Crops & Pulses:** Cotton, Sugarcane, Soybean, Chickpea, Groundnut...

Ask me any question about:
- Precision chemical prescriptions with exact doses per standard 16L spray tank
- Residue-free organic bio-controls (*Trichoderma*, *Pseudomonas*, Neem Oil, Bacillus)
- Soil pH balancing, NPK fertilizer fertigation, and micronutrient corrections
- Pre-Harvest Intervals (PHI) and Integrated Pest Management (IPM)

Select or type any crop context below, or ask your open-ended farming question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedCropContext, setSelectedCropContext] = useState<string>(initialCrop || 'General');
  const [isCustomCropInput, setIsCustomCropInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    meta: ChatAttachment;
  } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    isTranscribing,
    voiceLang,
    setVoiceLang,
    speechLocale,
    error: voiceError,
    clearError: clearVoiceError,
    stopListening,
    toggleListening,
  } = useVoiceInput({
    value: inputMessage,
    onChange: setInputMessage,
    languageCode: activeLang,
  });

  useEffect(() => {
    if (initialPrompt) {
      if (initialCrop) {
        setSelectedCropContext(initialCrop);
      }
      sendMessage(initialPrompt, initialCrop);
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
    }
  }, [initialPrompt, initialCrop]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const resolvedMime = resolveChatFileMimeType(file);
    if (!ALLOWED_CHAT_MIME_TYPES.includes(resolvedMime)) {
      setAttachmentError('Unsupported file format. Allowed: JPEG, PNG, WebP images, PDF lab reports, or TXT files.');
      return;
    }

    if (file.size > MAX_CHAT_FILE_BYTES) {
      setAttachmentError(`File "${file.name}" is ${formatFileSize(file.size)}. Maximum allowed size is 5 MB.`);
      return;
    }

    const normalizedFile =
      file.type === resolvedMime
        ? file
        : new File([file], file.name, { type: resolvedMime });

    if (resolvedMime.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingAttachment({
          file: normalizedFile,
          meta: {
            name: normalizedFile.name,
            mimeType: resolvedMime,
            size: normalizedFile.size,
            previewUrl: typeof reader.result === 'string' ? reader.result : undefined,
          },
        });
      };
      reader.readAsDataURL(normalizedFile);
    } else {
      setPendingAttachment({
        file: normalizedFile,
        meta: {
          name: normalizedFile.name,
          mimeType: resolvedMime,
          size: normalizedFile.size,
        },
      });
    }
  };

  const removePendingAttachment = () => {
    setPendingAttachment(null);
    setAttachmentError(null);
  };

  const sendMessage = async (textToSend: string, cropOverride?: string) => {
    const trimmedText = textToSend.trim();
    const attachmentToSend = pendingAttachment;
    if ((!trimmedText && !attachmentToSend) || isLoading) return;

    if (!isAuthenticated) {
      openAuthModal('Sign in with your Google account to chat with the AI Agronomist.');
      return;
    }

    const currentCrop = cropOverride || selectedCropContext;
    const displayMessage =
      trimmedText ||
      (attachmentToSend?.meta.mimeType.startsWith('image/')
        ? 'Please inspect this crop/leaf/pest photo and provide agronomic advice.'
        : `Please analyze this soil/lab report (${attachmentToSend?.meta.name}) and advise.`);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: displayMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cropContext: currentCrop,
      attachment: attachmentToSend?.meta,
    };

    if (isListening) {
      stopListening();
    }

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setPendingAttachment(null);
    setAttachmentError(null);
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      let res: Response;
      if (attachmentToSend) {
        const formData = new FormData();
        formData.append('message', displayMessage);
        formData.append('history', JSON.stringify(historyPayload));
        formData.append('cropContext', currentCrop);
        formData.append('language', activeLang);
        formData.append('file', attachmentToSend.file);

        res = await authFetch('/api/chat', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await authFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: displayMessage,
            history: historyPayload,
            cropContext: currentCrop,
            language: activeLang,
          }),
        });
      }

      const data = await res.json().catch(() => ({}));
      const replyText = res.ok
        ? data?.reply || data?.error || 'No response generated from agronomist.'
        : data?.error || `Agronomist service returned status ${res.status}. Please try again.`;

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `**Network or Server Error:** ${err.message || 'Could not connect to agronomist service.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const copyToClipboard = async (id: string, text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        // Ignore clipboard denial in restricted iframes
      }
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Chat history cleared. What crop, soil problem, or pest question can I assist with today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-[#166534] font-bold text-sm mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-[#1C1917] font-extrabold text-base mt-3 mb-1.5 pb-0.5 border-b border-[#E5DFD3]">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemContent = line.replace(/^[-*]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-[#57534E] leading-relaxed text-xs sm:text-sm">
            {renderInlineMarkdown(itemContent)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="leading-relaxed text-[#57534E] text-xs sm:text-sm">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-[#1C1917] font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] rounded-2xl bg-white border border-[#E5DFD3] shadow-[0_4px_16px_rgba(28,25,23,0.05)] overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 sm:p-5 bg-[#F5F2EB] border-b border-[#E5DFD3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center text-white shadow-xs font-extrabold">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-[#1C1917]">
                AI Agronomist Chat
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFEDD5] text-[#C2410C]">
                Field Advisor
              </span>
              {activeLang !== 'en' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] whitespace-nowrap">
                  <Globe className="w-3 h-3" />
                  {activeLangOption.nativeLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-[#57534E]">
              Ask any question about crop health, soil, fertilizers, and pest management
            </p>
          </div>
        </div>

        {/* Universal Crop Context Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#57534E]">Crop Context:</span>
            {isCustomCropInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={selectedCropContext}
                  onChange={(e) => setSelectedCropContext(e.target.value)}
                  placeholder="Type any crop..."
                  className="bg-white border border-[#E5DFD3] rounded-lg px-2.5 py-1 text-xs text-[#1C1917] w-28 focus:outline-none focus:border-[#166534]"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCropInput(false)}
                  className="text-xs text-[#57534E] hover:text-[#166534] cursor-pointer"
                >
                  List
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <select
                  value={selectedCropContext}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCropInput(true);
                      setSelectedCropContext('');
                    } else {
                      setSelectedCropContext(e.target.value);
                    }
                  }}
                  className="bg-white border border-[#E5DFD3] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#166534]"
                >
                  <option value="General">🌱 General Agronomy</option>
                  <option value="Wheat">🌾 Wheat</option>
                  <option value="Rice">🍚 Rice (Paddy)</option>
                  <option value="Maize">🌽 Corn / Maize</option>
                  <option value="Tomato">🍅 Tomato</option>
                  <option value="Potato">🥔 Potato</option>
                  <option value="Chilli">🌶️ Chilli</option>
                  <option value="Onion">🧅 Onion</option>
                  <option value="Cotton">☁️ Cotton</option>
                  <option value="Soybean">🌱 Soybean</option>
                  <option value="Mango">🥭 Mango</option>
                  <option value="Banana">🍌 Banana</option>
                  <option value="Apple">🍎 Apple</option>
                  <option value="Coffee">☕ Coffee</option>
                  <option value="Tea">🍵 Tea</option>
                  <option value="__custom__">✏️ Type Other Crop...</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg border border-[#E5DFD3] bg-white text-[#57534E] hover:text-[#C2410C] hover:bg-[#FFEDD5] transition-colors cursor-pointer"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2.5 bg-white border-b border-[#E5DFD3] overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-xs text-[#C2410C] font-semibold flex items-center gap-1 flex-shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-[#D97706]" />
          Quick Questions:
        </span>
        {SAMPLE_PROMPTS.map((sample, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedCropContext(sample.crop);
              sendMessage(sample.prompt, sample.crop);
            }}
            className="flex-shrink-0 px-3 py-1 rounded-lg bg-[#F5F2EB] hover:bg-[#166534] border border-[#E5DFD3] hover:border-[#166534] text-xs text-[#57534E] hover:text-white transition-all cursor-pointer shadow-2xs"
          >
            {sample.title}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#F5F2EB]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'bg-white border border-[#E5DFD3] text-[#166534]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`relative group max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed border ${
                  isUser
                    ? 'bg-[#FFEDD5]/60 border-[#FED7AA] text-[#1C1917] rounded-tr-none'
                    : 'bg-white border-[#E5DFD3] text-[#57534E] rounded-tl-none shadow-[0_4px_16px_rgba(28,25,23,0.05)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] text-[#57534E] mb-1.5 border-b border-[#E5DFD3] pb-1">
                  <span className="font-semibold text-[#1C1917]">
                    {isUser ? 'You' : 'AgriMed AI Agronomist'}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.cropContext && isUser && (
                      <span className="px-2 py-0.5 rounded-full bg-[#166534] text-white font-medium">
                        {msg.cropContext}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {msg.attachment && (
                  <div className="mb-2.5">
                    {msg.attachment.mimeType.startsWith('image/') && msg.attachment.previewUrl ? (
                      <div className="rounded-xl overflow-hidden border border-[#E5DFD3] bg-white">
                        <img
                          src={msg.attachment.previewUrl}
                          alt={msg.attachment.name}
                          className="max-h-52 w-full object-cover"
                        />
                        <div className="px-2.5 py-1 bg-[#F5F2EB] text-[11px] text-[#57534E] flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-[#1C1917]">{msg.attachment.name}</span>
                          <span className="text-[#57534E] shrink-0">{formatFileSize(msg.attachment.size)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E5DFD3] text-xs text-[#1C1917] max-w-full">
                        <FileText className="w-4 h-4 text-[#C2410C] shrink-0" />
                        <span className="truncate font-semibold">{msg.attachment.name}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FFEDD5] text-[#C2410C] shrink-0">
                          {msg.attachment.mimeType === 'application/pdf' ? 'PDF' : 'TXT'}
                        </span>
                        <span className="text-[11px] text-[#57534E] shrink-0">
                          {formatFileSize(msg.attachment.size)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1 mt-1">
                  {renderFormattedText(msg.text)}
                </div>

                {!isUser && (
                  <div className="mt-2.5 pt-1.5 border-t border-[#E5DFD3] flex items-center justify-end">
                    <button
                      onClick={() => copyToClipboard(msg.id, msg.text)}
                      className="text-xs text-[#57534E] hover:text-[#166534] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#166534]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Advice</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#E5DFD3] text-[#166534] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-[#E5DFD3] rounded-2xl rounded-tl-none p-3.5 text-xs text-[#166534] flex items-center gap-2 shadow-[0_4px_16px_rgba(28,25,23,0.05)]">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse delay-150"></span>
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse delay-300"></span>
              <span className="text-xs text-[#57534E] ml-1">
                Formulating agronomic advice for {selectedCropContext}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white border-t border-[#E5DFD3] space-y-2.5">
        {/* Validation & Voice Error Banners */}
        {attachmentError && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E]">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
              <span className="truncate">{attachmentError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachmentError(null)}
              className="p-0.5 rounded text-[#D97706] hover:text-[#1C1917] cursor-pointer shrink-0"
              aria-label="Dismiss attachment error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {voiceError && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E]">
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

        {/* Active Voice Listening / Transcribing Status Bar */}
        {isListening && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-[#DC2626] animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span>Listening... Tap to stop ({speechLocale})</span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="px-2.5 py-0.5 rounded-md bg-white border border-red-300 text-[#DC2626] hover:bg-[#DC2626] hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              Stop & Transcribe
            </button>
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] text-xs font-semibold text-[#166534]">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>Transcribing your voice in {speechLocale} with Gemini...</span>
          </div>
        )}

        {/* Pending Attachment Preview Chip / Thumbnail */}
        {pendingAttachment && (
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3]">
            <div className="flex items-center gap-2.5 min-w-0">
              {pendingAttachment.meta.mimeType.startsWith('image/') && pendingAttachment.meta.previewUrl ? (
                <img
                  src={pendingAttachment.meta.previewUrl}
                  alt={pendingAttachment.meta.name}
                  className="w-12 h-12 rounded-lg object-cover border border-[#E5DFD3] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#FFEDD5] border border-[#FED7AA] flex items-center justify-center text-[#C2410C] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1C1917] truncate">
                  {pendingAttachment.meta.name}
                </p>
                <p className="text-[11px] text-[#57534E]">
                  {pendingAttachment.meta.mimeType === 'application/pdf'
                    ? 'PDF Lab / Soil Report'
                    : pendingAttachment.meta.mimeType === 'text/plain'
                      ? 'Text Report'
                      : 'Crop / Pest Photo'}{' '}
                  • {formatFileSize(pendingAttachment.meta.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removePendingAttachment}
              disabled={isLoading}
              aria-label="Remove attached file"
              className="w-7 h-7 rounded-lg bg-white hover:bg-[#FFEDD5] border border-[#E5DFD3] hover:border-[#FED7AA] text-[#57534E] hover:text-[#C2410C] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputMessage);
          }}
          className="flex flex-wrap sm:flex-nowrap items-end gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.jpg,.jpeg,.png,.webp,.pdf,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attachment + Voice Input Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              title="Attach crop/leaf/pest photo or soil/lab report (JPEG, PNG, WebP, PDF, TXT — max 5 MB)"
              aria-label="Attach photo or file"
              className="h-11 px-3 rounded-xl bg-[#F5F2EB] hover:bg-[#FFEDD5] border border-[#E5DFD3] hover:border-[#FED7AA] text-[#57534E] hover:text-[#C2410C] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-40 whitespace-nowrap"
            >
              <Paperclip className="w-4 h-4" />
              <span className="hidden md:inline text-xs font-semibold">Attach</span>
            </button>

            <button
              type="button"
              disabled={isLoading || isTranscribing}
              onClick={toggleListening}
              title={isListening ? 'Tap to stop recording' : `Record voice question in ${speechLocale}`}
              aria-label={isListening ? 'Stop voice recording' : 'Record voice question'}
              className={`h-11 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-40 whitespace-nowrap ${
                isListening
                  ? 'bg-[#DC2626] hover:bg-[#B91C1C] border-[#DC2626] text-white shadow-sm animate-pulse'
                  : 'bg-[#F5F2EB] hover:bg-[#FFEDD5] border-[#E5DFD3] hover:border-[#FED7AA] text-[#57534E] hover:text-[#C2410C]'
              }`}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold hidden sm:inline">Transcribing...</span>
                </>
              ) : isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span className="text-xs font-bold hidden sm:inline">Tap to stop</span>
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Optional Quick Voice Language Override Pill */}
            <div
              className="h-11 px-2 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] flex items-center gap-1 shrink-0"
              title="Voice input language"
            >
              <Globe className="w-3.5 h-3.5 text-[#166534] shrink-0" />
              <select
                aria-label="Chat voice input language"
                disabled={isLoading || isTranscribing}
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value as LanguageCode)}
                className="bg-transparent text-[11px] font-semibold text-[#1C1917] focus:outline-none cursor-pointer max-w-[78px] disabled:opacity-50"
              >
                {VOICE_LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-auto sm:flex-1 order-first sm:order-none">
            <textarea
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${selectedCropContext === 'General' ? 'crops, soil reports, fertilizers' : selectedCropContext}, speak in your language, or attach a photo/PDF...`}
              className={`w-full resize-none px-4 py-3 rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none transition-colors ${
                isListening
                  ? 'bg-white border border-[#DC2626] ring-1 ring-[#DC2626]'
                  : 'bg-[#F5F2EB] border border-[#E5DFD3] focus:bg-white focus:border-[#166534] focus:ring-1 focus:ring-[#166534]'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={(!inputMessage.trim() && !pendingAttachment) || isLoading}
            className="h-11 px-5 ml-auto sm:ml-0 rounded-xl bg-[#166534] hover:bg-[#14532D] disabled:opacity-40 disabled:hover:bg-[#166534] text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 text-xs sm:text-sm cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-xs text-[#57534E] text-center">
          Supports multi-language voice input ({speechLocale}), crop/pest photos (JPEG, PNG, WebP), and soil/lab reports (PDF, TXT) up to 5 MB.
        </p>
      </div>
    </div>
  );
};
