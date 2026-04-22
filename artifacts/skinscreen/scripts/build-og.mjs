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

const SITE_NAME = "SkinScreen";
const BRAND = "#7BAF7A";
const BG = "#FAFAF8";
const INK = "#1C2421";
const MUTED = "#6B7570";

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
    <text x="22" y="30" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="800" fill="white" text-anchor="middle">S</text>
    <text x="62" y="30" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700" fill="${INK}">SkinScreen</text>
    <text x="62" y="56" font-family="Inter, system-ui, sans-serif" font-size="16" fill="${MUTED}">Skincare ingredient safety</text>
  </g>
</svg>`;
}

function renderHtml(template, { title, description, image, url, type }) {
  const ogTags = `
    <meta property="og:type" content="article" />
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
    <meta name="twitter:image" content="${escapeHtmlAttr(image)}" />
    <meta name="article:section" content="${escapeHtmlAttr(type)}" />`;

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

  const baseUrl = (process.env.OG_BASE_URL ?? "https://skinscreen.app").replace(/\/+$/, "");
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
}

main().catch((err) => {
  console.error("[og] build failed:", err);
  process.exit(1);
});
