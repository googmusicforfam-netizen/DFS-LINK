import { Game } from '../types/dfs.ts';

export interface ScheduleTimingResult {
  intervalSeconds: number; // 300 (5 min) or 60 (1 min)
  intervalLabel: string; // "5 Min" or "1 Min"
  mode: 'PRE_GAME_5MIN' | 'ACTIVE_SLATE_1MIN' | 'POST_SLATE_5MIN';
  earliestGame: {
    timeStr: string;
    date: Date;
    matchup: string;
  } | null;
  latestGame: {
    timeStr: string;
    date: Date;
    matchup: string;
  } | null;
  statusDescription: string;
  thirtyMinsBeforeEarliest: Date | null;
  isInActionWindow: boolean;
  minutesUntilFirstGame: number | null;
}

/**
 * Parses game time string (e.g. "7:00 PM ET", "1:00 PM ET", "12:00 PM")
 * into a Date object referencing today's date in Eastern Time (ET)
 */
export function parseGameTimeToDate(timeStr: string, now: Date = new Date()): Date | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === 'PM';

  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  // Determine today's date in Eastern Time
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === 'year')?.value || `${now.getFullYear()}`;
    const month = parts.find((p) => p.type === 'month')?.value || `${now.getMonth() + 1}`.padStart(2, '0');
    const day = parts.find((p) => p.type === 'day')?.value || `${now.getDate()}`.padStart(2, '0');

    // Check daylight saving time offset for New York (EST is UTC-5, EDT is UTC-4)
    // Create reference to get accurate timezone offset
    const testDate = new Date(`${year}-${month}-${day}T12:00:00Z`);
    const nyTimeStr = testDate.toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' });
    const isEDT = nyTimeStr.includes('EDT');
    const offsetStr = isEDT ? '-04:00' : '-05:00';

    const hhStr = String(hours).padStart(2, '0');
    const mmStr = String(minutes).padStart(2, '0');
    const isoString = `${year}-${month}-${day}T${hhStr}:${mmStr}:00${offsetStr}`;

    const parsedDate = new Date(isoString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch {
    // Fallback to local timezone today
  }

  const localDate = new Date(now);
  localDate.setHours(hours, minutes, 0, 0);
  return localDate;
}

/**
 * Computes the adaptive refresh timing based on all games on today's schedule:
 * - Reads start times of every game shown in the app
 * - Uses earliest start time as reference
 * - Until 30 minutes before earliest start time: 5 minutes (300s)
 * - From 30 minutes before earliest game until last game has started: 1 minute (60s)
 * - After last game starts: returns to 5 minutes (300s)
 */
export function computeAdaptiveRefreshSchedule(
  games: Game[],
  now: Date = new Date()
): ScheduleTimingResult {
  if (!games || games.length === 0) {
    return {
      intervalSeconds: 60,
      intervalLabel: '1 Min',
      mode: 'ACTIVE_SLATE_1MIN',
      earliestGame: null,
      latestGame: null,
      statusDescription: 'No scheduled games detected; maintaining 1-minute auto-refresh.',
      thirtyMinsBeforeEarliest: null,
      isInActionWindow: true,
      minutesUntilFirstGame: null,
    };
  }

  // Parse all game start times
  const parsedGames = games
    .map((g) => {
      const parsedDate = parseGameTimeToDate(g.gameTime, now);
      return {
        game: g,
        date: parsedDate,
        timeStr: g.gameTime,
        matchup: `${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation}`,
      };
    })
    .filter((item): item is { game: Game; date: Date; timeStr: string; matchup: string } => item.date !== null);

  if (parsedGames.length === 0) {
    return {
      intervalSeconds: 60,
      intervalLabel: '1 Min',
      mode: 'ACTIVE_SLATE_1MIN',
      earliestGame: null,
      latestGame: null,
      statusDescription: 'Dynamic schedule active: 1-minute auto-refresh.',
      thirtyMinsBeforeEarliest: null,
      isInActionWindow: true,
      minutesUntilFirstGame: null,
    };
  }

  // Sort chronologically by game start time
  parsedGames.sort((a, b) => a.date.getTime() - b.date.getTime());

  const earliest = parsedGames[0];
  const latest = parsedGames[parsedGames.length - 1];

  const nowMs = now.getTime();
  const earliestMs = earliest.date.getTime();
  const latestMs = latest.date.getTime();

  // Exactly 30 minutes before earliest game start time
  const thirtyMinsBeforeEarliestMs = earliestMs - 30 * 60 * 1000;
  const thirtyMinsBeforeDate = new Date(thirtyMinsBeforeEarliestMs);

  const minutesUntilFirst = Math.round((earliestMs - nowMs) / (60 * 1000));

  // Determine window:
  // Rule 1: Until 30 minutes before earliest start time -> 5 minutes (300s)
  if (nowMs < thirtyMinsBeforeEarliestMs) {
    const minsUntilActionWindow = Math.round((thirtyMinsBeforeEarliestMs - nowMs) / (60 * 1000));
    return {
      intervalSeconds: 300, // 5 minutes
      intervalLabel: '5 Min',
      mode: 'PRE_GAME_5MIN',
      earliestGame: {
        timeStr: earliest.timeStr,
        date: earliest.date,
        matchup: earliest.matchup,
      },
      latestGame: {
        timeStr: latest.timeStr,
        date: latest.date,
        matchup: latest.matchup,
      },
      statusDescription: `Pre-Game Window: Refreshing every 5 minutes until 30m before earliest game (${earliest.timeStr} • ${earliest.matchup}). Switches to 1-minute updates in ${minsUntilActionWindow}m.`,
      thirtyMinsBeforeEarliest: thirtyMinsBeforeDate,
      isInActionWindow: false,
      minutesUntilFirstGame: minutesUntilFirst,
    };
  }

  // Rule 2: From 30 minutes before earliest game until the last game of the day has started -> 1 minute (60s)
  if (nowMs >= thirtyMinsBeforeEarliestMs && nowMs <= latestMs) {
    return {
      intervalSeconds: 60, // 1 minute
      intervalLabel: '1 Min',
      mode: 'ACTIVE_SLATE_1MIN',
      earliestGame: {
        timeStr: earliest.timeStr,
        date: earliest.date,
        matchup: earliest.matchup,
      },
      latestGame: {
        timeStr: latest.timeStr,
        date: latest.date,
        matchup: latest.matchup,
      },
      statusDescription: `Active Slate Window: Refreshing every 1 minute for late scratches, lineup shifts, and odds movements (Earliest: ${earliest.timeStr}, Last Game: ${latest.timeStr}).`,
      thirtyMinsBeforeEarliest: thirtyMinsBeforeDate,
      isInActionWindow: true,
      minutesUntilFirstGame: minutesUntilFirst,
    };
  }

  // Rule 3: After the last game of the day has started
  return {
    intervalSeconds: 300, // 5 minutes
    intervalLabel: '5 Min',
    mode: 'POST_SLATE_5MIN',
    earliestGame: {
      timeStr: earliest.timeStr,
      date: earliest.date,
      matchup: earliest.matchup,
    },
    latestGame: {
      timeStr: latest.timeStr,
      date: latest.date,
      matchup: latest.matchup,
    },
    statusDescription: `Post-Lock Window: All scheduled games have started (Last start was ${latest.timeStr} • ${latest.matchup}). Refreshing every 5 minutes.`,
    thirtyMinsBeforeEarliest: thirtyMinsBeforeDate,
    isInActionWindow: false,
    minutesUntilFirstGame: minutesUntilFirst,
  };
}
