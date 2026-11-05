import type { Sport } from './dfs.ts';

export type WatchlistPlayerStatus = 
  | 'HEALTHY' 
  | 'OUT' 
  | 'QUESTIONABLE' 
  | 'LATE SCRATCH' 
  | 'INACTIVE' 
  | 'BENEFICIARY' 
  | 'PROBABLE'
  | 'DOUBTFUL';

export interface WatchedPlayer {
  id: string; // e.g. "wat-lamarjackson"
  name: string;
  sport: Sport;
  team: string;
  teamAbbr: string;
  position: string;
  salaryDK: number;
  salaryFD: number;
  previousSalaryDK?: number;
  previousSalaryFD?: number;
  priceChangeDK?: number; // delta in $ (e.g. +600 or -400)
  priceChangeFD?: number;
  priceChangeDate?: string;
  status: WatchlistPlayerStatus;
  injuryNote?: string;
  beneficiaryNote?: string;
  gameMatchup?: string; // e.g. "JAX @ BAL"
  gameTime?: string; // e.g. "8:15 PM ET"
  starredAt: number;
  lastNotifiedAt?: number;
}

export type WatchlistNotificationType = 'INJURY' | 'PRICE_CHANGE' | 'BENEFICIARY';

export interface WatchlistNotificationEvent {
  id: string;
  type: WatchlistNotificationType;
  playerId: string;
  playerName: string;
  sport: Sport;
  team: string;
  position: string;
  title: string;
  message: string;
  details?: string;
  timestamp: string;
  createdAt: number;
  read: boolean;
}
