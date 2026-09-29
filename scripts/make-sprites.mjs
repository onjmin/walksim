// 素材が見つからなかったドット絵を作る（node scripts/make-sprites.mjs）。
//
// - public/sprites/mujje.png        … ムッジェ ΣΩΩ>（赤い 毛の 柱・柄の 先の 目玉・横に つき出た 口・白い 手袋）。RPGEN 歩行グラ規格 32x64
// - public/sprites/kiriko_botsu.png … ボツキリコ。キリコの歩行グラを灰色に沈めた差分 32x64
// - public/sprites/phono.png        … ちいさな蓄音機（置物）16x16
// - public/sprites/minors_*.png     … おんJマイナーズ（にぃちぇ・おんすちゃん・ンゴ姉・パン松・ヤヤポジ）32x64
// - public/sprites/metalngo.png     … メタルンゴ（隠し狩場のレア敵。銀色の しずく）32x64
// - public/sprites/nemurin.png      … ネムリン（ナイトキャップの寝ぼすけ）32x64
// - public/sprites/myaumyau_*.png   … ミャウミャウ A/B/C（紙袋の 服を 着た エルフ。出会うたび姿が違う）32x64
// - public/sprites/tsukuyomi.png    … つくよみちゃん（巫女）32x64
// - public/sprites/hasshaku.png     … 八尺様（白い長身シルエット。1コマ 16x32・シートは 32x128）
// - public/sprites/rino.png         … 春音リノ（お団子髪・エプロンの女将）32x64
// - public/sprites/aru.png          … 響化アル（長めマッシュの少年・シャツ）32x64
// - public/sprites/ai.png           … 優音アイ（輪郭線だけのスケッチ姿・半透明）32x64
// - public/sprites/ushiro.png       … 君野うしろ（赤紫ツインテール。全方向とも後ろ姿）32x64
//
// 依存なし（zlib だけ）。ドット絵は下の文字の絵から作る。

import { readFileSync, writeFileSync } from "node:fs";
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

/** RGBA 8bit・非インターレースの PNG だけ読む（キリコの歩行グラ用）。 */
const decodePng = (buf) => {
	let pos = 8;
	let w = 0;
	let h = 0;
	let colorType = 0;
	const idat = [];
	while (pos < buf.length) {
		const len = buf.readUInt32BE(pos);
		const type = buf.toString("ascii", pos + 4, pos + 8);
		const data = buf.subarray(pos + 8, pos + 8 + len);
		if (type === "IHDR") {
			w = data.readUInt32BE(0);
			h = data.readUInt32BE(4);
			if (data[8] !== 8 || data[12] !== 0)
				throw new Error("8bit・非インターレースのみ対応");
			colorType = data[9];
		} else if (type === "IDAT") idat.push(data);
		pos += 12 + len;
	}
	if (colorType !== 6)
		throw new Error(`colorType ${colorType} は未対応（RGBA のみ）`);
	const raw = inflateSync(Buffer.concat(idat));
	const bpp = 4;
	const stride = w * bpp;
	const out = Buffer.alloc(stride * h);
	for (let y = 0; y < h; y++) {
		const f = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? out[y * stride + x - bpp] : 0;
			const b = y > 0 ? out[(y - 1) * stride + x] : 0;
			const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
			let v = line[x];
			if (f === 1) v += a;
			else if (f === 2) v += b;
			else if (f === 3) v += (a + b) >> 1;
			else if (f === 4) {
				const p = a + b - c;
				const pa = Math.abs(p - a);
				const pb = Math.abs(p - b);
				const pc = Math.abs(p - c);
				v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
			}
			out[y * stride + x] = v & 0xff;
		}
	}
	return { w, h, rgba: out };
};

// ───────────────── 文字の絵 → 画素 ─────────────────

const hex = (s) => [
	Number.parseInt(s.slice(1, 3), 16),
	Number.parseInt(s.slice(3, 5), 16),
	Number.parseInt(s.slice(5, 7), 16),
	255,
];

/** 文字の絵を画素 (px, py) から描く（行の幅は16固定・行数は自由。八尺様の 16x32 コマ用）。 */
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

// ───────────────── おんJマイナーズ ─────────────────
// おんJwiki の「おんJマイナーズ」まわりの顔文字キャラ。顔文字の特徴だけを 16x16 に落とす。
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

