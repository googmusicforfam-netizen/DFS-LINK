import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RefreshCw, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onOpenPasteModal: () => void;
  onOpenCopyBoard: () => void;
  onOpenAlertsLog: () => void;
  unreadAlertsCount: number;
  lastUpdated: string;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isLoading,
  onOpenPasteModal,
  onOpenCopyBoard,
  onOpenAlertsLog,
  unreadAlertsCount,
  lastUpdated,
}) => {
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());

  useEffect(() => {
    setSoundOn(soundManager.isEnabled());
  }, []);

  const handleToggleSound = () => {
    const nextState = soundManager.toggle();
    setSoundOn(nextState);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 font-black tracking-wider text-sm shadow-inner">
              DFS
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight text-white truncate">
                  Daily DFS Edge
                </h1>
                <span className="hidden xs:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  FREE SOURCES
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Vegas Spreads • O/U Totals • Value Picks
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Injury Wire Alert Log button */}
            <button
              onClick={onOpenAlertsLog}
              title="View recent injury and inactive alerts log"
              aria-label="View injury alerts"
              className="relative px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-rose-500/50"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="hidden sm:inline">Injury Wire</span>
              <span className="sm:hidden">Injuries</span>
              {unreadAlertsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-rose-700">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Put text on screen / Paste button */}
            <button
              onClick={onOpenPasteModal}
              title="Put text on screen or paste slate text"
              aria-label="Put text on screen"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Paste Slate</span>
              <span className="md:hidden">Paste</span>
            </button>

            {/* View Full Copy Screen button */}
            <button
              onClick={onOpenCopyBoard}
              title="View full clean text board for 1-tap copy"
              aria-label="View copy board"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Screen Copy Board</span>
              <span className="sm:hidden">Copy Board</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundOn ? 'Sound alerts enabled (Click to mute)' : 'Sound alerts muted (Click to enable)'}
              aria-label={soundOn ? 'Mute sound alerts' : 'Enable sound alerts'}
              className={`p-2 rounded-lg border transition-all active:scale-95 flex items-center gap-1 ${
                soundOn
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
              }`}
            >
              {soundOn ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-semibold hidden md:inline">Alerts ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-semibold hidden md:inline">Muted</span>
                </>
              )}
            </button>

            {/* Live Search Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh live Vegas lines and research"
              aria-label="Refresh slate data"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status subheader */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">{lastUpdated}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 shrink-0">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Zero Paid APIs • ESPN/Rotowire/Reddit</span>
          </div>
        </div>
      </div>
    </header>
  );
};
