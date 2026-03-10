"""
Full analysis: compare image map keys against:
1. Direct price list lookup (by name)
2. App.jsx aliasGroups lookup (hardcoded in code)
3. giupSeriesCodeMatch logic
4. fuzzyPriceLookup

This script mirrors what App.jsx actually does to determine true missing prices.
"""
import re
import json

# ─── Load files ───
with open('product-image-map.json', encoding='utf-8') as f:
    image_map_raw = f.read()

with open('b2b-price-list.json', encoding='utf-8') as f:
    price_list_data = json.load(f)
price_list = price_list_data.get('items', price_list_data) if isinstance(price_list_data, dict) else price_list_data

with open('../../src/App.jsx', encoding='utf-8') as f:
    app_src = f.read()

# ─── Extract image map key->value ───
kv_pairs = re.findall(r'^\s+"([^"]+)"\s*:\s*"([^"]*)"', image_map_raw, re.MULTILINE)
seen_keys = {}
for k, v in kv_pairs:
    if k not in seen_keys:
        seen_keys[k] = v
image_map = seen_keys
print(f"Image map entries: {len(image_map)}")

# ─── Extract aliasGroups from App.jsx ───
# Find the block between "const aliasGroups = [" and the "for (const" loop
alias_m = re.search(r'const aliasGroups\s*=\s*\[(.+?)\]\s*for\s*\(const', app_src, re.DOTALL)
alias_covered_codes = set()  # uppercase
alias_targets = {}  # uppercase code -> target price list name
if alias_m:
    alias_block = alias_m.group(1)
    # Extract each { codes: [...], target: '...' } group
    for grp_m in re.finditer(r'\{\s*codes:\s*\[([^\]]*)\]\s*,\s*target:\s*\'([^\']+)\'', alias_block):
        codes_raw = grp_m.group(1)
        target = grp_m.group(2)
        codes = re.findall(r"'([^']+)'", codes_raw)
        for c in codes:
            cu = c.upper()
            alias_covered_codes.add(cu)
            alias_targets[cu] = target
    print(f"Alias codes (unique): {len(alias_covered_codes)}")
else:
    print("WARNING: aliasGroups not found in App.jsx")

# ─── Build price maps ─── (mirrors App.jsx priceMap construction)
def normalize_sku(s):
    return re.sub(r'\s+', ' ', str(s or '').strip().upper())

