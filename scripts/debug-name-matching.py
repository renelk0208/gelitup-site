#!/usr/bin/env python3
"""
Match price list names to image map keys
"""

import json

# Load files
with open('./public/gelitup-content/b2b-price-list.json', 'r') as f:
    price_data = json.load(f)

with open('./public/gelitup-content/product-image-map.json', 'r') as f:
    image_map = json.load(f)

# Get Multimix and PBG products
multimix_prices = [i for i in price_data['items'] if 'multimix' in i['name'].lower()]
pbg_prices = [i for i in price_data['items'] if 'premium' in i['name'].lower() and 'builder' in i['name'].lower()]

print(f"Price list Multimix: {len(multimix_prices)}")
print(f"Price list PBG: {len(pbg_prices)}")

# Create case-insensitive image map
image_map_lower = {k.lower(): (k, v) for k, v in image_map.items()}

# Check matching
def try_match(name):
    name_lower = name.lower().replace(' -htf', '').strip()
    
    # Strategy 1: Direct lowercase match
    if name_lower in image_map_lower:
        return True, image_map_lower[name_lower][0]
    
    # Strategy 2: Contains match for key parts
    # For "Multimix Synthogel 30g Baby Blue -HTF"
    # Look for "multimix" + "synthogel" + "baby" + "blue"
    keywords = [w for w in name_lower.split() if w and w not in ['multimix', 'synthogel', 'premium', 'builder', 'gel', 'htf', '30g', '30gr', '40gr', '15ml', '11ml']]
    
    if keywords:
        for key_lower, (orig_key, url) in image_map_lower.items():
            if all(kw in key_lower for kw in keywords):
                return True, orig_key
    
    return False, None

# Test Multimix matching
print("\nMultimix Matching:")
mm_matched = 0
mm_unmatched = []

for product in multimix_prices[:15]:
    matched, key = try_match(product['name'])
    if matched:
        mm_matched += 1
        print(f"  ✓ {product['name']}")
    else:
        mm_unmatched.append(product['name'])
        print(f"  ✗ {product['name']}")

print(f"\nMultimix: {mm_matched}/{15} matched, {len(mm_unmatched)} unmatched")

# Test PBG matching
print("\nPBG Matching:")
pbg_matched = 0
pbg_unmatched = []

for product in pbg_prices[:15]:
    matched, key = try_match(product['name'])
    if matched:
        pbg_matched += 1
        print(f"  ✓ {product['name']}")
    else:
        pbg_unmatched.append(product['name'])
        print(f"  ✗ {product['name']}")

print(f"\nPBG: {pbg_matched}/{15} matched, {len(pbg_unmatched)} unmatched")

# Overall stats
total_mm_matched = sum(1 for p in multimix_prices if try_match(p['name'])[0])
total_pbg_matched = sum(1 for p in pbg_prices if try_match(p['name'])[0])

print(f"\n{'='*80}")
print(f"OVERALL MATCHING STATS")
print(f"{'='*80}")
print(f"Multimix: {total_mm_matched}/{len(multimix_prices)} products can be matched")
print(f"PBG: {total_pbg_matched}/{len(pbg_prices)} products can be matched")
print(f"Total unmatched: {len(multimix_prices) + len(pbg_prices) - total_mm_matched - total_pbg_matched}")
