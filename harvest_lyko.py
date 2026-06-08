#!/usr/bin/env python3
"""
harvest_lyko.py — skrapar hudvårds- och sminkkprodukter från Lyko med Playwright.

KÖR PÅ STINA (kör aldrig utan caffeinate — Stina sover annars):
    scp /Users/pia/PiasVentures/chimiq-code/harvest_lyko.py ai_stina@Pias-Mac-mini.local:~/harvest/
    ssh ai_stina@Pias-Mac-mini.local
    cd ~/harvest && source ~/.zprofile

    # Testa 5 produkter:
    caffeinate -i python3 harvest_lyko.py --category serum --limit 5

    # Full körning en kategori:
    caffeinate -i python3 harvest_lyko.py --category foundation --limit 300

    # Nattjobb — alla kategorier i ett svep:
    caffeinate -i python3 -c "
import subprocess, os
os.chdir('/Users/ai_stina/harvest')
cats = [
    ('serum',300),('dagkram',300),('nattkram',200),('ansiktsrengoring',200),
    ('toner',200),('ansiktsmask',200),('peeling',200),('ogon',200),
    ('ansiktsolja',100),('solskydd',200),
    # Dermatologisk hudvård (farmaceutiska märken — hög INCI-täckning)
    ('derm-kram',300),('derm-rengoring',200),('derm-serum',200),
    # Smink
    ('cc-bb',150),('foundation',400),
    ('concealer',300),('bronzer',150),('blush',150),('ogonskugga',400),
    ('mascara',300),
]
for cat, lim in cats:
    print(f'\\n=== {cat} ===', flush=True)
    subprocess.run(['python3','harvest_lyko.py','--category',cat,'--limit',str(lim)], check=False)
"

KRÄVER: SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.
         pip install playwright --break-system-packages && playwright install chromium
"""

import os, sys, re, time, json, argparse, urllib.request, urllib.parse

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

CATEGORIES = [
    # ── Hudvård ──────────────────────────────────────────────────────────────
    "serum", "dagkram", "nattkram", "ansiktsrengoring", "toner",
    "ogon", "ansiktsolja", "peeling", "ansiktsmask", "solskydd",
    # ── Dermatologisk hudvård (farmaceutiska märken, hög INCI-täckning) ──────
    "derm-kram", "derm-rengoring", "derm-serum",
    # ── Smink ────────────────────────────────────────────────────────────────
    "cc-bb", "foundation", "concealer", "contouring",
    "bronzer", "blush", "ogonskugga", "mascara",
]

