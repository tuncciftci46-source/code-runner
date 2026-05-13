import { Router, type IRouter } from "express";
import { fetchAllMatchesToday, fetchMatchDetails } from "../lib/espn";
import { computeXgAnalysis } from "../lib/odds";

const router: IRouter = Router();

router.get("/matches/:id/xganalysis", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const matchId = raw;

  const allMatches = (await fetchAllMatchesToday()).filter((m): m is NonNullable<typeof m> => m != null);
  const match = allMatches.find(m => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const summary = await fetchMatchDetails(matchId) as {
    boxscore?: {
      teams?: Array<{
        team: { id: string };
        statistics?: Array<{ name: string; displayValue: string }>;
      }>;
    };
  } | null;

  let homeShots = 0, awayShots = 0;
  let homeShotsOnTarget = 0, awayShotsOnTarget = 0;

  if (summary?.boxscore?.teams) {
    const homeTeamStats = summary.boxscore.teams.find(
      t => t.team.id === match.homeTeam.id
    )?.statistics || [];
    const awayTeamStats = summary.boxscore.teams.find(
      t => t.team.id === match.awayTeam.id
    )?.statistics || [];

    const getStat = (arr: Array<{ name: string; displayValue: string }>, name: string): number => {
      const s = arr.find(s => s.name === name);
      return s ? parseInt(s.displayValue, 10) || 0 : 0;
    };

    homeShots = getStat(homeTeamStats, "totalShots");
    awayShots = getStat(awayTeamStats, "totalShots");
    homeShotsOnTarget = getStat(homeTeamStats, "shotsOnTarget");
    awayShotsOnTarget = getStat(awayTeamStats, "shotsOnTarget");
  }

  const minute = match.minute ? parseInt(match.minute, 10) || 0 : 0;

  const result = computeXgAnalysis(
    match.id,
    match.homeTeam.form,
    match.awayTeam.form,
    match.homeTeam.name,
    match.awayTeam.name,
    match.leagueSlug,
    match.homeScore ?? 0,
    match.awayScore ?? 0,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    minute,
    match.status
  );

  res.json(result);
});

export default router;