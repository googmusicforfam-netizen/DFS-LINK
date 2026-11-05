import type { Sport, Game } from './dfs.ts';

export type DfsSite = 'DraftKings' | 'FanDuel';

export type SlateFormat = 
  | 'Single-Game Showdown'
  | 'Main Slate'
  | 'Classic (Thu-Sun)'
  | 'Single-Game SuperFlex'
  | 'Express / Turbo'
  | 'Classic';

export interface SlatePlayer {
  id: string;
  name: string;
  sport: Sport;
  team: string;
  teamName: string;
  opponent: string;
  position: string; // QB, RB, WR, TE, DST, PG, SG, SF, PF, C, W, D, G, etc.
  eligiblePositions: string[];
  salaryDK: number;
  salaryFD: number;
  projectedPoints: number;
  gameId: string;
  gameMatchup: string; // e.g. "JAX @ BAL"
  gameTime: string; // e.g. "8:15 PM ET"
  isHome: boolean;
  spread: string; // e.g. "BAL -6.5"
  overUnder: number; // e.g. 48.5
  impliedTeamTotal: number;
  injuryStatus?: 'OUT' | 'QUESTIONABLE' | 'HEALTHY' | 'LATE SCRATCH' | 'PROBABLE';
  injuryNote?: string;
  isBeneficiary?: boolean;
  beneficiaryInfo?: {
    injuredPlayer: string;
    role: string;
    opportunityBoost: string;
    confidenceLevel: string;
    isUnderpriced: boolean;
    reason: string;
  };
}

export interface DfsSlateContest {
  id: string;
  site: DfsSite;
  sport: Sport;
  sportName: string;
  name: string; // e.g. "DraftKings NFL TNF Single-Game Showdown: JAX @ BAL"
  format: SlateFormat;
  startTime: string; // e.g. "8:15 PM ET"
  salaryCap: number; // $50,000 for DK, $60,000 for FD
  rosterSlots: string[]; // e.g. ['CPT (1.5x)', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX']
  games: Game[];
  gameCount: number;
  description: string;
  featuredPrizePool?: string; // e.g. "$1.2M Maker ($300K to 1st)"
  playerPool: SlatePlayer[];
}

export type CorrelationType = 
  | 'PASSING_STACK' // QB + WR/TE
  | 'RUN_DEFENSE_SYNERGY' // RB + Team DST
  | 'SHOOTOUT_BRING_BACK' // QB + Opposing WR/TE
  | 'POWER_PLAY_STACK' // NHL C + W on PP1
  | 'BLUE_LINE_STACK' // NHL D + F
  | 'PICK_AND_ROLL' // NBA PG + C
  | 'DRIVE_AND_KICK' // NBA PG + Wing Shooter
  | 'NEGATIVE_CONFLICT' // QB vs Opposing DST, RB vs Opposing DST, Goalie vs Skater
  | 'USAGE_CANNIBALIZATION'; // 2 high-volume backup guards or backup QBs

export interface PlayerCorrelationSuggestion {
  targetPlayer: SlatePlayer;
  partnerPlayer: SlatePlayer;
  type: CorrelationType;
  score: number; // -1.00 to +1.00 (e.g. +0.74, +0.46, -0.68)
  scoreLabel: string; // e.g. "+0.74 (Strong Positive)"
  relationshipTitle: string; // e.g. "Primary Passing Stack"
  explanation: string;
  action: 'RECOMMENDED_STACK' | 'BRING_BACK' | 'AVOID_CONFLICT';
}

export interface LineupSlotItem {
  slotId: string;
  slotName: string; // e.g. 'QB', 'CPT (1.5x)', 'FLEX', 'DST'
  allowedPositions: string[];
  isMultiplier?: boolean;
  multiplierValue?: number; // 1.5 for Captain / MVP
  player: SlatePlayer | null;
}

export interface LineupCorrelationReport {
  overallScore: number; // -100 to 100
  ratingGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'Needs Attention';
  summary: string;
  positivePairs: PlayerCorrelationSuggestion[];
  conflictWarnings: PlayerCorrelationSuggestion[];
  stacksDetected: string[];
}