// ───────────────── ムッジェ ΣΩΩ> ─────────────────
// おんJ 初期の お絵かきスレ「(´・ω・`)ここはぼくたちのあたらしい縄張りだからね」（2014）生まれ。板の バナーにも いる。
// 元絵：頭と 胴が ひとつづきの 赤い 柱（首は ない）に、ムックの ような まばらな 毛（短い 黒い 毛が ぴんぴん）。
// てっぺんから 目玉が 2つ 柄で 生え（ΩΩ）、横へ つき出た くちばしの ような 大きな 口（>。よく 開いている）。
// 手は 小さな 白い 手袋。足は ほとんど 見えない。roguelike の scripts/make-minors.mjs と 同じ 絵。
walkSheet(
	"mujje.png",
	{
		K: hex("#3a0d0a"),
		k: hex("#1a0604"),
		R: hex("#e0301f"),
		r: hex("#9e1f17"),
		W: hex("#ffffff"),
		B: hex("#141414"),
		M: hex("#5a0f12"),
		G: hex("#ffffff"),
		S: hex("#7a1a12"),
	},
	{
		down: [
			"....KK...KK.....",
			"...KWBK.KBWK....",
			"....KK...KK.....",
			"....KRK.KRK.....",
			"...KRRRRRRRRK...",
			"..kKRrRRRRrRK...",
			"...KRKMMMMKRK...",
			"...KRKMMMMKRKk..",
			"...KRRKKKKRRK...",
			"..GKRrRRRRrRKG..",
			".GGKRRRRrRRRKGG.",
			"..kKRRrRRRRRK...",
			"...KRRRRRrRRKk..",
			"..kKrRRRRRRrK...",
			...FEET,
		],
		up: [
			"....KK...KK.....",
			"...KWWK.KWWK....",
			"....KK...KK.....",
			"....KRK.KRK.....",
			"...KRRRRRRRRK...",
			"..kKRrRRRRrRK...",
			"...KRRRrRRRRK...",
			"...KRRRRRRrRKk..",
			"...KrRRRRRRRK...",
			"..GKRRRrRRRRKG..",
			".GGKRRRRRRrRKGG.",
			"..kKRrRRRRRRK...",
			"...KRRRRrRRRKk..",
			"..kKrRRRRRRrK...",
			...FEET,
		],
		right: [
			".......KK.KK....",
			"......KWBKWBK...",
			".......KK.KK....",
			".......KRKRK....",
			"....KRRRRRRK....",
			"...kKRRRRRRRKK..",
			"....KRrRRRRRRRK.",
			"....KRRRRKMMMMK.",
			"...kKRRRRRRRRK..",
			"....KRRrRRKK....",
			"....KRRRGGK.....",
			"...kKRrRGGK.....",
			"....KRRRRRKk....",
			"...kKrRRRrK.....",
			...FEET,
		],
	},
	FEET_B,
);

// にぃちぇ ξ◉ω◉)ξ … 両わきの ξ のドリル（金髪の 縦ロール）、見ひらいた目、ω の口。日曜日の子。
// 髪の 色は おんJwiki（にぃちぇ）の 色つきの 絵に 合わせた。
walkSheet(
	"minors_nichie.png",
	{
		K: hex("#4a3010"),
		H: hex("#f2c94c"),
		h: hex("#c79a22"),
		F: hex("#ffe0c8"),
		W: hex("#ffffff"),
		B: hex("#141414"),
		D: hex("#3a4a8a"),
		d: hex("#28336a"),
		S: hex("#4a2a2a"),
	},
	{
		down: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHhHHHHHHhHK..",
			".KHKFFFFFFFFKHK.",
			"KHKKWWWFFWWWKKHK",
			".KHKWBWFFWBWKHK.",
			"KHKKWWWFFWWWKKHK",
			".KHKFFKFFKFFKHK.",
			"KHK.KFFKKFFK.KHK",
			".KHK.KKKKKK.KHK.",
			"..K.KDDDDDDK.K..",
			"....KDdDDdDK....",
			"...KDDDDDDDDK...",
			...FEET,
		],
		up: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHHhHHHHhHHK..",
			".KHKHHHHHHHHKHK.",
			"KHKKHHhHHhHHKKHK",
			".KHKHHHHHHHHKHK.",
			"KHKKHhHHHHhHKKHK",
			".KHKHHHHHHHHKHK.",
			"KHK.KHHHHHHK.KHK",
			".KHK.KKKKKK.KHK.",
			"..K.KDDDDDDK.K..",
			"....KDdDDdDK....",
			"...KDDDDDDDDK...",
			...FEET,
		],
		right: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHHhHHHHHHHK..",
			".KHKHHHHFFFFFK..",
			"KHKKHHHFFFWWWK..",
			".KHKHHHFFFWBWK..",
			"KHKKHHHFFFWWWK..",
			".KHKHHHFFFFKFK..",
			"KHK.KHHFFFKFK...",
			".KHK.KKKKKKK....",
			"..K.KDDDDDDK....",
			"....KDdDDdDK....",
			"...KDDDDDDDDK...",
			...FEET,
		],
	},
	FEET_B,
);

