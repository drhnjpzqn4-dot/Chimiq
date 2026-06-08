#!/usr/bin/env python3
"""
harvest_apotea.py — skrapar hudvårdsprodukter från Apotea med Playwright.

Apotea är JavaScript-renderad → Playwright behövs för ALLT (både URL-discovery
och produktsidor). INCI finns i "Innehåll"/"Ingredienser"-avsnittet.

KÖR PÅ STINA:
    scp /Users/pia/PiasVentures/chimiq-code/harvest_apotea.py ai_stina@Pias-Mac-mini.local:~/harvest/
    ssh ai_stina@Pias-Mac-mini.local
    cd ~/harvest && source ~/.zprofile

    # Testa 5 produkter (serum):
    python3 harvest_apotea.py --category serum --limit 5

    # Full körning:
    python3 harvest_apotea.py --category serum --limit 200
    python3 harvest_apotea.py --category dagkram --limit 150
    python3 harvest_apotea.py --category ansiktsrengoring --limit 150
    python3 harvest_apotea.py --category toner --limit 100

KRÄVER: SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.
         Playwright + Chromium installerat.
"""

import os
import sys
import re
import time
import json
import argparse
import urllib.request
import urllib.parse

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Apotea kategori-URLs
CATEGORIES = {
    "serum":              "https://www.apotea.se/serum-ansikte",
    "dagkram":            "https://www.apotea.se/dagkram",
    "nattkram":           "https://www.apotea.se/nattkram",
    "ansiktsrengoring":   "https://www.apotea.se/ansiktsrengoring",
    "toner":              "https://www.apotea.se/ansiktsvatten",
    "ansiktsmask":        "https://www.apotea.se/ansiktsmask",
    "ogonkram":           "https://www.apotea.se/ogonkram",
    "solskydd":           "https://www.apotea.se/solskydd-for-ansiktet",
    "k-beauty":           "https://www.apotea.se/k-beauty",
}

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


# ── Supabase ─────────────────────────────────────────────────────────────────

def sb_upsert(table, rows):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(rows).encode()
    req = urllib.request.Request(url, data=payload, method="POST", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


def sb_exists(url_check):
    enc = urllib.parse.quote(url_check, safe="")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/scraped_products?select=id&source_url=eq.{enc}&limit=1",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return len(json.loads(r.read())) > 0


# ── Playwright-helper ────────────────────────────────────────────────────────

def make_browser(pw):
    browser = pw.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled",
              "--disable-dev-shm-usage"]
    )
    ctx = browser.new_context(
        user_agent=UA,
        locale="sv-SE",
        viewport={"width": 1280, "height": 900},
    )
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
    return browser, ctx


def dismiss_cookie_banner(page):
    for txt in ["Acceptera alla", "Godkänn alla", "Acceptera nödvändiga",
                "Acceptera", "Stäng", "OK"]:
        try:
            page.locator(f"button:has-text('{txt}')").first.click(timeout=2000)
            page.wait_for_timeout(400)
            return
        except Exception:
            pass


# ── Produkt-sitemap (auktoritativ lista över riktiga produktsidor) ────────────
# Apotea publicerar separata sitemaps; sitemap-products-* innehåller ENBART
# riktiga produkt-URLs (inte kategorier/landningssidor). Vi bygger en set och
# filtrerar kategorisidans länkar mot den → bort med "solskydd-for-barn-4" m.fl.
_APOTEA_PRODUCT_CACHE = os.path.expanduser("~/harvest/apotea_products_cache.txt")
_APOTEA_CACHE_MAX_AGE_H = 12

def _apotea_cache_fresh():
    if not os.path.exists(_APOTEA_PRODUCT_CACHE):
        return False
    return (time.time() - os.path.getmtime(_APOTEA_PRODUCT_CACHE)) / 3600 < _APOTEA_CACHE_MAX_AGE_H

