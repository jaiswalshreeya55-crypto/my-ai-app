import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  X,
  Upload,
  Search,
  Globe,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  FileText,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GroundedSource, QAItem } from '../types.ts';
import { SourceCard } from './SourceCard.tsx';
import { MarkdownRenderer } from '../utils/markdown.tsx';

interface AskAITabProps {
  history: QAItem[];
  onAddHistory: (item: QAItem) => void;
  onClearHistory: () => void;
}

// Sample prompt suggestions optimized for search grounding, math formulas, and vision QA
const SUGGESTED_PROMPTS = [
  {
    icon: '📐',
    label: 'Center of Mass',
    query: 'Explain the formula for Center of Mass $X_{cm}$ for discrete particles and continuous bodies with step-by-step math equations and derivations.',
  },
  {
    icon: '🧮',
    label: 'Math & Formulas',
    query: 'Show the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ and Einstein\'s mass-energy equation $E = mc^2$ with clear, big formulas.',
  },
  {
    icon: '🌐',
    label: 'Real-time Tech',
    query: 'What are the most significant AI and technology news updates this month?',
  },
  {
    icon: '🚀',
    label: 'Science & Space',
    query: 'What are the latest findings from the James Webb Space Telescope?',
  },
];

// Sample images for 1-click Vision QA test
const SAMPLE_IMAGES = [
  {
    id: 'growth-chart',
    name: 'Growth Metrics Chart',
    prompt: 'Analyze this financial growth chart and summarize the quarterly performance and peak trends.',
    // Lightweight inline SVG converted to data URL
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360" fill="%23f8fafc"><rect width="600" height="360" fill="%23f8fafc"/><text x="30" y="45" font-family="sans-serif" font-weight="bold" font-size="20" fill="%231e293b">Q1-Q4 Revenue &amp; Growth Analysis (2025-2026)</text><line x1="50" y1="300" x2="550" y2="300" stroke="%23cbd5e1" stroke-width="2"/><line x1="50" y1="60" x2="50" y2="300" stroke="%23cbd5e1" stroke-width="2"/><rect x="90" y="210" width="60" height="90" fill="%239333ea" rx="6"/><text x="105" y="200" font-family="sans-serif" font-size="12" fill="%236b21a8" font-weight="bold">$120M</text><text x="100" y="325" font-family="sans-serif" font-size="13" fill="%23475569">Q1 25</text><rect x="200" y="160" width="60" height="140" fill="%237c3aed" rx="6"/><text x="215" y="150" font-family="sans-serif" font-size="12" fill="%235b21b6" font-weight="bold">$185M</text><text x="210" y="325" font-family="sans-serif" font-size="13" fill="%23475569">Q2 25</text><rect x="310" y="120" width="60" height="180" fill="%236366f1" rx="6"/><text x="325" y="110" font-family="sans-serif" font-size="12" fill="%233730a3" font-weight="bold">$240M</text><text x="320" y="325" font-family="sans-serif" font-size="13" fill="%23475569">Q3 25</text><rect x="420" y="70" width="60" height="230" fill="%234f46e5" rx="6"/><text x="435" y="60" font-family="sans-serif" font-size="12" fill="%23312e81" font-weight="bold">$310M</text><text x="430" y="325" font-family="sans-serif" font-size="13" fill="%23475569">Q4 25</text><path d="M 120 210 Q 230 150 340 120 T 450 70" fill="none" stroke="%23ec4899" stroke-width="4"/><circle cx="450" cy="70" r="6" fill="%23ec4899"/></svg>',
  },
  {
    id: 'circuit-board',
    name: 'Smart Device Architecture',
    prompt: 'Describe the main components, processor block, and sensor routing in this architecture diagram.',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360" fill="%230f172a"><rect width="600" height="360" fill="%230f172a"/><rect x="200" y="100" width="200" height="160" rx="12" fill="%231e293b" stroke="%238b5cf6" stroke-width="3"/><text x="235" y="170" font-family="monospace" font-weight="bold" font-size="16" fill="%23e2e8f0">NEURAL SOC</text><text x="260" y="195" font-family="monospace" font-size="12" fill="%23a855f7">8-CORE ARM</text><rect x="40" y="130" width="100" height="80" rx="8" fill="%231e293b" stroke="%2306b6d4" stroke-width="2"/><text x="65" y="175" font-family="monospace" font-size="12" fill="%2322d3ee">CAMERA</text><line x1="140" y1="170" x2="200" y2="170" stroke="%2306b6d4" stroke-width="2" stroke-dasharray="4"/><rect x="460" y="130" width="100" height="80" rx="8" fill="%231e293b" stroke="%2310b981" stroke-width="2"/><text x="475" y="175" font-family="monospace" font-size="12" fill="%2334d399">5G MODEM</text><line x1="400" y1="170" x2="460" y2="170" stroke="%2310b981" stroke-width="2" stroke-dasharray="4"/><text x="30" y="45" font-family="sans-serif" font-weight="bold" font-size="18" fill="%2394a3b8">Android Mobile System-on-Chip Diagram</text></svg>',
  },
];

