import csv
import re
import sys

def to_handle(name):
    """Convert a product name to a Shopify-style handle."""
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s

# ── build lookup: handle → colour_family ──────────────────────────────────
family_by_handle = {}
with open('solid-gel-polish-colour-families.csv', newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        name = row.get('product_name', '').strip()
        family = row.get('colour_family', '').strip()
        if name and family:
            family_by_handle[to_handle(name)] = family

# ── process Shopify export ─────────────────────────────────────────────────
input_file  = 'products_export_1.csv'
output_file = 'products_export_1_with_families.csv'

with open(input_file, newline='', encoding='utf-8') as fin, \
     open(output_file, 'w', newline='', encoding='utf-8') as fout:

    reader = csv.reader(fin)
    writer = csv.writer(fout)

    header = next(reader)
    # Column A = index 0 (Handle), Column K = index 10 (Colour Family)
    handle_idx = 0
    family_idx = 10

    tags_idx = 6  # Column G

    writer.writerow(header)
    filled = 0
    skipped = 0

    for row in reader:
        # Ensure row is wide enough
        while len(row) <= family_idx:
            row.append('')

        handle   = row[handle_idx].strip()
        existing = row[family_idx].strip()

        if not existing and handle:
            match = family_by_handle.get(handle)
            if match:
                row[family_idx] = match
                row[tags_idx] = f'Solid Gel Colours, {match}, Gel Polish'
                filled += 1
            else:
                skipped += 1
        elif existing:
            # Already had a colour family — still set the tag
            row[tags_idx] = f'Solid Gel Colours, {existing}, Gel Polish'

        writer.writerow(row)

print(f"Done. Filled: {filled} | No match found: {skipped}")
print(f"Output: {output_file}")