# Nyckelordsmatchning mot sitemap-URLs.
# Lyko använder brand-first URLs: /sv/{brand}/{kategori}/{produkt}
# → vi kan INTE prefixmatcha på /sv/hudvard/ansikte/serum/ (de sidorna finns ej i sitemapen).
# Strategi: include = minst ett nyckelord måste finnas i URL,
#           exclude = inga av dessa får finnas (filtrerar bort hår/kropp/nagel etc.)
CATEGORY_FILTERS = {
    # ── Hudvård ──────────────────────────────────────────────────────────────
    "serum":            {"include": ["serum"],
                         "exclude": ["body-serum", "/kropp/", "/har/", "brynserum",
                                     "/nagel/", "shampoo", "harsera", "hair-serum"]},
    "dagkram":          {"include": ["dagkram"],
                         "exclude": ["/har/", "/kropp/", "handkram", "/nagel/"]},
    "nattkram":         {"include": ["nattkram"],
                         "exclude": ["/har/", "/kropp/", "handkram", "/nagel/"]},
    "ansiktsrengoring": {"include": ["ansiktsrengoring", "ansiktsreng",
                                     "face-wash", "rengoring"],
                         "exclude": ["/har/", "/kropp/", "/nagel/", "tandrengoring",
                                     "sminkrengoring"]},
    "toner":            {"include": ["ansiktstoner", "face-toner"],
                         "exclude": ["/har/", "/kropp/", "/nagel/"]},
    "ogon":             {"include": ["ogonkram", "ogon-kram", "ogonvard", "ogon-vard",
                                     "eye-cream", "eyecream"],
                         "exclude": ["ogonskugga", "eyeliner", "mascara",
                                     "ogon-liner", "bryn", "fransar"]},
    "ansiktsolja":      {"include": ["ansiktsolja", "face-oil", "ansikts-olja"],
                         "exclude": ["/har/", "/kropp/", "/nagel/"]},
    "peeling":          {"include": ["ansiktspeeling", "face-peeling", "ansikts-peeling",
                                     "ansiktsexfoli", "face-exfoli"],
                         "exclude": ["/har/", "/kropp/", "/nagel/"]},
    "ansiktsmask":      {"include": ["ansiktsmask", "face-mask", "ansikts-mask"],
                         "exclude": ["/har/", "/kropp/", "/nagel/"]},
    "solskydd":         {"include": ["solskydd", "sun-protection", "spf-ansikt",
                                     "ansikts-sol"],
                         "exclude": ["/har/", "/nagel/"]},
    # ── Dermatologisk hudvård ─────────────────────────────────────────────────
    # Farmaceutiska märken: La Roche-Posay, CeraVe, ACO, Eucerin, Avène, Bioderma...
    # Lyko samlar dem under /sv/hudvard/dermatologisk-hudvard/ — men produkt-URLs
    # följer brand-first-mönstret. Vi filtrerar på kända brand-slugs.
    "derm-kram":        {"include": ["la-roche-posay", "cerave", "eucerin",
                                     "avene", "bioderma", "vichy", "uriage",
                                     "svr", "ducray", "aco-"],
                         "exclude": ["/har/", "/kropp/", "/nagel/", "shampoo",
                                     "dusch", "balsam"]},
    "derm-rengoring":   {"include": ["la-roche-posay", "cerave", "eucerin",
                                     "avene", "bioderma", "vichy", "uriage",
                                     "svr", "ducray", "aco-"],
                         "exclude": ["/har/", "/nagel/", "shampoo", "balsam",
                                     "dagkram", "nattkram", "serum"]},
    "derm-serum":       {"include": ["la-roche-posay", "cerave", "eucerin",
                                     "avene", "bioderma", "vichy", "uriage",
                                     "svr", "ducray", "aco-"],
                         "exclude": ["/har/", "/nagel/", "shampoo", "balsam",
                                     "dagkram", "nattkram", "rengoring"]},
    # ── Smink ────────────────────────────────────────────────────────────────
    "cc-bb":            {"include": ["bb-cream", "cc-cream", "bb-kram"],
                         "exclude": []},
    "foundation":       {"include": ["foundation"],
                         "exclude": []},
    "concealer":        {"include": ["concealer"],
                         "exclude": []},
    "contouring":       {"include": ["contouring", "contour"],
                         "exclude": []},
    "bronzer":          {"include": ["bronzer"],
                         "exclude": []},
    "blush":            {"include": ["blush"],
                         "exclude": []},
    "ogonskugga":       {"include": ["ogonskugga", "ogon-skugga", "eyeshadow"],
                         "exclude": []},
    "mascara":          {"include": ["mascara"],
                         "exclude": []},
}

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

