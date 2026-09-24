import React from 'react';
import {
  Sparkles,
  Palette,
  MessageSquare,
  Film,
  Music,
  MapPin,
  Mic,
  Bookmark,
  Sigma,
  Cloud,
} from 'lucide-react';
import { ActiveTab } from '../types.ts';
import { User } from '../firebase.ts';
import { UserNav } from './UserNav.tsx';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: User | null;
  isDbConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  isDbConnected,
}) => {
  const tabs = [
    { id: 'math' as ActiveTab, label: 'Math & QA', icon: Sigma, emoji: '📐' },
    { id: 'chat' as ActiveTab, label: 'Chatbot', icon: MessageSquare, emoji: '🤖' },
    { id: 'image' as ActiveTab, label: 'Images', icon: Sparkles, emoji: '🎨' },
    { id: 'video' as ActiveTab, label: 'Veo Video', icon: Film, emoji: '🎬' },
    { id: 'music' as ActiveTab, label: 'Music', icon: Music, emoji: '🎵' },
    { id: 'maps' as ActiveTab, label: 'Maps', icon: MapPin, emoji: '📍' },
    { id: 'live' as ActiveTab, label: 'Live Voice', icon: Mic, emoji: '🎙️' },
    { id: 'creations' as ActiveTab, label: 'Creations', icon: Bookmark, emoji: '📂' },
    { id: 'background' as ActiveTab, label: 'Theme', icon: Palette, emoji: '🖌️' },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-purple-100/80 bg-white/90 backdrop-blur-md transition-colors shadow-2xs">
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 px-4 pt-3 pb-2 sm:px-6">
        {/* Top bar: Brand, Status & User Auth */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white shadow-md shadow-purple-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                  AI <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Studio</span>
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 tracking-wide">
                  FULL MULTIMODAL SUITE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Gemini 3.8 • Live API • Veo 3.1 • Lyria • Maps Grounding • Firestore
              </p>
            </div>
          </div>

          {/* User Auth with Google & Firestore Connection Badge */}
          <UserNav user={user} isDbConnected={isDbConnected} />
        </div>

        {/* Tab Navigation Ribbon */}
        <nav
          role="tablist"
          aria-label="Application studios"
          className="flex w-full items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100/90 p-1 ring-1 ring-slate-200/60 shadow-inner no-scrollbar py-1"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold transition-all duration-150 select-none ${
                  isActive
                    ? 'bg-white text-purple-900 shadow-sm ring-1 ring-purple-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="text-sm">{tab.emoji}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-purple-600 ml-0.5" />}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
