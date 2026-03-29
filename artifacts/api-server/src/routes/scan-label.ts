import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const ScanLabelBody = z.object({
  imageBase64: z.string().min(1, "Image data is required"),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

const router: IRouter = Router();

router.post("/scan-label", async (req, res) => {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Label scan service is not available. Please try again later." });
    return;
  }

  const parseResult = ScanLabelBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "A valid image (JPEG or PNG) is required." });
    return;
  }

  const { imageBase64, mimeType } = parseResult.data;

  const anthropic = new Anthropic({ apiKey, baseURL });

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Look at this product label image. Extract ONLY the ingredients list as plain text.

Rules:
- Return only the raw ingredient list, exactly as it appears on the label
- Do not include any headers like "Ingredients:" or "Active Ingredients:" — just the ingredient names
- Separate ingredients with commas
- Do not add any explanation, preamble, or commentary
- If you cannot find a clear ingredient list on the label, respond with exactly: NO_INGREDIENTS_FOUND

Extract the ingredients now:`,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    const rawText = block.type === "text" ? block.text.trim() : "";

    if (!rawText || rawText === "NO_INGREDIENTS_FOUND") {
      res.status(422).json({
        error:
          "No ingredient list was found on this label. Try a clearer photo of the ingredients panel, or type the ingredients manually.",
      });
      return;
    }

    res.json({ ingredients: rawText });
  } catch (err) {
    req.log.error({ err }, "Anthropic label scan error");
    res.status(500).json({ error: "Label scan failed. Please try again." });
  }
});

export default router;
