import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const ChatBodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  shelfContext: z.string().max(4000).optional(),
});

const client = new Anthropic();

const SYSTEM_PROMPT = `You are SkinScreen's AI skincare safety assistant — warm, clear, and grounded in science.

Your expertise:
- Ingredient safety, toxicity, and function
- Dangerous ingredient combinations: retinol + AHA/BHA (barrier destruction), benzoyl peroxide + retinol (oxidation, deactivation), Vitamin C + Niacinamide at high concentrations, multiple exfoliants layered together, AHAs without SPF
- What individual ingredients do and their risk profiles
- General skincare routine safety and application order
- EU CosIng and EWG classification references
- When to refer someone to a professional

Your firm limits — always be honest about these:
- You do NOT diagnose skin conditions or diseases
- You do NOT prescribe or recommend specific product treatments
- You do NOT recommend specific brand products by name
- For any medical concern (rash, allergy, chronic irritation), always recommend seeing a dermatologist
- You ARE able to help users understand what's in their products and whether combinations are safe

Tone: Conversational, warm, and direct. Use plain English — explain science in simple terms. Keep responses focused: 2-4 short paragraphs maximum. No bullet point overload.

If the user has shelf products listed in the context, you may reference their specific ingredients to answer their question.

End every response with one clear, practical next step the user can take.`;

router.post("/chat", async (req: Request, res: Response) => {
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { messages, shelfContext } = parsed.data;

  const systemContent = shelfContext
    ? `${SYSTEM_PROMPT}\n\n---\nUser's current shelf products:\n${shelfContext}`
    : SYSTEM_PROMPT;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 700,
      system: systemContent,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = response.content[0]?.type === "text" ? response.content[0].text : "";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "Chat failed");
    res.status(500).json({ error: "Chat failed. Please try again." });
  }
});

export default router;
