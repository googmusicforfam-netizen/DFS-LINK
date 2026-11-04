import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { FALLBACK_SLATES } from './src/data/fallbackSlates.ts';
import { INITIAL_INJURY_ALERTS, DYNAMIC_INJURY_POOL } from './src/data/fallbackInjuries.ts';
import { fetchEspnSlate, fetchTodayGameCounts } from './src/services/espnService.ts';
import type { SlateData, Sport, GroundingSource, InjuryAlert } from './src/types/dfs.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Google GenAI server-side with telemetry User-Agent
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory cache for live ESPN slates to keep responses snappy (45-second TTL)
const slateCache = new Map<string, { timestamp: number; data: SlateData }>();
const CACHE_TTL_MS = 45 * 1000;

// Global rate-limit cooldown tracker to protect against 429 RESOURCE_EXHAUSTED
let rateLimitedUntil = 0;

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    isRateLimited: Date.now() < rateLimitedUntil,
    timestamp: new Date().toISOString(),
  });
});

// Sport full names map
const SPORT_NAMES: Record<Sport, string> = {
  nba: 'NBA Basketball',
  nfl: 'NFL Football',
  mlb: 'MLB Baseball',
  nhl: 'NHL Hockey',
  cfb: 'College Football',
  cbb: 'College Basketball',
};

