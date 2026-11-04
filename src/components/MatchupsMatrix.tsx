import React from 'react';
import { MatchupVulnerability } from '../types/dfs';
import { ShieldAlert, Users, Zap, CheckCircle2 } from 'lucide-react';

interface MatchupsMatrixProps {
  matchups: MatchupVulnerability[];
}

export const MatchupsMatrix: React.FC<MatchupsMatrixProps> = ({ matchups }) => {
  if (matchups.length === 0) {
    return (
      <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-4 text-center text-slate-400 text-xs">
        No extreme defensive vulnerabilities flagged for this slate.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matchups.map((m) => (
          <div
            key={m.id}
            className="bg-slate-800/90 rounded-xl border border-slate-700/80 p-3.5 text-white flex flex-col justify-between hover:border-slate-600 transition-all shadow-sm"
          >
            <div>
              {/* Target Defense Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      TARGET DEFENSE
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Rank #{m.defenseRank}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-white tracking-tight mt-1">
                    {m.targetTeam}
                  </h4>
                  <p className="text-xs text-rose-300/90 font-medium mt-0.5">
                    Weakness vs: <span className="text-white font-semibold">{m.position}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Opponent
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {m.opponentTeam}
                  </span>
                </div>
              </div>

              {/* Vulnerability stat banner */}
              <div className="mt-2.5 p-2 rounded-lg bg-rose-950/30 border border-rose-800/30 text-xs text-rose-200">
                <span className="font-semibold text-rose-300">Defense Metric:</span> {m.pointsAllowedStat}
              </div>

              {/* Reason */}
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {m.reason}
              </p>

              {/* Beneficiary Players */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>Key DFS Beneficiaries</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.beneficiaryPlayers.map((player, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-900 text-emerald-300 border border-slate-700"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {player}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pace rating footer */}
            {m.paceRating && (
              <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center gap-1.5 text-[11px] text-cyan-300">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Pace Expectation: {m.paceRating}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
