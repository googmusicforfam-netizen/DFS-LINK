import React, { useState } from 'react';
import type { InjuryAlert, Sport } from '../types/dfs.ts';
import {
  X,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  TrendingUp,
  Trash2,
  BellRing,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface AlertsLogModalProps {
  alerts: InjuryAlert[];
  onClose: () => void;
  onClear: () => void;
  onSimulate: (sport: Sport) => void;
}

export const AlertsLogModal: React.FC<AlertsLogModalProps> = ({
  alerts,
  onClose,
  onClear,
  onSimulate,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sportsFilterList = ['ALL', 'nba', 'nfl', 'nhl', 'cbb', 'cfb', 'mlb'];

  const filteredAlerts =
    selectedSport === 'ALL'
      ? alerts
      : alerts.filter((a) => a.sport.toLowerCase() === selectedSport.toLowerCase());

  const handleCopyAlert = (alert: InjuryAlert) => {
    const text = `🚨 [${alert.sportName.toUpperCase()}] ${alert.playerOut} (${alert.position}, ${alert.teamAbbr}) RULED OUT (${alert.injuryDetail})
Matchup: ${alert.gameMatchup} (${alert.gameTime})
⚡ FILL-IN BENEFICIARIES:
${alert.fillIns
  .map(
    (f) =>
      `• ${f.name} (${f.position}, ${f.team}) - ${f.role} | DK: $${f.salaryDK?.toLocaleString() || 'N/A'} | ${f.projectedMinutes || 'Extra Mins'} | Note: ${f.dfsImpactNote}`
  )
  .join('\n')}`;

    navigator.clipboard.writeText(text);
    soundManager.playCopyTone();
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Injury Wire & Inactive Alert Log
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                  {alerts.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chronological log of players ruled OUT and their depth chart replacements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => soundManager.playLoudInjurySiren()}
              title="Test loud injury alert siren"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-slate-700"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action strip: Sport filters and test simulation button */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          {/* Sport filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {sportsFilterList.map((sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all ${
                  selectedSport === sport
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>

          {/* Test simulation button */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() =>
                onSimulate(
                  selectedSport !== 'ALL' ? (selectedSport as Sport) : 'nba'
                )
              }
              className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Late Scratch</span>
            </button>

            {alerts.length > 0 && (
              <button
                onClick={onClear}
                title="Clear alerts log"
                className="p-1 rounded-md text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Alert Cards List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3 bg-slate-950">
          {filteredAlerts.map((alert) => {
            const isPreLock = alert.minutesToStart <= 10;
            const isCopied = copiedId === alert.id;

            return (
              <div
                key={alert.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 hover:border-slate-700 transition-all shadow-sm space-y-3"
              >
                {/* Alert Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 uppercase">
                      {alert.sportName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                      {alert.officialStatus}
                    </span>
                    {isPreLock && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alert.minutesToStart}M TO LOCK
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {alert.gameMatchup} • {alert.timestamp}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyAlert(alert)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Fill-Ins</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Player OUT name */}
                <div className="bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/30">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-white">
                      {alert.playerOut}
                    </span>
                    <span className="text-xs text-rose-300 font-semibold">
                      ({alert.position}, {alert.team})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {alert.injuryDetail}
                  </p>
                </div>

                {/* Fill-ins & Replacements */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    ⚡ Replacements & Next Man Up:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {alert.fillIns.map((fillIn, fIdx) => (
                      <div
                        key={fIdx}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white">
                            {fillIn.name} ({fillIn.position})
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                            {fillIn.role}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 my-1 text-[11px] text-slate-400">
                          {fillIn.salaryDK && (
                            <span className="font-mono text-emerald-400 font-bold">
                              DK: ${fillIn.salaryDK.toLocaleString()}
                            </span>
                          )}
                          {fillIn.projectedMinutes && (
                            <span className="text-amber-300">
                              {fillIn.projectedMinutes}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug">
                          {fillIn.dfsImpactNote}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No injury alerts found for {selectedSport.toUpperCase()}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
