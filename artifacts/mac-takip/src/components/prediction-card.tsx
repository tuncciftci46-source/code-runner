import React from "react";
import { Link } from "wouter";
import { Prediction } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card } from "@/components/ui/card";
import { useGetMatch } from "@workspace/api-client-react";

export function PredictionCard({ prediction }: { prediction: Prediction }) {
  const { data: match, isLoading } = useGetMatch(prediction.matchId, {
    query: { enabled: !!prediction.matchId }
  });

  if (isLoading || !match) {
    return <Card className="h-32 bg-card border-border/50 animate-pulse" />;
  }

  const highestProb = Math.max(prediction.homeWinProbability, prediction.drawProbability, prediction.awayWinProbability);
  let predictedOutcome = "Beraberlik";
  if (highestProb === prediction.homeWinProbability) predictedOutcome = "1";
  if (highestProb === prediction.awayWinProbability) predictedOutcome = "2";

  return (
    <Link href={`/mac/${match.id}`}>
      <Card className="hover-elevate cursor-pointer border-border/50 bg-card overflow-hidden">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">{match.homeTeam.name}</span>
              <span>-</span>
              <span className="font-semibold text-foreground">{match.awayTeam.name}</span>
            </div>
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              prediction.confidence === 'high' ? 'bg-primary/20 text-primary' :
              prediction.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
              'bg-muted text-muted-foreground'
            }`}>
              {prediction.confidence} Güven
            </div>
          </div>
          
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
             <div className="text-2xl font-black text-primary">{predictedOutcome}</div>
             <div className="text-center">
               <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Skor</div>
               <div className="font-bold text-lg">{prediction.predictedScore}</div>
             </div>
             <div className="flex flex-col gap-1">
               <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                 <span>MS 1</span>
                 <span>%{(prediction.homeWinProbability * 100).toFixed(0)}</span>
               </div>
               <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                 <div className="h-full bg-primary" style={{ width: `${prediction.homeWinProbability * 100}%` }}></div>
               </div>
             </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
