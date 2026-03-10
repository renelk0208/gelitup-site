"""Remove all discontinued product keys from product-image-map.json"""
import re

with open('product-image-map.json', encoding='utf-8') as f:
    content = f.read()

# Pattern: match any full "key": "value", line (including trailing comma+newline)
# for discontinued codes
DISCONTINUED = re.compile(
    r'^\s+"GIUP[-\s]?(40[0-9]|410|411|50[0-3]|CMU0?0?(2|4|5|6|10|12|13))"\s*:\s*"[^"]*",?\n',
    re.IGNORECASE | re.MULTILINE
)

before = len(re.findall(r'^\s+"[^"]+"', content, re.MULTILINE))
new_content = DISCONTINUED.sub('', content)
after = len(re.findall(r'^\s+"[^"]+"', new_content, re.MULTILINE))

print(f"Removed {before - after} entries")

with open('product-image-map.json', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done.")
