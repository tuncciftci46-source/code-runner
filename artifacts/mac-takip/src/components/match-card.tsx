import React from "react";
import { Link } from "wouter";
import { type Match, type Odds } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

function OddsBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-center ${highlight ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground"}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-black ${highlight ? "text-primary" : "text-foreground"}`}>{value.toFixed(2)}</span>
    </div>
  );
}

export function MatchCard({ match, odds }: { match: Match; odds?: Odds }) {
  const isLive = match.status === "live" || match.status === "halftime";

  const bestOdds = odds ? [
    { label: "1", value: odds.homeOdds, prob: odds.homeWin },
    { label: "X", value: odds.drawOdds, prob: odds.draw },
    { label: "2", value: odds.awayOdds, prob: odds.awayWin },
  ] : [];
  const highestProb = bestOdds.length ? Math.max(...bestOdds.map(o => o.prob)) : 0;

  return (
    <Link href={`/mac/${match.id}`}>
      <Card className="hover-elevate cursor-pointer border-border/50 bg-card overflow-hidden transition-all hover:border-primary/50 group">
        <div className="px-4 py-2 bg-secondary/30 flex items-center justify-between text-xs border-b border-border/50">
          <div className="flex items-center gap-2">
            <img
              src={match.leagueLogo}
              alt={match.leagueName}
              className="w-4 h-4 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="font-medium text-muted-foreground">{match.leagueName}</span>
          </div>

          {isLive ? (
            <div className="flex items-center gap-1.5 text-primary font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {match.status === "halftime" ? "İY" : match.minute ?? "CANLI"}
            </div>
          ) : match.status === "finished" ? (
            <span className="text-muted-foreground font-medium">MS</span>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{match.startTime}</span>
            </div>
          )}
        </div>

        <div className="p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <img
              src={match.homeTeam.logo}
              alt={match.homeTeam.name}
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/40x40/1a1a2e/ffffff?text=${match.homeTeam.shortName.substring(0, 3)}`; }}
            />
            <span className="font-semibold text-sm line-clamp-1 w-full">{match.homeTeam.name}</span>
            {match.homeTeam.form && (
              <div className="flex gap-0.5">
                {match.homeTeam.form.split("").slice(-5).map((r: string, i: number) => (
                  <span key={i} className={`w-3 h-3 rounded-sm text-[8px] font-bold flex items-center justify-center ${r === "W" ? "bg-green-500/30 text-green-400" : r === "D" ? "bg-yellow-500/30 text-yellow-400" : "bg-red-500/30 text-red-400"}`}>
                    {r === "W" ? "G" : r === "D" ? "B" : "M"}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
            {match.status !== "upcoming" ? (
              <div className="flex items-center gap-2 text-2xl font-black tracking-tighter">
                <span className={match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore ? "text-foreground" : "text-muted-foreground"}>
                  {match.homeScore}
                </span>
                <span className="text-muted-foreground/30">-</span>
                <span className={match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore ? "text-foreground" : "text-muted-foreground"}>
                  {match.awayScore}
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground font-bold text-sm bg-secondary px-3 py-1 rounded-full">VS</div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <img
              src={match.awayTeam.logo}
              alt={match.awayTeam.name}
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/40x40/1a1a2e/ffffff?text=${match.awayTeam.shortName.substring(0, 3)}`; }}
            />
            <span className="font-semibold text-sm line-clamp-1 w-full">{match.awayTeam.name}</span>
            {match.awayTeam.form && (
              <div className="flex gap-0.5">
                {match.awayTeam.form.split("").slice(-5).map((r: string, i: number) => (
                  <span key={i} className={`w-3 h-3 rounded-sm text-[8px] font-bold flex items-center justify-center ${r === "W" ? "bg-green-500/30 text-green-400" : r === "D" ? "bg-yellow-500/30 text-yellow-400" : "bg-red-500/30 text-red-400"}`}>
                    {r === "W" ? "G" : r === "D" ? "B" : "M"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {odds && match.status !== "finished" && (
          <div className="px-4 pb-3 flex gap-2 justify-center">
            {bestOdds.map(o => (
              <OddsBadge key={o.label} label={o.label} value={o.value} highlight={o.prob === highestProb} />
            ))}
            <OddsBadge label="2.5Ü" value={1 / odds.over25 * 0.92} />
            <OddsBadge label="KG" value={1 / odds.btts * 0.92} />
          </div>
        )}
      </Card>
    </Link>
  );
}
