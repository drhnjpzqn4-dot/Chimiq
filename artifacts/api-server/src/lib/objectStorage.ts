import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export async function uploadBufferToGcs(
  buffer: Buffer,
  folder: string,
  filename: string,
  contentType: string,
): Promise<string | null> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!bucketId || !privateDir) return null;
  try {
    const objectKey = `${privateDir.replace(/\/$/, "")}/${folder}/${filename}`;
    const bucket = gcsClient.bucket(bucketId);
    await bucket.file(objectKey).save(buffer, { contentType, resumable: false });
    return `/objects/${folder}/${filename}`;
  } catch {
    return null;
  }
}
