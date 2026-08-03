"""Temporary: verify date/validity blurs on the updated certs."""
import os
from PIL import Image

D = os.path.join('public', 'gelitup-content', 'Certifications-And-Compliance')
OUT = os.path.join('scripts', '_verify', 'dates')
os.makedirs(OUT, exist_ok=True)

VIEWS = {
    'iso-9001-2025-2026.jpg': [('iso_d', (400, 1950, 1000, 2110))],
    'GMP CERTIFICATE 2025-2026_page1.jpg': [('gmp_d', (150, 1920, 750, 2100))],
    'free-sale-certificate-2025-2026-1.jpg': [('fs_d', (150, 1630, 750, 1800))],
    'cruelty-free-international-26-27_page-0001.jpg': [('cf_d', (400, 560, 950, 670))],
    'bulgarian-cosmetics-membership-2025.jpg': [('bcm_d', (400, 750, 1250, 920))],
    'fda-compliance-certificate_page-0001.jpg': [('fda_d', (700, 1440, 1160, 1520))],
    's4648-01-TPOcompliance_page-0001.jpg': [('tpo_d1', (600, 300, 1241, 380)), ('tpo_d2', (600, 480, 950, 670))],
    'bcci-chamber-2025.jpg': [('bcci_d', (1250, 1250, 1920, 1330))],
}

for name, regs in VIEWS.items():
    im = Image.open(os.path.join(D, name)).convert('RGB')
    for tag, box in regs:
        im.crop(box).save(os.path.join(OUT, tag + '.jpg'), quality=90)
print('done')
