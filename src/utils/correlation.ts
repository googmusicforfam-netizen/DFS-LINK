import type {
  SlatePlayer,
  PlayerCorrelationSuggestion,
  LineupCorrelationReport,
  CorrelationType,
} from '../types/slates.ts';
import type { Sport } from '../types/dfs.ts';

/**
 * Calculates pairwise correlation between two players in DFS.
 */
export function getPairCorrelation(
  p1: SlatePlayer,
  p2: SlatePlayer,
  sport: Sport
): { score: number; type: CorrelationType; relationshipTitle: string; explanation: string; action: 'RECOMMENDED_STACK' | 'BRING_BACK' | 'AVOID_CONFLICT' } | null {
  if (p1.id === p2.id) return null;

  const sameTeam = p1.team === p2.team;
  const isOpponent = p1.opponent.includes(p2.team) || p2.opponent.includes(p1.team);

  // If not same game, correlation is practically 0.00
  if (!sameTeam && !isOpponent) {
    return null;
  }

  // ================= NFL & CFB =================
  if (sport === 'nfl' || sport === 'cfb') {
    // 1. Direct Negative Conflicts
    if (isOpponent) {
      if ((p1.position === 'QB' && p2.position === 'DST') || (p2.position === 'QB' && p1.position === 'DST')) {
        return {
          score: -0.68,
          type: 'NEGATIVE_CONFLICT',
          relationshipTitle: 'Direct Conflict Warning (QB vs Opposing DST)',
          explanation: `DST scores points on sacks and turnovers against the opposing QB, severely reducing combined ceiling. Avoid pairing unless hunting extreme low-scoring contrarian variance.`,
          action: 'AVOID_CONFLICT',
        };
      }
      if ((p1.position === 'RB' && p2.position === 'DST') || (p2.position === 'RB' && p1.position === 'DST')) {
        return {
          score: -0.58,
          type: 'NEGATIVE_CONFLICT',
          relationshipTitle: 'Direct Conflict Warning (Starting RB vs Opposing DST)',
          explanation: `Opposing defense thrives when holding the opposing running game down. Rushing TDs directly erase defensive fantasy points.`,
          action: 'AVOID_CONFLICT',
        };
      }

      // 2. Shootout Bring-Backs (Opponents)
      const qb = p1.position === 'QB' ? p1 : p2.position === 'QB' ? p2 : null;
      const oppSkill = qb ? (p1.id === qb.id ? p2 : p1) : null;

      if (qb && oppSkill && ['WR', 'TE'].includes(oppSkill.position)) {
        return {
          score: 0.46,
          type: 'SHOOTOUT_BRING_BACK',
          relationshipTitle: 'Shootout Game-Stack Bring-Back',
          explanation: `In high-scoring games, when ${qb.name}'s offense scores through the air, ${oppSkill.team} is forced to throw heavily to keep up, supercharging ${oppSkill.name}'s target volume.`,
          action: 'BRING_BACK',
        };
      }

      if (qb && oppSkill && oppSkill.position === 'RB') {
        return {
          score: 0.28,
          type: 'SHOOTOUT_BRING_BACK',
          relationshipTitle: 'Trailing Game-Script Pass Catching RB',
          explanation: `If ${qb.team} builds a quick lead, ${oppSkill.team} relies on hurry-up checkdown targets to ${oppSkill.name}.`,
          action: 'BRING_BACK',
        };
      }
    }

    // 3. Positive Same-Team Stacks
    if (sameTeam) {
      const qb = p1.position === 'QB' ? p1 : p2.position === 'QB' ? p2 : null;
      const receiver = qb ? (p1.id === qb.id ? p2 : p1) : null;

      if (qb && receiver) {
        if (receiver.position === 'WR') {
          return {
            score: 0.74,
            type: 'PASSING_STACK',
            relationshipTitle: 'Primary Passing Stack',
            explanation: `Elite positive synergy (+0.74). Every passing yard and touchdown from ${qb.name} directly doubles into ${receiver.name}'s fantasy score. Required for high-finish GPP tournaments.`,
            action: 'RECOMMENDED_STACK',
          };
        }
        if (receiver.position === 'TE') {
          return {
            score: 0.62,
            type: 'PASSING_STACK',
            relationshipTitle: 'Red-Zone Passing Stack',
            explanation: `Strong correlation (+0.62). High-leverage red zone targets and end-zone looks give this duo massive ceiling when the offense enters scoring territory.`,
            action: 'RECOMMENDED_STACK',
          };
        }
        if (receiver.position === 'RB') {
          return {
            score: 0.38,
            type: 'PASSING_STACK',
            relationshipTitle: 'Backfield Screen / Dump-Off Synergy',
            explanation: `Positive correlation (+0.38). Provides safety floor on quick blitzes and short-area PPR completions.`,
            action: 'RECOMMENDED_STACK',
          };
        }
      }

      // RB + DST Synergy
      if ((p1.position === 'RB' && p2.position === 'DST') || (p2.position === 'RB' && p1.position === 'DST')) {
        const rb = p1.position === 'RB' ? p1 : p2;
        const dst = p1.position === 'DST' ? p1 : p2;
        return {
          score: 0.45,
          type: 'RUN_DEFENSE_SYNERGY',
          relationshipTitle: 'Positive Game-Script & Lead Protection',
          explanation: `Strong positive script correlation (+0.45). When ${dst.team} gets defensive stops and leads, ${rb.team} commits to running the ball and milking clock with ${rb.name}.`,
          action: 'RECOMMENDED_STACK',
        };
      }
    }
  }

  // ================= NHL =================
  if (sport === 'nhl') {
    // 1. Direct Goalie Conflict
    if (isOpponent) {
      if (p1.position === 'G' || p2.position === 'G') {
        const goalie = p1.position === 'G' ? p1 : p2;
        const skater = p1.position === 'G' ? p2 : p1;
        return {
          score: -0.74,
          type: 'NEGATIVE_CONFLICT',
          relationshipTitle: 'Direct Goalie Conflict Warning',
          explanation: `Every goal or point scored by ${skater.name} directly degrades ${goalie.name}'s goals-against average, save percentage bonus, and win probability.`,
          action: 'AVOID_CONFLICT',
        };
      }
    }

    // 2. Same-Team Line Stacking
    if (sameTeam) {
      if ((p1.position === 'C' && p2.position === 'W') || (p1.position === 'W' && p2.position === 'C')) {
        return {
          score: 0.76,
          type: 'POWER_PLAY_STACK',
          relationshipTitle: 'Top-Line & Power Play 1 Stack',
          explanation: `Massive synergy (+0.76). Even-strength linemates and power-play unit partners frequently tally primary and secondary assists on each other's goals.`,
          action: 'RECOMMENDED_STACK',
        };
      }
      if ((p1.position === 'D' && ['C', 'W'].includes(p2.position)) || (p2.position === 'D' && ['C', 'W'].includes(p1.position))) {
        return {
          score: 0.52,
          type: 'BLUE_LINE_STACK',
          relationshipTitle: 'Blue-Line Point-Man Stack',
          explanation: `High correlation (+0.52). Defenseman quarterbacks the power play and feeds pucks into the slot for tip-ins and rebounds.`,
          action: 'RECOMMENDED_STACK',
        };
      }
      if (p1.position === 'W' && p2.position === 'W') {
        return {
          score: 0.48,
          type: 'POWER_PLAY_STACK',
          relationshipTitle: 'Wing Pairing Stack',
          explanation: `Strong correlation (+0.48) when sharing top-six ice time or special teams shifts.`,
          action: 'RECOMMENDED_STACK',
        };
      }
    }
  }

  // ================= NBA & CBB =================
  if (sport === 'nba' || sport === 'cbb') {
    if (sameTeam) {
      // PG + Center Pick-and-roll
      if (
        (p1.position === 'PG' && ['C', 'PF'].includes(p2.position)) ||
        (p2.position === 'PG' && ['C', 'PF'].includes(p1.position))
      ) {
        const pg = p1.position === 'PG' ? p1 : p2;
        const big = p1.position === 'PG' ? p2 : p1;
        return {
          score: 0.48,
          type: 'PICK_AND_ROLL',
          relationshipTitle: 'Pick-and-Roll Alley-Oop Synergy',
          explanation: `Positive correlation (+0.48). ${pg.name} generates assist bonuses feeding ${big.name} on rim rolls and interior lobs.`,
          action: 'RECOMMENDED_STACK',
        };
      }

      // PG + Wing shooter
      if (
        (p1.position === 'PG' && ['SG', 'SF'].includes(p2.position)) ||
        (p2.position === 'PG' && ['SG', 'SF'].includes(p1.position))
      ) {
        const pg = p1.position === 'PG' ? p1 : p2;
        const wing = p1.position === 'PG' ? p2 : p1;
        return {
          score: 0.41,
          type: 'DRIVE_AND_KICK',
          relationshipTitle: 'Drive-and-Kick Perimeter Assist Stack',
          explanation: `Positive correlation (+0.41). ${pg.name} collapses defenses and kicks out to ${wing.name} for spot-up 3-pointers.`,
          action: 'RECOMMENDED_STACK',
        };
      }
    }

    if (isOpponent) {
      // Shootout pace environment
      if (p1.overUnder >= 225 || p1.projectedPoints >= 38 && p2.projectedPoints >= 38) {
        return {
          score: 0.44,
          type: 'SHOOTOUT_BRING_BACK',
          relationshipTitle: 'Fast-Paced Game Shootout Synergy',
          explanation: `High-tempo game environment (O/U ${p1.overUnder || 225}+). Elite possessions and back-and-forth scoring lifts both alpha playmakers simultaneously.`,
          action: 'BRING_BACK',
        };
      }
    }
  }

  return null;
}

