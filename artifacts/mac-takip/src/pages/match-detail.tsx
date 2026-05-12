import React, { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetMatch,
  useGetMatchEvents,
  useGetOdds,
  getGetMatchQueryKey,
  getGetMatchEventsQueryKey,
  getGetOddsQueryKey,
  type MatchEvent,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, ArrowRightLeft, ChevronLeft, Activity } from "lucide-react";

export default function MatchDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const matchId = params.id ?? "";

  const { data: match, isLoading: matchLoading } = useGetMatch(matchId, {
    query: { queryKey: getGetMatchQueryKey(matchId), enabled: !!matchId }
  });

  const { data: events, isLoading: eventsLoading } = useGetMatchEvents(matchId, {
    query: { queryKey: getGetMatchEventsQueryKey(matchId), enabled: !!matchId }
  });

  const { data: odds, isLoading: oddsLoading } = useGetOdds(matchId, {
    query: { queryKey: getGetOddsQueryKey(matchId), enabled: !!matchId }
  });

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    return [...events].sort((a, b) => {
      const pa = parseInt(a.minute) || 0;
      const pb = parseInt(b.minute) || 0;
      return pb - pa;
    });
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

  if (!match) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Maç bulunamadı.</div>
      </Layout>
    );
  }

  const homeWins = match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore;
  const awayWins = match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore;

  return (
    <Layout>
      <div className="space-y-6">

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Geri Dön
        </button>

        <Card className="bg-card border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-background to-background"></div>
          <div className="relative p-6 md:p-8 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full border border-border/50 text-sm">
              <img src={match.leagueLogo} alt={match.leagueName} className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-semibold text-muted-foreground">{match.leagueName}</span>
              {match.venue && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-muted-foreground text-xs">{match.venue}</span>
                </>
              )}
            </div>

            <div className="w-full flex items-center justify-between md:justify-center md:gap-24">
              <div className="flex flex-col items-center gap-3 w-1/3">
                <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className={`font-black text-lg md:text-xl text-center leading-tight ${homeWins ? "text-foreground" : "text-muted-foreground"}`}>{match.homeTeam.name}</span>
                {match.homeTeam.form && (
                  <div className="flex gap-1">
                    {match.homeTeam.form.split("").slice(-5).map((r: string, i: number) => (
                      <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${r === "W" ? "bg-green-500/20 text-green-400" : r === "D" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {r === "W" ? "G" : r === "D" ? "B" : "M"}
                      </span>
                    ))}
                  </div>
                )}
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
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center gap-4 text-5xl md:text-7xl font-black tracking-tighter">
                      <span className={homeWins ? "text-foreground" : "text-muted-foreground"}>{match.homeScore}</span>
                      <span className="text-muted-foreground/30">-</span>
                      <span className={awayWins ? "text-foreground" : "text-muted-foreground"}>{match.awayScore}</span>
                    </div>
                    {match.homeScoreHT !== null && match.awayScoreHT !== null && (
                      <div className="text-sm text-muted-foreground font-medium">(İY: {match.homeScoreHT} - {match.awayScoreHT})</div>
                    )}
                    {match.status === "live" && (
                      <div className="mt-2 flex items-center gap-2 text-primary font-bold px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        {match.minute}
                      </div>
                    )}
                    {match.status === "finished" && (
                      <div className="mt-2 text-muted-foreground font-bold px-4 py-1.5 bg-secondary rounded-full text-sm">MAÇ SONUCU</div>
                    )}
                    {match.status === "halftime" && (
                      <div className="mt-2 text-primary font-bold px-4 py-1.5 bg-primary/10 rounded-full text-sm border border-primary/20">DEVRE ARASI</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 w-1/3">
                <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className={`font-black text-lg md:text-xl text-center leading-tight ${awayWins ? "text-foreground" : "text-muted-foreground"}`}>{match.awayTeam.name}</span>
                {match.awayTeam.form && (
                  <div className="flex gap-1">
                    {match.awayTeam.form.split("").slice(-5).map((r: string, i: number) => (
                      <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${r === "W" ? "bg-green-500/20 text-green-400" : r === "D" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {r === "W" ? "G" : r === "D" ? "B" : "M"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {match.stats && (match.status === "live" || match.status === "finished" || match.status === "halftime") && (
              <Card className="bg-card border-border/50 p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                  <Activity className="w-5 h-5" /> İstatistikler
                </h3>
                <div className="space-y-5">
                  <StatRow label="Top Kontrolü (%)" home={match.stats.homePossession} away={match.stats.awayPossession} max={100} />
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

            <Card className="bg-card border-border/50 p-6">
              <h3 className="text-lg font-bold mb-6 uppercase tracking-wider text-muted-foreground">Olaylar</h3>
              {eventsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-secondary/50 rounded"></div>)}
                </div>
              ) : sortedEvents.length > 0 ? (
                <div className="space-y-3">
                  {sortedEvents.map(event => (
                    <div key={event.id} className={`flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 ${event.team === "home" ? "flex-row" : "flex-row-reverse"}`}>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary shrink-0">
                        <EventIcon type={event.type} />
                      </div>
                      <div className={`flex-1 ${event.team === "away" ? "text-right" : ""}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{event.minute}'</span>
                          <span className="font-semibold text-sm">{event.playerName}</span>
                          <span className="text-xs text-muted-foreground">{eventLabel(event.type)}</span>
                        </div>
                        {event.assistName && (
                          <div className="text-xs text-muted-foreground mt-0.5">Asist: {event.assistName}</div>
                        )}
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
            {oddsLoading ? (
              <Card className="bg-card border-border/50 h-64 animate-pulse"></Card>
            ) : odds ? (
              <Card className="bg-card border-border/50 p-5 border-t-4 border-t-primary">
                <h3 className="text-base font-bold mb-4 uppercase tracking-wider text-muted-foreground">İddaa Oranları</h3>

                <div className="mb-4">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Maç Sonucu</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "1", odd: odds.homeOdds, prob: odds.homeWin },
                      { label: "X", odd: odds.drawOdds, prob: odds.draw },
                      { label: "2", odd: odds.awayOdds, prob: odds.awayWin },
                    ].map(c => {
                      const isTop = c.prob === Math.max(odds.homeWin, odds.draw, odds.awayWin);
                      return (
                        <div key={c.label} className={`rounded-lg p-2 text-center border ${isTop ? "bg-primary/15 border-primary/40" : "bg-secondary/50 border-border/50"}`}>
                          <div className="text-xs text-muted-foreground font-semibold">{c.label}</div>
                          <div className={`text-xl font-black ${isTop ? "text-primary" : ""}`}>{c.odd.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b border-border/50">
                  {[
                    { label: "MS 1 (Ev Sahibi)", value: odds.homeWin },
                    { label: "MS X (Beraberlik)", value: odds.draw },
                    { label: "MS 2 (Deplasman)", value: odds.awayWin },
                  ].map(b => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span>%{(b.value * 100).toFixed(0)}</span>
                      </div>
                      <Progress value={b.value * 100} className="h-1.5 bg-secondary" />
                    </div>
                  ))}
                </div>

                <div className="mb-4 pb-4 border-b border-border/50">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Alt / Üst 2.5</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Üst 2.5", prob: odds.over25, odd: (1 / odds.over25 * 0.92) },
                      { label: "Alt 2.5", prob: odds.under25, odd: (1 / odds.under25 * 0.92) },
                    ].map(c => (
                      <div key={c.label} className={`rounded-lg p-2 text-center border ${c.prob > 0.5 ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border/50"}`}>
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        <div className={`text-lg font-black ${c.prob > 0.5 ? "text-primary" : ""}`}>{c.odd.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4 pb-4 border-b border-border/50">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Karşılıklı Gol</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "KG Var", prob: odds.btts, odd: (1 / odds.btts * 0.92) },
                      { label: "KG Yok", prob: odds.noBtts, odd: (1 / odds.noBtts * 0.92) },
                    ].map(c => (
                      <div key={c.label} className={`rounded-lg p-2 text-center border ${c.prob > 0.5 ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border/50"}`}>
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        <div className={`text-lg font-black ${c.prob > 0.5 ? "text-primary" : ""}`}>{c.odd.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4 pb-4 border-b border-border/50">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">İlk Yarı Sonucu</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "İY1", odd: odds.htHomeOdds, prob: odds.htHome },
                      { label: "İY0", odd: odds.htDrawOdds, prob: odds.htDraw },
                      { label: "İY2", odd: odds.htAwayOdds, prob: odds.htAway },
                    ].map(c => (
                      <div key={c.label} className="rounded-lg p-1.5 text-center bg-secondary/40 border border-border/50">
                        <div className="text-[10px] text-muted-foreground font-semibold">{c.label}</div>
                        <div className="text-base font-black">{c.odd.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {odds.topScores.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-border/50">
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Skor Tahmini</div>
                    <div className="flex flex-wrap gap-1.5">
                      {odds.topScores.slice(0, 6).map(s => (
                        <div key={s.score} className="bg-secondary/60 border border-border/50 rounded-md px-2 py-1">
                          <span className="text-sm font-black">{s.score}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">%{(s.probability * 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Analiz</div>
                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                    {odds.analysis}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Beklenen gol:</span>
                    <span className="text-xs font-bold">{odds.expectedGoalsHome} - {odds.expectedGoalsAway}</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-card border-border/50 p-6 text-center text-muted-foreground py-8 text-sm">
                Bu maç için oran hesaplanamadı.
              </Card>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}

function StatRow({ label, home, away, max }: { label: string; home: number; away: number; max?: number }) {
  const total = max ?? (home + away || 1);
  const homePercent = Math.min(100, (home / total) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm font-semibold">
        <span className={home >= away ? "text-foreground" : "text-muted-foreground"}>{home}</span>
        <span className="text-muted-foreground uppercase tracking-wider text-xs">{label}</span>
        <span className={away > home ? "text-foreground" : "text-muted-foreground"}>{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
        <div className="bg-primary transition-all duration-500" style={{ width: `${homePercent}%` }} />
        <div className="bg-destructive transition-all duration-500" style={{ width: `${100 - homePercent}%` }} />
      </div>
    </div>
  );
}

function eventLabel(type: MatchEvent["type"]): string {
  switch (type) {
    case "goal": return "Gol";
    case "penalty": return "Penaltı";
    case "own_goal": return "Kendi Kalesine";
    case "yellow_card": return "Sarı Kart";
    case "red_card": return "Kırmızı Kart";
    case "substitution": return "Oyuncu Değişikliği";
    case "var": return "VAR";
    default: return "";
  }
}

function EventIcon({ type }: { type: MatchEvent["type"] }) {
  switch (type) {
    case "goal":
    case "penalty":
      return <div className="w-3 h-3 rounded-full bg-foreground" />;
    case "own_goal":
      return <div className="w-3 h-3 rounded-full bg-red-500" />;
    case "yellow_card":
      return <div className="w-3 h-4 bg-yellow-500 rounded-sm" />;
    case "red_card":
      return <div className="w-3 h-4 bg-red-500 rounded-sm" />;
    case "substitution":
      return <ArrowRightLeft className="w-4 h-4 text-green-500" />;
    case "var":
      return <AlertTriangle className="w-4 h-4 text-blue-400" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
  }
}
