import React, { useState, useMemo } from 'react';
import type { Sport, InjuryAlert, InjuryBeneficiary } from '../types/dfs.ts';
import {
  extractBeneficiariesFromAlerts,
  filterBeneficiariesBySport,
  getBeneficiaryCountsBySport,
  formatBeneficiaryShareText,
} from '../utils/beneficiaries.ts';
import { soundManager } from '../utils/audio.ts';
import {
  Zap,
  Flame,
  ShieldAlert,
  DollarSign,
  Award,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Search,
  Filter,
  TrendingUp,
  UserCheck,
  Clock,
  Sparkles,
  ArrowUpDown,
  AlertTriangle,
  Play,
} from 'lucide-react';

interface InjuryBeneficiariesViewProps {
  alerts: InjuryAlert[];
  currentSport: Sport;
  onSelectSport?: (sport: Sport) => void;
  onSimulateScratch?: (sport: Sport) => void;
}

type SportFilter = Sport | 'all';
type SortOption = 'opportunity' | 'underpriced' | 'salary_asc' | 'confidence';

export const InjuryBeneficiariesView: React.FC<InjuryBeneficiariesViewProps> = ({
  alerts,
  currentSport,
  onSelectSport,
  onSimulateScratch,
}) => {
  // Sport filter state with option for 'all' sports at once
  const [selectedSport, setSelectedSport] = useState<SportFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('opportunity');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sound alert toggle with On/Off switch state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    soundManager.isBeneficiarySoundEnabled()
  );
  const [justTestedSound, setJustTestedSound] = useState<boolean>(false);

  // Toggle beneficiary sound alert
  const handleToggleSound = () => {
    const nextState = soundManager.toggleBeneficiarySound();
    setSoundEnabled(nextState);
  };

  // Test sound button
  const handleTestSound = () => {
    soundManager.playBeneficiaryAlertTone();
    setJustTestedSound(true);
    setTimeout(() => setJustTestedSound(false), 1500);
  };

  // Extract all beneficiaries from alerts
  const allBeneficiaries = useMemo(() => {
    return extractBeneficiariesFromAlerts(alerts);
  }, [alerts]);

  // Counts by sport for filter pills
  const countsBySport = useMemo(() => {
    return getBeneficiaryCountsBySport(allBeneficiaries);
  }, [allBeneficiaries]);

  // Filtered by sport
  const sportFiltered = useMemo(() => {
    return filterBeneficiariesBySport(allBeneficiaries, selectedSport);
  }, [allBeneficiaries, selectedSport]);

  // Filtered by search and sorted
  const displayBeneficiaries = useMemo(() => {
    let list = [...sportFiltered];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.beneficiaryName.toLowerCase().includes(q) ||
          b.injuredPlayer.toLowerCase().includes(q) ||
          b.team.toLowerCase().includes(q) ||
          b.teamAbbr.toLowerCase().includes(q) ||
          b.position.toLowerCase().includes(q) ||
          b.reason.toLowerCase().includes(q) ||
          b.opportunityBoost.toLowerCase().includes(q)
      );
    }

    // Sort options
    list.sort((a, b) => {
      if (sortBy === 'opportunity') {
        return b.opportunityScore - a.opportunityScore;
      }
      if (sortBy === 'underpriced') {
        if (a.isUnderpriced && !b.isUnderpriced) return -1;
        if (!a.isUnderpriced && b.isUnderpriced) return 1;
        return b.expectedValueMultiplier - a.expectedValueMultiplier;
      }
      if (sortBy === 'salary_asc') {
        return a.salaryDK - b.salaryDK;
      }
      if (sortBy === 'confidence') {
        return b.confidencePct - a.confidencePct;
      }
      return 0;
    });

    return list;
  }, [sportFiltered, searchQuery, sortBy]);

  // Metrics
  const underpricedCount = useMemo(() => {
    return sportFiltered.filter((b) => b.isUnderpriced).length;
  }, [sportFiltered]);

  const topOpportunityBeneficiary = useMemo(() => {
    return sportFiltered[0] || null;
  }, [sportFiltered]);

  const handleCopy = (b: InjuryBeneficiary) => {
    const text = formatBeneficiaryShareText(b);
    navigator.clipboard.writeText(text);
    soundManager.playCopyTone();
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'Targets':
        return <TrendingUp className="w-3.5 h-3.5 text-blue-400" />;
      case 'Touches':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'Ice Time':
        return <Clock className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Shots':
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getConfidenceBadge = (level: string, pct: number) => {
    if (level === 'Lock' || pct >= 95) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />
          LOCK ({pct}%)
        </span>
      );
    }
    if (level === 'Very High' || pct >= 85) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <Award className="w-3 h-3 text-emerald-400" />
          VERY HIGH ({pct}%)
        </span>
      );
    }
    if (level === 'High' || pct >= 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          HIGH ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/60 text-slate-300 border border-slate-600">
        MODERATE ({pct}%)
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Feature Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5 shadow-sm">
                <Zap className="w-3 h-3 text-indigo-400" />
                Live Opportunity Engine
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Next-Man-Up & Usage Funnel Tracking
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Injury Beneficiaries</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                {displayBeneficiaries.length} Active
              </span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              When a player is ruled inactive or scratched, we track the teammates getting extra
              playing time, targets, touches, shots, and ice time at that position. Ranked by expected
              opportunity increase and highlighted for DFS salary value.
            </p>
          </div>

          {/* Sound Alert Toggle with On/Off Switch & Test Button */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 sm:p-3.5 flex flex-col gap-2.5 shrink-0 shadow-md">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Beneficiary Sound Alert
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Chime on newly flagged beneficiary
                  </span>
                </div>
              </div>

              {/* On/Off Switch */}
              <button
                type="button"
                onClick={handleToggleSound}
                role="switch"
                aria-checked={soundEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span className="sr-only">Toggle beneficiary sound alert</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono font-semibold text-slate-400">
                Status: <strong className={soundEnabled ? 'text-emerald-400' : 'text-slate-500'}>{soundEnabled ? 'ACTIVE (ON)' : 'MUTED (OFF)'}</strong>
              </span>
              <button
                onClick={handleTestSound}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors active:scale-95"
              >
                <Play className="w-2.5 h-2.5 text-indigo-400 fill-indigo-400" />
                <span>{justTestedSound ? 'Playing...' : 'Test Sound'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Highlights Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Flagged Beneficiaries
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white">
                {sportFiltered.length} Players
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl border border-emerald-500/30 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Flame className="w-4 h-4 fill-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                Underpriced Values
              </span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-300">
                {underpricedCount} Smash Plays
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                #1 Opportunity Rank
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-amber-300 truncate block">
                {topOpportunityBeneficiary ? `${topOpportunityBeneficiary.beneficiaryName} (${topOpportunityBeneficiary.teamAbbr})` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Inactives Tracked
              </span>
              <span className="text-sm sm:text-base font-extrabold text-blue-300">
                {alerts.length} Inactives
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sport Filter Pills Bar (With Option to Show All Sports At Once) */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-2 sm:p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Sport:</span>
          </span>

          {/* ALL SPORTS OPTION */}
          <button
            onClick={() => setSelectedSport('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
              selectedSport === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-750'
            }`}
          >
            <span>🌐 All Sports</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedSport === 'all' ? 'bg-indigo-900/80 text-white font-black' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {countsBySport.all}
            </span>
          </button>

          {/* NBA */}
          <button
            onClick={() => setSelectedSport('nba')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
              selectedSport === 'nba'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-750'
            }`}
          >
            <span>🏀 NBA</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedSport === 'nba' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
              {countsBySport.nba}
            </span>
          </button>

          {/* NFL */}
          <button
            onClick={() => setSelectedSport('nfl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
              selectedSport === 'nfl'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-750'
            }`}
          >
            <span>🏈 NFL</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedSport === 'nfl' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
              {countsBySport.nfl}
            </span>
          </button>

          {/* NHL */}
          <button
            onClick={() => setSelectedSport('nhl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
              selectedSport === 'nhl'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-750'
            }`}
          >
            <span>🏒 NHL</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedSport === 'nhl' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
              {countsBySport.nhl}
            </span>
          </button>

          {/* College Basketball */}
          <button
            onClick={() => setSelectedSport('cbb')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
              selectedSport === 'cbb'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-750'
            }`}
          >
            <span>⛹️ College Basketball</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedSport === 'cbb' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
              {countsBySport.cbb}
            </span>
          </button>

          {/* College Football */}
          <button
            onClick={() => setSelectedSport('cfb')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
              selectedSport === 'cfb'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-750'
            }`}
          >
            <span>🏈 College Football</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedSport === 'cfb' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
              {countsBySport.cfb}
            </span>
          </button>

          {/* MLB */}
          <button
            onClick={() => setSelectedSport('mlb')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
              selectedSport === 'mlb'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-750'
            }`}
          >
            <span>⚾ MLB</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedSport === 'mlb' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
              {countsBySport.mlb}
            </span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player or team..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="opportunity" className="bg-slate-900 text-white">
                Rank: Opportunity Boost
              </option>
              <option value="underpriced" className="bg-slate-900 text-white">
                Underpriced Value Plays
              </option>
              <option value="salary_asc" className="bg-slate-900 text-white">
                Salary: Low to High
              </option>
              <option value="confidence" className="bg-slate-900 text-white">
                Confidence Level
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Beneficiaries List */}
      <div className="space-y-3">
        {displayBeneficiaries.map((b, idx) => {
          const isCopied = copiedId === b.id;
          const rank = idx + 1;

          return (
            <div
              key={b.id}
              className={`rounded-2xl border transition-all p-4 shadow-sm relative overflow-hidden ${
                b.isUnderpriced
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border-emerald-500/50 shadow-emerald-500/5'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Highlight ribbon for underpriced value plays */}
              {b.isUnderpriced && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-slate-950" />
                  <span>{b.underpricedTag || 'UNDERPRICED VALUE PLAY'}</span>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3.5">
                {/* Left Section: Rank + Beneficiary Info + Injured Player Association */}
                <div className="space-y-2 min-w-0 flex-1">
                  {/* Top Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Rank Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase flex items-center gap-1 ${
                        rank <= 3
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span>RANK #{rank}</span>
                    </span>

                    {/* Sport Badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {b.sport.toUpperCase()}
                    </span>

                    {/* Opportunity Type Badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      {getOpportunityIcon(b.opportunityType)}
                      <span>Extra {b.opportunityType}</span>
                    </span>

                    {/* Confidence Meter */}
                    {getConfidenceBadge(b.confidenceLevel, b.confidencePct)}
                  </div>

                  {/* Beneficiary Name & Position */}
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {b.beneficiaryName}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-slate-800 text-emerald-400 border border-slate-700">
                        {b.position}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {b.team} ({b.teamAbbr})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        • {b.gameMatchup} ({b.gameTime})
                      </span>
                    </div>

                    {/* Expected Increase in Opportunity Pill */}
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs font-bold text-indigo-200">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Expected Opportunity Shift: <strong className="text-white">{b.opportunityBoost}</strong></span>
                      </span>

                      <span className="text-[11px] text-slate-400 font-mono">
                        Opp Score: <strong className="text-amber-400">{b.opportunityScore}/100</strong>
                      </span>
                    </div>
                  </div>

                  {/* Injury Association Banner: Injured Player & Status */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 text-xs">
                    <div className="p-1 rounded bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200">
                          Injured Teammate:
                        </span>
                        <span className="font-extrabold text-white">
                          {b.injuredPlayer} ({b.injuredPosition})
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-600 text-white">
                          {b.officialStatus}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {b.injuryDetail}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-indigo-300">Why He Benefits:</strong> {b.reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Section: DFS Salary, Value Multiplier & 1-Tap Copy Action */}
                <div className="bg-slate-950/90 rounded-xl border border-slate-800/90 p-3 sm:p-3.5 shrink-0 flex flex-col justify-between gap-3 w-full md:w-56">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      DFS Pricing & Opportunity Value
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* DraftKings Salary */}
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          DraftKings
                        </span>
                        <span className="text-sm font-extrabold text-emerald-400 font-mono">
                          ${b.salaryDK.toLocaleString()}
                        </span>
                      </div>

                      {/* FanDuel Salary */}
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          FanDuel
                        </span>
                        <span className="text-sm font-extrabold text-blue-400 font-mono">
                          ${b.salaryFD.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Value Multiplier & Expected Points */}
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Expected Value:
                      </span>
                      <span className="font-extrabold text-amber-300 font-mono">
                        {b.expectedValueMultiplier}x ({b.projectedPoints} FP)
                      </span>
                    </div>

                    {b.isUnderpriced && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Underpriced for expected usage</span>
                      </div>
                    )}
                  </div>

                  {/* 1-Tap Mobile Copy Button */}
                  <button
                    onClick={() => handleCopy(b)}
                    className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Beneficiary Target</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state if search or filter yields 0 */}
        {displayBeneficiaries.length === 0 && (
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-8 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">
                No Beneficiaries Match Your Selection
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active injury beneficiaries found for {selectedSport === 'all' ? 'any sport' : selectedSport.toUpperCase()} matching "{searchQuery}".
              </p>
            </div>
            {onSimulateScratch && (
              <button
                onClick={() => onSimulateScratch(selectedSport === 'all' ? 'nba' : selectedSport)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate a Late Scratch in {selectedSport === 'all' ? 'NBA' : selectedSport.toUpperCase()}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
