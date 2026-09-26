// 素材が見つからなかったドット絵を作る（node scripts/make-sprites.mjs）。
//
// - public/sprites/mujje.png        … ムッジェ ΣΩΩ>（赤い毛むくじゃら）。RPGEN 歩行グラ規格 32x64
// - public/sprites/kiriko_botsu.png … ボツキリコ。キリコの歩行グラを灰色に沈めた差分 32x64
// - public/sprites/phono.png        … ちいさな蓄音機（置物）16x16
// - public/sprites/minors_*.png     … おんJマイナーズ（にぃちぇ・おんすちゃん・ンゴ姉・パン松・ヤヤポジ）32x64
// - public/sprites/metalngo.png     … メタルンゴ（隠し狩場のレア敵。銀色の しずく）32x64
// - public/sprites/nemurin.png      … ネムリン（ナイトキャップの寝ぼすけ）32x64
// - public/sprites/myaumyau_*.png   … ミャウミャウ A/B/C（紙袋頭の小柄な人影。出会うたび姿が違う）32x64
// - public/sprites/tsukuyomi.png    … つくよみちゃん（巫女）32x64
// - public/sprites/hasshaku.png     … 八尺様（白い長身シルエット。1コマ 16x32・シートは 32x128）
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

// ───────────────── ムッジェ ΣΩΩ> ─────────────────
// 板のバナーに出る赤い毛むくじゃら（ムック＋J民）。大きな口「>」と、頭のプロペラ。

const MUJJE_PAL = {
	K: hex("#3a0d0a"), // 輪郭
	R: hex("#d8352a"), // 毛
	r: hex("#9e1f17"), // 毛の影
	P: hex("#f27a5e"), // 毛のつや
	W: hex("#ffffff"),
	B: hex("#141414"),
	M: hex("#5a0f12"), // 口の中
	T: hex("#ff9aa2"), // 舌
	Y: hex("#f6c945"), // プロペラ
	y: hex("#b98a1a"),
};

const mujjeDown = [
	[
		".....YYKYY......",
		".......K........",
		"....KKKKKKKK....",
		"...KRPRRRRPRK...",
		"..KRRRRRRRRRRK..",
		"..KRWWRRRRWWRK..",
		".KRRWBRRRRWBRRK.",
		".KRRRRRRRRRRRRK.",
		".KRRKKKKKKKKRRK.",
		".KRRKMMMMMMKRRK.",
		".KRRKMTTTTMKRRK.",
		"..KRRKKKKKKRRK..",
		"..KRrRRrRRrRRK..",
		"...KRrKRRKrRK...",
		"...KKK.KK.KKK...",
		"................",
	],
	[
		"......YKYYY.....",
		".......K........",
		"....KKKKKKKK....",
		"...KRPRRRRPRK...",
		"..KRRRRRRRRRRK..",
		"..KRWWRRRRWWRK..",
		".KRRWBRRRRWBRRK.",
		".KRRRRRRRRRRRRK.",
		".KRRKKKKKKKKRRK.",
		".KRRKMMMMMMKRRK.",
		".KRRKMTTTTMKRRK.",
		"..KRRKKKKKKRRK..",
		"..KRrRRrRRrRRK..",
		"...KRrKRRKrRK...",
		"....KK.KK.KK....",
		"....KK....KK....",
	],
];

const mujjeUp = [
	[
		".....YYKYY......",
		".......K........",
		"....KKKKKKKK....",
		"...KRRRRRRRRK...",
		"..KRrRRrRRrRRK..",
		"..KRRRRRRRRRRK..",
		".KRRrRRrRRrRRRK.",
		".KRRRRRRRRRRRRK.",
		".KRrRRrRRrRRrRK.",
		".KRRRRRRRRRRRRK.",
		".KRRrRRrRRrRRRK.",
		"..KRRRRRRRRRRK..",
		"..KRrRRrRRrRRK..",
		"...KRrKRRKrRK...",
		"...KKK.KK.KKK...",
		"................",
	],
	[
		"......YKYYY.....",
		".......K........",
		"....KKKKKKKK....",
		"...KRRRRRRRRK...",
		"..KRrRRrRRrRRK..",
		"..KRRRRRRRRRRK..",
		".KRRrRRrRRrRRRK.",
		".KRRRRRRRRRRRRK.",
		".KRrRRrRRrRRrRK.",
		".KRRRRRRRRRRRRK.",
		".KRRrRRrRRrRRRK.",
		"..KRRRRRRRRRRK..",
		"..KRrRRrRRrRRK..",
		"...KRrKRRKrRK...",
		"....KK.KK.KK....",
		"....KK....KK....",
	],
];

