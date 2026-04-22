#!/usr/bin/env python3
"""
select-seasonal-pod.py
======================
Interactively select seasonal gel colours to build a Professional
distributor package pod.

Reads:  b2b-price-list.json   (source of all colours)
        package-pods.json      (existing pods, to avoid duplicates)

Writes: pod_seasonal_output.json  (ready to paste into package-pods.json)

Run from public/gelitup-content/:

    python select-seasonal-pod.py                   # interactive
    python select-seasonal-pod.py --auto 5          # 5 per category, no prompts
    python select-seasonal-pod.py --auto 5 --season AW2026
    python select-seasonal-pod.py --show-existing   # include pod_1/pod_2 colours too
    python select-seasonal-pod.py --list            # just list categories + counts

Then in App.jsx the 'Professional' tier reads from package-pods.json pod_seasonal.
"""

import argparse
import json
import re
import sys
from pathlib import Path

PRICE_LIST_FILE = Path("b2b-price-list.json")
PODS_FILE       = Path("package-pods.json")
OUTPUT_FILE     = Path("pod_seasonal_output.json")

# ── Colour vs. technical cutoff ─────────────────────────────────────────────
# Products with these words in the name are consumables/technical, never colours.
TECHNICAL_KEYWORDS = re.compile(
    r'top coat|base coat|base \d|superior base|superbond|builder gel|'
    r'brush on builder|3-in-1 builder|premium builder|crystal clear builder|'
    r'cool care|premium plus|shimmery builder|polygel|synthogel|syntholiquid|'
    r'multimix|cleanser|nail dehydrator|wipe off|satin matt|aurora flakes|'
    r'non wipe|shimmer top fairy',
    re.IGNORECASE
)

# SKUs whose price is this or below are classified as colour items
# (effect colours go up to €9.67)
MAX_COLOUR_PRICE = 9.70


# ── Category inference (first rule that matches wins) ───────────────────────
CATEGORY_RULES: list[tuple[str, re.Pattern]] = [
    # Named collections first (most specific)
    ('French',   re.compile(r'egalit|fraternit|garnet|almond glaze|perfect nude|glitter petal|ice drop|liberte|liberte', re.I)),
    ('By-The-Ocean', re.compile(r'by the ocean|BTO\d', re.I)),
    ('GIUP-1',   re.compile(r'^R\d{2}$', re.I)),           # R01-R40 series
    ('Neons',    re.compile(r'^N0\d\d$|neon|electric orange|shocking pink', re.I)),
    ('Metallics',re.compile(r'metallic|chrome|copper|bronze|rose gold foil|gold foil', re.I)),
    ('Glitter',  re.compile(r'glitter|sparkle|bling|sequin', re.I)),
    ('Flash',    re.compile(r'flashing star|2113[BSJRPGW]', re.I)),
    ('Cat-Eye',  re.compile(r'cat eye|GCE\d|VCE\d|DCE\d|RQCE\d', re.I)),
    ('Art',      re.compile(r'spider gel|foil gel adhesive|blooming gel|mattest matte|super glossy', re.I)),
    ('Whites',   re.compile(r'white|snow|ice ice|milkyway|crystal clear|ivory|bridal|cream', re.I)),
    ('Nudes',    re.compile(r'nude|skin|blush|cashmere|porcelain|she bangs|spun sugar|burberry|chanterel|naked|frappelicious', re.I)),
    ('Pinks',    re.compile(r'pink|candy|ballerina|petal|sweetheart|ballet|blushing bride|baby pink|sweet pea|pinky|cotton candy|dont pout|don\'t pout|raspberry|sweet pea', re.I)),
    ('Reds',     re.compile(r'\bred\b|cherry|classic red|crimson|scarlet|ruby|coral reef|hibiscus|raspberry ripple|coral$', re.I)),
    ('Berries',  re.compile(r'berry|plum|merlot|burgundy|sangria|sangria|mulberry|vino|grape|wine|black cherry|dark berry|chopco|ember rose|merlot|velvet', re.I)),
    ('Darks',    re.compile(r'\bblack\b|dark|midnight|eclipse|shadow|charcoal|slate|total eclipse|obsidian|grey matter|midnight sky|midnight navy|midnight chrome', re.I)),
    ('Blues',    re.compile(r'\bblue\b|ocean|marine|teal|aqua|navy|baby shark|smurf|ibiza|cobalt|fluffy blue|baby blue', re.I)),
    ('Greens',   re.compile(r'green|olive|sage|forest|mint|pistachio|emerald|eco|forestation|matcha|sage wisdom', re.I)),
    ('Brights',  re.compile(r'bright|neon|orange|yellow|citrus|lime|sunshine|sunset|sunset strip|coral reef|show me the mon|lemon|electric lime|ultraviolet|tropical', re.I)),
    ('Pastels',  re.compile(r'pastel|lavender|lilac|lilac love|lilac dreams|wisteria|baby|powder|misty|dusty cedar|smoked mauve|soft n sweet|peachy|apricot|peach', re.I)),
    ('Earth',    re.compile(r'brown|tan|caramel|coffee|mocha|earth|clay|sand|toffee|salt water|salty|scuubie|velvet sand|desert rose|pumpkin|spiced chai|copper|bronze|antique', re.I)),
    ('Trends',   re.compile(r'')),   # catch-all — always matches
]


