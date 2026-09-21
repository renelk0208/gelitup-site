#!/usr/bin/env python3
"""
Comprehensive analysis of Multimix and Premium Builder Gel products
"""

import csv
import json
from collections import defaultdict, Counter

# Load products CSV
with open('./products_export_1.csv', 'r', encoding='utf-8') as f:
    csv_reader = csv.DictReader(f)
    products = list(csv_reader)

# Load price list
with open('./public/gelitup-content/b2b-price-list.json', 'r', encoding='utf-8') as f:
    price_data = json.load(f)

# Create price map
price_map = {}
for item in price_data.get('items', []):
    sku = item.get('sku', '').strip().lower()
    if sku:
        price_map[sku] = {
            'price': item.get('price', 0),
            'name': item.get('name', '')
        }

# Analyze Multimix products
multimix = [p for p in products if 'multimix' in p.get('Title', '').lower()]

# Analyze Premium Builder Gel products
pbg = [p for p in products if 'premium' in p.get('Title', '').lower() and 'builder' in p.get('Title', '').lower()]

print("\n" + "="*80)
print("MULTIMIX & PREMIUM BUILDER GEL ANALYSIS")
print("="*80)

# MULTIMIX ANALYSIS
print(f"\n🔍 MULTIMIX PRODUCTS: {len(multimix)} found")

multimix_issues = {
    'duplicates': [],
    'no_image': [],
    'no_price': [],
    'no_sku': []
}

# Check for duplicates
multimix_by_title = defaultdict(list)
for idx, p in enumerate(multimix):
    title = p.get('Title', '')
    multimix_by_title[title].append(idx)

for title, indices in multimix_by_title.items():
    if len(indices) > 1:
        multimix_issues['duplicates'].append({
            'title': title,
            'count': len(indices),
            'indices': indices,
            'handles': [multimix[i].get('Handle', '') for i in indices]
        })

# Check for missing data
for idx, p in enumerate(multimix):
    if not p.get('Image Src', '').strip():
        multimix_issues['no_image'].append({
            'title': p.get('Title', ''),
            'handle': p.get('Handle', ''),
            'index': idx
        })
    
    if not p.get('Variant Price', '').strip():
        multimix_issues['no_price'].append({
            'title': p.get('Title', ''),
            'handle': p.get('Handle', ''),
            'sku': p.get('Variant SKU', ''),
            'index': idx
        })
    
    if not p.get('Variant SKU', '').strip():
        multimix_issues['no_sku'].append({
            'title': p.get('Title', ''),
            'handle': p.get('Handle', ''),
            'index': idx
        })

print(f"  Duplicates: {len(multimix_issues['duplicates'])}")
for dup in multimix_issues['duplicates']:
    print(f"    • {dup['title']} (x{dup['count']})")
    for h in dup['handles']:
        print(f"      - {h}")

print(f"  Missing images: {len(multimix_issues['no_image'])}")
for item in multimix_issues['no_image'][:5]:
    print(f"    • {item['title']}")

print(f"  Missing prices: {len(multimix_issues['no_price'])}")
for item in multimix_issues['no_price'][:5]:
    print(f"    • {item['title']}")

print(f"  Missing SKUs: {len(multimix_issues['no_sku'])}")
for item in multimix_issues['no_sku'][:5]:
    print(f"    • {item['title']}")

# PREMIUM BUILDER GEL ANALYSIS
print(f"\n🔍 PREMIUM BUILDER GEL PRODUCTS: {len(pbg)} found")

pbg_issues = {
    'duplicates': [],
    'no_image': [],
    'no_price': [],
    'no_sku': []
}

# Check for duplicates
pbg_by_title = defaultdict(list)
for idx, p in enumerate(pbg):
    title = p.get('Title', '')
    pbg_by_title[title].append(idx)

for title, indices in pbg_by_title.items():
    if len(indices) > 1:
        pbg_issues['duplicates'].append({
            'title': title,
            'count': len(indices),
            'indices': indices,
            'handles': [pbg[i].get('Handle', '') for i in indices]
        })

# Check for missing data
for idx, p in enumerate(pbg):
    if not p.get('Image Src', '').strip():
        pbg_issues['no_image'].append({
            'title': p.get('Title', ''),
            'handle': p.get('Handle', ''),
            'index': idx
        })
    
    if not p.get('Variant Price', '').strip():
        pbg_issues['no_price'].append({
            'title': p.get('Title', ''),
            'handle': p.get('Handle', ''),
            'sku': p.get('Variant SKU', ''),
            'index': idx
        })
    
    if not p.get('Variant SKU', '').strip():
        pbg_issues['no_sku'].append({
            'title': p.get('Title', ''),
            'handle': p.get('Handle', ''),
            'index': idx
        })

print(f"  Duplicates: {len(pbg_issues['duplicates'])}")
for dup in pbg_issues['duplicates']:
    print(f"    • {dup['title']} (x{dup['count']})")
    for h in dup['handles']:
        print(f"      - {h}")

print(f"  Missing images: {len(pbg_issues['no_image'])}")
for item in pbg_issues['no_image'][:10]:
    print(f"    • {item['title']}")

print(f"  Missing prices: {len(pbg_issues['no_price'])}")
for item in pbg_issues['no_price'][:5]:
    print(f"    • {item['title']}")

print(f"  Missing SKUs: {len(pbg_issues['no_sku'])}")
for item in pbg_issues['no_sku'][:5]:
    print(f"    • {item['title']}")

# Save detailed report
report = {
    'multimix': multimix_issues,
    'premium_builder_gel': pbg_issues,
    'summary': {
        'multimix_total': len(multimix),
        'multimix_issues': sum(len(v) for v in multimix_issues.values()),
        'pbg_total': len(pbg),
        'pbg_issues': sum(len(v) for v in pbg_issues.values())
    }
}

with open('product-category-issues.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)

print(f"\n✓ Detailed report: product-category-issues.json")
