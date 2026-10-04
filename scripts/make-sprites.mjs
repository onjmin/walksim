// 素材が見つからなかったドット絵を作る（node scripts/make-sprites.mjs）。
//
// - public/sprites/phono.png        … ちいさな蓄音機（置物）16x16
// - public/sprites/rino.png         … 春音リノ（お団子髪・エプロンの女将）32x64
// - public/sprites/aru.png          … 響化アル（長めマッシュの少年・シャツ）32x64
//
// 依存なし（zlib だけ）。ドット絵は下の文字の絵から作る。

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/sprites");

// ───────────────── 最小 PNG（RGBA 8bit・非インターレース） ─────────────────

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
const encodePng = (w, h, rgba) => {
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

// ───────────────── 文字の絵 → 画素 ─────────────────

const hex = (s) => [
	Number.parseInt(s.slice(1, 3), 16),
	Number.parseInt(s.slice(3, 5), 16),
	Number.parseInt(s.slice(5, 7), 16),
	255,
];

/** 文字の絵を画素 (px, py) から描く（行の幅は16固定・行数は自由）。 */
const paintPx = (sheet, sheetW, px, py, art, pal) => {
	art.forEach((row, y) => {
		if (row.length !== 16) throw new Error(`行の長さが16でない: "${row}"`);
		[...row].forEach((ch, x) => {
			if (ch === ".") return;
			const col = pal[ch];
			if (!col) throw new Error(`色 "${ch}" が未定義`);
			const i = ((py + y) * sheetW + px + x) * 4;
			sheet[i] = col[0];
			sheet[i + 1] = col[1];
			sheet[i + 2] = col[2];
			sheet[i + 3] = col[3];
		});
	});
};

/** 16x16 のコマを sheet の (cx, cy) マスに描く。 */
const paint = (sheet, sheetW, cx, cy, art, pal) =>
	paintPx(sheet, sheetW, cx * 16, cy * 16, art, pal);

const mirror = (art) => art.map((r) => [...r].reverse().join(""));

// ───────────────── 歩行グラ ─────────────────
// 1コマ目の絵を描き、2コマ目は足もと（下の2行）だけ差し替える。左向きは右向きの反転。

/** 上・右・下向き（各16行）と、2コマ目の足もと2行から RPGEN 規格のシートを作る。 */
const walkSheet = (file, pal, { up, right, down }, feet) => {
	const step = (art) => [...art.slice(0, 14), ...feet];
	const buf = Buffer.alloc(32 * 64 * 4);
	const rows = [up, right, down, null];
	for (let row = 0; row < 4; row++) {
		const art = rows[row] ?? right;
		const flip = row === 3 ? mirror : (a) => a;
		paint(buf, 32, 0, row, flip(art), pal);
		paint(buf, 32, 1, row, flip(step(art)), pal);
	}
	writeFileSync(join(OUT, file), encodePng(32, 64, buf));
};

const FEET = [".....SS..SS.....", "................"];
const FEET_B = ["....SS....SS....", "................"];

// ───────────────── ちいさな蓄音機（置物） ─────────────────
// 金色のラッパと木の箱、黒いレコード。

const PHONO_PAL = {
	K: hex("#2b1a0e"), // 輪郭
	G: hex("#f2c14e"), // ラッパ（金）
	g: hex("#b98322"), // ラッパの影
	L: hex("#fff0b0"), // ラッパのつや
	N: hex("#9a5b2c"), // 木
	n: hex("#6a3a18"), // 木の影
	B: hex("#1a1a1a"), // レコード
	b: hex("#4a4a4a"), // レコードの溝
	R: hex("#d8352a"), // レーベル
	S: hex("#c8c8c8"), // アーム
};

const phonoArt = [
	"..KKKK..........",
	".KLGGGKK........",
	"KLGGGGGGK.......",
	"KGGGgGGGGK......",
	"KGGgKgGGGGK.....",
	".KGgKKgGGGK.....",
	"..KKK.KgGGK.....",
	"......KKgGK.....",
	".......KgK......",
	"..KKKKKKSKKKK...",
	".KBbBbBRBbBbBK..",
	".KKKKKKKKKKKKK..",
	".KNNNNNNNNNNNK..",
	".KNnNNNNNNNnNK..",
	".KNNNNNNNNNNNK..",
	".KKKKKKKKKKKKK..",
];
const phono = Buffer.alloc(16 * 16 * 4);
paint(phono, 16, 0, 0, phonoArt, PHONO_PAL);
writeFileSync(join(OUT, "phono.png"), encodePng(16, 16, phono));

// ───────────────── 春音リノ ─────────────────
// 過去ログの地層の食堂の女将（45歳・伊勢出身）。お団子髪・落ち着いた色の着物にエプロン。

walkSheet(
	"rino.png",
	{
		K: hex("#2a201a"),
		H: hex("#6a4a38"), // 髪（こげ茶）
		h: hex("#4c3426"),
		F: hex("#ffe0c8"),
		B: hex("#2a2018"),
		W: hex("#f2ead6"), // エプロン
		w: hex("#d8ccb0"),
		D: hex("#8a5a4a"), // 着物（柿渋色）
		d: hex("#6a4234"),
		S: hex("#3a2a22"),
	},
	{
		down: [
			"......KKKK......",
			".....KHhHHK.....",
			"....KKHHHHKK....",
			"...KHHHHHHHHK...",
			"..KHHKKKKKKHHK..",
			"..KHKFFFFFFKHK..",
			"..KHKFBFFBFKHK..",
			"..KHKFFFFFFKHK..",
			"...KKFFFFFFKK...",
			"...KDDDDDDDDK...",
			"..KDDWWWWWWDDK..",
			"..KDKWwWWwWKDK..",
			"..KDKWWWWWWKDK..",
			"...KKWWWWWWKK...",
			...FEET,
		],
		up: [
			"......KKKK......",
			".....KHhHHK.....",
			"....KKHHHHKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHHhHHHHhHHK..",
			"..KHHHHHHHHHHK..",
			"..KHhHHHHHHhHK..",
			"...KKHHHHHHKK...",
			"...KDDDDDDDDK...",
			"..KDDDDWWDDDDK..",
			"..KDKDWWWWDKDK..",
			"..KDKDDDDDDKDK..",
			"...KKDDDDDDKK...",
			...FEET,
		],
		right: [
			"....KKKK........",
			"...KHhHHK.......",
			"..KKHHHHKK......",
			"..KHHHHHHHHK....",
			".KHHHHKKFFFFK...",
			".KHHHHKFFFFFFK..",
			".KHHHHKFFFBFFK..",
			".KHHHHKFFFFFFK..",
			"..KHHHKFFFFKK...",
			"...KDDDDDDDDK...",
			"..KDDDWWWWWWK...",
			"..KDKDWwWWwWK...",
			"..KDKDWWWWWWK...",
			"...KKWWWWWWKK...",
			...FEET,
		],
	},
	FEET_B,
);

// ───────────────── 響化アル ─────────────────
// hub のエレベーターを計測している科学部の少年。長めのマッシュとシャツ。

walkSheet(
	"aru.png",
	{
		K: hex("#202830"),
		H: hex("#3e5a5e"), // 髪（暗い青緑）
		h: hex("#2c4246"),
		F: hex("#ffe0c8"),
		B: hex("#262a30"),
		W: hex("#e8ecf2"), // シャツ
		w: hex("#ccd2dc"),
		D: hex("#4a5468"), // ズボン
		S: hex("#333a48"),
	},
	{
		down: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHHhHHHHhHHK..",
			"..KHHHHHHHHHHK..",
			"..KHKFFFFFFKHK..",
			"..KHKFBFFBFKHK..",
			"..KHKFFFFFFKHK..",
			"...KKFFFFFFKK...",
			"...KWWWWWWWWK...",
			"..KWWWKWWKWWWK..",
			"..KWWWWwwWWWWK..",
			"...KWWWWWWWWK...",
			"...KKDDDDDDKK...",
			...FEET,
		],
		up: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHHhHHHHhHHK..",
			"..KHHHHHHHHHHK..",
			"..KHHhHHHHhHHK..",
			"..KHHHHHHHHHHK..",
			"..KHhHHHHHHhHK..",
			"...KKHHHHHHKK...",
			"...KWWWWWWWWK...",
			"..KWWWWWWWWWWK..",
			"..KWWwWWWWwWWK..",
			"...KWWWWWWWWK...",
			"...KKDDDDDDKK...",
			...FEET,
		],
		right: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHHHHHHHHHHK..",
			"..KHHHHKKFFFFK..",
			"..KHhHHKFFFFFK..",
			"..KHhHHKFFFBFK..",
			"..KHHHHKFFFFFK..",
			"...KKHHKFFFKK...",
			"...KWWWWWWWWK...",
			"..KWWWWWKWWWWK..",
			"..KWWWWwwWWWWK..",
			"...KWWWWWWWWK...",
			"...KKDDDDDDKK...",
			...FEET,
		],
	},
	FEET_B,
);