def infer_category(code: str, name: str) -> str:
    combined = f"{code} {name}"
    for cat, pattern in CATEGORY_RULES:
        if pattern.search(combined):
            return cat
    return 'Trends'


def is_technical(name: str) -> bool:
    return bool(TECHNICAL_KEYWORDS.search(name))


def parse_colour_entry(item: dict) -> dict | None:
    """Return a pod entry dict or None if this item is not a colour."""
    raw_name = item.get('name', '')
    raw_sku  = item.get('sku', '')
    price    = item.get('price', 0)

    if price > MAX_COLOUR_PRICE:
        return None
    if is_technical(raw_name) or is_technical(raw_sku):
        return None

    # Strip -HTF suffix
    clean = re.sub(r'\s*-HTF\s*$', '', raw_name).strip()

    # Named collections like "By The Ocean BTO01", "Velvet Cat Eye #VCE01"
    special = re.match(
        r'^(By The Ocean|Velvet Cat Eye #?|Glass Cat Eye #?|'
        r'Dreamy Cat Eye #?|Rose Quartz Cat Eye #?|Metallic Collection #?|'
        r'Shimmer Top Fairy #?|Super Fan Top Coat \d+ml |Super Flash Top Coat \d+ml |'
        r'MultiMix Synthogel \d+gr? |Liquid Polygel #?|GEL\.IT\.UP \d+ )(.+)',
        clean
    )
    if special:
        code = special.group(2).strip()
        name = clean  # keep full name for these collections
    else:
        # Standard: "01 Ice Ice Baby" or "2113J Blue Flashing Star"
        m = re.match(r'^([A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)\s+(.+)$', clean)
        if m:
            code = m.group(1)
            name = m.group(2).strip()
        else:
            code = clean.split()[0] if clean.split() else clean
            name = clean

    sku = f"GIUP-COL-{code}"
    category = infer_category(code, name)

    return {
        "sku":      sku,
        "code":     code,
        "name":     name,
        "category": category,
        "group":    "Pod_Seasonal",
    }


def load_existing_codes(pods: dict) -> set:
    codes: set = set()
    for key in ('pod_1', 'pod_2', 'pod_3', 'pod_4', 'pod_seasonal'):
        for item in pods.get(key, []):
            codes.add(item.get('code', ''))
            codes.add(item.get('sku', ''))
    return codes


def build_colour_list(price_list: dict, existing_codes: set, show_existing: bool) -> dict[str, list]:
    """Return colours grouped by category."""
    by_category: dict[str, list] = {}
    seen: set = set()

    for item in price_list['items']:
        parsed = parse_colour_entry(item)
        if not parsed:
            continue
        if parsed['code'] in seen:
            continue
        seen.add(parsed['code'])
        if not show_existing and (parsed['code'] in existing_codes or parsed['sku'] in existing_codes):
            continue
        by_category.setdefault(parsed['category'], []).append(parsed)

    # Sort each category by code for consistent ordering
    for cat in by_category:
        by_category[cat].sort(key=lambda x: x['code'])

    return by_category


def print_category_table(by_category: dict[str, list]) -> None:
    total = sum(len(v) for v in by_category.values())
    print(f"\n  {'Category':<16} {'Available':>9}")
    print(f"  {'-'*16} {'-'*9}")
    for cat, items in sorted(by_category.items()):
        print(f"  {cat:<16} {len(items):>9}")
    print(f"  {'─'*16} {'─'*9}")
    print(f"  {'TOTAL':<16} {total:>9}\n")


def auto_select(by_category: dict[str, list], n_per_category: int) -> list[dict]:
    selected: list[dict] = []
    print(f"\n  Auto-selecting up to {n_per_category} per category:\n")
    for cat, items in sorted(by_category.items()):
        picked = items[:n_per_category]
        selected.extend(picked)
        print(f"  {cat:<16} {len(items):>3} available → {len(picked):>2} selected")
    return selected


