import { Router, type IRouter } from "express";
import { JoinWaitlistBody, JoinWaitlistResponse } from "@workspace/api-zod";
import { db, waitlistEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { syncToAcumbamail } from "../lib/acumbamail";
import crypto from "crypto";

const router: IRouter = Router();

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

router.post("/waitlist", async (req, res) => {
  const parseResult = JoinWaitlistBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const { email, referredBy } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await db
      .select()
      .from(waitlistEntriesTable)
      .where(eq(waitlistEntriesTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      const entry = existing[0];
      const response = JoinWaitlistResponse.parse({
        success: true,
        message: "You're already on the list — we'll be in touch soon!",
        alreadyRegistered: true,
        referralCode: entry.referralCode ?? "",
        referralCount: entry.referralCount ?? 0,
      });
      res.json(response);
      return;
    }

    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      attempts++;
      if (attempts > 10) break;
    } while (
      (
        await db
          .select({ id: waitlistEntriesTable.id })
          .from(waitlistEntriesTable)
          .where(eq(waitlistEntriesTable.referralCode, referralCode))
          .limit(1)
      ).length > 0
    );

    await db.insert(waitlistEntriesTable).values({
      email: normalizedEmail,
      referralCode,
      referredBy: referredBy ?? null,
    });

    if (referredBy) {
      await db
        .update(waitlistEntriesTable)
        .set({ referralCount: sql`${waitlistEntriesTable.referralCount} + 1` })
        .where(eq(waitlistEntriesTable.referralCode, referredBy));
    }

    syncToAcumbamail(normalizedEmail).catch((err) => {
      req.log.warn({ err }, "Acumbamail sync failed (non-blocking)");
    });

    const response = JoinWaitlistResponse.parse({
      success: true,
      message: "You're on the list! We'll let you know when SkinScreen launches.",
      alreadyRegistered: false,
      referralCode,
      referralCount: 0,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error saving waitlist entry");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
