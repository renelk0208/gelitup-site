"""Blur the whole of each certificate image.

Renders all text (validity dates, signatures, names, numbers) illegible while the
document still visually reads as an official certificate. Clients see *that* a
certificate exists; the accompanying website description says what it is for.
Originals are preserved in .cert-originals/ (created on first run) and used as the
pristine source on every run so this script is idempotent.
"""
import os
import shutil
from PIL import Image, ImageFilter

D = os.path.join('public', 'gelitup-content', 'Certifications-And-Compliance')
BACKUP = '.cert-originals'
os.makedirs(BACKUP, exist_ok=True)

CERTS = [
    'free-sale-certificate-2025-2026-1.jpg',
    'fda-compliance-certificate_page-0001.jpg',
    'GMP CERTIFICATE 2025-2026_page1.jpg',
    'iso-9001-2025-2026.jpg',
    'bcci-chamber-2025.jpg',
    'bulgarian-cosmetics-membership-2025.jpg',
    's4648-01-TPOcompliance_page-0001.jpg',
    'cruelty-free-international-26-27_page-0001.jpg',
    'sfda-certificate-of-conformity.jpg',
]

for name in CERTS:
    src = os.path.join(D, name)
    if not os.path.exists(src):
        print('MISSING', name)
        continue
    bak = os.path.join(BACKUP, name)
    if not os.path.exists(bak):
        shutil.copy2(src, bak)
    # Always blur from the pristine original so re-running never compounds the blur.
    im = Image.open(bak).convert('RGB')
    # Radius scaled to width: enough to make all text unreadable, light enough that
    # seals/logos/layout still look like a certificate.
    radius = max(8, round(im.width / 100))
    im = im.filter(ImageFilter.GaussianBlur(radius=radius))
    im.save(src, quality=90)
    print('blurred whole', name, 'radius', radius)

print('Done. Originals in', BACKUP)