def interactive_select(by_category: dict[str, list]) -> list[dict]:
    selected: list[dict] = []
    print("  Enter how many colours to include from each category.")
    print("  Press ENTER (blank) to preview the full list first.\n")

    for cat, items in sorted(by_category.items()):
        while True:
            prompt = f"  {cat:<16} ({len(items):>3} available) → how many? [0–{len(items)}]: "
            try:
                raw = input(prompt).strip()
            except (KeyboardInterrupt, EOFError):
                print("\n  Aborted.")
                sys.exit(0)

            if raw == '':
                # Show list
                print()
                for i, c in enumerate(items, 1):
                    print(f"      {i:>3}. {c['code']:<12} {c['name']}")
                print()
                continue

            try:
                n = int(raw)
                if 0 <= n <= len(items):
                    selected.extend(items[:n])
                    break
                else:
                    print(f"      ✗ Enter a number between 0 and {len(items)}")
            except ValueError:
                print("      ✗ Enter a number (or ENTER to preview the list)")

    return selected


def write_output(selected: list[dict], season: str) -> None:
    # Summary by category
    summary: dict[str, int] = {}
    for c in selected:
        summary[c['category']] = summary.get(c['category'], 0) + 1

    output = {
        "_meta": {
            "season":           season,
            "generated":        __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M'),
            "total_colours":    len(selected),
            "by_category":      summary,
            "instructions":     (
                "Copy the 'pod_seasonal' array below into package-pods.json "
                "as a new key, then set group='Pod_Seasonal' on each item. "
                "In App.jsx add 'Professional' tier handling in buildTierPackageItems()."
            ),
        },
        "pod_seasonal": selected,
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  ✓ Saved {len(selected)} colours → {OUTPUT_FILE}")
    print("\n  Selection by category:")
    for cat, count in sorted(summary.items()):
        print(f"    {cat:<16} {count}")
    print(f"\n  Next steps:")
    print(f"    1. Review {OUTPUT_FILE}")
    print(f"    2. Copy 'pod_seasonal' into package-pods.json")
    print(f"    3. Commit, then redeploy — the portal 'Professional' package")
    print(f"       will automatically pick up the new seasonal colours.\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description='GEL.IT.UP — Build a seasonal colour pod for the Professional distributor package.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        '--auto', type=int, metavar='N',
        help='Auto-pick the first N colours per category (skips interactive prompts)',
    )
    parser.add_argument(
        '--counts', nargs='+', metavar='CAT:N',
        help=(
            'Per-category counts, e.g. --counts Whites:5 Nudes:5 Trends:50. '
            'Categories not listed fall back to --auto N (or 0 if --auto not set).'
        ),
    )
    parser.add_argument(
        '--season', default='SS2026',
        help='Season label written into the output file (default: SS2026)',
    )
    parser.add_argument(
        '--show-existing', action='store_true',
        help='Include colours that are already in pod_1 / pod_2',
    )
    parser.add_argument(
        '--list', action='store_true',
        help='Only list available categories and counts, then exit',
    )
    args = parser.parse_args()

    # ── Load files ───────────────────────────────────────────────────────────
    if not PRICE_LIST_FILE.exists():
        sys.exit(f"ERROR: {PRICE_LIST_FILE} not found. Run from public/gelitup-content/")
    if not PODS_FILE.exists():
        sys.exit(f"ERROR: {PODS_FILE} not found. Run from public/gelitup-content/")

    with open(PRICE_LIST_FILE, encoding='utf-8') as f:
        price_list = json.load(f)
    with open(PODS_FILE, encoding='utf-8') as f:
        pods = json.load(f)

    existing_codes = load_existing_codes(pods)
    by_category    = build_colour_list(price_list, existing_codes, args.show_existing)
    total_available = sum(len(v) for v in by_category.values())

    print(f"\nGEL.IT.UP Seasonal Colour Selector  ·  {args.season}")
    print("=" * 55)
    already_note = "" if args.show_existing else f" (excl. {len(existing_codes)//2} already in pods)"
    print(f"  {total_available} colours available{already_note}")
    print_category_table(by_category)

    if args.list:
        return

    # ── Select colours ───────────────────────────────────────────────────────
    if args.counts is not None:
        count_map: dict[str, int] = {}
        for token in args.counts:
            if ':' not in token:
                sys.exit(f"ERROR: --counts entries must be CAT:N, got {token!r}")
            cat, n_str = token.split(':', 1)
            count_map[cat.strip()] = int(n_str.strip())
        fallback = args.auto if args.auto is not None else 0
        selected = []
        print("\n  Selecting with per-category counts:\n")
        for cat, items in sorted(by_category.items()):
            n = count_map.get(cat, fallback)
            picked = items[:n]
            selected.extend(picked)
            print(f"  {cat:<16} {len(items):>3} available → {len(picked):>2} selected")
    elif args.auto is not None:
        selected = auto_select(by_category, args.auto)
    else:
        selected = interactive_select(by_category)

    if not selected:
        print("\n  Nothing selected — exiting without writing output.\n")
        return

    print(f"\n  Total selected: {len(selected)} colours")
    write_output(selected, args.season)


if __name__ == '__main__':
    main()