// 右向き：顔が右に寄り、口「>」が右を向く
const mujjeRight = [
	[
		".....YYKYY......",
		".......K........",
		"....KKKKKKKK....",
		"...KRRRRRPRRK...",
		"..KRRRRRRRRRRK..",
		"..KRRRRRWWRRRK..",
		".KRRrRRRWBRRRK..",
		".KRRRRRRRRRRRKK.",
		".KRrRRRRKKKKKKK.",
		".KRRRRRRKMMMMK..",
		".KRRrRRRKMTTK...",
		"..KRRRRRKKKK....",
		"..KRrRRrRRRK....",
		"...KRrKRRKK.....",
		"...KKK.KKK......",
		"................",
	],
	[
		"......YKYYY.....",
		".......K........",
		"....KKKKKKKK....",
		"...KRRRRRPRRK...",
		"..KRRRRRRRRRRK..",
		"..KRRRRRWWRRRK..",
		".KRRrRRRWBRRRK..",
		".KRRRRRRRRRRRKK.",
		".KRrRRRRKKKKKKK.",
		".KRRRRRRKMMMMK..",
		".KRRrRRRKMTTK...",
		"..KRRRRRKKKK....",
		"..KRrRRrRRRK....",
		"...KRrKRRKK.....",
		"....KKKK.KK.....",
		"....KK....K.....",
	],
];

// RPGEN 規格の行順: 後(上)・右・前(下)・左
const mujje = Buffer.alloc(32 * 64 * 4);
for (let f = 0; f < 2; f++) {
	paint(mujje, 32, f, 0, mujjeUp[f], MUJJE_PAL);
	paint(mujje, 32, f, 1, mujjeRight[f], MUJJE_PAL);
	paint(mujje, 32, f, 2, mujjeDown[f], MUJJE_PAL);
	paint(mujje, 32, f, 3, mirror(mujjeRight[f]), MUJJE_PAL);
}
writeFileSync(join(OUT, "mujje.png"), encodePng(32, 64, mujje));

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

