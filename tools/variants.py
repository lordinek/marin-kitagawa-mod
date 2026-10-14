"""Kesilmiş görselden animasyon varyasyonları: göz kapalı, ağız kapalı, göz kırpma. Yüksek çözünürlükte boyanır, sonra küçültülür."""
import base64
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

out = Path(sys.argv[1])
PW, PH = (int(v) for v in sys.argv[2].split('x'))  # çeyrek blok: hücre başına 2x2 piksel
CROP = (250, 40, 710, 500)
cut = Image.open(out / 'cut.png').convert('RGBA')
arr = np.array(cut)

def median(box):
    x0, y0, x1, y1 = box
    return tuple(int(v) for v in np.median(arr[y0:y1, x0:x1, :3].reshape(-1, 3), axis=0)) + (255,)

SKIN = median((488, 300, 520, 322))
LASH = (60, 20, 40, 255)
MOUTH = (194, 24, 91, 255)
EYE_L = (418, 268, 486, 330)
EYE_R = (522, 238, 576, 296)
MOUTH_BOX = (462, 334, 548, 402)
print('skin', SKIN)

def closed_eye(d, box):
    x0, y0, x1, y1 = box
    d.ellipse(box, fill=SKIN)
    cy = y0 + (y1 - y0) * 0.6
    d.arc((x0, cy - 14, x1, cy + 14), 10, 170, fill=LASH, width=9)

def closed_mouth(d):
    x0, y0, x1, y1 = MOUTH_BOX
    d.rectangle(MOUTH_BOX, fill=SKIN)
    d.arc((x0 + 12, y0 - 6, x1 - 12, y0 + 30), 20, 160, fill=MOUTH, width=8)

def variant(eyes_l, eyes_r, mouth_open):
    im = cut.copy()
    d = ImageDraw.Draw(im)
    if not eyes_l:
        closed_eye(d, EYE_L)
    if not eyes_r:
        closed_eye(d, EYE_R)
    if not mouth_open:
        closed_mouth(d)
    small = im.crop(CROP).resize((PW, PH), Image.Resampling.LANCZOS)
    rgb, alpha = small.convert('RGB'), small.getchannel('A')
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.0, percent=80, threshold=3))
    rgb = ImageEnhance.Color(rgb).enhance(1.05)
    small = rgb.convert('RGBA'); small.putalpha(alpha)
    a = np.array(small)
    a[..., 3] = np.where(a[..., 3] >= 140, 255, 0)
    return Image.fromarray(a, 'RGBA')

VARIANTS = {
    'open': (True, True, True),
    'blink': (False, False, True),
    'shut': (True, True, False),
    'blinkShut': (False, False, False),
    'wink': (True, False, True),
}
sheet = Image.new('RGBA', ((PW * 4 + 8) * len(VARIANTS), PH * 8), (10, 10, 12, 255))
lines = ['// Ali\'nin örnek görselinden üretildi (scratchpad/portrait/variants.py). RGBA, satır öncelikli, base64.',
         f'export const PW = {PW}', f'export const PH = {PH}', 'export const VARIANTS = {']
for i, (name, spec) in enumerate(VARIANTS.items()):
    im = variant(*spec)
    sheet.alpha_composite(im.resize((PW * 4, PH * 8), Image.Resampling.NEAREST), (i * (PW * 4 + 8), 0))
    lines.append(f"  {name}: '{base64.b64encode(im.tobytes()).decode()}',")
lines.append('} as const')
lines.append('export type Variant = keyof typeof VARIANTS')
sheet.save(out / 'variants.png')
(out / 'portrait-data.ts').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('ok', (out / 'portrait-data.ts').stat().st_size)