/**
 * Generates tailored correlation suggestions for a selected player against the available player pool.
 */
export function getCorrelationSuggestions(
  selectedPlayer: SlatePlayer,
  currentLineup: (SlatePlayer | null)[],
  pool: SlatePlayer[],
  sport: Sport
): PlayerCorrelationSuggestion[] {
  const suggestions: PlayerCorrelationSuggestion[] = [];
  const lineupPlayerIds = new Set(
    currentLineup.filter((p): p is SlatePlayer => p !== null).map((p) => p.id)
  );

  for (const candidate of pool) {
    if (candidate.id === selectedPlayer.id) continue;

    const pairResult = getPairCorrelation(selectedPlayer, candidate, sport);
    if (!pairResult) continue;

    const sign = pairResult.score > 0 ? '+' : '';
    const scoreLabel = `${sign}${pairResult.score.toFixed(2)} (${
      pairResult.score >= 0.6
        ? 'Strong Positive'
        : pairResult.score > 0
        ? 'Moderate Positive'
        : 'Direct Conflict'
    })`;

    suggestions.push({
      targetPlayer: selectedPlayer,
      partnerPlayer: candidate,
      type: pairResult.type,
      score: pairResult.score,
      scoreLabel,
      relationshipTitle: pairResult.relationshipTitle,
      explanation: pairResult.explanation,
      action: pairResult.action,
    });
  }

  // Sort: Positive stacks first (highest score descending), then conflicts at the end
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions;
}

