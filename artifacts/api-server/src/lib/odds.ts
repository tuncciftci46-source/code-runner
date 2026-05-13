/**
 * Iddaa-style odds computation engine & xG analysis.
 * Uses team form, home advantage, Poisson distribution, and league coefficients.
 */

// League-specific average goals per match (from historical data)
const LEAGUE_COEFFICIENTS: Record<string, { avgHomeGoals: number; avgAwayGoals: number }> = {
  "eng.1": { avgHomeGoals: 1.53, avgAwayGoals: 1.18 },
  "esp.1": { avgHomeGoals: 1.42, avgAwayGoals: 1.08 },
  "ger.1": { avgHomeGoals: 1.65, avgAwayGoals: 1.25 },
  "ita.1": { avgHomeGoals: 1.48, avgAwayGoals: 1.12 },
  "fra.1": { avgHomeGoals: 1.38, avgAwayGoals: 1.02 },
  "tur.1": { avgHomeGoals: 1.52, avgAwayGoals: 1.15 },
  "ned.1": { avgHomeGoals: 1.58, avgAwayGoals: 1.22 },
  "por.1": { avgHomeGoals: 1.35, avgAwayGoals: 1.05 },
  "usa.1": { avgHomeGoals: 1.55, avgAwayGoals: 1.20 },
  "uefa.champions": { avgHomeGoals: 1.50, avgAwayGoals: 1.15 },
  "uefa.europa": { avgHomeGoals: 1.45, avgAwayGoals: 1.10 },
};

// Parse form string like "WDWWL" => points array
function parseForm(form?: string | null): number[] {
  if (!form) return [1, 1, 1, 1, 1];
  return form.split("").map(c => {
    if (c === "W") return 3;
    if (c === "D") return 1;
    return 0;
  });
}

// Form strength: 0.0 - 1.0
function formStrength(form?: string | null): number {
  const pts = parseForm(form);
  const max = pts.length * 3;
  return pts.reduce((a, b) => a + b, 0) / max;
}

// Win rate from form
function winRate(form?: string | null): number {
  if (!form) return 0.33;
  const chars = form.split("");
  return chars.filter(c => c === "W").length / chars.length;
}

function drawRate(form?: string | null): number {
  if (!form) return 0.28;
  const chars = form.split("");
  return chars.filter(c => c === "D").length / chars.length;
}

// Expected goals using form-based model with league coefficients
function expectedGoals(
  attackerForm?: string | null,
  defenderForm?: string | null,
  isHome = false,
  leagueSlug?: string
): number {
  const attackStr = formStrength(attackerForm);
  const defStr = formStrength(defenderForm);
  const homeAdv = isHome ? 0.25 : 0;

  const leagueAvg = leagueSlug ? LEAGUE_COEFFICIENTS[leagueSlug] : null;
  const baseAvg = isHome
    ? (leagueAvg?.avgHomeGoals ?? 1.45)
    : (leagueAvg?.avgAwayGoals ?? 1.10);

  const base = baseAvg + attackStr * 0.6 - defStr * 0.35 + homeAdv;
  return Math.max(0.3, Math.min(4.0, base));
}

// Poisson probability: P(X = k) = e^(-lambda) * lambda^k / k!
function poisson(lambda: number, k: number): number {
  let result = Math.exp(-lambda);
  for (let i = 0; i < k; i++) result *= lambda / (i + 1);
  return result;
}

// Compute score probability matrix
function scoreProbMatrix(lambdaHome: number, lambdaAway: number, maxGoals = 6) {
  const matrix: number[][] = [];
  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      matrix[h][a] = poisson(lambdaHome, h) * poisson(lambdaAway, a);
    }
  }
  return matrix;
}

// Convert probability to decimal odds with 10% margin
function probToOdds(prob: number): number {
  if (prob <= 0) return 99;
  const rawOdds = 1 / prob;
  const withMargin = rawOdds * 0.92;
  return Math.round(withMargin * 100) / 100;
}

// Round to 2 decimal places
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface OddsResult {
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  btts: number;
  noBtts: number;
  over25: number;
  under25: number;
  over15: number;
  under15: number;
  htHome: number;
  htDraw: number;
  htAway: number;
  htHomeOdds: number;
  htDrawOdds: number;
  htAwayOdds: number;
  topScores: Array<{ score: string; probability: number }>;
  confidence: "low" | "medium" | "high";
  analysis: string;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
}

