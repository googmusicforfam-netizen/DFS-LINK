import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Sport, SlateData } from './types/dfs.ts';
import { FALLBACK_SLATES } from './data/fallbackSlates.ts';
import { Header } from './components/Header.tsx';
import { SportTabs } from './components/SportTabs.tsx';
import { GameCard } from './components/GameCard.tsx';
import { ValuePicksList } from './components/ValuePicksList.tsx';
import { MatchupsMatrix } from './components/MatchupsMatrix.tsx';
import { ScreenCopyBoard } from './components/ScreenCopyBoard.tsx';
import { PasteSlateModal } from './components/PasteSlateModal.tsx';
import { GroundingSourcesBar } from './components/GroundingSourcesBar.tsx';
import { AudioUnlockBanner } from './components/AudioUnlockBanner.tsx';
import { BreakingInjuryBanner } from './components/BreakingInjuryBanner.tsx';
import { AlertsLogModal } from './components/AlertsLogModal.tsx';
import { AutoRefreshBar } from './components/AutoRefreshBar.tsx';
import { InjuryBeneficiariesView } from './components/InjuryBeneficiariesView.tsx';
import { useInjuryPoller } from './hooks/useInjuryPoller.ts';
import { soundManager } from './utils/audio.ts';
import { computeAdaptiveRefreshSchedule } from './utils/scheduleTiming.ts';
import { extractBeneficiariesFromAlerts } from './utils/beneficiaries.ts';
import {
  Calendar,
  Flame,
  Award,
  ShieldAlert,
  FileText,
  Search,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Clock,
  BellRing,
  Zap,
} from 'lucide-react';

