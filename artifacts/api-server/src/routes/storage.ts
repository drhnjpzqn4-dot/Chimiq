import { Router, type IRouter } from "express";
import { gcsClient } from "../lib/objectStorage";
import { db, userSubmittedProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isRequestAdmin } from "../lib/admin";

const router: IRouter = Router();

function isAdmin(req: { user?: { email?: string } }): boolean {
  return isRequestAdmin(req as { user?: { email?: string | null } });
}

router.get(/^\/storage\/objects\/(.+)$/, async (req, res) => {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!bucketId || !privateDir) {
    res.status(503).json({ error: "Object storage not configured." });
    return;
  }

  const relativePath = (req.params as Record<string, string>)["0"];
  if (!relativePath) {
    res.status(400).json({ error: "Missing object path." });
    return;
  }

  const typedReq = req as { user?: { id?: string; email?: string } };
  const userId = typedReq.user?.id ?? null;

  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const contributionMatch = relativePath.match(/^contributions\/([0-9a-f-]{36})\//i);
    if (contributionMatch) {
      const submissionId = contributionMatch[1];
      const [submission] = await db
        .select({ submittedBy: userSubmittedProductsTable.submittedBy })
        .from(userSubmittedProductsTable)
        .where(eq(userSubmittedProductsTable.id, submissionId));

      const ownerOrAdmin =
        isAdmin(typedReq) ||
        (submission?.submittedBy != null && submission.submittedBy === userId);

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

    const objectKey = `${privateDir.replace(/\/$/, "")}/${relativePath}`;
    const bucket = gcsClient.bucket(bucketId);
    const file = bucket.file(objectKey);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: "Object not found." });
      return;
    }
    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string | undefined) ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    file.createReadStream().pipe(res);
  } catch (err) {
    req.log.error({ err }, "Storage object fetch failed");
    res.status(500).json({ error: "Failed to fetch object." });
  }
});

export default router;
