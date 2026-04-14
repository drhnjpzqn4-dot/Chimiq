import { Router, type IRouter } from "express";
import { objectStorageClient } from "../lib/objectStorage";

const router: IRouter = Router();

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

  try {
    const objectKey = `${privateDir.replace(/\/$/, "")}/${relativePath}`;
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectKey);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: "Object not found." });
      return;
    }
    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string | undefined) ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    file.createReadStream().pipe(res);
  } catch (err) {
    req.log.error({ err }, "Storage object fetch failed");
    res.status(500).json({ error: "Failed to fetch object." });
  }
});

export default router;
