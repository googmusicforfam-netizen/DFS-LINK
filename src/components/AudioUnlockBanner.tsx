import React from 'react';
import { Volume2, VolumeX, BellRing, Sparkles, CheckCircle2 } from 'lucide-react';

interface AudioUnlockBannerProps {
  isUnlocked: boolean;
  onUnlock: () => void;
  onTestSiren: () => void;
  isUrgentPreLock: boolean;
  lastCheckedTime: string;
}

export const AudioUnlockBanner: React.FC<AudioUnlockBannerProps> = ({
  isUnlocked,
  onUnlock,
  onTestSiren,
  isUrgentPreLock,
  lastCheckedTime,
}) => {
  return (
    <div
      className={`border-b transition-colors px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 ${
        !isUnlocked
          ? 'bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 border-amber-500/40 text-amber-200 shadow-md'
          : isUrgentPreLock
          ? 'bg-slate-900/95 border-emerald-500/30 text-slate-300'
          : 'bg-slate-900/90 border-slate-800 text-slate-400'
      }`}
    >
      {/* Left info */}
      <div className="flex items-center gap-2 min-w-0">
        {!isUnlocked ? (
          <>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div className="truncate">
              <span className="font-extrabold text-amber-300 uppercase tracking-wider mr-1.5">
                Sound Alerts Locked by Browser:
              </span>
              <span className="text-amber-100 hidden sm:inline">
                Tap once below so loud sirens can wake you up when a player is ruled OUT!
              </span>
              <span className="text-amber-100 sm:hidden">
                Tap once to enable loud OUT sirens!
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              SIRENS READY
            </span>
            <span className="truncate text-slate-300 text-[11px]">
              {isUrgentPreLock ? (
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  Pre-Lock Rapid Polling (Checked {lastCheckedTime} • checking every 10s)
                </span>
              ) : (
                <span>Auto-monitoring inactives (Checked {lastCheckedTime})</span>
              )}
            </span>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {!isUnlocked ? (
          <button
            onClick={onUnlock}
            className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 animate-pulse"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Tap Once To Enable Siren</span>
          </button>
        ) : (
          <button
            onClick={onTestSiren}
            title="Test the loud injury siren alert"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition-all active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Siren</span>
          </button>
        )}
      </div>
    </div>
  );
};
