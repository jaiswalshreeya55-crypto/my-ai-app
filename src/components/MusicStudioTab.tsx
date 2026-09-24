import React, { useState, useRef } from 'react';
import {
  Music,
  Sparkles,
  Play,
  Pause,
  Download,
  Bookmark,
  Check,
  RefreshCw,
  Sliders,
  Volume2,
  FileText,
  Upload,
  X,
  Disc,
} from 'lucide-react';
import { User, db } from '../firebase.ts';
import { doc, setDoc } from 'firebase/firestore';

interface MusicStudioTabProps {
  user: User | null;
  onSaveCreation?: (item: any) => void;
}

const MUSIC_GENRES = [
  { label: 'Ambient Lofi', prompt: 'calm lofi beats with warm rhodes piano, gentle tape hiss, and mellow hip-hop rhythm' },
  { label: 'Epic Cinematic', prompt: 'heroic orchestral crescendo with sweeping cellos, brass fanfares, and thunderous taiko drums' },
  { label: 'Cyberpunk Synthwave', prompt: 'driving 80s analog synthesizers, punchy gated reverb drums, and glowing neon melodies' },
  { label: 'Acoustic Folk', prompt: 'intimate fingerpicked acoustic guitar, subtle fiddle harmonies, and warm natural reverb' },
];

export const MusicStudioTab: React.FC<MusicStudioTabProps> = ({ user, onSaveCreation }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [referenceImage, setReferenceImage] = useState<{ base64: string; preview: string; name: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setReferenceImage({
        base64: res,
        preview: res,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      setStatusNotice(null);
      setAudioUrl(null);
      setLyrics(null);
      setIsPlaying(false);
      setSavedSuccess(false);

      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel,
          image: referenceImage ? { base64: referenceImage.base64 } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to synthesize music');
      }

      if (data.audioBase64) {
        // Decode base64 into Blob URL as prescribed by Lyria guidelines
        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);
        setAudioUrl(blobUrl);
      }

      setLyrics(data.lyrics || null);
      if (data.notice) {
        setStatusNotice(data.notice);
      }
    } catch (err: any) {
      console.error('Music generation error:', err);
      setError(err?.message || 'Error generating music');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!user) return;
    try {
      const creationId = `mus-${Date.now()}`;
      const creationRef = doc(db, 'users', user.uid, 'creations', creationId);
      const payload = {
        id: creationId,
        userId: user.uid,
        type: 'music',
        title: prompt.slice(0, 50),
        prompt: prompt.trim(),
        outputUrl: audioUrl || '',
        metadata: JSON.stringify({ model: selectedModel, lyrics: lyrics?.slice(0, 100) }),
        createdAt: new Date().toISOString(),
      };
      await setDoc(creationRef, payload);
      setSavedSuccess(true);
      if (onSaveCreation) onSaveCreation(payload);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save music error:', err);
      setError('Could not save music to Firestore: ' + err.message);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `ai-studio-track-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-fuchsia-900 via-purple-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
              <Music className="w-3.5 h-3.5 text-fuchsia-300" />
              <span>Lyria-3 Audio Synthesis</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Lyria Music Studio</h2>
            <p className="text-purple-100 text-sm mt-1 max-w-xl">
              Compose complete songs, backing soundscapes, or atmospheric audio clips straight from text descriptions and inspiring visual artwork.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs space-y-4">
            {/* Model Duration Selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                Composition Length
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedModel('lyria-3-clip-preview')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    selectedModel === 'lyria-3-clip-preview'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>Lyria Clip (Up to 30s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModel('lyria-3-pro-preview')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    selectedModel === 'lyria-3-pro-preview'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lyria Pro (Full Track)</span>
                </button>
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Musical Style & Composition Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., An energetic upbeat synthwave theme with arpeggiated analog leads, driving 124 BPM bassline, and catchy retro chorus"
                rows={3}
                className="w-full rounded-xl border border-purple-200 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-200"
              />
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Curated Genres
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MUSIC_GENRES.map((genre, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(genre.prompt)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700 transition"
                  >
                    🎵 {genre.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Image Inspiration */}
            <div className="border-t border-purple-50 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Visual Inspiration Image (Optional)</span>
                {referenceImage && (
                  <button
                    onClick={() => setReferenceImage(null)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {referenceImage ? (
                <div className="rounded-xl border border-purple-200 p-2 bg-purple-50/30 flex items-center gap-3">
                  <img src={referenceImage.preview} alt="Source" className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{referenceImage.name}</p>
                    <p className="text-[11px] text-purple-600 font-medium">Lyria will compose music inspired by this imagery</p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-purple-200 p-3.5 text-center hover:border-purple-400 hover:bg-purple-50/40 cursor-pointer transition"
                >
                  <Upload className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs font-medium text-slate-700">Add artwork or photo for visual-audio harmony</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white shadow-md hover:from-fuchsia-700 hover:to-indigo-700 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Track with Lyria...</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  <span>Generate Music Composition</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Audio Player & Lyrics Column */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-xs flex flex-col items-center justify-center min-h-[420px] relative">
            {isLoading ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 animate-pulse">
                  <Music className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Synthesizing Waves</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Harmonizing melodies, bass, rhythms, and audio frequencies with {selectedModel}...
                  </p>
                </div>
              </div>
            ) : audioUrl || lyrics ? (
              <div className="w-full space-y-6">
                {/* Audio Card */}
                {audioUrl && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/40 to-fuchsia-50/30 border border-purple-200/80 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayback}
                          className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition"
                        >
                          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                        </button>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{prompt}</h4>
                          <span className="text-xs font-semibold text-purple-700">{selectedModel}</span>
                        </div>
                      </div>

                      <button
                        onClick={handleDownload}
                        className="p-2 rounded-lg border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 transition"
                        title="Download WAV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      controls
                      className="w-full h-10 mt-2"
                    />
                  </div>
                )}

                {/* Lyrics / Metadata Section */}
                {lyrics && (
                  <div className="p-4 rounded-xl border border-purple-100 bg-slate-50/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      <span>Lyrics & Audio Breakdown</span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-mono">
                      {lyrics}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">Model: {selectedModel}</span>
                  {user && (
                    <button
                      onClick={handleSaveToFirestore}
                      disabled={savedSuccess}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        savedSuccess
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved to Firestore</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Save to Firestore</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {statusNotice && (
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs">
                    {statusNotice}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400">
                  <Music className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Audio Player</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Your generated audio composition and lyrics will appear here for playback and export.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
