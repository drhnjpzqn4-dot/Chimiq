import type { Request, Response, NextFunction } from "express";
import { getUserPlan } from "@workspace/db";

/**
 * Small, composable middleware helpers used to guard the AI/LLM endpoints.
 *
 * Why these exist:
 * - Several routes (chat, analyze, scan-label, suggest-alternatives, etc.)
 *   each call hosted Anthropic/OpenAI models, which costs real money per
 *   request. Without a server-side auth + plan gate, an anonymous caller
 *   can hammer those endpoints directly via curl/Postman, bypassing every
 *   client-side hide-the-button check we have.
 * - Duplicating `if (!req.isAuthenticated()) ...` and the premium-plan
 *   lookup in every route was getting hard to keep consistent (some routes
 *   silently skipped the check when `userId` was undefined). Centralising
 *   it here means we have one well-tested gate that every AI route shares.
 */

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  next();
}

/**
 * Caller must be signed in AND have an active premium plan. Routes that
 * call expensive models (multi-turn chat, multi-product routine analysis,
 * branded-product alternative suggestions, etc.) should sit behind this so
 * free users can't burn through Anthropic credits past their fair share.
 *
 * Always run this AFTER `requireAuth` (or compose it as `[requireAuth,
 * requirePremium]`) so we can rely on `req.user` being populated.
 */
export async function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  try {
    const plan = await getUserPlan(req.user.id);
    if (plan !== "premium") {
      res.status(403).json({
        error: "This feature is available on the Premium plan. Upgrade to continue.",
        code: "premium_required",
      });
      return;
    }
  } catch (err) {
    req.log.error({ err }, "Premium plan check failed");
    res.status(500).json({ error: "Could not verify subscription. Please try again." });
    return;
  }
  next();
}
