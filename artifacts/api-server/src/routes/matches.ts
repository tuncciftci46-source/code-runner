import { Router, type IRouter } from "express";
import { db, matchesTable, matchStatsTable, matchEventsTable, teamsTable, leaguesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListMatchesQueryParams,
  ListMatchesResponse,
  GetLiveMatchesResponse,
  GetMatchSummaryResponse,
  GetMatchParams,
  GetMatchResponse,
  GetMatchEventsParams,
  GetMatchEventsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildMatchRow(row: {
  id: number;
  leagueId: number;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: number | null;
  startTime: string;
  date: string;
  leagueName: string;
  leagueLogo: string;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamShortName: string;
  homeTeamLogo: string;
  homeTeamCountry: string;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamShortName: string;
  awayTeamLogo: string;
  awayTeamCountry: string;
}) {
  return {
    id: row.id,
    leagueId: row.leagueId,
    leagueName: row.leagueName,
    leagueLogo: row.leagueLogo,
    homeTeam: {
      id: row.homeTeamId,
      name: row.homeTeamName,
      shortName: row.homeTeamShortName,
      logo: row.homeTeamLogo,
      country: row.homeTeamCountry,
    },
    awayTeam: {
      id: row.awayTeamId,
      name: row.awayTeamName,
      shortName: row.awayTeamShortName,
      logo: row.awayTeamLogo,
      country: row.awayTeamCountry,
    },
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    status: row.status as "live" | "upcoming" | "finished" | "halftime",
    minute: row.minute,
    startTime: row.startTime,
    date: row.date,
  };
}

const homeTeams = db.$with("homeTeams").as(
  db.select().from(teamsTable)
);

router.get("/matches", async (req, res): Promise<void> => {
  const query = ListMatchesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const homeTeamAlias = teamsTable;
  const awayTeamAlias = teamsTable;

  const baseQuery = db
    .select({
      id: matchesTable.id,
      leagueId: matchesTable.leagueId,
      homeScore: matchesTable.homeScore,
      awayScore: matchesTable.awayScore,
      status: matchesTable.status,
      minute: matchesTable.minute,
      startTime: matchesTable.startTime,
      date: matchesTable.date,
      leagueName: leaguesTable.name,
      leagueLogo: leaguesTable.logo,
      homeTeamId: matchesTable.homeTeamId,
      awayTeamId: matchesTable.awayTeamId,
    })
    .from(matchesTable)
    .innerJoin(leaguesTable, eq(matchesTable.leagueId, leaguesTable.id));

  const rows = await baseQuery;

  const teamIds = [...new Set([...rows.map(r => r.homeTeamId), ...rows.map(r => r.awayTeamId)])];
  const teams = await db.select().from(teamsTable);
  const teamMap = new Map(teams.map(t => [t.id, t]));

  let filtered = rows;
  if (query.data.status && query.data.status !== "all") {
    if (query.data.status === "live") {
      filtered = rows.filter(r => r.status === "live" || r.status === "halftime");
    } else {
      filtered = rows.filter(r => r.status === query.data.status);
    }
  }
  if (query.data.leagueId) {
    filtered = filtered.filter(r => r.leagueId === query.data.leagueId);
  }

  const result = filtered.map(r => {
    const home = teamMap.get(r.homeTeamId)!;
    const away = teamMap.get(r.awayTeamId)!;
    return {
      id: r.id,
      leagueId: r.leagueId,
      leagueName: r.leagueName,
      leagueLogo: r.leagueLogo,
      homeTeam: { id: home.id, name: home.name, shortName: home.shortName, logo: home.logo, country: home.country },
      awayTeam: { id: away.id, name: away.name, shortName: away.shortName, logo: away.logo, country: away.country },
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      status: r.status as "live" | "upcoming" | "finished" | "halftime",
      minute: r.minute,
      startTime: r.startTime,
      date: r.date,
    };
  });

  res.json(ListMatchesResponse.parse(result));
});

router.get("/matches/live", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: matchesTable.id,
      leagueId: matchesTable.leagueId,
      homeScore: matchesTable.homeScore,
      awayScore: matchesTable.awayScore,
      status: matchesTable.status,
      minute: matchesTable.minute,
      startTime: matchesTable.startTime,
      date: matchesTable.date,
      leagueName: leaguesTable.name,
      leagueLogo: leaguesTable.logo,
      homeTeamId: matchesTable.homeTeamId,
      awayTeamId: matchesTable.awayTeamId,
    })
    .from(matchesTable)
    .innerJoin(leaguesTable, eq(matchesTable.leagueId, leaguesTable.id));

  const liveRows = rows.filter(r => r.status === "live" || r.status === "halftime");
  const teams = await db.select().from(teamsTable);
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const result = liveRows.map(r => {
    const home = teamMap.get(r.homeTeamId)!;
    const away = teamMap.get(r.awayTeamId)!;
    return {
      id: r.id,
      leagueId: r.leagueId,
      leagueName: r.leagueName,
      leagueLogo: r.leagueLogo,
      homeTeam: { id: home.id, name: home.name, shortName: home.shortName, logo: home.logo, country: home.country },
      awayTeam: { id: away.id, name: away.name, shortName: away.shortName, logo: away.logo, country: away.country },
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      status: r.status as "live" | "upcoming" | "finished" | "halftime",
      minute: r.minute,
      startTime: r.startTime,
      date: r.date,
    };
  });

  res.json(GetLiveMatchesResponse.parse(result));
});

