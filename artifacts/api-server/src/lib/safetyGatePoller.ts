import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabase-admin.js";

// SS-083: the legacy RAPEX repository XML (…/RAPEX_ALERTS_1_3.xml) was retired when
// the EU moved to the "Safety Gate" portal — a JavaScript single-page app backed by a
// JSON API with no simple public RSS/XML list endpoint. The old URL now returns an HTML
// page, so the poller saw `non_xml_response` and ingested nothing.
//
// We instead poll the OpenDataSoft mirror of the same Safety Gate / RAPEX dataset, which
// exposes a stable, standards-compliant RSS export that the existing regex parser can
// read as-is (<item>/<title>/<description>/<link>/<pubDate>). Override at runtime with the
// SAFETY_GATE_FEED_URL env var (Railway → Variables) — no code deploy needed to repoint.
//
// Trade-off worth knowing (non-developer summary): this mirror is rebuilt from the EU's
// published Excel exports, so it can lag the official portal by a few days. For weekly
// recall monitoring that delay is fine; if we ever need same-day alerts we just set
// SAFETY_GATE_FEED_URL to an official feed once the EU exposes one.
const DEFAULT_FEED_URL =
  "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/healthref-europe-rapex-en/exports/rss?lang=en";

/** DEFAULT_FEED_URL unless an explicit arg or the SAFETY_GATE_FEED_URL env var overrides it. */
function resolveFeedUrl(explicit?: string): string {
  const fromEnv = process.env.SAFETY_GATE_FEED_URL?.trim();
  return explicit ?? (fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_FEED_URL);
}

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
  feedUrl?: string,
): Promise<PollSafetyGateResult> {
  const url = resolveFeedUrl(feedUrl);
  const res = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "ChimiqSafetyGatePoller/1.0 (+https://chimiq)",
    },
  });
  if (!res.ok) {
    return {
      ok: false,
      feedUrl: url,
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
      feedUrl: url,
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

    const { data, error } = await supabaseAdmin
      .from("recalls")
      .upsert(
        {
        title: title.slice(0, 4000),
        description: description ? description.slice(0, 16000) : null,
          product_name: productName,
          published_at: publishedAt ? publishedAt.toISOString() : null,
          source_url: sourceUrl,
        },
        { onConflict: "source_url", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;

    if ((data?.length ?? 0) > 0) inserted += 1;
  }

  return {
    ok: true,
    feedUrl: url,
    itemBlocks: blocks.length,
    matched,
    inserted,
  };
}

/** Used by tests or admin tooling — latest rows by publication date. */
export async function listRecentRecalls(limit = 5) {
  const { data, error } = await supabaseAdmin
    .from("recalls")
    .select("id,title,description,product_name,published_at,source_url,created_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    productName: row.product_name,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    sourceUrl: row.source_url,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  }));
}
