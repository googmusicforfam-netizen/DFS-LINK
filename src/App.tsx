import React, { useState, useEffect, useCallback } from 'react';
import { Sport, SlateData } from './types/dfs';
import { FALLBACK_SLATES } from './data/fallbackSlates';
import { Header } from './components/Header';
import { SportTabs } from './components/SportTabs';
import { GameCard } from './components/GameCard';
import { ValuePicksList } from './components/ValuePicksList';
import { MatchupsMatrix } from './components/MatchupsMatrix';
import { ScreenCopyBoard } from './components/ScreenCopyBoard';
import { PasteSlateModal } from './components/PasteSlateModal';
import { GroundingSourcesBar } from './components/GroundingSourcesBar';
import { soundManager } from './utils/audio';
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
} from 'lucide-react';

export default function App() {
  const [currentSport, setCurrentSport] = useState<Sport>('nba');
  const [slates, setSlates] = useState<Record<Sport, SlateData>>(FALLBACK_SLATES);
  const slateData = slates[currentSport];
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'games' | 'values' | 'matchups' | 'text'>('games');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCopyBoard, setShowCopyBoard] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [quickCopied, setQuickCopied] = useState<boolean>(false);

  // Fetch slate from backend with search grounding
  const fetchSlate = useCallback(
    async (sport: Sport, forceRefresh: boolean = false) => {
      setIsLoading(true);
      try {
        const url = `/api/dfs/slate?sport=${sport}${forceRefresh ? '&refresh=true' : ''}`;
        const response = await fetch(url);
        if (response.ok) {
          const data: SlateData = await response.json();
          setSlates((prev) => ({ ...prev, [sport]: data }));
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

  const handleRefresh = () => {
    fetchSlate(currentSport, true);
  };

  const handleSelectSport = (sport: Sport) => {
    setCurrentSport(sport);
    setSearchQuery('');
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
      {/* App Header */}
      <Header
        onRefresh={handleRefresh}
        isLoading={isLoading}
        onOpenPasteModal={() => setShowPasteModal(true)}
        onOpenCopyBoard={() => setShowCopyBoard(true)}
        lastUpdated={slateData.lastUpdated}
      />

      {/* Sport Selector Tabs */}
      <SportTabs
        currentSport={currentSport}
        onSelectSport={handleSelectSport}
        gameCounts={{
          nba: FALLBACK_SLATES.nba.games.length,
          nfl: FALLBACK_SLATES.nfl.games.length,
          nhl: FALLBACK_SLATES.nhl.games.length,
          cbb: FALLBACK_SLATES.cbb.games.length,
          cfb: FALLBACK_SLATES.cfb.games.length,
          mlb: FALLBACK_SLATES.mlb.games.length,
        }}
      />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 flex-1 space-y-4">
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
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-50 active:scale-95"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Searching Live Web...' : 'Live Search'}</span>
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
                  <span>1-Tap Copy Slate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Metric Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                {highestTotalGame
                  ? `O/U ${highestTotalGame.overUnder} (${highestTotalGame.awayTeam.abbreviation}/${highestTotalGame.homeTeam.abbreviation})`
                  : 'N/A'}
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
                {topValuePick ? `${topValuePick.playerName} (${topValuePick.valueMultiplier}x)` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Easiest Matchups Count */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Weak Defenses
              </span>
              <span className="text-sm sm:text-base font-extrabold text-rose-300">
                {slateData.matchups.length} Flagged
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
              <span>Best Value Picks ({slateData.valuePicks.length})</span>
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
              <span>Easiest Matchups ({slateData.matchups.length})</span>
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
              <span>On-Screen Copy Text</span>
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

        {/* View Section 4: Full On-Screen Copy Text ("Put text on screen to copy") */}
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
          <span>Screen Copy</span>
        </button>

        <button
          onClick={() => setShowPasteModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 font-medium text-emerald-400"
        >
          <Sparkles className="w-4 h-4" />
          <span>Paste Text</span>
        </button>
      </div>
    </div>
  );
}
