import { createClient } from "@supabase/supabase-js";

/**
 * Upload a buffer to Supabase Storage.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * Returns the public URL path, or null if upload fails or storage is not configured.
 */
export async function uploadBufferToGcs(
  buffer: Buffer,
  folder: string,
  filename: string,
  contentType: string,
): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.STORAGE_BUCKET_NAME || "chimiq-uploads";

  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const objectKey = `${folder}/${filename}`;
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(objectKey, buffer, { contentType, upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(objectKey);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// Legacy export kept for routes that import gcsClient directly
export const gcsClient = null;