// おんすちゃん S｡ﾟ(｡ﾟ@ω@°｡)ﾟ｡S … 両わきの縦ロール、リボン、ぐるぐる目と涙。おんS のお嬢さま。
const ONSU_BODY = ["..KK.KPPPPK.KK..", "....KPpPPpPK....", "...KPPPPPPPPK..."];
walkSheet(
	"minors_onsu.png",
	{
		K: hex("#3a2410"),
		R: hex("#e0405a"),
		H: hex("#f2c94c"),
		h: hex("#c79a22"),
		F: hex("#ffe4cc"),
		W: hex("#ffffff"),
		B: hex("#2a2a2a"),
		T: hex("#7cc8f0"),
		P: hex("#f49ac1"),
		p: hex("#d0689a"),
		S: hex("#6a3a2a"),
	},
	{
		down: [
			"......KRRK......",
			"....KKKRRKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"KHHKFFFFFFFFKHHK",
			"KHHKBBBFFBBBKHHK",
			"KHHKBWBFFBWBKHHK",
			"KHHKTFTFFTFTKHHK",
			"KHHKFFKFFKFFKHHK",
			".KHHKFFKKFFKHHK.",
			".KHHKKKKKKKKHHK.",
			...ONSU_BODY,
			...FEET,
		],
		up: [
			"......KRRK......",
			"....KKKRRKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"KHHKHHHHHHHHKHHK",
			"KHHKHhHHHHhHKHHK",
			"KHHKHHHHHHHHKHHK",
			"KHHKHhHHHHhHKHHK",
			"KHHKHHHHHHHHKHHK",
			".KHHKHHHHHHKHHK.",
			".KHHKKKKKKKKHHK.",
			...ONSU_BODY,
			...FEET,
		],
		right: [
			"......KRRK......",
			"....KKKRRKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"KHHKHHHFFFFFFK..",
			"KHHKHHFFFFBBBK..",
			"KHHKHHFFFFBWBK..",
			"KHHKHHFFFFTFTK..",
			"KHHKHHFFFFFKFK..",
			".KHHKHFFFFKK....",
			".KHHKKKKKKKK....",
			"..KK.KPPPPK.....",
			"....KPpPPpPK....",
			"...KPPPPPPPPK...",
			...FEET,
		],
	},
	FEET_B,
);

// ンゴ姉 ﾝ´ヮ｀ｺﾞ（人間型）… 誤変換「んごねぇ」から 生まれた お姉ちゃん。おんJwiki（ンゴ姉）の 絵に 合わせて：
// 銀の 長い 髪・頭の 両わきに「ン」「ゴ」の 黄色い 髪どめ・にっこり 閉じた 目（´ ｀）・ヮ の 口・青い セーター。
walkSheet(
	"minors_ngoane.png",
	{
		K: hex("#2a1a2a"),
		H: hex("#dcd6ee"),
		h: hex("#a89cc8"),
		Y: hex("#f5d142"),
		F: hex("#ffe0c8"),
		B: hex("#2a1a2a"),
		M: hex("#c8404a"),
		D: hex("#3a5ac8"),
		d: hex("#2a4096"),
		S: hex("#3a2a3a"),
	},
	{
		down: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			".KYHHHHHHHHHHYK.",
			".KYHFFFFFFFFHYK.",
			".KHHFBBFFBBFHHK.",
			".KHHFFFFFFFFHHK.",
			".KHHFFFKKFFFHHK.",
			".KHHFFKMMKFFHHK.",
			".KHHHFFKKFFHHHK.",
			".KHHHKDDDDKHHHK.",
			".KHHKDDDDDDKHHK.",
			".KHKDDdDDdDDKHK.",
			"..KKDDDDDDDDKK..",
			...FEET,
		],
		up: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			".KYHHHHHHHHHHYK.",
			".KYHHHHHHHHHHYK.",
			".KHHHhHHHHhHHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHhHHHHHHhHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHHhHHHHhHHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHhHHHHHHhHHK.",
			".KHHHHDDDDHHHHK.",
			"..KKDDDDDDDDKK..",
			...FEET,
		],
		right: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			".KHHHHHHHHHHYK..",
			".KHHHHHFFFFFYK..",
			".KHHHHHFFFBBFK..",
			".KHHHHHFFFFFFK..",
			".KHHHHHFFFFKKK..",
			".KHHHHHFFFKMK...",
			".KHHHHHHFFKK....",
			".KHHHHHKDDK.....",
			".KHHHHKDDDDK....",
			".KHHHKDDdDDDK...",
			"..KKKDDDDDDDK...",
			...FEET,
		],
	},
	FEET_B,
);