# JS för att extrahera produktdata — MÅSTE vara raw-sträng (backslashes i regex)
JS_EXTRACT = r"""
() => {
    var scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    var ld = scripts.map(function(s) {
        try { return JSON.parse(s.textContent); } catch(e) { return {}; }
    });
    var prod = ld.find(function(d) { return d['@type'] === 'Product'; }) || {};
    var offers = prod.offers || {};
    var offer = Array.isArray(offers) ? offers[0] : offers;

    var h1 = document.querySelector('h1');
    var name = prod.name || (h1 ? h1.innerText.trim() : null);
    var brand = (prod.brand && prod.brand.name) || null;
    var price = (offer && offer.price) ? String(offer.price) : null;
    var gtin = prod.gtin13 || prod.gtin || prod.gtin8 || null;

    var allLd = ld.map(function(d) { return JSON.stringify(d); }).join(' ');
    var eanM = allLd.match(/\b(\d{13})\b/);
    var ean = gtin || (eanM ? eanM[1] : null);

    var imgMeta = document.querySelector('meta[property="og:image"]');
    var image = (imgMeta && imgMeta.getAttribute('content')) || null;
    if (!image && prod.image) { image = typeof prod.image === 'string' ? prod.image : null; }

    // Strict INCI validator. The old version just picked the element with the
    // most commas + one ingredient word, which on Lyko grabbed customer reviews
    // and promo banners. We now REJECT anything that looks like prose/promo and
    // require the text to be structurally a list of ingredient-like tokens.
    // Result: we store a clean INCI list or NOTHING (a missing list is honest
    // and can be enriched via OBF/EAN; a wrong list poisons every analysis).
    var PROSE = /(inlägg|betyg|recension|skapades|\bvecka\b|\bmånad|\bår\b|rabatt|hoppa|pris:|medlemspris|du får|poäng|kundvagn|användarbild|om produkten|variant:|tittar ocks|utvalda brands|erbjudande|kampanj|spara \d|frakt|leverans|verifierad|lägg i)/i;
    var INCI_WORDS = /aqua|water|glycerin|parfum|fragrance|sodium|niacinamide|hyaluronate|panthenol|tocopherol|alcohol|acid|butyrospermum|cetearyl|propanediol|glycol|extract|\boil\b|butter|citrate|benzoate|phenoxyethanol/i;
    var SV_STOP = /\b(och|för|med|som|den|det|att|inte|är|jag|har|men|kan|till|från|eller|hur|när|mycket)\b/i;

    function tokenizeInci(t) {
        var norm = t.replace(/[•·∙●▪‣・･|]/g, ',').replace(/\s+-\s+/g, ',').replace(/\n+/g, ',');
        return norm.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    }
    function inciScore(t) {
        if (!t || t.length < 30 || t.length > 2000) return 0;
        if (PROSE.test(t)) return 0;                 // reject reviews / promo / nav
        if (!INCI_WORDS.test(t)) return 0;           // must contain real INCI words
        var toks = tokenizeInci(t);
        if (toks.length < 5) return 0;               // an ingredient list has many items
        var good = 0;
        for (var k = 0; k < toks.length; k++) {
            var tk = toks[k];
            var words = tk.split(/\s+/).length;
            if (words <= 6 && !SV_STOP.test(tk) && !/[.!?]\s/.test(tk) && /[a-zA-Z]/.test(tk)) good++;
        }
        if (good / toks.length < 0.75) return 0;     // mostly ingredient-like tokens
        return good;                                  // higher = more complete list
    }

    // Prefer an explicit "Ingredienser/INCI" container; fall back to whole page,
    // but every candidate must pass the strict validator above.
    function collectInciCandidates() {
        var out = [];
        var labelled = document.querySelectorAll('[aria-label],[id],[class]');
        for (var i = 0; i < labelled.length; i++) {
            var el = labelled[i];
            var meta = ((el.getAttribute('aria-label') || '') + ' ' +
                        (el.getAttribute('id') || '') + ' ' +
                        (el.getAttribute('class') || ''));
            if (/ingrediens|inci/i.test(meta) && el.innerText) out.push(el.innerText.trim());
        }
        var elems = document.querySelectorAll('p, div, span, section, li, td');
        for (var j = 0; j < elems.length; j++) {
            out.push(elems[j].innerText ? elems[j].innerText.trim() : '');
        }
        return out;
    }
    var inci = null, best = 0;
    var cands = collectInciCandidates();
    for (var i = 0; i < cands.length; i++) {
        var s = inciScore(cands[i]);
        if (s > best) { best = s; inci = cands[i]; }
    }

    return JSON.stringify({name: name, brand: brand, price: price,
                           ean: ean, image: image, inci: inci});
}
"""


# ── Supabase ──────────────────────────────────────────────────────────────────

def sb_upsert(table, rows):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(rows).encode()
    req = urllib.request.Request(url, data=payload, method="POST", headers={
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status

def sb_exists(source_url):
    enc = urllib.parse.quote(source_url, safe="")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/scraped_products?select=id&source_url=eq.{enc}&limit=1",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return len(json.loads(r.read())) > 0


# ── Playwright-helpers ────────────────────────────────────────────────────────

def make_browser(pw):
    """Starta en headless Chromium-instans med anti-bot-inställningar."""
    browser = pw.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled",
              "--disable-dev-shm-usage", "--disable-web-security"],
    )
    ctx = browser.new_context(
        user_agent=UA, locale="sv-SE",
        viewport={"width": 1280, "height": 900},
    )
    ctx.add_init_script(
        "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
    )
    return browser, ctx

