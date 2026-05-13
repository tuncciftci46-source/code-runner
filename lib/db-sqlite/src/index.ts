import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.resolve(import.meta.dirname, "../../../data");
const DB_PATH = path.join(DATA_DIR, "standings.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      logo TEXT NOT NULL DEFAULT '',
      season TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL DEFAULT '',
      logo TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      espn_id TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS standings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league_id INTEGER NOT NULL REFERENCES leagues(id),
      team_id INTEGER NOT NULL REFERENCES teams(id),
      rank INTEGER NOT NULL,
      played INTEGER NOT NULL DEFAULT 0,
      won INTEGER NOT NULL DEFAULT 0,
      drawn INTEGER NOT NULL DEFAULT 0,
      lost INTEGER NOT NULL DEFAULT 0,
      goals_for INTEGER NOT NULL DEFAULT 0,
      goals_against INTEGER NOT NULL DEFAULT 0,
      goal_difference INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      form TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_standings_league ON standings(league_id);
    CREATE INDEX IF NOT EXISTS idx_standings_rank ON standings(league_id, rank);
  `);
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    createTables(_db);
  }
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export interface LeagueRow {
  id: number;
  name: string;
  country: string;
  logo: string;
  season: string;
  slug: string;
}

export interface TeamRow {
  id: number;
  name: string;
  shortName: string;
  logo: string;
  country: string;
  espnId: string;
}

export interface StandingRow {
  id: number;
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
}

export function upsertLeague(db: Database.Database, league: {
  name: string;
  country: string;
  logo: string;
  season: string;
  slug: string;
}): number {
  const stmt = db.prepare(`
    INSERT INTO leagues (name, country, logo, season, slug)
    VALUES (@name, @country, @logo, @season, @slug)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      country = excluded.country,
      logo = excluded.logo,
      season = excluded.season
    RETURNING id
  `);
  const row = stmt.get(league) as { id: number };
  return row.id;
}

export function upsertTeam(db: Database.Database, team: {
  name: string;
  shortName: string;
  logo: string;
  country: string;
  espnId: string;
}): number {
  const stmt = db.prepare(`
    INSERT INTO teams (name, short_name, logo, country, espn_id)
    VALUES (@name, @shortName, @logo, @country, @espnId)
    ON CONFLICT(espn_id) DO UPDATE SET
      name = excluded.name,
      short_name = excluded.short_name,
      logo = excluded.logo,
      country = excluded.country
    RETURNING id
  `);
  const row = stmt.get(team) as { id: number };
  return row.id;
}

export function clearStandings(db: Database.Database, leagueId: number) {
  db.prepare("DELETE FROM standings WHERE league_id = ?").run(leagueId);
}

export function insertStandings(db: Database.Database, entries: Array<{
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
}>) {
  const stmt = db.prepare(`
    INSERT INTO standings (league_id, team_id, rank, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, form)
    VALUES (@leagueId, @teamId, @rank, @played, @won, @drawn, @lost, @goalsFor, @goalsAgainst, @goalDifference, @points, @form)
  `);

  const insertMany = db.transaction((rows: typeof entries) => {
    for (const row of rows) {
      stmt.run(row);
    }
  });

  insertMany(entries);
}

export function getLeagueBySlug(db: Database.Database, slug: string): LeagueRow | undefined {
  return db.prepare("SELECT * FROM leagues WHERE slug = ?").get(slug) as LeagueRow | undefined;
}

export interface StandingTeamRow {
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
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamLogo: string;
  teamEspnId: string;
}

const GENERIC_LOGO = "https://a.espncdn.com/i/leaguelogos/soccer/500/1.png";

export interface LeagueInfo {
  slug: string;
  name: string;
  country: string;
  logo: string;
}

export const SUPPORTED_LEAGUES: LeagueInfo[] = [
  { slug: "eng.1", name: "Premier Lig", country: "İngiltere", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png" },
  { slug: "eng.2", name: "EFL Championship", country: "İngiltere", logo: GENERIC_LOGO },
  { slug: "eng.3", name: "EFL League One", country: "İngiltere", logo: GENERIC_LOGO },
  { slug: "eng.4", name: "EFL League Two", country: "İngiltere", logo: GENERIC_LOGO },
  { slug: "esp.1", name: "La Liga", country: "İspanya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png" },
  { slug: "esp.2", name: "La Liga 2", country: "İspanya", logo: GENERIC_LOGO },
  { slug: "ger.1", name: "Bundesliga", country: "Almanya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png" },
  { slug: "ger.2", name: "2. Bundesliga", country: "Almanya", logo: GENERIC_LOGO },
  { slug: "ita.1", name: "Serie A", country: "İtalya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png" },
  { slug: "ita.2", name: "Serie B", country: "İtalya", logo: GENERIC_LOGO },
  { slug: "fra.1", name: "Ligue 1", country: "Fransa", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png" },
  { slug: "fra.2", name: "Ligue 2", country: "Fransa", logo: GENERIC_LOGO },
  { slug: "ned.1", name: "Eredivisie", country: "Hollanda", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png" },
  { slug: "ned.2", name: "Eerste Divisie", country: "Hollanda", logo: GENERIC_LOGO },
  { slug: "por.1", name: "Primeira Liga", country: "Portekiz", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/13.png" },
  { slug: "tur.1", name: "Süper Lig", country: "Türkiye", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/30.png" },
  { slug: "bel.1", name: "Pro League", country: "Belçika", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png" },
  { slug: "sco.1", name: "Premiership", country: "İskoçya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/24.png" },
  { slug: "aut.1", name: "Bundesliga", country: "Avusturya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/31.png" },
  { slug: "gre.1", name: "Super League", country: "Yunanistan", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/104.png" },
  { slug: "den.1", name: "Superliga", country: "Danimarka", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/27.png" },
  { slug: "swe.1", name: "Allsvenskan", country: "İsveç", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/433.png" },
  { slug: "nor.1", name: "Eliteserien", country: "Norveç", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/429.png" },
  { slug: "rus.1", name: "Premier League", country: "Rusya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/33.png" },
  { slug: "bra.1", name: "Série A", country: "Brezilya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/202.png" },
  { slug: "bra.2", name: "Série B", country: "Brezilya", logo: GENERIC_LOGO },
  { slug: "arg.1", name: "Primera División", country: "Arjantin", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/290.png" },
  { slug: "mex.1", name: "Liga MX", country: "Meksika", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/200.png" },
  { slug: "col.1", name: "Primera A", country: "Kolombiya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/204.png" },
  { slug: "per.1", name: "Liga 1", country: "Peru", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/205.png" },
  { slug: "uru.1", name: "Primera División", country: "Uruguay", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/207.png" },
  { slug: "usa.1", name: "MLS", country: "ABD", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/20098.png" },
  { slug: "jpn.1", name: "J1 League", country: "Japonya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/206.png" },
  { slug: "chi.1", name: "Super League", country: "Çin", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/325.png" },
  { slug: "aus.1", name: "A-League", country: "Avustralya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/209.png" },
  { slug: "rsa.1", name: "Premier Division", country: "Güney Afrika", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/235.png" },
  { slug: "uefa.champions", name: "Şampiyonlar Ligi", country: "Avrupa", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png" },
  { slug: "uefa.europa", name: "Avrupa Ligi", country: "Avrupa", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2073.png" },
  { slug: "afc.champions", name: "AFC Şampiyonlar Ligi", country: "Asya", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/228.png" },
];

export function getLeagueInfo(slug: string): LeagueInfo {
  const found = SUPPORTED_LEAGUES.find(l => l.slug === slug);
  if (found) return found;
  return { slug, name: "Diğer", country: "Dünya", logo: GENERIC_LOGO };
}

export function getStandingsWithTeams(db: Database.Database, leagueId: number): StandingTeamRow[] {
  return db.prepare(`
    SELECT
      s.rank,
      s.played,
      s.won,
      s.drawn,
      s.lost,
      s.goals_for AS goalsFor,
      s.goals_against AS goalsAgainst,
      s.goal_difference AS goalDifference,
      s.points,
      s.form,
      t.id AS teamId,
      t.name AS teamName,
      t.short_name AS teamShortName,
      t.logo AS teamLogo,
      t.espn_id AS teamEspnId
    FROM standings s
    JOIN teams t ON t.id = s.team_id
    WHERE s.league_id = ?
    ORDER BY s.rank ASC
  `).all(leagueId) as StandingTeamRow[];
}
