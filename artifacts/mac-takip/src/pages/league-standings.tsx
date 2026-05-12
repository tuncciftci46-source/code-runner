import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetStandings,
  useListLeagues,
  getGetStandingsQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeagueStandings() {
  const params = useParams();
  const [leagueSlug, setLeagueSlug] = useState(params.id ?? "eng.1");

  useEffect(() => {
    if (params.id) setLeagueSlug(params.id);
  }, [params.id]);

  const { data: leagues } = useListLeagues();
  const { data: standings, isLoading } = useGetStandings(leagueSlug, {
    query: { queryKey: getGetStandingsQueryKey(leagueSlug), enabled: !!leagueSlug }
  });

  const selectedLeague = leagues?.find(l => l.slug === leagueSlug);

  return (
    <Layout>
      <div className="space-y-6">

        <div className="flex flex-wrap gap-2">
          {leagues?.map(l => (
            <button
              key={l.slug}
              onClick={() => setLeagueSlug(l.slug)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                l.slug === leagueSlug
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              <img src={l.logo} alt={l.name} className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              {l.name}
            </button>
          ))}
        </div>

        <Card className="bg-card border-border/50 overflow-hidden">
          {selectedLeague && (
            <div className="p-6 border-b border-border/50 flex items-center gap-4 bg-secondary/20">
              <img src={selectedLeague.logo} alt={selectedLeague.name} className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div>
                <h1 className="text-2xl font-black tracking-tight">{selectedLeague.name}</h1>
                <p className="text-muted-foreground text-sm font-medium">{selectedLeague.country}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Takım</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">O</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">G</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">B</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">M</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">A</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Y</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">AV</TableHead>
                  <TableHead className="w-16 text-center text-xs font-black uppercase tracking-wider text-primary">P</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell colSpan={10} className="p-0">
                        <div className="h-14 w-full bg-secondary/10 animate-pulse border-b border-border/50"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : standings && standings.length > 0 ? (
                  standings.map((row, index) => (
                    <TableRow key={row.team.id} className="border-border/50 hover:bg-secondary/20 transition-colors">
                      <TableCell className="text-center font-bold text-muted-foreground">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full mx-auto text-xs ${
                          index < 4 ? "bg-primary/20 text-primary" :
                          index >= (standings.length - 3) ? "bg-destructive/20 text-destructive" : ""
                        }`}>
                          {row.rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img src={row.team.logo} alt={row.team.name} className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <span className="font-semibold">{row.team.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{row.played}</TableCell>
                      <TableCell className="text-center font-medium text-green-400">{row.won}</TableCell>
                      <TableCell className="text-center font-medium text-yellow-400">{row.drawn}</TableCell>
                      <TableCell className="text-center font-medium text-red-400">{row.lost}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{row.goalsFor}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{row.goalsAgainst}</TableCell>
                      <TableCell className="text-center font-medium">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</TableCell>
                      <TableCell className="text-center font-black text-lg">{row.points}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      Bu lig için puan tablosu verisi bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>
    </Layout>
  );
}