def normalize_product_name(s):
    s = normalize_sku(s)
    s = re.sub(r'GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP', ' ', s, flags=re.IGNORECASE)
    s = re.sub(r'[^A-Z0-9]+', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def strip_suffix(s):
    return re.sub(r'\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$', '', str(s or ''), flags=re.IGNORECASE).strip()

price_map = {}  # key -> entry dict (first match wins)

for entry in price_list:
    name = entry.get('name', '')
    sku = entry.get('sku', '')
    clean_name = strip_suffix(name)
    
    keys = [
        normalize_sku(sku),
        normalize_sku(strip_suffix(sku)),
        normalize_product_name(name),
        normalize_product_name(clean_name),
    ]
    
    # Leading color number: "30 Manilla Buff -HTF" -> also index "30"
    num_match = re.match(r'^(\d+[A-Z]?)\s', clean_name)
    if num_match:
        n = num_match.group(1)
        padded = re.sub(r'^(\d+)', lambda m: m.group(1).zfill(2), n)
        stripped = re.sub(r'^0+(\d)', r'\1', n)
        keys += [padded, stripped, n]
    
    # Series#N: "PMA #1 Champagne Blizzard -HTF" -> "PMA 1", "PMA 01", "PMA1"
    series_match = re.match(r'^([A-Z]+)\s*#\s*(\d+[A-Z]?)\b', clean_name, re.IGNORECASE)
    if series_match:
        s = series_match.group(1).upper()
        n = series_match.group(2)
        keys += [f'{s} {n}', f'{s} {n.zfill(2)}', f'{s}{n}', f'{s}{n.zfill(2)}']
    
    # Embedded series+number tokens: "By The Ocean BTO01" -> "BTO01", "BTO 01", "BTO 1"
    for tm in re.finditer(r'\b([A-Z]{1,5})(\d{1,3}[A-Z]?)\b', clean_name, re.IGNORECASE):
        s = tm.group(1).upper()
        n = tm.group(2)
        keys += [f'{s} {n}', f'{s} {n.zfill(2)}', f'{s}{n}', f'{s}{n.zfill(2)}']
        # Strip leading zeros: R010 -> R10
        stripped_n = re.sub(r'^0+(\d)', r'\1', n)
        keys += [f'{s} {stripped_n}', f'{s}{stripped_n}']
    
    for k in keys:
        if k and k not in price_map:
            price_map[k] = entry

def format_catalogue_item_name(image_path):
    """Mirrors formatCatalogueItemName in App.jsx - operates on image PATH"""
    file_name = image_path.split('/')[-1] if '/' in image_path else image_path
    without_ext = re.sub(r'\.[a-z0-9]+$', '', file_name, flags=re.IGNORECASE)
    result = re.sub(r'[_\-]+', ' ', without_ext)
    result = re.sub(r'\s+', ' ', result)
    return result.strip()

FUZZY_SKIP = {'COLOR', 'COLOUR', 'COAT', 'CARE', 'FORM', 'SIZE'}

def fuzzy_match(query, entry_name):
    """Simplified fuzzy: all 4+ char query words must appear in entry"""
    q_words = set(w for w in normalize_sku(query).split() if len(w) >= 4 and w not in FUZZY_SKIP)
    e_words = set(w for w in normalize_sku(entry_name).split() if len(w) >= 4)
    if len(q_words) < 2:
        return False
    return all(w in e_words or (w + 'S') in e_words for w in q_words)

def find_price_app_style(key, image_path):
    """
    Mimics the full App.jsx price lookup chain including aliasGroups.
    Returns (price_entry, method) or (None, None).
    """
    raw_name = format_catalogue_item_name(image_path)  # product display name
    
    key_up = normalize_sku(key)
    raw_name_up = normalize_sku(raw_name)
    
    # 1. Alias groups lookup (from App.jsx hardcoded aliases)
    if key_up in alias_covered_codes:
        return {'target': alias_targets[key_up]}, 'alias_exact'
    if raw_name_up in alias_covered_codes:
        return {'target': alias_targets[raw_name_up]}, 'alias_rawname'

    # 2. Direct price list lookup by sku/code
    if key_up in price_map:
        return price_map[key_up], 'direct_key'
    if raw_name_up in price_map:
        return price_map[raw_name_up], 'direct_rawname'

    # 3. normalizeProductName lookup (strips GIUP)
    norm_name = normalize_product_name(raw_name)
    norm_key = normalize_product_name(key)
    if norm_name in price_map:
        return price_map[norm_name], 'product_name'
    if norm_key in price_map:
        return price_map[norm_key], 'product_key'

    # 4. giupNumMatch: "GIUP 30" -> "30", "030"
    giup_num_m = re.match(r'^(?:GIUP[-\s]+)?(\d+[A-Z]?)$', key_up)
    if giup_num_m:
        num = giup_num_m.group(1)
        for try_key in [num, num.zfill(2), num.zfill(3), num.zfill(4)]:
            if try_key in price_map:
                return price_map[try_key], f'giup_num_{num}'

    # 5. giupSeriesCodeMatch: "GIUP NYP01" -> "NYP 01", "NYP01"
    giup_series_m = re.match(r'^(?:GIUP[-\s]+)?([A-Z]+)(\d+[A-Z]?)$', key_up)
    if giup_series_m:
        series = giup_series_m.group(1)
        num = giup_series_m.group(2)
        stripped_n = re.sub(r'^0+(\d)', r'\1', num)
        for try_key in [
            f'{series} {num}',
            f'{series} {num.zfill(2)}',
            f'{series} {stripped_n}',
            f'{series}{num}',
            f'{series}{num.zfill(2)}',
        ]:
            if try_key in price_map:
                return price_map[try_key], f'giup_series_{try_key}'

    # 6. Fuzzy match (simplified)
    for pname_key, entry in price_map.items():
        if fuzzy_match(raw_name, pname_key):
            return entry, f'fuzzy:{pname_key}'
    for pname_key, entry in price_map.items():
        if fuzzy_match(key, pname_key):
            return entry, f'fuzzy_key:{pname_key}'

    return None, None

# ─── Hero image detection ───
HERO_PATTERN = re.compile(r'hero\.image|\.heor\.image', re.IGNORECASE)

# ─── Run analysis ───
missing = {}
found_count = 0

for key, image_path in image_map.items():
    if HERO_PATTERN.search(key) or HERO_PATTERN.search(image_path):
        continue
    product_name = format_catalogue_item_name(image_path)
    price_entry, method = find_price_app_style(key, image_path)
    
    if price_entry is None:
        if product_name not in missing:
            missing[product_name] = (key, image_path)
    else:
        found_count += 1

# ─── Output ───
print(f"\nFound prices: {found_count}")
print(f"Missing prices (unique product names): {len(missing)}")
print("\n=== MISSING PRICES (unique products) ===")

# Group by folder
by_folder = {}
for pname, (key, path) in sorted(missing.items()):
    parts = path.split('/')
    folder = '/'.join(parts[2:-1]) if len(parts) >= 4 else 'ROOT'
    folder = folder.replace('gelitup-content/product-images/', '')
    by_folder.setdefault(folder, []).append((pname, key, path))

for folder in sorted(by_folder.keys()):
    items = by_folder[folder]
    print(f"\n[{folder}] ({len(items)} missing)")
    for pname, key, path in items:
        print(f"  product: {pname!r}")
        print(f"  key:     {key!r}")
        print()
