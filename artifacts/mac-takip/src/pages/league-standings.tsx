import React, { useState } from "react";
import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import { 
  useGetStandings,
  useListLeagues
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeagueStandings() {
  const params = useParams();
  const initialLeagueId = params.id ? parseInt(params.id) : 1;
  const [leagueId, setLeagueId] = useState(initialLeagueId);

  const { data: leagues } = useListLeagues();
  const { data: standings, isLoading } = useGetStandings(leagueId, {
    query: { enabled: !!leagueId }
  });

  const selectedLeague = leagues?.find(l => l.id === leagueId);

  return (
    <Layout>
      <div className="space-y-6">
        
        <div className="flex flex-wrap gap-2">
          {leagues?.map(l => (
            <button
              key={l.id}
              onClick={() => setLeagueId(l.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                l.id === leagueId 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>

        <Card className="bg-card border-border/50 overflow-hidden">
          {selectedLeague && (
            <div className="p-6 border-b border-border/50 flex items-center gap-4 bg-secondary/20">
              {selectedLeague.logo ? (
                <img src={selectedLeague.logo} alt={selectedLeague.name} className="w-12 h-12 object-contain" />
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center font-bold text-xl">{selectedLeague.name.charAt(0)}</div>
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight">{selectedLeague.name}</h1>
                <p className="text-muted-foreground text-sm font-medium">{selectedLeague.country} • {selectedLeague.season}</p>
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
                  <TableHead className="w-32 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Form</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i} className="border-border/50 hover:bg-transparent">
                      <TableCell colSpan={11} className="p-0">
                        <div className="h-14 w-full bg-secondary/10 animate-pulse border-b border-border/50"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : standings?.map((row, index) => (
                  <TableRow key={row.team.id} className="border-border/50 hover:bg-secondary/20 transition-colors">
                    <TableCell className="text-center font-bold text-muted-foreground">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full mx-auto text-xs ${
                        index < 3 ? 'bg-primary/20 text-primary' : 
                        index >= standings.length - 3 ? 'bg-destructive/20 text-destructive' : ''
                      }`}>
                        {row.rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {row.team.logo ? (
                          <img src={row.team.logo} alt={row.team.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-[10px]">{row.team.shortName || row.team.name.substring(0,2)}</div>
                        )}
                        <span className="font-semibold">{row.team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{row.played}</TableCell>
                    <TableCell className="text-center font-medium">{row.won}</TableCell>
                    <TableCell className="text-center font-medium">{row.drawn}</TableCell>
                    <TableCell className="text-center font-medium">{row.lost}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{row.goalsFor}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{row.goalsAgainst}</TableCell>
                    <TableCell className="text-center font-medium">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</TableCell>
                    <TableCell className="text-center font-black text-lg">{row.points}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {row.form.split('').map((result, i) => (
                          <span key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                            result === 'W' ? 'bg-green-500/20 text-green-500' :
                            result === 'D' ? 'bg-yellow-500/20 text-yellow-500' :
                            result === 'L' ? 'bg-red-500/20 text-red-500' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {result === 'W' ? 'G' : result === 'D' ? 'B' : result === 'L' ? 'M' : result}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>
    </Layout>
  );
}
