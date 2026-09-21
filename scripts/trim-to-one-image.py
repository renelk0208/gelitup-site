"""
trim-to-one-image.py
Keep only the first (title) row per product handle, dropping all extra image rows.
Input:  products_export_1_with_families.csv
Output: products_export_1_one_image.csv
"""

import csv
from collections import OrderedDict

INPUT  = "products_export_1_with_families.csv"
OUTPUT = "products_export_1_one_image.csv"

with open(INPUT, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

seen = set()
kept = []
dropped = 0

for row in rows:
    handle = row["Handle"]
    if handle not in seen:
        seen.add(handle)
        kept.append(row)
    else:
        dropped += 1

with open(OUTPUT, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(kept)

print(f"Input rows  : {len(rows)}")
print(f"Output rows : {len(kept)}")
print(f"Dropped     : {dropped} extra image rows")
print(f"Saved → {OUTPUT}")
