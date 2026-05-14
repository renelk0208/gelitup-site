#!/usr/bin/env python3
"""
Check BoB/Brush on Builder pricing issues
"""

import csv
import json
from collections import Counter

# Load price list
with open('./public/gelitup-content/b2b-price-list.json', 'r', encoding='utf-8') as f:
    price_data = json.load(f)

# Load products CSV
with open('./products_export_1.csv', 'r', encoding='utf-8') as f:
    csv_reader = csv.DictReader(f)
    products = list(csv_reader)

# Find BoB products in price list
bob_prices = [item for item in price_data.get('items', []) 
              if 'brush on builder' in item.get('name', '').lower()]

print("\n" + "="*80)
print("BRUSH ON BUILDER (BoB) ANALYSIS")
print("="*80)

print(f"\nPrice List:")
print(f"  Total BoB SKUs: {len(bob_prices)}")
print(f"  Sample prices:")
for item in bob_prices[:5]:
    print(f"    • {item.get('name')} - €{item.get('price')}")

# Check for duplicates in price list
bob_names = [item.get('name') for item in bob_prices]
price_duplicates = {k: v for k, v in Counter(bob_names).items() if v > 1}
print(f"  Duplicates in price list: {len(price_duplicates)}")
for name, count in price_duplicates.items():
    print(f"    • {name} - x{count}")

# Find BoB in CSV
print(f"\nProduct CSV:")
bob_csv = [p for p in products 
           if 'brush on builder' in p.get('Title', '').lower()]
print(f"  Total BoB products: {len(bob_csv)}")

# Check prices in CSV
csv_with_prices = [p for p in bob_csv if p.get('Price', '').strip()]
csv_no_prices = [p for p in bob_csv if not p.get('Price', '').strip()]

print(f"  With prices in CSV: {len(csv_with_prices)}")
print(f"  Missing prices in CSV: {len(csv_no_prices)}")

if csv_no_prices:
    print(f"\n  Missing prices:")
    for p in csv_no_prices[:5]:
        print(f"    • {p.get('Title')} (SKU: {p.get('SKU')})")

# Find duplicates in CSV
csv_titles = [p.get('Title') for p in bob_csv]
csv_duplicates = {k: v for k, v in Counter(csv_titles).items() if v > 1}
print(f"\n  Duplicates in CSV: {len(csv_duplicates)}")
for name, count in csv_duplicates.items():
    print(f"    • {name} - x{count}")
    # Show which ones are duplicates
    dups = [p for p in bob_csv if p.get('Title') == name]
    for d in dups:
        print(f"      - Handle: {d.get('Handle')}, SKU: {d.get('SKU')}")
