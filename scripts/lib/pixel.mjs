// 自作ドット絵の共通部品（make-home-tiles.mjs・make-town-tiles.mjs）。依存なし（zlib だけ）。

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

// ───────────────── 最小 PNG（RGBA 8bit） ─────────────────

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc32 = (buf) => {
	let c = 0xffffffff;
	for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
};
export const encodePng = (w, h, rgba) => {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const raw = Buffer.alloc((w * 4 + 1) * h);
	for (let y = 0; y < h; y++) {
		raw[y * (w * 4 + 1)] = 0;
		rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
	}
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
		chunk("IDAT", deflateSync(raw)),
		chunk("IEND", Buffer.alloc(0)),
	]);
};

const rgb = (hex) => [
	Number.parseInt(hex.slice(1, 3), 16),
	Number.parseInt(hex.slice(3, 5), 16),
	Number.parseInt(hex.slice(5, 7), 16),
];

/** 決定論のノイズ 0..1（同じチップは毎回同じ絵になる）。 */
export const hash = (x, y, s = 0) => {
	let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** w×h の絵。px / rect / hline / vline / art（文字の絵）で描く。 */
export const sprite = (w = 16, h = 16) => {
	const cells = Array.from({ length: h }, () => Array(w).fill("."));
	const s = {
		w,
		h,
		cells,
		px(x, y, c) {
			if (x >= 0 && y >= 0 && x < w && y < h) cells[y][x] = c;
			return s;
		},
		rect(x, y, rw, rh, c) {
			for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) s.px(x + i, y + j, c);
			return s;
		},
		hline(x, y, len, c) {
			return s.rect(x, y, len, 1, c);
		},
		vline(x, y, len, c) {
			return s.rect(x, y, 1, len, c);
		},
		art(x, y, rows) {
			rows.forEach((row, j) => {
				[...row].forEach((c, i) => {
					if (c !== ".") s.px(x + i, y + j, c);
				});
			});
			return s;
		},
		/** 描いたものの外側に1画素の輪郭（透明の画素だけ塗る）。 */
		outline(c = "K") {
			const src = cells.map((r) => [...r]);
			for (let y = 0; y < h; y++)
				for (let x = 0; x < w; x++) {
					if (src[y][x] !== ".") continue;
					const near = [
						[1, 0],
						[-1, 0],
						[0, 1],
						[0, -1],
					].some(([dx, dy]) => src[y + dy]?.[x + dx] && src[y + dy][x + dx] !== ".");
					if (near) cells[y][x] = c;
				}
			return s;
		},
	};
	return s;
};

/**
 * [c, r, sprite] の並びを cols×rows マス（16px）のシートに書き出す。pal は 1文字 → "#rrggbb"。
 */
export const writeSheet = (path, layout, pal, cols, rows) => {
	const W = cols * 16;
	const H = rows * 16;
	const buf = Buffer.alloc(W * H * 4);
	for (const [c, r, s] of layout) {
		for (let y = 0; y < s.h; y++)
			for (let x = 0; x < s.w; x++) {
				const ch = s.cells[y][x];
				if (ch === ".") continue;
				const hex = pal[ch];
				if (!hex) throw new Error(`色が未定義: ${ch}`);
				const [R, G, B] = rgb(hex);
				const i = ((r * 16 + y) * W + c * 16 + x) * 4;
				buf[i] = R;
				buf[i + 1] = G;
				buf[i + 2] = B;
				buf[i + 3] = 255;
			}
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, encodePng(W, H, buf));
	return `${W}x${H}（${layout.length} チップ）`;
};