// パン松 |｀°Ο°´| … パン板の 食パン。おんJwiki（パン松）の 絵に 合わせて：山型の 耳（上だけ 茶色）の 白い 食パンの 体に
// 細い 白い 手足・｀´ の 眉・° の 目・Ο の 口（まるい 輪）。パン板から おんJを 侵略しに来る。
const PAN_TOP = ["...KKKK..KKKK...", "..KCCCCKKCCCCK..", "..KCWWWWWWWWCK.."];
const PAN_ARMS = "KWKWWWWWWWWWWKWK";
const PAN_BOTTOM = [
	".KKWWWWWWWWWWKK.",
	"..KWWWWWWWWWWK..",
	"..KwwwwwwwwwwK..",
	"..KKKKKKKKKKKK..",
	"....KWK..KWK....",
	"....KKK..KKK....",
];
const PLAIN = "..KWWWWWWWWWWK..";
walkSheet(
	"minors_panmatsu.png",
	{
		K: hex("#3a2210"),
		C: hex("#c98a3e"),
		W: hex("#fff3d6"),
		w: hex("#e8d8b0"),
		B: hex("#3a2210"),
	},
	{
		down: [
			...PAN_TOP,
			"..KWBWWWWWWBWK..",
			"..KWWBWWWWBWWK..",
			"..KWWKWWWWKWWK..",
			PLAIN,
			"..KWWWWKKWWWWK..",
			"KWKWWWKWWKWWWKWK",
			"KWKWWWWKKWWWWKWK",
			...PAN_BOTTOM,
		],
		up: [
			...PAN_TOP,
			PLAIN,
			PLAIN,
			PLAIN,
			PLAIN,
			PLAIN,
			PAN_ARMS,
			PAN_ARMS,
			...PAN_BOTTOM,
		],
		right: [
			...PAN_TOP,
			"..KWWBWWWWWBWK..",
			"..KWWWBWWWBWWK..",
			"..KWWWKWWWKWWK..",
			PLAIN,
			"..KWWWWWKKWWWK..",
			"KWKWWWWKWWKWWKWK",
			"KWKWWWWWKKWWWKWK",
			...PAN_BOTTOM,
		],
	},
	["...KWK....KWK...", "...KKK....KKK..."],
);

// ヤヤポジ (*^△^*) … ポジハメを ひかえめにした子。青いやきう帽、^ の目、△ の口、* のほっぺ。
const YAYA_BODY = ["...KKKKKKKKKK...", "..KWWWLLLLWWWK..", "..KWWWLLLLWWWK.."];
walkSheet(
	"minors_yayapoji.png",
	{
		K: hex("#1a2240"),
		L: hex("#2a5cc8"),
		H: hex("#3a2a1a"),
		F: hex("#ffe0c4"),
		P: hex("#f28aa0"),
		W: hex("#f4f6fa"),
		S: hex("#2a2a3a"),
	},
	{
		down: [
			"....KKKKKKKK....",
			"...KLLLLLLLLK...",
			"..KLLLLLLLLLLK..",
			"..KKKKKKKKKKKK..",
			".KFFFFFFFFFFFFK.",
			".KFFFKFFFFKFFFK.",
			".KFFKFKFFKFKFFK.",
			".KPFFFFKKFFFFPK.",
			".KPFFFKFFKFFFPK.",
			"..KFFFKKKKFFFK..",
			"...KFFFFFFFFK...",
			...YAYA_BODY,
			...FEET,
		],
		up: [
			"....KKKKKKKK....",
			"...KLLLLLLLLK...",
			"..KLLLLLLLLLLK..",
			"..KLLLLLLLLLLK..",
			".KHHHHHHHHHHHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHHHHHHHHHHHK.",
			"..KHHHHHHHHHHK..",
			"...KHHHHHHHHK...",
			...YAYA_BODY,
			...FEET,
		],
		right: [
			"....KKKKKKKK....",
			"...KLLLLLLLLK...",
			"..KLLLLLLLLLLK..",
			"..KKKKKKKKKKKKKK",
			".KHHFFFFFFFFFFK.",
			".KHHFFFFFFKFFFK.",
			".KHHFFFFFKFKFFK.",
			".KHHFFFFPFFFKFK.",
			"..KHFFFFFFFKKKK.",
			"...KFFFFFFFFK...",
			"...KKKKKKKKKK...",
			"..KWWWLLLLWWWK..",
			"..KWWWLLLLWWWK..",
			"..KWWWWWWWWWWK..",
			...FEET,
		],
	},
	FEET_B,
);

