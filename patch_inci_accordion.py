#!/usr/bin/env python3
"""
patch_inci_accordion.py — förbättrar Playwright-skraparen att klicka på
"Ingredienser"-accordion på kicks.se innan INCI-texten extraheras.

Bakgrund: kicks.se visar ingredienser i ett dolt accordion-avsnitt som måste
expanderas med ett klick — annars finns texten inte i DOM:en.

KÖR PÅ STINA:
    scp /Users/pia/PiasVentures/chimiq-code/patch_inci_accordion.py ai_stina@Pias-Mac-mini.local:~/harvest/
    ssh ai_stina@Pias-Mac-mini.local
    cd ~/harvest && python3 patch_inci_accordion.py
"""
import sys

path = "/Users/ai_stina/harvest/harvest.py"

OLD = '''\
            page.goto(url, wait_until="domcontentloaded", timeout=35000)
            page.wait_for_timeout(2500)  # låt JS hinna rendera
            raw = page.evaluate("(function(){" + js + "})()")'''

NEW = '''\
            page.goto(url, wait_until="domcontentloaded", timeout=35000)
            page.wait_for_timeout(1500)

            # ── Klicka på "Ingredienser"-accordion om den finns ──────────────
            # Kicks.se gömmer ingredienslistan i ett expanderbart avsnitt.
            # Prova flera möjliga selektorer (svenska + engelska).
            accordion_selectors = [
                "button:has-text('Ingredienser')",
                "button:has-text('Ingredients')",
                "[role=\'button\']:has-text('Ingredienser')",
                "h2:has-text('Ingredienser')",
                "h3:has-text('Ingredienser')",
                "summary:has-text('Ingredienser')",
                "[class*=\'accordion\']:has-text('Ingredienser')",
                "[class*=\'tab\']:has-text('Ingredienser')",
            ]
            clicked = False
            for sel in accordion_selectors:
                try:
                    loc = page.locator(sel)
                    if loc.count() > 0:
                        loc.first.click(timeout=2000)
                        page.wait_for_timeout(800)
                        clicked = True
                        break
                except Exception:
                    continue

            page.wait_for_timeout(800 if clicked else 1500)
            raw = page.evaluate("(function(){" + js + "})()")'''

with open(path) as f:
    content = f.read()

if OLD not in content:
    print("ERROR: Hittade inte rätt kodblock i harvest.py — kolla manuellt.")
    sys.exit(1)

content = content.replace(OLD, NEW)
with open(path, "w") as f:
    f.write(content)

print("✅ Accordion-patch applicerad!")
print()
print("Testa med:")
print("  cd ~/harvest && python3 harvest.py --store kicks --filter serum --limit 3 --no-ollama --delay 3")
