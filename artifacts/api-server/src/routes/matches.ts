import { Router, type IRouter } from "express";
import {
  ListMatchesResponse,
  GetLiveMatchesResponse,
  GetMatchSummaryResponse,
  GetMatchParams,
  GetMatchResponse,
  GetMatchEventsParams,
  GetMatchEventsResponse,
  ListMatchesQueryParams,
} from "@workspace/api-zod";
import { fetchAllMatchesToday, fetchMatchDetails, mapESPNEventToMatch } from "../lib/espn";

const router: IRouter = Router();

router.get("/matches", async (req, res): Promise<void> => {
  const query = ListMatchesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let matches = await fetchAllMatchesToday();

  const { status, leagueSlug } = query.data;
  if (status && status !== "all") {
    if (status === "live") {
      matches = matches.filter(m => m.status === "live" || m.status === "halftime");
    } else {
      matches = matches.filter(m => m.status === status);
    }
  }
  if (leagueSlug) {
    matches = matches.filter(m => m.leagueSlug === leagueSlug);
  }

  res.json(ListMatchesResponse.parse(matches));
});

router.get("/matches/live", async (_req, res): Promise<void> => {
  const matches = await fetchAllMatchesToday();
  const live = matches.filter(m => m.status === "live" || m.status === "halftime");
  res.json(GetLiveMatchesResponse.parse(live));
});

router.get("/matches/summary", async (_req, res): Promise<void> => {
  const matches = await fetchAllMatchesToday();
  const liveCount = matches.filter(m => m.status === "live" || m.status === "halftime").length;
  const upcomingCount = matches.filter(m => m.status === "upcoming").length;
  const finishedCount = matches.filter(m => m.status === "finished").length;
  const totalGoalsToday = matches
    .filter(m => m.status === "finished" || m.status === "live" || m.status === "halftime")
    .reduce((acc, m) => acc + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);

  res.json(GetMatchSummaryResponse.parse({
    liveCount,
    upcomingCount,
    finishedCount,
    totalGoalsToday,
    totalMatches: matches.length,
  }));
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMatchParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Find the match in today's scoreboard
  const allMatches = await fetchAllMatchesToday();
  const match = allMatches.find(m => m.id === params.data.id);
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  // Fetch detailed summary for stats
  const summary = await fetchMatchDetails(params.data.id) as {
    boxscore?: {
      teams?: Array<{
        team: { id: string };
        statistics?: Array<{ name: string; displayValue: string }>;
      }>;
    };
  } | null;

  const defaultStats = {
    homePossession: 50, awayPossession: 50,
    homeShots: 0, awayShots: 0,
    homeShotsOnTarget: 0, awayShotsOnTarget: 0,
    homeCorners: 0, awayCorners: 0,
    homeFouls: 0, awayFouls: 0,
    homeYellowCards: 0, awayYellowCards: 0,
    homeRedCards: 0, awayRedCards: 0,
    homeOffsides: 0, awayOffsides: 0,
  };

  let stats = defaultStats;

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

    const homePoss = getStat(homeTeamStats, "possessionPct");
    const awayPoss = getStat(awayTeamStats, "possessionPct");

    stats = {
      homePossession: homePoss || 50,
      awayPossession: awayPoss || (homePoss ? 100 - homePoss : 50),
      homeShots: getStat(homeTeamStats, "totalShots"),
      awayShots: getStat(awayTeamStats, "totalShots"),
      homeShotsOnTarget: getStat(homeTeamStats, "shotsOnTarget"),
      awayShotsOnTarget: getStat(awayTeamStats, "shotsOnTarget"),
      homeCorners: getStat(homeTeamStats, "corners"),
      awayCorners: getStat(awayTeamStats, "corners"),
      homeFouls: getStat(homeTeamStats, "foulsCommitted"),
      awayFouls: getStat(awayTeamStats, "foulsCommitted"),
      homeYellowCards: getStat(homeTeamStats, "yellowCards"),
      awayYellowCards: getStat(awayTeamStats, "yellowCards"),
      homeRedCards: getStat(homeTeamStats, "redCards"),
      awayRedCards: getStat(awayTeamStats, "redCards"),
      homeOffsides: getStat(homeTeamStats, "offsides"),
      awayOffsides: getStat(awayTeamStats, "offsides"),
    };
  }

  const result = { ...match, stats };
  res.json(GetMatchResponse.parse(result));
});

router.get("/matches/:id/events", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMatchEventsParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const summary = await fetchMatchDetails(params.data.id) as {
    plays?: Array<{
      id?: string;
      clock?: { displayValue?: string };
      team?: { id?: string };
      type?: { id?: string; text?: string };
      athletesInvolved?: Array<{ displayName: string }>;
      text?: string;
      scoringPlay?: boolean;
      penaltyKick?: boolean;
    }>;
    header?: {
      competitions?: Array<{
        competitors?: Array<{ homeAway: string; team: { id: string } }>;
      }>;
    };
  } | null;

  if (!summary) {
    res.json(GetMatchEventsResponse.parse([]));
    return;
  }

  const allMatches = await fetchAllMatchesToday();
  const match = allMatches.find(m => m.id === params.data.id);

  const homeId = match?.homeTeam.id;
  const awayId = match?.awayTeam.id;

  const plays = summary.plays || [];
  const events = plays
    .filter(p => p.type?.text && (
      p.scoringPlay ||
      p.type.text.toLowerCase().includes("goal") ||
      p.type.text.toLowerCase().includes("yellow") ||
      p.type.text.toLowerCase().includes("red") ||
      p.type.text.toLowerCase().includes("substitut") ||
      p.type.text.toLowerCase().includes("penalty")
    ))
    .map((p, idx) => {
      const typeText = (p.type?.text || "").toLowerCase();
      let eventType: "goal" | "yellow_card" | "red_card" | "substitution" | "penalty" | "own_goal" | "var" = "goal";
      if (typeText.includes("yellow")) eventType = "yellow_card";
      else if (typeText.includes("red")) eventType = "red_card";
      else if (typeText.includes("substitut")) eventType = "substitution";
      else if (typeText.includes("penalty") || p.penaltyKick) eventType = "penalty";
      else if (typeText.includes("own goal")) eventType = "own_goal";

      const teamId = p.team?.id;
      const team: "home" | "away" = teamId === homeId ? "home" : "away";

      const athletes = p.athletesInvolved || [];
      const playerName = athletes[0]?.displayName || "Bilinmiyor";
      const assistName = athletes[1]?.displayName || null;

      return {
        id: p.id || `evt-${idx}`,
        matchId: params.data.id,
        minute: p.clock?.displayValue || "?",
        type: eventType,
        team,
        playerName,
        assistName,
        description: p.text || null,
      };
    });

  res.json(GetMatchEventsResponse.parse(events));
});

export default router;
