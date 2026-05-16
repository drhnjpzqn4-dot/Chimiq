import { Router, type IRouter } from "express";
import { isRequestAdmin } from "../lib/admin.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const router: IRouter = Router();

function isAdmin(req: { user?: { email?: string | null } }): boolean {
  return isRequestAdmin(req as { user?: { email?: string | null } });
}

router.get(/^\/storage\/objects\/(.+)$/, async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.STORAGE_BUCKET_NAME || "chimiq-uploads";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(503).json({ error: "Object storage not configured." });
    return;
  }

  const relativePath = (req.params as Record<string, string>)["0"];
  if (!relativePath) {
    res.status(400).json({ error: "Missing object path." });
    return;
  }

  const typedReq = req as { user?: { id?: string; email?: string | null } };
  const userId = typedReq.user?.id ?? null;

  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const contributionMatch = relativePath.match(/^contributions\/([0-9a-f-]{36})\//i);
    if (contributionMatch) {
      const submissionId = contributionMatch[1];
      const { data: submission, error: submissionError } = await supabaseAdmin
        .from("user_submitted_products")
        .select("submitted_by")
        .eq("id", submissionId)
        .maybeSingle<{ submitted_by: string | null }>();
      if (submissionError) throw submissionError;

      const ownerOrAdmin =
        isAdmin(typedReq) ||
        (submission?.submitted_by != null && submission.submitted_by === userId);

      if (!ownerOrAdmin) {
        res.status(403).json({ error: "Access denied." });
        return;
      }
    } else {
      if (!isAdmin(typedReq)) {
        res.status(403).json({ error: "Admin access required." });
        return;
      }
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .download(relativePath);

    if (error || !data) {
      res.status(404).json({ error: "Object not found." });
      return;
    }

    const contentType = data.type || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    const arrayBuffer = await data.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    req.log.error({ err }, "Storage object fetch failed");
    res.status(500).json({ error: "Failed to fetch object." });
  }
});

export default router;