export const AskAITab: React.FC<AskAITabProps> = ({
  history,
  onAddHistory,
  onClearHistory,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    file?: File;
    preview: string;
    mimeType: string;
    base64: string;
    name: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        220
      )}px`;
    }
  }, [prompt]);

  // Clean speech synthesis & retry timer when unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
    };
  }, []);

  // Countdown handler for quota errors
  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown <= 0) {
      setRetryCountdown(null);
      handleSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setRetryCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [retryCountdown]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPEG, WEBP, GIF).');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64Data = dataUrl.split(',')[1];
      setSelectedImage({
        file,
        preview: dataUrl,
        mimeType: file.type,
        base64: base64Data,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSampleImage = (sample: (typeof SAMPLE_IMAGES)[0]) => {
    // Render SVG into PNG via canvas so Gemini vision API receives supported image/png
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 360);
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL('image/png');
        const pngBase64 = pngDataUrl.split(',')[1];
        setSelectedImage({
          preview: pngDataUrl,
          mimeType: 'image/png',
          base64: pngBase64,
          name: sample.name,
        });
      }
    };
    img.src = sample.dataUrl;
    setPrompt(sample.prompt);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setError(null);
    setIsQuotaError(false);
    setRetryCountdown(null);
    setIsLoading(true);
    setLoadingStep('Connecting to Gemini...');

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev.includes('Connecting')) return 'Checking real-time grounding...';
        if (prev.includes('Checking')) return 'Synthesizing authentic answer...';
        return prev;
      });
    }, 1200);

    try {
      const payload: any = {
        prompt: prompt.trim(),
      };

      if (selectedImage) {
        payload.image = {
          mimeType: selectedImage.mimeType,
          base64: selectedImage.base64,
        };
      }

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok) {
        if (data.isQuotaError || res.status === 429) {
          setIsQuotaError(true);
          // Set retry countdown (8s)
          setRetryCountdown(8);
        }
        throw new Error(data.error || 'Failed to fetch answer from Gemini.');
      }

      const newItem: QAItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt: prompt.trim(),
        imagePreview: selectedImage?.preview,
        response: data.text,
        sources: data.sources || [],
        searchQueries: data.searchQueries || [],
        fallbackNotice: data.fallbackNotice,
        modelUsed: data.modelUsed,
      };

      onAddHistory(newItem);

      // Scroll smoothly to results on Android devices
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      setError(
        err.message ||
          'Something went wrong while contacting the AI model. Please verify your GEMINI_API_KEY in Settings > Secrets.'
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner TTS voice
    const cleanText = text
      .replace(/[#*`_>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .slice(0, 1000);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const latestItem = history[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Ask Input Card */}
      <div className="rounded-3xl border border-purple-100 bg-white/95 p-5 sm:p-7 shadow-sm shadow-purple-500/5 backdrop-blur-xs transition-all">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header label & Vision status */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="prompt-input"
              className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700"
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>Real-Time Grounded Query</span>
            </label>

            <span className="flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-100">
              <Globe className="h-3 w-3 text-purple-500" />
              Web Search Grounding Active
            </span>
          </div>

          {/* Textbox saying "Ask anything..." */}
          <div className="relative">
            <textarea
              id="prompt-input"
              ref={textareaRef}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask anything..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-base text-slate-800 placeholder-slate-400 transition-all focus:border-purple-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-purple-500/15 sm:text-lg leading-relaxed"
            />
            {prompt && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="absolute top-3.5 right-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
                title="Clear text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Optional Image Upload for Vision QA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                Optional Image Upload (Vision QA)
              </span>
              <span className="text-[11px] text-slate-400">
                Supports photos, charts, screenshots
              </span>
            </div>

            {selectedImage ? (
              /* Selected Image Preview */
              <div className="relative flex items-center gap-4 rounded-2xl border border-purple-200 bg-purple-50/50 p-3">
                <div className="relative h-18 w-24 shrink-0 overflow-hidden rounded-xl border border-purple-200 bg-white shadow-xs">
                  <img
                    src={selectedImage.preview}
                    alt="Upload preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-md bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      Attached
                    </span>
                    <span className="truncate text-xs sm:text-sm font-semibold text-slate-800">
                      {selectedImage.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Gemini will inspect this image and cross-verify with live search grounding
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs active:scale-95"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Drag & Drop Upload Zone & File Picker */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                  isDragging
                    ? 'border-purple-600 bg-purple-50/80 ring-4 ring-purple-500/10'
                    : 'border-slate-200/90 bg-slate-50/50 hover:border-purple-400 hover:bg-purple-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 transition-transform group-hover:scale-110">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs sm:text-sm font-bold text-purple-700">
                      Tap to upload photo or drag & drop
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      PNG, JPG, WEBP, GIF (Up to 20MB)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick 1-click Sample Vision Test Images */}
            {!selectedImage && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  Quick vision tests:
                </span>
                {SAMPLE_IMAGES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSampleImage(sample)}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/70 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors active:scale-95"
                  >
                    <span>🖼️</span>
                    <span>{sample.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Row: Button "✨ Get authentic answer" */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Press</span>
              <kbd className="rounded border border-slate-300 bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-700">
                Enter
              </kbd>
              <span>to send or tap the button</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg transition-all duration-200 select-none ${
                isLoading || !prompt.trim()
                  ? 'cursor-not-allowed bg-slate-300 shadow-none'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{loadingStep || 'Querying Gemini...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>✨ Get authentic answer</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error notification & Quota Recovery Card */}
        {error && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-xs sm:text-sm transition-all ${
              isQuotaError
                ? 'border-amber-200 bg-amber-50/95 text-amber-900'
                : 'border-rose-200 bg-rose-50/90 text-rose-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">{isQuotaError ? '⏳' : '⚠️'}</span>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm">
                    {isQuotaError ? 'Gemini API Rate Limit / Quota Reached' : 'Unable to complete query'}
                  </p>
                  {isQuotaError && retryCountdown !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                      Retrying in {retryCountdown}s
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{error}</p>
                
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRetryCountdown(null);
                      handleSubmit();
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry Question Now</span>
                  </button>

                  {isQuotaError && (
                    <span className="text-[11px] text-amber-800">
                      💡 Tip: Select a billing-enabled key in <strong>Settings &gt; Secrets</strong> for higher rate limits.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompts Shelf */}
      {!latestItem && !isLoading && (
        <div className="rounded-3xl border border-purple-100 bg-white/70 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              Trending Real-Time Questions
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SUGGESTED_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(item.query)}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left transition hover:border-purple-300 hover:bg-purple-50/30 hover:shadow-xs active:scale-[0.99]"
              >
                <span className="text-lg">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wide">
                    {item.label}
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-slate-800 group-hover:text-purple-900 transition-colors line-clamp-2">
                    {item.query}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-purple-600 transition-colors shrink-0 self-center" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Latest Answer Result Anchor */}
      <div ref={resultRef} />

      {/* Current/Latest Answer Display */}
      {latestItem && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white/95 shadow-md shadow-purple-500/5 backdrop-blur-xs transition-all">
            {/* Header of the answer card */}
            <div className="border-b border-purple-100 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white px-5 py-4 sm:px-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Authentic Answer
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      {latestItem.searchQueries && latestItem.searchQueries.length > 0
                        ? 'Verified with real-time web search grounding'
                        : 'Authentic synthesis via Gemini intelligence'}
                    </span>
                  </div>
                </div>

                {/* Toolbar: Read Aloud, Copy, Clear */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {'speechSynthesis' in window && (
                    <button
                      onClick={() => handleSpeak(latestItem.response)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                        isSpeaking
                          ? 'border-purple-500 bg-purple-100 text-purple-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      title={isSpeaking ? 'Stop speaking' : 'Read answer aloud'}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5 text-purple-700" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5 text-slate-600" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleCopy(latestItem.response, latestItem.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                    title="Copy full answer"
                  >
                    {copiedId === latestItem.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* User Question Reminder */}
              <div className="mt-3.5 rounded-xl bg-purple-100/60 p-3 border border-purple-200/60">
                <div className="flex items-start gap-3">
                  {latestItem.imagePreview && (
                    <img
                      src={latestItem.imagePreview}
                      alt="Question asset"
                      className="h-12 w-16 shrink-0 rounded-lg object-cover border border-purple-300"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Query
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">
                      "{latestItem.prompt}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Graceful fallback banner if search quota was exceeded */}
              {latestItem.fallbackNotice && (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-purple-200/80 bg-purple-50/70 p-2.5 text-xs text-purple-900">
                  <span className="text-sm shrink-0">⚡</span>
                  <p className="flex-1 font-medium leading-relaxed">
                    {latestItem.fallbackNotice}
                  </p>
                </div>
              )}
            </div>

            {/* Answer Content Body */}
            <div className="p-5 sm:p-7">
              <MarkdownRenderer content={latestItem.response} />
            </div>

            {/* Google Search Queries Grounding Badges */}
            {latestItem.searchQueries && latestItem.searchQueries.length > 0 && (
              <div className="border-t border-purple-100/80 bg-slate-50/70 px-5 py-3 sm:px-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Search className="h-3 w-3 text-purple-600" />
                    Web Search Queries:
                  </span>
                  {latestItem.searchQueries.map((query, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200/90 shadow-2xs"
                    >
                      "{query}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clickable Grounded Sources Section */}
            {latestItem.sources && latestItem.sources.length > 0 ? (
              <div className="border-t border-purple-100 bg-gradient-to-b from-white to-purple-50/30 p-5 sm:p-7">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                      Clickable Grounded Sources ({latestItem.sources.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Live Web References
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {latestItem.sources.map((source, index) => (
                    <SourceCard key={index} source={source} index={index} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-purple-100/80 bg-purple-50/40 p-4 text-center">
                <p className="text-xs text-slate-500">
                  Direct synthesized knowledge from Gemini 3.8.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Accordion / Drawer for past questions */}
      {history.length > 1 && (
        <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-left"
            >
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-bold text-slate-800">
                Session History ({history.length} questions)
              </span>
              {showHistory ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear all session history"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {showHistory && (
            <div className="mt-4 space-y-3 divide-y divide-purple-100/60">
              {history.slice(1).map((item) => (
                <div key={item.id} className="pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">
                      "{item.prompt}"
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {item.response.slice(0, 150)}...
                  </p>
                  {item.sources.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-600 font-medium">
                      <Globe className="h-3 w-3" />
                      <span>{item.sources.length} grounded web sources</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
