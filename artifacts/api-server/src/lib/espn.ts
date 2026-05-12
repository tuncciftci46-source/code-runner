import { logger } from "./logger";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export interface ESPNTeam {
  id: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  logo: string;
  color: string;
  form?: string;
  score?: string;
  records?: { summary: string }[];
}

export interface ESPNCompetitor {
  id: string;
  homeAway: "home" | "away";
  winner?: boolean;
  form?: string;
  score?: string;
  records?: { name: string; summary: string }[];
  team: {
    id: string;
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
    logo?: string;
    color?: string;
  };
}

export interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  season?: { slug?: string; year?: number };
  competitions: Array<{
    id: string;
    date: string;
    status: {
      clock?: number;
      displayClock?: string;
      period?: number;
      type: {
        id: string;
        name: string;
        state: string;
        completed: boolean;
        description: string;
        detail: string;
        shortDetail: string;
      };
    };
    venue?: { fullName?: string; address?: { city?: string; country?: string } };
    competitors: ESPNCompetitor[];
    details?: Array<{
      athletesInvolved?: Array<{ displayName: string }>;
      clock?: { displayValue?: string };
      team?: { id: string };
      type?: { id?: string; text?: string };
      scoringPlay?: boolean;
      penaltyKick?: boolean;
      ownGoal?: boolean;
      redCard?: boolean;
      yellowCard?: boolean;
      substitution?: boolean;
    }>;
  }>;
}

interface ESPNScoreboardResponse {
  events?: ESPNEvent[];
}

// Simple in-memory cache
const cache: Map<string, { data: unknown; expiry: number }> = new Map();

