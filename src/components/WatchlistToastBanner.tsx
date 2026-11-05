import React from 'react';
import type { WatchlistNotificationEvent } from '../types/watchlist.ts';
import { Star, AlertTriangle, DollarSign, X, ArrowRight } from 'lucide-react';

interface WatchlistToastBannerProps {
  alert: WatchlistNotificationEvent;
  onDismiss: () => void;
  onOpenWatchlist: () => void;
}

export function WatchlistToastBanner({
  alert,
  onDismiss,
  onOpenWatchlist,
}: WatchlistToastBannerProps) {
  const isInjury = alert.type === 'INJURY';

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div
        className={`rounded-2xl p-3.5 shadow-2xl border text-white flex items-start justify-between gap-3 backdrop-blur-md ${
          isInjury
            ? 'bg-rose-950/95 border-rose-600/80 ring-2 ring-rose-500/40'
            : 'bg-emerald-950/95 border-emerald-600/80 ring-2 ring-emerald-500/40'
        }`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isInjury ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isInjury ? <AlertTriangle className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                <Star className="w-3 h-3 fill-slate-950" />
                WATCHLIST ALERT
              </span>
              <span className="text-xs font-semibold text-slate-300">{alert.timestamp}</span>
            </div>

            <h4 className="font-black text-sm text-white mt-0.5 truncate">{alert.title}</h4>
            <p className="text-xs text-slate-200 mt-0.5 leading-snug">{alert.message}</p>

            <button
              onClick={() => {
                onOpenWatchlist();
                onDismiss();
              }}
              className="mt-2 text-xs font-bold text-amber-300 hover:text-white underline flex items-center gap-1"
            >
              <span>View Watchlist</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
