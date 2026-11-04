import React from 'react';
import { GroundingSource } from '../types/dfs';
import { ExternalLink, ShieldCheck, Globe } from 'lucide-react';

interface GroundingSourcesBarProps {
  sources: GroundingSource[];
}

export const GroundingSourcesBar: React.FC<GroundingSourcesBarProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 text-xs text-slate-400">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Research Grounding (Free Public Sources)</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Free Sources</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-colors text-[11px]"
          >
            <span className="truncate max-w-[200px]">{source.title}</span>
            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
          </a>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">
        Odds, line movements, projections, and injury reports synthesized using Google Search Grounding across ESPN, Rotowire, SportsLine, FantasyFuel, official leagues, and Reddit r/dfsports.
      </p>
    </div>
  );
};
