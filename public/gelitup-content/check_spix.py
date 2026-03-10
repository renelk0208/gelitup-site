import re, json

with open('product-image-map.json', encoding='utf-8') as f:
    content = f.read()
kv = re.findall(r'^\s+"([^"]+)"\s*:\s*"([^"]*)"', content, re.MULTILINE)
print('=== IMAGE MAP KEYS ===')
for k, v in kv:
    if re.search(r'SS0[0-9]|SPIX|spix|spex|SPEX', k):
        print(repr(k))

with open('b2b-price-list.json', encoding='utf-8') as f:
    data = json.load(f)
print('\n=== PRICE LIST ENTRIES ===')
for i in data['items']:
    if re.search(r'SS0[0-9]|SPIX|spix|spex|SPEX|Kaleid|Delphinium|Giddy|Popping Candy|Lemon Sorbet|Tusk Tusk', i.get('name', ''), re.I):
        print(repr(i['name']), i.get('price'))