async function fetchWithCache<T>(url: string, ttlMs = 60_000): Promise<T> {
  const cached = cache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status} for ${url}`);
  }
  const data = await res.json() as T;
  cache.set(url, { data, expiry: Date.now() + ttlMs });
  return data;
}

const SUPPORTED_LEAGUES = [
  { slug: "eng.1", name: "Premier Lig", country: "İngiltere", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png" },
  { slug: "esp.1", name: "La Liga", country: "İspanya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png" },
  { slug: "ger.1", name: "Bundesliga", country: "Almanya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png" },
  { slug: "ita.1", name: "Serie A", country: "İtalya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png" },
  { slug: "fra.1", name: "Ligue 1", country: "Fransa", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png" },
  { slug: "tur.1", name: "Süper Lig", country: "Türkiye", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/30.png" },
  { slug: "uefa.champions", name: "Şampiyonlar Ligi", country: "Avrupa", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png" },
  { slug: "uefa.europa", name: "Avrupa Ligi", country: "Avrupa", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2073.png" },
  { slug: "usa.1", name: "MLS", country: "ABD", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/20098.png" },
  { slug: "ned.1", name: "Eredivisie", country: "Hollanda", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png" },
  { slug: "por.1", name: "Primeira Liga", country: "Portekiz", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/13.png" },
];

function slugFromSeasonSlug(seasonSlug?: string): string {
  if (!seasonSlug) return "other";
  if (seasonSlug.includes("premier-league") || seasonSlug.includes("english-premier")) return "eng.1";
  if (seasonSlug.includes("laliga") || seasonSlug.includes("la-liga")) return "esp.1";
  if (seasonSlug.includes("bundesliga")) return "ger.1";
  if (seasonSlug.includes("serie-a") || seasonSlug.includes("italian")) return "ita.1";
  if (seasonSlug.includes("ligue-1") || seasonSlug.includes("french")) return "fra.1";
  if (seasonSlug.includes("super-lig") || seasonSlug.includes("turkish")) return "tur.1";
  if (seasonSlug.includes("champions")) return "uefa.champions";
  if (seasonSlug.includes("europa")) return "uefa.europa";
  if (seasonSlug.includes("mls") || seasonSlug.includes("major-league")) return "usa.1";
  if (seasonSlug.includes("eredivisie") || seasonSlug.includes("dutch")) return "ned.1";
  if (seasonSlug.includes("primeira") || seasonSlug.includes("portuguese")) return "por.1";
  return "other";
}

function leagueInfoFromSlug(slug: string) {
  const known = SUPPORTED_LEAGUES.find(l => l.slug === slug);
  if (known) return known;
  return { slug, name: "Diğer", country: "Dünya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/1.png" };
}

function espnStatusToOurs(statusName: string): "live" | "upcoming" | "finished" | "halftime" {
  switch (statusName) {
    case "STATUS_FIRST_HALF":
    case "STATUS_SECOND_HALF":
    case "STATUS_EXTRA_TIME":
    case "STATUS_OVERTIME":
      return "live";
    case "STATUS_HALFTIME":
      return "halftime";
    case "STATUS_FULL_TIME":
    case "STATUS_FINAL":
    case "STATUS_FINAL_AET":
    case "STATUS_FINAL_PEN":
      return "finished";
    default:
      return "upcoming";
  }
}

export function mapESPNEventToMatch(event: ESPNEvent) {
  const comp = event.competitions[0];
  if (!comp) return null;

  const home = comp.competitors.find(c => c.homeAway === "home");
  const away = comp.competitors.find(c => c.homeAway === "away");
  if (!home || !away) return null;

  const leagueSlug = slugFromSeasonSlug(event.season?.slug);
  const leagueInfo = leagueInfoFromSlug(leagueSlug);
  const status = espnStatusToOurs(comp.status.type.name);

  const date = new Date(event.date);
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

  return {
    id: event.id,
    leagueSlug,
    leagueName: leagueInfo.name,
    leagueLogo: leagueInfo.logo,
    leagueCountry: leagueInfo.country,
    homeTeam: {
      id: home.team.id,
      name: home.team.displayName,
      shortName: home.team.shortDisplayName || home.team.abbreviation,
      logo: home.team.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${home.team.id}.png`,
      color: home.team.color || "1a1a2e",
      form: home.form || null,
    },
    awayTeam: {
      id: away.team.id,
      name: away.team.displayName,
      shortName: away.team.shortDisplayName || away.team.abbreviation,
      logo: away.team.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${away.team.id}.png`,
      color: away.team.color || "1a1a2e",
      form: away.form || null,
    },
    homeScore: home.score != null ? parseInt(home.score, 10) : null,
    awayScore: away.score != null ? parseInt(away.score, 10) : null,
    homeScoreHT: null as number | null,
    awayScoreHT: null as number | null,
    status,
    minute: status === "live" || status === "halftime" ? (comp.status.displayClock || null) : null,
    startTime: timeStr,
    date: dateStr,
    venue: comp.venue?.fullName || null,
  };
}

export async function fetchAllMatchesToday(): Promise<ReturnType<typeof mapESPNEventToMatch>[]> {
  try {
    const data = await fetchWithCache<ESPNScoreboardResponse>(
      `${ESPN_BASE}/all/scoreboard`,
      90_000
    );
    const events = data.events || [];
    return events
      .map(e => mapESPNEventToMatch(e))
      .filter((m): m is NonNullable<ReturnType<typeof mapESPNEventToMatch>> => m !== null);
  } catch (err) {
    logger.error({ err }, "Failed to fetch ESPN scoreboard");
    return [];
  }
}

export async function fetchMatchDetails(matchId: string) {
  try {
    const data = await fetchWithCache<{ boxscore?: { teams?: unknown[] }; drives?: unknown; plays?: unknown; header?: unknown }>(
      `${ESPN_BASE}/all/summary?event=${matchId}`,
      60_000
    );
    return data;
  } catch (err) {
    logger.error({ err, matchId }, "Failed to fetch ESPN match summary");
    return null;
  }
}

export async function fetchLeagueStandings(leagueSlug: string) {
  try {
    const data = await fetchWithCache<{
      children?: Array<{
        standings?: {
          entries?: unknown[];
        };
      }>;
    }>(
      `https://site.api.espn.com/apis/v2/sports/soccer/${leagueSlug}/standings`,
      300_000
    );
    // The standings are nested under children[0].standings
    const standings = data.children?.[0]?.standings;
    return standings ? { standings } : null;
  } catch (err) {
    logger.error({ err, leagueSlug }, "Failed to fetch ESPN standings");
    return null;
  }
}

export function getSupportedLeagues() {
  return SUPPORTED_LEAGUES;
}

export function getLeagueInfo(slug: string) {
  return leagueInfoFromSlug(slug);
}
