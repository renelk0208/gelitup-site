"""Remove all Spix & Spex entries from product-image-map.json and b2b-price-list.json"""
import re, json

# --- product-image-map.json ---
with open('product-image-map.json', encoding='utf-8') as f:
    img_content = f.read()

before = len(re.findall(r'^\s+"[^"]+"', img_content, re.MULTILINE))
# Remove any line whose key contains SS0N (Spix & Spex codes)
cleaned = re.sub(
    r'^\s+"GIUP[-\s]?SS0[0-9][^"]*"\s*:\s*"[^"]*",?\n',
    '',
    img_content,
    flags=re.IGNORECASE | re.MULTILINE
)
after = len(re.findall(r'^\s+"[^"]+"', cleaned, re.MULTILINE))
print(f"Image map: removed {before - after} entries")
with open('product-image-map.json', 'w', encoding='utf-8') as f:
    f.write(cleaned)

# --- b2b-price-list.json ---
with open('b2b-price-list.json', encoding='utf-8') as f:
    data = json.load(f)
items = data['items']
before = len(items)
items_clean = [
    i for i in items
    if not re.search(r'SPIX|SPEX|SS0[0-9]', i.get('name', '') + i.get('sku', ''), re.I)
]
data['items'] = items_clean
data['_meta']['count'] = len(items_clean)
print(f"Price list: removed {before - len(items_clean)} entries")
with open('b2b-price-list.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done.")
