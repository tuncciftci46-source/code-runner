import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  homeTeamId: integer("home_team_id").notNull().references(() => teamsTable.id),
  awayTeamId: integer("away_team_id").notNull().references(() => teamsTable.id),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  status: text("status").notNull().default("upcoming"),
  minute: integer("minute"),
  startTime: text("start_time").notNull(),
  date: text("date").notNull(),
});

export const matchStatsTable = pgTable("match_stats", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id),
  homePossession: integer("home_possession").notNull().default(50),
  awayPossession: integer("away_possession").notNull().default(50),
  homeShots: integer("home_shots").notNull().default(0),
  awayShots: integer("away_shots").notNull().default(0),
  homeShotsOnTarget: integer("home_shots_on_target").notNull().default(0),
  awayShotsOnTarget: integer("away_shots_on_target").notNull().default(0),
  homeCorners: integer("home_corners").notNull().default(0),
  awayCorners: integer("away_corners").notNull().default(0),
  homeFouls: integer("home_fouls").notNull().default(0),
  awayFouls: integer("away_fouls").notNull().default(0),
  homeYellowCards: integer("home_yellow_cards").notNull().default(0),
  awayYellowCards: integer("away_yellow_cards").notNull().default(0),
  homeRedCards: integer("home_red_cards").notNull().default(0),
  awayRedCards: integer("away_red_cards").notNull().default(0),
  homeOffsides: integer("home_offsides").notNull().default(0),
  awayOffsides: integer("away_offsides").notNull().default(0),
});

export const matchEventsTable = pgTable("match_events", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id),
  minute: integer("minute").notNull(),
  type: text("type").notNull(),
  team: text("team").notNull(),
  playerName: text("player_name").notNull(),
  assistName: text("assist_name"),
  description: text("description"),
});

export const predictionsTable = pgTable("predictions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id),
  homeWinProbability: integer("home_win_probability").notNull(),
  drawProbability: integer("draw_probability").notNull(),
  awayWinProbability: integer("away_win_probability").notNull(),
  predictedScore: text("predicted_score").notNull(),
  confidence: text("confidence").notNull(),
  analysis: text("analysis").notNull(),
  btts: integer("btts").notNull().default(0),
  over25: integer("over25").notNull().default(0),
});

export const standingsTable = pgTable("standings", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  rank: integer("rank").notNull(),
  played: integer("played").notNull().default(0),
  won: integer("won").notNull().default(0),
  drawn: integer("drawn").notNull().default(0),
  lost: integer("lost").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  goalDifference: integer("goal_difference").notNull().default(0),
  points: integer("points").notNull().default(0),
  form: text("form").notNull().default(""),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
