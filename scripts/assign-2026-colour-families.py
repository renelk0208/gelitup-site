"""
assign-2026-colour-families.py
──────────────────────────────
Reads products_export_1.csv, resolves colour-family for the 2026 Cloud Dancer
(GIUP-2600…2610) and Summer Vibes (GIUP-2611…2615) solid-gel shades, then
merges the results into:

  public/gelitup-content/solid-gel-colour-families.json

Format:  { "GIUP-2601": "NUDE", "GIUP-2602": "NUDE", … }
"""

import csv
import json
import os
import re
import sys

# ── Paths (relative to repo root) ────────────────────────────────────────────
CSV_PATH      = "products_export_1.csv"
OUTPUT_JSON   = "public/gelitup-content/solid-gel-colour-families.json"

# ── SKUs we care about ────────────────────────────────────────────────────────
TARGET_SKUS = {f"GIUP-{n}" for n in range(2600, 2616)}

# ── Extended colour-family resolver (mirrors resolveColorFamilyKey in App.jsx)
# ─  Additional keywords handle the poetic shade names in Cloud Dancer / Summer Vibes

def resolve_color_family(title: str) -> str:
    token = re.sub(r"[^A-Z0-9\s]", " ", title.upper())
    token = re.sub(r"\s+", " ", token).strip()

    # RED family
    if re.search(r"\b(RED|CHERRY|CRIMSON|RUBY|SCARLET|ROUGE|WINE|BURGUNDY|BORDEAUX|MERLOT)\b", token):
        return "RED"
    # PINK family  (ROSY added for "Rosy Pop")
    if re.search(r"\b(PINK|BLUSH|FUCHSIA|MAGENTA|ROSE|PINKY|BARBIE|ROSY)\b", token):
        return "PINK"
    # NUDE / neutral family  (VANILLA, BUTTER, FOG, MIST, WHISPER added)
    if re.search(r"\b(NUDE|BEIGE|IVORY|ALMOND|SAND|MILKY|NATURAL|LATTE|CREAM|PORCELAIN|SKIN|COCO"
                  r"|VANILLA|BUTTER|FOG|MIST|WHISPER)\b", token):
        return "NUDE"
    # ORANGE family
    if re.search(r"\b(ORANGE|CORAL|PEACH|APRICOT|TANGERINE|TERRACOTTA|SUNRISE)\b", token):
        return "ORANGE"
    # YELLOW family
    if re.search(r"\b(YELLOW|LEMON|SUN|MUSTARD|GOLDEN)\b", token):
        return "YELLOW"
    # GREEN family
    if re.search(r"\b(GREEN|MINT|OLIVE|PISTACHIO|EMERALD|SAGE|LIME|FOREST)\b", token):
        return "GREEN"
    # BLUE family  (COOL, OCEAN added for "Cool Atmosphere")
    if re.search(r"\b(BLUE|NAVY|COBALT|AQUA|SKY|OCEAN|TURQUOISE|AZURE|DENIM|COOL)\b", token):
        return "BLUE"
    # PURPLE family  (IRIS, TWILIGHT added)
    if re.search(r"\b(PURPLE|LILAC|VIOLET|LAVENDER|PLUM|MAUVE|AMETHYST|IRIS|TWILIGHT)\b", token):
        return "PURPLE"
    # BROWN family
    if re.search(r"\b(BROWN|CHOC|MOCHA|CARAMEL|COFFEE|TAUPE|TOFFEE|BRONZE)\b", token):
        return "BROWN"
    # GREY family  (CLOUD, ALTITUDE, ATMOSPHERE, AIR, SILENCE, HAZE added)
    if re.search(r"\b(GREY|GRAY|SILVER|SLATE|SMOKE|ASH|GRAPHITE|CHARCOAL"
                  r"|CLOUD|ALTITUDE|ATMOSPHERE|AIR|HAZE|SILENCE|SILENT)\b", token):
        return "GREY"
    # BLACK / WHITE
    if re.search(r"\b(BLACK)\b", token):
        return "BLACK"
    if re.search(r"\b(WHITE)\b", token):
        return "WHITE"

    return "OTHER"


# ── Step 1: Read CSV → build filename → (title, resolved family) ──────────────

def extract_giup_sku(image_src: str) -> str | None:
    """Return 'GIUP-NNNN' if the image URL contains a recognised SKU."""
    m = re.search(r"(GIUP-\d{4})\.(webp|jpg|jpeg|png)", image_src, re.I)
    return m.group(1).upper() if m else None


resolved: dict[str, dict] = {}   # { "GIUP-2601": {"family": "NUDE", "title": "2601 Vanilla Fog -HTF"} }

with open(CSV_PATH, encoding="utf-8", newline="") as fh:
    reader = csv.DictReader(fh)
    for row in reader:
        sku = extract_giup_sku(row.get("Image Src", ""))
        if sku not in TARGET_SKUS:
            continue
        title  = row.get("Title", "").strip()
        family = resolve_color_family(title)
        resolved[sku] = {"family": family, "title": title}

# ── Step 2: Load existing JSON, merge, and save ──────────────────────────────

existing: dict[str, str] = {}
if os.path.exists(OUTPUT_JSON):
    with open(OUTPUT_JSON, encoding="utf-8") as fh:
        existing = json.load(fh)

print("\n── 2026 Cloud Dancer & Summer Vibes colour-family assignment ──")
print(f"{'SKU':<14}  {'Resolved':<10}  Title")
print("-" * 60)

added   = 0
skipped = 0

for sku in sorted(resolved):
    entry  = resolved[sku]
    family = entry["family"]
    title  = entry["title"]

    if sku in existing:
        status = "kept   "
        skipped += 1
    else:
        existing[sku] = family
        status = "ADDED  " if family != "OTHER" else "OTHER ⚠"
        added += 1

    marker = "⚠ " if family == "OTHER" else "  "
    print(f"{sku:<14}  {family:<10}  {title}  [{status}]{marker}")

# Also note any TARGET_SKUS not found in CSV
missing = TARGET_SKUS - set(resolved.keys())
if missing:
    print("\n── Not found in CSV (no Shopify product yet) ──")
    for sku in sorted(missing):
        in_json = existing.get(sku)
        print(f"  {sku}  →  {'already in JSON: ' + in_json if in_json else 'SKIPPED (no data)'}")

print(f"\nAdded {added} new entries, kept {skipped} existing.")

with open(OUTPUT_JSON, "w", encoding="utf-8") as fh:
    json.dump(existing, fh, indent=2, ensure_ascii=False)
    fh.write("\n")

print(f"Saved → {OUTPUT_JSON}  (total {len(existing)} entries)\n")

# ── Step 3: Warn about any OTHER assignments ──────────────────────────────────
others = [sku for sku, entry in resolved.items() if entry["family"] == "OTHER"]
if others:
    print("⚠  The following shades resolved to OTHER — review manually:")
    for sku in others:
        print(f"   {sku}: {resolved[sku]['title']}")
    print()
    sys.exit(0)   # exit cleanly but signal review needed

print("✓ All shades resolved successfully.")
