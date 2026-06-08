#!/usr/bin/env python3
"""
patch_playwright.py — ersätter scrape_product i harvest.py med en Playwright-variant.

Playwright kör riktig Chromium lokalt → kicks.se ser en vanlig människa.
Kostar ingenting, obegränsat antal körningar.

INSTALLERA FÖRST (en gång på Stina):
    pip install playwright --break-system-packages
    playwright install chromium

KLISTRA IN PÅ STINA via scp (från din Mac):
    scp ~/PiasVentures/chimiq-code/patch_playwright.py ai_stina@Pias-Mac-mini.local:~/harvest/

KÖR SEDAN på Stina:
    cd ~/harvest && python3 patch_playwright.py

BESLUT: SS-077 (nattlig lokal-AI-berikning + retailer-scraping)
"""

import sys

path = "/Users/ai_stina/harvest/harvest.py"

# ── Ny funktion ──────────────────────────────────────────────────────────────

NEW_FUNC = """\
def scrape_product(store, url):
    \"\"\"Playwright-variant — kör riktig Chromium lokalt, osynlig för kicks.se Cloudflare.
    Kräver: pip install playwright && playwright install chromium
    \"\"\"
    from playwright.sync_api import sync_playwright
    import json as _json

    js = (
        "const ld=Array.from(document.querySelectorAll('script')).filter("
        "function(s){return s.type==='application/ld+json';}).map("
        "function(s){try{return JSON.parse(s.textContent);}catch(e){return {};}});"
        "const prod=ld.find(function(d){return d['@type']==='Product';})||{};"
        "const offer=(prod.offers&&prod.offers[0])||prod.offers||{};"
        "const h1=document.querySelector('h1');"
        "const name=prod.name||(h1?h1.innerText.trim():null);"
        "const brand=(prod.brand&&prod.brand.name)||null;"
        "const price=offer.price||null;"
        "const allLd=ld.map(function(d){return JSON.stringify(d);}).join(' ');"
        "const ean=prod.gtin13||prod.gtin||(allLd.match(/\\\\b(\\\\d{13})\\\\b/)||[])[1]||null;"
        "const imgMeta=document.querySelector('meta[property=\\"og:image\\"]');"
        "const image=imgMeta?imgMeta.getAttribute('content'):(prod.image||null);"
        "function sc(t){if(!t)return 0;"
        "var c=(t.match(/,/g)||[]).length;"
        "var h=/\\\\b(aqua|water|glycerin|parfum|fragrance|alcohol|sodium)\\\\b/i.test(t);"
        "return(c>=4&&h)?c:0;}"
        "var inci=null,best=0;"
        "document.querySelectorAll('p,div,span,li').forEach(function(el){"
        "var t=(el.innerText||'').trim();"
        "if(t.length<20||t.length>4000)return;"
        "var s=sc(t);if(s>best){best=s;inci=t;}});"
        "return JSON.stringify({name:name,brand:brand,price:price,ean:ean,"
        "image:image,inci:inci});"
    )
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--window-size=1280,800",
                ],
            )
            ctx = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                locale="sv-SE",
                extra_http_headers={"Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8"},
            )
            # Dölj webdriver-flaggan (enklast möjliga stealth)
            ctx.add_init_script(
                "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
            )
            page = ctx.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=35000)
            page.wait_for_timeout(2500)  # låt JS hinna rendera
            raw = page.evaluate(js)
            browser.close()
            data = _json.loads(raw)
    except Exception as e:
        print(f"  ! scrape_product misslyckades for {url}: {e}", file=sys.stderr)
        return None

    if not data.get("name"):
        return None

    inci = data.get("inci")
    if not inci and data.get("ean"):
        inci = obf_ingredients(data["ean"])

    return {
        "source_store": store,
        "source_url": url,
        "brand": data.get("brand"),
        "product_name": data.get("name"),
        "category": None,
        "price": data.get("price"),
        "currency": "SEK",
        "quantity": None,
        "ingredients_raw": inci,
        "barcode": data.get("ean"),
        "image_url": data.get("image"),
    }

"""

# ── Patcher ──────────────────────────────────────────────────────────────────

with open(path) as f:
    lines = f.readlines()

# Hitta start och slut på scrape_product (utan hardkodade radnummer)
start = None
end = None
for i, line in enumerate(lines):
    if line.startswith("def scrape_product("):
        start = i
    elif start is not None and i > start and line.startswith("def ") and not line.startswith("def scrape_product("):
        end = i
        break

if start is None:
    print("ERROR: 'def scrape_product(' hittades inte i harvest.py!")
    sys.exit(1)
if end is None:
    end = len(lines)

print(f"Hittade scrape_product: rad {start + 1}–{end} ({end - start} rader)")
print(f"Ersätter med Playwright-version ({NEW_FUNC.count(chr(10))} rader)…")

new_lines = lines[:start] + [NEW_FUNC] + lines[end:]
with open(path, "w") as f:
    f.writelines(new_lines)

print("✅ Klart — harvest.py uppdaterad med Playwright-variant")
print()
print("Testa med:")
print("  cd ~/harvest && source ~/.zprofile && python3 harvest.py --store kicks --filter serum --limit 3 --no-ollama --delay 3")
