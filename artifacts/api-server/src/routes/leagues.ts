import { Router, type IRouter } from "express";
import {
  ListLeaguesResponse,
  GetStandingsResponse,
  GetStandingsParams,
} from "@workspace/api-zod";
import { fetchLeagueStandings } from "../lib/espn";
import { SUPPORTED_LEAGUES } from "@workspace/db-sqlite";
import { syncAllStandings, syncSingleLeague } from "../lib/standings-sync";
import { getDb, getLeagueBySlug, getStandingsWithTeams } from "@workspace/db-sqlite";

const router: IRouter = Router();

router.get("/leagues", async (_req, res): Promise<void> => {
  const leagues = SUPPORTED_LEAGUES;
  res.json(ListLeaguesResponse.parse(leagues));
});

router.post("/leagues/sync", async (_req, res): Promise<void> => {
  try {
    const result = await syncAllStandings();
    res.json({ message: "Sync completed", ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

router.post("/leagues/:slug/sync", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  try {
    await syncSingleLeague(raw);
    res.json({ message: `Sync completed for ${raw}` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

router.get("/leagues/:slug/standings", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const params = GetStandingsParams.safeParse({ slug: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Try SQLite DB first
  try {
    const db = getDb();
    const league = getLeagueBySlug(db, params.data.slug);
    if (league) {
      const rows = getStandingsWithTeams(db, league.id);
      db.close();
      if (rows.length > 0) {
        const mapped = rows.map((r) => ({
          rank: r.rank,
          team: {
            id: r.teamEspnId,
            name: r.teamName,
            shortName: r.teamShortName,
            logo: r.teamLogo,
            color: "",
            form: null as string | null,
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
        res.json(GetStandingsResponse.parse(mapped));
        return;
      }
    }
    db.close();
  } catch {
    // DB not available, fallback to ESPN
  }

  // Fallback to ESPN live API
  const data = await fetchLeagueStandings(params.data.slug) as {
    standings?: {
      entries?: Array<{
        team?: {
          id?: string;
          displayName?: string;
          shortDisplayName?: string;
          abbreviation?: string;
          logos?: Array<{ href?: string }>;
          color?: string;
        };
        stats?: Array<{ name: string; displayValue: string; value?: number }>;
        note?: { color?: string; description?: string };
      }>;
    };
  } | null;

  if (!data?.standings?.entries) {
    res.json(GetStandingsResponse.parse([]));
    return;
  }

  const getStat = (stats: Array<{ name: string; displayValue: string; value?: number }>, name: string): number => {
    const s = stats.find(s => s.name === name);
    return s ? ((s.value ?? parseInt(s.displayValue, 10)) || 0) : 0;
  };

  const standings = data.standings.entries.map((entry, idx) => {
    const team = entry.team || {};
    const stats = entry.stats || [];

    return {
      rank: idx + 1,
      team: {
        id: team.id || String(idx),
        name: team.displayName || "Bilinmiyor",
        shortName: team.shortDisplayName || team.abbreviation || "?",
        logo: team.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/soccer/500/${team.id}.png`,
        color: team.color || "1a1a2e",
        form: null as string | null,
      },
      played: getStat(stats, "gamesPlayed"),
      won: getStat(stats, "wins"),
      drawn: getStat(stats, "ties"),
      lost: getStat(stats, "losses"),
      goalsFor: getStat(stats, "pointsFor"),
      goalsAgainst: getStat(stats, "pointsAgainst"),
      goalDifference: getStat(stats, "pointDifferential"),
      points: getStat(stats, "points"),
      form: "",
    };
  });

  res.json(GetStandingsResponse.parse(standings));
});

export default router;