/**
 * Evaluates the entire roster for overall correlation synergy, positive stacks, and negative conflict warnings.
 */
export function calculateLineupCorrelation(
  lineup: (SlatePlayer | null)[],
  sport: Sport
): LineupCorrelationReport {
  const activePlayers = lineup.filter((p): p is SlatePlayer => p !== null);

  if (activePlayers.length < 2) {
    return {
      overallScore: 0,
      ratingGrade: 'B',
      summary: 'Add more players to evaluate correlation and stack synergy.',
      positivePairs: [],
      conflictWarnings: [],
      stacksDetected: [],
    };
  }

  const positivePairs: PlayerCorrelationSuggestion[] = [];
  const conflictWarnings: PlayerCorrelationSuggestion[] = [];
  const teamCounts = new Map<string, number>();

  let totalCorrelationScore = 0;

  for (let i = 0; i < activePlayers.length; i++) {
    const p1 = activePlayers[i];
    teamCounts.set(p1.team, (teamCounts.get(p1.team) || 0) + 1);

    for (let j = i + 1; j < activePlayers.length; j++) {
      const p2 = activePlayers[j];
      const result = getPairCorrelation(p1, p2, sport);

      if (result) {
        const sign = result.score > 0 ? '+' : '';
        const item: PlayerCorrelationSuggestion = {
          targetPlayer: p1,
          partnerPlayer: p2,
          type: result.type,
          score: result.score,
          scoreLabel: `${sign}${result.score.toFixed(2)}`,
          relationshipTitle: result.relationshipTitle,
          explanation: result.explanation,
          action: result.action,
        };

        if (result.score > 0) {
          positivePairs.push(item);
          totalCorrelationScore += result.score * 25;
        } else {
          conflictWarnings.push(item);
          totalCorrelationScore += result.score * 35; // Heavy penalty for conflicts
        }
      }
    }
  }

  // Stacks detected
  const stacksDetected: string[] = [];
  for (const [team, count] of teamCounts.entries()) {
    if (count >= 2) {
      stacksDetected.push(`${team} (${count} Players)`);
    }
  }

  // Calculate rating grade
  let ratingGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'Needs Attention' = 'B';
  if (conflictWarnings.length > 0) {
    ratingGrade = 'Needs Attention';
  } else if (positivePairs.length >= 2 && totalCorrelationScore >= 40) {
    ratingGrade = 'A+';
  } else if (positivePairs.length >= 1 && totalCorrelationScore >= 20) {
    ratingGrade = 'A';
  } else if (totalCorrelationScore >= 10) {
    ratingGrade = 'B+';
  } else if (totalCorrelationScore < 0) {
    ratingGrade = 'C';
  }

  let summary = '';
  if (conflictWarnings.length > 0) {
    summary = `⚠️ ${conflictWarnings.length} conflicting matchup pairing detected (e.g. QB vs opposing DST). Resolving this can immediately boost your tournament ceiling.`;
  } else if (positivePairs.length > 0) {
    summary = `🔥 Outstanding tournament synergy! ${positivePairs.length} positively correlated stack pairing(s) boosting combined ceiling.`;
  } else {
    summary = `Solid unstacked roster. Consider pairing your primary ball handler or QB with their top pass catcher to maximize tournament upside.`;
  }

  return {
    overallScore: Math.round(totalCorrelationScore),
    ratingGrade,
    summary,
    positivePairs,
    conflictWarnings,
    stacksDetected,
  };
}
