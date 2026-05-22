import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "../lib/authGate.js";
import { ipRateLimit } from "../lib/rateLimit.js";
import { extractProductNameFromImage } from "../lib/extractProductNameFromImage.js";

const ScanProductNameBody = z.object({
  imageBase64: z.string().min(1, "Image data is required"),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

const router: IRouter = Router();

const scanProductNameLimiter = ipRateLimit({
  windowMs: 60_000,
  max: 20,
  key: "scan-product-name",
});

router.post("/scan-product-name", requireAuth, scanProductNameLimiter, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Product scan service is not available. Please try again later." });
    return;
  }

  const parseResult = ScanProductNameBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "A valid image (JPEG or PNG) is required." });
    return;
  }

  const { imageBase64, mimeType } = parseResult.data;
  const anthropic = new Anthropic({ apiKey });

  try {
    const result = await extractProductNameFromImage(imageBase64, mimeType, anthropic);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Anthropic product name scan error");
    res.status(500).json({ error: "Product scan failed. Please try again." });
  }
});

export default router;
