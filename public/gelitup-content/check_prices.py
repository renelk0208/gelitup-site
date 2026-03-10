import json, re
with open('b2b-price-list.json', encoding='utf-8') as f:
    data = json.load(f)
items = data['items']
pattern = re.compile(r'GIUP.*(BOB|BTO|CDC|CMU|DT0|FBCL|FBCO|FR0[0-9]|JNF|NYP|PMA|SBC|SAT|SB)', re.I)
for item in items:
    name = item.get('name','')
    sku = item.get('sku','')
    if pattern.search(name) or pattern.search(sku):
        print(f"name={name!r} sku={sku!r} price={item.get('price')}")
