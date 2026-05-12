import React from "react";
import { Layout } from "@/components/layout";
import { MatchCard } from "@/components/match-card";
import { PredictionCard } from "@/components/prediction-card";
import { 
  useGetMatchSummary, 
  useGetLiveMatches, 
  useListMatches,
  useListPredictions
} from "@workspace/api-client-react";
import { Activity, CalendarDays, CheckCircle2, Goal } from "lucide-react";

export default function Home() {
  const { data: summary } = useGetMatchSummary({ query: { refetchInterval: 30000 } });
  const { data: liveMatches, isLoading: liveLoading } = useGetLiveMatches({ query: { refetchInterval: 30000 } });
  const { data: allMatches, isLoading: matchesLoading } = useListMatches({}, { query: { refetchInterval: 30000 } });
  const { data: predictions } = useListPredictions();

  const upcomingMatches = allMatches?.filter(m => m.status === 'upcoming').slice(0, 4) || [];
  const topPredictions = predictions?.slice(0, 3) || [];

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Canlı</span>
            </div>
            <span className="text-3xl font-black">{summary?.liveCount || 0}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Yaklaşan</span>
            </div>
            <span className="text-3xl font-black">{summary?.upcomingCount || 0}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Biten</span>
            </div>
            <span className="text-3xl font-black">{summary?.finishedCount || 0}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Goal className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Toplam Gol</span>
            </div>
            <span className="text-3xl font-black">{summary?.totalGoalsToday || 0}</span>
          </div>
        </div>

        {/* Live Matches */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-6 bg-primary rounded-sm"></div>
            <h2 className="text-xl font-bold tracking-tight">Canlı Maçlar</h2>
            {liveMatches && liveMatches.length > 0 && (
              <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {liveMatches.length}
              </span>
            )}
          </div>
          
          {liveLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-card border border-border/50 rounded-xl animate-pulse"></div>)}
            </div>
          ) : liveMatches && liveMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="bg-card/50 border border-border/50 rounded-xl p-8 text-center text-muted-foreground">
              Şu an canlı maç bulunmuyor.
            </div>
          )}
        </section>

        {/* AI Predictions Quick Look */}
        {topPredictions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-purple-500 rounded-sm"></div>
                <h2 className="text-xl font-bold tracking-tight">Günün Tahminleri</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPredictions.map(pred => (
                <PredictionCard key={pred.matchId} prediction={pred} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Matches */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-6 bg-secondary rounded-sm"></div>
            <h2 className="text-xl font-bold tracking-tight">Yaklaşan Maçlar</h2>
          </div>
          
          {matchesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map(i => <div key={i} className="h-32 bg-card border border-border/50 rounded-xl animate-pulse"></div>)}
            </div>
          ) : upcomingMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="bg-card/50 border border-border/50 rounded-xl p-8 text-center text-muted-foreground">
              Yaklaşan maç bulunmuyor.
            </div>
          )}
        </section>
        
      </div>
    </Layout>
  );
}
