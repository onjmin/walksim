"""清書したべた塗りの立ち絵 → ドット絵（背景抜き・面積平均の縮小・色数を減らす・1ドットの輪郭）。"""
import sys
import numpy as np
from PIL import Image
from collections import deque
from scipy import ndimage as ndi

import os
S = os.environ.get('WORK', os.path.join(os.getcwd(), 'work')) + '/'
BODY = int(sys.argv[1]) if len(sys.argv) > 1 else 150
COLORS = 14


def cut_bg(rgb):
    """四辺から、白に近い画素を塗りつぶして背景として抜く。"""
    h, w, _ = rgb.shape
    white = (rgb.min(axis=2) > 225) & (rgb.max(axis=2) - rgb.min(axis=2) < 25)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for Y, X in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= Y < h and 0 <= X < w and white[Y, X] and not bg[Y, X]:
                bg[Y, X] = True; q.append((Y, X))
    # いちばん大きい塊だけ残す（紙のしみ・影のかけら）
    fg = ~bg
    lab, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, lab, range(1, n + 1))
        fg = lab == (np.argmax(sizes) + 1)
    return fg


def pix(name):
    rgb = np.array(Image.open(S + f'{name}_ai.png').convert('RGB'))
    fg = cut_bg(rgb)
    ys, xs = np.nonzero(fg)
    rgb = rgb[ys.min():ys.max()+1, xs.min():xs.max()+1]
    fg = fg[ys.min():ys.max()+1, xs.min():xs.max()+1]
    h, w = fg.shape
    k = BODY / h
    oh, ow = BODY, max(1, round(w * k))
    a = fg.astype(np.float32)
    pre = np.concatenate([rgb * a[..., None], a[..., None] * 255], -1).astype(np.uint8)
    small = np.array(Image.fromarray(pre, 'RGBA').resize((ow, oh), Image.BOX)).astype(np.float32)
    al = small[..., 3] / 255
    col = np.where(al[..., None] > 0, small[..., :3] / np.maximum(al[..., None], 1e-6), 0)
    alpha = al > 0.5
    # 色数を減らす（体の画素だけで k-means 相当＝PIL の quantize）
    tmp = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB')
    q = tmp.quantize(COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    q = np.array(q)
    # 外周に1ドットの輪郭（体の外側のふち）
    edge = alpha & ~ndi.binary_erosion(alpha, np.ones((3, 3)))
    q[edge] = (q[edge] * 0.35).astype(np.uint8)
    out = np.dstack([q, alpha.astype(np.uint8) * 255])
    im = Image.fromarray(out, 'RGBA')
    im.save(S + f'{name}_pix.png')
    return im


def scene(im):
    """ゲームの深夜の場面の色に落とした見え方（輝度 → 7段、ディザあり）。"""
    ramp = np.array([(7, 11, 18), (18, 32, 50), (31, 60, 82), (53, 98, 112), (90, 148, 152), (152, 200, 192), (226, 242, 234)])
    a = np.array(im).astype(np.float32)
    l = (a[..., 0] * .3 + a[..., 1] * .55 + a[..., 2] * .15) / 255
    l = l * l * (3 - 2 * l) + 0.12
    bay = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16 - .5
    hh, ww = l.shape
    d = bay[np.arange(hh)[:, None] % 4, np.arange(ww)[None, :] % 4]
    idx = np.clip(np.round(l * 6 + d * 0.9), 0, 6).astype(int)
    rgb = ramp[idx]
    return Image.fromarray(np.dstack([rgb, a[..., 3]]).astype(np.uint8), 'RGBA')


names = ['kiriko', 'roze', 'rei', 'teto']
ims = [pix(n) for n in names]
crop = [im.crop((0, 0, im.width, int(im.height * 0.62))) for im in ims]
row1 = crop
row2 = [scene(c) for c in crop]
W = sum(c.width for c in crop) + 10 * len(crop)
H = max(c.height for c in crop)
sheet = Image.new('RGBA', (W, H * 2 + 10), (0, 0, 0, 255))
x = 0
for a, b in zip(row1, row2):
    sheet.alpha_composite(a, (x, 0)); sheet.alpha_composite(b, (x, H + 10)); x += a.width + 10
sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(S + 'pix_sheet.png')
print(sheet.size)
