import React, { useMemo } from "react";
import { Layout } from "@/components/layout";
import { useListOdds, useListMatches, type Odds, type Match } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { Link } from "wouter";

function ConfidenceBadge({ confidence }: { confidence: Odds["confidence"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: "Yüksek Güven", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
    medium: { label: "Orta Güven", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    low: { label: "Düşük Güven", cls: "bg-muted/50 text-muted-foreground border-border" },
  };
  const { label, cls } = map[confidence] ?? map.low;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  );
}

function OddsCard({ odds, match }: { odds: Odds; match?: Match }) {
  const maxProb = Math.max(odds.homeWin, odds.draw, odds.awayWin);
  const cells = [
    { label: "1", prob: odds.homeWin, odd: odds.homeOdds, isTop: odds.homeWin === maxProb },
    { label: "X", prob: odds.draw, odd: odds.drawOdds, isTop: odds.draw === maxProb },
    { label: "2", prob: odds.awayWin, odd: odds.awayOdds, isTop: odds.awayWin === maxProb },
  ];

  return (
    <Link href={`/mac/${odds.matchId}`}>
      <Card className="bg-card border-border/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden group">
        {match && (
          <div className="px-4 py-2 bg-secondary/30 border-b border-border/50 flex items-center gap-2 text-xs">
            <img src={match.leagueLogo} alt={match.leagueName} className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-muted-foreground font-medium">{match.leagueName}</span>
            <span className="ml-auto text-muted-foreground">{match.startTime}</span>
          </div>
        )}

        <div className="p-4 space-y-4">
          {match && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="font-bold text-sm">{match.homeTeam.shortName}</span>
              </div>
              <span className="text-muted-foreground font-semibold text-xs">vs</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{match.awayTeam.shortName}</span>
                <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Maç Sonucu (1X2)</div>
            <div className="grid grid-cols-3 gap-2">
              {cells.map(c => (
                <div key={c.label} className={`rounded-lg p-2 text-center border ${c.isTop ? "bg-primary/15 border-primary/40" : "bg-secondary/50 border-border/50"}`}>
                  <div className="text-xs text-muted-foreground font-semibold">{c.label}</div>
                  <div className={`text-xl font-black ${c.isTop ? "text-primary" : "text-foreground"}`}>{c.odd.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Üst/Alt 2.5</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "ÜST", prob: odds.over25, odd: 1 / odds.over25 * 0.92 },
                  { label: "ALT", prob: odds.under25, odd: 1 / odds.under25 * 0.92 },
                ].map(c => (
                  <div key={c.label} className={`rounded-lg p-1.5 text-center border ${c.prob > 0.5 ? "bg-primary/15 border-primary/40" : "bg-secondary/50 border-border/50"}`}>
                    <div className="text-[10px] text-muted-foreground">{c.label}</div>
                    <div className={`text-sm font-black ${c.prob > 0.5 ? "text-primary" : ""}`}>{c.odd.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Karşılıklı Gol</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "VAR", prob: odds.btts, odd: 1 / odds.btts * 0.92 },
                  { label: "YOK", prob: odds.noBtts, odd: 1 / odds.noBtts * 0.92 },
                ].map(c => (
                  <div key={c.label} className={`rounded-lg p-1.5 text-center border ${c.prob > 0.5 ? "bg-primary/15 border-primary/40" : "bg-secondary/50 border-border/50"}`}>
                    <div className="text-[10px] text-muted-foreground">{c.label}</div>
                    <div className={`text-sm font-black ${c.prob > 0.5 ? "text-primary" : ""}`}>{c.odd.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">İlk Yarı Sonucu</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "İY1", odd: odds.htHomeOdds, prob: odds.htHome },
                { label: "İY0", odd: odds.htDrawOdds, prob: odds.htDraw },
                { label: "İY2", odd: odds.htAwayOdds, prob: odds.htAway },
              ].map(c => (
                <div key={c.label} className="rounded-lg p-1.5 text-center bg-secondary/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-semibold">{c.label}</div>
                  <div className="text-sm font-black">{c.odd.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">%{(c.prob * 100).toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>

          {odds.topScores.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Skor Tahminleri</div>
              <div className="flex flex-wrap gap-1.5">
                {odds.topScores.slice(0, 6).map((s: { score: string; probability: number }) => (
                  <div key={s.score} className="bg-secondary/60 border border-border/50 rounded-md px-2 py-1 text-center">
                    <span className="text-sm font-black">{s.score}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">%{(s.probability * 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-secondary/30 border border-border/50 rounded-lg p-3">
            <span className="text-xs text-muted-foreground leading-relaxed">{odds.analysis}</span>
            <div className="mt-2">
              <ConfidenceBadge confidence={odds.confidence} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function Predictions() {
  const { data: oddsAll, isLoading } = useListOdds();
  const { data: allMatches } = useListMatches({});

  const matchMap = useMemo(() => {
    const map = new Map<string, Match>();
    allMatches?.forEach(m => map.set(m.id, m));
    return map;
  }, [allMatches]);

  const sortedOdds = useMemo(() => {
    if (!oddsAll) return [];
    const confOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...oddsAll].sort((a, b) => (confOrder[a.confidence] ?? 2) - (confOrder[b.confidence] ?? 2));
  }, [oddsAll]);

  return (
    <Layout>
      <div className="space-y-8">

        <div className="bg-card border border-border/50 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold mb-4 uppercase tracking-wider">
              <Zap className="w-4 h-4" /> Canlı İddaa Oranları
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">Bugünün İddaa Oranları</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Poisson dağılımı ve takım formlarına dayalı algoritma: 1X2, İY, Alt/Üst 2.5, Karşılıklı Gol ve skor tahminleri.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3">
            <Target className="w-8 h-8 text-primary" />
            <h3 className="font-bold text-lg">1X2 Analizi</h3>
            <p className="text-sm text-muted-foreground">Ev sahibi galibiyeti, beraberlik ve deplasman oranları.</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <h3 className="font-bold text-lg">Alt / Üst & KG</h3>
            <p className="text-sm text-muted-foreground">Beklenen gol sayısına göre alt/üst 2.5 ve karşılıklı gol oranları.</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h3 className="font-bold text-lg">Skor Tahmini</h3>
            <p className="text-sm text-muted-foreground">En yüksek olasılıklı skorlar ve ilk yarı (İY) oranları.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-primary rounded-sm"></div>
            <h2 className="text-2xl font-bold tracking-tight">Tüm Oranlar</h2>
            {!isLoading && sortedOdds.length > 0 && (
              <span className="text-sm text-muted-foreground">{sortedOdds.length} maç</span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-96 bg-card border border-border/50 animate-pulse"></Card>)}
            </div>
          ) : sortedOdds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedOdds.map(odds => (
                <OddsCard key={odds.matchId} odds={odds} match={matchMap.get(odds.matchId)} />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border/50 p-12 text-center text-muted-foreground">
              Yaklaşan veya canlı maç olmadığında oranlar gösterilmez.
            </Card>
          )}
        </div>

      </div>
    </Layout>
  );
}