router.get("/matches/summary", async (_req, res): Promise<void> => {
  const allMatches = await db.select({ status: matchesTable.status, homeScore: matchesTable.homeScore, awayScore: matchesTable.awayScore }).from(matchesTable);

  const liveCount = allMatches.filter(m => m.status === "live" || m.status === "halftime").length;
  const upcomingCount = allMatches.filter(m => m.status === "upcoming").length;
  const finishedCount = allMatches.filter(m => m.status === "finished").length;
  const finishedMatches = allMatches.filter(m => m.status === "finished");
  const totalGoalsToday = finishedMatches.reduce((acc, m) => acc + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);

  res.json(GetMatchSummaryResponse.parse({ liveCount, upcomingCount, finishedCount, totalGoalsToday }));
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: matchesTable.id,
      leagueId: matchesTable.leagueId,
      homeScore: matchesTable.homeScore,
      awayScore: matchesTable.awayScore,
      status: matchesTable.status,
      minute: matchesTable.minute,
      startTime: matchesTable.startTime,
      date: matchesTable.date,
      leagueName: leaguesTable.name,
      leagueLogo: leaguesTable.logo,
      homeTeamId: matchesTable.homeTeamId,
      awayTeamId: matchesTable.awayTeamId,
    })
    .from(matchesTable)
    .innerJoin(leaguesTable, eq(matchesTable.leagueId, leaguesTable.id))
    .where(eq(matchesTable.id, params.data.id));

  if (!rows[0]) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const teams = await db.select().from(teamsTable);
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const r = rows[0];
  const home = teamMap.get(r.homeTeamId)!;
  const away = teamMap.get(r.awayTeamId)!;

  const [statsRow] = await db.select().from(matchStatsTable).where(eq(matchStatsTable.matchId, r.id));

  const stats = statsRow ?? {
    homePossession: 50, awayPossession: 50,
    homeShots: 0, awayShots: 0,
    homeShotsOnTarget: 0, awayShotsOnTarget: 0,
    homeCorners: 0, awayCorners: 0,
    homeFouls: 0, awayFouls: 0,
    homeYellowCards: 0, awayYellowCards: 0,
    homeRedCards: 0, awayRedCards: 0,
    homeOffsides: 0, awayOffsides: 0,
  };

  const result = {
    id: r.id,
    leagueId: r.leagueId,
    leagueName: r.leagueName,
    leagueLogo: r.leagueLogo,
    homeTeam: { id: home.id, name: home.name, shortName: home.shortName, logo: home.logo, country: home.country },
    awayTeam: { id: away.id, name: away.name, shortName: away.shortName, logo: away.logo, country: away.country },
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    status: r.status as "live" | "upcoming" | "finished" | "halftime",
    minute: r.minute,
    startTime: r.startTime,
    date: r.date,
    stats: {
      homePossession: stats.homePossession,
      awayPossession: stats.awayPossession,
      homeShots: stats.homeShots,
      awayShots: stats.awayShots,
      homeShotsOnTarget: stats.homeShotsOnTarget,
      awayShotsOnTarget: stats.awayShotsOnTarget,
      homeCorners: stats.homeCorners,
      awayCorners: stats.awayCorners,
      homeFouls: stats.homeFouls,
      awayFouls: stats.awayFouls,
      homeYellowCards: stats.homeYellowCards,
      awayYellowCards: stats.awayYellowCards,
      homeRedCards: stats.homeRedCards,
      awayRedCards: stats.awayRedCards,
      homeOffsides: stats.homeOffsides,
      awayOffsides: stats.awayOffsides,
    },
  };

  res.json(GetMatchResponse.parse(result));
});

router.get("/matches/:id/events", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMatchEventsParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const events = await db
    .select()
    .from(matchEventsTable)
    .where(eq(matchEventsTable.matchId, params.data.id))
    .orderBy(matchEventsTable.minute);

  const result = events.map(e => ({
    id: e.id,
    matchId: e.matchId,
    minute: e.minute,
    type: e.type as "goal" | "yellow_card" | "red_card" | "substitution" | "penalty" | "own_goal",
    team: e.team as "home" | "away",
    playerName: e.playerName,
    assistName: e.assistName ?? null,
    description: e.description ?? null,
  }));

  res.json(GetMatchEventsResponse.parse(result));
});

export default router;
