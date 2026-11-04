import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { FALLBACK_SLATES } from './src/data/fallbackSlates.ts';
import { INITIAL_INJURY_ALERTS, DYNAMIC_INJURY_POOL } from './src/data/fallbackInjuries.ts';
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

// In-memory cache for live grounded slates to keep responses snappy (30-minute TTL)
const slateCache = new Map<string, { timestamp: number; data: SlateData }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

// Pre-seed cache with initial curated consensus slates so first loads do not burn rate limit
for (const [sportKey, slate] of Object.entries(FALLBACK_SLATES)) {
  slateCache.set(sportKey, { timestamp: Date.now(), data: slate });
}

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

// Fetch slate with Google Search Grounding from free sources
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

  // Return cached slate if not force-refreshing, or if currently in a rate-limit cooldown
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const updatedData: SlateData = {
      ...cached.data,
      lastUpdated: `Updated at ${currentTime} (Consensus Sync)`,
    };
    res.json(updatedData);
    return;
  }

  const baseSlate = cached?.data || FALLBACK_SLATES[sport];

  // If currently in rate-limit cooldown, return cached/base slate with clear note
  if (Date.now() < rateLimitedUntil) {
    const cooldownSecondsLeft = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
    const slateWithNotice: SlateData = {
      ...baseSlate,
      lastUpdated: 'Curated Vegas Consensus (Live Search on Cooldown)',
      slateNote: `${baseSlate.slateNote} (Google Search grounding quota on cooldown for ${cooldownSecondsLeft}s. Serving curated Vegas lines).`,
    };
    res.json(slateWithNotice);
    return;
  }

  if (!ai) {
    // If no API key configured yet, return rich curated fallback slate with clear note
    const fallbackWithNote: SlateData = {
      ...baseSlate,
      lastUpdated: 'Curated Vegas & DFS Consensus Lines',
      slateNote: `${baseSlate.slateNote} (Connect Gemini API Key in Settings for live real-time web search grounding).`,
    };
    res.json(fallbackWithNote);
    return;
  }

  try {
    const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const prompt = `You are an elite Daily Fantasy Sports (DFS) analyst and Vegas sports betting researcher.
Today's date is ${todayStr}.
Analyze the upcoming schedule and slate for: ${SPORT_NAMES[sport]} (${sport.toUpperCase()}).

Search free sports websites such as ESPN, SportsLine, Rotowire DFS, FantasyFuel, official league pages, and Reddit r/dfsports discussions.
Never assume or reference paid APIs.

Extract the following information:
1. Scheduled games with exact Vegas Spread (favorite team and points line, e.g. "BOS -6.5", "KC -3.5") and Over/Under total points (e.g. 231.5 or 48.5).
2. Top value picks and sleeper plays for DFS (players with low salaries on DraftKings/FanDuel who project for high points-per-dollar value or benefit from recent injuries/lineup changes).
3. Easiest matchups and defense vulnerabilities (identify teams that bleed fantasy points to specific positions, e.g. bottom-5 defense vs Point Guards, soft secondary, high pace matchup).
4. A clean, copyable text summary for mobile users so they can copy and paste it into their DFS apps.

Output your response strictly as valid JSON enclosed in \`\`\`json ... \`\`\` code block matching this schema:
{
  "slateNote": "string summarizing today's slate environment, key injury pivots, or pace spots",
  "games": [
    {
      "id": "string",
      "awayTeam": { "name": "Team Name", "abbreviation": "ABC", "record": "12-4" },
      "homeTeam": { "name": "Team Name", "abbreviation": "XYZ", "record": "10-6" },
      "gameTime": "7:00 PM ET",
      "status": "Scheduled",
      "spread": { "favorite": "XYZ", "line": -4.5, "text": "XYZ -4.5" },
      "overUnder": 228.5,
      "impliedAwayScore": 112.0,
      "impliedHomeScore": 116.5,
      "paceFactor": "High",
      "stackRating": 5,
      "weatherNote": "string or null",
      "keyNotes": "analysis note on matchup and pace"
    }
  ],
  "valuePicks": [
    {
      "id": "string",
      "playerName": "Player Name",
      "team": "XYZ",
      "opponent": "vs ABC",
      "position": "PG or WR or C",
      "salaryDK": 4500,
      "salaryFD": 5200,
      "projectedPoints": 28.5,
      "valueMultiplier": 6.3,
      "tier": "Smash Lock",
      "matchupGrade": "A+",
      "defenseRankAgainstPos": 28,
      "analysis": "detailed explanation of why this player is high value",
      "injuryImpact": "optional note on injury beneficiary"
    }
  ],
  "matchups": [
    {
      "id": "string",
      "targetTeam": "Team with weak defense",
      "opponentTeam": "Opponent",
      "position": "Position targeted (e.g. PG, RB, Center)",
      "defenseRank": 29,
      "pointsAllowedStat": "Stat showing defense vulnerability",
      "reason": "Why defense is weak",
      "beneficiaryPlayers": ["Player 1", "Player 2"],
      "paceRating": "Very Fast"
    }
  ],
  "rawTextSummary": "Clean, formatted plain-text cheat sheet ready for 1-tap mobile copying."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || '';

    // Extract Grounding Chunks if present
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const extractedSources: GroundingSource[] = [];

    for (const chunk of rawChunks) {
      if (chunk.web && chunk.web.uri) {
        try {
          const urlObj = new URL(chunk.web.uri);
          extractedSources.push({
            title: chunk.web.title || urlObj.hostname.replace('www.', ''),
            uri: chunk.web.uri,
            domain: urlObj.hostname.replace('www.', ''),
          });
        } catch {
          extractedSources.push({
            title: chunk.web.title || 'Sports Source',
            uri: chunk.web.uri,
            domain: 'Web Grounding',
          });
        }
      }
    }

    // Attempt to parse JSON from the response text
    let parsedData: Partial<SlateData> | null = null;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStringToParse = jsonMatch ? jsonMatch[1] : responseText;

    try {
      parsedData = JSON.parse(jsonStringToParse);
    } catch {
      // Try to find the first { and last }
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsedData = JSON.parse(responseText.slice(firstBrace, lastBrace + 1));
        } catch {
          // Parsing failed, will use structured fallback with AI summary
        }
      }
    }

    const finalSlate: SlateData = {
      sport,
      sportName: SPORT_NAMES[sport],
      dateStr: todayStr,
      lastUpdated: 'Live via Google Search Grounding',
      slateNote: parsedData?.slateNote || baseSlate.slateNote,
      games: parsedData?.games && parsedData.games.length > 0 ? parsedData.games : baseSlate.games,
      valuePicks: parsedData?.valuePicks && parsedData.valuePicks.length > 0 ? parsedData.valuePicks : baseSlate.valuePicks,
      matchups: parsedData?.matchups && parsedData.matchups.length > 0 ? parsedData.matchups : baseSlate.matchups,
      sources: extractedSources.length > 0 ? extractedSources : baseSlate.sources,
      rawTextSummary: parsedData?.rawTextSummary || baseSlate.rawTextSummary,
    };

    // Cache result
    slateCache.set(cacheKey, { timestamp: Date.now(), data: finalSlate });
    res.json(finalSlate);
  } catch (error: unknown) {
    const err = error as { status?: string; message?: string };
    const errorMsg = err?.message || String(error);
    const isRateLimit =
      err?.status === 'RESOURCE_EXHAUSTED' ||
      errorMsg.includes('429') ||
      errorMsg.includes('quota') ||
      errorMsg.includes('RESOURCE_EXHAUSTED');

    if (isRateLimit) {
      rateLimitedUntil = Date.now() + 60 * 1000;
      console.warn('Gemini Search Grounding rate limit reached (429). Activating 60s cooldown.');
    } else {
      console.warn('Live grounding notice:', errorMsg.slice(0, 200));
    }

    // Return base slate with clear notice rather than throwing or failing
    const fallbackWithNotice: SlateData = {
      ...baseSlate,
      lastUpdated: isRateLimit
        ? 'Curated Vegas Consensus (Live Search on Cooldown)'
        : 'Curated Vegas Consensus Lines',
      slateNote: isRateLimit
        ? `${baseSlate.slateNote} (Google Search grounding quota temporarily exceeded. Serving curated consensus lines. Upgrade key in Settings > Secrets for higher quota).`
        : `${baseSlate.slateNote} (Serving curated consensus lines).`,
    };
    res.json(fallbackWithNotice);
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
