import { getDb, upsertLeague, upsertTeam, clearStandings, insertStandings, SUPPORTED_LEAGUES } from "@workspace/db-sqlite";

const ESPN_STANDINGS_BASE = "https://site.api.espn.com/apis/v2/sports/soccer";

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

function log(level: string, msg: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  if (meta) {
    console[level === "error" ? "error" : "log"](`[${ts}] [${level.toUpperCase()}] ${msg}`, JSON.stringify(meta));
  } else {
    console[level === "error" ? "error" : "log"](`[${ts}] [${level.toUpperCase()}] ${msg}`);
  }
}

async function fetchStandings(slug: string) {
  const url = `${ESPN_STANDINGS_BASE}/${slug}/standings`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status} for ${url}`);
  }
  const data = await res.json() as {
    children?: Array<{
      standings?: {
        entries?: StandingEntry[];
      };
    }>;
  };
  return data.children?.[0]?.standings || null;
}

function getStat(stats: Array<{ name: string; displayValue: string; value?: number }>, name: string): number {
  const s = stats.find(s => s.name === name);
  return s ? ((s.value ?? parseInt(s.displayValue, 10)) || 0) : 0;
}

async function syncLeague(db: ReturnType<typeof getDb>, league: { slug: string; name: string; country: string; logo: string }) {
  const standings = await fetchStandings(league.slug);
  if (!standings?.entries?.length) {
    log("warn", `No standings data for ${league.slug}`);
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

  for (let idx = 0; idx < standings.entries.length; idx++) {
    const entry = standings.entries[idx];
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

  log("info", `Synced ${entries.length} entries for ${league.slug}`);
}

async function main() {
  const db = getDb();

  log("info", `Starting sync for ${SUPPORTED_LEAGUES.length} leagues`);

  let success = 0;
  let failed = 0;

  for (const league of SUPPORTED_LEAGUES) {
    try {
      await syncLeague(db, league);
      success++;
    } catch (err) {
      log("error", `Failed to sync ${league.slug}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  log("info", `Sync completed: ${success} success, ${failed} failed`);

  db.close();
}

main().catch((err) => {
  log("error", `Sync failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
