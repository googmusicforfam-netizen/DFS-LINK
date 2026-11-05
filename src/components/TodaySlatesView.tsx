import React, { useState } from 'react';
import type { DfsSlateContest, DfsSite } from '../types/slates.ts';
import type { Sport } from '../types/dfs.ts';
import {
  Layers,
  Clock,
  DollarSign,
  Trophy,
  Flame,
  CheckCircle2,
  ChevronRight,
  Shield,
  Sparkles,
  Zap,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface TodaySlatesViewProps {
  slates: DfsSlateContest[];
  isLoading: boolean;
  onSelectSlate: (slate: DfsSlateContest) => void;
  onRefresh: () => void;
}

export function TodaySlatesView({
  slates,
  isLoading,
  onSelectSlate,
  onRefresh,
}: TodaySlatesViewProps) {
  const [siteFilter, setSiteFilter] = useState<'ALL' | DfsSite>('ALL');
  const [sportFilter, setSportFilter] = useState<'ALL' | Sport>('ALL');

  // Filter out any sports that have 0 games today (e.g. MLB in offseason)
  const availableSports = Array.from(new Set(slates.map((s) => s.sport)));

  const filteredSlates = slates.filter((s) => {
    if (siteFilter !== 'ALL' && s.site !== siteFilter) return false;
    if (sportFilter !== 'ALL' && s.sport !== sportFilter) return false;
    return true;
  });

  const sportLabels: Record<Sport, string> = {
    nfl: 'NFL Football',
    nba: 'NBA Basketball',
    nhl: 'NHL Hockey',
    cfb: 'College Football',
    cbb: 'College Basketball',
    mlb: 'MLB Baseball',
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Layers className="w-3.5 h-3.5" />
                Today's Live DFS Slates
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                DraftKings & FanDuel
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Contest Slates for Today's Games
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Tap any slate below to open the dedicated Lineup Builder constrained strictly to players in those games.
              Includes real salary caps, live injury beneficiary boosts, and intelligent player correlation suggestions.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2"
            >
              <Clock className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Slates
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          {/* Site Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSiteFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                siteFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Sites ({slates.length})
            </button>
            <button
              onClick={() => setSiteFilter('DraftKings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                siteFilter === 'DraftKings'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              DraftKings ({slates.filter((s) => s.site === 'DraftKings').length})
            </button>
            <button
              onClick={() => setSiteFilter('FanDuel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                siteFilter === 'FanDuel'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-400/80 hover:text-blue-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              FanDuel ({slates.filter((s) => s.site === 'FanDuel').length})
            </button>
          </div>

          {/* Sport Filter Pills (Only sports with games today!) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Sport:
            </span>
            <button
              onClick={() => setSportFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                sportFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              All ({slates.length})
            </button>
            {availableSports.map((sp) => (
              <button
                key={sp}
                onClick={() => setSportFilter(sp)}
                className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg border transition-all ${
                  sportFilter === sp
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                {sp} ({slates.filter((s) => s.sport === sp).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slates Grid */}
      {filteredSlates.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
          <Layers className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <h3 className="text-lg font-bold text-white mb-1">No Matching Slates Available</h3>
          <p className="text-sm max-w-md mx-auto text-slate-400">
            No active contest slates match the selected site or sport filter for today's games.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSlates.map((slate) => {
            const isDK = slate.site === 'DraftKings';
            const siteColor = isDK ? 'emerald' : 'blue';

            return (
              <div
                key={slate.id}
                onClick={() => onSelectSlate(slate)}
                className="group cursor-pointer bg-slate-900/95 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Site color indicator bar at top */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isDK ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-500 to-indigo-400'
                  }`}
                />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black tracking-wide ${
                          isDK
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                            : 'bg-blue-950 text-blue-400 border border-blue-800/80'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {slate.site}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                        {slate.sport.toUpperCase()}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {slate.startTime}
                    </span>
                  </div>

                  {/* Slate Title */}
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors leading-snug mb-1.5">
                    {slate.name}
                  </h3>

                  {/* Format & Cap */}
                  <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400 mb-3">
                    <span className="font-medium px-2 py-0.5 rounded bg-slate-800/70 text-slate-300">
                      {slate.format}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-emerald-400">
                      ${(slate.salaryCap / 1000).toFixed(0)}K Salary Cap
                    </span>
                    <span>•</span>
                    <span>{slate.gameCount} {slate.gameCount === 1 ? 'Game' : 'Games'}</span>
                  </div>

                  {/* Prize pool callout if available */}
                  {slate.featuredPrizePool && (
                    <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{slate.featuredPrizePool}</span>
                    </div>
                  )}

                  {/* Games Included with Spreads & Over/Unders */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Included Games ({slate.games.length})</span>
                      <span>Vegas Lines</span>
                    </div>

                    <div className="space-y-1.5">
                      {slate.games.slice(0, 3).map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-slate-950/60 border border-slate-800/60"
                        >
                          <div className="flex items-center gap-1.5 font-medium text-slate-200">
                            <span className="font-bold text-white">{g.awayTeam.abbreviation}</span>
                            <span className="text-slate-500">@</span>
                            <span className="font-bold text-white">{g.homeTeam.abbreviation}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({g.gameTime})</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-semibold text-amber-400">{g.spread.text}</span>
                            {g.overUnder > 0 && (
                              <span className="text-slate-400 font-medium">O/U {g.overUnder}</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {slate.games.length > 3 && (
                        <p className="text-[11px] text-slate-400 text-center italic pt-0.5">
                          + {slate.games.length - 3} more games in this slate
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="mt-5 pt-3 border-t border-slate-800/80">
                  <div
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                      isDK
                        ? 'bg-emerald-600 group-hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-blue-600 group-hover:bg-blue-500 text-white shadow-md shadow-blue-950/40'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Build Lineup (with Correlation)
                    </span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
