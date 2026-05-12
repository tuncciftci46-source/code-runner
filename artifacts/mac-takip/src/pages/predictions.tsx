import React from "react";
import { Layout } from "@/components/layout";
import { useListPredictions } from "@workspace/api-client-react";
import { PredictionCard } from "@/components/prediction-card";
import { Card } from "@/components/ui/card";
import { Target, Brain, TrendingUp } from "lucide-react";

export default function Predictions() {
  const { data: predictions, isLoading } = useListPredictions();

  return (
    <Layout>
      <div className="space-y-8">
        
        <div className="bg-card border border-border/50 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold mb-4 uppercase tracking-wider">
              <Brain className="w-4 h-4" /> AI Destekli Analiz
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">Günün Banko Tahminleri</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Yapay zeka modelimiz, takımların son form durumları, istatistikleri ve eksik oyuncularını analiz ederek en yüksek olasılıklı sonuçları belirler.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3">
            <Target className="w-8 h-8 text-primary" />
            <h3 className="font-bold text-lg">Skor Analizi</h3>
            <p className="text-sm text-muted-foreground">Beklenen gol beklentisi (xG) ve savunma zafiyetlerine göre maç skoru tahmini.</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <h3 className="font-bold text-lg">Olasılık Dağılımı</h3>
            <p className="text-sm text-muted-foreground">Yüzdesel olarak maç sonucu (MS1, MS0, MS2) olasılıklarının tam dökümü.</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3">
            <div className="w-8 h-8 rounded bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">G</div>
            <h3 className="font-bold text-lg">Güven İndeksi</h3>
            <p className="text-sm text-muted-foreground">Modelin tahmine olan güven seviyesi (Yüksek, Orta, Düşük).</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-primary rounded-sm"></div>
            <h2 className="text-2xl font-bold tracking-tight">Tüm Tahminler</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-64 bg-card border border-border/50 animate-pulse"></Card>)}
            </div>
          ) : predictions && predictions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predictions.map(pred => (
                <PredictionCard key={pred.matchId} prediction={pred} />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border/50 p-12 text-center text-muted-foreground">
              Şu an için analiz edilmiş tahmin bulunmuyor.
            </Card>
          )}
        </div>

      </div>
    </Layout>
  );
}