// ───────────────── メタルンゴ（隠し狩場のレア敵） ─────────────────
// 銀色の しずく。まるい目と ちいさな口、左上に光。2コマ目は すこし つぶれる。
const METAL_BODY = [
	"................",
	"................",
	".......KK.......",
	"......KLSK......",
	".....KLWSSK.....",
	"....KLWSSSSK....",
	"...KSLSSSSSSK...",
	"..KSSSSSSSSSSK..",
];
const METAL_BOTTOM = [
	".KSSSSSSSSSSSSK.",
	".KDSSSSSSSSSSDK.",
	"..KDDSSSSSSDDK..",
	"...KKKKKKKKKK...",
];
walkSheet(
	"metalngo.png",
	{
		K: hex("#2a2e3a"),
		S: hex("#b8c2d0"),
		L: hex("#e6edf5"),
		W: hex("#ffffff"),
		D: hex("#7c8698"),
		E: hex("#1a1c24"),
		M: hex("#4a5060"),
	},
	{
		down: [
			...METAL_BODY,
			"..KSSESSSSESSK..",
			".KSSSESSSSESSSK.",
			".KSSSSSMMSSSSSK.",
			".KSSSSSSSSSSSSK.",
			...METAL_BOTTOM,
		],
		up: [
			...METAL_BODY,
			"..KSSSSSSSSSSK..",
			".KSSSSSSSSSSSSK.",
			".KSSSSSSSSSSSSK.",
			".KSSSSSSSSSSSSK.",
			...METAL_BOTTOM,
		],
		right: [
			...METAL_BODY,
			"..KSSSSSSESSEK..",
			".KSSSSSSSESSEKK.",
			".KSSSSSSSSSMMSK.",
			".KSSSSSSSSSSSSK.",
			...METAL_BOTTOM,
		],
	},
	["..KKKKKKKKKKKK..", "................"],
);

// ───────────────── ボツキリコ ─────────────────
// キリコの歩行グラを「色を抜いて、冷たい灰色に沈めた」差分。
// 若草色の髪（ポニテ）は黒っぽい鉄色にして、角刈りっぽい重さを出す。

// 元の絵は RPGEN「蓄音キリコ」（src/data/cast.ts の sa:vHsmy5）。
const src = decodePng(
	Buffer.from(
		await (await fetch("https://rpgen-search.pages.dev/data/images/sAnims/vHsmy5.png")).arrayBuffer(),
	),
);
const botsu = Buffer.from(src.rgba);
for (let i = 0; i < botsu.length; i += 4) {
	const [r, g, b, a] = botsu.subarray(i, i + 4);
	if (a === 0) continue;
	const lum = 0.3 * r + 0.59 * g + 0.11 * b;
	const greenish = g > r + 20 && g > b; // 若草色の髪
	if (greenish) {
		// 髪は暗い鉄色
		const v = Math.round(40 + lum * 0.35);
		botsu[i] = v;
		botsu[i + 1] = v + 4;
		botsu[i + 2] = v + 12;
	} else {
		// それ以外は青みの灰色に（少し暗く）
		const v = Math.round(lum * 0.8 + 18);
		botsu[i] = Math.min(255, v);
		botsu[i + 1] = Math.min(255, v + 6);
		botsu[i + 2] = Math.min(255, v + 18);
	}
}
writeFileSync(join(OUT, "kiriko_botsu.png"), encodePng(src.w, src.h, botsu));

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

// ───────────────── ネムリン ─────────────────
// 改札の番人（虚弱・眠たいむ〜ん）。ポンポンつきのナイトキャップ、閉じかけの目、パジャマ。

