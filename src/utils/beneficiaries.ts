import type {
  InjuryAlert,
  InjuryBeneficiary,
  BeneficiaryPlayer,
  Sport,
  BeneficiaryConfidence,
} from '../types/dfs.ts';

/**
 * Determines default opportunity type based on position and sport.
 */
function inferOpportunityType(
  sport: Sport,
  position: string
): 'Playing Time' | 'Targets' | 'Touches' | 'Shots' | 'Ice Time' {
  if (sport === 'nhl') return 'Ice Time';
  if (sport === 'nfl' || sport === 'cfb') {
    if (position.includes('WR') || position.includes('TE')) return 'Targets';
    if (position.includes('RB')) return 'Touches';
    if (position.includes('QB')) return 'Playing Time';
  }
  if (sport === 'mlb') return 'Playing Time';
  if (sport === 'nba' || sport === 'cbb') {
    if (position.includes('G') || position.includes('PG') || position.includes('SG')) return 'Playing Time';
    return 'Shots';
  }
  return 'Playing Time';
}

/**
 * Calculates or infers a standardized opportunity score (0 to 100) for ranking.
 */
function calculateOpportunityScore(
  player: BeneficiaryPlayer,
  alert: InjuryAlert
): number {
  if (typeof player.opportunityScore === 'number') {
    return player.opportunityScore;
  }

  let score = 75; // base

  // Role impact
  if (player.role === 'New Starter') score += 15;
  else if (player.role === 'Usage Monster') score += 12;
  else if (player.role === 'Next Man Up') score += 8;
  else if (player.role === 'Expanded Minutes') score += 6;
  else if (player.role === 'Punt Salary Saver') score += 5;

  // Urgency impact (late scratches right before lock have massive immediate opportunity shifts)
  if (alert.urgency === 'CRITICAL_PRE_LOCK' || alert.minutesToStart <= 10) score += 6;

  // Projected minutes / bump hints
  const note = (player.dfsImpactNote || '').toLowerCase();
  if (note.includes('smash') || note.includes('undisputed') || note.includes('triple-double')) score += 5;
  if (note.includes('+14') || note.includes('+12') || note.includes('35+') || note.includes('92%')) score += 4;

  return Math.min(99, Math.max(50, score));
}

/**
 * Derives a clean, concise reason focusing on extra playing time, targets, touches, shots, or ice time.
 */
function deriveReason(
  player: BeneficiaryPlayer,
  alert: InjuryAlert,
  oppType: 'Playing Time' | 'Targets' | 'Touches' | 'Shots' | 'Ice Time'
): string {
  if (player.reason) return player.reason;

  const roleDesc = player.role === 'New Starter' ? 'Takes over starting spot' : 'Steps into primary rotation';
  const oppLabel =
    oppType === 'Targets'
      ? 'extra target share and red zone looks'
      : oppType === 'Touches'
      ? 'extra carries and goal-line touches'
      : oppType === 'Ice Time'
      ? 'extra top-unit ice time and power-play shifts'
      : oppType === 'Shots'
      ? 'extra field goal attempts and shot creation'
      : 'extra playing time and starting minutes';

  return `${roleDesc} at ${player.position} with ${alert.playerOut} ruled out; gets ${oppLabel}.`;
}

/**
 * Determines whether the beneficiary is underpriced relative to their expected opportunity.
 */
function checkUnderpriced(
  salaryDK: number,
  oppScore: number,
  expectedMultiplier: number
): { isUnderpriced: boolean; tag?: string } {
  // Clear value threshold: low salary + high opportunity boost
  if (salaryDK <= 4500 && oppScore >= 80) {
    return { isUnderpriced: true, tag: '🚨 SMASH VALUE' };
  }
  if (salaryDK <= 5400 && oppScore >= 85) {
    return { isUnderpriced: true, tag: 'UNDERPRICED STARTER' };
  }
  if (expectedMultiplier >= 5.8) {
    return { isUnderpriced: true, tag: 'HIGH LEVERAGE' };
  }
  if (salaryDK <= 3800) {
    return { isUnderpriced: true, tag: 'PUNT SAVIOR' };
  }
  if (oppScore >= 92 && salaryDK <= 6500) {
    return { isUnderpriced: true, tag: 'UNDERPRICED VALUE' };
  }
  return { isUnderpriced: false };
}

/**
 * Extracts and standardizes all beneficiaries from active injury alerts,
 * highlighting underpriced plays and ranking everyone by expected increase in opportunity.
 */
