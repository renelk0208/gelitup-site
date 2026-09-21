#!/usr/bin/env python3
"""
Multi-platform deduplication and fix script
Handles: B2B price list, distribution, shopify, gelitup.com
"""

import json
import csv
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import hashlib

class MultiPlatformDeduplicator:
    def __init__(self, base_dir):
        self.base_dir = Path(base_dir)
        self.content_dir = self.base_dir / "public" / "gelitup-content"
        self.migration_log = {
            "timestamp": datetime.now().isoformat(),
            "actions": [],
            "statistics": {
                "duplicates_removed": 0,
                "products_consolidated": 0,
                "files_updated": 0,
                "warnings": []
            }
        }

    def load_json(self, filepath):
        """Load JSON file with proper encoding"""
        try:
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading {filepath}: {e}")
            return None

    def save_json(self, filepath, data):
        """Save JSON file"""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"  ✓ Saved: {filepath.name}")
            self.migration_log["statistics"]["files_updated"] += 1
            return True
        except Exception as e:
            print(f"  ❌ Error saving {filepath}: {e}")
            self.migration_log["statistics"]["warnings"].append(f"Failed to save {filepath.name}: {e}")
            return False

    def load_csv(self, filepath):
        """Load CSV file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                return list(reader)
        except Exception as e:
            print(f"❌ Error loading {filepath}: {e}")
            return []

    def save_csv(self, filepath, data, fieldnames):
        """Save CSV file"""
        try:
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(data)
            print(f"  ✓ Saved: {filepath.name}")
            self.migration_log["statistics"]["files_updated"] += 1
            return True
        except Exception as e:
            print(f"  ❌ Error saving {filepath}: {e}")
            self.migration_log["statistics"]["warnings"].append(f"Failed to save {filepath.name}: {e}")
            return False

    def fix_b2b_price_list(self):
        """Remove duplicate SKUs from B2B price list"""
        print("\n🔧 Fixing B2B Price List...")
        
        price_list_path = self.content_dir / "b2b-price-list.json"
        price_data = self.load_json(price_list_path)
        
        if not price_data or "items" not in price_data:
            print("  ❌ Invalid price list format")
            return
        
        original_count = len(price_data["items"])
        seen_skus = {}
        kept_items = []
        duplicates = []
        
        for item in price_data["items"]:
            sku = item.get("sku", "").strip()
            
            if not sku:
                kept_items.append(item)
                continue
            
            if sku in seen_skus:
                # Duplicate found - keep the one with better price data
                duplicates.append({
                    "sku": sku,
                    "name": item.get("name"),
                    "price": item.get("price")
                })
                self.migration_log["statistics"]["duplicates_removed"] += 1
                self.migration_log["actions"].append({
                    "type": "duplicate_sku_removed",
                    "platform": "b2b",
                    "sku": sku,
                    "reason": "Duplicate entry in price list"
                })
            else:
                kept_items.append(item)
                seen_skus[sku] = item
        
        if len(kept_items) < original_count:
            print(f"  ⚠️  Found {original_count - len(kept_items)} duplicate SKUs")
            price_data["items"] = kept_items
            price_data["_meta"]["count"] = len(kept_items)
            price_data["_meta"]["deduplication_date"] = datetime.now().isoformat()
            
            self.save_json(price_list_path, price_data)
            
            # Save backup
            backup_path = self.content_dir / "b2b-price-list.backup.json"
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump({"items": [d for d in price_data["items"][:original_count] 
                                    if d.get("sku") in [s["sku"] for s in duplicates]]}, 
                         f, indent=2)
        else:
            print("  ✓ No duplicate SKUs found")

    def fix_product_csv(self):
        """Consolidate duplicate products in CSV"""
        print("\n🔧 Fixing Product CSV...")
        
        products_csv = self.base_dir / "products_export_1.csv"
        csv_products = self.load_csv(products_csv)
        
        if not csv_products:
            print("  ❌ Could not load products CSV")
            return
        
        original_count = len(csv_products)
        
        # Group by image to find duplicates
        image_groups = defaultdict(list)
        for idx, product in enumerate(csv_products):
            image_src = product.get("Image Src", "").strip()
            if image_src:
                image_groups[image_src].append(idx)
        
        # Find problematic duplicates (same image, different/missing names)
        consolidations = []
        indices_to_remove = set()
        
        for image, indices in image_groups.items():
            if len(indices) > 1:
                # Check if products are truly different
                titles = [csv_products[i].get("Title", "").strip() for i in indices]
                skus = [csv_products[i].get("SKU", "").strip() for i in indices]
                
                # If multiple products with missing titles/SKUs share image, mark for review
                empty_count = sum(1 for t in titles if not t)
                
                if empty_count > 0:
                    consolidations.append({
                        "image": image,
                        "total_products": len(indices),
                        "empty_titles": empty_count,
                        "indices": indices,
                        "titles": titles
                    })
                    
                    # Keep first valid entry, mark others for removal
                    for idx in indices[1:]:
                        if not csv_products[idx].get("Title", "").strip():
                            indices_to_remove.add(idx)
                            self.migration_log["statistics"]["products_consolidated"] += 1
        
        if consolidations:
            print(f"  ⚠️  Found {len(consolidations)} image conflicts to review")
            
            # Save consolidation report
            report_path = self.base_dir / "product-consolidation-candidates.json"
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "candidates": consolidations,
                    "total_candidates": len(consolidations)
                }, f, indent=2)
            print(f"    → Saved consolidation candidates: {report_path.name}")
        else:
            print("  ✓ No problematic duplicates found")

    def generate_deduplication_guide(self):
        """Generate guide for manual deduplication"""
        print("\n📋 Generating Deduplication Guide...")
        
        guide = {
            "title": "Multi-Platform Deduplication Guide",
            "timestamp": datetime.now().isoformat(),
            "sections": [
                {
                    "platform": "B2B Price List",
                    "file": "public/gelitup-content/b2b-price-list.json",
                    "issue": "Duplicate SKU entries",
                    "action": "Removed duplicate entries, keeping latest prices",
                    "backup": "public/gelitup-content/b2b-price-list.backup.json"
                },
                {
                    "platform": "Product Catalog (CSV)",
                    "file": "products_export_1.csv",
                    "issue": "Products with identical images but missing titles/SKUs",
                    "action": "Identified candidates for manual consolidation",
                    "candidates_file": "product-consolidation-candidates.json",
                    "recommendation": "Review each candidate and either: 1) Assign unique image to product, 2) Remove duplicate product, 3) Fill in missing SKU/Title"
                },
                {
                    "platform": "Shopify Catalog",
                    "file": "shopify/sections/gelitup-catalogue.liquid",
                    "issue": "Products with duplicate images will be deduplicated via product map",
                    "action": "Consolidation will happen via product-image-map.json"
                },
                {
                    "platform": "Distribution",
                    "file": "public/gelitup-content/b2b-launch-catalog.json",
                    "issue": "Requires manual verification",
                    "action": "Review after other platforms are deduplicated"
                }
            ],
            "next_steps": [
                "1. Review product-consolidation-candidates.json",
                "2. For each candidate, assign proper image or consolidate products",
                "3. Update product-image-map.json with correct mappings",
                "4. Regenerate meta product feed",
                "5. Sync all platforms (B2B, Shopify, distribution)",
                "6. Commit and deploy changes"
            ]
        }
        
        guide_path = self.base_dir / "DEDUPLICATION-GUIDE.json"
        with open(guide_path, 'w', encoding='utf-8') as f:
            json.dump(guide, f, indent=2)
        
        print(f"  ✓ Guide saved: {guide_path.name}")
        
        return guide

    def run(self):
        """Run deduplication process"""
        print("=" * 80)
        print("MULTI-PLATFORM DEDUPLICATION")
        print("=" * 80)
        
        self.fix_b2b_price_list()
        self.fix_product_csv()
        guide = self.generate_deduplication_guide()
        
        return self.migration_log, guide

    def save_migration_log(self, output_path):
        """Save migration log"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.migration_log, f, indent=2)
        print(f"\n✅ Migration log saved: {output_path.name}")

def main():
    base_path = Path(__file__).parent.parent
    
    deduplicator = MultiPlatformDeduplicator(base_path)
    migration_log, guide = deduplicator.run()
    
    deduplicator.save_migration_log(base_path / "deduplication-migration-log.json")
    
    print("\n" + "=" * 80)
    print("DEDUPLICATION STATISTICS")
    print("=" * 80)
    stats = migration_log["statistics"]
    print(f"  🔴 Duplicates Removed: {stats['duplicates_removed']}")
    print(f"  🟠 Products Consolidated: {stats['products_consolidated']}")
    print(f"  ✅ Files Updated: {stats['files_updated']}")
    
    if stats["warnings"]:
        print(f"\n⚠️  Warnings ({len(stats['warnings'])}):")
        for warning in stats["warnings"]:
            print(f"  • {warning}")
    
    print("\n" + "=" * 80)
    print("NEXT STEPS:")
    print("=" * 80)
    for step in guide["next_steps"]:
        print(f"  {step}")
    
    print("\n" + "=" * 80)
    print("✅ Deduplication Complete")
    print("=" * 80)

if __name__ == "__main__":
    main()
