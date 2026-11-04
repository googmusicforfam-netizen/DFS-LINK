import React, { useState } from 'react';
import { ValuePick, ValueTier } from '../types/dfs';
import { ShieldAlert, TrendingUp, Copy, Check, Flame, Award, DollarSign, Target } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface ValuePicksListProps {
  picks: ValuePick[];
  sport: string;
}

export const ValuePicksList: React.FC<ValuePicksListProps> = ({ picks, sport }) => {
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (picks.length === 0) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-8 text-center text-slate-400 space-y-2">
        <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-sm font-bold text-slate-300">No DFS Value Picks Available</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No games are scheduled for this league today on the official ESPN scoreboard. Player value picks and projections only generate when live games are on today's schedule.
        </p>
      </div>
    );
  }

  // Extract unique positions
  const positions = ['ALL', ...Array.from(new Set(picks.map((p) => p.position)))];

  const filteredPicks = selectedPosition === 'ALL'
    ? picks
    : picks.filter((p) => p.position === selectedPosition);

  const handleCopyPick = (pick: ValuePick) => {
    const text = `${pick.playerName} (${pick.position}, ${pick.team}) ${pick.opponent} | DK: $${pick.salaryDK?.toLocaleString() || 'N/A'} | Proj: ${pick.projectedPoints} FP (${pick.valueMultiplier}x) | Vs Def #${pick.defenseRankAgainstPos}`;
    navigator.clipboard.writeText(text);
    soundManager.playCopyTone();
    setCopiedId(pick.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTierBadge = (tier: ValueTier) => {
    switch (tier) {
      case 'Smash Lock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Flame className="w-3 h-3 fill-rose-400" />
            SMASH LOCK
          </span>
        );
      case 'High Value':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Award className="w-3 h-3" />
            HIGH VALUE
          </span>
        );
      case 'Salary Saver':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <DollarSign className="w-3 h-3" />
            SALARY SAVER
          </span>
        );
      case 'Tournament GPP Sleeper':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Target className="w-3 h-3" />
            GPP SLEEPER
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Position filter pills */}
      {positions.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Pos:
          </span>
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedPosition === pos
                  ? 'bg-slate-200 text-slate-900 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      {/* Picks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredPicks.map((pick) => {
          const isCopied = copiedId === pick.id;

          return (
            <div
              key={pick.id}
              className="bg-slate-800/90 rounded-xl border border-slate-700/80 p-3.5 text-white flex flex-col justify-between hover:border-slate-600 transition-all shadow-sm"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700 text-cyan-300">
                        {pick.position}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-white tracking-tight truncate">
                        {pick.playerName}
                      </h4>
                      <span className="text-xs text-slate-400">
                        {pick.team} <span className="text-slate-500">{pick.opponent}</span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {getTierBadge(pick.tier)}
                  </div>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-2 my-2.5 py-2 px-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-center">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Salary</span>
                    <span className="text-xs sm:text-sm font-bold text-white font-mono">
                      {pick.salaryDK ? `$${pick.salaryDK.toLocaleString()}` : 'N/A'}
                    </span>
                    {pick.salaryFD && (
                      <span className="block text-[9px] text-slate-400">FD: ${pick.salaryFD.toLocaleString()}</span>
                    )}
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Proj FP</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                      {pick.projectedPoints}
                    </span>
                    <span className="block text-[9px] text-emerald-500 font-semibold flex items-center justify-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {pick.valueMultiplier}x Value
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Matchup</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono">
                      Grade {pick.matchupGrade}
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      Opp Def #{pick.defenseRankAgainstPos}
                    </span>
                  </div>
                </div>

                {/* Analysis / Reasoning */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {pick.analysis}
                </p>

                {/* Injury impact note if available */}
                {pick.injuryImpact && (
                  <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{pick.injuryImpact}</span>
                  </div>
                )}
              </div>

              {/* Bottom copy action */}
              <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px] text-slate-400">
                  Vs Def #{pick.defenseRankAgainstPos} (Weak Defense)
                </span>
                <button
                  onClick={() => handleCopyPick(pick)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>Copy Target</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