export function computeOdds(
  matchId: string,
  homeForm: string | null | undefined,
  awayForm: string | null | undefined,
  homeName: string,
  awayName: string,
  leagueSlug?: string
): OddsResult {
  const lambdaHome = expectedGoals(homeForm, awayForm, true, leagueSlug);
  const lambdaAway = expectedGoals(awayForm, homeForm, false, leagueSlug);

  const matrix = scoreProbMatrix(lambdaHome, lambdaAway);

  let homeWin = 0, draw = 0, awayWin = 0;
  let btts = 0, over25 = 0, over15 = 0;
  const maxGoals = matrix.length - 1;

  const scoreProbabilities: Array<{ score: string; probability: number }> = [];

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = matrix[h][a];
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;

      if (h > 0 && a > 0) btts += p;
      if (h + a > 2) over25 += p;
      if (h + a > 1) over15 += p;

      if (h <= 4 && a <= 4 && p > 0.01) {
        scoreProbabilities.push({ score: `${h}-${a}`, probability: r2(p) });
      }
    }
  }

  scoreProbabilities.sort((a, b) => b.probability - a.probability);
  const topScores = scoreProbabilities.slice(0, 8);

  const lambdaHTHome = lambdaHome * 0.45;
  const lambdaHTAway = lambdaAway * 0.45;
  const htMatrix = scoreProbMatrix(lambdaHTHome, lambdaHTAway, 4);

  let htHome = 0, htDraw = 0, htAway = 0;
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const p = htMatrix[h][a];
      if (h > a) htHome += p;
      else if (h === a) htDraw += p;
      else htAway += p;
    }
  }

  const hasFormData = homeForm && awayForm && homeForm.length >= 3 && awayForm.length >= 3;
  const formDiff = Math.abs(formStrength(homeForm) - formStrength(awayForm));
  let confidence: "low" | "medium" | "high" = "low";
  if (hasFormData && formDiff > 0.3) confidence = "high";
  else if (hasFormData) confidence = "medium";

  const homeStr = r2(formStrength(homeForm) * 100);
  const awayStr = r2(formStrength(awayForm) * 100);
  const dominant = homeStr > awayStr ? homeName : awayStr > homeStr ? awayName : null;
  const expectedTotal = r2(lambdaHome + lambdaAway);

  let analysis = "";
  if (dominant) {
    analysis = `${dominant} son forma göre rakibinden güçlü durumda (Form gücü: ${homeName} %${homeStr} / ${awayName} %${awayStr}). `;
  } else {
    analysis = `İki takım da benzer form performansı sergiliyor (${homeName} %${homeStr} / ${awayName} %${awayStr}). `;
  }
  analysis += `Beklenen toplam gol sayısı ${expectedTotal}. `;
  if (over25 > 0.55) analysis += `Üst 2.5 gol ihtimali yüksek.`;
  else if (over25 < 0.45) analysis += `Alt 2.5 gol ihtimali öne çıkıyor.`;
  else analysis += `Gol sayısı konusunda belirsizlik var.`;

  const noBtts = 1 - btts;
  const under25 = 1 - over25;
  const under15 = 1 - over15;

  return {
    matchId,
    homeWin: r2(homeWin),
    draw: r2(draw),
    awayWin: r2(awayWin),
    homeOdds: probToOdds(homeWin),
    drawOdds: probToOdds(draw),
    awayOdds: probToOdds(awayWin),
    btts: r2(btts),
    noBtts: r2(noBtts),
    over25: r2(over25),
    under25: r2(under25),
    over15: r2(over15),
    under15: r2(under15),
    htHome: r2(htHome),
    htDraw: r2(htDraw),
    htAway: r2(htAway),
    htHomeOdds: probToOdds(htHome),
    htDrawOdds: probToOdds(htDraw),
    htAwayOdds: probToOdds(htAway),
    topScores,
    confidence,
    analysis,
    expectedGoalsHome: r2(lambdaHome),
    expectedGoalsAway: r2(lambdaAway),
  };
}

// xG Analysis types
export interface XgAnalysisResult {
  matchId: string;
  homeXg: number;
  awayXg: number;
  homeXgPerShot: number;
  awayXgPerShot: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeXgDifference: number;
  awayXgDifference: number;
  homeEfficiency: number;
  awayEfficiency: number;
  homeXgTimeline: XgTimelinePoint[];
  awayXgTimeline: XgTimelinePoint[];
  winProbability: { home: number; draw: number; away: number };
  analysis: string;
}

