#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { build as esbuild } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist/public");
const ogOutDir = resolve(distDir, "og/discover");
const ogMarketingOutDir = resolve(distDir, "og/marketing");

const SITE_NAME = "Chimiq";
const BRAND = "#7BAF7A";
const BG = "#FAFAF8";
const INK = "#1C2421";
const MUTED = "#6B7570";

// Marketing pages that need a per-page share preview (#87). Home (`/`) is
// excluded because its `index.html` already carries the site-wide OG tags;
// these are SPA-only routes (no static HTML), so we generate one per route
// to make Twitter/Facebook/iMessage previews resolve to the right title +
// image instead of the generic site default.
const MARKETING_PAGES = [
  {
    slug: "pricing",
    eyebrow: "Pricing",
    title: "Free for life. Premium when you want more.",
    hook: "Scan unlimited products on Free. Unlock the full routine analysis on Premium for 49 SEK/mo.",
    description:
      "Chimiq Pricing — start free, upgrade for full routine ingredient-conflict analysis.",
  },
  {
    slug: "discover",
    eyebrow: "Discover",
    title: "The Top 10 mistakes & worries — and what to do instead.",
    hook: "Skincare myths debunked, dangerous combos explained, and the swap that fixes each one.",
    description:
      "Discover — Top 10 skincare mistakes, Top 10 worries, and the simple fixes that save your skin barrier.",
  },
  {
    slug: "recipes",
    eyebrow: "DIY recipes",
    title: "DIY skincare recipes — scanned by AI, reviewed by humans.",
    hook: "Community-shared at-home formulas, vetted for ingredient conflicts before they reach your shelf.",
    description:
      "DIY recipes — community at-home skincare formulas, AI-scanned and admin-reviewed for safety.",
  },
];