def load_apotea_product_urls():
    """Hämtar ALLA produkt-URLs från Apoteas produkt-sitemaps (sitemap-products-*).
    Returnerar en set för snabb medlemskoll. Cachas i ~12h. Tom set vid fel
    (anroparen faller då tillbaka på heuristik)."""
    if _apotea_cache_fresh():
        try:
            with open(_APOTEA_PRODUCT_CACHE, encoding="utf-8") as f:
                urls = set(l.strip() for l in f if l.strip())
            print(f"  (Produkt-sitemap-cache: {len(urls)} URLs, < {_APOTEA_CACHE_MAX_AGE_H}h)", flush=True)
            return urls
        except Exception:
            pass

    loc_re = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>")
    def _fetch(url):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", errors="replace")

    print("  Laddar Apotea produkt-sitemaps...", flush=True)
    try:
        index_xml = _fetch("https://www.apotea.se/sitemap/sitemaps")
    except Exception as e:
        print(f"  ! Kunde inte hämta sitemap-index: {e}", file=sys.stderr)
        return set()

    product_sitemaps = [u for u in loc_re.findall(index_xml) if "sitemap-products" in u]
    urls = set()
    for sm in product_sitemaps:
        try:
            xml = _fetch(sm)
            found = [u for u in loc_re.findall(xml) if "apotea.se" in u and "/sitemap/" not in u]
            urls.update(found)
            print(f"    {sm.split('/')[-1]}: {len(found)} URLs", flush=True)
        except Exception as e:
            print(f"  ! {sm}: {e}", file=sys.stderr)
        time.sleep(0.3)

    if urls:
        try:
            os.makedirs(os.path.dirname(_APOTEA_PRODUCT_CACHE), exist_ok=True)
            with open(_APOTEA_PRODUCT_CACHE, "w", encoding="utf-8") as f:
                f.write("\n".join(sorted(urls)))
        except Exception:
            pass
    print(f"  → {len(urls)} produkt-URLs totalt (sitemap)", flush=True)
    return urls


# ── URL-discovery (med Playwright, JS-renderad) ───────────────────────────────

JS_COLLECT_LINKS = r"""
() => {
    const BLOCK = /^(nyheter|veckans|kampanj|apotea-premium|premium|landningssida|rabattkod|presentkort|kundservice|om-apotea|foretag|blogg|guide|inspiration|varumarken|recept|fraktfritt|snabbval|sortiment|hjalp|fragor|integritet|villkor|kop-|las-mer)/;
    const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href.split('#')[0].split('?')[0])
        .filter(h => h.includes('apotea.se'))
        .filter(h => {
            // Produktsida = EXAKT ett path-segment, slug med bindestreck.
            const path = h.replace(/^https?:\/\/(www\.)?apotea\.se/, '');
            const segs = path.split('/').filter(Boolean);
            if (segs.length !== 1) return false;
            const slug = segs[0];
            if (slug.length <= 3 || !slug.includes('-')) return false;
            if (BLOCK.test(slug)) return false;            // uteslut landnings-/kampanjsidor
            return true;   // slutgiltig produkt-vs-kategori-filtrering sker mot sitemap i Python
        });
    return JSON.stringify([...new Set(links)]);
}
"""

