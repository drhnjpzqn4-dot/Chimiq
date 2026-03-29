const ACUMBAMAIL_API_URL = "https://acumbamail.com/api/1/addSubscriber/";

export async function syncToAcumbamail(email: string): Promise<void> {
  const authToken = process.env.ACUMBAMAIL_AUTH_TOKEN;
  const listId = process.env.ACUMBAMAIL_LIST_ID;

  if (!authToken || !listId) {
    console.warn("[acumbamail] ACUMBAMAIL_AUTH_TOKEN or ACUMBAMAIL_LIST_ID not configured — skipping sync");
    return;
  }

  const body = new URLSearchParams({
    auth_token: authToken,
    list_id: listId,
    email,
    double_optin: "0",
  });

  const response = await fetch(ACUMBAMAIL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Acumbamail responded with HTTP ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    const errorMsg = String(data.error);
    if (
      errorMsg.toLowerCase().includes("already") ||
      errorMsg.toLowerCase().includes("existe") ||
      errorMsg.toLowerCase().includes("exists")
    ) {
      console.info("[acumbamail] Subscriber already exists — treating as success");
      return;
    }
    throw new Error(`Acumbamail error: ${errorMsg}`);
  }

  console.info("[acumbamail] Subscriber synced successfully");
}
