import React, { useMemo } from "react";
import { Layout } from "@/components/layout";
import { MatchCard } from "@/components/match-card";
import {
  useGetMatchSummary,
  useGetLiveMatches,
  useListMatches,
  useListOdds,
  type Odds,
} from "@workspace/api-client-react";
import { Activity, CalendarDays, CheckCircle2, Target } from "lucide-react";

export default function Home() {
  const { data: summary } = useGetMatchSummary();
  const { data: liveMatches, isLoading: liveLoading } = useGetLiveMatches();
  const { data: allMatches, isLoading: matchesLoading } = useListMatches({});
  const { data: allOdds } = useListOdds();

  const oddsMap = useMemo(() => {
    const map = new Map<string, Odds>();
    allOdds?.forEach(o => map.set(o.matchId, o));
    return map;
  }, [allOdds]);

  const upcomingMatches = allMatches?.filter(m => m.status === "upcoming") ?? [];
  const finishedMatches = allMatches?.filter(m => m.status === "finished") ?? [];

  return (
    <Layout>
      <div className="space-y-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Canlı</span>
            </div>
            <span className="text-3xl font-black">{summary?.liveCount ?? 0}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Yaklaşan</span>
            </div>
            <span className="text-3xl font-black">{summary?.upcomingCount ?? 0}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Biten</span>
            </div>
            <span className="text-3xl font-black">{summary?.finishedCount ?? 0}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Gol</span>
            </div>
            <span className="text-3xl font-black">{summary?.totalGoalsToday ?? 0}</span>
          </div>
        </div>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-6 bg-primary rounded-sm"></div>
            <h2 className="text-xl font-bold tracking-tight">Canlı Maçlar</h2>
            {liveMatches && liveMatches.length > 0 && (
              <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {liveMatches.length} CANLI
              </span>
            )}
          </div>

          {liveLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-40 bg-card border border-border/50 rounded-xl animate-pulse"></div>)}
            </div>
          ) : liveMatches && liveMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMatches.map(match => (
                <MatchCard key={match.id} match={match} odds={oddsMap.get(match.id)} />
              ))}
            </div>
          ) : (
            <div className="bg-card/50 border border-border/50 rounded-xl p-8 text-center text-muted-foreground">
              Şu an canlı maç bulunmuyor.
            </div>
          )}
        </section>

        {upcomingMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-6 bg-green-500 rounded-sm"></div>
              <h2 className="text-xl font-bold tracking-tight">Yaklaşan Maçlar</h2>
              <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-full">
                İddaa oranlarıyla
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMatches.map(match => (
                <MatchCard key={match.id} match={match} odds={oddsMap.get(match.id)} />
              ))}
            </div>
          </section>
        )}

        {finishedMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-6 bg-muted-foreground rounded-sm"></div>
              <h2 className="text-xl font-bold tracking-tight">Biten Maçlar</h2>
              <span className="text-xs text-muted-foreground">{finishedMatches.length} maç</span>
            </div>
            {matchesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-card border border-border/50 rounded-xl animate-pulse"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finishedMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </section>
        )}

      </div>
    </Layout>
  );
}
