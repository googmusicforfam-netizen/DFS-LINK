import React from 'react';
import { Sport } from '../types/dfs';

interface SportTabConfig {
  id: Sport;
  label: string;
  shortLabel: string;
  icon: string;
  badge?: string;
}

const SPORTS: SportTabConfig[] = [
  { id: 'nba', label: 'NBA Basketball', shortLabel: 'NBA', icon: '🏀' },
  { id: 'nfl', label: 'NFL Football', shortLabel: 'NFL', icon: '🏈' },
  { id: 'nhl', label: 'NHL Hockey', shortLabel: 'NHL', icon: '🏒' },
  { id: 'cbb', label: 'College Basketball', shortLabel: 'CBB', icon: '⛹️' },
  { id: 'cfb', label: 'College Football', shortLabel: 'CFB', icon: '🏈' },
  { id: 'mlb', label: 'MLB Baseball', shortLabel: 'MLB', icon: '⚾' },
];

interface SportTabsProps {
  currentSport: Sport;
  onSelectSport: (sport: Sport) => void;
  gameCounts?: Record<Sport, number>;
}

export const SportTabs: React.FC<SportTabsProps> = ({
  currentSport,
  onSelectSport,
  gameCounts,
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar scroll-smooth">
          {SPORTS.map((sport) => {
            const isActive = currentSport === sport.id;
            const count = gameCounts ? gameCounts[sport.id] : undefined;

            return (
              <button
                key={sport.id}
                onClick={() => onSelectSport(sport.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                <span>{sport.icon}</span>
                <span className="sm:hidden">{sport.shortLabel}</span>
                <span className="hidden sm:inline">{sport.label}</span>
                {typeof count === 'number' && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
