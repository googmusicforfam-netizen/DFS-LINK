import React, { useState } from 'react';
import type { InjuryAlert } from '../types/dfs.ts';
import {
  AlertTriangle,
  Flame,
  X,
  VolumeX,
  Copy,
  Check,
  TrendingUp,
  UserCheck,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface BreakingInjuryBannerProps {
  alert: InjuryAlert;
  onDismiss: () => void;
  onOpenLog: () => void;
}

export const BreakingInjuryBanner: React.FC<BreakingInjuryBannerProps> = ({
  alert,
  onDismiss,
  onOpenLog,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyFillIns = () => {
    const text = `🚨 INJURY ALERT: ${alert.playerOut} (${alert.position}, ${alert.teamAbbr}) is RULED OUT! (${alert.gameMatchup} - ${alert.injuryDetail})
⚡ NEXT MAN UP & TOP FILL-IN TARGETS:
${alert.fillIns
  .map(
    (f, idx) =>
      `${idx + 1}. ${f.name} (${f.position}, ${f.team}) - ${f.role} | DK: $${f.salaryDK?.toLocaleString() || 'N/A'} | Expected Mins: ${f.projectedMinutes || 'Expanded'} | Note: ${f.dfsImpactNote}`
  )
  .join('\n')}`;

    navigator.clipboard.writeText(text);
    soundManager.playCopyTone();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPreLock = alert.minutesToStart <= 10;

  return (
    <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 border-y-2 border-rose-500 text-white p-3.5 sm:p-5 shadow-2xl relative animate-in slide-in-from-top duration-300 z-30">
      <div className="max-w-5xl mx-auto space-y-3.5">
        {/* Top Header Row with emergency badges and actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-lg animate-pulse">
              <AlertTriangle className="w-4 h-4 fill-white" />
              BREAKING INJURY ALERT
            </span>

            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-500/30">
              {alert.sportName}
            </span>

            {isPreLock && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 animate-bounce">
                <Clock className="w-3.5 h-3.5" />
                LATE SCRATCH • {alert.minutesToStart}M TO LOCK
              </span>
            )}

            <span className="text-xs text-slate-400 font-medium">
              {alert.gameMatchup} • {alert.timestamp}
            </span>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyFillIns}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy Fill-Ins</span>
                  <span className="sm:hidden">Copy</span>
                </>
              )}
            </button>

            <button
              onClick={onDismiss}
              title="Dismiss banner"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Headline: WHO IS OUT */}
        <div className="bg-rose-950/40 rounded-xl p-3 sm:p-4 border border-rose-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {alert.playerOut}
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-600 text-white">
                {alert.position} • {alert.team} ({alert.teamAbbr})
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                {alert.officialStatus}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-rose-200 font-medium">
              {alert.injuryDetail}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={onOpenLog}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 underline flex items-center gap-1"
            >
              <span>View All Out Alerts in Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Big Colorful Section: FILL-IN BENEFICIARIES / NEXT MAN UP */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>Next Man Up & Fill-In Value Plays (Target Now):</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alert.fillIns.map((fillIn, idx) => (
              <div
                key={idx}
                className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-3 shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300">
                        {fillIn.position}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                        {fillIn.name}
                      </h4>
                      <span className="text-xs text-slate-400">{fillIn.team}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {fillIn.role}
                    </span>
                  </div>

                  {/* Metrics: Salary and Minutes */}
                  <div className="flex items-center gap-3 my-2 text-xs text-slate-300 font-medium">
                    {fillIn.salaryDK && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono font-bold text-emerald-400">
                        DK: ${fillIn.salaryDK.toLocaleString()}
                      </span>
                    )}
                    {fillIn.salaryFD && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300">
                        FD: ${fillIn.salaryFD.toLocaleString()}
                      </span>
                    )}
                    {fillIn.projectedMinutes && (
                      <span className="text-amber-300 flex items-center gap-1 font-semibold text-[11px]">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        {fillIn.projectedMinutes}
                      </span>
                    )}
                  </div>

                  {/* Impact Note */}
                  <p className="text-xs text-slate-200 leading-snug">
                    {fillIn.dfsImpactNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
