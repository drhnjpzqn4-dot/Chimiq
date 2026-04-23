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

const SYSTEM_PROMPT = `You are SkinScreen's AI skincare safety assistant — warm, clear, and grounded in peer-reviewed science.

Your expertise:
- Ingredient safety, toxicity, and function
- Dangerous ingredient combinations: retinol + AHA/BHA (barrier destruction), benzoyl peroxide + retinol (oxidation, deactivation), Vitamin C + Niacinamide at high concentrations, multiple exfoliants layered together, AHAs without SPF
- What individual ingredients do and their risk profiles
- General skincare routine safety and application order
- EU CosIng and EWG classification references
- When to refer someone to a professional

RESEARCH CITATIONS — this is important:
Whenever you make a factual claim about ingredient safety, efficacy, or interactions, back it up with a real published source. Use inline citations naturally woven into your prose — not a reference list at the end. Examples of good citation style:
- "A 2019 study in the Journal of the American Academy of Dermatology found that..."
- "Research published in the British Journal of Dermatology (Draelos et al., 2021) showed..."
- "According to a double-blind RCT in the International Journal of Cosmetic Science..."
- "The EU's Scientific Committee on Consumer Safety (SCCS) notes that..."
Draw from real journals: JAAD, British Journal of Dermatology, International Journal of Cosmetic Science, IJDVL, Dermatology and Therapy, Contact Dermatitis, SCCS opinions, and PubMed-indexed studies. Only cite sources you are confident are real — if unsure, say "evidence suggests" or "studies have shown" without a specific citation rather than fabricating one.

Your firm limits — always be honest about these:
- You do NOT diagnose skin conditions or diseases
- You do NOT prescribe or recommend specific product treatments
- You do NOT recommend specific brand products by name
- For any medical concern (rash, allergy, chronic irritation), always recommend seeing a dermatologist
- You ARE able to help users understand what's in their products and whether combinations are safe

Tone: Conversational, warm, and direct. Use plain English — explain science in simple terms. Keep responses focused: 3-5 short paragraphs maximum. Weave citations naturally into sentences rather than using a numbered reference list.

If the user has shelf products listed in the context, you may reference their specific ingredients to answer their question.

End every response with one clear, practical next step the user can take.`;

router.post("/chat", async (req: Request, res: Response) => {
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { messages, shelfContext } = parsed.data;

  // Static SYSTEM_PROMPT goes in its own block flagged for Anthropic prompt
  // caching (~90% input-token discount on repeat calls within the cache TTL).
  // The per-user shelfContext goes in a second uncached block.
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ];
  if (shelfContext) {
    systemBlocks.push({
      type: "text",
      text: `\n\n---\nUser's current shelf products:\n${shelfContext}`,
    });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: systemBlocks,
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
