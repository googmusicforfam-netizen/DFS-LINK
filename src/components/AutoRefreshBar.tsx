import React from 'react';
import { RefreshCw, Play, Pause, Clock, Calendar, Zap, AlertCircle } from 'lucide-react';
import { ScheduleTimingResult } from '../utils/scheduleTiming.ts';

interface AutoRefreshBarProps {
  isEnabled: boolean;
  onToggle: () => void;
  secondsRemaining: number;
  lastUpdatedTime: string;
  isRefreshing: boolean;
  onManualRefresh: () => void;
  sportName: string;
  timing: ScheduleTimingResult;
}

export const AutoRefreshBar: React.FC<AutoRefreshBarProps> = ({
  isEnabled,
  onToggle,
  secondsRemaining,
  lastUpdatedTime,
  isRefreshing,
  onManualRefresh,
  sportName,
  timing,
}) => {
  const maxSeconds = timing.intervalSeconds || 60;
  // Calculate percentage of the active interval (60s or 300s)
  const percentComplete = Math.max(0, Math.min(100, ((maxSeconds - secondsRemaining) / maxSeconds) * 100));

  // Format seconds into "Xm Ys" or "Xs"
  const formatTimeRemaining = (totalSecs: number) => {
    if (totalSecs >= 60) {
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      return `${mins}m ${secs}s`;
    }
    return `${totalSecs}s`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 text-xs shadow-md space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Status & Timestamps */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : isEnabled ? (
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    timing.mode === 'ACTIVE_SLATE_1MIN' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    timing.mode === 'ACTIVE_SLATE_1MIN' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            )}
          </div>

          <div className="truncate">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>Adaptive Schedule Refresh:</span>
                {isEnabled ? (
                  <span
                    className={`font-black uppercase tracking-wider px-2 py-0.5 rounded text-[10px] ${
                      timing.mode === 'ACTIVE_SLATE_1MIN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {timing.intervalLabel} Cadence ({timing.mode === 'ACTIVE_SLATE_1MIN' ? 'Action Window' : 'Pre-Game'})
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-800 text-[10px]">
                    PAUSED
                  </span>
                )}
              </span>

              {isEnabled && !isRefreshing && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                  Next update in {formatTimeRemaining(secondsRemaining)}
                </span>
              )}

              {isRefreshing && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 animate-pulse">
                  Syncing lineups, injuries & odds...
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Last updated at <strong className="text-slate-200 font-mono">{lastUpdatedTime}</strong>
              </span>
              <span className="hidden md:inline">• No reload • Starts adaptively</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Pause / Resume toggle */}
          <button
            onClick={onToggle}
            title={isEnabled ? 'Pause auto-refresh' : 'Resume auto-refresh'}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              isEnabled
                ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
            }`}
          >
            {isEnabled ? (
              <>
                <Pause className="w-3 h-3 text-slate-400" />
                <span className="hidden xs:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Immediate manual refresh */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Update Now</span>
          </button>
        </div>
      </div>

      {/* Dynamic Schedule Banner Explanation */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {timing.earliestGame ? (
              <>
                Earliest Today: <strong className="text-white font-mono">{timing.earliestGame.timeStr}</strong>{' '}
                <span className="text-slate-500">({timing.earliestGame.matchup})</span>
                {timing.latestGame && (
                  <>
                    {' '}• Last Start: <strong className="text-white font-mono">{timing.latestGame.timeStr}</strong>
                  </>
                )}
              </>
            ) : (
              'Reading schedule start times...'
            )}
          </span>
        </div>

        <div className="text-[10px] font-medium text-slate-400">
          {timing.mode === 'PRE_GAME_5MIN' && (
            <span className="text-amber-300/90 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              5m cadence until 30m before first tip-off/kickoff (switches to 1m)
            </span>
          )}
          {timing.mode === 'ACTIVE_SLATE_1MIN' && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              1m rapid cadence active through last game start
            </span>
          )}
          {timing.mode === 'POST_SLATE_5MIN' && (
            <span className="text-slate-400">
              Post-game slate mode (5m cadence)
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar for Countdown */}
      {isEnabled && (
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              timing.mode === 'ACTIVE_SLATE_1MIN' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      )}
    </div>
  );
};