export function extractBeneficiariesFromAlerts(alerts: InjuryAlert[]): InjuryBeneficiary[] {
  const result: InjuryBeneficiary[] = [];

  for (const alert of alerts) {
    if (!alert.fillIns || alert.fillIns.length === 0) continue;

    for (let i = 0; i < alert.fillIns.length; i++) {
      const fillIn = alert.fillIns[i];
      const oppType = fillIn.opportunityType || inferOpportunityType(alert.sport, fillIn.position);
      const oppScore = calculateOpportunityScore(fillIn, alert) - (i * 3); // primary fillIn ranked slightly higher
      const salaryDK = fillIn.salaryDK || 4500;
      const salaryFD = fillIn.salaryFD || Math.round(salaryDK * 1.1);

      // Estimated projected fantasy points based on role and salary
      const projectedPoints =
        fillIn.projectedPoints ||
        parseFloat((salaryDK / 1000 * 5.6 + (oppScore > 85 ? 4.5 : 2.0)).toFixed(1));

      const expectedValueMultiplier =
        fillIn.expectedValueMultiplier ||
        parseFloat((projectedPoints / (salaryDK / 1000)).toFixed(1));

      const { isUnderpriced, tag } = checkUnderpriced(
        salaryDK,
        oppScore,
        expectedValueMultiplier
      );

      const confidenceLevel: BeneficiaryConfidence =
        fillIn.confidenceLevel ||
        (oppScore >= 90 ? 'Lock' : oppScore >= 82 ? 'Very High' : oppScore >= 74 ? 'High' : 'Medium');

      const confidencePct = fillIn.confidencePct || Math.min(98, Math.max(68, oppScore));

      const boostString =
        fillIn.opportunityBoost ||
        fillIn.projectedMinutes ||
        (oppType === 'Targets'
          ? '+7-9 targets expected'
          : oppType === 'Touches'
          ? '+15-18 touches expected'
          : oppType === 'Ice Time'
          ? '+6.5 mins ice time (PP1)'
          : oppType === 'Shots'
          ? '+6-8 shot attempts'
          : '+12-15 extra minutes');

      const reason = deriveReason(fillIn, alert, oppType);

      result.push({
        id: `ben-${alert.id}-${i}-${fillIn.name.replace(/\s+/g, '').toLowerCase()}`,
        alertId: alert.id,
        sport: alert.sport,
        sportName: alert.sportName,
        team: alert.team,
        teamAbbr: alert.teamAbbr,
        injuredPlayer: alert.playerOut,
        injuredPosition: alert.position,
        injuryDetail: alert.injuryDetail,
        officialStatus: alert.officialStatus,
        gameMatchup: alert.gameMatchup,
        gameTime: alert.gameTime,
        beneficiaryName: fillIn.name,
        position: fillIn.position,
        role: fillIn.role,
        reason,
        opportunityType: oppType,
        opportunityBoost: boostString,
        opportunityScore: oppScore,
        confidenceLevel,
        confidencePct,
        salaryDK,
        salaryFD,
        projectedPoints,
        expectedValueMultiplier,
        isUnderpriced: fillIn.isUnderpriced ?? isUnderpriced,
        underpricedTag: fillIn.underpricedTag || tag,
        timestamp: alert.timestamp,
        createdAt: alert.createdAt,
      });
    }
  }

  // Rank everyone by expected increase in opportunity (opportunityScore descending)
  result.sort((a, b) => b.opportunityScore - a.opportunityScore);

  return result;
}

/**
 * Filter beneficiaries by sport or 'all'.
 */
export function filterBeneficiariesBySport(
  beneficiaries: InjuryBeneficiary[],
  sportFilter: Sport | 'all'
): InjuryBeneficiary[] {
  if (sportFilter === 'all') return beneficiaries;
  return beneficiaries.filter((b) => b.sport === sportFilter);
}

/**
 * Computes counts of beneficiaries by sport for filter pills.
 */
export function getBeneficiaryCountsBySport(
  beneficiaries: InjuryBeneficiary[]
): Record<Sport | 'all', number> {
  const counts: Record<Sport | 'all', number> = {
    all: beneficiaries.length,
    nba: 0,
    nfl: 0,
    nhl: 0,
    cbb: 0,
    cfb: 0,
    mlb: 0,
  };

  for (const b of beneficiaries) {
    if (counts[b.sport] !== undefined) {
      counts[b.sport]++;
    }
  }

  return counts;
}

/**
 * Formats a clean clipboard-ready string for 1-tap mobile copying.
 */
export function formatBeneficiaryShareText(b: InjuryBeneficiary): string {
  const underpricedText = b.isUnderpriced ? ` [${b.underpricedTag || 'UNDERPRICED VALUE'}]` : '';
  return `⚡ INJURY BENEFICIARY: ${b.beneficiaryName} (${b.position}, ${b.teamAbbr})
• Injured Out: ${b.injuredPlayer} (${b.injuredPosition}, ${b.officialStatus})
• Opportunity Shift: ${b.opportunityBoost} (${b.opportunityType})
• Confidence: ${b.confidenceLevel} (${b.confidencePct}%)
• Reason: ${b.reason}
• DFS Pricing: DK $${b.salaryDK.toLocaleString()} | FD $${b.salaryFD.toLocaleString()} (${b.expectedValueMultiplier}x value)${underpricedText}
• Matchup: ${b.gameMatchup} (${b.gameTime})`;
}
