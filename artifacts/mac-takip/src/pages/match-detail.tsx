import React, { useMemo } from "react";
import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import { 
  useGetMatch, 
  useGetMatchEvents, 
  useGetPrediction 
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { MatchEvent } from "@workspace/api-client-react/src/generated/api.schemas";

export default function MatchDetail() {
  const params = useParams();
  const matchId = params.id ? parseInt(params.id) : 0;

  const { data: match, isLoading: matchLoading } = useGetMatch(matchId, {
    query: { enabled: !!matchId, refetchInterval: 30000 }
  });
  
  const { data: events, isLoading: eventsLoading } = useGetMatchEvents(matchId, {
    query: { enabled: !!matchId, refetchInterval: 30000 }
  });
  
  const { data: prediction, isLoading: predictionLoading } = useGetPrediction(matchId, {
    query: { enabled: !!matchId }
  });

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    return [...events].sort((a, b) => b.minute - a.minute);
  }, [events]);

  if (matchLoading) {
    return (
      <Layout>
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-card rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-96 bg-card rounded-xl md:col-span-2"></div>
            <div className="h-96 bg-card rounded-xl"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!match) return <Layout>Maç bulunamadı.</Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Match Header */}
        <Card className="bg-card border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-background to-background"></div>
          <div className="relative p-6 md:p-8 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full border border-border/50 text-sm">
              <span className="font-semibold text-muted-foreground">{match.leagueName}</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-muted-foreground">{match.date}</span>
            </div>

            <div className="w-full flex items-center justify-between md:justify-center md:gap-24">
              <div className="flex flex-col items-center gap-3 w-1/3">
                {match.homeTeam.logo ? (
                  <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-2xl" />
                ) : (
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-secondary flex items-center justify-center font-bold text-2xl">{match.homeTeam.shortName || match.homeTeam.name.substring(0, 3)}</div>
                )}
                <span className="font-black text-xl md:text-2xl text-center leading-tight">{match.homeTeam.name}</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                {match.status === "upcoming" ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-4xl font-black tracking-tighter text-muted-foreground">VS</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold bg-secondary px-4 py-2 rounded-full mt-2">
                      <Clock className="w-4 h-4" />
                      <span>{match.startTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-4 text-5xl md:text-7xl font-black tracking-tighter">
                      <span className={match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore ? "text-foreground" : "text-muted-foreground"}>{match.homeScore}</span>
                      <span className="text-muted-foreground/30">-</span>
                      <span className={match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore ? "text-foreground" : "text-muted-foreground"}>{match.awayScore}</span>
                    </div>
                    {match.status === "live" && (
                      <div className="mt-4 flex items-center gap-2 text-primary font-bold px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        {match.minute}'
                      </div>
                    )}
                    {match.status === "finished" && (
                      <div className="mt-4 text-muted-foreground font-bold px-4 py-1.5 bg-secondary rounded-full">MS</div>
                    )}
                    {match.status === "halftime" && (
                      <div className="mt-4 text-primary font-bold px-4 py-1.5 bg-primary/10 rounded-full">DEVRE ARASI</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 w-1/3">
                {match.awayTeam.logo ? (
                  <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-2xl" />
                ) : (
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-secondary flex items-center justify-center font-bold text-2xl">{match.awayTeam.shortName || match.awayTeam.name.substring(0, 3)}</div>
                )}
                <span className="font-black text-xl md:text-2xl text-center leading-tight">{match.awayTeam.name}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            {match.stats && (
              <Card className="bg-card border-border/50 p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground"><Activity className="w-5 h-5"/> İstatistikler</h3>
                
                <div className="space-y-6">
                  <StatRow label="Topla Oynama (%)" home={match.stats.homePossession} away={match.stats.awayPossession} />
                  <StatRow label="Toplam Şut" home={match.stats.homeShots} away={match.stats.awayShots} />
                  <StatRow label="İsabetli Şut" home={match.stats.homeShotsOnTarget} away={match.stats.awayShotsOnTarget} />
                  <StatRow label="Korner" home={match.stats.homeCorners} away={match.stats.awayCorners} />
                  <StatRow label="Faul" home={match.stats.homeFouls} away={match.stats.awayFouls} />
                  <StatRow label="Sarı Kart" home={match.stats.homeYellowCards} away={match.stats.awayYellowCards} />
                  <StatRow label="Kırmızı Kart" home={match.stats.homeRedCards} away={match.stats.awayRedCards} />
                  <StatRow label="Ofsayt" home={match.stats.homeOffsides} away={match.stats.awayOffsides} />
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card className="bg-card border-border/50 p-6">
               <h3 className="text-lg font-bold mb-6 uppercase tracking-wider text-muted-foreground">Olaylar</h3>
               {eventsLoading ? (
                 <div className="animate-pulse space-y-4">
                   {[1,2,3].map(i => <div key={i} className="h-10 bg-secondary/50 rounded"></div>)}
                 </div>
               ) : sortedEvents.length > 0 ? (
                 <div className="relative before:absolute before:inset-0 before:ml-1/2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                   {sortedEvents.map(event => (
                     <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group mb-8">
                       {/* Icon */}
                       <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-card bg-secondary text-foreground shrink-0 md:order-1 md:group-odd:-ml-4 md:group-even:-mr-4 z-10 mx-auto absolute left-1/2 -translate-x-1/2">
                          <EventIcon type={event.type} />
                       </div>
                       
                       <div className={`w-[calc(50%-2rem)] ${event.team === 'home' ? 'text-right pr-4 mr-auto' : 'text-left pl-4 ml-auto'}`}>
                         <div className="font-bold text-lg">{event.minute}'</div>
                         <div className="font-semibold">{event.playerName}</div>
                         {event.assistName && <div className="text-sm text-muted-foreground">Asist: {event.assistName}</div>}
                         {event.description && <div className="text-xs text-muted-foreground mt-1">{event.description}</div>}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center text-muted-foreground py-8">Henüz önemli bir olay yok.</div>
               )}
            </Card>
          </div>

          <div className="space-y-6">
            {/* Prediction */}
            {predictionLoading ? (
              <Card className="bg-card border-border/50 h-64 animate-pulse"></Card>
            ) : prediction ? (
              <Card className="bg-card border-border/50 p-6 border-t-4 border-t-primary">
                <h3 className="text-lg font-bold mb-4 uppercase tracking-wider text-muted-foreground">Yapay Zeka Tahmini</h3>
                
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-border/50">
                  <div className="text-center">
                     <div className="text-sm text-muted-foreground font-semibold">Güven</div>
                     <div className={`text-lg font-bold uppercase tracking-wider ${
                        prediction.confidence === 'high' ? 'text-primary' :
                        prediction.confidence === 'medium' ? 'text-yellow-500' :
                        'text-muted-foreground'
                      }`}>
                        {prediction.confidence}
                      </div>
                  </div>
                  <div className="text-center">
                     <div className="text-sm text-muted-foreground font-semibold">Skor</div>
                     <div className="text-3xl font-black text-foreground">{prediction.predictedScore}</div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>MS 1</span>
                      <span>%{(prediction.homeWinProbability * 100).toFixed(0)}</span>
                    </div>
                    <Progress value={prediction.homeWinProbability * 100} className="h-2 bg-secondary" indicatorColor="bg-primary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-muted-foreground">
                      <span>MS 0</span>
                      <span>%{(prediction.drawProbability * 100).toFixed(0)}</span>
                    </div>
                    <Progress value={prediction.drawProbability * 100} className="h-2 bg-secondary" indicatorColor="bg-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>MS 2</span>
                      <span>%{(prediction.awayWinProbability * 100).toFixed(0)}</span>
                    </div>
                    <Progress value={prediction.awayWinProbability * 100} className="h-2 bg-secondary" indicatorColor="bg-primary" />
                  </div>
                </div>

                <div className="bg-secondary/30 p-4 rounded-lg text-sm leading-relaxed border border-border/50">
                  {prediction.analysis}
                </div>
              </Card>
            ) : (
               <Card className="bg-card border-border/50 p-6 text-center text-muted-foreground py-8">
                 Tahmin bulunamadı.
               </Card>
            )}
          </div>
        </div>
        
      </div>
    </Layout>
  );
}

function StatRow({ label, home, away }: { label: string, home: number, away: number }) {
  const total = home + away || 1; // prevent div by zero
  const homePercent = (home / total) * 100;
  const awayPercent = (away / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm font-semibold">
        <span className={home > away ? "text-foreground" : "text-muted-foreground"}>{home}</span>
        <span className="text-muted-foreground uppercase tracking-wider text-xs">{label}</span>
        <span className={away > home ? "text-foreground" : "text-muted-foreground"}>{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
        <div className="bg-primary transition-all duration-500" style={{ width: `${homePercent}%` }} />
        <div className="bg-destructive transition-all duration-500" style={{ width: `${awayPercent}%` }} />
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  switch (type) {
    case 'goal':
    case 'penalty':
      return <div className="w-3 h-3 rounded-full bg-foreground" />;
    case 'yellow_card':
      return <div className="w-3 h-4 bg-yellow-500 rounded-sm" />;
    case 'red_card':
      return <div className="w-3 h-4 bg-red-500 rounded-sm" />;
    case 'substitution':
      return <ArrowRightLeft className="w-4 h-4 text-green-500" />;
    case 'own_goal':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
  }
}
