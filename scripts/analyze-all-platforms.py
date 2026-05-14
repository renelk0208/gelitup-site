#!/usr/bin/env python3
"""
Multi-platform duplicate image and pricing analysis
Covers: B2B, Distribution, Shopify, gelitup.com catalog
"""

import json
import csv
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import hashlib

class MultiPlatformAnalyzer:
    def __init__(self, base_dir):
        self.base_dir = Path(base_dir)
        self.content_dir = self.base_dir / "public" / "gelitup-content"
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "platforms": {
                "b2b": {},
                "distribution": {},
                "shopify": {},
                "gelitup_com": {}
            },
            "cross_platform_issues": {
                "image_duplicates_across_platforms": [],
                "pricing_gaps": [],
                "exact_product_duplicates": []
            },
            "summary": {}
        }

    def load_json(self, filepath):
        """Load JSON file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading {filepath}: {e}")
            return None

    def load_csv(self, filepath):
        """Load CSV file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                return list(reader)
        except Exception as e:
            print(f"❌ Error loading {filepath}: {e}")
            return []

    def image_hash(self, image_path):
        """Generate hash from image path for duplicate detection"""
        return hashlib.md5(image_path.encode()).hexdigest()

    def analyze_b2b_platform(self):
        """Analyze B2B platform (CSV + price list JSON)"""
        print("\n📊 Analyzing B2B Platform...")
        
        # Load price list JSON
        price_list_path = self.content_dir / "b2b-price-list.json"
        price_data = self.load_json(price_list_path)
        
        b2b_products = {}
        prices_by_sku = {}
        duplicates_b2b = []
        missing_prices = []
        image_dups = defaultdict(list)
        
        if price_data and "items" in price_data:
            for item in price_data["items"]:
                sku = item.get("sku", "").strip()
                name = item.get("name", "").strip()
                price = item.get("price", 0)
                
                if sku:
                    if sku in b2b_products:
                        duplicates_b2b.append({
                            "sku": sku,
                            "name": name,
                            "price": price
                        })
                    else:
                        b2b_products[sku] = {
                            "name": name,
                            "price": price
                        }
                        prices_by_sku[sku] = price
                
                if price == 0:
                    missing_prices.append({
                        "sku": sku,
                        "name": name,
                        "price": price
                    })
        
        # Load products CSV for image analysis
        products_csv = self.base_dir / "products_export_1.csv"
        csv_products = self.load_csv(products_csv)
        
        for product in csv_products:
            image_src = product.get("Image Src", "").strip()
            sku = product.get("SKU", "").strip() or product.get("Vendor SKU", "").strip()
            
            if image_src:
                img_hash = self.image_hash(image_src)
                image_dups[img_hash].append({
                    "image": image_src,
                    "sku": sku,
                    "title": product.get("Title", "")
                })
        
        # Filter image duplicates (same image, different products)
        image_duplicates = [
            {
                "image": list(items)[0]["image"],
                "count": len(items),
                "products": items
            }
            for items in image_dups.values() if len(items) > 1
        ]
        
        self.report["platforms"]["b2b"] = {
            "total_products": len(b2b_products),
            "total_csv_products": len(csv_products),
            "exact_duplicates": len(duplicates_b2b),
            "products_with_zero_price": len([x for x in missing_prices if x["price"] == 0]),
            "image_duplicates": len(image_duplicates),
            "issues": {
                "duplicates": duplicates_b2b[:10],  # First 10
                "zero_price": [x for x in missing_prices if x["price"] == 0][:10],
                "image_duplicates": image_duplicates[:10]
            }
        }
        
        print(f"  ✓ B2B: {len(b2b_products)} products, {len(image_duplicates)} image duplicates")
        return b2b_products, prices_by_sku

    def analyze_distribution_platform(self):
        """Analyze Distribution platform (B2B launch catalog)"""
        print("\n📊 Analyzing Distribution Platform...")
        
        dist_catalog = self.content_dir / "b2b-launch-catalog.json"
        dist_data = self.load_json(dist_catalog)
        
        dist_products = {}
        duplicates = []
        image_dups = defaultdict(list)
        
        if dist_data and isinstance(dist_data, dict):
            for category_key, category_data in dist_data.items():
                if isinstance(category_data, dict) and "items" in category_data:
                    for item in category_data["items"]:
                        item_id = item.get("id", "")
                        name = item.get("name", "")
                        image = item.get("image", "")
                        
                        if item_id:
                            if item_id in dist_products:
                                duplicates.append({"id": item_id, "name": name})
                            else:
                                dist_products[item_id] = {"name": name, "image": image}
                        
                        if image:
                            img_hash = self.image_hash(image)
                            image_dups[img_hash].append({
                                "image": image,
                                "id": item_id,
                                "name": name
                            })
        
        image_duplicates = [
            {
                "image": list(items)[0]["image"],
                "count": len(items),
                "products": items
            }
            for items in image_dups.values() if len(items) > 1
        ]
        
        self.report["platforms"]["distribution"] = {
            "total_products": len(dist_products),
            "exact_duplicates": len(duplicates),
            "image_duplicates": len(image_duplicates),
            "issues": {
                "duplicates": duplicates[:10],
                "image_duplicates": image_duplicates[:10]
            }
        }
        
        print(f"  ✓ Distribution: {len(dist_products)} products, {len(image_duplicates)} image duplicates")
        return dist_products

    def analyze_gelitup_catalog(self):
        """Analyze gelitup.com catalog (spring-summer-catalogue.json)"""
        print("\n📊 Analyzing GEL.IT.UP Catalog...")
        
        catalog_file = self.content_dir / "spring-summer-catalogue.json"
        catalog_data = self.load_json(catalog_file)
        
        catalog_products = {}
        duplicates = []
        image_dups = defaultdict(list)
        missing_prices = []
        
        if catalog_data and isinstance(catalog_data, list):
            for product in catalog_data:
                sku = product.get("sku", "").strip()
                name = product.get("name", "").strip()
                price = product.get("price", 0)
                images = product.get("images", [])
                
                if sku:
                    if sku in catalog_products:
                        duplicates.append({"sku": sku, "name": name})
                    else:
                        catalog_products[sku] = {
                            "name": name,
                            "price": price,
                            "images": images
                        }
                
                if price == 0:
                    missing_prices.append({
                        "sku": sku,
                        "name": name,
                        "price": price
                    })
                
                for image in images:
                    img_hash = self.image_hash(image)
                    image_dups[img_hash].append({
                        "image": image,
                        "sku": sku,
                        "name": name
                    })
        
        image_duplicates = [
            {
                "image": list(items)[0]["image"],
                "count": len(items),
                "products": items
            }
            for items in image_dups.values() if len(items) > 1
        ]
        
        self.report["platforms"]["gelitup_com"] = {
            "total_products": len(catalog_products),
            "exact_duplicates": len(duplicates),
            "products_with_zero_price": len([x for x in missing_prices if x["price"] == 0]),
            "image_duplicates": len(image_duplicates),
            "issues": {
                "duplicates": duplicates[:10],
                "zero_price": [x for x in missing_prices if x["price"] == 0][:10],
                "image_duplicates": image_duplicates[:10]
            }
        }
        
        print(f"  ✓ Catalog: {len(catalog_products)} products, {len(image_duplicates)} image duplicates")
        return catalog_products

    def cross_platform_analysis(self, b2b_products, dist_products, catalog_products):
        """Analyze cross-platform issues"""
        print("\n🔄 Analyzing Cross-Platform Issues...")
        
        # Find products in multiple platforms with same image
        # Find pricing inconsistencies
        # Find duplicate SKUs across platforms
        
        self.report["cross_platform_issues"] = {
            "total_unique_products_across_platforms": len(
                set(list(b2b_products.keys()) + 
                    list(dist_products.keys()) + 
                    list(catalog_products.keys()))
            )
        }
        
        print(f"  ✓ Found {self.report['cross_platform_issues']['total_unique_products_across_platforms']} unique products across platforms")

    def generate_summary(self):
        """Generate summary statistics"""
        platforms = self.report["platforms"]
        
        total_dupes = sum(p.get("exact_duplicates", 0) for p in platforms.values())
        total_images = sum(p.get("image_duplicates", 0) for p in platforms.values())
        total_zero_price = sum(p.get("products_with_zero_price", 0) for p in platforms.values())
        
        self.report["summary"] = {
            "total_platforms_analyzed": len(platforms),
            "total_exact_duplicates_across_platforms": total_dupes,
            "total_image_duplicates_across_platforms": total_images,
            "total_products_with_zero_price": total_zero_price,
            "platforms_affected": list(platforms.keys())
        }
        
        return self.report

    def run(self):
        """Run complete analysis"""
        print("=" * 80)
        print("MULTI-PLATFORM PRODUCT ANALYSIS")
        print("=" * 80)
        
        b2b_products, prices = self.analyze_b2b_platform()
        dist_products = self.analyze_distribution_platform()
        catalog_products = self.analyze_gelitup_catalog()
        
        self.cross_platform_analysis(b2b_products, dist_products, catalog_products)
        self.generate_summary()
        
        return self.report

    def save_report(self, output_path):
        """Save report to file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Report saved: {output_path}")

def print_summary(report):
    """Print summary to console"""
    summary = report["summary"]
    
    print("\n" + "=" * 80)
    print("ANALYSIS SUMMARY")
    print("=" * 80)
    print(f"\nPlatforms Analyzed: {summary['total_platforms_analyzed']}")
    print(f"  • B2B: {report['platforms']['b2b']['total_products']} products")
    print(f"  • Distribution: {report['platforms']['distribution']['total_products']} products")
    print(f"  • GEL.IT.UP Catalog: {report['platforms']['gelitup_com']['total_products']} products")
    print(f"\nIssues Found:")
    print(f"  🔴 Exact Duplicates: {summary['total_exact_duplicates_across_platforms']}")
    print(f"  🟠 Image Duplicates: {summary['total_image_duplicates_across_platforms']}")
    print(f"  🟡 Zero Price Products: {summary['total_products_with_zero_price']}")
    
    for platform, data in report["platforms"].items():
        if data.get("image_duplicates", 0) > 0:
            print(f"\n  {platform.upper()}:")
            print(f"    - Image duplicates: {data['image_duplicates']}")
            if data.get("issues", {}).get("image_duplicates"):
                for dup in data["issues"]["image_duplicates"][:3]:
                    print(f"      • {len(dup['products'])} products share image")

if __name__ == "__main__":
    base_path = Path(__file__).parent.parent
    
    analyzer = MultiPlatformAnalyzer(base_path)
    report = analyzer.run()
    
    output_file = base_path / "multi-platform-analysis-report.json"
    analyzer.save_report(output_file)
    
    print_summary(report)
    
    print("\n" + "=" * 80)
    print("✅ Analysis Complete")
    print("=" * 80)
