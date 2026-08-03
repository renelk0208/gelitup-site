"""Temporary: crop signature regions from saved grid previews for close inspection."""
import os
from PIL import Image

G = os.path.join('scripts', '_grid')
OUT = os.path.join('scripts', '_grid', 'crops')
os.makedirs(OUT, exist_ok=True)

crops = {
    'free-sale-certificate-2025-2026-1.jpg': [
        ('fs_topleft', (0, 0, 700, 700)),
        ('fs_bottom', (800, 1400, 1606, 2000)),
    ],
    'GMP CERTIFICATE 2025-2026_page1.jpg': [
        ('gmp_topleft', (0, 0, 700, 700)),
        ('gmp_bottom', (0, 1650, 1606, 2200)),
    ],
    'fda-compliance-certificate_page-0001.jpg': [
        ('fda_bottom', (600, 1050, 1266, 1560)),
    ],
}

for name, regs in crops.items():
    im = Image.open(os.path.join(G, name)).convert('RGB')
    for tag, box in regs:
        im.crop(box).save(os.path.join(OUT, tag + '.jpg'), quality=90)
        print('wrote', tag, box)
