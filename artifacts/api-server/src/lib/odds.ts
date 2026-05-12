/**
 * Iddaa-style odds computation engine.
 * Uses team form, home advantage, and Poisson distribution.
 */

// Parse form string like "WDWWL" => points array
function parseForm(form?: string | null): number[] {
  if (!form) return [1, 1, 1, 1, 1]; // neutral if no data
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

// Expected goals using form-based model
function expectedGoals(attackerForm?: string | null, defenderForm?: string | null, isHome = false): number {
  const attackStr = formStrength(attackerForm);
  const defStr = formStrength(defenderForm);
  const homeAdv = isHome ? 0.25 : 0;
  // Base expected goals: stronger attack vs weaker defense = more goals
  const base = 1.2 + attackStr * 0.8 - defStr * 0.5 + homeAdv;
  return Math.max(0.3, Math.min(3.5, base));
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
  const withMargin = rawOdds * 0.92; // 8% margin like real bookmakers
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
  awayName: string
): OddsResult {
  const lambdaHome = expectedGoals(homeForm, awayForm, true);
  const lambdaAway = expectedGoals(awayForm, homeForm, false);

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

  // HT odds: roughly 45% of goals happen before HT
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

  // Confidence based on form data availability
  const hasFormData = homeForm && awayForm && homeForm.length >= 3 && awayForm.length >= 3;
  const formDiff = Math.abs(formStrength(homeForm) - formStrength(awayForm));
  let confidence: "low" | "medium" | "high" = "low";
  if (hasFormData && formDiff > 0.3) confidence = "high";
  else if (hasFormData) confidence = "medium";

  // Analysis text
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
  else if (under25 > 0.55) analysis += `Alt 2.5 gol ihtimali öne çıkıyor.`;
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
