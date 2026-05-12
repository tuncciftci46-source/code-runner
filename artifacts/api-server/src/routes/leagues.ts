import { Router, type IRouter } from "express";
import { db, leaguesTable, standingsTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListLeaguesResponse,
  GetStandingsResponse,
  GetStandingsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leagues", async (_req, res): Promise<void> => {
  const leagues = await db.select().from(leaguesTable);
  res.json(ListLeaguesResponse.parse(leagues));
});

router.get("/leagues/:id/standings", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetStandingsParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      rank: standingsTable.rank,
      played: standingsTable.played,
      won: standingsTable.won,
      drawn: standingsTable.drawn,
      lost: standingsTable.lost,
      goalsFor: standingsTable.goalsFor,
      goalsAgainst: standingsTable.goalsAgainst,
      goalDifference: standingsTable.goalDifference,
      points: standingsTable.points,
      form: standingsTable.form,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      teamShortName: teamsTable.shortName,
      teamLogo: teamsTable.logo,
      teamCountry: teamsTable.country,
    })
    .from(standingsTable)
    .innerJoin(teamsTable, eq(standingsTable.teamId, teamsTable.id))
    .where(eq(standingsTable.leagueId, params.data.id))
    .orderBy(standingsTable.rank);

  const result = rows.map((r) => ({
    rank: r.rank,
    team: {
      id: r.teamId,
      name: r.teamName,
      shortName: r.teamShortName,
      logo: r.teamLogo,
      country: r.teamCountry,
    },
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalDifference,
    points: r.points,
    form: r.form,
  }));

  res.json(GetStandingsResponse.parse(result));
});

export default router;
