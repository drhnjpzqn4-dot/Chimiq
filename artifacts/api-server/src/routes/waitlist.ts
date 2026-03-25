import { Router, type IRouter } from "express";
import { JoinWaitlistBody, JoinWaitlistResponse } from "@workspace/api-zod";
import { db, waitlistEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/waitlist", async (req, res) => {
  const parseResult = JoinWaitlistBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const { email } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await db
      .select()
      .from(waitlistEntriesTable)
      .where(eq(waitlistEntriesTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      const response = JoinWaitlistResponse.parse({
        success: true,
        message: "You're already on the list — we'll be in touch soon!",
        alreadyRegistered: true,
      });
      res.json(response);
      return;
    }

    await db.insert(waitlistEntriesTable).values({ email: normalizedEmail });

    const response = JoinWaitlistResponse.parse({
      success: true,
      message: "You're on the list! We'll let you know when SkinScreen launches.",
      alreadyRegistered: false,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error saving waitlist entry");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
