"""
Scan product-image-map.json and check which products are missing prices in b2b-price-list.json.
Uses the same logic as formatCatalogueItemName() in App.jsx:
  - Take the image PATH value (not the key)
  - Extract filename after last '/'
  - Strip file extension (alphanumeric suffix after last dot)
  - Replace hyphens/underscores with spaces, collapse whitespace
"""
import re
import json

# Load files - extract key->value pairs (handles duplicate keys via raw parsing)
with open('product-image-map.json', encoding='utf-8') as f:
    image_map_raw = f.read()

with open('b2b-price-list.json', encoding='utf-8') as f:
    price_list_data = json.load(f)
price_list = price_list_data.get('items', price_list_data) if isinstance(price_list_data, dict) else price_list_data

# Extract key:value pairs from image map raw (handles duplicate keys)
# Matches: "key": "value" lines
kv_pairs = re.findall(r'^\s+"([^"]+)"\s*:\s*"([^"]*)"', image_map_raw, re.MULTILINE)
# Deduplicate by key, keeping first occurrence
seen_keys = {}
for k, v in kv_pairs:
    if k not in seen_keys:
        seen_keys[k] = v
image_map = seen_keys

print(f"Total image map key-value pairs: {len(image_map)}")

# Build price lookup structures (mimic the JS logic)
def normalize(s):
    return re.sub(r'\s+', ' ', s.strip().upper())

# Build lookup maps from price list
price_by_name = {}
price_by_sku = {}
for entry in price_list:
    name = entry.get('name', '')
    sku = entry.get('sku', '')
    price = entry.get('price')
    if name:
        price_by_name[normalize(name)] = price
    if sku:
        price_by_sku[normalize(sku)] = price

def format_catalogue_item_name(image_path):
    """Mimic formatCatalogueItemName from App.jsx - operates on the IMAGE PATH, not the key"""
    # Extract filename after last '/'
    file_name = image_path.split('/')[-1] if '/' in image_path else image_path
    # Strip file extension (alphanumeric suffix)
    without_ext = re.sub(r'\.[a-z0-9]+$', '', file_name, flags=re.IGNORECASE)
    # Replace hyphens/underscores with spaces, collapse whitespace
    result = re.sub(r'[_\-]+', ' ', without_ext)
    result = re.sub(r'\s+', ' ', result)
    return result.strip()

def extract_giup_number(s):
    """Extract GIUP number from string"""
    m = re.search(r'GIUP[\s\-]?(\d+)', s, re.IGNORECASE)
    if m:
        return m.group(1)
    return None

def fuzzy_match(product_name, price_name):
    """Mimic fuzzyPriceLookup - all 4+ char words must be in the other"""
    words_a = set(w.upper() for w in re.findall(r'\w+', product_name) if len(w) >= 4)
    words_b = set(w.upper() for w in re.findall(r'\w+', price_name) if len(w) >= 4)
    if not words_a or not words_b:
        return False
    return words_a.issubset(words_b) or words_b.issubset(words_a)

def find_price(key, product_name):
    """Try to find a price for a product"""
    norm_name = normalize(product_name)
    norm_key = normalize(key)
    
    # 1. Direct key match
    if norm_key in price_by_name:
        return price_by_name[norm_key], "direct_key"
    
    # 2. Direct formatted name match (from image path)
    if norm_name in price_by_name:
        return price_by_name[norm_name], "direct_name"
    
    # 3. SKU match
    if norm_name in price_by_sku:
        return price_by_sku[norm_name], "sku_match"
    if norm_key in price_by_sku:
        return price_by_sku[norm_key], "sku_key"
    
    # 4. GIUP number match
    giup_num = extract_giup_number(product_name) or extract_giup_number(key)
    if giup_num:
        for pname, pprice in price_by_name.items():
            if giup_num in pname:
                return pprice, f"giup_{giup_num}"
        for sku, pprice in price_by_sku.items():
            if giup_num in sku:
                return pprice, f"giup_sku_{giup_num}"
    
    # 5. Fuzzy match
    for pname, pprice in price_by_name.items():
        if fuzzy_match(product_name, pname):
            return pprice, f"fuzzy:{pname}"
    
    return None, None

# Find products with missing prices
missing = []
found = []

HERO_PATTERN = re.compile(r'hero\.image|\.heor\.image|hero image', re.IGNORECASE)

for key, image_path in image_map.items():
    # Skip hero/background images
    if HERO_PATTERN.search(key) or HERO_PATTERN.search(image_path):
        continue
    
    product_name = format_catalogue_item_name(image_path)
    price, method = find_price(key, product_name)
    if price is None:
        missing.append((key, product_name, image_path))
    else:
        found.append((key, product_name, price, method))

# Deduplicate missing by product_name (many keys map to same product)
seen_names = {}
for key, product_name, image_path in missing:
    if product_name not in seen_names:
        seen_names[product_name] = (key, image_path)

print(f"\nFound prices: {len(found)}")
print(f"Missing prices (raw): {len(missing)}")
print(f"Missing prices (unique names): {len(seen_names)}")
print("\n=== MISSING PRICES (unique product names) ===")
for product_name, (key, image_path) in sorted(seen_names.items()):
    print(f"  product: {repr(product_name)}")
    print(f"  key:     {repr(key)}")
    print(f"  path:    {repr(image_path)}")
    print()
