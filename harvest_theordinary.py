#!/usr/bin/env python3
"""
harvest_theordinary.py — skrapar The Ordinary (theordinary.com, Salesforce
Commerce Cloud) för ren INCI. Märket saknar EAN på sajten, så raderna stagas
UTAN streckkod; promotera dem search-only med platshållar-barcode så att
användare kan komplettera EAN genom att skanna flaskan (befintligt flöde).

Produkt-URLs hämtas från landssitemapen (default sv: sitemap-en_SE.xml). INCI
ligger i DOM:en bakom "view all ingredients" — Playwright expanderar och läser.

KÖR PÅ STINA (Playwright krävs):
    scp ~/PiasVentures/chimiq-code/harvest_theordinary.py ai_stina@Pias-Mac-mini.local:~/harvest/
    ssh ai_stina@Pias-Mac-mini.local
    cd ~/harvest && source ~/.zprofile

    # Testa 5:
    caffeinate -i python3 harvest_theordinary.py --limit 5
    # Hela katalogen:
    caffeinate -i python3 harvest_theordinary.py --limit 400

KRÄVER: SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön. Playwright + Chromium.
"""

import os, sys, re, time, json, argparse, urllib.request, urllib.parse

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

SITEMAP_INDEX = "https://theordinary.com/sitemap_index.xml"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

# SFCC-produktsidor slutar på "-<id>.html", t.ex.
# /en-se/hyaluronic-acid-2-b5-serum-with-ceramides-100637.html
PRODUCT_RE = re.compile(r"-\d+\.html$", re.I)


def sb_upsert(table, rows):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(rows).encode(), method="POST", headers={
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
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return len(json.loads(r.read())) > 0


def _fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def load_product_urls(locale_tag, max_products):
    """Hämtar produkt-URLs från landssitemapen (t.ex. sitemap-en_SE.xml).
    Faller tillbaka på sitemap_0.xml om landsfilen saknas."""
    loc_re = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>")
    try:
        index_xml = _fetch(SITEMAP_INDEX)
    except Exception as e:
        print(f"  ! Kunde inte hämta sitemap-index: {e}", file=sys.stderr)
        return []

    sub = loc_re.findall(index_xml)
    target = [u for u in sub if locale_tag.lower() in u.lower()]
    if not target:
        target = [u for u in sub if u.endswith("sitemap_0.xml")] or sub[:1]
    print(f"  Använder sitemap: {', '.join(s.split('/')[-1] for s in target)}", flush=True)

    urls = []
    seen = set()
    for sm in target:
        try:
            xml = _fetch(sm)
        except Exception as e:
            print(f"  ! {sm}: {e}", file=sys.stderr)
            continue
        for u in loc_re.findall(xml):
            if PRODUCT_RE.search(u) and u not in seen:
                seen.add(u)
                urls.append(u)
        if len(urls) >= max_products:
            break
    print(f"  → {len(urls)} produkt-URLs i sitemap", flush=True)
    return urls[:max_products]


JS_EXTRACT = r"""
() => {
    // Produktnamn: JSON-LD Product → <title> (utan "| The Ordinary") → h1.
    // Använd INTE og:title — den är varumärkets slogan ("Clinical Formulations…").
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(s => { try { return JSON.parse(s.textContent); } catch(e) { return {}; } });
    const flat = []; ld.forEach(d => { if (d && d['@graph']) flat.push.apply(flat, d['@graph']); else flat.push(d); });
    const prod = flat.find(d => d && (d['@type'] === 'Product' || (Array.isArray(d['@type']) && d['@type'].indexOf('Product') !== -1)));
    let name = (prod && prod.name) ? String(prod.name).trim() : null;
    if (!name) {
        const tt = (document.title || '').split('|')[0].trim();
        if (tt && !/clinical formulations|^the ordinary$/i.test(tt)) name = tt;
    }
    if (!name) { const h1 = document.querySelector('h1'); if (h1) name = h1.innerText.trim(); }
    if (name) name = name.replace(/\s*[|–-]\s*The Ordinary.*$/i, '').trim();
    if (name && /clinical formulations/i.test(name)) name = null;

    const ogi = document.querySelector('meta[property="og:image"]');
    const image = ogi ? ogi.getAttribute('content') : null;

    // Strikt INCI-validator (samma som övriga skrapor): ren lista eller inget.
    const PROSE = /(key ingredient|how to use|what it|directions|caution|review|rating|add to|price|usd|sek|view all|description|benefits|suited to|free shipping|klarna)/i;
    const INCI_WORDS = /aqua|water|glycerin|parfum|fragrance|sodium|niacinamide|hyaluron|panthenol|tocopherol|alcohol|acid|glycol|extract|dimethicone|squalane/i;
    function tok(t){ return t.replace(/[•·∙●▪‣・･|]/g,',').replace(/\s+-\s+/g,',').replace(/\n+/g,',').split(',').map(x=>x.trim()).filter(Boolean); }
    function inciScore(t){
        if(!t || t.length<30 || t.length>3000) return 0;
        if(PROSE.test(t)) return 0;
        if(!INCI_WORDS.test(t)) return 0;
        const toks = tok(t);
        if(toks.length<5) return 0;
        let good=0;
        toks.forEach(tk=>{ if(tk.split(/\s+/).length<=6 && !/[.!?]\s/.test(tk) && /[a-zA-Z]/.test(tk)) good++; });
        if(good/toks.length<0.75) return 0;
        return good;
    }
    let inci=null, best=0;
    document.querySelectorAll('p,div,span,li,td,section').forEach(el=>{
        const t=(el.innerText||'').trim();
        const s=inciScore(t);
        if(s>best){best=s; inci=t;}
    });
    return JSON.stringify({name, image, inci});
}
"""


def make_browser(pw):
    browser = pw.chromium.launch(headless=True, args=[
        "--no-sandbox", "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage"])
    ctx = browser.new_context(user_agent=UA, locale="en-SE",
                              viewport={"width": 1280, "height": 900})
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
    return browser, ctx


def dismiss_cookies(page):
    for txt in ["Accept All", "Accept all", "Accept", "Godkänn", "Acceptera", "OK", "I agree"]:
        try:
            page.locator(f"button:has-text('{txt}')").first.click(timeout=1500)
            page.wait_for_timeout(300)
            return
        except Exception:
            pass


def expand_ingredients(page):
    for sel in [
        "text=/view all ingredients/i", "text=/all ingredients/i",
        "text=/full ingredients/i", "button:has-text('Ingredients')",
        "a:has-text('Ingredients')", "[role='tab']:has-text('Ingredients')",
        "summary:has-text('Ingredients')",
    ]:
        try:
            loc = page.locator(sel)
            if loc.count() > 0:
                loc.first.scroll_into_view_if_needed(timeout=1500)
                loc.first.click(timeout=2000)
                page.wait_for_timeout(500)
        except Exception:
            pass


def scrape_product(url, ctx):
    page = ctx.new_page()
    data = None
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=35000)
        page.wait_for_timeout(1500)
        dismiss_cookies(page)
        expand_ingredients(page)
        page.wait_for_timeout(400)
        raw = page.evaluate(JS_EXTRACT)
        if raw:
            data = json.loads(raw)
    except Exception as e:
        print(f"    ! Fel: {e}", file=sys.stderr)
    finally:
        page.close()

    if not data:
        return None
    inci = (data.get("inci") or "").strip() or None
    name = (data.get("name") or "").strip()
    if not name or "clinical formulations" in name.lower():
        # Härled namn från URL-slug: .../glycolic-acid-7-exfoliating-toner-100418.html
        m = re.search(r"/([^/]+?)-\d+\.html", url)
        if m:
            name = m.group(1).replace("-", " ").strip().title()
    if not name:
        return None
    if not name.lower().startswith("the ordinary"):
        name = f"The Ordinary {name}"
    print(f"    {name[:55]} | INCI:{'✅' if inci else '–'}", flush=True)
    return {
        "source_store":    "theordinary",
        "source_url":      url,
        "brand":           "The Ordinary",
        "product_name":    name,
        "category":        None,
        "price":           None,
        "currency":        "SEK",
        "quantity":        None,
        "ingredients_raw": inci,
        "barcode":         None,   # märket har ingen EAN på sajten — platshållare sätts vid promotering
        "image_url":       data.get("image"),
    }


