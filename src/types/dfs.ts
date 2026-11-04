export type Sport = 'nba' | 'nfl' | 'mlb' | 'nhl' | 'cfb' | 'cbb';

export interface Team {
  name: string;
  abbreviation: string;
  record?: string;
  logoColor?: string;
}

export interface GameSpread {
  favorite: string; // e.g. "BOS"
  line: number; // e.g. -6.5
  text: string; // e.g. "BOS -6.5"
}

export interface TeamLineup {
  status: 'Confirmed' | 'Projected';
  starters: string[];
  keyNote?: string;
}

export interface Game {
  id: string;
  sport: Sport;
  awayTeam: Team;
  homeTeam: Team;
  gameTime: string; // e.g. "7:00 PM ET"
  status: 'Scheduled' | 'Live' | 'Final';
  spread: GameSpread;
  overUnder: number; // e.g. 231.5
  impliedAwayScore: number;
  impliedHomeScore: number;
  paceFactor?: 'Very High' | 'High' | 'Average' | 'Slow';
  stackRating?: number; // 1 to 5 stars
  weatherNote?: string;
  keyNotes?: string;
  startingLineups?: {
    away: TeamLineup;
    home: TeamLineup;
  };
}

export type ValueTier = 'Smash Lock' | 'High Value' | 'Salary Saver' | 'Tournament GPP Sleeper';
export type MatchupGrade = 'A+' | 'A' | 'B+' | 'B' | 'C';

export interface ValuePick {
  id: string;
  playerName: string;
  team: string;
  opponent: string;
  position: string;
  salaryDK?: number;
  salaryFD?: number;
  projectedPoints: number;
  valueMultiplier: number; // e.g. 5.6x
  tier: ValueTier;
  matchupGrade: MatchupGrade;
  defenseRankAgainstPos: number; // e.g. 29 (meaning 29th worst in league = easy matchup)
  analysis: string;
  injuryImpact?: string;
}

export interface MatchupVulnerability {
  id: string;
  targetTeam: string; // team with weak defense
  opponentTeam: string;
  position: string;
  defenseRank: number; // e.g. 28th
  pointsAllowedStat: string; // e.g. "Allows 28.6 PPG & 11.2 APG to Point Guards"
  reason: string; // e.g. "Missing starting rim protector; vulnerable in pick-and-roll"
  beneficiaryPlayers: string[];
  paceRating: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
  domain?: string;
}

export interface SlateData {
  sport: Sport;
  sportName: string;
  dateStr: string;
  lastUpdated: string;
  slateNote: string;
  games: Game[];
  valuePicks: ValuePick[];
  matchups: MatchupVulnerability[];
  sources: GroundingSource[];
  rawTextSummary: string;
  nextGameNotice?: string;
  hasGamesToday?: boolean;
}

export type AlertUrgency = 'STANDARD' | 'HIGH' | 'CRITICAL_PRE_LOCK';

export interface BeneficiaryPlayer {
  name: string;
  position: string;
  team: string;
  role: 'New Starter' | 'Next Man Up' | 'Usage Monster' | 'Expanded Minutes' | 'Punt Salary Saver';
  projectedMinutes?: string; // e.g. "32-35 mins (+11)"
  salaryDK?: number;
  salaryFD?: number;
  dfsImpactNote: string; // e.g. "Takes over primary playmaking; 28% projected usage"
}

export interface InjuryAlert {
  id: string;
  sport: Sport;
  sportName: string;
  playerOut: string;
  team: string;
  teamAbbr: string;
  position: string;
  injuryDetail: string; // e.g. "Left hamstring strain"
  officialStatus: 'OUT' | 'LATE SCRATCH' | 'INACTIVE' | 'DNP';
  gameMatchup: string; // e.g. "IND @ ATL"
  gameTime: string; // e.g. "7:30 PM ET"
  minutesToStart: number; // minutes before start time (e.g. 7 = last 10 mins pre-lock!)
  timestamp: string; // e.g. "7:18 PM ET"
  createdAt: number;
  urgency: AlertUrgency;
  fillIns: BeneficiaryPlayer[];
}
