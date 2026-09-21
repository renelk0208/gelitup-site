"""Temporary helper: overlay a labeled pixel grid on a cert image for locating regions."""
import os
from PIL import Image, ImageDraw

D = os.path.join('public', 'gelitup-content', 'Certifications-And-Compliance')
OUT = os.path.join('scripts', '_grid')
os.makedirs(OUT, exist_ok=True)

targets = [
    'GMP CERTIFICATE 2025-2026_page1.jpg',
    'iso-9001-2025-2026.jpg',
    'bcci-chamber-2025.jpg',
    'bulgarian-cosmetics-membership-2025.jpg',
    's4648-01-TPOcompliance_page-0001.jpg',
    'cruelty-free-international-26-27_page-0001.jpg',
]

for name in targets:
    im = Image.open(os.path.join(D, name)).convert('RGB')
    w, h = im.size
    dr = ImageDraw.Draw(im)
    step = 100
    for x in range(0, w, step):
        dr.line([(x, 0), (x, h)], fill=(255, 0, 0), width=1)
        dr.text((x + 2, 2), str(x), fill=(255, 0, 0))
        dr.text((x + 2, h - 14), str(x), fill=(255, 0, 0))
    for y in range(0, h, step):
        dr.line([(0, y), (w, y)], fill=(0, 128, 255), width=1)
        dr.text((2, y + 2), str(y), fill=(0, 0, 255))
    out = os.path.join(OUT, name)
    im.save(out, quality=85)
    print('wrote', out, im.size)
