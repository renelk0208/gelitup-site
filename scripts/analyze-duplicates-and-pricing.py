#!/usr/bin/env python3
"""
Analyze product catalog for:
1. Duplicates (same name, SKU, or image)
2. Missing/zero pricing
3. Generate report with recommendations
"""

import json
import csv
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Define paths
DATA_DIR = Path(__file__).parent.parent / "public" / "gelitup-content"
PRODUCTS_CSV = Path(__file__).parent.parent / "products_export_1.csv"
PRICE_LIST_JSON = DATA_DIR / "b2b-price-list.json"
OUTPUT_REPORT = Path(__file__).parent.parent / "duplicate-and-pricing-report.json"

def load_json(filepath):
    """Load JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return None

def load_csv(filepath):
    """Load CSV file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            return list(reader)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return []

def analyze_products():
    """Analyze products for duplicates and pricing issues"""
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "duplicates": [],
        "zero_pricing": [],
        "missing_pricing": [],
        "potential_duplicates": [],
        "image_duplicates": [],
        "summary": {}
    }
    
    # Try loading from multiple sources
    products = []
    prices_by_sku = {}
    
    # Load price list
    print("Loading price list...")
    price_data = load_json(PRICE_LIST_JSON)
    if price_data and isinstance(price_data, list):
        for item in price_data:
            sku = item.get('sku', '').strip()
            price = item.get('price', 0)
            if sku:
                if sku not in prices_by_sku:
                    prices_by_sku[sku] = {
                        'price': price,
                        'name': item.get('name', ''),
                        'count': 1
                    }
                else:
                    prices_by_sku[sku]['count'] += 1
    
    print(f"Loaded {len(prices_by_sku)} SKUs from price list")
    
    # Load products CSV
    print("Loading products CSV...")
    csv_products = load_csv(PRODUCTS_CSV) if PRODUCTS_CSV.exists() else []
    if csv_products:
        products = csv_products
    
    print(f"Loaded {len(products)} products from CSV")
    
    if not products:
        print("ERROR: No products found!")
        return None
    
    # Analyze for duplicates and pricing
    seen_names = defaultdict(list)
    seen_skus = defaultdict(list)
    seen_images = defaultdict(list)
    
    for idx, product in enumerate(products):
        name = product.get('Title', '').strip()
        sku = product.get('SKU', '').strip()
        vendor_sku = product.get('Vendor SKU', '').strip()
        image_src = product.get('Image Src', '').strip()
        
        # Track by name
        if name:
            seen_names[name].append(idx)
        
        # Track by SKU
        if sku:
            seen_skus[sku].append(idx)
        
        # Track by vendor SKU
        if vendor_sku and vendor_sku != sku:
            seen_skus[vendor_sku].append(idx)
        
        # Track by image
        if image_src:
            seen_images[image_src].append(idx)
        
        # Check pricing
        price_info = prices_by_sku.get(sku) or prices_by_sku.get(vendor_sku)
        
        if not price_info:
            report["missing_pricing"].append({
                "index": idx,
                "title": name,
                "sku": sku,
                "vendor_sku": vendor_sku,
                "handle": product.get('Handle', '')
            })
        elif price_info.get('price') == 0:
            report["zero_pricing"].append({
                "index": idx,
                "title": name,
                "sku": sku,
                "vendor_sku": vendor_sku,
                "handle": product.get('Handle', ''),
                "price": price_info.get('price')
            })
    
    # Find exact duplicates (same name and SKU)
    for name, indices in seen_names.items():
        if len(indices) > 1:
            skus = [products[i].get('SKU', '') for i in indices]
            if len(set(skus)) == 1:  # Same SKU = exact duplicate
                report["duplicates"].append({
                    "name": name,
                    "sku": skus[0],
                    "count": len(indices),
                    "indices": indices
                })
    
    # Find similar products (same name, different SKU or images)
    for name, indices in seen_names.items():
        if len(indices) > 1:
            duplicates = report["duplicates"]
            if not any(d["name"] == name for d in duplicates):
                skus = [products[i].get('SKU', '') for i in indices]
                if len(set(skus)) > 1:  # Different SKUs = potential duplicate
                    report["potential_duplicates"].append({
                        "name": name,
                        "count": len(indices),
                        "skus": list(set(skus)),
                        "indices": indices
                    })
    
    # Find image duplicates
    for image, indices in seen_images.items():
        if len(indices) > 1:
            names = [products[i].get('Title', '') for i in indices]
            skus = [products[i].get('SKU', '') for i in indices]
            if len(set(names)) > 1:  # Different names, same image
                report["image_duplicates"].append({
                    "image": image,
                    "count": len(indices),
                    "names": list(set(names)),
                    "skus": list(set(skus)),
                    "indices": indices
                })
    
    # Summary
    report["summary"] = {
        "total_products": len(products),
        "total_skus_with_pricing": len(prices_by_sku),
        "exact_duplicates_found": len(report["duplicates"]),
        "potential_duplicates_found": len(report["potential_duplicates"]),
        "image_duplicates_found": len(report["image_duplicates"]),
        "products_with_zero_price": len(report["zero_pricing"]),
        "products_with_missing_price": len(report["missing_pricing"])
    }
    
    return report

def print_report(report):
    """Print human-readable report"""
    print("\n" + "="*80)
    print("PRODUCT CATALOG ANALYSIS REPORT")
    print("="*80)
    
    summary = report["summary"]
    print(f"\nSUMMARY:")
    print(f"  Total Products: {summary['total_products']}")
    print(f"  Total SKUs with Pricing: {summary['total_skus_with_pricing']}")
    print(f"  Exact Duplicates: {summary['exact_duplicates_found']}")
    print(f"  Potential Duplicates: {summary['potential_duplicates_found']}")
    print(f"  Image Duplicates: {summary['image_duplicates_found']}")
    print(f"  Products with €0.00 Price: {summary['products_with_zero_price']}")
    print(f"  Products with Missing Price: {summary['products_with_missing_price']}")
    
    if report["duplicates"]:
        print(f"\n\nEXACT DUPLICATES ({len(report['duplicates'])}):")
        for dup in report["duplicates"]:
            print(f"  • {dup['name']}")
            print(f"    SKU: {dup['sku']}, Count: {dup['count']}, Indices: {dup['indices']}")
    
    if report["zero_pricing"]:
        print(f"\n\nPRODUCTS WITH €0.00 PRICE ({len(report['zero_pricing'])}):")
        for prod in report["zero_pricing"][:20]:  # Show first 20
            print(f"  • {prod['title']}")
            print(f"    SKU: {prod['sku']}, Handle: {prod['handle']}")
    
    if report["missing_pricing"]:
        print(f"\n\nPRODUCTS WITH MISSING PRICE ({len(report['missing_pricing'])}):")
        for prod in report["missing_pricing"][:20]:  # Show first 20
            print(f"  • {prod['title']}")
            print(f"    SKU: {prod['sku']}, Vendor SKU: {prod['vendor_sku']}")
    
    if report["potential_duplicates"]:
        print(f"\n\nPOTENTIAL DUPLICATES ({len(report['potential_duplicates'])}):")
        for dup in report["potential_duplicates"][:20]:  # Show first 20
            print(f"  • {dup['name']}")
            print(f"    SKUs: {', '.join(dup['skus'])}, Count: {dup['count']}")

if __name__ == "__main__":
    print("Starting product analysis...")
    
    report = analyze_products()
    
    if report:
        # Save JSON report
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\nJSON report saved to: {OUTPUT_REPORT}")
        
        # Print human-readable report
        print_report(report)
    else:
        print("Failed to generate report")
