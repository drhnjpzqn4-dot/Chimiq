import { Router, type IRouter, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import {
  getUserProfileFields,
  isValidAvatarEmoji,
} from "../lib/userProfile.js";

const router: IRouter = Router();

/**
 * PATCH /api/profile
 * Body: { displayName?: string; avatarEmoji?: string }
 */
router.patch("/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body ?? {};
  const hasDisplayName = Object.prototype.hasOwnProperty.call(body, "displayName");
  const hasAvatarEmoji = Object.prototype.hasOwnProperty.call(body, "avatarEmoji");

  if (!hasDisplayName && !hasAvatarEmoji) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const patch: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (hasDisplayName) {
    if (body.displayName === null) {
      patch.display_name = null;
    } else if (typeof body.displayName !== "string") {
      res.status(400).json({ error: "displayName must be a string" });
      return;
    } else {
      const trimmed = body.displayName.trim();
      if (trimmed.length < 1) {
        res.status(400).json({ error: "displayName cannot be empty" });
        return;
      }
      if (trimmed.length > 50) {
        res.status(400).json({ error: "displayName max 50 characters" });
        return;
      }
      patch.display_name = trimmed;
    }
  }

  if (hasAvatarEmoji) {
    if (typeof body.avatarEmoji !== "string") {
      res.status(400).json({ error: "avatarEmoji must be a string" });
      return;
    }
    const trimmed = body.avatarEmoji.trim();
    if (!isValidAvatarEmoji(trimmed)) {
      res.status(400).json({ error: "avatarEmoji must be 1–2 emoji characters" });
      return;
    }
    patch.avatar_emoji = trimmed;
  }

  try {
    const { error } = await supabaseAdmin
      .from("users")
      .update(patch)
      .eq("id", req.user.id);
    if (error) throw error;

    const fields = await getUserProfileFields(req.user.id);
    res.json({
      ok: true,
      displayName: fields.displayName,
      avatarEmoji: fields.avatarEmoji ?? "✨",
    });
  } catch (err) {
    req.log?.error?.({ err }, "Profile patch failed");
    res.status(500).json({ error: "Could not update profile" });
  }
});

export default router;
