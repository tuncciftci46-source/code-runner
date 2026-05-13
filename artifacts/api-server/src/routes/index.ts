import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchesRouter from "./matches";
import leaguesRouter from "./leagues";
import oddsRouter from "./odds";
import xgAnalysisRouter from "./xg-analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchesRouter);
router.use(leaguesRouter);
router.use(oddsRouter);
router.use(xgAnalysisRouter);

export default router;
