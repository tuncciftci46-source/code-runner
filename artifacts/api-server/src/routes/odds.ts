import { Router, type IRouter } from "express";
import {
  GetOddsResponse,
  GetOddsParams,
  ListOddsResponse,
} from "@workspace/api-zod";
import { fetchAllMatchesToday } from "../lib/espn";
import { computeOdds } from "../lib/odds";

const router: IRouter = Router();

router.get("/odds", async (_req, res): Promise<void> => {
  const matches = await fetchAllMatchesToday();

  const odds = matches
    .filter(m => m.status === "upcoming" || m.status === "live" || m.status === "halftime")
    .map(m => computeOdds(
      m.id,
      m.homeTeam.form,
      m.awayTeam.form,
      m.homeTeam.name,
      m.awayTeam.name,
      m.leagueSlug
    ));

  res.json(ListOddsResponse.parse(odds));
});

router.get("/odds/:matchId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  const params = GetOddsParams.safeParse({ matchId: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const matches = await fetchAllMatchesToday();
  const match = matches.find(m => m.id === params.data.matchId);

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const odds = computeOdds(
    match.id,
    match.homeTeam.form,
    match.awayTeam.form,
    match.homeTeam.name,
    match.awayTeam.name,
    match.leagueSlug
  );

  res.json(GetOddsResponse.parse(odds));
});

export default router;
