import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Radio, AlertCircle, Wifi, Play, Square, Activity } from 'lucide-react';
import { User } from '../firebase.ts';

interface LiveVoiceTabProps {
  user: User | null;
}

export const LiveVoiceTab: React.FC<LiveVoiceTabProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>('Ready to connect to Gemini Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Convert Float32Array PCM (-1 to 1) to Base64 16-bit Little Endian PCM
  const pcmToBase64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Decode Base64 16-bit PCM little-endian into AudioBuffer at 24kHz
  const playAudioChunk = (audioCtx: AudioContext, base64Pcm: string) => {
    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setIsSpeaking(true);

      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx !== -1) activeSourcesRef.current.splice(idx, 1);
        if (activeSourcesRef.current.length === 0) {
          setIsSpeaking(false);
        }
      };
    } catch (e) {
      console.warn('Playback error:', e);
    }
  };

  const stopAllPlayback = () => {
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  };

  const handleStartSession = async () => {
    try {
      setError(null);
      setStatus('Connecting to Gemini 3.8 Live API session...');

      // 1. Establish WebSocket connection to backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatus('Microphone active. Start speaking to Gemini Live.');

        // Initialize Output AudioContext at 24kHz for model audio
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputAudioCtxRef.current = outputCtx;

        // Initialize Input AudioContext at 16kHz for mic capture
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        setIsRecording(true);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputChannel = e.inputBuffer.getChannelData(0);
            const base64Audio = pcmToBase64(inputChannel);
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setError(msg.error);
            handleEndSession();
          }
          if (msg.interrupted) {
            stopAllPlayback();
          }
          if (msg.audio && outputAudioCtxRef.current) {
            playAudioChunk(outputAudioCtxRef.current, msg.audio);
          }
        } catch (e) {
          console.warn('Message process error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        setError('Live connection interrupted. Please try reconnecting.');
        handleEndSession();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
        setStatus('Session disconnected.');
      };
    } catch (err: any) {
      console.error('Session initiation error:', err);
      setError(err?.message || 'Could not access microphone or initiate Live API.');
      handleEndSession();
    }
  };

  const handleEndSession = () => {
    stopAllPlayback();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsRecording(false);
    setStatus('Voice session closed.');
  };

  useEffect(() => {
    return () => {
      handleEndSession();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Live Studio Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-3">
              <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>gemini-3.8-live</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Real-Time Voice Studio</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Bidirectional natural voice conversations with ultra-low latency. Speak freely — Gemini listens, thinks, and responds naturally in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Voice Visualizer Orb Card */}
      <div className="rounded-3xl border border-purple-100 bg-white p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
        <div className="max-w-md mx-auto space-y-8">
          {/* Animated Wave Orb */}
          <div className="relative flex items-center justify-center">
            <div
              className={`w-44 h-44 rounded-full flex items-center justify-center transition-all duration-500 ${
                isSpeaking
                  ? 'bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 shadow-[0_0_50px_rgba(168,85,247,0.6)] scale-105 animate-pulse'
                  : isRecording
                  ? 'bg-gradient-to-tr from-purple-500 to-indigo-600 shadow-[0_0_30px_rgba(99,102,241,0.4)]'
                  : 'bg-slate-100 border border-slate-200'
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="w-16 h-16 text-white animate-bounce" />
              ) : isRecording ? (
                <Activity className="w-16 h-16 text-white animate-pulse" />
              ) : (
                <MicOff className="w-14 h-14 text-slate-400" />
              )}
            </div>

            {/* Ripple Rings when active */}
            {isRecording && (
              <>
                <div className="absolute w-52 h-52 rounded-full border-2 border-purple-400/40 animate-ping pointer-events-none" />
                <div className="absolute w-60 h-60 rounded-full border border-indigo-400/20 pointer-events-none" />
              </>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {isSpeaking ? 'Gemini is speaking...' : isRecording ? 'Listening to your voice...' : 'Ready to Start'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">{status}</p>
          </div>

          {/* Action Control Button */}
          <div className="flex items-center justify-center gap-4">
            {!isConnected ? (
              <button
                onClick={handleStartSession}
                className="px-6 py-3.5 rounded-full font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                <span>Start Live Voice Conversation</span>
              </button>
            ) : (
              <button
                onClick={handleEndSession}
                className="px-6 py-3.5 rounded-full font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 transition flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                <span>End Conversation</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Technical Specs Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] text-slate-400">
            <span>Audio In: 16kHz PCM</span>
            <span>•</span>
            <span>Audio Out: 24kHz PCM</span>
            <span>•</span>
            <span>Full Duplex Streaming</span>
          </div>
        </div>
      </div>
    </div>
  );
};
