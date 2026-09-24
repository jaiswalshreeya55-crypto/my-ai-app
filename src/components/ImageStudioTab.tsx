import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Download,
  Bookmark,
  Check,
  RefreshCw,
  Wand2,
  Sliders,
  Layers,
  X,
  Info,
} from 'lucide-react';
import { User, db } from '../firebase.ts';
import { collection, doc, setDoc } from 'firebase/firestore';

interface ImageStudioTabProps {
  user: User | null;
  onSaveCreation?: (item: any) => void;
}

const PRESET_STYLES = [
  { label: 'Cyberpunk Neon', prompt: 'in vibrant cyberpunk aesthetic with glowing neon accents and cinematic volumetric lighting' },
  { label: 'Studio Photorealism', prompt: 'shot on 85mm lens, f/1.4 aperture, realistic detailed textures and natural studio light' },
  { label: 'Watercolor Painting', prompt: 'delicate expressive watercolor on textured paper, flowing pastel pigments, artistic brush strokes' },
  { label: 'Isometric 3D', prompt: 'clean 3D isometric render, soft ambient occlusion, cute miniature model style' },
];

export const ImageStudioTab: React.FC<ImageStudioTabProps> = ({ user, onSaveCreation }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [imageSize, setImageSize] = useState<'512px' | '1K' | '2K'>('1K');
  const [sourceImage, setSourceImage] = useState<{ base64: string; preview: string; name: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.1-flash-image-preview');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSourceImage({
        base64: result,
        preview: result,
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
      setSavedSuccess(false);

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          imageSize,
          image: sourceImage ? { base64: sourceImage.base64 } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setResultImage(data.imageUrl);
      setModelUsed(data.model || 'gemini-3.1-flash-image-preview');
      if (data.notice) {
        setStatusNotice(data.notice);
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      setError(err?.message || 'Error creating image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!resultImage || !user) return;
    try {
      const creationId = `img-${Date.now()}`;
      const creationRef = doc(db, 'users', user.uid, 'creations', creationId);
      const payload = {
        id: creationId,
        userId: user.uid,
        type: 'image',
        title: prompt.slice(0, 50),
        prompt: prompt.trim(),
        outputUrl: resultImage,
        metadata: JSON.stringify({ aspectRatio, imageSize, model: modelUsed }),
        createdAt: new Date().toISOString(),
      };
      await setDoc(creationRef, payload);
      setSavedSuccess(true);
      if (onSaveCreation) onSaveCreation(payload);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save to Firestore error:', err);
      setError('Could not save to Firestore: ' + err.message);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `ai-studio-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Studio Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>gemini-3.1-flash-image-preview</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Image Creation & Editing Studio</h2>
            <p className="text-purple-100 text-sm mt-1 max-w-xl">
              Transform textual imagination into high-resolution visuals or upload photos to edit with natural language instructions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {sourceImage ? 'Editing Instruction' : 'Text Prompt'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  sourceImage
                    ? 'E.g., "Add a glowing purple aurora borealis in the background, keeping the subject identical"'
                    : 'E.g., "A hyper-detailed mechanical hummingbird made of polished brass and emerald crystals, floating over flowers"'
                }
                rows={3}
                className="w-full rounded-xl border border-purple-200 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-200"
              />
            </div>

            {/* Quick Style Additions */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Style Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_STYLES.map((style, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt((prev) => (prev ? `${prev}, ${style.prompt}` : style.prompt))}
                    className="text-xs px-2.5 py-1 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700 transition"
                  >
                    + {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload for Editing */}
            <div className="border-t border-purple-50 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Source Photo for Editing (Optional)</span>
                {sourceImage && (
                  <button
                    onClick={() => setSourceImage(null)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {sourceImage ? (
                <div className="relative rounded-xl border border-purple-200 p-2 bg-purple-50/30 flex items-center gap-3">
                  <img src={sourceImage.preview} alt="Source" className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{sourceImage.name}</p>
                    <p className="text-[11px] text-purple-600 font-medium">Ready for AI image modification</p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-purple-200 p-4 text-center hover:border-purple-400 hover:bg-purple-50/40 cursor-pointer transition"
                >
                  <Upload className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs font-medium text-slate-700">Click to upload photo to modify</p>
                  <p className="text-[11px] text-slate-400">PNG, JPG, WebP supported</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>

            {/* Aspect Ratio & Resolution */}
            <div className="grid grid-cols-2 gap-3 border-t border-purple-50 pt-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e: any) => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border border-purple-200 p-2 text-xs text-slate-700 focus:outline-hidden focus:border-purple-500"
                >
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait / Reel)</option>
                  <option value="4:3">4:3 (Photo)</option>
                  <option value="3:4">3:4 (Tall)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Resolution</label>
                <select
                  value={imageSize}
                  onChange={(e: any) => setImageSize(e.target.value)}
                  className="w-full rounded-lg border border-purple-200 p-2 text-xs text-slate-700 focus:outline-hidden focus:border-purple-500"
                >
                  <option value="1K">1K (1024px)</option>
                  <option value="2K">2K (High-Res)</option>
                  <option value="512px">512px (Fast)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white shadow-md hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Visuals with Gemini...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>{sourceImage ? 'Apply Edits to Image' : 'Generate Image'}</span>
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

        {/* Display Canvas Column */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs flex flex-col items-center justify-center min-h-[420px] relative">
            {isLoading ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 animate-pulse">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Creating Imagery</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Running diffusion & visual synthesis models on Gemini engine...
                </p>
              </div>
            ) : resultImage ? (
              <div className="w-full space-y-4">
                <div className="relative group rounded-xl overflow-hidden border border-purple-100 bg-slate-900/5 shadow-inner flex items-center justify-center">
                  <img
                    src={resultImage}
                    alt={prompt}
                    className="max-h-[380px] w-auto object-contain rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-purple-700">{modelUsed}</span> • {aspectRatio}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

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
                </div>

                {statusNotice && (
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-purple-600" />
                    <span>{statusNotice}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Preview Canvas</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Your generated or edited artwork will be displayed here in full resolution.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
