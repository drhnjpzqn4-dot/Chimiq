import { logger } from "./logger";

const ACUMBAMAIL_API_URL = "https://acumbamail.com/api/1/addSubscriber/";

export async function syncToAcumbamail(email: string): Promise<void> {
  const authToken = process.env.ACUMBAMAIL_AUTH_TOKEN;
  const listId = process.env.ACUMBAMAIL_LIST_ID;

  if (!authToken || !listId) {
    logger.warn("[acumbamail] ACUMBAMAIL_AUTH_TOKEN or ACUMBAMAIL_LIST_ID not configured — skipping sync");
    return;
  }

  try {
    const body = new URLSearchParams({
      auth_token: authToken,
      list_id: listId,
      email,
      double_optin: "0",
    });
    body.append("merge_fields[email]", email);

    const response = await fetch(ACUMBAMAIL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "[acumbamail] Non-200 response from Acumbamail API");
      return;
    }

    let data: Record<string, unknown> = {};
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      logger.warn("[acumbamail] Could not parse Acumbamail response JSON");
      return;
    }

    if (data.error) {
      const errorMsg = String(data.error);
      const isAlreadyExists =
        errorMsg.toLowerCase().includes("already") ||
        errorMsg.toLowerCase().includes("existe") ||
        errorMsg.toLowerCase().includes("exists");

      if (isAlreadyExists) {
        logger.info("[acumbamail] Subscriber already exists — treating as success");
      } else {
        logger.warn({ error: errorMsg }, "[acumbamail] Acumbamail API returned an error");
      }
      return;
    }

    logger.info({ domain: email.split("@")[1] ?? "unknown" }, "[acumbamail] Subscriber synced successfully");
  } catch (err) {
    logger.warn({ err }, "[acumbamail] Sync failed (network or unexpected error)");
  }
}