walkSheet(
	"nemurin.png",
	{
		K: hex("#2a2440"),
		N: hex("#8a7ac8"), // ナイトキャップ
		n: hex("#6a5aa8"),
		P: hex("#f4eefc"), // ポンポン
		F: hex("#ffe8d8"),
		B: hex("#4a3a5a"), // 閉じかけの目
		J: hex("#b8ace0"), // パジャマ
		j: hex("#9488c0"),
		S: hex("#4a4460"),
	},
	{
		down: [
			"......KPPK......",
			".....KKNNKK.....",
			"....KNNNNNNK....",
			"...KNNnNNnNNK...",
			"..KKKKKKKKKKKK..",
			"..KFFFFFFFFFFK..",
			".KFFBBFFFFBBFFK.",
			".KFFFFFFFFFFFFK.",
			".KFFFFFKKFFFFFK.",
			"..KFFFFFFFFFFK..",
			"..KKJJJJJJJJKK..",
			"...KJJjJJjJJK...",
			"...KJJJJJJJJK...",
			"...KJJJJJJJJK...",
			...FEET,
		],
		up: [
			"......KPPK......",
			".....KKNNKK.....",
			"....KNNNNNNK....",
			"...KNNNNNNNNK...",
			"..KKNnNNNNnNKK..",
			"..KNNNNNNNNNNK..",
			".KNNnNNNNNNnNNK.",
			".KNNNNNNNNNNNNK.",
			".KNNNNnNNnNNNNK.",
			"..KNNNNNNNNNNK..",
			"..KKJJJJJJJJKK..",
			"...KJjJJJJjJK...",
			"...KJJJJJJJJK...",
			"...KJJJJJJJJK...",
			...FEET,
		],
		right: [
			"......KPPK......",
			".....KKNNKK.....",
			"....KNNNNNNK....",
			"...KNNnNNnNNK...",
			"..KKKKKKKKKKKK..",
			"..KFFFFFFFFFFK..",
			".KFFFFFBBFFBBFK.",
			".KFFFFFFFFFFFFK.",
			".KFFFFFFFKKFFFK.",
			"..KFFFFFFFFFFK..",
			"..KKJJJJJJJJKK..",
			"...KJJjJJjJJK...",
			"...KJJJJJJJJK...",
			"...KJJJJJJJJK...",
			...FEET,
		],
	},
	FEET_B,
);

// ───────────────── ミャウミャウ A/B/C ─────────────────
// おんJwiki（ミャウミャウ）の 絵に 合わせて：紙袋は 服（茶色い 紙袋の ワンピース）。銀の 長い 髪・とがった エルフの 耳・
// 頭に イカの 胴の ような 頭巾（顔面：ダイオウイカ）・・ワ・ の 顔・はだし。roguelike の minors_miaumiau.png と 同じ 形。
// 公式にも 絵が 定まっていないので、出会うたび 頭巾・髪・袋の 色が ちがう（A：桃色の 頭巾 / B：白い 頭巾に 垂れた 触手 /
// C：藤色の 頭巾に「無印」の 帯の 袋）。

const myauSheet = (file, colors, { band = false, tentacles = false } = {}) => {
	const pal = {
		K: hex("#3a2a3a"),
		Q: hex(colors.hood[0]),
		q: hex(colors.hood[1]),
		H: hex(colors.hair[0]),
		h: hex(colors.hair[1]),
		F: hex("#ffe0c8"),
		B: hex("#141414"),
		M: hex("#c84a5a"),
		G: hex(colors.bag[0]),
		g: hex(colors.bag[1]),
		R: hex("#8a2a2a"), // 袋の 帯
		S: hex("#f2c8a8"), // はだしの 足
	};
	const hood = [
		".....KKKKKK.....",
		"....KQQQQQQK....",
		"...KQQqQQqQQK...",
		"..KQQQQQQQQQQK..",
	];
	// 頭巾の ふちから 垂れる 触手（B）
	const side = tentacles ? "q" : "H";
	const down = [
		...hood,
		".KHHHHHHHHHHHHK.",
		"FKHFFFFFFFFFFHKF",
		`.K${side}FBFFFFFFBF${side}K.`,
		`.K${side}FFFFMMFFFF${side}K.`,
		`.K${side}HFFFFFFFFH${side}K.`,
		".KHHKGGGGGGKHHK.",
		".KHKFGGGGGGFKHK.",
		band ? ".KHKRRRRRRRRKHK." : ".KHKGGgGGgGGKHK.",
		"..KKGGGGGGGGKK..",
		"...KgGgGGgGgK...",
		...FEET,
	];
	const up = [
		...hood,
		".KHHHHHHHHHHHHK.",
		"FKHHHHHHHHHHHHKF",
		".KHHhHHHHHHhHHK.",
		".KHHHHHHHHHHHHK.",
		".KHHHhHHHHhHHHK.",
		".KHHHHHHHHHHHHK.",
		".KHHhHHHHHHhHHK.",
		".KHHHHHHHHHHHHK.",
		"..KKGGGGGGGGKK..",
		"...KgGgGGgGgK...",
		...FEET,
	];
	const right = [
		...hood,
		".KHHHHHHHHHHHK..",
		"FKHHHHFFFFFFFK..",
		".KHHHHFFFFFBFK..",
		".KHHHHFFFFFFMK..",
		`.KHHH${side}HFFFFFK...`,
		".KHHHHKGGGGK....",
		".KHHHKGGGFGK....",
		band ? ".KHHKRRRRRRK...." : ".KHHKGGgGGGK....",
		"..KKGGGGGGGK....",
		"...KgGgGGgK.....",
		...FEET,
	];
	walkSheet(file, pal, { down, up, right }, FEET_B);
};

