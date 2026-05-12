import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchesRouter from "./matches";
import leaguesRouter from "./leagues";
import predictionsRouter from "./predictions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchesRouter);
router.use(leaguesRouter);
router.use(predictionsRouter);

export default router;
