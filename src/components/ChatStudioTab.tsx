import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  User as UserIcon,
  Bot,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Bookmark,
  Cpu,
  Zap,
  Brain,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  VolumeX,
  Radio,
  Activity,
  Globe,
  Languages,
  Play,
  Square,
  CornerDownLeft,
  AlertCircle,
  HelpCircle,
  Headphones,
  Sliders,
} from 'lucide-react';
import { User, db } from '../firebase.ts';
import { doc, setDoc } from 'firebase/firestore';
import { MarkdownRenderer } from '../utils/markdown.tsx';
import { ChatMessage } from '../types.ts';

interface ChatStudioTabProps {
  user: User | null;
  onSaveCreation?: (item: any) => void;
}

type ChatMode = 'text' | 'voice_call';

interface Persona {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  greeting: string;
  instruction: string;
}

const CHAT_PERSONAS: Persona[] = [
  {
    id: 'hinglish_dost',
    name: 'Dost (Hinglish Friend)',
    tag: 'Casual & Friendly',
    emoji: '🤝',
    greeting:
      'Arre namaste bhai! Kaise ho? Main hoon tumhara AI dost. Chahe padhai ho, coding ho, life advice ho ya bas chill baatein — Hindi, English, ya Hinglish me kuch bhi pucho, main hamesha yahan hoon!',
    instruction:
      'You are "Dost", an incredibly warm, charming, witty, and friendly Indian AI companion. ' +
      'You converse naturally and fluently in Hinglish (a natural, modern blend of Hindi and English like urban Indian friends speak: e.g. "Arre waah!", "Kaisa chal raha hai sab kuch?", "Don\'t worry yaar, main hoon na! Bilkul tension mat lo.", "Kya mast idea hai!"). ' +
      'Always match the user\'s tone and language. If they speak Hindi, answer in Hindi; if they speak English, answer in English; if they speak Hinglish, answer in vibrant, friendly Hinglish. ' +
      'Be encouraging, empathetic, humorous when appropriate, and deeply helpful. Format math cleanly with LaTeX ($$ ... $$ and $ ... $) if asked technical questions.',
  },
  {
    id: 'shuddh_hindi',
    name: 'हिंदी मित्र (Pure Hindi)',
    tag: 'प्राकृतिक हिंदी',
    emoji: '🕉️',
    greeting:
      'नमस्ते मित्र! आपका स्वागत है। कहिए, आज किस विषय पर बात करना चाहेंगे? मैं आपकी हर संभव सहायता और मैत्रीपूर्ण बातचीत के लिए तैयार हूँ।',
    instruction:
      'आप एक अत्यंत विनम्र, समझदार और आत्मीय हिंदी मित्र हैं। आप शुद्ध, सरल और प्रवाहमयी हिंदी (Devanagari script) में स्वाभाविक बातचीत करते हैं। आपके उत्तर ज्ञानवर्धक, प्रेरणादायक और गर्मजोशी से भरे होने चाहिए। गणितीय सूत्रों के लिए LaTeX ($$ ... $$ और $ ... $) का प्रयोग करें।',
  },
  {
    id: 'english_buddy',
    name: 'Casual Buddy (English)',
    tag: 'Warm & Upbeat',
    emoji: '🌟',
    greeting:
      "Hey there! Great to chat with you today! How's everything going? Ask me anything, bounce ideas around, or let's just talk about what's on your mind.",
    instruction:
      'You are a warm, authentic, witty, and conversational AI friend. Talk in a natural, casual, upbeat conversational tone. Be insightful, concise, and engaging without sounding corporate or stiff. Use markdown formatting nicely and LaTeX for equations if math is discussed.',
  },
  {
    id: 'polymath_mentor',
    name: 'Smart Mentor & Polymath',
    tag: 'STEM & Career',
    emoji: '🧠',
    greeting:
      'Hello! I am your AI Mentor and Polymath. I can guide you through deep STEM concepts, coding, mathematics ($$E=mc^2$$), career strategy, and philosophy with clarity.',
    instruction:
      'You are a wise, supportive, and knowledgeable mentor and polymath. You explain difficult ideas with simple analogies, structured thinking, and encouragement. Format equations using KaTeX LaTeX ($$ ... $$ for display blocks and $ ... $ for inline math).',
  },
];

