"""Örnek görselden portre: arka planı sil, kırp, birkaç boyutta küçült, önizleme üret."""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
img = np.array(Image.open(src).convert('RGB')).astype(int)
h, w, _ = img.shape

# Arka plan rengi: köşelerin ortancası. Kenara bağlı ve bu renge yakın pikseller silinir.
corners = np.array([img[2, 2], img[2, w - 3], img[h - 3, w - 3]])
bg = np.median(corners, axis=0)
near = np.sqrt(((img - bg) ** 2).sum(axis=2)) < 24
mask = np.zeros((h, w), bool)
q = deque((y, x) for y in range(h) for x in (0, w - 1) if near[y, x])
q.extend((y, x) for x in range(w) for y in (0,) if near[y, x])
for y, x in q:
    mask[y, x] = True
while q:
    y, x = q.popleft()
    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
        if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and near[ny, nx]:
            mask[ny, nx] = True
            q.append((ny, nx))
print('bg', bg, 'removed', mask.mean().round(3))

rgba = np.dstack([img, np.where(mask, 0, 255)]).astype(np.uint8)
full = Image.fromarray(rgba, 'RGBA')
full.save(out / 'cut.png')

box = tuple(int(v) for v in sys.argv[3].split(','))  # x0,y0,x1,y1
crop = full.crop(box)
crop.save(out / 'crop.png')
for size in map(int, sys.argv[4].split(',')):
    ratio = crop.height / crop.width
    small = crop.resize((size, round(size * ratio)), Image.Resampling.BOX)
    a = np.array(small)
    a[..., 3] = np.where(a[..., 3] >= 140, 255, 0)
    small = Image.fromarray(a, 'RGBA')
    small.save(out / f'p{size}.png')
    # Terminal görünümü: koyu zemin, piksel başına 8x büyütme
    view = Image.new('RGBA', small.size, (10, 10, 12, 255))
    view.alpha_composite(small)
    view.resize((small.width * 8, small.height * 8), Image.Resampling.NEAREST).save(out / f'view{size}.png')
    print(size, small.size)
