import { Router, type IRouter } from "express";
import { db, predictionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListPredictionsResponse,
  GetPredictionResponse,
  GetPredictionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/predictions", async (_req, res): Promise<void> => {
  const predictions = await db.select().from(predictionsTable);
  const result = predictions.map((p) => ({
    ...p,
    homeWinProbability: p.homeWinProbability / 100,
    drawProbability: p.drawProbability / 100,
    awayWinProbability: p.awayWinProbability / 100,
    btts: p.btts === 1,
    over25: p.over25 === 1,
    confidence: p.confidence as "low" | "medium" | "high",
  }));
  res.json(ListPredictionsResponse.parse(result));
});

router.get("/predictions/:matchId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
  const params = GetPredictionParams.safeParse({ matchId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [prediction] = await db
    .select()
    .from(predictionsTable)
    .where(eq(predictionsTable.matchId, params.data.matchId));

  if (!prediction) {
    res.status(404).json({ error: "Prediction not found" });
    return;
  }

  const result = {
    ...prediction,
    homeWinProbability: prediction.homeWinProbability / 100,
    drawProbability: prediction.drawProbability / 100,
    awayWinProbability: prediction.awayWinProbability / 100,
    btts: prediction.btts === 1,
    over25: prediction.over25 === 1,
    confidence: prediction.confidence as "low" | "medium" | "high",
  };

  res.json(GetPredictionResponse.parse(result));
});

export default router;
