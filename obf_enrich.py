#!/usr/bin/env python3
"""
obf_enrich.py — berikar scraped_products med INCI från Open Beauty Facts.

Hämtar EAN-koder från Supabase staging där ingredients_raw saknas,
slår upp varje EAN mot OBF API (gratis, ingen nyckel krävs),
och uppdaterar ingredients_raw i staging.

KÖR PÅ STINA:
    scp ~/PiasVentures/chimiq-code/obf_enrich.py ai_stina@Pias-Mac-mini.local:~/harvest/
    ssh ai_stina@Pias-Mac-mini.local
    cd ~/harvest && source ~/.zprofile && python3 obf_enrich.py

KRÄVER: SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
OBF_API = "https://world.openbeautyfacts.org/api/v2/product/{ean}.json"
DELAY = 1.0  # sekunder mellan OBF-anrop (schysst mot deras server)

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Sätt SUPABASE_URL och SUPABASE_SERVICE_KEY i miljön.")
    sys.exit(1)


def supabase_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def supabase_patch(path, row_id, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}?id=eq.{row_id}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


def obf_lookup(ean):
    """Slår upp EAN mot Open Beauty Facts. Returnerar INCI-sträng eller None."""
    url = OBF_API.format(ean=ean)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Chimiq/1.0 (pia@seafari.se)"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        if data.get("status") != 1:
            return None
        prod = data.get("product", {})
        # Föredra ingredients_text_sv, annars ingredients_text
        inci = (
            prod.get("ingredients_text_sv")
            or prod.get("ingredients_text")
            or prod.get("ingredients_text_en")
        )
        return inci.strip() if inci and inci.strip() else None
    except Exception as e:
        print(f"    OBF-fel för {ean}: {e}", file=sys.stderr)
        return None


def main():
    print("Hämtar staging-rader utan INCI...")
    # Hämta id + barcode för rader som saknar ingredients_raw
    rows = supabase_get(
        "scraped_products",
        "?select=id,barcode,product_name"
        "&ingredients_raw=is.null"
        "&barcode=not.is.null"
        "&order=scraped_at.asc"
        "&limit=500"
    )
    # Filtrera bort None-barcodes och tomma strängar
    rows = [r for r in rows if r.get("barcode") and r["barcode"].strip()]
    print(f"Hittade {len(rows)} rader med EAN men utan INCI.\n")

    found = 0
    not_found = 0

    for i, row in enumerate(rows, 1):
        ean = row["barcode"].strip()
        name = row.get("product_name", "?")
        print(f"[{i}/{len(rows)}] {ean}  {name[:50]}", end="  ")

        inci = obf_lookup(ean)
        if inci:
            supabase_patch("scraped_products", row["id"], {"ingredients_raw": inci})
            print(f"✅ ({len(inci)} tecken)")
            found += 1
        else:
            print("– ej funnen i OBF")
            not_found += 1

        time.sleep(DELAY)

    print(f"\n── Klart ──")
    print(f"INCI hittad:     {found}")
    print(f"Ej i OBF:        {not_found}")
    print(f"Totalt behandlat: {len(rows)}")


if __name__ == "__main__":
    main()