def main():
    p = argparse.ArgumentParser(description="Skrapa The Ordinary till Supabase staging")
    p.add_argument("--locale", default="en_SE", help="Sitemap-locale, t.ex. en_SE. Default: en_SE")
    p.add_argument("--limit", type=int, default=400, help="Max antal produkter. Default: 400")
    p.add_argument("--delay", type=float, default=2.0, help="Sekunder mellan produkter. Default: 2.0")
    args = p.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Sätt SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.")
        sys.exit(1)

    print(f"=== The Ordinary-skörd: locale={args.locale} | limit={args.limit} ===\n")
    print("Steg 1: Samlar produkt-URLs (sitemap)...")
    candidates = load_product_urls(args.locale, args.limit * 2)

    print("Filtrerar bort redan skrapade...", end=" ", flush=True)
    to_scrape = [u for u in candidates if not sb_exists(u)][:args.limit]
    print(f"{len(to_scrape)} kvar\n")
    if not to_scrape:
        print("Inget att göra.")
        return

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser, ctx = make_browser(pw)
        stored = failed = no_inci = 0
        try:
            for i, url in enumerate(to_scrape, 1):
                print(f"[{i}/{len(to_scrape)}] {url}", flush=True)
                row = scrape_product(url, ctx)
                if not row:
                    print("    ✗ Ingen data", flush=True)
                    failed += 1
                    continue
                if not row.get("ingredients_raw"):
                    no_inci += 1
                try:
                    sb_upsert("scraped_products", [row])
                    stored += 1
                except Exception as e:
                    print(f"    ! Supabase: {e}", file=sys.stderr)
                    failed += 1
                time.sleep(args.delay)
        finally:
            browser.close()

    print(f"\n── Klart ──")
    print(f"Sparade: {stored} (varav {stored - no_inci} med INCI) | Utan INCI: {no_inci} | Missade: {failed}")
    print("Be Claude promotera de rena raderna (search-only, platshållar-barcode).")


if __name__ == "__main__":
    main()
