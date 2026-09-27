"""清書したべた塗りの立ち絵 → ドット絵（背景抜き・部分ごとに1色・いちばん多い色での縮小・色数を減らす・1ドットの輪郭）。"""
import sys
import numpy as np
from PIL import Image
from collections import deque
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

import os
S = os.environ.get('WORK', os.path.join(os.getcwd(), 'work')) + '/'
BODY = int(sys.argv[1]) if len(sys.argv) > 1 else 150
# 2つめ以降の引数はキャラ id（省略時は work/ の *_ai.png 全部）
NAMES = sys.argv[2:]
COLORS = 16


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


def _split(pix, spread=38.0, kmax=5):
    """色の並び pix（N×3）を、どの群も spread 以内の広がりになるまで k 平均で割る。群の番号を返す。"""
    labels = np.zeros(len(pix), int)
    centers = [pix.mean(axis=0)]
    for k in range(2, kmax + 1):
        dist = np.linalg.norm(pix - np.array(centers)[labels], axis=1)
        if np.percentile(dist, 90) <= spread:
            break
        # いちばん遠い点を新しい中心に足して、数回だけ割り当て直す
        centers.append(pix[np.argmax(dist)])
        c = np.array(centers, float)
        for _ in range(8):
            d = np.linalg.norm(pix[:, None, :] - c[None, :, :], axis=2)
            labels = d.argmin(axis=1)
            for j in range(len(c)):
                if (labels == j).any():
                    c[j] = pix[labels == j].mean(axis=0)
        centers = list(c)
    return labels


