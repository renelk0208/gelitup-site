#!/usr/bin/env python3
"""
Fix Brush on Builder (BoB) products by syncing prices and SKUs from price list
"""

import csv
import json
from collections import defaultdict

# Load price list
with open('./public/gelitup-content/b2b-price-list.json', 'r', encoding='utf-8') as f:
    price_data = json.load(f)

# Create price mapping (normalize by name)
price_map = {}
for item in price_data.get('items', []):
    name = item.get('name', '').strip()
    if 'brush on builder' in name.lower():
        # Normalize name for matching
        normalized = name.replace(' -HTF', '').lower().strip()
        price_map[normalized] = {
            'sku': item.get('sku', ''),
            'price': item.get('price', 0),
            'name': name
        }

print(f"Found {len(price_map)} BoB entries in price list")

# Load products CSV
with open('./products_export_1.csv', 'r', encoding='utf-8') as f:
    csv_reader = csv.DictReader(f)
    products = list(csv_reader)
    fieldnames = csv_reader.fieldnames

# Track BoB products
bob_products = []
bob_indices = []
bob_by_handle = defaultdict(list)

for idx, p in enumerate(products):
    if 'brush on builder' in p.get('Title', '').lower():
        bob_products.append(p)
        bob_indices.append(idx)
        handle = p.get('Handle', '')
        bob_by_handle[handle].append(idx)

print(f"Found {len(bob_products)} BoB products in CSV")

# Identify and fix issues
fixes_applied = 0
duplicates_removed = []
products_updated = []

# Find duplicates to remove
duplicate_indices = set()
seen_handles = {}

for handle, indices in bob_by_handle.items():
    if len(indices) > 1:
        print(f"\nDuplicate found: {handle}")
        # Keep the first one, mark others for removal
        for idx in indices[1:]:
            duplicate_indices.add(idx)
            duplicates_removed.append({
                'title': products[idx].get('Title'),
                'handle': handle,
                'index': idx
            })
            print(f"  Marking for removal: index {idx}")

# Update BoB products with price list data
updated_products = []
for idx, product in enumerate(products):
    if idx in duplicate_indices:
        # Skip duplicates
        continue
    
    if 'brush on builder' in product.get('Title', '').lower():
        title = product.get('Title', '')
        normalized_title = title.replace(' -HTF', '').lower().strip()
        
        # Try to find matching price
        if normalized_title in price_map:
            price_info = price_map[normalized_title]
            old_price = product.get('Variant Price', '')
            old_sku = product.get('Variant SKU', '')
            
            # Update with price list data
            product['Variant Price'] = str(price_info['price'])
            product['Variant SKU'] = price_info['sku']
            
            fixes_applied += 1
            products_updated.append({
                'title': title,
                'old_price': old_price,
                'new_price': price_info['price'],
                'old_sku': old_sku,
                'new_sku': price_info['sku']
            })
            
            print(f"✓ Updated: {title}")
            print(f"    Price: {old_price} → €{price_info['price']}")
            print(f"    SKU: {old_sku} → {price_info['sku']}")
    
    updated_products.append(product)

# Save backup
with open('./products_export_1.backup.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(products)

print(f"\n✓ Backup saved: products_export_1.backup.csv")

# Save updated CSV
with open('./products_export_1.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(updated_products)

print(f"✓ Updated CSV saved: products_export_1.csv")

# Summary
print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Duplicates removed: {len(duplicates_removed)}")
print(f"Products updated with prices/SKUs: {fixes_applied}")

if duplicates_removed:
    print(f"\nRemoved:")
    for dup in duplicates_removed:
        print(f"  • {dup['title']} (handle: {dup['handle']})")

print(f"\nUpdated:")
for update in products_updated[:5]:
    print(f"  • {update['title']}")
    print(f"    Price: €{update['new_price']}")

# Save detailed report
report = {
    'timestamp': __import__('datetime').datetime.now().isoformat(),
    'duplicates_removed': duplicates_removed,
    'products_updated': products_updated,
    'total_products_fixed': fixes_applied + len(duplicates_removed)
}

with open('bob-fixes-report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)

print(f"\n✓ Detailed report: bob-fixes-report.json")
