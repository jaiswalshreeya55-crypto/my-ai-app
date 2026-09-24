import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { GroundedSource } from '../types.ts';

interface SourceCardProps {
  source: GroundedSource;
  index: number;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  // Extract favicon using Google's public favicon service or domain
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${source.domain}&sz=64`;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-3 rounded-xl border border-purple-100 bg-white/80 p-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white hover:shadow-md hover:shadow-purple-500/10 active:scale-[0.98]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 p-1.5 ring-1 ring-purple-100/80 group-hover:bg-purple-100 transition-colors">
        <img
          src={faviconUrl}
          alt={source.domain}
          className="h-5 w-5 object-contain"
          onError={(e) => {
            // fallback if icon cannot load
            (e.target as HTMLElement).style.display = 'none';
            (e.currentTarget.parentElement as HTMLElement).innerHTML =
              '<svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-width="2" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
            Source {index + 1}
          </span>
          <span className="text-[10px] text-slate-400">•</span>
          <span className="truncate text-xs font-medium text-slate-500">
            {source.domain}
          </span>
        </div>
        <p className="truncate text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
          {source.title || source.domain}
        </p>
      </div>

      <div className="shrink-0 text-slate-400 group-hover:text-purple-600 transition-colors">
        <ExternalLink className="h-4 w-4" />
      </div>
    </a>
  );
};