myauSheet("myaumyau_a.png", {
	hood: ["#f2cfe2", "#c88aae"],
	hair: ["#eceaf4", "#b8b4cc"],
	bag: ["#b08050", "#8a6038"],
});
myauSheet(
	"myaumyau_b.png",
	{
		hood: ["#f6f4f8", "#c8c0d8"],
		hair: ["#e4e8f2", "#aab0c8"],
		bag: ["#a87848", "#7e5630"],
	},
	{ tentacles: true },
);
myauSheet(
	"myaumyau_c.png",
	{
		hood: ["#dccff0", "#a890cc"],
		hair: ["#f0eef6", "#c0bcd4"],
		bag: ["#b88a5a", "#906a40"],
	},
	{ band: true },
);

// ───────────────── つくよみちゃん ─────────────────
// 村の神社の巫女。黒髪のおかっぱ、白い着物、赤い袴、胸元にリボン。

walkSheet(
	"tsukuyomi.png",
	{
		K: hex("#241a20"),
		H: hex("#2e2630"), // 髪
		h: hex("#4a3e50"),
		F: hex("#ffe4d4"),
		B: hex("#3a2a34"),
		R: hex("#c8323e"), // 袴
		r: hex("#96242e"),
		W: hex("#f8f4ee"), // 着物
		P: hex("#e05a6a"), // リボン
		S: hex("#3a2a2a"),
	},
	{
		down: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHhHHHHHHhHK..",
			".KHHKFFFFFFKHHK.",
			".KHKFFFFFFFFKHK.",
			".KHKFBFFFFBFKHK.",
			".KHKFFFFFFFFKHK.",
			".KHKFFFKKFFFKHK.",
			"..KKWWWWWWWWKK..",
			"..KWWWWPPWWWWK..",
			"..KRRRRRRRRRRK..",
			"..KRrRRRRRRrRK..",
			"..KRRRRRRRRRRK..",
			...FEET,
		],
		up: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHHhHHHHhHHK..",
			".KHHHHHHHHHHHHK.",
			".KHHhHHHHHHhHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHHHHHHHHHHHK.",
			"..KHHHHHHHHHHK..",
			"..KKWWWWWWWWKK..",
			"..KWWWWWWWWWWK..",
			"..KRRRRRRRRRRK..",
			"..KRrRRRRRRrRK..",
			"..KRRRRRRRRRRK..",
			...FEET,
		],
		right: [
			"....KKKKKKKK....",
			"...KHHHHHHHHK...",
			"..KHHHHHHHHHHK..",
			"..KHhHHHFFFFFK..",
			".KHHHHHFFFFFFK..",
			".KHHHHHFFFBFFK..",
			".KHHHHHFFFFFFK..",
			".KHHHHHFFFKKFK..",
			"..KHHHHFFFFFFK..",
			"..KKWWWWWWWWKK..",
			"..KWWWWWWWPPWK..",
			"..KRRRRRRRRRRK..",
			"..KRrRRRRRRrRK..",
			"..KRRRRRRRRRRK..",
			...FEET,
		],
	},
	FEET_B,
);

// ───────────────── 八尺様 ─────────────────
// 遠景専用の白い長身シルエット（広いつばの帽子・長いワンピース）。1コマ 16x32 で、
// シートは RPGEN 規格と同じ並び（2コマ×4方向）の 32x128。engine/sprite.ts の drawWalk は
// コマの大きさを画像から割り出し、足元をマスの下端にそろえて描くので、上半身は上のマスへはみ出す。

const HASSHAKU_PAL = {
	W: hex("#f2f2f6"),
	w: hex("#d4d4e0"),
};

/** 1コマぶん（16x32）。sway で すその ゆれを少し変える。 */
const hasshakuArt = (sway) => [
	"......WWWW......",
	".....WWWWWW.....",
	"..WWWWWWWWWWWW..",
	".WWWWWWWWWWWWWW.",
	"..wwWWWWWWWWww..",
	".....wWWWWw.....",
	".....WWWWWW.....",
	".....WWWWWW.....",
	"......WWWW......",
	".....WWWWWW.....",
	".....WWWWWW.....",
	"....WWWWWWWW....",
	"....WWWWWWWW....",
	"....WWwWWwWW....",
	"....WWWWWWWW....",
	"....WWWWWWWW....",
	"...WWWWWWWWWW...",
	"...WWWWWWWWWW...",
	"...WWwWWWWwWW...",
	"...WWWWWWWWWW...",
	"...WWWWWWWWWW...",
	"..WWWWWWWWWWWW..",
	"..WWWWWWWWWWWW..",
	"..WWwWWWWWWwWW..",
	"..WWWWWWWWWWWW..",
	"..WWWWWWWWWWWW..",
	".WWWWWWWWWWWWWW.",
	".WWWWWWWWWWWWWW.",
	sway ? ".WWWWwWWWWwWWWW." : ".WWwWWWWWWWWwWW.",
	".WWWWWWWWWWWWWW.",
	sway ? ".wWWWWWWWWWWWWw." : "..wWWWWWWWWWWw..",
	"................",
];

