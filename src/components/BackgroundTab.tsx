import React, { useState } from 'react';
import { Palette, Check, RefreshCw, Sparkles, Sliders, Eye, SunMedium } from 'lucide-react';
import { BgPreset } from '../types.ts';

interface BackgroundTabProps {
  currentBg: string;
  onBgChange: (bgValue: string) => void;
  onResetBg: () => void;
}

const SOLID_PRESETS: BgPreset[] = [
  { id: 'lilac-light', name: 'Lilac Mist', value: '#F5F3FF', type: 'color', category: 'purple' },
  { id: 'lavender-pure', name: 'Lavender Dream', value: '#FAF5FF', type: 'color', category: 'purple' },
  { id: 'iris-whisper', name: 'Iris Glow', value: '#EEF2FF', type: 'color', category: 'purple' },
  { id: 'studio-light', name: 'Studio Crisp', value: '#F8FAFC', type: 'color', category: 'neutral' },
  { id: 'pure-white', name: 'Pure White', value: '#FFFFFF', type: 'color', category: 'neutral' },
  { id: 'warm-sand', name: 'Warm Cream', value: '#FFFBEB', type: 'color', category: 'pastel' },
  { id: 'rose-blush', name: 'Rose Petal', value: '#FFF1F2', type: 'color', category: 'pastel' },
  { id: 'mint-frost', name: 'Fresh Mint', value: '#F0FDF4', type: 'color', category: 'pastel' },
  { id: 'sky-breeze', name: 'Sky Azure', value: '#F0F9FF', type: 'color', category: 'pastel' },
  { id: 'peach-glow', name: 'Soft Apricot', value: '#FFF7ED', type: 'color', category: 'pastel' },
];

const GRADIENT_PRESETS: BgPreset[] = [
  {
    id: 'grad-lavender',
    name: 'Lavender Dusk',
    value: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    type: 'gradient',
    category: 'purple',
  },
  {
    id: 'grad-violet-dawn',
    name: 'Violet Dawn',
    value: 'linear-gradient(135deg, #FAF5FF 0%, #EDE9FE 50%, #FDF2F8 100%)',
    type: 'gradient',
    category: 'purple',
  },
  {
    id: 'grad-iris-soft',
    name: 'Iris Flow',
    value: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
    type: 'gradient',
    category: 'purple',
  },
  {
    id: 'grad-aurora',
    name: 'Soft Aurora',
    value: 'linear-gradient(135deg, #F0FDF4 0%, #E0E7FF 50%, #FAE8FF 100%)',
    type: 'gradient',
    category: 'pastel',
  },
  {
    id: 'grad-rose-sunset',
    name: 'Rose Sunset',
    value: 'linear-gradient(135deg, #FFF1F2 0%, #FAF5FF 100%)',
    type: 'gradient',
    category: 'pastel',
  },
  {
    id: 'grad-cloud-white',
    name: 'Morning Mist',
    value: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
    type: 'gradient',
    category: 'neutral',
  },
];

export const BackgroundTab: React.FC<BackgroundTabProps> = ({
  currentBg,
  onBgChange,
  onResetBg,
}) => {
  const [customHex, setCustomHex] = useState(
    currentBg.startsWith('#') ? currentBg : '#F5F3FF'
  );
  const [copiedStatus, setCopiedStatus] = useState(false);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onBgChange(val);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setCustomHex(val);
    onBgChange(val);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Overview Card */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 sm:p-7 shadow-sm shadow-purple-500/5 backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/20">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Personalize App Background
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Choose light tones or custom hues. Changes apply instantly and persist to your Android device.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
              <Check className="h-3.5 w-3.5" />
              Saved to localStorage
            </span>
            <button
              onClick={onResetBg}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors active:scale-95"
              title="Reset to default background"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-purple-100 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Eye className="h-3.5 w-3.5 text-purple-600" />
              Live Interactive Preview
            </span>
            <span className="text-xs font-mono font-medium text-slate-500 truncate max-w-[200px]">
              {currentBg}
            </span>
          </div>

          <div
            className="relative rounded-xl p-5 shadow-inner border border-slate-200/60 transition-all duration-300"
            style={{ background: currentBg }}
          >
            <div className="rounded-xl bg-white/95 p-4 shadow-sm border border-purple-100/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">AI Studio Preview Card</div>
                  <div className="text-xs text-slate-500">
                    High contrast readability with purple gradient accents
                  </div>
                </div>
              </div>
              <button className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-500/20">
                Sample Accent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Color Picker Section */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 sm:p-7 shadow-sm shadow-purple-500/5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="h-5 w-5 text-purple-600" />
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Custom Color Picker
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Native Color Picker & Hex Input */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <div className="relative">
              <input
                type="color"
                value={currentBg.startsWith('#') ? currentBg : '#F5F3FF'}
                onChange={handleColorPickerChange}
                className="h-14 w-14 cursor-pointer rounded-2xl border-2 border-white shadow-md transition hover:scale-105 active:scale-95"
                title="Click to pick a color"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                HEX Color Code
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={customHex}
                  onChange={handleHexInputChange}
                  placeholder="#F5F3FF"
                  maxLength={7}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm font-semibold uppercase text-slate-800 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>
          </div>

          {/* Quick Lightness presets for custom color */}
          <div className="flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <SunMedium className="h-3.5 w-3.5 text-amber-500" />
              Recommended Clean Light Shades
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {['#FAF5FF', '#F5F3FF', '#EDE9FE', '#DDD6FE', '#C4B5FD'].map((tint) => (
                <button
                  key={tint}
                  onClick={() => {
                    setCustomHex(tint);
                    onBgChange(tint);
                  }}
                  className="group relative h-9 rounded-lg border border-slate-300/80 shadow-2xs transition hover:scale-105 active:scale-95 flex items-center justify-center"
                  style={{ background: tint }}
                  title={tint}
                >
                  {currentBg.toLowerCase() === tint.toLowerCase() && (
                    <Check className="h-3.5 w-3.5 text-purple-900" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Solid Color Presets */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 sm:p-7 shadow-sm shadow-purple-500/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Color Presets
            </h3>
            <p className="text-xs text-slate-500">
              Carefully chosen soft tints that keep UI elements bright and legible
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SOLID_PRESETS.map((preset) => {
            const isSelected = currentBg.toLowerCase() === preset.value.toLowerCase();
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setCustomHex(preset.value);
                  onBgChange(preset.value);
                }}
                className={`group relative flex flex-col items-center gap-2.5 rounded-2xl border p-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/30 shadow-md'
                    : 'border-slate-200/80 bg-white hover:border-purple-300'
                }`}
              >
                <div
                  className="relative h-12 w-full rounded-xl border border-slate-300/80 shadow-inner flex items-center justify-center"
                  style={{ background: preset.value }}
                >
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {preset.name}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {preset.value}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Smooth Gradient Presets */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 sm:p-7 shadow-sm shadow-purple-500/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Gradient Presets
            </h3>
            <p className="text-xs text-slate-500">
              Subtle modern blends with purple and pastel undertones
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {GRADIENT_PRESETS.map((preset) => {
            const isSelected = currentBg === preset.value;
            return (
              <button
                key={preset.id}
                onClick={() => onBgChange(preset.value)}
                className={`group relative flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/30 shadow-md'
                    : 'border-slate-200/80 bg-white hover:border-purple-300'
                }`}
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-xl border border-slate-300/80 shadow-inner flex items-center justify-center"
                  style={{ background: preset.value }}
                >
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">
                    {preset.category}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
