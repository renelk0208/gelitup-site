#!/usr/bin/env python3
"""
Manually create missing image mappings by examining actual image files
"""

import json
from pathlib import Path

# Load files
with open('./public/gelitup-content/product-image-map.json', 'r') as f:
    image_map = json.load(f)

# Scan actual images and group by pattern
multimix_images = {}
pbg_images = {}

multimix_dir = Path('./public/gelitup-content/product-images/MULTIMIX')
builder_dir = Path('./public/gelitup-content/product-images/BUILDER GEL')

# Scan Multimix
if multimix_dir.exists():
    for size_dir in multimix_dir.iterdir():
        if not size_dir.is_dir():
            continue
        
        for img_file in size_dir.glob('*.webp'):
            rel_path = f"/gelitup-content/product-images/MULTIMIX/{size_dir.name}/{img_file.name}"
            
            # Store base image (without _B, _C variants)
            base_name = img_file.stem.replace('_B', '').replace('_C', '')
            size = size_dir.name
            
            if base_name not in multimix_images:
                multimix_images[base_name] = {'30 ML': None, '60 ML': None}
            
            if size == '30 ML':
                multimix_images[base_name]['30 ML'] = rel_path
            elif size == '60 ML':
                multimix_images[base_name]['60 ML'] = rel_path

# Scan Builder Gel for Premium products
if builder_dir.exists():
    pbg_subdir = builder_dir / 'PREMIUM BUILDER'
    if pbg_subdir.exists():
        for img_file in pbg_subdir.glob('*.webp'):
            rel_path = f"/gelitup-content/product-images/BUILDER GEL/PREMIUM BUILDER/{img_file.name}"
            pbg_images[img_file.stem] = rel_path

print(f"Multimix images found: {len(multimix_images)} base products")
print(f"PBG images found: {len(pbg_images)} products")

# Load price list to match
with open('./public/gelitup-content/b2b-price-list.json', 'r') as f:
    price_data = json.load(f)

# Extract product names
multimix_prices = {}
pbg_prices = {}

for item in price_data['items']:
    name = item['name'].lower()
    if 'multimix' in name:
        # Extract size and color
        if '30g' in name or '30gr' in name:
            multimix_prices[item['name']] = '30 ML'
        elif '60g' in name or '60gr' in name:
            multimix_prices[item['name']] = '60 ML'
        elif '100ml' in name:
            multimix_prices[item['name']] = 'LIQUID'
    elif 'premium' in name and 'builder' in name:
        pbg_prices[item['name']] = True

print(f"\nPrice list Multimix: {len(multimix_prices)}")
print(f"Price list PBG: {len(pbg_prices)}")

# Manual mapping using heuristics
def match_multimix_to_image(name, size):
    """Match a Multimix product name to an image file"""
    name_lower = name.lower().replace(' -htf', '').replace('-', ' ')
    
    # Extract color keywords
    keywords = []
    skip = {'multimix', 'synthogel', 'syntholiquid', '30g', '30gr', '60g', '60gr', '100ml'}
    for word in name_lower.split():
        if word not in skip:
            keywords.append(word)
    
    # Try to find matching image
    best_match = None
    for base_name, sizes in multimix_images.items():
        base_lower = base_name.lower()
        # Check if all keywords appear in base_name
        if all(kw in base_lower for kw in keywords):
            if sizes.get(size):
                return sizes[size]
    
    return None

def match_pbg_to_image(name):
    """Match a Premium Builder Gel product to an image file"""
    name_lower = name.lower().replace(' -htf', '').replace('-', ' ')
    
    # Extract color keywords
    keywords = []
    skip = {'premium', 'builder', 'gel', 'plus', 'fiber', 'glass', '40gr', '40g'}
    for word in name_lower.split():
        if word not in skip:
            keywords.append(word)
    
    # Try to find matching image
    for img_stem, img_path in pbg_images.items():
        img_lower = img_stem.lower()
        # Check if all keywords appear
        if all(kw in img_lower for kw in keywords):
            return img_path
    
    return None

# Generate new mappings
new_count = 0
missing = []

for product_name, size in multimix_prices.items():
    # Check if already mapped (case-insensitive)
    exists = any(k.lower() == product_name.lower() for k in image_map.keys())
    if not exists:
        img_path = match_multimix_to_image(product_name, size)
        if img_path:
            image_map[product_name] = img_path
            new_count += 1
        else:
            missing.append(product_name)

for product_name in pbg_prices.keys():
    exists = any(k.lower() == product_name.lower() for k in image_map.keys())
    if not exists:
        img_path = match_pbg_to_image(product_name)
        if img_path:
            image_map[product_name] = img_path
            new_count += 1
        else:
            missing.append(product_name)

print(f"\n{'='*80}")
print(f"Added {new_count} new mappings")
print(f"Still missing: {len(missing)}")

if missing:
    print(f"\nUnmatched products:")
    for name in missing:
        print(f"  {name}")

# Save
with open('./public/gelitup-content/product-image-map.json', 'w') as f:
    json.dump(image_map, f, indent=2)

print(f"\n✓ Updated image map saved ({len(image_map)} total entries)")

# Save migration report
with open('image-mapping-migration.json', 'w') as f:
    json.dump({
        'new_mappings_added': new_count,
        'still_missing': len(missing),
        'missing_products': missing,
        'total_entries': len(image_map)
    }, f, indent=2)
