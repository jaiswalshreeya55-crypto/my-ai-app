import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Sparkles,
  Upload,
  Play,
  Download,
  Bookmark,
  Check,
  RefreshCw,
  Clock,
  Layers,
  X,
  AlertCircle,
  Video,
} from 'lucide-react';
import { User, db } from '../firebase.ts';
import { doc, setDoc } from 'firebase/firestore';

interface VideoStudioTabProps {
  user: User | null;
  onSaveCreation?: (item: any) => void;
}

const STATUS_MESSAGES = [
  'Initializing Veo neural video generation pipeline...',
  'Composing temporal keyframes and motion trajectories...',
  'Simulating realistic lighting dynamics and physics...',
  'Rendering video frames in high definition...',
  'Encoding MP4 audio-visual container...',
  'Finalizing stream output...',
];

export const VideoStudioTab: React.FC<VideoStudioTabProps> = ({ user, onSaveCreation }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [sourceImage, setSourceImage] = useState<{ base64: string; preview: string; name: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [progressMsgIndex, setProgressMsgIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    let timer: any;
    if (isLoading) {
      timer = setInterval(() => {
        setProgressMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setSourceImage({
        base64: res,
        preview: res,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !sourceImage) {
      setError('Please provide a video prompt or upload an image to animate.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setVideoUrl(null);
      setSavedSuccess(false);
      setProgressMsgIndex(0);

      // Step 1: Start Operation
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim() || 'Dynamic cinematic motion with realistic physics',
          aspectRatio,
          image: sourceImage ? { base64: sourceImage.base64 } : undefined,
        }),
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error || 'Failed to initiate video generation');
      }

      const operationName = startData.operationName;

      // Step 2: Poll operation status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch('/api/video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName }),
          });

          const pollData = await pollRes.json();
          if (pollData.error) {
            clearInterval(pollIntervalRef.current);
            throw new Error(pollData.error);
          }

          if (pollData.done) {
            clearInterval(pollIntervalRef.current);

            // Step 3: Download video
            const dlRes = await fetch('/api/video-download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ operationName }),
            });

            if (!dlRes.ok) {
              throw new Error('Video generation completed but could not download video data');
            }

            const videoBlob = await dlRes.blob();
            const blobUrl = URL.createObjectURL(videoBlob);
            setVideoUrl(blobUrl);
            setIsLoading(false);
          }
        } catch (pollErr: any) {
          clearInterval(pollIntervalRef.current);
          setError(pollErr.message || 'Error while polling video generation');
          setIsLoading(false);
        }
      }, 5000);
    } catch (err: any) {
      console.error('Video generation error:', err);
      setError(err?.message || 'Error generating video');
      setIsLoading(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!videoUrl || !user) return;
    try {
      const creationId = `vid-${Date.now()}`;
      const creationRef = doc(db, 'users', user.uid, 'creations', creationId);
      const payload = {
        id: creationId,
        userId: user.uid,
        type: 'video',
        title: prompt.slice(0, 50) || 'Animated Video Creation',
        prompt: prompt.trim() || 'Animated image into video',
        outputUrl: videoUrl,
        metadata: JSON.stringify({ aspectRatio, model: 'veo-3.1-fast-generate-preview' }),
        createdAt: new Date().toISOString(),
      };
      await setDoc(creationRef, payload);
      setSavedSuccess(true);
      if (onSaveCreation) onSaveCreation(payload);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save to Firestore error:', err);
      setError('Could not save video to Firestore: ' + err.message);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `ai-studio-veo-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold mb-3">
              <Film className="w-3.5 h-3.5" />
              <span>veo-3.1-fast-generate-preview</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Veo Video Studio</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Animate still photos into fluid cinematic video or generate high-fidelity videos straight from natural text prompts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Column */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs space-y-4">
            {/* Image Animation Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Upload Photo to Animate (Image-to-Video)
                </label>
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
                <div className="rounded-xl border border-purple-200 p-2.5 bg-purple-50/30 flex items-center gap-3">
                  <img src={sourceImage.preview} alt="Source" className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{sourceImage.name}</p>
                    <p className="text-[11px] text-purple-600 font-medium">Veo will bring this frame to life with motion</p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-purple-200 p-4 text-center hover:border-purple-400 hover:bg-purple-50/40 cursor-pointer transition"
                >
                  <Upload className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs font-medium text-slate-700">Upload portrait, character, or scenery image</p>
                  <p className="text-[11px] text-slate-400">Veo will animate camera motion and lifelike dynamics</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Motion & Direction Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  sourceImage
                    ? 'E.g., "Gentle camera zoom in, wind blowing through hair, realistic subtle blinking and natural movement"'
                    : 'E.g., "A hyper-lapse aerial sweep through futuristic floating gardens in Singapore at twilight, 4K quality"'
                }
                rows={3}
                className="w-full rounded-xl border border-purple-200 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-200"
              />
            </div>

            {/* Aspect Ratio Constraint */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                Aspect Ratio (Veo Standard)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    aspectRatio === '16:9'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>16:9 (Landscape)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    aspectRatio === '9:16'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>9:16 (Portrait / Mobile)</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || (!prompt.trim() && !sourceImage)}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-md hover:from-purple-800 hover:to-indigo-800 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Video with Veo...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{sourceImage ? 'Animate Image into Video' : 'Generate Video from Prompt'}</span>
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

        {/* Video Player Column */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs flex flex-col items-center justify-center min-h-[420px] relative">
            {isLoading ? (
              <div className="text-center py-12 px-4 space-y-4 max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 animate-bounce">
                  <Film className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Generating Veo Video</h4>
                  <p className="text-xs text-purple-600 font-semibold mt-1">
                    {STATUS_MESSAGES[progressMsgIndex]}
                  </p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full w-2/3 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Video generation takes approximately 30-60 seconds to render high-definition temporal continuity.
                </p>
              </div>
            ) : videoUrl ? (
              <div className="w-full space-y-4">
                <div className="rounded-xl overflow-hidden bg-black shadow-lg">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-auto max-h-[380px] mx-auto object-contain"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 font-medium">
                    veo-3.1-fast-generate-preview • {aspectRatio}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
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
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400">
                  <Video className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Video Canvas</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Your generated or animated Veo MP4 video will play here with interactive controls.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