async function loadDiscoverContent() {
  const src = resolve(root, "src/lib/discover-content.ts");
  const tmpOut = resolve(root, "dist/.og-tmp/discover-content.mjs");
  await mkdir(dirname(tmpOut), { recursive: true });
  await esbuild({
    entryPoints: [src],
    outfile: tmpOut,
    format: "esm",
    platform: "node",
    bundle: false,
    target: "es2022",
    logLevel: "silent",
  });
  const mod = await import(pathToFileURL(tmpOut).href + `?t=${Date.now()}`);
  return mod;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtmlAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w;
    } else if ((current + " " + w).length <= maxChars) {
      current += " " + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function svgFor({ rank, title, hook, tagLabel, sectionLabel }) {
  const W = 1200;
  const H = 630;
  const titleLines = wrapText(title, 28).slice(0, 3);
  const hookLines = wrapText(hook, 56).slice(0, 3);

  let titleY = 250;
  const titleSpans = titleLines
    .map((line, i) => `<tspan x="80" y="${titleY + i * 78}">${escapeXml(line)}</tspan>`)
    .join("");

  const hookY = titleY + titleLines.length * 78 + 40;
  const hookSpans = hookLines
    .map((line, i) => `<tspan x="80" y="${hookY + i * 38}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#F0EDE6"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="#5E8F60"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="${H}" fill="url(#accent)"/>

  <text x="80" y="110" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="600" fill="${BRAND}" letter-spacing="3">
    ${escapeXml(sectionLabel.toUpperCase())} · #${rank}
  </text>

  <g transform="translate(80, 140)">
    <rect x="0" y="0" width="${tagLabel.length * 14 + 40}" height="36" rx="18" fill="${BRAND}" fill-opacity="0.12"/>
    <text x="20" y="24" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700" fill="${BRAND}" letter-spacing="2">
      ${escapeXml(tagLabel.toUpperCase())}
    </text>
  </g>

  <text font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700" fill="${INK}">
    ${titleSpans}
  </text>

  <text font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="400" fill="${MUTED}" font-style="italic">
    ${hookSpans}
  </text>

  <g transform="translate(80, 540)">
    <circle cx="22" cy="22" r="22" fill="${BRAND}"/>
    <text x="22" y="30" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="800" fill="white" text-anchor="middle">C</text>
    <text x="62" y="30" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700" fill="${INK}">Chimiq</text>
    <text x="62" y="56" font-family="Inter, system-ui, sans-serif" font-size="16" fill="${MUTED}">Skincare ingredient safety</text>
  </g>
</svg>`;
}

function svgForMarketing({ eyebrow, title, hook }) {
  // Marketing variant of the article OG layout — same visual language but
  // bigger title block, no rank/severity chip, and an eyebrow label only.
  const W = 1200;
  const H = 630;
  const titleLines = wrapText(title, 26).slice(0, 3);
  const hookLines = wrapText(hook, 56).slice(0, 3);

  let titleY = 230;
  const titleSpans = titleLines
    .map((line, i) => `<tspan x="80" y="${titleY + i * 82}">${escapeXml(line)}</tspan>`)
    .join("");

  const hookY = titleY + titleLines.length * 82 + 50;
  const hookSpans = hookLines
    .map((line, i) => `<tspan x="80" y="${hookY + i * 38}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#F0EDE6"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="#5E8F60"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="${H}" fill="url(#accent)"/>

  <text x="80" y="140" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700" fill="${BRAND}" letter-spacing="4">
    ${escapeXml(eyebrow.toUpperCase())}
  </text>

  <text font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="700" fill="${INK}">
    ${titleSpans}
  </text>

  <text font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="400" fill="${MUTED}" font-style="italic">
    ${hookSpans}
  </text>

  <g transform="translate(80, 540)">
    <circle cx="22" cy="22" r="22" fill="${BRAND}"/>
    <text x="22" y="30" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="800" fill="white" text-anchor="middle">C</text>
    <text x="62" y="30" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700" fill="${INK}">Chimiq</text>
    <text x="62" y="56" font-family="Inter, system-ui, sans-serif" font-size="16" fill="${MUTED}">Skincare ingredient safety</text>
  </g>
</svg>`;
}

function renderHtml(template, { title, description, image, url, type }) {
  // The Discover article writer passes `type` = "mistakes" | "worries" (an
  // article subtype). Marketing pages pass `type` = "website". Map either
  // to a valid OpenGraph `og:type` value, and only emit `article:section`
  // when this really is an article — Facebook/Slack reject mismatched
  // article:* tags on website-typed previews.
  const isArticle = type !== "website";
  const ogType = isArticle ? "article" : "website";
  const articleSection = isArticle
    ? `\n    <meta property="article:section" content="${escapeHtmlAttr(type)}" />`
    : "";
  const ogTags = `
    <meta property="og:type" content="${escapeHtmlAttr(ogType)}" />
    <meta property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtmlAttr(title)}" />
    <meta property="og:description" content="${escapeHtmlAttr(description)}" />
    <meta property="og:image" content="${escapeHtmlAttr(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeHtmlAttr(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtmlAttr(title)}" />
    <meta name="twitter:description" content="${escapeHtmlAttr(description)}" />
    <meta name="twitter:image" content="${escapeHtmlAttr(image)}" />${articleSection}`;

  // Replace <title>
  let html = template.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtmlAttr(title)} · ${SITE_NAME}</title>`,
  );
  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtmlAttr(description)}" />`,
  );
  // Strip baseline og:* and twitter:* tags so per-article ones win
  html = html.replace(
    /\s*<meta\s+(?:property|name)=["'](?:og|twitter|article|fb):[\w:.-]+["'][^>]*>/gi,
    "",
  );
  // Inject OG/Twitter tags before </head>
  html = html.replace(/<\/head>/i, `${ogTags}\n  </head>`);
  return html;
}

async function writeArticle(kind, item, sectionLabel, tagLabel, template, baseUrl, ogPublicBase, articleBase) {
  const slug = item.slug;
  const ogPng = `${kind}/${slug}.png`;
  const ogPath = resolve(ogOutDir, ogPng);
  if (!existsSync(ogPath)) {
    const svg = svgFor({
      rank: item.rank,
      title: item.title,
      hook: item.hook,
      tagLabel,
      sectionLabel,
    });
    const resvg = new Resvg(svg, {
      background: BG,
      font: { loadSystemFonts: true, defaultFontFamily: "Inter" },
      fitTo: { mode: "width", value: 1200 },
    });
    const png = resvg.render().asPng();
    await mkdir(dirname(ogPath), { recursive: true });
    await writeFile(ogPath, png);
  }

  const url = `${baseUrl}${articleBase}/discover/${kind}/${slug}`;
  const imageUrl = `${baseUrl}${ogPublicBase}/${kind}/${slug}.png`;

  const description = item.hook;
  const html = renderHtml(template, {
    title: `${sectionLabel} #${item.rank}: ${item.title}`,
    description,
    image: imageUrl,
    url,
    type: kind,
  });

  const htmlPath = resolve(distDir, "discover", kind, slug, "index.html");
  await mkdir(dirname(htmlPath), { recursive: true });
  await writeFile(htmlPath, html);
  return { slug, htmlPath, ogPath };
}

async function main() {
  if (!existsSync(distDir)) {
    console.error(`[og] dist not found at ${distDir} — run 'vite build' first.`);
    process.exit(1);
  }

  const indexPath = resolve(distDir, "index.html");
  const template = await readFile(indexPath, "utf8");

  const { TOP_MISTAKES, TOP_WORRIES, SEVERITY_LABEL, FREQUENCY_LABEL } =
    await loadDiscoverContent();

  const baseUrl = (process.env.OG_BASE_URL ?? "https://chimiq.com").replace(/\/+$/, "");
  const basePath = (process.env.BASE_PATH ?? "/").replace(/\/+$/, "");
  const ogPublicBase = `${basePath}/og/discover`;
  const articleBase = basePath; // empty when basePath is "/"

  await mkdir(ogOutDir, { recursive: true });

  let count = 0;
  for (const item of TOP_MISTAKES) {
    await writeArticle(
      "mistakes",
      item,
      "Top 10 mistakes",
      SEVERITY_LABEL[item.severity] ?? item.severity,
      template,
      baseUrl,
      ogPublicBase,
      articleBase,
    );
    count++;
  }
  for (const item of TOP_WORRIES) {
    await writeArticle(
      "worries",
      item,
      "Top 10 worries",
      FREQUENCY_LABEL[item.frequency] ?? item.frequency,
      template,
      baseUrl,
      ogPublicBase,
      articleBase,
    );
    count++;
  }

  console.log(`[og] generated ${count} article previews → ${distDir}/discover/{mistakes,worries}/<slug>/index.html`);
  console.log(`[og] images → ${ogOutDir}/{mistakes,worries}/<slug>.png`);

  // --- Marketing pages (#87) -----------------------------------------------
  // Generate per-page share previews for the SPA-only marketing routes so
  // Twitter / Facebook / iMessage / Slack render the correct title and
  // image instead of the site-wide default.
  await mkdir(ogMarketingOutDir, { recursive: true });
  const marketingPublicBase = `${basePath}/og/marketing`;

  let mCount = 0;
  for (const page of MARKETING_PAGES) {
    const ogPath = resolve(ogMarketingOutDir, `${page.slug}.png`);
    if (!existsSync(ogPath)) {
      const svg = svgForMarketing({
        eyebrow: page.eyebrow,
        title: page.title,
        hook: page.hook,
      });
      const resvg = new Resvg(svg, {
        background: BG,
        font: { loadSystemFonts: true, defaultFontFamily: "Inter" },
        fitTo: { mode: "width", value: 1200 },
      });
      const png = resvg.render().asPng();
      await writeFile(ogPath, png);
    }

    const url = `${baseUrl}${basePath}/${page.slug}`;
    const imageUrl = `${baseUrl}${marketingPublicBase}/${page.slug}.png`;
    // `renderHtml` already appends ` · ${SITE_NAME}` to the title, so just
    // pass the eyebrow here — otherwise we get "Pricing · Chimiq · Chimiq".
    const html = renderHtml(template, {
      title: page.eyebrow,
      description: page.description,
      image: imageUrl,
      url,
      type: "website",
    });

    const htmlPath = resolve(distDir, page.slug, "index.html");
    await mkdir(dirname(htmlPath), { recursive: true });
    await writeFile(htmlPath, html);
    mCount++;
  }

  console.log(`[og] generated ${mCount} marketing previews → ${distDir}/{${MARKETING_PAGES.map((p) => p.slug).join(",")}}/index.html`);
  console.log(`[og] marketing images → ${ogMarketingOutDir}/<slug>.png`);
}

main().catch((err) => {
  console.error("[og] build failed:", err);
  process.exit(1);
});