const hasshaku = Buffer.alloc(32 * 128 * 4);
for (let f = 0; f < 2; f++) {
	const art = hasshakuArt(f);
	for (let row = 0; row < 4; row++)
		paintPx(hasshaku, 32, f * 16, row * 32, row === 3 ? mirror(art) : art, HASSHAKU_PAL);
}
writeFileSync(join(OUT, "hasshaku.png"), encodePng(32, 128, hasshaku));

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

// ───────────────── 優音アイ ─────────────────
// 「描きかけの絵」。輪郭線だけのスケッチ風：白〜淡グレーの線のみ・塗りなし・半透明。
// 色は alpha を落として、うっすら向こうが透ける（消えかけの存在）。

const AI_L = [205, 210, 222, 180]; // 輪郭線
const AI_l = [180, 186, 200, 110]; // 描きかけの薄い線
const AI_FEET = [".....LL..LL.....", "................"];
const AI_FEET_B = ["....LL....LL....", "................"];
walkSheet(
	"ai.png",
	{ L: AI_L, l: AI_l },
	{
		down: [
			"....LLLLLLLL....",
			"...L........L...",
			"..L..........L..",
			"..L..........L..",
			"..L..l....l..L..",
			"..L..........L..",
			"...L........L...",
			"....LLLLLLLL....",
			"......L..L......",
			"....LL....LL....",
			"...L...ll...L...",
			"...L........L...",
			"...L........L...",
			"....LLLLLLLL....",
			...AI_FEET,
		],
		up: [
			"....LLLLLLLL....",
			"...L........L...",
			"..L..........L..",
			"..L..........L..",
			"..L..........L..",
			"..L..........L..",
			"...L........L...",
			"....LLLLLLLL....",
			"......L..L......",
			"....LL....LL....",
			"...L..l..l..L...",
			"...L........L...",
			"...L........L...",
			"....LLLLLLLL....",
			...AI_FEET,
		],
		right: [
			"....LLLLLLLL....",
			"...L........L...",
			"..L..........L..",
			"..L..........L..",
			"..L........l.L..",
			"..L..........L..",
			"...L........L...",
			"....LLLLLLLL....",
			"......L..L......",
			"....LL....LL....",
			"...L....l...L...",
			"...L........L...",
			"...L........L...",
			"....LLLLLLLL....",
			...AI_FEET,
		],
	},
	AI_FEET_B,
);

// ───────────────── 君野うしろ ─────────────────
// 「君の、うしろ」。赤紫ツインテールの少女。**全方向とも後ろ姿**（down 向きでも後頭部）。
// どの向きに歩いても顔が見えない＝目が合わない、をグラだけで作る。

const USHIRO_BACK = [
	"....KKKKKKKK....",
	"...KRRRRRRRRK...",
	"..KRRRRRRRRRRK..",
	".KRRKRRRRRRKRRK.",
	".KRrKRRrrRRKRrK.",
	".KRRKRRRRRRKRRK.",
	".KRrKKRRRRKKRrK.",
	".KRRK.KKKK.KRRK.",
	".KRrKKDDDDKKRrK.",
	".KRRKDDDDDDKRRK.",
	".KRrKDdDDdDKRrK.",
	"..KKKDDDDDDKKK..",
	"....KDDDDDDK....",
	"...KDDDDDDDDK...",
	...FEET,
];
walkSheet(
	"ushiro.png",
	{
		K: hex("#241626"),
		R: hex("#a04070"), // 髪（赤紫）
		r: hex("#7a2c56"),
		D: hex("#3a3444"), // 服
		d: hex("#2a2534"),
		S: hex("#2a2028"),
	},
	{ down: USHIRO_BACK, up: USHIRO_BACK, right: USHIRO_BACK },
	FEET_B,
);

console.log(
	"wrote mujje.png, kiriko_botsu.png, phono.png, minors_*.png, nemurin.png, myaumyau_*.png, tsukuyomi.png, hasshaku.png, rino.png, aru.png, ai.png, ushiro.png",
);
