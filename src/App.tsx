import React, { useState, useEffect } from 'react';
import { ActiveTab, QAItem } from './types.ts';
import { Header } from './components/Header.tsx';
import { AskAITab } from './components/AskAITab.tsx';
import { BackgroundTab } from './components/BackgroundTab.tsx';
import { ChatStudioTab } from './components/ChatStudioTab.tsx';
import { ImageStudioTab } from './components/ImageStudioTab.tsx';
import { VideoStudioTab } from './components/VideoStudioTab.tsx';
import { MusicStudioTab } from './components/MusicStudioTab.tsx';
import { MapsStudioTab } from './components/MapsStudioTab.tsx';
import { LiveVoiceTab } from './components/LiveVoiceTab.tsx';
import { CreationsTab } from './components/CreationsTab.tsx';
import { auth, onAuthStateChanged, User, testFirebaseConnection, syncUserProfile } from './firebase.ts';

const DEFAULT_BG = '#F5F3FF';
const STORAGE_BG_KEY = 'ai_studio_bg';
const STORAGE_HISTORY_KEY = 'ai_studio_history_v2';

const INITIAL_DEMO_ITEM: QAItem = {
  id: 'demo-math-center-of-mass',
  timestamp: Date.now() - 180000,
  prompt: 'Derive the formula for Center of Mass (X_cm) for discrete particles and continuous bodies.',
  response: `### Center of Mass ($X_{\\text{cm}}$)

The **center of mass** is the unique point at the center of a distribution of mass in space where the weighted relative position vectors sum to zero.

---

### 1. Discrete System of Particles

For a system of $n$ particles with masses $m_1, m_2, \\dots, m_n$ located along the $x$-axis at positions $x_1, x_2, \\dots, x_n$, the center of mass coordinate $X_{\\text{cm}}$ is:

$$X_{\\text{cm}} = \\frac{\\sum_{i=1}^n m_i x_i}{\\sum_{i=1}^n m_i} = \\frac{1}{M} \\sum_{i=1}^n m_i x_i$$

Where:
- $M = \\sum_{i=1}^n m_i$ is the **total mass** of the system.
- $m_i$ represents the mass of particle $i$.
- $x_i$ represents the position coordinate of particle $i$.

In three-dimensional vector notation:

$$\\vec{R}_{\\text{cm}} = \\frac{1}{M} \\sum_{i=1}^n m_i \\vec{r}_i$$

---

### 2. Continuous Mass Distribution

For a solid object with continuous mass density $\\rho(\\vec{r})$, the summation becomes an integral over the object's volume:

$$X_{\\text{cm}} = \\frac{1}{M} \\int x \\, dm = \\frac{\\int x \\rho(\\vec{r}) \\, dV}{\\int \\rho(\\vec{r}) \\, dV}$$

Where $dm = \\rho(\\vec{r}) \\, dV$ is the infinitesimal mass element.

---

### Variables & Physical Units

| Symbol | Description | SI Unit |
| :--- | :--- | :--- |
| $X_{\\text{cm}}$ | Center of mass position | $\\text{m}$ (meters) |
| $m_i$ | Discrete particle mass | $\\text{kg}$ (kilograms) |
| $M$ | Total system mass | $\\text{kg}$ (kilograms) |
| $\\rho$ | Mass density | $\\text{kg/m}^3$ |

### Grounded References
- [HyperPhysics - Center of Mass](http://hyperphysics.phy-astr.gsu.edu/hbase/cm.html)
- [LibreTexts Physics - Linear Momentum & Center of Mass](https://phys.libretexts.org)
`,
  sources: [
    {
      title: 'HyperPhysics: Center of Mass & Center of Gravity',
      url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/cm.html',
      domain: 'hyperphysics.phy-astr.gsu.edu',
    },
    {
      title: 'LibreTexts Physics: Linear Momentum and Center of Mass',
      url: 'https://phys.libretexts.org',
      domain: 'phys.libretexts.org',
    },
  ],
  searchQueries: ['center of mass formula discrete continuous', 'X_cm derivation integral'],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('math');
  const [user, setUser] = useState<User | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

  // Background state with localStorage persistence
  const [background, setBackground] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BG_KEY);
      return saved || DEFAULT_BG;
    } catch {
      return DEFAULT_BG;
    }
  });

  // History state with localStorage persistence
  const [history, setHistory] = useState<QAItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return [INITIAL_DEMO_ITEM];
    } catch {
      return [INITIAL_DEMO_ITEM];
    }
  });

  // Firebase Auth & Firestore connection testing on mount
  useEffect(() => {
    testFirebaseConnection().then((connected) => {
      setIsDbConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        syncUserProfile(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  // Apply background to body and persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BG_KEY, background);
      document.body.style.background = background;
    } catch (e) {
      console.warn('Failed to save background to localStorage', e);
    }
  }, [background]);

  // Persist history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history to localStorage', e);
    }
  }, [history]);

  const handleAddHistory = (newItem: QAItem) => {
    setHistory((prev) => [newItem, ...prev.filter((item) => item.id !== newItem.id)]);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isDbConnected={isDbConnected}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-5 sm:px-6">
        {activeTab === 'math' && (
          <AskAITab
            history={history}
            onAddHistory={handleAddHistory}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'chat' && (
          <ChatStudioTab user={user} />
        )}

        {activeTab === 'image' && (
          <ImageStudioTab user={user} />
        )}

        {activeTab === 'video' && (
          <VideoStudioTab user={user} />
        )}

        {activeTab === 'music' && (
          <MusicStudioTab user={user} />
        )}

        {activeTab === 'maps' && (
          <MapsStudioTab user={user} />
        )}

        {activeTab === 'live' && (
          <LiveVoiceTab user={user} />
        )}

        {activeTab === 'creations' && (
          <CreationsTab user={user} />
        )}

        {activeTab === 'background' && (
          <BackgroundTab
            currentBg={background}
            onBgChange={setBackground}
            onResetBg={() => setBackground(DEFAULT_BG)}
          />
        )}
      </main>

      {/* Responsive Footer */}
      <footer className="w-full border-t border-purple-100/60 bg-white/70 backdrop-blur-xs py-3 text-center text-xs text-slate-500">
        <p>AI Studio • Multimodal Intelligence, Real-Time Audio, Veo Video & Firebase Firestore Persistence</p>
      </footer>
    </div>
  );
}
