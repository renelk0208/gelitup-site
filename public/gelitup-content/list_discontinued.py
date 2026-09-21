import re
with open('product-image-map.json', encoding='utf-8') as f:
    content = f.read()
kv = re.findall(r'^\s+"([^"]+)"\s*:\s*"([^"]*)"', content, re.MULTILINE)
for k, v in kv:
    ku = k.upper()
    if re.search(r'GIUP.?(40[0-9]|410|411|50[0-3]|CMU)', ku):
        print(repr(k))