def flatten(rgb, fg):
    """
    各部分を1色で塗る（作者指示: 単色化）。清書の AI は指示しても目のハイライトやグラデーション
    （イージング）を足すので、ここで確実に消す。
      1. 線（ほぼ黒）で囲まれた部分に分ける（線のすき間で漏れないよう、分けるときだけ線を太らせる）
      2. 部分の中の色が はっきり分かれていれば（漏れでつながった顔と髪など）k 平均で割る。
         1つの色の濃淡の範囲（グラデーション）なら割らない
      3. 割れた群ごとに、つながった塊を中央値の1色で塗る
      4. 小さなかけら（瞳の光・線のすき間）は、いちばん近い大きな塊の色に
    """
    line = (rgb.max(axis=2) < 70) & fg
    wall = ndi.binary_dilation(line, iterations=2)
    area = fg & ~wall
    lab, n = ndi.label(area, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    out = rgb.copy()
    seg = np.zeros(lab.shape, int)  # 最終の塊の番号
    nxt = 1
    flat = rgb.reshape(-1, 3).astype(float)
    for r in range(1, n + 1):
        m = lab == r
        cnt = int(m.sum())
        if cnt < 40:
            continue
        pix = rgb[m].astype(float)
        sub = _split(pix[:: max(1, cnt // 4000)]) if cnt > 200 else np.zeros(1, int)
        if sub.max() == 0:
            seg[m] = nxt
            nxt += 1
            continue
        # 割った中心で全画素を割り当て直し、群ごとにつながった塊に分ける
        k = sub.max() + 1
        samp = pix[:: max(1, cnt // 4000)]
        cen = np.array([samp[sub == j].mean(axis=0) for j in range(k)])
        full = np.linalg.norm(pix[:, None, :] - cen[None], axis=2).argmin(axis=1)
        grp = np.zeros(lab.shape, int)
        grp[m] = full + 1
        for j in range(1, k + 1):
            cl, cn = ndi.label(grp == j)
            for c in range(1, cn + 1):
                seg[cl == c] = nxt
                nxt += 1
    ids = np.arange(1, nxt)
    sizes = ndi.sum(seg > 0, seg, ids) if nxt > 1 else np.array([])
    for ch in range(3):
        med = ndi.median(rgb[..., ch], seg, ids) if nxt > 1 else []
        lut = np.zeros(nxt)
        lut[1:] = med
        out[..., ch] = np.where(seg > 0, lut[seg], rgb[..., ch])
    big = np.isin(seg, ids[sizes >= 60])
    rest = fg & ~line & ~big
    if rest.any() and big.any():
        _, (iy, ix) = ndi.distance_transform_edt(~big, return_indices=True)
        out[rest] = out[iy[rest], ix[rest]]
    out[line] = (20, 16, 18)
    return mono_eyes(rgb, out, fg, line, seg, sizes)  # (塗った絵, 目のところ)


def mono_eyes(rgb, out, fg, line, seg, sizes):
    """
    目を1色にする（作者指示: 目の配色は繊細で AI が間違えるので単色に）。
    清書の白っぽい小さな塊（白目。塗り分けで虹彩の色に飲まれていることもあるので元の絵で探す）を種に、となり合う小さな塊（虹彩の濃淡）をまとめて「目」とし、
    その中（瞳・光も穴埋めで含める）を、白くない塊のうちいちばん広い色の1色で塗る。目の輪郭の線は残す。
    服・エプロン・毛皮のような大きな白い部分は残す（体の面積の 0.6% 以上）。
    """
    def white(a):
        return (a.min(axis=2) > 185) & (a.max(axis=2) - a.min(axis=2) < 45) & fg & ~line

    limit = fg.sum() * 0.006
    nearbg = ndi.binary_dilation(~fg, iterations=3)
    size_of = np.zeros(seg.max() + 1)
    size_of[1:] = sizes
    small = fg & ~line & (size_of[seg] < limit)  # seg 0 は小さなかけら
    lab, n = ndi.label(white(rgb) & small)
    done = np.zeros(fg.shape, bool)
    eyes = np.zeros(fg.shape, bool)
    for r in range(1, n + 1):
        m = lab == r
        if m.sum() < 20 or (m & (nearbg | done)).any():
            continue  # 背景に触れている＝縁取りの白など、または処理済みの目
        # まわりの大きな塊（肌・髪）の色。眼鏡のレンズの中の肌のように、これに近い色の塊は目に入れない
        near = ndi.binary_dilation(m, iterations=10) & fg & ~line & ~small
        skin = np.unique(out[near].reshape(-1, 3), axis=0).astype(float)
        eye = m
        for _ in range(2):  # 線をまたいで となりの小さな塊（虹彩の外側→内側）を足す
            ids = np.unique(seg[ndi.binary_dilation(eye, iterations=4) & small])
            for i in ids[ids > 0]:
                if i in seg[eye]:
                    continue
                c = out[seg == i][0].astype(float)
                if len(skin) and np.linalg.norm(skin - c, axis=1).min() < 60:
                    continue
                if not ndi.binary_erosion(seg == i, iterations=3).any():
                    continue  # 細い塊＝眼鏡のふちなど（虹彩は丸くて太い）
                eye = eye | ((seg == i) & small & ~nearbg)
        # 虹彩（白でも肌でもない色）が見つからない白は目ではない（フリル・エプロンのかけら）。さわらない
        body = eye & ~m & ~white(out)
        if body.sum() < 20:
            continue
        # 目は虹彩のところだけ（瞳・光も穴埋めで含める）。白目まで塗ると目が大きな色の塊になる
        eye = ndi.binary_fill_holes(body | ndi.binary_closing(body, iterations=3)) & fg
        if eye.sum() > limit * 3:
            continue  # 大きすぎる＝目ではないものを拾った
        cols, counts = np.unique(out[body].reshape(-1, 3), axis=0, return_counts=True)
        out[eye] = cols[counts.argmax()]
        # 白目は、まわりの大きな塊（肌）の色で塗って消す
        sclera = m & ~eye
        if sclera.any() and near.any():
            cols, counts = np.unique(out[near].reshape(-1, 3), axis=0, return_counts=True)
            out[sclera] = cols[counts.argmax()]
        done |= eye | m
        eyes |= eye
    return out, eyes


def downscale(rgb, fg, line, eyes, oh, ow):
    """
    ドットへ縮小する。面積平均（BOX）だと線と面の境目に中間色（ぼかし）が出てドット絵として汚いので、
    1ドットごとに元の四角の中でいちばん多い色をそのまま使う（色は塗りの色だけ・混ぜない）。
    線は1ドットの太さで残す（芯が通る四角を線に）。ただし目（mono_eyes で1色にしたところ）が
    25% 以上なら目の色を先にする（小さな目が線に埋もれないように）。
    """
    h, w = fg.shape
    ys = np.linspace(0, h, oh + 1).round().astype(int)
    xs = np.linspace(0, w, ow + 1).round().astype(int)
    cols, idx = np.unique(rgb.reshape(-1, 3), axis=0, return_inverse=True)
    idx = idx.reshape(h, w)
    q = np.zeros((oh, ow, 3), np.uint8)
    alpha = np.zeros((oh, ow), bool)
    eye_dot = np.zeros((oh, ow), bool)
    # 線は芯（1画素の細線）にしてから、芯が通る四角を線のドットにする。面積の割合で決めると、
    # 顔の細い線（目・口・眼鏡）が消え、太い線は太くなる
    skel = skeletonize(line)
    for i in range(oh):
        for j in range(ow):
            f = fg[ys[i]:ys[i+1], xs[j]:xs[j+1]]
            if f.mean() <= 0.5:
                continue
            alpha[i, j] = True
            e = eyes[ys[i]:ys[i+1], xs[j]:xs[j+1]]
            if e.mean() >= 0.25:
                q[i, j] = rgb[ys[i]:ys[i+1], xs[j]:xs[j+1]][e][0]
                eye_dot[i, j] = True
                continue
            l = line[ys[i]:ys[i+1], xs[j]:xs[j+1]]
            if skel[ys[i]:ys[i+1], xs[j]:xs[j+1]].sum() >= 3:
                q[i, j] = (20, 16, 18)
                continue
            sel = idx[ys[i]:ys[i+1], xs[j]:xs[j+1]][f & ~l]
            q[i, j] = cols[np.bincount(sel).argmax()] if sel.size else (20, 16, 18)
    return q, alpha, eye_dot


def reduce_colors(q, alpha, eye_dot, k):
    """
    色数を k に減らす。目の色と、多い順の色を残し、残りはいちばん近い色へ（新しい中間色は作らない）。
    目は数ドットしかないので、多い順だけだと髪や肌の色に飲まれて消える。
    """
    body = q[alpha]
    cols, counts = np.unique(body, axis=0, return_counts=True)
    if len(cols) <= k:
        return q
    eye_cols = np.unique(q[eye_dot], axis=0)
    counts = counts + np.array([(c == eye_cols).all(axis=1).any() for c in cols]) * body.shape[0]
    keep = cols[np.argsort(-counts)[:k]].astype(float)
    d = np.linalg.norm(body[:, None, :].astype(float) - keep[None], axis=2)
    q = q.copy()
    q[alpha] = keep[d.argmin(axis=1)].astype(np.uint8)
    return q


def pix(name):
    rgb = np.array(Image.open(S + f'{name}_ai.png').convert('RGB'))
    fg = cut_bg(rgb)
    rgb, eyes = flatten(rgb, fg)
    ys, xs = np.nonzero(fg)
    rgb = rgb[ys.min():ys.max()+1, xs.min():xs.max()+1]
    fg = fg[ys.min():ys.max()+1, xs.min():xs.max()+1]
    eyes = eyes[ys.min():ys.max()+1, xs.min():xs.max()+1]
    h, w = fg.shape
    k = BODY / h
    oh, ow = BODY, max(1, round(w * k))
    line = (rgb.max(axis=2) < 70) & fg
    q, alpha, eye_dot = downscale(rgb, fg, line, eyes, oh, ow)
    q = reduce_colors(q, alpha, eye_dot, COLORS)
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


import glob
names = NAMES or sorted(os.path.basename(p)[:-7] for p in glob.glob(S + '*_ai.png'))
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
