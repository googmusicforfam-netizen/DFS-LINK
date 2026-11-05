import React, { useState } from 'react';
import type { WatchedPlayer, WatchlistNotificationEvent } from '../types/watchlist.ts';
import type { Sport } from '../types/dfs.ts';
import {
  Star,
  Bell,
  BellRing,
  BellOff,
  DollarSign,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Search,
  Clock,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface WatchlistModalProps {
  watchlist: WatchedPlayer[];
  notificationHistory: WatchlistNotificationEvent[];
  browserPermission: NotificationPermission;
  onRequestPermission: () => Promise<NotificationPermission>;
  onRemovePlayer: (playerId: string) => void;
  onClearAll: () => void;
  onClearHistory: () => void;
  onSimulateInjury: (playerId?: string) => void;
  onSimulatePriceChange: (playerId?: string) => void;
  onSendTestNotification: () => void;
  onClose: () => void;
}

export function WatchlistModal({
  watchlist,
  notificationHistory,
  browserPermission,
  onRequestPermission,
  onRemovePlayer,
  onClearAll,
  onClearHistory,
  onSimulateInjury,
  onSimulatePriceChange,
  onSendTestNotification,
  onClose,
}: WatchlistModalProps) {
  const [activeTab, setActiveTab] = useState<'PLAYERS' | 'HISTORY'>('PLAYERS');
  const [sportFilter, setSportFilter] = useState<'ALL' | Sport>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPlayers = watchlist.filter((p) => {
    if (sportFilter !== 'ALL' && p.sport !== sportFilter) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableSports = Array.from(new Set(watchlist.map((p) => p.sport)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  Player Watchlist
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {watchlist.length} Starred
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Starred players trigger immediate browser notifications on injury status or salary shifts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Browser Notification Status Bar */}
        <div className="px-5 py-3 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {browserPermission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                Browser Notifications: Active
              </span>
            ) : browserPermission === 'denied' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                <BellOff className="w-3.5 h-3.5 text-red-400" />
                Browser Notifications: Blocked in Settings
              </span>
            ) : (
              <button
                onClick={onRequestPermission}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md animate-pulse"
              >
                <Bell className="w-3.5 h-3.5" />
                Enable Browser Notifications
              </button>
            )}
            <span className="text-slate-400 hidden sm:inline text-[11px]">
              (Delivers desktop & lockscreen popups)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSendTestNotification}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Bell className="w-3 h-3 text-amber-400" />
              Test Browser Popup
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search Bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('PLAYERS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'PLAYERS'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Watched Players ({watchlist.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alerts Log ({notificationHistory.length})
            </button>
          </div>

          {activeTab === 'PLAYERS' && (
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search watched player..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'PLAYERS' && (
            <>
              {/* Sport Filter Badges */}
              {availableSports.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Sport:
                  </span>
                  <button
                    onClick={() => setSportFilter('ALL')}
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border transition-all ${
                      sportFilter === 'ALL'
                        ? 'bg-slate-800 text-white border-slate-700'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    All ({watchlist.length})
                  </button>
                  {availableSports.map((sp) => (
                    <button
                      key={sp}
                      onClick={() => setSportFilter(sp)}
                      className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                        sportFilter === sp
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'text-slate-400 border-transparent hover:text-slate-200'
                      }`}
                    >
                      {sp} ({watchlist.filter((p) => p.sport === sp).length})
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {filteredPlayers.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
                  <Star className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                  <h3 className="text-base font-bold text-white mb-1">Watchlist Empty</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Star players across the Value Picks table, Today's Slates Lineup Builder, or Injury Beneficiaries to monitor their status in real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredPlayers.map((player) => {
                    const isOut = player.status === 'OUT' || player.status === 'LATE SCRATCH' || player.status === 'INACTIVE';
                    const isBeneficiary = player.status === 'BENEFICIARY';
                    const hasPriceChange = !!player.priceChangeDK && player.priceChangeDK !== 0;

                    return (
                      <div
                        key={player.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isOut
                            ? 'bg-rose-950/30 border-rose-800/80'
                            : isBeneficiary
                            ? 'bg-indigo-950/30 border-indigo-800/80'
                            : 'bg-slate-850 border-slate-800'
                        }`}
                      >
                        {/* Player Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                              <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                                {player.name}
                              </h4>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300">
                                {player.position}
                              </span>
                              <span className="text-xs font-semibold text-slate-300">
                                {player.team}
                              </span>
                            </div>

                            {player.gameMatchup && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Matchup: <strong className="text-slate-300">{player.gameMatchup}</strong>
                                {player.gameTime && <span> • {player.gameTime}</span>}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => onRemovePlayer(player.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Remove from watchlist"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Status Alert Badge */}
                        <div className="mb-2.5">
                          {isOut ? (
                            <div className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{player.status}: {player.injuryNote || 'Ruled OUT for tonight'}</span>
                            </div>
                          ) : isBeneficiary ? (
                            <div className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>BENEFICIARY: {player.beneficiaryNote || 'Elevated usage/minutes'}</span>
                            </div>
                          ) : (
                            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Active & Healthy</span>
                            </div>
                          )}
                        </div>

                        {/* DFS Salaries & Price Change */}
                        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-3">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">DraftKings</span>
                            <span className="font-extrabold text-white text-sm">
                              ${player.salaryDK.toLocaleString()}
                            </span>
                          </div>

                          {/* Price Change indicator */}
                          {hasPriceChange && (
                            <div className="text-center px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">
                                Price Shift
                              </span>
                              <span
                                className={`font-black text-xs inline-flex items-center gap-0.5 ${
                                  (player.priceChangeDK || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {(player.priceChangeDK || 0) > 0 ? (
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDownRight className="w-3.5 h-3.5" />
                                )}
                                {(player.priceChangeDK || 0) > 0 ? '+' : ''}${player.priceChangeDK?.toLocaleString()}
                              </span>
                            </div>
                          )}

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-semibold">FanDuel</span>
                            <span className="font-extrabold text-white text-sm">
                              ${player.salaryFD.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Test Notification Triggers */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            Test Triggers:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onSimulateInjury(player.id)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1"
                              title="Test browser notification when this player is ruled OUT"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Rule OUT Alert
                            </button>
                            <button
                              onClick={() => onSimulatePriceChange(player.id)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1"
                              title="Test browser notification when this player's salary shifts"
                            >
                              <DollarSign className="w-3 h-3 text-emerald-400" />
                              Price Shift
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>Recent Watchlist Notifications Log</span>
                {notificationHistory.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear History
                  </button>
                )}
              </div>

              {notificationHistory.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No notifications recorded yet. Star players and test an injury or price shift alert to see notifications log here!
                </div>
              ) : (
                <div className="space-y-2">
                  {notificationHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        item.type === 'INJURY'
                          ? 'bg-rose-950/30 border-rose-900/60 text-rose-200'
                          : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black px-1.5 py-0.2 rounded text-[10px] uppercase ${
                              item.type === 'INJURY'
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="font-bold text-white text-xs">{item.title}</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{item.message}</p>
                      </div>

                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {item.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {watchlist.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-slate-400 hover:text-red-400 transition-colors font-semibold flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Watchlist
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
