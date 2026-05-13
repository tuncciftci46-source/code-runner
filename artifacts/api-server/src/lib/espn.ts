import { SUPPORTED_LEAGUES, getLeagueInfo } from "@workspace/db-sqlite";
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
  if (seasonSlug.includes("eredivisie") || seasonSlug.includes("dutch")) return "ned.1";
  if (seasonSlug.includes("primeira") || seasonSlug.includes("portuguese")) return "por.1";
  if (seasonSlug.includes("mls") || seasonSlug.includes("major-league")) return "usa.1";
  if (seasonSlug.includes("championship") || seasonSlug.includes("efl")) return "eng.2";
  if (seasonSlug.includes("league-one")) return "eng.3";
  if (seasonSlug.includes("league-two")) return "eng.4";
  if (seasonSlug.includes("segunda")) return "esp.2";
  if (seasonSlug.includes("2-bundesliga") || seasonSlug.includes("zweite")) return "ger.2";
  if (seasonSlug.includes("serie-b")) return "ita.2";
  if (seasonSlug.includes("ligue-2")) return "fra.2";
  if (seasonSlug.includes("eerste") || seasonSlug.includes("jupiler")) return "ned.2";
  if (seasonSlug.includes("liga-portugal-2") || seasonSlug.includes("segunda-liga")) return "por.2";
  if (seasonSlug.includes("1-lig") || seasonSlug.includes("tff")) return "tur.2";
  if (seasonSlug.includes("belgian") || seasonSlug.includes("jupiler-pro")) return "bel.1";
  if (seasonSlug.includes("scottish") || seasonSlug.includes("premiership")) return "sco.1";
  if (seasonSlug.includes("swiss") || seasonSlug.includes("super-league")) return "sui.1";
  if (seasonSlug.includes("austrian") || seasonSlug.includes("tipico")) return "aut.1";
  if (seasonSlug.includes("greek") || seasonSlug.includes("super-league-greece")) return "gre.1";
  if (seasonSlug.includes("danish") || seasonSlug.includes("3f")) return "den.1";
  if (seasonSlug.includes("allsvenskan") || seasonSlug.includes("swedish")) return "swe.1";
  if (seasonSlug.includes("eliteserien") || seasonSlug.includes("norwegian")) return "nor.1";
  if (seasonSlug.includes("croatian") || seasonSlug.includes("hnl")) return "cro.1";
  if (seasonSlug.includes("czech") || seasonSlug.includes("fortuna")) return "cze.1";
  if (seasonSlug.includes("polish") || seasonSlug.includes("ekstraklasa")) return "pol.1";
  if (seasonSlug.includes("ukrainian") || seasonSlug.includes("upl")) return "ukr.1";
  if (seasonSlug.includes("romanian") || seasonSlug.includes("liga-1")) return "rom.1";
  if (seasonSlug.includes("hungarian") || seasonSlug.includes("nemzeti")) return "hun.1";
  if (seasonSlug.includes("serbian") || seasonSlug.includes("superliga")) return "srb.1";
  if (seasonSlug.includes("bulgarian") || seasonSlug.includes("parva")) return "bul.1";
  if (seasonSlug.includes("russian") || seasonSlug.includes("rpl")) return "rus.1";
  if (seasonSlug.includes("brazilian") || seasonSlug.includes("serie-a")) return "bra.1";
  if (seasonSlug.includes("serie-b-brazil")) return "bra.2";
  if (seasonSlug.includes("argentine") || seasonSlug.includes("primera-division")) return "arg.1";
  if (seasonSlug.includes("liga-mx") || seasonSlug.includes("mexican")) return "mex.1";
  if (seasonSlug.includes("chilean") || seasonSlug.includes("primera-chile")) return "chl.1";
  if (seasonSlug.includes("colombian") || seasonSlug.includes("primera-colombia")) return "col.1";
  if (seasonSlug.includes("peruvian") || seasonSlug.includes("liga-1-peru")) return "per.1";
  if (seasonSlug.includes("uruguayan") || seasonSlug.includes("primera-uruguay")) return "uru.1";
  if (seasonSlug.includes("japanese") || seasonSlug.includes("j1")) return "jpn.1";
  if (seasonSlug.includes("k-league") || seasonSlug.includes("korean")) return "kor.1";
  if (seasonSlug.includes("saudi") || seasonSlug.includes("spl")) return "sau.1";
  if (seasonSlug.includes("uae") || seasonSlug.includes("arabian")) return "are.1";
  if (seasonSlug.includes("qatar") || seasonSlug.includes("qsl")) return "qat.1";
  if (seasonSlug.includes("chinese") || seasonSlug.includes("csl")) return "chi.1";
  if (seasonSlug.includes("a-league") || seasonSlug.includes("australian")) return "aus.1";
  if (seasonSlug.includes("egyptian") || seasonSlug.includes("epl")) return "egy.1";
  if (seasonSlug.includes("south-african") || seasonSlug.includes("psl")) return "rsa.1";
  if (seasonSlug.includes("conference")) return "uefa.conference";
  if (seasonSlug.includes("libertadores") || seasonSlug.includes("conmebol")) return "copa.libertadores";
  if (seasonSlug.includes("sudamericana")) return "copa.sudamericana";
  if (seasonSlug.includes("afc") || seasonSlug.includes("champions-league")) return "afc.champions";
  return "other";
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
  const leagueInfo = getLeagueInfo(leagueSlug);
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
          entries?: Array<Record<string, unknown>>;
        };
      }>;
    }>(
      `https://site.api.espn.com/apis/v2/sports/soccer/${leagueSlug}/standings`,
      300_000
    );
    const standings = data.children?.[0]?.standings;
    return standings ? { standings } : null;
  } catch (err) {
    logger.error({ err, leagueSlug }, "Failed to fetch ESPN standings");
    return null;
  }
}