def collect_product_urls_apotea(category_url, max_products=500, pw=None):
    """Kryp Apotea-kategorisida med Playwright och samla produkt-URLs."""
    browser, ctx = make_browser(pw)
    page = ctx.new_page()
    seen = set()
    urls = []

    try:
        print(f"  Laddar kategorisida: {category_url}", flush=True)
        page.goto(category_url, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(2000)
        dismiss_cookie_banner(page)

        # Scrolla ner för att ladda lazy produkter
        for _ in range(10):
            if len(urls) >= max_products:
                break
            page.evaluate("window.scrollBy(0, 1500)")
            page.wait_for_timeout(800)

            raw = page.evaluate(JS_COLLECT_LINKS)
            found = json.loads(raw)
            new_count = 0
            for u in found:
                if u not in seen:
                    seen.add(u)
                    urls.append(u)
                    new_count += 1
            if new_count == 0:
                break  # inga fler nya

        # Försök klicka "Visa fler" / "Ladda fler" om det finns
        for btn_text in ["Visa fler", "Ladda fler", "Visa alla", "Se fler produkter"]:
            while len(urls) < max_products:
                try:
                    btn = page.locator(f"button:has-text('{btn_text}')")
                    if btn.count() == 0:
                        break
                    btn.first.click(timeout=3000)
                    page.wait_for_timeout(1500)
                    raw = page.evaluate(JS_COLLECT_LINKS)
                    found = json.loads(raw)
                    for u in found:
                        if u not in seen:
                            seen.add(u)
                            urls.append(u)
                except Exception:
                    break

        # Filtrera kategorisidans länkar mot den auktoritativa produkt-sitemapen.
        # Tar bort subkategori-/landningslänkar (t.ex. solskydd-for-barn-4) som
        # råkar se ut som produkt-slugs men inte är riktiga produkter.
        product_set = load_apotea_product_urls()
        if product_set:
            pset = {u.rstrip("/") for u in product_set}
            before = len(urls)
            urls = [u for u in urls if u.rstrip("/") in pset]
            print(f"  Hittade {before} länkar → {len(urls)} bekräftade produkter (sitemap)", flush=True)
        else:
            print(f"  Hittade {len(urls)} produkt-URLs (sitemap ej tillgänglig — heuristik)", flush=True)
    except Exception as e:
        print(f"  ! Fel vid URL-discovery: {e}", file=sys.stderr)
    finally:
        browser.close()

    return urls[:max_products]


# ── Scrapa produktsida ────────────────────────────────────────────────────────

JS_PRODUCT = r"""
(function() {
    // LD+JSON (kan vara @graph-arrayer)
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(s => { try { return JSON.parse(s.textContent); } catch(e) { return {}; } });
    const flat = [];
    ld.forEach(d => { if (d && d['@graph']) flat.push.apply(flat, d['@graph']); else flat.push(d); });
    const isProd = d => d && (d['@type'] === 'Product' ||
                              (Array.isArray(d['@type']) && d['@type'].indexOf('Product') !== -1));
    const prod = flat.find(isProd) || null;
    const isProduct = !!prod;
    const offer = (prod && prod.offers && (Array.isArray(prod.offers) ? prod.offers[0] : prod.offers)) || {};

    const h1 = document.querySelector('h1');
    const name = (prod && prod.name) || (h1 ? h1.innerText.trim() : null);
    const brand = (prod && prod.brand && prod.brand.name) || null;
    const price = offer.price || null;

    const allLd = flat.map(d => JSON.stringify(d)).join(' ');
    const eanMatch = allLd.match(/\b(\d{13})\b/);
    const ean = (prod && (prod.gtin13 || prod.gtin)) || (eanMatch ? eanMatch[1] : null);

    const imgMeta = document.querySelector('meta[property="og:image"]');
    const image = (imgMeta ? imgMeta.getAttribute('content') : null) || (prod && prod.image) || null;

    // Strikt INCI-validator (samma princip som harvest_lyko.py): hellre TOM lista
    // än fel. Reject prosa/kampanj/redaktionellt; kräv list-struktur.
    const PROSE = /(inlägg|betyg|recension|skapades|\bvecka\b|\bmånad|rabatt|kampanj|hoppa|pris:|medlemspris|du får|poäng|kundvagn|frakt|leverans|lägg i|verifierad|läs mer|visa mer|apotekare|receptfri|dosering|biverkning|användning|förvaras)/i;
    const INCI_WORDS = /aqua|water|glycerin|parfum|fragrance|sodium|niacinamide|hyaluronate|panthenol|tocopherol|alcohol|acid|butyrospermum|cetearyl|propanediol|glycol|extract|dimethicone/i;
    const SV_STOP = /\b(och|för|med|som|den|det|att|inte|är|kan|till|från|eller)\b/i;
    function tok(t){ return t.replace(/[•·∙●▪‣・･|]/g, ',').replace(/\s+-\s+/g, ',').replace(/\n+/g, ',').split(',').map(function(x){return x.trim();}).filter(Boolean); }
    function inciScore(t){
        if (!t || t.length < 30 || t.length > 2000) return 0;
        if (PROSE.test(t)) return 0;
        if (!INCI_WORDS.test(t)) return 0;
        const toks = tok(t);
        if (toks.length < 5) return 0;
        let good = 0;
        toks.forEach(function(tk){
            if (tk.split(/\s+/).length <= 6 && !SV_STOP.test(tk) && !/[.!?]\s/.test(tk) && /[a-zA-Z]/.test(tk)) good++;
        });
        if (good / toks.length < 0.75) return 0;
        return good;
    }
    let inci = null, best = 0;
    document.querySelectorAll('p,div,span,li,td,section').forEach(function(el){
        const t = (el.innerText || '').trim();
        const s = inciScore(t);
        if (s > best) { best = s; inci = t; }
    });

    return JSON.stringify({name: name, brand: brand, price: price, ean: ean, image: image, inci: inci, isProduct: isProduct});
})()
"""

def scrape_apotea_product(url, ctx):
    """Scrapar en Apotea-produktsida. ctx = Playwright BrowserContext (återanvänd)."""
    page = ctx.new_page()
    data = None
    try:
        page.goto(url, wait_until="networkidle", timeout=40000)
        page.wait_for_timeout(1500)
        dismiss_cookie_banner(page)

        # Klicka "Innehåll" / "Ingredienser"-fliken om den finns
        for sel in [
            "button:has-text('Innehåll')",
            "a:has-text('Innehåll')",
            "button:has-text('Ingredienser')",
            "[role='tab']:has-text('Innehåll')",
            "[role='tab']:has-text('Ingredienser')",
            "li:has-text('Ingredienser')",
        ]:
            try:
                loc = page.locator(sel)
                if loc.count() > 0:
                    loc.first.click(timeout=2000)
                    page.wait_for_timeout(800)
                    break
            except Exception:
                pass

        raw = page.evaluate(JS_PRODUCT)
        data = json.loads(raw)
    except Exception as e:
        print(f"    ! Fel: {e}", file=sys.stderr)
    finally:
        page.close()

    if not data or not data.get("name"):
        return None

    # Lagra BARA riktiga produktsidor. Utan denna grind hamnar landningssidor
    # som "Veckans kampanjer" (de har en <h1>) i databasen. Kräv LD+JSON Product
    # ELLER en giltig EAN som bevis på att det är en produkt.
    if not data.get("isProduct") and not data.get("ean"):
        print("    ⊘ Ej produktsida (ingen LD Product/EAN) — hoppar", flush=True)
        return None

    return {
        "source_store":    "apotea",
        "source_url":      url,
        "brand":           data.get("brand"),
        "product_name":    data.get("name"),
        "category":        None,
        "price":           data.get("price"),
        "currency":        "SEK",
        "quantity":        None,
        "ingredients_raw": data.get("inci"),
        "barcode":         data.get("ean"),
        "image_url":       data.get("image"),
    }


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Skrapa Apotea-produkter till Supabase")
    parser.add_argument("--category", default="serum",
                        help=f"Kategori. Val: {', '.join(CATEGORIES)}. Default: serum")
    parser.add_argument("--limit", type=int, default=50,
                        help="Max antal produkter. Default: 50")
    parser.add_argument("--delay", type=float, default=3.0,
                        help="Sekunder mellan produkter. Default: 3.0")
    parser.add_argument("--skip-existing", action="store_true", default=True)
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Sätt SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.")
        sys.exit(1)

    if args.category not in CATEGORIES:
        print(f"ERROR: Okänd kategori. Val: {', '.join(CATEGORIES)}")
        sys.exit(1)

    cat_url = CATEGORIES[args.category]
    print(f"=== Apotea-skörd: {args.category} ===\n")

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:

        # Steg 1: URL-discovery
        print("Steg 1: Samlar produkt-URLs...", flush=True)
        all_urls = collect_product_urls_apotea(cat_url, max_products=args.limit * 3, pw=pw)

        # Steg 2: Filtrera
        if args.skip_existing:
            urls = [u for u in all_urls if not sb_exists(u)]
            print(f"{len(urls)} nya URLs (av {len(all_urls)} totalt).\n")
        else:
            urls = all_urls
        urls = urls[:args.limit]

        # Steg 3: Skrapa med återanvänd browser-kontext
        print(f"Steg 2: Skrapar {len(urls)} produkter...\n", flush=True)
        browser, ctx = make_browser(pw)
        stored = failed = 0

        try:
            for i, url in enumerate(urls, 1):
                print(f"[{i}/{len(urls)}] {url}", flush=True)
                row = scrape_apotea_product(url, ctx)
                if not row:
                    print("  ✗ Ingen data", flush=True)
                    failed += 1
                else:
                    has_inci = "✅" if row.get("ingredients_raw") else "–"
                    has_ean  = "✅" if row.get("barcode") else "–"
                    print(f"  {row['product_name'][:50]} | EAN:{has_ean} INCI:{has_inci}", flush=True)
                    try:
                        sb_upsert("scraped_products", [row])
                        stored += 1
                    except Exception as e:
                        print(f"  ! Supabase: {e}", file=sys.stderr)
                        failed += 1
                time.sleep(args.delay)
        finally:
            browser.close()

    print(f"\n── Klart ──")
    print(f"Sparade: {stored} | Missade: {failed}")


if __name__ == "__main__":
    main()
