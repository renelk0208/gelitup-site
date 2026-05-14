#!/usr/bin/env python3
"""
Auto-generate missing image mappings for Multimix and PBG products
"""

import json
import os
from pathlib import Path

# Load existing files
with open('./public/gelitup-content/b2b-price-list.json', 'r') as f:
    price_data = json.load(f)

with open('./public/gelitup-content/product-image-map.json', 'r') as f:
    image_map = json.load(f)

# Get all actual image files
image_dir = Path('./public/gelitup-content/product-images')
actual_images = {}

for category_dir in image_dir.iterdir():
    if not category_dir.is_dir():
        continue
    category = category_dir.name
    
    for size_dir in category_dir.iterdir():
        if not size_dir.is_dir():
            continue
        
        for img_file in size_dir.glob('*.webp'):
            # Create a normalized key for matching
            filename = img_file.stem.lower()  # without .webp
            rel_path = f"/gelitup-content/product-images/{category}/{size_dir.name}/{img_file.name}"
            
            # Store both by filename and various normalized versions
            actual_images[filename] = rel_path
            actual_images[filename.replace('_', ' ')] = rel_path

print(f"Found {len(actual_images)} unique image files in filesystem")

# Get Multimix and PBG products from price list
multimix_prices = [i for i in price_data['items'] if 'multimix' in i['name'].lower()]
pbg_prices = [i for i in price_data['items'] if 'premium' in i['name'].lower() and 'builder' in i['name'].lower()]

print(f"Multimix products to map: {len(multimix_prices)}")
print(f"PBG products to map: {len(pbg_prices)}")

def find_best_image(product_name, category_filter=None):
    """Try to find the best matching image for a product"""
    name_lower = product_name.lower().replace(' -htf', '').strip()
    
    # Extract color name and size
    parts = name_lower.split()
    
    # Try direct filename match
    if name_lower in actual_images:
        return actual_images[name_lower]
    
    # Try with underscores instead of spaces
    filename_style = name_lower.replace(' ', '_')
    if filename_style in actual_images:
        return actual_images[filename_style]
    
    # For Multimix: extract color + size
    if 'multimix' in name_lower:
        # e.g. "MultiMix Synthogel 30g Baby Blue" → find "multimix_baby_blue_color-30g"
        size_match = None
        if '30g' in name_lower or '30gr' in name_lower:
            size_match = '-30g'
        elif '60g' in name_lower or '60gr' in name_lower:
            size_match = '-60g'
        
        # Extract color words (skip 'multimix', 'synthogel', 'gel', sizes)
        color_words = []
        skip_words = {'multimix', 'synthogel', 'gel', '30g', '30gr', '60g', '60gr', 'color'}
        for word in parts:
            word_clean = word.replace('-htf', '')
            if word_clean and word_clean not in skip_words:
                color_words.append(word_clean.replace(' ', '_'))
        
        if color_words and size_match:
            # Try: multimix_color1_color2_..._colorN_sizeN_g
            search_name = '_'.join(color_words) + '_color' + size_match
            if search_name in actual_images:
                return actual_images[search_name]
            
            # Try without 'color' suffix
            search_name = '_'.join(color_words) + size_match
            if search_name in actual_images:
                return actual_images[search_name]
    
    # For Premium Builder Gel
    if 'premium' in name_lower and 'builder' in name_lower:
        # e.g. "Premium Builder Gel Pink 40gr" → find "3_in_1.*pink.*40gr" or similar
        size_match = None
        if '40gr' in name_lower or '40g' in name_lower:
            size_match = '-40gr'
        
        # Extract color
        color_words = []
        skip_words = {'premium', 'builder', 'gel', 'plus', 'fiber', 'glass', '40gr', '40g', 'color'}
        for word in parts:
            word_clean = word.replace('-htf', '')
            if word_clean and word_clean not in skip_words:
                color_words.append(word_clean)
        
        if color_words and size_match:
            search_name = ('_'.join(color_words) + size_match).lower()
            if search_name in actual_images:
                return actual_images[search_name]
    
    return None

# Generate new mappings
new_mappings = {}
added_count = 0
missing_count = 0

# Process Multimix
for product in multimix_prices:
    name = product['name']
    if name.lower() not in {k.lower() for k in image_map.keys()}:
        # Try to find image
        img_path = find_best_image(name)
        if img_path:
            new_mappings[name] = img_path
            added_count += 1
        else:
            missing_count += 1
            print(f"✗ Could not map: {name}")

# Process PBG
for product in pbg_prices:
    name = product['name']
    if name.lower() not in {k.lower() for k in image_map.keys()}:
        img_path = find_best_image(name)
        if img_path:
            new_mappings[name] = img_path
            added_count += 1
        else:
            missing_count += 1
            print(f"✗ Could not map: {name}")

print(f"\n{'='*80}")
print(f"MAPPING RESULTS")
print(f"{'='*80}")
print(f"New mappings generated: {added_count}")
print(f"Still missing: {missing_count}")

# Merge and save
image_map_updated = {**image_map, **new_mappings}

# Backup original
with open('./public/gelitup-content/product-image-map.backup.json', 'w') as f:
    json.dump(image_map, f, indent=2)

# Save updated
with open('./public/gelitup-content/product-image-map.json', 'w') as f:
    json.dump(image_map_updated, f, indent=2)

print(f"\n✓ Backup saved: product-image-map.backup.json")
print(f"✓ Updated map saved: product-image-map.json ({len(image_map_updated)} total entries)")

if new_mappings:
    print(f"\nNew mappings added:")
    for name, path in list(new_mappings.items())[:10]:
        print(f"  + {name}")
        print(f"    → {path}")
