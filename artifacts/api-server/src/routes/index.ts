import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import analyzeRouter from "./analyze";
import scanLabelRouter from "./scan-label";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use(analyzeRouter);
router.use(scanLabelRouter);

export default router;