export interface XgTimelinePoint {
  minute: number;
  homeXg: number;
  awayXg: number;
  cumulativeHomeXg: number;
  cumulativeAwayXg: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
}

// Compute per-shot xG value from statistics
// Avg shot quality = shotsOnTarget / totalShots * leagueAvgConversion
function shotQuality(shots: number, shotsOnTarget: number): number {
  if (shots === 0) return 0;
  const onTargetRatio = shotsOnTarget / shots;
  // Average xG per shot: on-target shots ~0.25 xG, off-target ~0.03 xG
  return (onTargetRatio * 0.25 + (1 - onTargetRatio) * 0.03);
}

// Total xG from shots
function xgFromShots(shots: number, shotsOnTarget: number): number {
  const quality = shotQuality(shots, shotsOnTarget);
  return r2(shots * quality);
}

// xG per shot
function xgPerShot(shots: number, totalXg: number): number {
  if (shots === 0) return 0;
  return r2(totalXg / shots);
}

// xG difference: actual goals - expected goals
function xgDifference(goals: number, expectedXg: number): number {
  return r2(goals - expectedXg);
}

// Efficiency: goals / xG
function efficiency(goals: number, expectedXg: number): number {
  if (expectedXg === 0) return goals > 0 ? 99 : 0;
  return r2(goals / expectedXg);
}

// Simulate xG accumulation over match minutes
function simulateXgTimeline(
  lambdaHome: number,
  lambdaAway: number,
  homeGoals: number,
  awayGoals: number,
  currentMinute: number,
  totalMinutes = 90
): { homeTimeline: XgTimelinePoint[]; awayTimeline: XgTimelinePoint[] } {
  const intervals = Math.min(Math.floor(currentMinute / 5) + 1, 18);
  const homeTimeline: XgTimelinePoint[] = [];
  const awayTimeline: XgTimelinePoint[] = [];

  let cumHomeXg = 0;
  let cumAwayXg = 0;

  for (let i = 0; i < intervals; i++) {
    const minute = Math.min((i + 1) * 5, currentMinute);
    const segmentMin = minute / totalMinutes;
    const prevSegment = i > 0 ? (i * 5) / totalMinutes : 0;

    const segmentHomeXg = lambdaHome * (segmentMin - prevSegment);
    const segmentAwayXg = lambdaAway * (segmentMin - prevSegment);

    cumHomeXg = r2(cumHomeXg + segmentHomeXg);
    cumAwayXg = r2(cumAwayXg + segmentAwayXg);

    const remainingHomeLambda = Math.max(0, lambdaHome * (1 - segmentMin));
    const remainingAwayLambda = Math.max(0, lambdaAway * (1 - segmentMin));

    const winProb = computeWinProbability(
      homeGoals,
      awayGoals,
      remainingHomeLambda,
      remainingAwayLambda
    );

    homeTimeline.push({
      minute,
      homeXg: r2(segmentHomeXg),
      awayXg: 0,
      cumulativeHomeXg: cumHomeXg,
      cumulativeAwayXg: cumAwayXg,
      homeWinProb: r2(winProb.home),
      drawProb: r2(winProb.draw),
      awayWinProb: r2(winProb.away),
    });

    awayTimeline.push({
      minute,
      homeXg: 0,
      awayXg: r2(segmentAwayXg),
      cumulativeHomeXg: cumHomeXg,
      cumulativeAwayXg: cumAwayXg,
      homeWinProb: r2(winProb.home),
      drawProb: r2(winProb.draw),
      awayWinProb: r2(winProb.away),
    });
  }

  return { homeTimeline, awayTimeline };
}

// Compute win probability given current score and remaining expected goals
function computeWinProbability(
  homeGoals: number,
  awayGoals: number,
  remainingLambdaHome: number,
  remainingLambdaAway: number
): { home: number; draw: number; away: number } {
  const matrix = scoreProbMatrix(remainingLambdaHome, remainingLambdaAway, 5);

  let homeWin = 0, draw = 0, awayWin = 0;

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = matrix[h][a];
      const finalHome = homeGoals + h;
      const finalAway = awayGoals + a;

      if (finalHome > finalAway) homeWin += p;
      else if (finalHome === finalAway) draw += p;
      else awayWin += p;
    }
  }

  const total = homeWin + draw + awayWin;
  if (total === 0) return { home: 0.33, draw: 0.34, away: 0.33 };

  return {
    home: r2(homeWin / total),
    draw: r2(draw / total),
    away: r2(awayWin / total),
  };
}