// Get today's actual game counts across all 6 leagues from ESPN
app.get('/api/dfs/schedule-overview', async (_req: Request, res: Response) => {
  try {
    const gameCounts = await fetchTodayGameCounts();
    res.json({
      gameCounts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching schedule overview:', error);
    res.json({
      gameCounts: { nba: 0, nfl: 0, nhl: 0, cbb: 0, cfb: 0, mlb: 0 },
      timestamp: new Date().toISOString(),
    });
  }
});

// Fetch today's real schedule, Vegas lines, and DFS picks directly from ESPN Public Scoreboard API
app.get('/api/dfs/slate', async (req: Request, res: Response) => {
  const sportParam = (req.query.sport as string)?.toLowerCase() as Sport;
  const forceRefresh = req.query.refresh === 'true';
  const sport: Sport = ['nba', 'nfl', 'mlb', 'nhl', 'cfb', 'cbb'].includes(sportParam) ? sportParam : 'nba';

  const cacheKey = sport;
  const cached = slateCache.get(cacheKey);

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  // Return cached slate if within TTL and not forcing refresh
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const updatedData: SlateData = {
      ...cached.data,
      lastUpdated: `Updated at ${currentTime} (ESPN Scoreboard)`,
    };
    res.json(updatedData);
    return;
  }

  try {
    // 1. Fetch real games directly from ESPN public scoreboard
    const espnSlate = await fetchEspnSlate(sport);

    // 2. If league has NO games today (e.g. NFL on a Wednesday, MLB in off-season):
    // Strictly return empty games, empty valuePicks, empty matchups, and next game notice.
    // Zero made-up games or fake player picks!
    if (espnSlate.games.length === 0) {
      slateCache.set(cacheKey, { timestamp: Date.now(), data: espnSlate });
      res.json(espnSlate);
      return;
    }

    // 3. If league HAS games today:
    // If Gemini AI is available, force-refresh was clicked, and not rate-limited,
    // optionally enhance the narrative note or search for breaking news on today's teams.
    if (ai && forceRefresh && Date.now() >= rateLimitedUntil) {
      try {
        const activeMatchups = espnSlate.games
          .map((g) => `${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation} (Vegas: ${g.spread.text}, O/U: ${g.overUnder})`)
          .join('\n');

        const prompt = `Today's official ESPN ${SPORT_NAMES[sport]} schedule has ${espnSlate.games.length} games:
${activeMatchups}

Provide a concise 1-2 sentence DFS slate summary highlighting pace spots, highest game totals, and key injury spots.
Output JSON:
{
  "slateNote": "concise slate overview mentioning only teams playing today"
}`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(aiResponse.text || '{}');
        if (parsed.slateNote) {
          espnSlate.slateNote = `${espnSlate.games.length}-Game ESPN Slate. ${parsed.slateNote}`;
        }
      } catch (aiErr: any) {
        if (aiErr?.status === 'RESOURCE_EXHAUSTED' || String(aiErr).includes('429')) {
          rateLimitedUntil = Date.now() + 60 * 1000;
        }
        // Seamlessly continue with standard ESPN slate data
      }
    }

    // Cache and return real ESPN slate
    slateCache.set(cacheKey, { timestamp: Date.now(), data: espnSlate });
    res.json(espnSlate);
  } catch (error) {
    console.error(`Error loading ESPN slate for ${sport}:`, error);

    // If ESPN call failed, use cached or fallback if available
    if (cached) {
      res.json(cached.data);
      return;
    }

    const fallback = FALLBACK_SLATES[sport];
    res.json(fallback);
  }
});

// Custom Raw Slate Analyzer / "Put Text On Screen" Endpoint
app.post('/api/dfs/analyze-custom', async (req: Request, res: Response) => {
  const { rawText, sport } = req.body;

  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    res.status(400).json({ error: 'Please provide text to analyze.' });
    return;
  }

  if (!ai) {
    // Quick offline formatter for user text
    res.json({
      summary: 'Extracted Slate Text (Offline Mode)',
      parsedText: rawText.trim(),
      valueHighlights: [
        'Text ready to copy to clipboard',
        'Add Gemini API Key in Settings to enable automated AI value extraction and Vegas comparison',
      ],
      copyableCleanText: `📋 PARSED DFS TEXT BOARD:\n\n${rawText.trim()}`,
    });
    return;
  }

  try {
    const prompt = `You are a high-speed DFS slate parser and assistant.
A user provided the following raw DFS text (which could be DraftKings/FanDuel salaries, an injury report, Reddit r/dfsports thread snippet, or contest notes):

"""
${rawText.slice(0, 8000)}
"""

Sport context: ${sport || 'General DFS'}.

Perform the following tasks:
1. Extract any games, spreads, totals, and teams mentioned.
2. Identify the top 3-5 best value plays, salary savers, or sleepers mentioned or implied by the text.
3. Identify weak defensive matchups or injury beneficiaries.
4. Format a crystal clear, high-contrast plain text cheat sheet that the user can immediately copy with one tap and paste into their phone notes or DFS app.

Output JSON:
{
  "summary": "1-2 sentence overview of the analyzed text",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "topPicksExtracted": [
    {
      "player": "Player Name",
      "team": "Team",
      "position": "Pos",
      "salary": "Salary if found",
      "reason": "Why they are a play"
    }
  ],
  "copyableCleanText": "Crisp, beautiful plain text formatted for mobile clipboard copy"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: unknown) {
    const err = error as { status?: string; message?: string };
    const errorMsg = err?.message || String(error);
    const isRateLimit =
      err?.status === 'RESOURCE_EXHAUSTED' ||
      errorMsg.includes('429') ||
      errorMsg.includes('quota');

    if (isRateLimit) {
      rateLimitedUntil = Date.now() + 60 * 1000;
      console.warn('Custom text analysis rate limit reached (429). Activating 60s cooldown.');
    } else {
      console.warn('Custom analysis notice:', errorMsg.slice(0, 200));
    }

    res.json({
      summary: 'Slate Text Formatted (Screen Copy Mode)',
      keyTakeaways: [
        'Raw text formatted and ready for mobile copy',
        isRateLimit
          ? 'Live AI extraction rate limit reached; plain text preserved for copy/paste'
          : 'Direct text preserved on screen',
      ],
      topPicksExtracted: [],
      copyableCleanText: rawText.trim(),
    });
  }
});

// Injury Alerts state in memory
let activeInjuryAlerts: InjuryAlert[] = [...INITIAL_INJURY_ALERTS];

// GET /api/dfs/injuries - Retrieve current injury alerts & pre-lock status
app.get('/api/dfs/injuries', (req: Request, res: Response) => {
  const sportParam = (req.query.sport as string)?.toLowerCase() as Sport | undefined;
  
  let alerts = [...activeInjuryAlerts];
  if (sportParam && ['nba', 'nfl', 'mlb', 'nhl', 'cfb', 'cbb'].includes(sportParam)) {
    alerts = alerts.filter(a => a.sport === sportParam);
  }

  // Sort newest first
  alerts.sort((a, b) => b.createdAt - a.createdAt);

  // Check if any game is within the last 10 minutes of start time
  const hasCriticalPreLock = alerts.some(a => a.minutesToStart <= 10 && a.minutesToStart > 0);

  res.json({
    alerts,
    totalCount: alerts.length,
    hasCriticalPreLock,
    recommendedPollIntervalMs: hasCriticalPreLock ? 10000 : 45000, // 10s if within 10m before game!
    lastChecked: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  });
});

// GET /api/dfs/injuries/poll - Polling for newly added alerts since a timestamp
app.get('/api/dfs/injuries/poll', (req: Request, res: Response) => {
  const since = Number(req.query.since) || 0;
  const sportParam = (req.query.sport as string)?.toLowerCase() as Sport | undefined;

  let newAlerts = activeInjuryAlerts.filter(a => a.createdAt > since);
  if (sportParam && ['nba', 'nfl', 'mlb', 'nhl', 'cfb', 'cbb'].includes(sportParam)) {
    newAlerts = newAlerts.filter(a => a.sport === sportParam);
  }

  newAlerts.sort((a, b) => b.createdAt - a.createdAt);

  const hasCriticalPreLock = activeInjuryAlerts.some(a => a.minutesToStart <= 10 && a.minutesToStart > 0);

  res.json({
    newAlerts,
    hasNew: newAlerts.length > 0,
    hasCriticalPreLock,
    recommendedPollIntervalMs: hasCriticalPreLock ? 10000 : 45000,
    serverTimestamp: Date.now(),
  });
});

// POST /api/dfs/injuries/simulate - Trigger a simulated or breaking OUT alert
app.post('/api/dfs/injuries/simulate', (req: Request, res: Response) => {
  const requestedSport = (req.body.sport as Sport) || 'nba';
  const sport = ['nba', 'nfl', 'mlb', 'nhl', 'cfb', 'cbb'].includes(requestedSport) ? requestedSport : 'nba';

  const pool = DYNAMIC_INJURY_POOL[sport] || DYNAMIC_INJURY_POOL.nba;
  const template = pool[Math.floor(Math.random() * pool.length)];

  const now = Date.now();
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Generate unique simulated alert
  const newAlert: InjuryAlert = {
    ...template,
    id: `inj-sim-${sport}-${now}`,
    timestamp: timeStr,
    createdAt: now,
    minutesToStart: Math.floor(Math.random() * 8) + 3, // 3 to 10 minutes before tip-off/kickoff!
    urgency: 'CRITICAL_PRE_LOCK',
  };

  // Prepend to active alerts
  activeInjuryAlerts = [newAlert, ...activeInjuryAlerts.slice(0, 40)];

  res.json({
    success: true,
    alert: newAlert,
    message: `Breaking alert triggered: ${newAlert.playerOut} is RULED OUT!`,
  });
});

// Setup Vite in Dev or serve Static in Production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`DFS Helper server running at http://localhost:${PORT} in ${isDev ? 'development' : 'production'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