// にぃちぇ ξ◉ω◉)ξ … 両わきの ξ のドリル、見ひらいた目、ω の口。日曜日の子。
walkSheet(
	"minors_nichie.png",
	{
		K: hex("#2a1a3a"),
		H: hex("#b48be0"),
		h: hex("#7d5aa8"),
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

// ンゴ姉 ﾝ´ヮ｀ｺﾞ … やきうの お姉ちゃん。やきう帽、´ ｀ の目、ヮ の口、長い髪。
walkSheet(
	"minors_ngoane.png",
	{
		K: hex("#2a1a10"),
		Y: hex("#f5d142"),
		H: hex("#6a3a1e"),
		h: hex("#4a2612"),
		F: hex("#ffdcbc"),
		B: hex("#2a1a10"),
		M: hex("#b8303a"),
		O: hex("#f08a3a"),
		o: hex("#c0602a"),
		S: hex("#3a2a2a"),
	},
	{
		down: [
			"....KKKKKKKK....",
			"...KYYYYYYYYK...",
			"..KYYYYYYYYYYK..",
			".KKKKKKKKKKKKKK.",
			".KHHFFFFFFFFHHK.",
			".KHFFBFFFFBFFHK.",
			".KHFBFFFFFFBFHK.",
			".KHFFFKKKKFFFHK.",
			".KHHFFKMMKFFHHK.",
			".KHHKFFKKFFKHHK.",
			".KHHHKKKKKKHHHK.",
			".KHHKOOOOOOKHHK.",
			"..KKKOoOOoOKKK..",
			"...KOOOOOOOOK...",
			...FEET,
		],
		up: [
			"....KKKKKKKK....",
			"...KYYYYYYYYK...",
			"..KYYYYYYYYYYK..",
			".KKYYYYYYYYYYKK.",
			".KHHHHHHHHHHHHK.",
			".KHHhHHHHHHhHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHhHHHHHHhHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHhHHHHHHhHHK.",
			".KHHHHHHHHHHHHK.",
			".KHHKOOOOOOKHHK.",
			"..KKKOoOOoOKKK..",
			"...KOOOOOOOOK...",
			...FEET,
		],
		right: [
			"....KKKKKKKK....",
			"...KYYYYYYYYK...",
			"...KYYYYYYYYYK..",
			"..KKKKKKKKKKKKKK",
			"..KHHHHFFFFFFK..",
			"..KHHHHFFFFBFK..",
			"..KHHHHFFFFFBK..",
			"..KHHHHFFFFKKK..",
			"..KHHHHFFFKMK...",
			"..KHHHHKFFKKK...",
			"..KHHHHKKKK.....",
			"..KHHKOOOOOOK...",
			"...KKOoOOoOK....",
			"....KOOOOOOK....",
			...FEET,
		],
	},
	FEET_B,
);

// パン松 |｀°Ο°´| … 食パン。｀´ の眉、° の目、Ο の口。パン板から おんJを 侵略しに来る。
const PAN_TOP = ["..KKKKK..KKKKK..", ".KCCCCCKKCCCCCK.", ".KCWWWWWWWWWWCK."];
const PAN_BOTTOM = [
	".KCCCCCCCCCCCCK.",
	".KKKKKKKKKKKKKK.",
	"....KK....KK....",
	"....KK....KK....",
];
const PLAIN = ".KCWWWWWWWWWWCK.";
walkSheet(
	"minors_panmatsu.png",
	{
		K: hex("#3a2210"),
		C: hex("#c98a3e"),
		W: hex("#fff3d6"),
		B: hex("#3a2210"),
		M: hex("#8a3a2a"),
	},
	{
		down: [
			...PAN_TOP,
			".KCWBWWWWWWBWCK.",
			".KCWWBWWWWBWWCK.",
			".KCWWKWWWWKWWCK.",
			PLAIN,
			".KCWWWWKKWWWWCK.",
			".KCWWWKMMKWWWCK.",
			".KCWWWWKKWWWWCK.",
			"KKCWWWWWWWWWWCKK",
			PLAIN,
			...PAN_BOTTOM,
		],
		up: [
			...PAN_TOP,
			PLAIN,
			PLAIN,
			PLAIN,
			PLAIN,
			PLAIN,
			PLAIN,
			PLAIN,
			"KKCWWWWWWWWWWCKK",
			PLAIN,
			...PAN_BOTTOM,
		],
		right: [
			...PAN_TOP,
			".KCWWWBWWWWWBCK.",
			".KCWWWWBWWWBWCK.",
			".KCWWWWKWWWKWCK.",
			PLAIN,
			".KCWWWWWWKKWWCK.",
			".KCWWWWWKMMKWCK.",
			".KCWWWWWWKKWWCK.",
			".KCWWWWWWWWWWCKK",
			PLAIN,
			...PAN_BOTTOM,
		],
	},
	["....KK....KK....", "...KK......KK..."],
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

const src = decodePng(readFileSync(join(OUT, "kiriko.png")));
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
// 紙袋頭の小柄な人影（白基調）。公式にデザイン未確定のキャラなので、出会うたび姿が違う。
// A: まるい目穴 / B: 細い目穴と描かれた口 / C: 高さのそろわない目穴。袋の色も少しずつ変える。

const myauSheet = (file, bagPal, face) => {
	const pal = {
		K: hex("#3a3630"),
		C: hex(bagPal[0]), // 紙袋
		c: hex(bagPal[1]),
		W: hex("#f4f2ea"), // 体
		w: hex("#d8d4c8"),
		B: hex("#201c18"), // 目穴
		M: hex("#8a4a3a"), // 描かれた口
		S: hex("#55504a"),
	};
	const bagTop = [
		"..KKKKKKKKKKKK..",
		".KCCCCCCCCCCCCK.",
		".KCcCCCCCCCCcCK.",
		".KCCCCCCCCCCCCK.",
	];
	const bagBottom = [
		".KCcCCCCCCCCcCK.",
		".KCCCCCCCCCCCCK.",
		"..KKKKKKKKKKKK..",
	];
	const body = [
		"...KWWWWWWWWK...",
		"...KWwWWWWwWK...",
		"...KWWWWWWWWK...",
		"....KWWWWWWK....",
	];
	const plain = [
		".KCCCCCCCCCCCCK.",
		".KCCCCcCCCCCCCK.",
		".KCCCCCCCCCCCCK.",
	];
	const dir = (rows) => [...bagTop, ...rows, ...bagBottom, ...body, ...FEET];
	walkSheet(
		file,
		pal,
		{ down: dir(face.down), up: dir(plain), right: dir(face.right) },
		FEET_B,
	);
};

myauSheet("myaumyau_a.png", ["#e8dcc0", "#c8b890"], {
	down: [
		".KCCBBCCCCBBCCK.",
		".KCCBBCCCCBBCCK.",
		".KCCCCCCCCCCCCK.",
	],
	right: [
		".KCCCCCBBCCBBCK.",
		".KCCCCCBBCCBBCK.",
		".KCCCCCCCCCCCCK.",
	],
});
myauSheet("myaumyau_b.png", ["#ddd2b6", "#bfae86"], {
	down: [
		".KCCBBBCCBBBCCK.",
		".KCCCCCCCCCCCCK.",
		".KCCCCMMMMCCCCK.",
	],
	right: [
		".KCCCCBBBCBBBCK.",
		".KCCCCCCCCCCCCK.",
		".KCCCCCCMMMMCCK.",
	],
});
myauSheet("myaumyau_c.png", ["#d8c8a8", "#b4a078"], {
	down: [
		".KCBBCCCCCCCCCK.",
		".KCCCCCCCCCBBCK.",
		".KCCCCCCCCCCCCK.",
	],
	right: [
		".KCCCBBCCCCCCCK.",
		".KCCCCCCCCCBBCK.",
		".KCCCCCCCCCCCCK.",
	],
});

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

console.log(
	"wrote mujje.png, kiriko_botsu.png, phono.png, minors_*.png, nemurin.png, myaumyau_*.png, tsukuyomi.png, hasshaku.png",
);