export function computeXgAnalysis(
  matchId: string,
  homeForm: string | null | undefined,
  awayForm: string | null | undefined,
  homeName: string,
  awayName: string,
  leagueSlug: string | undefined,
  homeGoals: number,
  awayGoals: number,
  homeShots: number,
  awayShots: number,
  homeShotsOnTarget: number,
  awayShotsOnTarget: number,
  currentMinute: number,
  status: string
): XgAnalysisResult {
  const lambdaHome = expectedGoals(homeForm, awayForm, true, leagueSlug);
  const lambdaAway = expectedGoals(awayForm, homeForm, false, leagueSlug);

  const totalHomeXg = xgFromShots(homeShots, homeShotsOnTarget);
  const totalAwayXg = xgFromShots(awayShots, awayShotsOnTarget);

  const homeXpS = xgPerShot(homeShots, totalHomeXg);
  const awayXpS = xgPerShot(awayShots, totalAwayXg);

  const homeXgDiff = xgDifference(homeGoals, totalHomeXg);
  const awayXgDiff = xgDifference(awayGoals, totalAwayXg);

  const homeEff = efficiency(homeGoals, totalHomeXg);
  const awayEff = efficiency(awayGoals, totalAwayXg);

  const isLive = status === "live" || status === "halftime";
  const minute = isLive ? Math.max(currentMinute, 1) : (status === "finished" ? 90 : 0);

  const { homeTimeline, awayTimeline } = simulateXgTimeline(
    lambdaHome, lambdaAway, homeGoals, awayGoals, minute
  );

  const remainingHome = Math.max(0, lambdaHome * (1 - minute / 90));
  const remainingAway = Math.max(0, lambdaAway * (1 - minute / 90));
  const winProb = computeWinProbability(homeGoals, awayGoals, remainingHome, remainingAway);

  const homeFormStr = r2(formStrength(homeForm) * 100);
  const awayFormStr = r2(formStrength(awayForm) * 100);

  let analysis = `${homeName} ${totalHomeXg} xG (${homeShots} şut, ${homeShotsOnTarget} isabetli), ${awayName} ${totalAwayXg} xG (${awayShots} şut, ${awayShotsOnTarget} isabetli). `;

  const xgDiff = totalHomeXg - totalAwayXg;
  if (Math.abs(xgDiff) > 0.5) {
    const ahead = xgDiff > 0 ? homeName : awayName;
    analysis += `${ahead} oyun olarak üstün (xG farkı: ${Math.abs(r2(xgDiff))}). `;
  } else {
    analysis += `İki takım da yakın xG üretiyor. `;
  }

  if (isLive) {
    if (homeEff > 1.5) analysis += `${homeName} şansını iyi kullanıyor (gerçek gol: ${homeGoals}, xG: ${totalHomeXg}). `;
    else if (homeEff < 0.5 && homeGoals > 0) analysis += `${homeName} şanssız (gerçek gol: ${homeGoals}, xG: ${totalHomeXg}). `;

    if (awayEff > 1.5) analysis += `${awayName} şansını iyi kullanıyor (gerçek gol: ${awayGoals}, xG: ${totalAwayXg}). `;
    else if (awayEff < 0.5 && awayGoals > 0) analysis += `${awayName} şanssız (gerçek gol: ${awayGoals}, xG: ${totalAwayXg}). `;
  }

  analysis += `Form gücü: ${homeName} %${homeFormStr} / ${awayName} %${awayFormStr}. Kazanma olasılığı: ${homeName} %${r2(winProb.home * 100)} / Beraberlik %${r2(winProb.draw * 100)} / ${awayName} %${r2(winProb.away * 100)}.`;

  return {
    matchId,
    homeXg: totalHomeXg,
    awayXg: totalAwayXg,
    homeXgPerShot: homeXpS,
    awayXgPerShot: awayXpS,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homeXgDifference: homeXgDiff,
    awayXgDifference: awayXgDiff,
    homeEfficiency: homeEff,
    awayEfficiency: awayEff,
    homeXgTimeline: homeTimeline,
    awayXgTimeline: awayTimeline,
    winProbability: winProb,
    analysis,
  };
}
