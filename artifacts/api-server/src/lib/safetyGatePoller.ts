import { createHash } from "node:crypto";
import { desc } from "drizzle-orm";
import { db, recallsTable } from "@workspace/db";

const DEFAULT_FEED_URL =
  "https://ec.europa.eu/consumers/consumers_safety/safety_products/rapex/alerts/repository/RAPEX_ALERTS_1_3.xml";

function stripCdata(raw: string): string {
  return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
}

function stripInnerTags(s: string): string {
  return stripCdata(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

function firstTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  if (!m) return "";
  return decodeBasicEntities(stripInnerTags(m[1]));
}

function allTags(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const v = decodeBasicEntities(stripInnerTags(m[1]));
    if (v) out.push(v);
  }
  return out;
}

function splitRssItems(xml: string): string[] {
  const normalized = xml.replace(/\r\n/g, "\n");
  const parts = normalized.split(/<item\b[^>]*>/i);
  if (parts.length > 1) {
    return parts.slice(1).map((chunk) => {
      const end = chunk.search(/<\/item>/i);
      return end === -1 ? chunk : chunk.slice(0, end);
    });
  }
  const atomParts = normalized.split(/<entry\b[^>]*>/i);
  if (atomParts.length > 1) {
    return atomParts.slice(1).map((chunk) => {
      const end = chunk.search(/<\/entry>/i);
      return end === -1 ? chunk : chunk.slice(0, end);
    });
  }
  return [];
}

function matchesCosmeticsOrChemicals(block: string): boolean {
  const categories = allTags(block, "category");
  const title = firstTag(block, "title");
  const description = firstTag(block, "description");
  const blob = `${title}\n${description}\n${categories.join("\n")}`.toLowerCase();
  if (categories.some((c) => /cosmetics/i.test(c) || /chemical\s*products/i.test(c))) {
    return true;
  }
  return /\bcosmetics\b/i.test(blob) || /\bchemical\s+products\b/i.test(blob);
}

function stableSourceUrl(block: string): string {
  const link = firstTag(block, "link");
  if (link) return link.slice(0, 2000);
  const guid = firstTag(block, "guid");
  if (guid) return `urn:eu-safety-gate:guid:${guid.slice(0, 500)}`;
  const title = firstTag(block, "title");
  const pub = firstTag(block, "pubDate") || firstTag(block, "published") || firstTag(block, "updated");
  const h = createHash("sha256").update(`${title}\n${pub}`).digest("hex");
  return `urn:eu-safety-gate:hash:${h}`;
}

function parsePubDate(block: string): Date | null {
  const raw = firstTag(block, "pubDate") || firstTag(block, "published") || firstTag(block, "updated");
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inferProductName(block: string, title: string, description: string): string | null {
  const explicit =
    firstTag(block, "productName") ||
    firstTag(block, "productname") ||
    firstTag(block, "product");
  if (explicit) return explicit.slice(0, 500);
  const firstLine = description.split("\n").map((l) => l.trim()).find(Boolean);
  if (firstLine && firstLine.length > 3) return firstLine.slice(0, 500);
  return title ? title.slice(0, 500) : null;
}

export interface PollSafetyGateResult {
  ok: boolean;
  feedUrl: string;
  reason?: string;
  itemBlocks: number;
  matched: number;
  inserted: number;
}

/**
 * One-shot fetch of the EU Safety Gate / RAPEX-style RSS feed, filter for
 * cosmetics & chemical product alerts, and upsert rows into `recalls`.
 * Parsing is intentionally dependency-free (regex / string ops only).
 */
export async function pollSafetyGate(
  feedUrl: string = DEFAULT_FEED_URL,
): Promise<PollSafetyGateResult> {
  const res = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "ChimiqSafetyGatePoller/1.0 (+https://chimiq)",
    },
  });
  if (!res.ok) {
    return {
      ok: false,
      feedUrl,
      reason: `http_${res.status}`,
      itemBlocks: 0,
      matched: 0,
      inserted: 0,
    };
  }
  const xml = await res.text();
  const trimmed = xml.trimStart();
  if (trimmed.startsWith("<!") || trimmed.toLowerCase().startsWith("<html")) {
    return {
      ok: false,
      feedUrl,
      reason: "non_xml_response",
      itemBlocks: 0,
      matched: 0,
      inserted: 0,
    };
  }

  const blocks = splitRssItems(xml);
  let matched = 0;
  let inserted = 0;

  for (const block of blocks) {
    if (!matchesCosmeticsOrChemicals(block)) continue;
    matched += 1;
    const title = firstTag(block, "title") || "Safety Gate alert";
    const description = firstTag(block, "description") || firstTag(block, "summary") || null;
    const publishedAt = parsePubDate(block);
    const productName = inferProductName(block, title, description ?? "");
    const sourceUrl = stableSourceUrl(block);

    const result = await db
      .insert(recallsTable)
      .values({
        title: title.slice(0, 4000),
        description: description ? description.slice(0, 16000) : null,
        productName,
        publishedAt,
        sourceUrl,
      })
      .onConflictDoNothing({ target: recallsTable.sourceUrl })
      .returning({ id: recallsTable.id });

    if (result.length > 0) inserted += 1;
  }

  return {
    ok: true,
    feedUrl,
    itemBlocks: blocks.length,
    matched,
    inserted,
  };
}

/** Used by tests or admin tooling — latest rows by publication date. */
export async function listRecentRecalls(limit = 5) {
  return db
    .select({
      id: recallsTable.id,
      title: recallsTable.title,
      description: recallsTable.description,
      productName: recallsTable.productName,
      publishedAt: recallsTable.publishedAt,
      sourceUrl: recallsTable.sourceUrl,
      createdAt: recallsTable.createdAt,
    })
    .from(recallsTable)
    .orderBy(desc(recallsTable.publishedAt), desc(recallsTable.id))
    .limit(limit);
}
