#!/usr/bin/env python3
"""
Check what's actually being served in the product feed for Multimix and PBG
"""

import xml.etree.ElementTree as ET

# Parse the XML feed
tree = ET.parse('./dist/meta-product-feed.xml')
root = tree.getroot()

# Define namespace
ns = {'g': 'http://base.google.com/ns/1.0'}

# Find all items
items = root.findall('.//item')

print(f"Total items in feed: {len(items)}")

# Filter for Multimix and PBG
multimix_items = []
pbg_items = []

for item in items:
    title_elem = item.find('title')
    title = title_elem.text if title_elem is not None else ''
    
    if 'multimix' in title.lower():
        multimix_items.append(item)
    elif 'premium' in title.lower() and 'builder' in title.lower():
        pbg_items.append(item)

print(f"\nMultimix items in feed: {len(multimix_items)}")
print(f"PBG items in feed: {len(pbg_items)}")

# Check for missing data
def check_item(item):
    """Check if item has required fields"""
    title = item.find('title').text if item.find('title') is not None else ''
    
    # Check Google Feed Namespace fields
    price = item.find('{http://base.google.com/ns/1.0}price')
    image = item.find('{http://base.google.com/ns/1.0}image_link')
    availability = item.find('{http://base.google.com/ns/1.0}availability')
    link = item.find('link')
    
    return {
        'title': title,
        'has_price': price is not None and price.text,
        'has_image': image is not None and image.text,
        'has_availability': availability is not None and availability.text,
        'has_link': link is not None and link.text,
        'price': price.text if price is not None else None,
        'image': image.text if image is not None else None,
    }

# Check Multimix items
mm_issues = {
    'no_price': [],
    'no_image': [],
    'no_availability': [],
    'duplicates': {}
}

mm_titles = {}
for item in multimix_items:
    data = check_item(item)
    title = data['title']
    
    # Track for duplicates
    if title not in mm_titles:
        mm_titles[title] = 0
    mm_titles[title] += 1
    
    if not data['has_price']:
        mm_issues['no_price'].append(data)
    if not data['has_image']:
        mm_issues['no_image'].append(data)
    if not data['has_availability']:
        mm_issues['no_availability'].append(data)

# Find actual duplicates
mm_issues['duplicates'] = {k: v for k, v in mm_titles.items() if v > 1}

# Check PBG items
pbg_issues = {
    'no_price': [],
    'no_image': [],
    'no_availability': [],
    'duplicates': {}
}

pbg_titles = {}
for item in pbg_items:
    data = check_item(item)
    title = data['title']
    
    if title not in pbg_titles:
        pbg_titles[title] = 0
    pbg_titles[title] += 1
    
    if not data['has_price']:
        pbg_issues['no_price'].append(data)
    if not data['has_image']:
        pbg_issues['no_image'].append(data)
    if not data['has_availability']:
        pbg_issues['no_availability'].append(data)

pbg_issues['duplicates'] = {k: v for k, v in pbg_titles.items() if v > 1}

# Print report
print("\n" + "="*80)
print("MULTIMIX FEED ANALYSIS")
print("="*80)
print(f"No prices: {len(mm_issues['no_price'])}")
print(f"No images: {len(mm_issues['no_image'])}")
print(f"No availability: {len(mm_issues['no_availability'])}")
print(f"Duplicates: {len(mm_issues['duplicates'])}")
if mm_issues['duplicates']:
    for k, v in mm_issues['duplicates'].items():
        print(f"  • {k} - x{v}")

print("\n" + "="*80)
print("PREMIUM BUILDER GEL FEED ANALYSIS")
print("="*80)
print(f"No prices: {len(pbg_issues['no_price'])}")
if pbg_issues['no_price']:
    for item in pbg_issues['no_price'][:5]:
        print(f"  • {item['title']}")

print(f"No images: {len(pbg_issues['no_image'])}")
if pbg_issues['no_image']:
    for item in pbg_issues['no_image'][:10]:
        print(f"  • {item['title']}")

print(f"No availability: {len(pbg_issues['no_availability'])}")
print(f"Duplicates: {len(pbg_issues['duplicates'])}")
if pbg_issues['duplicates']:
    for k, v in pbg_issues['duplicates'].items():
        print(f"  • {k} - x{v}")

# Save report
import json
with open('feed-validation-report.json', 'w', encoding='utf-8') as f:
    json.dump({
        'multimix': mm_issues,
        'pbg': pbg_issues
    }, f, indent=2)

print(f"\n✓ Detailed report: feed-validation-report.json")
