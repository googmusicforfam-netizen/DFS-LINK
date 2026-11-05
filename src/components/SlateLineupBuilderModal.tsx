import React, { useState, useMemo, useEffect } from 'react';
import type {
  DfsSlateContest,
  SlatePlayer,
  LineupSlotItem,
  PlayerCorrelationSuggestion,
} from '../types/slates.ts';
import {
  calculateLineupCorrelation,
  getCorrelationSuggestions,
} from '../utils/correlation.ts';
import { soundManager } from '../utils/audio.ts';
import {
  X,
  DollarSign,
  TrendingUp,
  Award,
  Zap,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  Flame,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { StarButton } from './StarButton.tsx';

interface SlateLineupBuilderModalProps {
  slate: DfsSlateContest;
  isOpen: boolean;
  onClose: () => void;
  isStarred?: (name: string) => boolean;
  onToggleStar?: (player: any) => void;
}

export function SlateLineupBuilderModal({
  slate,
  isOpen,
  onClose,
  isStarred,
  onToggleStar,
}: SlateLineupBuilderModalProps) {
  // Initialize roster slots based on the contest format
  const initialSlots: LineupSlotItem[] = useMemo(() => {
    return slate.rosterSlots.map((slotName, idx) => {
      const isCaptain = slotName.includes('CPT') || slotName.includes('MVP');
      let allowedPositions: string[] = [];

      if (isCaptain || slotName === 'FLEX' || slotName === 'UTIL') {
        allowedPositions = ['ALL'];
      } else if (slotName === 'G') {
        allowedPositions = ['PG', 'SG', 'G'];
      } else if (slotName === 'F') {
        allowedPositions = ['SF', 'PF', 'F'];
      } else if (slotName === 'SuperFLEX') {
        allowedPositions = ['QB', 'RB', 'WR', 'TE'];
      } else {
        allowedPositions = [slotName];
      }

      return {
        slotId: `slot-${idx}-${slotName.replace(/[^a-zA-Z0-9]/g, '')}`,
        slotName,
        allowedPositions,
        isMultiplier: isCaptain,
        multiplierValue: isCaptain ? 1.5 : 1.0,
        player: null,
      };
    });
  }, [slate]);

  const [rosterSlots, setRosterSlots] = useState<LineupSlotItem[]>(initialSlots);
  const [selectedFocusPlayer, setSelectedFocusPlayer] = useState<SlatePlayer | null>(null);

  // Filters for player pool
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [beneficiariesOnly, setBeneficiariesOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('ALL');
  const [copiedLineup, setCopiedLineup] = useState<boolean>(false);

  // Reset slots when slate changes
  useEffect(() => {
    setRosterSlots(initialSlots);
    setSelectedFocusPlayer(null);
  }, [initialSlots]);

  // Track rostered players
  const rosteredPlayers = useMemo(
    () => rosterSlots.map((s) => s.player).filter((p): p is SlatePlayer => p !== null),
    [rosterSlots]
  );

  const rosteredPlayerIds = useMemo(
    () => new Set(rosteredPlayers.map((p) => p.id)),
    [rosteredPlayers]
  );

  // Set default focus player to most recent addition or high-priority QB/PG/C
  useEffect(() => {
    if (!selectedFocusPlayer && rosteredPlayers.length > 0) {
      // Pick first QB or primary star
      const priority = rosteredPlayers.find((p) => ['QB', 'PG', 'C'].includes(p.position)) || rosteredPlayers[0];
      setSelectedFocusPlayer(priority);
    }
  }, [rosteredPlayers, selectedFocusPlayer]);

  // Salary calculations
  const totalSalarySpent = useMemo(() => {
    return rosterSlots.reduce((acc, slot) => {
      if (!slot.player) return acc;
      const baseSalary = slate.site === 'DraftKings' ? slot.player.salaryDK : slot.player.salaryFD;
      const effectiveSalary = slot.isMultiplier && slate.site === 'DraftKings'
        ? Math.round(baseSalary * 1.5)
        : baseSalary;
      return acc + effectiveSalary;
    }, 0);
  }, [rosterSlots, slate.site]);

  const salaryRemaining = slate.salaryCap - totalSalarySpent;
  const emptySlotsCount = rosterSlots.filter((s) => !s.player).length;
  const avgRemainingPerSlot = emptySlotsCount > 0 ? Math.round(salaryRemaining / emptySlotsCount) : 0;

  const totalProjectedPoints = useMemo(() => {
    return rosterSlots.reduce((acc, slot) => {
      if (!slot.player) return acc;
      const pts = slot.isMultiplier ? slot.player.projectedPoints * 1.5 : slot.player.projectedPoints;
      return acc + pts;
    }, 0);
  }, [rosterSlots]);

  // Lineup Correlation Report
  const correlationReport = useMemo(() => {
    return calculateLineupCorrelation(
      rosterSlots.map((s) => s.player),
      slate.sport
    );
  }, [rosterSlots, slate.sport]);

  // Correlation suggestions for focused player
  const correlationSuggestions = useMemo(() => {
    if (!selectedFocusPlayer) return [];
    return getCorrelationSuggestions(
      selectedFocusPlayer,
      rosterSlots.map((s) => s.player),
      slate.playerPool,
      slate.sport
    );
  }, [selectedFocusPlayer, rosterSlots, slate.playerPool, slate.sport]);

  // Filtered player pool
  const filteredPlayerPool = useMemo(() => {
    return slate.playerPool.filter((p) => {
      // Beneficiaries filter
      if (beneficiariesOnly && !p.isBeneficiary) return false;

      // Position filter
      if (positionFilter !== 'ALL') {
        const matchesPos = p.position === positionFilter || p.eligiblePositions.includes(positionFilter);
        if (!matchesPos) return false;
      }

      // Game filter
      if (selectedGameFilter !== 'ALL' && p.gameId !== selectedGameFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesTeam = p.team.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q);
        if (!matchesName && !matchesTeam) return false;
      }

      return true;
    });
  }, [slate.playerPool, positionFilter, beneficiariesOnly, selectedGameFilter, searchQuery]);

  // Positions available for filter buttons
  const availablePositions = useMemo(() => {
    const set = new Set<string>();
    slate.playerPool.forEach((p) => {
      if (p.position) set.add(p.position);
    });
    return Array.from(set);
  }, [slate.playerPool]);

  // Add player to roster
  const handleAddPlayer = (player: SlatePlayer) => {
    // If already in roster, do not duplicate
    if (rosteredPlayerIds.has(player.id)) return;

    // Find first eligible open slot
    const openSlotIndex = rosterSlots.findIndex((slot) => {
      if (slot.player !== null) return false;
      if (slot.allowedPositions.includes('ALL')) return true;
      return slot.allowedPositions.includes(player.position) || player.eligiblePositions.some((ep) => slot.allowedPositions.includes(ep));
    });

    if (openSlotIndex === -1) {
      alert(`No open roster slot available for position ${player.position}. Please remove a player first.`);
      return;
    }

    const updated = [...rosterSlots];
    updated[openSlotIndex] = {
      ...updated[openSlotIndex],
      player,
    };

    setRosterSlots(updated);
    setSelectedFocusPlayer(player);
    soundManager.playChime(659.25, 880.0);
  };

  // Remove player from roster
  const handleRemovePlayer = (slotIndex: number) => {
    const updated = [...rosterSlots];
    const removedPlayer = updated[slotIndex].player;
    updated[slotIndex] = {
      ...updated[slotIndex],
      player: null,
    };
    setRosterSlots(updated);

    if (selectedFocusPlayer?.id === removedPlayer?.id) {
      const remaining = updated.map((s) => s.player).filter((p): p is SlatePlayer => p !== null);
      setSelectedFocusPlayer(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Clear all players
  const handleClearRoster = () => {
    setRosterSlots(initialSlots);
    setSelectedFocusPlayer(null);
  };

  // Quick Optimize Correlated Stack
  const handleAutoStack = () => {
    const newSlots = [...initialSlots];
    let remainingBudget = slate.salaryCap;

    // 1. Pick highest projected QB or star player
    const sortedPool = [...slate.playerPool].sort((a, b) => b.projectedPoints - a.projectedPoints);
    const primaryStar = sortedPool[0];

    if (!primaryStar) return;

    // Place into first slot (or Captain if showdown)
    newSlots[0] = { ...newSlots[0], player: primaryStar };
    const starCost = newSlots[0].isMultiplier && slate.site === 'DraftKings'
      ? Math.round(primaryStar.salaryDK * 1.5)
      : slate.site === 'DraftKings'
      ? primaryStar.salaryDK
      : primaryStar.salaryFD;
    remainingBudget -= starCost;

    // 2. Find correlated teammates
    const suggestions = getCorrelationSuggestions(
      primaryStar,
      [primaryStar],
      slate.playerPool,
      slate.sport
    );

    const positiveTeammates = suggestions
      .filter((s) => s.score > 0)
      .map((s) => s.partnerPlayer);

    // Place top 2 correlated partners
    let slotIdx = 1;
    for (const partner of positiveTeammates) {
      if (slotIdx >= newSlots.length) break;
      const cost = slate.site === 'DraftKings' ? partner.salaryDK : partner.salaryFD;
      if (remainingBudget - cost >= (newSlots.length - slotIdx - 1) * 3500) {
        newSlots[slotIdx] = { ...newSlots[slotIdx], player: partner };
        remainingBudget -= cost;
        slotIdx++;
      }
    }

    // 3. Fill remaining slots with top value & beneficiaries within budget
    const remainingCandidates = slate.playerPool
      .filter((p) => !newSlots.some((s) => s.player?.id === p.id))
      .sort((a, b) => {
        // Boost beneficiaries
        const aBoost = a.isBeneficiary ? 1.4 : 1.0;
        const bBoost = b.isBeneficiary ? 1.4 : 1.0;
        const aVal = (a.projectedPoints * aBoost) / (a.salaryDK / 1000);
        const bVal = (b.projectedPoints * bBoost) / (b.salaryDK / 1000);
        return bVal - aVal;
      });

    for (; slotIdx < newSlots.length; slotIdx++) {
      const slot = newSlots[slotIdx];
      const eligible = remainingCandidates.find((c) => {
        const cost = slate.site === 'DraftKings' ? c.salaryDK : c.salaryFD;
        const slotsAfter = newSlots.length - slotIdx - 1;
        const safeFloor = slotsAfter * 3000;
        if (remainingBudget - cost < safeFloor) return false;
        if (slot.allowedPositions.includes('ALL')) return true;
        return slot.allowedPositions.includes(c.position) || c.eligiblePositions.some((ep) => slot.allowedPositions.includes(ep));
      });

      if (eligible) {
        newSlots[slotIdx] = { ...slot, player: eligible };
        const cost = slate.site === 'DraftKings' ? eligible.salaryDK : eligible.salaryFD;
        remainingBudget -= cost;
        const idx = remainingCandidates.indexOf(eligible);
        if (idx !== -1) remainingCandidates.splice(idx, 1);
      }
    }

    setRosterSlots(newSlots);
    setSelectedFocusPlayer(primaryStar);
    soundManager.playChime(587.33, 880.0);
  };

  // Copy lineup to clipboard
  const handleCopyLineup = () => {
    let text = `📋 ${slate.site.toUpperCase()} DFS LINEUP\n`;
    text += `Contest: ${slate.name}\n`;
    text += `Sport: ${slate.sportName} | Salary Cap: $${slate.salaryCap.toLocaleString()}\n`;
    text += `Total Salary Spent: $${totalSalarySpent.toLocaleString()} ($${salaryRemaining.toLocaleString()} remaining)\n`;
    text += `Projected Points: ${totalProjectedPoints.toFixed(1)} FP | Correlation: Grade ${correlationReport.ratingGrade} (${correlationReport.overallScore})\n`;
    text += `=========================================\n\n`;

    for (const slot of rosterSlots) {
      if (slot.player) {
        const mult = slot.isMultiplier ? ' (1.5x Multiplier)' : '';
        const salary = slate.site === 'DraftKings' ? slot.player.salaryDK : slot.player.salaryFD;
        text += `• ${slot.slotName}${mult}: ${slot.player.name} (${slot.player.position}, ${slot.player.team}) vs ${slot.player.opponent} | $${salary.toLocaleString()} | Proj: ${slot.player.projectedPoints} FP\n`;
      } else {
        text += `• ${slot.slotName}: [OPEN SPOT]\n`;
      }
    }

    if (correlationReport.stacksDetected.length > 0) {
      text += `\n🔥 Stacks Detected: ${correlationReport.stacksDetected.join(', ')}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedLineup(true);
    setTimeout(() => setCopiedLineup(false), 2500);
    soundManager.playChime(880.0, 1046.5);
  };

  if (!isOpen) return null;

  const isDK = slate.site === 'DraftKings';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
                isDK
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-blue-950 text-blue-400 border border-blue-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {slate.site}
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                {slate.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{slate.format}</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{slate.startTime} Lock</span>
                <span>•</span>
                <span>{slate.gameCount} Games</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoStack}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 transition-all shadow-sm"
              title="Auto-build a high correlation stack within salary cap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Fill Stack
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stats & Salary Cap Tracker Banner */}
        <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Salary Meter */}
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400 font-medium block text-[11px] uppercase tracking-wider">Salary Remaining</span>
              <span
                className={`text-lg font-black tracking-tight ${
                  salaryRemaining < 0
                    ? 'text-red-400'
                    : salaryRemaining < 3000
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                ${salaryRemaining.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">/ ${slate.salaryCap.toLocaleString()}</span>
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div>
              <span className="text-slate-400 font-medium block text-[11px] uppercase tracking-wider">Avg / Open Slot</span>
              <span className="text-base font-bold text-white">
                ${avgRemainingPerSlot.toLocaleString()}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div>
              <span className="text-slate-400 font-medium block text-[11px] uppercase tracking-wider">Projected FP</span>
              <span className="text-base font-bold text-amber-400">
                {totalProjectedPoints.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Lineup Correlation Synergy Badge */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-700/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Stack Synergy:</span>
              <span
                className={`font-black px-2 py-0.5 rounded text-xs ${
                  correlationReport.ratingGrade === 'A+'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : correlationReport.ratingGrade === 'A'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : correlationReport.ratingGrade === 'Needs Attention'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Grade {correlationReport.ratingGrade}
              </span>
              <span className="text-slate-400 text-[11px]">({correlationReport.overallScore} pts)</span>
            </div>

            <button
              onClick={handleCopyLineup}
              disabled={rosteredPlayers.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                copiedLineup
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copiedLineup ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLineup ? 'Copied!' : 'Copy Lineup'}
            </button>
          </div>
        </div>

        {/* Negative Conflict Warning Banner if detected */}
        {correlationReport.conflictWarnings.length > 0 && (
          <div className="bg-red-950/60 border-b border-red-900/80 px-5 py-2.5 text-xs text-red-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>Direct Correlation Conflict Detected:</strong>{' '}
                {correlationReport.conflictWarnings.map((c) => `${c.targetPlayer.name} vs ${c.partnerPlayer.name} (${c.relationshipTitle})`).join('; ')}
              </span>
            </div>
            <span className="text-[11px] text-red-400 font-semibold shrink-0">
              Lowers GPP Tournament Ceiling
            </span>
          </div>
        )}

        {/* Main Body Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1">
          {/* Left Column (5 Cols): Roster Slots & Focus Player Correlation Suggestions */}
          <div className="lg:col-span-5 border-r border-slate-800 p-4 sm:p-5 space-y-5 bg-slate-900/50">
            {/* Roster Slots List */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Roster ({rosteredPlayers.length} / {rosterSlots.length})
                </span>
                {rosteredPlayers.length > 0 && (
                  <button
                    onClick={handleClearRoster}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {rosterSlots.map((slot, idx) => {
                  const p = slot.player;
                  const isFocused = p && selectedFocusPlayer?.id === p.id;
                  const playerSalary = p ? (isDK ? p.salaryDK : p.salaryFD) : 0;
                  const effectiveSalary = slot.isMultiplier && isDK ? Math.round(playerSalary * 1.5) : playerSalary;

                  return (
                    <div
                      key={slot.slotId}
                      onClick={() => p && setSelectedFocusPlayer(p)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                        p
                          ? isFocused
                            ? 'bg-slate-800 border-amber-500/80 shadow-md ring-1 ring-amber-500/40 cursor-pointer'
                            : 'bg-slate-850 hover:bg-slate-800 border-slate-700/80 cursor-pointer'
                          : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-500'
                      }`}
                    >
                      {/* Slot Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-14 shrink-0 px-1.5 py-0.5 rounded text-[11px] font-black uppercase text-center ${
                            slot.isMultiplier
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {slot.slotName}
                        </span>

                        {p ? (
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white truncate">{p.name}</span>
                              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-bold shrink-0">
                                {p.team}
                              </span>
                              {p.isBeneficiary && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold shrink-0">
                                  ⚡ VAL
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.opponent} • {p.projectedPoints} FP
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Empty Slot</span>
                        )}
                      </div>

                      {/* Right Details & Remove */}
                      <div className="flex items-center gap-2 shrink-0">
                        {p ? (
                          <>
                            <div className="text-right">
                              <span className="font-bold text-white block">
                                ${effectiveSalary.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-amber-400 font-semibold">
                                {slot.isMultiplier ? (p.projectedPoints * 1.5).toFixed(1) : p.projectedPoints} FP
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePlayer(idx);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors ml-1"
                              title="Remove Player"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-mono">Select Below</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PLAYER CORRELATION & STACK SUGGESTIONS PANEL */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Player Correlation & Stacking
                </span>
                {selectedFocusPlayer && (
                  <span className="text-[11px] font-semibold text-slate-300">
                    Focus: <strong className="text-white">{selectedFocusPlayer.name}</strong>
                  </span>
                )}
              </div>

              {!selectedFocusPlayer ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400 text-xs">
                  <UserCheck className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  Draft a player or tap any rostered player above to see instant teammate stack suggestions, shootout bring-backs, and correlation scores!
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    Showing correlation pairings for <strong>{selectedFocusPlayer.name} ({selectedFocusPlayer.position}, {selectedFocusPlayer.team})</strong> in {selectedFocusPlayer.gameMatchup}.
                  </div>

                  {correlationSuggestions.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-2">
                      No high-correlation partners found in this slate for {selectedFocusPlayer.name}.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {correlationSuggestions.map((sug, sIdx) => {
                        const partner = sug.partnerPlayer;
                        const partnerSalary = isDK ? partner.salaryDK : partner.salaryFD;
                        const isAlreadyRostered = rosteredPlayerIds.has(partner.id);
                        const isPositive = sug.score > 0;

                        return (
                          <div
                            key={`sug-${sIdx}-${partner.id}`}
                            className={`p-2.5 rounded-xl border text-xs transition-all ${
                              !isPositive
                                ? 'bg-red-950/40 border-red-900/60 text-red-200'
                                : sug.score >= 0.6
                                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                                : 'bg-slate-850 border-slate-700/80 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>{partner.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                  {partner.position} • {partner.team}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-black text-[11px] px-1.5 py-0.5 rounded ${
                                    isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                  }`}
                                >
                                  {sug.scoreLabel}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                              <strong>{sug.relationshipTitle}:</strong> {sug.explanation}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
                              <span className="font-bold text-white text-[11px]">
                                ${partnerSalary.toLocaleString()} • {partner.projectedPoints} FP
                              </span>

                              {isAlreadyRostered ? (
                                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Stacked in Lineup
                                </span>
                              ) : isPositive ? (
                                <button
                                  onClick={() => handleAddPlayer(partner)}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add to Stack
                                </button>
                              ) : (
                                <span className="text-[10px] text-red-400 font-bold">
                                  ⚠️ Avoid Conflict
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7 Cols): Available Player Pool Table & Filters */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 flex flex-col bg-slate-900">
            {/* Filter Controls */}
            <div className="space-y-3">
              {/* Search & Beneficiaries Toggle */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player or team..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Injury Beneficiaries Toggle Button */}
                <button
                  onClick={() => setBeneficiariesOnly(!beneficiariesOnly)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    beneficiariesOnly
                      ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Injury Beneficiaries Only
                </button>
              </div>

              {/* Position Filter Tabs & Game Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    onClick={() => setPositionFilter('ALL')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      positionFilter === 'ALL'
                        ? 'bg-slate-800 text-white font-extrabold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ALL ({slate.playerPool.length})
                  </button>
                  {availablePositions.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPositionFilter(pos)}
                      className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg transition-all ${
                        positionFilter === pos
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>

                {/* Game Matchup Dropdown */}
                {slate.games.length > 1 && (
                  <select
                    value={selectedGameFilter}
                    onChange={(e) => setSelectedGameFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Games ({slate.games.length})</option>
                    {slate.games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.awayTeam.abbreviation} @ {g.homeTeam.abbreviation}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Players Table / Cards */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
              {filteredPlayerPool.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No players match the current filters.
                </div>
              ) : (
                filteredPlayerPool.map((p) => {
                  const salary = isDK ? p.salaryDK : p.salaryFD;
                  const isRostered = rosteredPlayerIds.has(p.id);
                  const multiplier = (p.projectedPoints / (salary / 1000)).toFixed(1);

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isRostered
                          ? 'bg-slate-950/70 border-emerald-800/60 opacity-80'
                          : p.isBeneficiary
                          ? 'bg-slate-850 hover:bg-slate-800 border-amber-500/40 shadow-sm'
                          : 'bg-slate-850 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Player Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {onToggleStar && (
                              <StarButton
                                isStarred={isStarred ? isStarred(p.name) : false}
                                onToggle={() =>
                                  onToggleStar({
                                    name: p.name,
                                    position: p.position,
                                    team: p.team,
                                    sport: p.sport,
                                    salaryDK: p.salaryDK,
                                    salaryFD: p.salaryFD,
                                    gameMatchup: p.gameMatchup,
                                    gameTime: p.gameTime,
                                  })
                                }
                                size="sm"
                              />
                            )}
                            <span className="font-bold text-white text-sm hover:text-amber-400 transition-colors">
                              {p.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300">
                              {p.position}
                            </span>
                            <span className="text-xs font-semibold text-slate-300">
                              {p.team} <span className="text-slate-500">{p.opponent}</span>
                            </span>

                            {/* Beneficiary Badge */}
                            {p.isBeneficiary && p.beneficiaryInfo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Zap className="w-3 h-3 text-amber-400" />
                                Beneficiary: {p.beneficiaryInfo.injuredPlayer}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>Vegas: <strong className="text-slate-300">{p.spread}</strong></span>
                            {p.overUnder > 0 && (
                              <span>O/U: <strong className="text-slate-300">{p.overUnder}</strong></span>
                            )}
                            <span>Team Total: <strong className="text-slate-300">{p.impliedTeamTotal}</strong></span>
                          </div>

                          {/* Beneficiary Opportunity Note */}
                          {p.isBeneficiary && p.beneficiaryInfo && (
                            <div className="mt-1.5 text-[11px] text-amber-200/90 font-medium">
                              ⚡ <strong>{p.beneficiaryInfo.opportunityBoost}:</strong> {p.beneficiaryInfo.reason}
                            </div>
                          )}
                        </div>

                        {/* Salary, Points & Draft Button */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-black text-white">
                              ${salary.toLocaleString()}
                            </div>
                            <div className="text-xs text-amber-400 font-bold">
                              {p.projectedPoints} FP{' '}
                              <span className="text-[10px] font-semibold text-slate-400">
                                ({multiplier}x)
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddPlayer(p)}
                            disabled={isRostered}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                              isRostered
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {isRostered ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Rostered
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" /> Draft
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
