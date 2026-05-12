import React from "react";
import { Link } from "wouter";
import { Match } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "live" || match.status === "halftime";
  
  return (
    <Link href={`/mac/${match.id}`}>
      <Card className="hover-elevate cursor-pointer border-border/50 bg-card overflow-hidden transition-all hover:border-primary/50 group">
        <div className="px-4 py-2 bg-secondary/30 flex items-center justify-between text-xs border-b border-border/50">
          <div className="flex items-center gap-2">
            {match.leagueLogo ? (
              <img src={match.leagueLogo} alt={match.leagueName} className="w-4 h-4 object-contain" />
            ) : (
              <div className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[8px]">{match.leagueName.charAt(0)}</div>
            )}
            <span className="font-medium text-muted-foreground">{match.leagueName}</span>
          </div>
          
          {isLive ? (
            <div className="flex items-center gap-1.5 text-primary font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {match.status === "halftime" ? "İY" : `${match.minute}'`}
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
          {/* Home Team */}
          <div className="flex flex-col items-center gap-2 text-center">
            {match.homeTeam.logo ? (
              <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold">{match.homeTeam.shortName || match.homeTeam.name.substring(0, 3)}</div>
            )}
            <span className="font-semibold text-sm line-clamp-1 w-full">{match.homeTeam.name}</span>
          </div>
          
          {/* Score / VS */}
          <div className="flex flex-col items-center justify-center">
            {(match.status !== "upcoming") ? (
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
          
          {/* Away Team */}
          <div className="flex flex-col items-center gap-2 text-center">
            {match.awayTeam.logo ? (
              <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold">{match.awayTeam.shortName || match.awayTeam.name.substring(0, 3)}</div>
            )}
            <span className="font-semibold text-sm line-clamp-1 w-full">{match.awayTeam.name}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
