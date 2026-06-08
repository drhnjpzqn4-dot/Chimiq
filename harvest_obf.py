#!/usr/bin/env python3
"""
harvest_obf.py — hämtar HELA varumärken från Open Beauty Facts (OBF) per brand-tag.

Till skillnad från obf_enrich.py (som bara fyller INCI för rader som REDAN har en
EAN) hämtar detta script alla produkter för ett varumärke direkt från OBF — med
BÅDE streckkod OCH ingredienser. Perfekt för märken som saknar EAN hos butikerna,
t.ex. The Ordinary på Apotea.

Resultatet hamnar i `scraped_products` (staging, source_store='obf'); promotera
sedan till live `cached_products` med samma strikta INCI-filter som övriga källor.

KÖR PÅ STINA:
    scp ~/PiasVentures/chimiq-code/harvest_obf.py ai_stina@Pias-Mac-mini.local:~/harvest/
    ssh ai_stina@Pias-Mac-mini.local
    cd ~/harvest && source ~/.zprofile

    # Ett märke:
    python3 harvest_obf.py --brand the-ordinary

    # Flera märken i ett svep:
    python3 harvest_obf.py --brand the-ordinary --brand cerave --brand the-inkey-list

KRÄVER: SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.
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

# OBF v2 search — brand-facet, bara fälten vi behöver (snabbare/snällare).
OBF_SEARCH = (
    "https://world.openbeautyfacts.org/api/v2/search"
    "?brands_tags={brand}"
    "&fields=code,product_name,brands,ingredients_text,ingredients_text_sv,"
    "ingredients_text_en,image_url"
    "&page_size=100&page={page}"
)
UA = "Chimiq/1.0 (pia@seafari.se) brand catalogue import"
DELAY = 1.0  # sekunder mellan OBF-sidor (schysst mot deras server)

# Lätt INCI-rimlighetskoll (OBF-data är oftast ren, men inte alltid).
INCI_WORDS = re.compile(
    r"aqua|water|glycerin|parfum|fragrance|sodium|niacinamide|hyaluron|panthenol|"
    r"tocopherol|alcohol|acid|glycol|extract|dimethicone|squalane|retinol",
    re.I,
)


def _sb_request(method, path, params="", data=None, extra_headers=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    payload = json.dumps(data).encode() if data is not None else None
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=payload, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read()
        return r.status, (json.loads(body) if body else None)


def sb_exists(source_url):
    enc = urllib.parse.quote(source_url, safe="")
    _, rows = _sb_request("GET", "scraped_products",
                          f"?select=id&source_url=eq.{enc}&limit=1")
    return bool(rows)


def sb_insert(rows):
    return _sb_request("POST", "scraped_products", data=rows,
                       extra_headers={"Prefer": "return=minimal"})[0]


def is_bad_name(name):
    """OBF är crowd-sourcad — ibland är produktnamnet en URL eller skräp."""
    if not name or len(name.strip()) < 3:
        return True
    low = name.lower()
    if "http" in low or "www." in low or ".com" in low or "[" in name or "]" in name:
        return True
    if not re.search(r"[a-zA-Z]{3}", name):
        return True
    return False


def clean_inci(prod):
    inci = (prod.get("ingredients_text_sv")
            or prod.get("ingredients_text_en")
            or prod.get("ingredients_text")
            or "")
    inci = inci.strip()
    if len(inci) < 30 or len(inci) > 4000:
        return None
    if not INCI_WORDS.search(inci):
        return None
    return inci


def fetch_brand(brand):
    """Hämtar alla OBF-produkter för ett brand-tag. Returnerar lista av rader
    klara att skicka till scraped_products."""
    out = []
    page = 1
    while True:
        url = OBF_SEARCH.format(brand=urllib.parse.quote(brand), page=page)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=25) as r:
                data = json.loads(r.read())
        except Exception as e:
            print(f"  ! OBF-fel sida {page}: {e}", file=sys.stderr)
            break

        products = data.get("products", []) or []
        if not products:
            break

        kept = 0
        for prod in products:
            code = str(prod.get("code") or "").strip()
            if not re.fullmatch(r"\d{8,14}", code):
                continue
            inci = clean_inci(prod)
            if not inci:
                continue
            name = (prod.get("product_name") or "").strip() or None
            if is_bad_name(name):
                continue
            brand_name = (prod.get("brands") or "").split(",")[0].strip() or None
            image = (prod.get("image_url") or "").strip() or None
            source_url = f"https://world.openbeautyfacts.org/product/{code}"
            out.append({
                "source_store":    "obf",
                "source_url":      source_url,
                "brand":           brand_name,
                "product_name":    name,
                "category":        None,
                "price":           None,
                "currency":        "SEK",
                "quantity":        None,
                "ingredients_raw": inci,
                "barcode":         code,
                "image_url":       image,
            })
            kept += 1

        print(f"  sida {page}: {len(products)} produkter, {kept} med EAN+INCI", flush=True)
        if len(products) < 100:
            break
        page += 1
        time.sleep(DELAY)

    return out


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Sätt SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.")
        sys.exit(1)

    p = argparse.ArgumentParser(description="Importera hela varumärken från Open Beauty Facts")
    p.add_argument("--brand", action="append", required=True,
                   help="OBF brand-tag, t.ex. the-ordinary. Kan upprepas.")
    args = p.parse_args()

    grand_total = 0
    for brand in args.brand:
        print(f"\n=== OBF-import: {brand} ===", flush=True)
        rows = fetch_brand(brand)
        # Deduplicera på barcode inom körningen (OBF kan ha samma produkt i flera länder)
        seen, deduped = set(), []
        for row in rows:
            if row["barcode"] in seen:
                continue
            seen.add(row["barcode"])
            deduped.append(row)

        stored = skipped = 0
        for row in deduped:
            if sb_exists(row["source_url"]):
                skipped += 1
                continue
            try:
                sb_insert([row])
                stored += 1
                print(f"    + {row['barcode']}  {(row['product_name'] or '')[:50]}", flush=True)
            except Exception as e:
                print(f"    ! Supabase-fel {row['barcode']}: {e}", file=sys.stderr)
        print(f"  → {brand}: {stored} nya, {skipped} fanns redan (av {len(deduped)} unika)", flush=True)
        grand_total += stored

    print(f"\n── Klart ── Totalt {grand_total} nya rader till scraped_products (source_store='obf').")
    print("Be Claude promotera de rena raderna till live cached_products.")


if __name__ == "__main__":
    main()
