import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import analyzeRouter from "./analyze";
import analyzeSingleRouter from "./analyze-single";
import scanLabelRouter from "./scan-label";
import productLookupRouter from "./product-lookup";
import suggestAlternativesRouter from "./suggest-alternatives";
import authRouter from "./auth";
import shelfRouter from "./shelf";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(waitlistRouter);
router.use(analyzeRouter);
router.use(analyzeSingleRouter);
router.use(scanLabelRouter);
router.use(productLookupRouter);
router.use(suggestAlternativesRouter);
router.use(shelfRouter);

export default router;
