#!/usr/bin/env python3
"""
Find and report Premium Builder Gel and Brush on Builder issues
"""

import csv
from collections import defaultdict
import json

products = []
with open('products_export_1.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    products = list(reader)

issues = {
    "premium_builder_gels": {
        "total": 0,
        "no_image": [],
        "no_price": [],
        "issues": []
    },
    "brush_on_builder": {
        "total": 0,
        "duplicates": [],
        "no_image": [],
        "no_price": [],
        "issues": []
    }
}

# Analyze Premium Builder Gel products
pbg = [p for p in products if 'premium builder gel' in p.get('Title', '').lower()]
issues["premium_builder_gels"]["total"] = len(pbg)

for p in pbg:
    has_image = bool(p.get('Image Src', '').strip())
    has_price = bool(p.get('Price', '').strip())
    
    if not has_image:
        issues["premium_builder_gels"]["no_image"].append({
            "title": p.get('Title', ''),
            "sku": p.get('SKU', ''),
            "handle": p.get('Handle', '')
        })
    
    if not has_price:
        issues["premium_builder_gels"]["no_price"].append({
            "title": p.get('Title', ''),
            "sku": p.get('SKU', '')
        })

# Analyze Brush on Builder products
bob = [p for p in products if 'brush on builder' in p.get('Title', '').lower()]
issues["brush_on_builder"]["total"] = len(bob)

bob_by_name = defaultdict(list)
for p in bob:
    title = p.get('Title', '')
    bob_by_name[title].append(p)

for name, items in sorted(bob_by_name.items()):
    if len(items) > 1:
        issues["brush_on_builder"]["duplicates"].append({
            "name": name,
            "count": len(items),
            "products": [{"sku": p.get('SKU'), "handle": p.get('Handle')} for p in items]
        })

for p in bob:
    has_image = bool(p.get('Image Src', '').strip())
    if not has_image:
        issues["brush_on_builder"]["no_image"].append({
            "title": p.get('Title', ''),
            "sku": p.get('SKU', '')
        })
    
    has_price = bool(p.get('Price', '').strip())
    if not has_price:
        issues["brush_on_builder"]["no_price"].append({
            "title": p.get('Title', ''),
            "sku": p.get('SKU', '')
        })

# Print report
print("\n" + "="*80)
print("PREMIUM BUILDER GEL & BRUSH ON BUILDER ANALYSIS")
print("="*80)

print(f"\nPREMIUM BUILDER GEL:")
print(f"  Total Products: {issues['premium_builder_gels']['total']}")
print(f"  Missing Images: {len(issues['premium_builder_gels']['no_image'])}")
if issues['premium_builder_gels']['no_image']:
    for item in issues['premium_builder_gels']['no_image']:
        print(f"    • {item['title']}")

print(f"\nBRUSH ON BUILDER:")
print(f"  Total Products: {issues['brush_on_builder']['total']}")
print(f"  Duplicates: {len(issues['brush_on_builder']['duplicates'])}")
if issues['brush_on_builder']['duplicates']:
    for dup in issues['brush_on_builder']['duplicates']:
        print(f"    • {dup['name']} (x{dup['count']})")

print(f"  Missing Images: {len(issues['brush_on_builder']['no_image'])}")
if issues['brush_on_builder']['no_image']:
    for item in issues['brush_on_builder']['no_image'][:5]:
        print(f"    • {item['title']}")

print(f"  Missing Prices: {len(issues['brush_on_builder']['no_price'])}")
if issues['brush_on_builder']['no_price']:
    for item in issues['brush_on_builder']['no_price'][:5]:
        print(f"    • {item['title']}")

# Save detailed report
with open('builder-gel-issues-report.json', 'w', encoding='utf-8') as f:
    json.dump(issues, f, indent=2)

print(f"\n✓ Detailed report saved: builder-gel-issues-report.json")
