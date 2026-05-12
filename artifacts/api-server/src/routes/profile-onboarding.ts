import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SKIN_TYPES = new Set(["sensitive", "oily", "dry", "combination"]);
const AGE_GROUPS = new Set(["under18", "18-25", "26-35", "36-45", "46plus"]);
const SKIN_GOALS = new Set(["calm", "acne", "antiaging", "hydrate", "protect"]);

/**
 * POST /api/profile/onboarding
 * Persists onboarding answers and marks the wizard complete.
 */
router.post("/profile/onboarding", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { firstName, skinType, ageGroup, skinGoal } = req.body ?? {};
  const trimmed =
    typeof firstName === "string" ? firstName.trim().slice(0, 80) : "";

  if (trimmed.length < 1) {
    res.status(400).json({ error: "firstName required" });
    return;
  }
  if (typeof skinType !== "string" || !SKIN_TYPES.has(skinType)) {
    res.status(400).json({ error: "Invalid skinType" });
    return;
  }
  if (typeof ageGroup !== "string" || !AGE_GROUPS.has(ageGroup)) {
    res.status(400).json({ error: "Invalid ageGroup" });
    return;
  }
  if (typeof skinGoal !== "string" || !SKIN_GOALS.has(skinGoal)) {
    res.status(400).json({ error: "Invalid skinGoal" });
    return;
  }

  try {
    await db
      .update(usersTable)
      .set({
        firstName: trimmed,
        skinType,
        ageGroup,
        skinGoal,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.user.id));

    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Onboarding save failed");
    res.status(500).json({ error: "Could not save onboarding" });
  }
});

export default router;