def dismiss_cookies(page):
    for txt in ["Acceptera alla", "Godkänn alla", "Acceptera", "OK"]:
        try:
            page.locator(f"button:has-text('{txt}')").first.click(timeout=1500)
            page.wait_for_timeout(400)
            return
        except Exception:
            pass


# ── URL-discovery via Lyko sitemap (snabb, pålitlig, ingen browser) ──────────

# Fil-cache så att alla 8 sitemaps bara laddas EN gång per session
_SITEMAP_CACHE_FILE = os.path.expanduser("~/harvest/lyko_sitemap_cache.txt")
_SITEMAP_MAX_AGE_H  = 12   # Ladda om efter 12 timmar

def _sitemap_urls_fresh():
    """True om cache-filen finns och är < _SITEMAP_MAX_AGE_H gammal."""
    if not os.path.exists(_SITEMAP_CACHE_FILE):
        return False
    age_h = (time.time() - os.path.getmtime(_SITEMAP_CACHE_FILE)) / 3600
    return age_h < _SITEMAP_MAX_AGE_H

def load_sitemap_urls():
    """
    Laddar alla svenska Lyko-produkt-URLs från sitemap.
    Cachear resultatet i ~/harvest/lyko_sitemap_cache.txt (max 12h gammal).
    """
    if _sitemap_urls_fresh():
        with open(_SITEMAP_CACHE_FILE, encoding="utf-8") as f:
            urls = [l.strip() for l in f if l.strip()]
        print(f"  (Sitemap-cache: {len(urls)} URLs, < {_SITEMAP_MAX_AGE_H}h gammal)", flush=True)
        return urls

    print("  Laddar sitemaps från Lyko (8 filer)...", flush=True)
    loc_re = re.compile(r"<loc>(https://lyko\.com/sv/[^<]+)</loc>")
    all_urls = []

    for i in range(1, 9):
        sitemap_url = f"https://lyko.com/ext/sitemaps/sitemap-sv-{i}.xml"
        try:
            req = urllib.request.Request(sitemap_url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                xml = r.read().decode("utf-8", errors="replace")
            found = loc_re.findall(xml)
            all_urls.extend(found)
            print(f"    sitemap-sv-{i}.xml: {len(found)} URLs", flush=True)
        except Exception as e:
            print(f"  ! sitemap-sv-{i}.xml: {e}", file=sys.stderr)
        time.sleep(0.3)

    # Spara cache
    with open(_SITEMAP_CACHE_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(all_urls))
    print(f"  → {len(all_urls)} URLs totalt (sparat i cache)", flush=True)
    return all_urls


def collect_product_urls(category, max_products=500, pw=None):
    """
    Sitemap-baserad URL-discovery — snabb, pålitlig, ingen browser.
    Lyko använder brand-first URLs (/sv/{brand}/…/{produkt}), så vi
    nyckelordsmatchningsfiltrerar istället för att prefixmatcha kategori-sökvägar.
    pw-parametern behålls för kompatibilitet men används ej.
    """
    filters = CATEGORY_FILTERS.get(category)
    if filters is None:
        print(f"  ! Okänd kategori '{category}'. Giltiga: {', '.join(CATEGORY_FILTERS)}", file=sys.stderr)
        return []

    includes = filters["include"]
    excludes = filters["exclude"]

    all_urls = load_sitemap_urls()

    matching = [
        u for u in all_urls
        if any(kw in u for kw in includes)
        and not any(kw in u for kw in excludes)
    ]

    print(f"  → {len(matching)} produkter i kategori '{category}' (sitemap)", flush=True)
    return matching[:max_products]


# ── Scrapa produktsida (återanvänder browser-kontext för effektivitet) ─────────

def scrape_lyko_product(url, ctx, category=None):
    """
    Scrapar en Lyko-produktsida.
    ctx = Playwright BrowserContext (återanvänd från main — startar INTE ny browser).
    """
    page = ctx.new_page()
    data = None
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=35000)
        page.wait_for_timeout(1800)
        dismiss_cookies(page)

        # Klicka "Ingredienser"-fliken
        inci_clicked = False
        for sel in [
            "a:has-text('Ingredienser')",
            "button:has-text('Ingredienser')",
            "[role='tab']:has-text('Ingredienser')",
            "span:has-text('Ingredienser')",
            "li:has-text('Ingredienser')",
            "text=Ingredienser",
        ]:
            try:
                loc = page.locator(sel)
                if loc.count() > 0:
                    loc.first.scroll_into_view_if_needed(timeout=2000)
                    loc.first.click(timeout=3000)
                    page.wait_for_timeout(900)
                    inci_clicked = True
                    break
            except Exception:
                pass

        if inci_clicked:
            page.wait_for_timeout(400)

        raw = page.evaluate(JS_EXTRACT)
        if raw:
            data = json.loads(raw)

    except Exception as e:
        print(f"    ! Fel: {e}", file=sys.stderr)
    finally:
        page.close()

    if not data or not data.get("name"):
        return None

    has_inci = bool(data.get("inci"))
    has_ean  = bool(data.get("ean"))
    print(f"    {data['name'][:55]} | EAN:{'✅' if has_ean else '–'} INCI:{'✅' if has_inci else '–'}",
          flush=True)

    return {
        "source_store":    "lyko",
        "source_url":      url,
        "brand":           data.get("brand"),
        "product_name":    data.get("name"),
        "category":        category,
        "price":           data.get("price"),
        "currency":        "SEK",
        "quantity":        None,
        "ingredients_raw": data.get("inci"),
        "barcode":         data.get("ean"),
        "image_url":       data.get("image"),
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Skrapa Lyko-produkter till Supabase")
    p.add_argument("--category", default="serum",
                   help=f"Val: {', '.join(CATEGORIES)}. Default: serum")
    p.add_argument("--limit", type=int, default=200,
                   help="Max antal produkter att spara. Default: 100")
    p.add_argument("--delay", type=float, default=2.0,
                   help="Sekunder mellan produkter. Default: 2.0")
    args = p.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Sätt SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.")
        sys.exit(1)
    if args.category not in CATEGORIES:
        print(f"Okänd kategori. Val: {', '.join(CATEGORIES)}")
        sys.exit(1)

    print(f"=== Lyko-skörd: {args.category} | limit={args.limit} | delay={args.delay}s ===\n")

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:

        # ── Steg 1: Samla URLs via sitemap (ingen browser) ────────────────────
        print("Steg 1: Samlar produkt-URLs (sitemap)...")
        candidates = collect_product_urls(args.category, max_products=args.limit * 5, pw=pw)
        print(f"→ {len(candidates)} URL-kandidater\n")

        # ── Steg 2: Filtrera bort redan skrapade ─────────────────────────────
        print("Filtrerar bort redan skrapade URLs...", end=" ", flush=True)
        to_scrape = [u for u in candidates if not sb_exists(u)]
        print(f"{len(to_scrape)} kvar")
        to_scrape = to_scrape[:args.limit]
        print(f"Skrapar {len(to_scrape)} produkter.\n")

        if not to_scrape:
            print("Inget att göra.")
            return

        # ── Steg 3: Skrapa produkter med återanvänd browser-kontext ──────────
        browser, ctx = make_browser(pw)
        stored = failed = 0

        try:
            for i, url in enumerate(to_scrape, 1):
                print(f"[{i}/{len(to_scrape)}] {url}", flush=True)
                row = scrape_lyko_product(url, ctx, category=args.category)
                if not row:
                    print("    ✗ Ingen data", flush=True)
                    failed += 1
                else:
                    try:
                        sb_upsert("scraped_products", [row])
                        stored += 1
                    except Exception as e:
                        print(f"    ! Supabase-fel: {e}", file=sys.stderr)
                        failed += 1
                time.sleep(args.delay)
        finally:
            browser.close()

    print(f"\n── Klart ──")
    print(f"Sparade: {stored} | Missade: {failed} | Totalt: {len(to_scrape)}")


if __name__ == "__main__":
    main()