export default function App() {
  const [currentSport, setCurrentSport] = useState<Sport>('nba');
  const [slates, setSlates] = useState<Record<Sport, SlateData>>(FALLBACK_SLATES);
  const slateData = slates[currentSport];
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'games' | 'values' | 'matchups' | 'beneficiaries' | 'injuries' | 'text'>('games');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCopyBoard, setShowCopyBoard] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [quickCopied, setQuickCopied] = useState<boolean>(false);

  // Clock tick to re-evaluate schedule window relative to game start times
  const [currentTimeTick, setCurrentTimeTick] = useState<number>(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setCurrentTimeTick(Date.now()), 20000);
    return () => clearInterval(tick);
  }, []);

  // Compute adaptive refresh timing dynamically from the start times of all games on today's schedule
  const scheduleTiming = useMemo(
    () => computeAdaptiveRefreshSchedule(slateData.games, new Date(currentTimeTick)),
    [slateData.games, currentTimeTick]
  );

  // Auto-refresh state adapting to schedule
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(scheduleTiming.intervalSeconds);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
  );
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(false);

  // Clamp countdown if interval changes (e.g. from 300s to 60s when entering 30-min pre-game window)
  useEffect(() => {
    setSecondsRemaining((prev) => Math.min(prev, scheduleTiming.intervalSeconds));
  }, [scheduleTiming.intervalSeconds]);

  // Automated adaptive injury poller hook with loud siren & pre-lock monitoring
  const {
    alerts,
    activeBannerAlert,
    unreadCount,
    setUnreadCount,
    isPreLockUrgent,
    lastCheckedTime,
    audioUnlocked,
    handleUnlockAudio,
    handleTestSiren,
    simulateLateScratch,
    dismissBanner,
    clearAlertsLog,
    pollInjuries,
  } = useInjuryPoller(currentSport);

  // Game counts from ESPN scoreboard for today
  const [todayGameCounts, setTodayGameCounts] = useState<Record<Sport, number>>({
    nba: 14,
    nfl: 0,
    nhl: 4,
    cbb: 26,
    cfb: 3,
    mlb: 0,
  });

  const fetchScheduleOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/dfs/schedule-overview');
      if (res.ok) {
        const data = await res.json();
        if (data.gameCounts) {
          setTodayGameCounts(data.gameCounts);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch slate from backend with ESPN scoreboard
  const fetchSlate = useCallback(
    async (sport: Sport, forceRefresh: boolean = false) => {
      setIsLoading(true);
      try {
        const url = `/api/dfs/slate?sport=${sport}${forceRefresh ? '&refresh=true' : ''}`;
        const response = await fetch(url);
        if (response.ok) {
          const data: SlateData = await response.json();
          setSlates((prev) => ({ ...prev, [sport]: data }));
          setTodayGameCounts((prev) => ({ ...prev, [sport]: data.games.length }));
          if (forceRefresh) {
            soundManager.playChime(587.33, 880.0);
          }
        }
      } catch (err) {
        console.warn('Live slate fetch handled with cached consensus:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial load: fetch overview and initial ESPN slate
  useEffect(() => {
    fetchScheduleOverview();
    fetchSlate('nba', false);
  }, [fetchScheduleOverview, fetchSlate]);

  // Unified auto-refresh runner: refetches sports slate, injuries & lineups without page reload
  const runAutoRefresh = useCallback(
    async (forceLive: boolean = false) => {
      setIsAutoRefreshing(true);
      try {
        await Promise.allSettled([
          fetchSlate(currentSport, forceLive),
          fetchScheduleOverview(),
          pollInjuries(),
        ]);
        const nowStr = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastUpdatedTime(nowStr);
        setSecondsRemaining(scheduleTiming.intervalSeconds);
      } finally {
        setIsAutoRefreshing(false);
      }
    },
    [currentSport, fetchSlate, fetchScheduleOverview, pollInjuries, scheduleTiming.intervalSeconds]
  );

  // Adaptive Auto-Refresh Countdown Loop:
  // - Until 30 minutes before earliest game start time: 5 minutes (300s)
  // - From 30 minutes before earliest game until last game starts: 1 minute (60s)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          runAutoRefresh(false);
          return scheduleTiming.intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, runAutoRefresh, scheduleTiming.intervalSeconds]);

  const handleRefresh = () => {
    runAutoRefresh(true);
  };

  const handleSelectSport = (sport: Sport) => {
    setCurrentSport(sport);
    setSearchQuery('');
    fetchSlate(sport, false);
  };

  // Quick copy active slate summary
  const handleQuickCopySlate = () => {
    navigator.clipboard.writeText(slateData.rawTextSummary);
    soundManager.playCopyTone();
    setQuickCopied(true);
    setTimeout(() => setQuickCopied(false), 2000);
  };

  // Filter games based on search
  const filteredGames = slateData.games.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.awayTeam.name.toLowerCase().includes(q) ||
      g.awayTeam.abbreviation.toLowerCase().includes(q) ||
      g.homeTeam.name.toLowerCase().includes(q) ||
      g.homeTeam.abbreviation.toLowerCase().includes(q)
    );
  });

  // Filter value picks based on search
  const filteredValuePicks = slateData.valuePicks.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.playerName.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      p.analysis.toLowerCase().includes(q)
    );
  });

  // Filter injury alerts based on search & current tab
  const filteredAlerts = alerts.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.playerOut.toLowerCase().includes(q) ||
      a.team.toLowerCase().includes(q) ||
      a.teamAbbr.toLowerCase().includes(q) ||
      a.injuryDetail.toLowerCase().includes(q) ||
      a.fillIns.some((f) => f.name.toLowerCase().includes(q))
    );
  });

  // Extract all injury beneficiaries across active alerts
  const allBeneficiaries = useMemo(() => {
    return extractBeneficiariesFromAlerts(alerts);
  }, [alerts]);
  const totalBeneficiariesCount = allBeneficiaries.length;

  // Calculate highest game total
  const highestTotalGame = slateData.games.reduce<typeof slateData.games[0] | null>(
    (highest, current) => {
      if (!highest || current.overUnder > highest.overUnder) {
        return current;
      }
      return highest;
    },
    null
  );

  // Best value pick
  const topValuePick = slateData.valuePicks[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 sm:pb-8">
      {/* 1-Tap Browser Audio Authorization & Status Banner */}
      <AudioUnlockBanner
        isUnlocked={audioUnlocked}
        onUnlock={handleUnlockAudio}
        onTestSiren={handleTestSiren}
        isUrgentPreLock={isPreLockUrgent}
        lastCheckedTime={lastCheckedTime}
      />

      {/* Breaking Injury OUT Alert Big Top Banner */}
      {activeBannerAlert && (
        <BreakingInjuryBanner
          alert={activeBannerAlert}
          onDismiss={dismissBanner}
          onOpenLog={() => {
            setShowAlertsModal(true);
            setUnreadCount(0);
          }}
          onOpenBeneficiaries={() => setActiveTab('beneficiaries')}
        />
      )}

      {/* App Header */}
      <Header
        onRefresh={handleRefresh}
        isLoading={isAutoRefreshing || isLoading}
        onOpenPasteModal={() => setShowPasteModal(true)}
        onOpenCopyBoard={() => setShowCopyBoard(true)}
        onOpenAlertsLog={() => {
          setShowAlertsModal(true);
          setUnreadCount(0);
        }}
        unreadAlertsCount={unreadCount}
        lastUpdated={`Live Synced at ${lastUpdatedTime}`}
      />

      {/* Sport Selector Tabs */}
      <SportTabs
        currentSport={currentSport}
        onSelectSport={handleSelectSport}
        gameCounts={todayGameCounts}
      />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 flex-1 space-y-4">
        {/* Adaptive Schedule Auto-Refresh Bar with Live Countdown and Timestamp */}
        <AutoRefreshBar
          isEnabled={autoRefreshEnabled}
          onToggle={() => setAutoRefreshEnabled((prev) => !prev)}
          secondsRemaining={secondsRemaining}
          lastUpdatedTime={lastUpdatedTime}
          isRefreshing={isAutoRefreshing || isLoading}
          onManualRefresh={() => runAutoRefresh(false)}
          sportName={slateData.sportName}
          timing={scheduleTiming}
        />

        {/* Quick Slate Summary Strip */}
        <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                {slateData.sportName} Slate Intel
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {slateData.dateStr}
              </span>
              {isLoading && (
                <span className="text-[11px] text-amber-400 animate-pulse font-medium">
                  • Searching Google Grounding...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed truncate-2-lines">
              {slateData.slateNote}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Quick Simulate Button for Testing Out Alerts */}
            <button
              onClick={() => simulateLateScratch(currentSport)}
              title="Test the injury alert feature: rules a player OUT with loud siren and top banner"
              className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-rose-500/40 transition-all active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate OUT Alert</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-50 active:scale-95"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Searching...' : 'Live Lines'}</span>
            </button>

            <button
              onClick={handleQuickCopySlate}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              {quickCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied All!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>1-Tap Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Metric Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Total Games */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Games On Slate
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white">
                {slateData.games.length} Games
              </span>
            </div>
          </div>

          {/* Highest Total */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Top Game Total
              </span>
              <span className="text-sm sm:text-base font-extrabold text-amber-300 truncate block">
                {highestTotalGame && highestTotalGame.overUnder > 0
                  ? `O/U ${highestTotalGame.overUnder}`
                  : 'Off Today'}
              </span>
            </div>
          </div>

          {/* Top Value Play */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Top Value Lock
              </span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-400 truncate block">
                {topValuePick ? `${topValuePick.playerName} (${topValuePick.valueMultiplier}x)` : 'No Slate'}
              </span>
            </div>
          </div>

          {/* Injury Beneficiaries count */}
          <div
            onClick={() => setActiveTab('beneficiaries')}
            className={`bg-slate-900/80 rounded-xl border p-2.5 flex items-center gap-2.5 cursor-pointer transition-all ${
              activeTab === 'beneficiaries'
                ? 'border-indigo-500 shadow-md shadow-indigo-500/10 bg-indigo-950/20'
                : 'border-indigo-500/30 hover:border-indigo-400'
            }`}
          >
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                Beneficiaries
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white">
                {totalBeneficiariesCount} Targets
              </span>
            </div>
          </div>

          {/* Inactive & Injury Alerts count */}
          <div
            onClick={() => {
              setShowAlertsModal(true);
              setUnreadCount(0);
            }}
            className="bg-slate-900/80 rounded-xl border border-rose-500/30 p-2.5 flex items-center gap-2.5 cursor-pointer hover:border-rose-400 transition-all"
          >
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-rose-300 tracking-wider flex items-center gap-1">
                <span>Injury Wire</span>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                )}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-rose-300">
                {alerts.length} Inactives
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Tabs & Search Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('games')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'games'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule & Vegas ({slateData.games.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('values')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'values'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Value Picks ({slateData.valuePicks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('matchups')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'matchups'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Matchups ({slateData.matchups.length})</span>
            </button>

            {/* Injury Beneficiaries Tab */}
            <button
              onClick={() => setActiveTab('beneficiaries')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'beneficiaries'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Injury Beneficiaries</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  activeTab === 'beneficiaries'
                    ? 'bg-indigo-900/90 text-white'
                    : 'bg-slate-800 text-indigo-300'
                }`}
              >
                {totalBeneficiariesCount}
              </span>
            </button>

            {/* Injury Alerts Inline Tab */}
            <button
              onClick={() => setActiveTab('injuries')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'injuries'
                  ? 'bg-rose-950/80 text-rose-300 shadow-sm border border-rose-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Injury Wire ({alerts.length})</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'text'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Screen Copy</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team or player..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* View Section 1: Games & Vegas Odds */}
        {activeTab === 'games' && (
          <div className="space-y-3">
            {slateData.games.length === 0 ? (
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-400">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    No {slateData.sportName} Games Scheduled Today
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ESPN's official public scoreboard reports 0 games scheduled for today ({slateData.dateStr}).
                    DFS value picks, spreads, totals, and player projections only generate for leagues with live games on today's schedule.
                  </p>
                </div>

                {slateData.nextGameNotice && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-300 font-medium">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{slateData.nextGameNotice}</span>
                  </div>
                )}

                {/* Quick switcher to active slates */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                    Switch to Leagues With Games Today:
                  </span>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {todayGameCounts.nba > 0 && (
                      <button
                        onClick={() => handleSelectSport('nba')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>🏀 NBA</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px]">
                          {todayGameCounts.nba} Games
                        </span>
                      </button>
                    )}
                    {todayGameCounts.cbb > 0 && (
                      <button
                        onClick={() => handleSelectSport('cbb')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>⛹️ College Basketball</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px]">
                          {todayGameCounts.cbb} Games
                        </span>
                      </button>
                    )}
                    {todayGameCounts.nhl > 0 && (
                      <button
                        onClick={() => handleSelectSport('nhl')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>🏒 NHL</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px]">
                          {todayGameCounts.nhl} Games
                        </span>
                      </button>
                    )}
                    {todayGameCounts.cfb > 0 && (
                      <button
                        onClick={() => handleSelectSport('cfb')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>🏈 College Football</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px]">
                          {todayGameCounts.cfb} Games
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Showing {filteredGames.length} of {slateData.games.length} games scheduled
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Consensus Vegas Spreads & Implied Totals
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>

                {filteredGames.length === 0 && (
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
                    No games match your search query "{searchQuery}".
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* View Section 2: Best Value Picks */}
        {activeTab === 'values' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                High-leverage salary savers, 5x+ multipliers, and injury pivots
              </span>
              <span className="text-[11px] text-emerald-400">
                Priced for DraftKings & FanDuel
              </span>
            </div>

            <ValuePicksList picks={filteredValuePicks} sport={slateData.sport} />

            {filteredValuePicks.length === 0 && (
              <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
                No value picks match your search query "{searchQuery}".
              </div>
            )}
          </div>
        )}

        {/* View Section 3: Easiest Matchups / Target Defenses */}
        {activeTab === 'matchups' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Teams bleeding fantasy points to opposing positions (DVP analysis)
              </span>
              <span className="text-[11px] text-rose-400 font-semibold">
                Bottom 10 Defenses
              </span>
            </div>

            <MatchupsMatrix matchups={slateData.matchups} />
          </div>
        )}

        {/* View Section: Injury Beneficiaries */}
        {activeTab === 'beneficiaries' && (
          <InjuryBeneficiariesView
            alerts={alerts}
            currentSport={currentSport}
            onSelectSport={handleSelectSport}
            onSimulateScratch={simulateLateScratch}
          />
        )}

        {/* View Section 4: Injury Wire / Active Out Alerts */}
        {activeTab === 'injuries' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold text-rose-300">
                🚨 {filteredAlerts.length} Active Out Alerts Across All Sports
              </span>
              <button
                onClick={() => simulateLateScratch(currentSport)}
                className="text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Late Scratch</span>
              </button>
            </div>

            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 uppercase">
                        {alert.sportName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                        {alert.officialStatus}
                      </span>
                      {alert.minutesToStart <= 10 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3" />
                          {alert.minutesToStart}M TO LOCK
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {alert.gameMatchup} • {alert.timestamp}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const text = `🚨 ${alert.playerOut} (${alert.position}, ${alert.teamAbbr}) OUT -> Fill-in: ${alert.fillIns.map((f) => `${f.name} (${f.role})`).join(', ')}`;
                        navigator.clipboard.writeText(text);
                        soundManager.playCopyTone();
                      }}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy</span>
                    </button>
                  </div>

                  <div className="bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/30">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h4 className="text-base font-extrabold text-white">
                        {alert.playerOut}
                      </h4>
                      <span className="text-xs text-rose-300 font-semibold">
                        ({alert.position}, {alert.team})
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {alert.injuryDetail}
                    </p>
                  </div>

                  {/* Fill Ins */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      ⚡ Depth Chart Beneficiaries & Fill-Ins:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {alert.fillIns.map((fillIn, fIdx) => (
                        <div
                          key={fIdx}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-white">
                              {fillIn.name} ({fillIn.position})
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400">
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
                              <span className="text-amber-300 font-medium">
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
              ))}
            </div>
          </div>
        )}

        {/* View Section 5: Full On-Screen Copy Text */}
        {activeTab === 'text' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs sm:text-sm text-white">
                  Clean Formatted Slate Text for Mobile Copy
                </span>
              </div>
              <button
                onClick={handleQuickCopySlate}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                {quickCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 bg-slate-950">
              <pre className="font-mono text-xs sm:text-sm text-emerald-300/90 whitespace-pre-wrap select-all leading-relaxed">
                {slateData.rawTextSummary}
              </pre>
            </div>
          </div>
        )}

        {/* Grounding Sources (Free public citations) */}
        <GroundingSourcesBar sources={slateData.sources} />
      </main>

      {/* Screen Copy Board Modal */}
      {showCopyBoard && (
        <ScreenCopyBoard slate={slateData} onClose={() => setShowCopyBoard(false)} />
      )}

      {/* Paste Slate / "Put Text On Screen" Modal */}
      {showPasteModal && (
        <PasteSlateModal onClose={() => setShowPasteModal(false)} sport={slateData.sport} />
      )}

      {/* Historical Injury Alert Wire Log Modal */}
      {showAlertsModal && (
        <AlertsLogModal
          alerts={alerts}
          onClose={() => setShowAlertsModal(false)}
          onClear={clearAlertsLog}
          onSimulate={simulateLateScratch}
        />
      )}

      {/* Mobile Sticky Quick Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-1.5 px-3 sm:hidden flex items-center justify-around text-[10px]">
        <button
          onClick={() => setActiveTab('games')}
          className={`flex flex-col items-center gap-0.5 p-1 font-medium ${
            activeTab === 'games' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Vegas</span>
        </button>

        <button
          onClick={() => setActiveTab('values')}
          className={`flex flex-col items-center gap-0.5 p-1 font-medium ${
            activeTab === 'values' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Values</span>
        </button>

        <button
          onClick={() => setActiveTab('injuries')}
          className={`relative flex flex-col items-center gap-0.5 p-1 font-medium ${
            activeTab === 'injuries' ? 'text-rose-400 font-bold' : 'text-slate-400'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Injuries</span>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-1 px-1 rounded-full text-[8px] font-black bg-rose-600 text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matchups')}
          className={`flex flex-col items-center gap-0.5 p-1 font-medium ${
            activeTab === 'matchups' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Matchups</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`flex flex-col items-center gap-0.5 p-1 font-medium ${
            activeTab === 'text' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Copy</span>
        </button>
      </div>
    </div>
  );
}