const QUICK_PROMPTS = [
  { label: '👋 Kaisa hai bhai?', text: 'Kaisa hai bhai? Kya chal raha hai aaj kal? Sab badhiya?' },
  { label: '😂 Ek mast joke sunao', text: 'Ek mast aur relatable funny joke ya anecdote sunao Hinglish mein!' },
  { label: '🤖 Simple Hinglish mein AI samjhao', text: 'Artificial Intelligence aur Machine Learning simple everyday Hinglish mein samjha do examples ke sath.' },
  { label: '💡 Life aur career advice', text: 'Aaj kal focus aur motivation maintain karne ke liye best practical advice kya hai dost?' },
  { label: '☕ Tell me something interesting', text: 'Tell me a fascinating fact about space or history that will blow my mind!' },
];

const PREBUILT_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', desc: 'Warm & Natural (Recommended)' },
  { id: 'Kore', name: 'Kore', desc: 'Friendly & Expressive' },
  { id: 'Puck', name: 'Puck', desc: 'Energetic & Cheerful' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Deep & Smooth' },
  { id: 'Charon', name: 'Charon', desc: 'Calm & Thoughtful' },
];

const STORAGE_CHAT_KEY = 'ai_studio_friendly_chat_v3';

export const ChatStudioTab: React.FC<ChatStudioTabProps> = ({ user, onSaveCreation }) => {
  // Mode: Text chat or Live Voice Call
  const [mode, setMode] = useState<ChatMode>('text');

  // Selected persona & model
  const [selectedPersona, setSelectedPersona] = useState<Persona>(CHAT_PERSONAS[0]);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');

  // Messages state with persistence
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'welcome-friendly',
        role: 'model',
        content: CHAT_PERSONAS[0].greeting,
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);

  // Voice Call Mode States
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callTranscript, setCallTranscript] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [voiceCallError, setVoiceCallError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1 for visualizer orb

  // Refs for auto-scroll & voice handling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const callTimerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioPlayingRef = useRef<HTMLAudioElement | null>(null);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat to localStorage', e);
    }
  }, [messages]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Audio helper: Float32Array PCM (-1 to 1) to Base64 16-bit Little Endian PCM
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
    if (isSpeakerMuted) return;
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
      setCallStatus('speaking');

      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx !== -1) activeSourcesRef.current.splice(idx, 1);
        if (activeSourcesRef.current.length === 0) {
          setCallStatus('listening');
        }
      };
    } catch (e) {
      console.warn('Live playback error:', e);
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
  };

  // ----------------------------------------------------
  // Mode 1: Friendly Casual Text Chat Handlers
  // ----------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const historyPayload = newMessages.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        text: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          model: selectedModel,
          systemInstruction: selectedPersona.instruction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to receive model response');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err?.message || 'Chat request failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Text-To-Speech for individual message (Listen to AI voice)
  const handleSpeakMessage = async (msgId: string, text: string) => {
    if (playingAudioId === msgId) {
      if (currentAudioPlayingRef.current) {
        currentAudioPlayingRef.current.pause();
        currentAudioPlayingRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioPlayingRef.current) {
      currentAudioPlayingRef.current.pause();
      currentAudioPlayingRef.current = null;
    }

    setPlayingAudioId(msgId);

    try {
      // Strip markdown / LaTeX delimiters for pleasant spoken audio
      const cleanSpokenText = text
        .replace(/\$\$[\s\S]*?\$\$/g, ' mathematical equation ')
        .replace(/\$([^\$]+)\$/g, '$1')
        .replace(/[*_#`[\]()]/g, '')
        .slice(0, 1000);

      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanSpokenText,
          voice: selectedVoice,
          style: 'Friendly, warm, conversational tone in natural voice',
        }),
      });

      const data = await res.json();
      if (res.ok && data.audioBase64) {
        // Convert base64 PCM 24kHz to WAV or play via AudioContext
        const binary = atob(data.audioBase64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
        }

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          setPlayingAudioId(null);
          audioCtx.close().catch(() => {});
        };
        source.start(0);
      } else {
        // Fallback to browser SpeechSynthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
          utterance.onend = () => setPlayingAudioId(null);
          utterance.onerror = () => setPlayingAudioId(null);
          window.speechSynthesis.speak(utterance);
        } else {
          setPlayingAudioId(null);
        }
      }
    } catch (e) {
      console.warn('TTS playback error, trying browser synthesis:', e);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
        utterance.onend = () => setPlayingAudioId(null);
        utterance.onerror = () => setPlayingAudioId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setPlayingAudioId(null);
      }
    }
  };

  // Speech-To-Text Dictation in input box
  const handleToggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedPersona.id === 'shuddh_hindi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsDictating(false);
    }
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save conversation to Firestore
  const handleSaveThreadToFirestore = async () => {
    if (!user || messages.length <= 1) return;
    try {
      const chatId = `chat-${Date.now()}`;
      const chatRef = doc(db, 'users', user.uid, 'chats', chatId);
      const firstUserMsg = messages.find((m) => m.role === 'user')?.content || 'Friendly Casual Chat';

      const payload = {
        id: chatId,
        userId: user.uid,
        title: firstUserMsg.slice(0, 50),
        persona: selectedPersona.name,
        model: selectedModel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(chatRef, payload);

      for (const msg of messages) {
        const msgRef = doc(db, 'users', user.uid, 'chats', chatId, 'messages', msg.id);
        await setDoc(msgRef, {
          id: msg.id,
          userId: user.uid,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.timestamp).toISOString(),
        });
      }

      setSavedSuccess(true);
      if (onSaveCreation) {
        onSaveCreation({
          id: chatId,
          userId: user.uid,
          type: 'chat',
          title: payload.title,
          prompt: firstUserMsg,
          metadata: JSON.stringify({ persona: selectedPersona.name, messages: messages.length }),
          createdAt: payload.createdAt,
        });
      }
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save chat error:', err);
      setError('Could not save chat to Firestore: ' + err.message);
    }
  };

  const handleClearChat = () => {
    const welcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'model',
      content: selectedPersona.greeting,
      timestamp: Date.now(),
    };
    setMessages([welcome]);
  };

  const handleSelectPersona = (p: Persona) => {
    setSelectedPersona(p);
    setMessages((prev) => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        role: 'model',
        content: `Switched to **${p.name}** mode. ${p.greeting}`,
        timestamp: Date.now(),
      },
    ]);
  };

  // ----------------------------------------------------
  // Mode 2: Voice Call Mode (Live Audio) Handlers
  // ----------------------------------------------------
  const handleStartVoiceCall = async () => {
    try {
      setVoiceCallError(null);
      setCallStatus('connecting');
      setIsCallActive(true);
      setCallDuration(0);
      setCallTranscript([]);

      // Start call timer
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Determine language param
      const langParam = selectedPersona.id === 'shuddh_hindi' ? 'hindi' : selectedPersona.id === 'english_buddy' ? 'english' : 'hinglish';

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live?voice=${encodeURIComponent(selectedVoice)}&lang=${langParam}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setCallStatus('listening');

        // Output AudioContext (24kHz) for model audio
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputAudioCtxRef.current = outputCtx;

        // Input AudioContext (16kHz) for microphone
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;

        // Request user microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);

          // Calculate RMS level for live visualizer orb
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setAudioLevel(Math.min(1, rms * 6));

          // Stream audio to Gemini Live if not muted
          if (ws.readyState === WebSocket.OPEN && !isMicMuted) {
            const base64Audio = pcmToBase64(inputData);
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };

        // Welcome greeting in call transcript
        setCallTranscript([
          {
            role: 'model',
            text:
              langParam === 'hindi'
                ? 'नमस्ते! मैं लाइव वॉइस पर आपकी बात सुन रहा हूँ।'
                : langParam === 'english'
                ? 'Hey! I am listening live, go ahead and speak freely.'
                : 'Haan bhai! Call connect ho gayi hai. Bolo, kya baat karni hai?',
          },
        ]);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setVoiceCallError(msg.error);
            // Don't kill call immediately, try speech fallback if quota error
          }
          if (msg.interrupted) {
            stopAllPlayback();
            setCallStatus('listening');
          }
          if (msg.audio && outputAudioCtxRef.current) {
            playAudioChunk(outputAudioCtxRef.current, msg.audio);
          }
          if (msg.text) {
            setCallTranscript((prev) => [...prev, { role: 'model', text: msg.text }]);
          }
        } catch (e) {
          console.warn('WS message parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('Live API WebSocket error:', err);
        setVoiceCallError('Live streaming connection encountered an issue.');
      };

      ws.onclose = () => {
        if (isCallActive) {
          setCallStatus('ended');
        }
      };
    } catch (err: any) {
      console.error('Failed to start voice call:', err);
      setVoiceCallError(err?.message || 'Could not access microphone or connect call.');
      handleEndVoiceCall();
    }
  };

  const handleEndVoiceCall = () => {
    stopAllPlayback();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

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

    setIsCallActive(false);
    setCallStatus('idle');
    setAudioLevel(0);

    // If call lasted more than 3 seconds, log a friendly call summary in the text chat thread!
    if (callDuration >= 3) {
      const mins = Math.floor(callDuration / 60);
      const secs = callDuration % 60;
      const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `call-summary-${Date.now()}`,
          role: 'model',
          content: `📞 **Voice Call Ended** (${formattedTime})\n\nMast baatcheet rahi! You can continue chatting here in text, or tap **"Call AI"** anytime to speak again with voice.`,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      handleEndVoiceCall();
      if (currentAudioPlayingRef.current) {
        currentAudioPlayingRef.current.pause();
      }
    };
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ======================================================== */}
      {/* TOP BAR: Mode Switcher & Quick Call Button               */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-purple-100 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-purple-50/80 border border-purple-100/80">
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mode === 'text'
                ? 'bg-white text-purple-900 shadow-xs ring-1 ring-purple-200'
                : 'text-slate-600 hover:text-purple-700 hover:bg-white/60'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-purple-600" />
            <span>1. Casual Text Chat</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold">
              Hindi / Hinglish / Eng
            </span>
          </button>

          <button
            onClick={() => {
              setMode('voice_call');
              if (!isCallActive) {
                handleStartVoiceCall();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mode === 'voice_call'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
            }`}
          >
            <Phone className="w-4 h-4 text-emerald-500" />
            <span>2. Voice Call Mode</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold animate-pulse">
              <Radio className="w-3 h-3 text-emerald-600" /> Live
            </span>
          </button>
        </div>

        {/* Quick Actions & Model/Persona Selector */}
        <div className="flex items-center gap-2.5">
          {mode === 'text' && (
            <button
              onClick={() => {
                setMode('voice_call');
                handleStartVoiceCall();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition"
              title="Launch Live Voice Call Mode"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>Call AI</span>
            </button>
          )}

          {user && mode === 'text' && (
            <button
              onClick={handleSaveThreadToFirestore}
              disabled={savedSuccess || messages.length <= 1}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                savedSuccess
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'border border-purple-200 text-purple-700 hover:bg-purple-50'
              }`}
              title="Save conversation thread to Firestore"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save Chat</span>
                </>
              )}
            </button>
          )}

          {mode === 'text' && (
            <button
              onClick={handleClearChat}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
              title="Start Fresh Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: FRIENDLY CASUAL TEXT CHAT                        */}
      {/* ======================================================== */}
      {mode === 'text' && (
        <div className="space-y-4">
          {/* Persona & Language Bar */}
          <div className="rounded-2xl border border-purple-100 bg-white p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-purple-500" />
                <span>Persona:</span>
              </span>
              {CHAT_PERSONAS.map((persona) => {
                const isSelected = selectedPersona.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => handleSelectPersona(persona)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-purple-50/70 text-purple-800 hover:bg-purple-100 border border-purple-100/60'
                    }`}
                  >
                    <span>{persona.emoji}</span>
                    <span>{persona.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Model selector & Voice selection */}
            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="rounded-xl border border-purple-200 bg-purple-50/40 px-2.5 py-1.5 text-xs text-purple-900 font-medium focus:outline-hidden"
                title="Select AI Voice"
              >
                {PREBUILT_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    🗣️ Voice: {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Conversation Starters Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Try asking:</span>
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p.text)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-purple-100 text-xs font-medium transition shadow-2xs active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Canvas */}
          <div className="rounded-3xl border border-purple-100 bg-white shadow-xs p-4 sm:p-6 min-h-[440px] max-h-[580px] overflow-y-auto flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 text-xs font-bold shadow-2xs mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm relative group shadow-2xs ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-tr-xs'
                        : 'bg-purple-50/50 border border-purple-100 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    {/* Bottom toolbar for message */}
                    <div
                      className={`flex items-center justify-between gap-3 mt-2 pt-1 border-t text-[11px] ${
                        msg.role === 'user' ? 'border-purple-400/30 text-purple-200' : 'border-purple-100 text-slate-400'
                      }`}
                    >
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {msg.role === 'model' && (
                          <button
                            onClick={() => handleSpeakMessage(msg.id, msg.content)}
                            className={`p-1 rounded-md transition flex items-center gap-1 ${
                              playingAudioId === msg.id
                                ? 'bg-purple-200 text-purple-900 font-bold'
                                : 'hover:bg-purple-100 hover:text-purple-700'
                            }`}
                            title={playingAudioId === msg.id ? 'Stop listening' : 'Listen with human-like voice (TTS)'}
                          >
                            {playingAudioId === msg.id ? (
                              <>
                                <Square className="w-3 h-3 text-purple-700 fill-current animate-pulse" />
                                <span className="text-[10px]">Speaking...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span className="text-[10px] hidden sm:inline">Listen</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className={`p-1 rounded-md transition ${
                            msg.role === 'user' ? 'hover:text-white' : 'hover:text-purple-700 hover:bg-purple-100'
                          }`}
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs mt-1">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-2 text-xs font-semibold text-purple-700 shadow-2xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dost AI is typing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Box with Dictate & Call Buttons */}
          <div className="rounded-2xl border border-purple-200 bg-white p-3 shadow-xs">
            <div className="flex items-end gap-2">
              <button
                onClick={handleToggleDictation}
                className={`p-2.5 rounded-xl transition ${
                  isDictating
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/25'
                    : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                }`}
                title={isDictating ? 'Stop microphone dictation' : 'Speak to type (Dictation)'}
              >
                {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  selectedPersona.id === 'shuddh_hindi'
                    ? 'हिंदी में कुछ भी लिखें या पूछें...'
                    : 'Type a message in Hindi, English, or Hinglish (e.g. "Kaisa hai bhai?")...'
                }
                rows={2}
                className="flex-1 resize-none border-0 p-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
              />

              {/* Call AI Shortcut inside input */}
              <button
                onClick={() => {
                  setMode('voice_call');
                  handleStartVoiceCall();
                }}
                className="p-2.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition hidden sm:flex items-center gap-1.5 text-xs font-bold"
                title="Start Voice Call"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Call</span>
              </button>

              {/* Send message button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition disabled:opacity-40 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: VOICE CALL MODE (LIVE AUDIO)                     */}
      {/* ======================================================== */}
      {mode === 'voice_call' && (
        <div className="space-y-6">
          {/* Main Calling Screen Card */}
          <div className="rounded-3xl border border-purple-100 bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            {/* Background ambient lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center text-center space-y-6">
              {/* Call Badge & Status */}
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 border border-white/15 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Gemini 3.8 Live API • Low Latency Voice</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Dost AI Voice Call
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm">
                  Talk naturally in Hindi, English, or Hinglish. Gemini listens, thinks, and replies with human-like voice.
                </p>
              </div>

              {/* Call Timer & Status Indicator */}
              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-emerald-400">
                  {formatTimer(callDuration)}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  {callStatus === 'connecting'
                    ? 'Connecting Call...'
                    : callStatus === 'speaking'
                    ? 'AI is speaking...'
                    : isMicMuted
                    ? 'Microphone Muted'
                    : 'Listening to your voice...'}
                </span>
              </div>

              {/* Interactive Soundwave Orb */}
              <div className="relative py-4 flex items-center justify-center">
                {/* Visualizer Pulsing Orb */}
                <div
                  className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                    callStatus === 'speaking'
                      ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 shadow-[0_0_60px_rgba(236,72,153,0.6)] scale-105 animate-pulse'
                      : !isMicMuted && audioLevel > 0.05
                      ? 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-102'
                      : isCallActive
                      ? 'bg-gradient-to-tr from-indigo-600 to-purple-700 shadow-[0_0_30px_rgba(99,102,241,0.4)]'
                      : 'bg-slate-800'
                  }`}
                  style={{
                    transform:
                      callStatus === 'speaking'
                        ? 'scale(1.08)'
                        : `scale(${1 + Math.min(0.2, audioLevel * 0.4)})`,
                  }}
                >
                  {callStatus === 'speaking' ? (
                    <Volume2 className="w-16 h-16 text-white animate-bounce" />
                  ) : isMicMuted ? (
                    <MicOff className="w-14 h-14 text-rose-300" />
                  ) : (
                    <Activity className="w-14 h-14 text-white animate-pulse" />
                  )}

                  <span className="text-[11px] font-bold text-white/90 mt-2">
                    {callStatus === 'speaking'
                      ? 'AI Speaking'
                      : isMicMuted
                      ? 'Muted'
                      : 'Listening'}
                  </span>
                </div>

                {/* Animated Ripple Waves */}
                {isCallActive && !isMicMuted && (
                  <>
                    <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-purple-400/30 animate-ping pointer-events-none" />
                    <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-indigo-400/20 pointer-events-none" />
                  </>
                )}
              </div>

              {/* Call Controls Toolbar */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2">
                {/* Mute Mic Button */}
                <button
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  disabled={!isCallActive}
                  className={`p-4 rounded-full transition-all active:scale-95 shadow-lg ${
                    isMicMuted
                      ? 'bg-rose-600 text-white ring-4 ring-rose-600/30'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* Main Call Action (Start / Hang up) */}
                {!isCallActive ? (
                  <button
                    onClick={handleStartVoiceCall}
                    className="p-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/40 active:scale-95 transition-all flex items-center justify-center"
                    title="Start Call"
                  >
                    <Phone className="w-7 h-7" />
                  </button>
                ) : (
                  <button
                    onClick={handleEndVoiceCall}
                    className="p-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/40 active:scale-95 transition-all flex items-center justify-center ring-4 ring-rose-500/20"
                    title="End Call"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                )}

                {/* Speaker Mute Button */}
                <button
                  onClick={() => {
                    if (!isSpeakerMuted) stopAllPlayback();
                    setIsSpeakerMuted(!isSpeakerMuted);
                  }}
                  disabled={!isCallActive}
                  className={`p-4 rounded-full transition-all active:scale-95 shadow-lg ${
                    isSpeakerMuted
                      ? 'bg-amber-600 text-white ring-4 ring-amber-600/30'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                >
                  {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Voice & Persona Adjusters inside Call */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10 w-full text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span>Voice:</span>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-white font-medium text-xs focus:outline-hidden"
                  >
                    {PREBUILT_VOICES.map((v) => (
                      <option key={v.id} value={v.id} className="text-slate-900">
                        {v.name} ({v.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <span>Language:</span>
                  <span className="font-semibold text-emerald-300">
                    {selectedPersona.id === 'shuddh_hindi'
                      ? 'हिंदी (Hindi)'
                      : selectedPersona.id === 'english_buddy'
                      ? 'English'
                      : 'Hinglish (Hindi + Eng)'}
                  </span>
                </div>
              </div>

              {voiceCallError && (
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 text-left w-full">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{voiceCallError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Call Transcript / Captions */}
          {callTranscript.length > 0 && (
            <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-800">Live Call Captions & Transcript</h3>
                </div>
                <span className="text-[11px] text-slate-400">Real-time speech log</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {callTranscript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl text-xs ${
                      t.role === 'user'
                        ? 'bg-purple-50 text-purple-900 border border-purple-100 ml-8'
                        : 'bg-slate-50 text-slate-800 border border-slate-100 mr-8'
                    }`}
                  >
                    <span className="font-bold block mb-1 text-[10px] uppercase tracking-wider text-slate-400">
                      {t.role === 'user' ? 'You' : 'Dost AI'}
                    </span>
                    <p className="leading-relaxed">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick return button to Text Chat */}
          <div className="text-center">
            <button
              onClick={() => {
                if (isCallActive) handleEndVoiceCall();
                setMode('text');
              }}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline underline-offset-4"
            >
              ← Return to Friendly Casual Text Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
