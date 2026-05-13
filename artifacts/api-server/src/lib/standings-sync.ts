import { getDb, upsertLeague, upsertTeam, clearStandings, insertStandings, SUPPORTED_LEAGUES, type LeagueInfo } from "@workspace/db-sqlite";
import { fetchLeagueStandings } from "./espn";
import { logger } from "./logger";

interface StandingEntry {
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
}

function getStat(stats: Array<{ name: string; displayValue: string; value?: number }>, name: string): number {
  const s = stats.find(s => s.name === name);
  return s ? ((s.value ?? parseInt(s.displayValue, 10)) || 0) : 0;
}

async function syncLeague(db: ReturnType<typeof getDb>, league: { slug: string; name: string; country: string; logo: string }) {
  const data = await fetchLeagueStandings(league.slug) as {
    standings?: { entries?: StandingEntry[] };
  } | null;

  if (!data?.standings?.entries?.length) {
    logger.warn({ slug: league.slug }, "No standings data found");
    return;
  }

  const now = new Date();
  const seasonYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const season = `${seasonYear}-${seasonYear + 1}`;

  const leagueId = upsertLeague(db, {
    name: league.name,
    country: league.country,
    logo: league.logo,
    season,
    slug: league.slug,
  });

  clearStandings(db, leagueId);

  const entries: Array<{
    leagueId: number;
    teamId: number;
    rank: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    form: string;
  }> = [];

  for (let idx = 0; idx < data.standings.entries.length; idx++) {
    const entry = data.standings.entries[idx];
    if (!entry?.team) continue;

    const team = entry.team;
    const stats = entry.stats || [];
    const espnId = team.id || String(idx);

    const teamId = upsertTeam(db, {
      name: team.displayName || "Bilinmiyor",
      shortName: team.shortDisplayName || team.abbreviation || "?",
      logo: team.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png`,
      country: league.country,
      espnId,
    });

    entries.push({
      leagueId,
      teamId,
      rank: idx + 1,
      played: getStat(stats, "gamesPlayed"),
      won: getStat(stats, "wins"),
      drawn: getStat(stats, "ties"),
      lost: getStat(stats, "losses"),
      goalsFor: getStat(stats, "pointsFor"),
      goalsAgainst: getStat(stats, "pointsAgainst"),
      goalDifference: getStat(stats, "pointDifferential"),
      points: getStat(stats, "points"),
      form: "",
    });
  }

  if (entries.length > 0) {
    insertStandings(db, entries);
  }

  logger.info({ slug: league.slug, entries: entries.length }, "Standings synced");
}

export async function syncAllStandings() {
  const leagues = SUPPORTED_LEAGUES;
  const db = getDb();

  logger.info({ total: leagues.length }, "Starting full standings sync");

  let success = 0;
  let failed = 0;

  for (const league of leagues) {
    try {
      await syncLeague(db, league);
      success++;
    } catch (err) {
      logger.error({ err, slug: league.slug }, "Failed to sync league");
      failed++;
    }
  }

  db.close();
  logger.info({ success, failed }, "Standings sync completed");
  return { success, failed };
}

export async function syncSingleLeague(slug: string) {
  const leagues = SUPPORTED_LEAGUES;
  const league = leagues.find((l: LeagueInfo) => l.slug === slug);
  if (!league) {
    throw new Error(`Unknown league slug: ${slug}`);
  }

  const db = getDb();
  await syncLeague(db, league);
  db.close();
  logger.info({ slug }, "Single league sync completed");
}
