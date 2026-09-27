// ジオラマ表示（本番の表示。URL に ?classic を付けると旧来のタイル敷き詰め表示）。
//
// 目標の絵作り: 黒い虚空に「断面の箱」がひとつ浮かび、その中だけが少色のドット絵になっている画面
// （参考: 🔷 / コインランドリーで寝ちゃった / クロマグロがとんでくる / Dequivsia）。
// 素材の出自（WOLF 風・RPGEN 風）が混ざっていても一枚絵に見えるよう、描いた後で色を揃える:
//   1. 箱の範囲だけ作業キャンバスに描く（地形・キャラ・上の層）
//   2. 輝度 → 場面パレット（5〜8色）のグラデーションマップ。4×4 ベイヤーでディザ。
//      壁のざらつきは世界座標に固定したノイズで足す（歩いても砂嵐にならない）
//   3. 箱の断面（切り口の明るい縁・床の厚み）を描き、虚空に星を散らす
// 屋内は外周の壁1マスを除いた部屋ぜんぶが1箱。屋外は CHUNK_W×CHUNK_H マスごとの箱で、
// 端へ歩くと隣の箱へ切り替わる（画面切り替え式）。

import { JP } from "../data/tiles";
import { drawRefInCell } from "./assets";
import { type Actor, Field, STRIP_UP } from "./field";
import { TILE } from "./types";

export const DIORAMA =
	typeof location !== "undefined" &&
	!new URLSearchParams(location.search).has("classic");

// 会話を画面下の字幕にする（style.css の html.diorama）
if (DIORAMA) document.documentElement.classList.add("diorama");

/** 屋外の箱の大きさ（マス）。 */
const CHUNK_W = 12;
const CHUNK_H = 8;
/** 断面の縁・床の厚み（ソース画素）。 */
const EDGE = 2;
const SLAB = 6;
/** 屋内の奥の壁を上へ伸ばす高さ（ソース画素）。 */
const WALL_EXT = 12;
/** 屋外の背景幕に使う、箱の上のマス数。 */
const BACK_ROWS = 2;

/** 時間帯ごとの場面パレット（暗→明）と、断面・虚空の色。 */
type Scene = {
	ramp: string[];
	accent: string[];
	cut: string;
	slab: string;
	star: string;
	/** 箱の縁。"cut"＝明るい断面と床の厚み（日常）／"fray"＝縁がディザで虚空に溶ける（怪異）。 */
	frame?: "cut" | "fray";
	/** 虚空。"stars"＝またたく星（既定）／"static"＝砂あらし／"none"＝まっくら。 */
	voidKind?: "stars" | "static" | "none";
};

/** 怪異の地区の場面（MapDef.scene で選ぶ）。日常は「箱」、怪異は「箱がほどける」。 */
const f = (
	ramp: string[],
	accent: string[],
	voidKind: Scene["voidKind"],
	frame: Scene["frame"] = "fray",
): Scene => ({
	ramp,
	accent,
	cut: ramp[5],
	slab: ramp[1],
	star: ramp[4],
	frame,
	voidKind,
});
const DREAM: Record<string, Scene> = {
	// 回線の間：深い藍にナトリウム灯の橙（待合室）
	hub: f(
		[
			"#06060e",
			"#12122a",
			"#1e2244",
			"#303a66",
			"#4e5e8a",
			"#8090b8",
			"#d0d8f0",
		],
		["#3a2208", "#8a5418", "#e8a040", "#ffe0a0"],
		"none",
	),
	// 黄色い部屋：病的な黄の一色（どこまでも同じ）
	yellow: f(
		[
			"#141005",
			"#3a300c",
			"#6a5a18",
			"#9a8a2a",
			"#c8b848",
			"#e8d878",
			"#fff4c0",
		],
		["#2a3010", "#6a7a28", "#c8d860", "#f4ffc0"],
		"static",
	),
	// 夕暮れの村：終わらない夕暮れ（紫がかった赤）
	village: f(
		[
			"#140810",
			"#34142a",
			"#5a2438",
			"#8a3a40",
			"#c0604a",
			"#e89a68",
			"#ffd8a8",
		],
		["#3a0a0a", "#8a1a1a", "#e03a2a", "#ffa080"],
		"none",
	),
	// 過去ログの地層・蔵：セピアの紙
	sepia: f(
		[
			"#0c0806",
			"#241a12",
			"#443222",
			"#6a5236",
			"#95784e",
			"#c4a878",
			"#f0e0bc",
		],
		["#2a1a08", "#6a4a18", "#c89a48", "#f8e0a0"],
		"none",
	),
	// きさらぎ駅：冷たい青灰に赤い信号
	kisaragi: f(
		[
			"#040608",
			"#0e1418",
			"#1c262c",
			"#2e3c44",
			"#4a5c64",
			"#7a8c94",
			"#c0ccd0",
		],
		["#2a0606", "#6a1010", "#d02a2a", "#ff8a7a"],
		"static",
	),
	// 終電：くすんだ緑の蛍光灯（車両という箱なので縁は断面のまま）
	train: f(
		[
			"#050805",
			"#101a12",
			"#1e2e22",
			"#324a36",
			"#50705a",
			"#88a890",
			"#d8ecdc",
		],
		["#2a2a08", "#6a6a18", "#d8d848", "#ffffb0"],
		"none",
		"cut",
	),
	// トンネル：黒とナトリウムの橙
	tunnel: f(
		[
			"#020202",
			"#0e0a06",
			"#1e160c",
			"#322414",
			"#503a20",
			"#7a5a34",
			"#b08a58",
		],
		["#3a1a04", "#8a4a10", "#f09030", "#ffd890"],
		"none",
	),
	// 供養スレ駅（終点）：やわらかい常夜灯（日常の箱にもどる＝縁は断面・星）
	terminus: f(
		[
			"#080a14",
			"#161a2c",
			"#262c48",
			"#3e4666",
			"#62688a",
			"#9aa0b8",
			"#e8e4dc",
		],
		["#3a2410", "#8a5a28", "#f0b860", "#fff0c8"],
		"stars",
		"cut",
	),
};

const SCENES: Record<string, Scene> = {
	yu: {
		accent: ["#5a2418", "#b8502c", "#f0a040", "#ffe08a"],
		ramp: [
			"#140c14",
			"#3a1c2a",
			"#6e3240",
			"#a8544a",
			"#d98c5c",
			"#f2c58c",
			"#fff0d4",
		],
		cut: "#f7e3c4",
		slab: "#5a2a34",
		star: "#f2c58c",
	},
	yoru: {
		accent: ["#4a2a14", "#a86a28", "#f0c050", "#fff2b0"],
		ramp: [
			"#0c0b1a",
			"#1d1c3a",
			"#323a64",
			"#50628c",
			"#7c94b4",
			"#b8c8da",
			"#eef2f6",
		],
		cut: "#dfe6f0",
		slab: "#262a4c",
		star: "#b8c8da",
	},
	shinya: {
		accent: ["#3a3414", "#8c7e2c", "#d8c860", "#fff6b8"],
		ramp: [
			"#070b12",
			"#122032",
			"#1f3c52",
			"#356270",
			"#5a9498",
			"#98c8c0",
			"#e2f2ea",
		],
		cut: "#cfe6e0",
		slab: "#15293a",
		star: "#98c8c0",
	},
	asa: {
		accent: ["#5a3a2a", "#b87850", "#f0b880", "#fff0d8"],
		ramp: [
			"#23232c",
			"#484a58",
			"#78808e",
			"#a6acb6",
			"#cdd1d4",
			"#ebe8e0",
			"#fffdf4",
		],
		cut: "#ffffff",
		slab: "#5c606c",
		star: "#cdd1d4",
	},
};

/** 時間帯の場面パレット（暗→明の段と差し色。タイトル画面などジオラマの外で同じ色を使う）。 */
export const scenePalette = (
	tod: string,
): { ramp: [number, number, number][]; accent: [number, number, number][] } => {
	const sc = SCENES[tod] ?? SCENES.shinya;
	return { ramp: sc.ramp.map(hex), accent: sc.accent.map(hex) };
};

export const BAYER4 = (x: number, y: number): number =>
	BAYER[(y & 3) * 4 + (x & 3)];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
	(v) => v / 16 - 0.5,
);

const hex = (s: string): [number, number, number] => [
	Number.parseInt(s.slice(1, 3), 16),
	Number.parseInt(s.slice(3, 5), 16),
	Number.parseInt(s.slice(5, 7), 16),
];

/** 世界座標に固定した 0..1 のノイズ。 */
const hash = (x: number, y: number): number => {
	let h = (x * 374761393 + y * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** 箱の範囲（マス）。 */
export type Box = { x: number; y: number; w: number; h: number };

export const boxFor = (field: Field, player: Actor): Box => {
	const px = Math.round(player.fx);
	const py = Math.round(player.fy);
	// マップが箱の区切りを持っていれば、それに従う（MapDef.boxes）
	for (const b of field.def.boxes ?? [])
		if (px >= b.x && py >= b.y && px < b.x + b.w && py < b.y + b.h) return b;
	if (!field.def.outdoor) {
		// 屋内: 外周の壁1マスを除いた部屋ぜんぶ（奥の壁の面は残る）
		return { x: 1, y: 1, w: field.w - 2, h: field.h - 2 };
	}
	const x = Math.floor(px / CHUNK_W) * CHUNK_W;
	const y = Math.floor(py / CHUNK_H) * CHUNK_H;
	return {
		x,
		y,
		w: Math.min(CHUNK_W, field.w - x),
		h: Math.min(CHUNK_H, field.h - y),
	};
};

/**
 * 箱の上に足す「奥」の高さ（ソース画素）。
 * 屋内は奥の壁を WALL_EXT だけ高く伸ばす。屋外は箱の上 BACK_ROWS マスを暗く沈めた背景幕を見せる。
 */
const backHeight = (field: Field, box: Box): number =>
	field.def.outdoor ? Math.min(BACK_ROWS, box.y) * TILE : WALL_EXT;

/** 箱を画面のどこに置くか（ソース画素）。カメラ（camX/camY）もこれに合わせる。 */
export const boxPlacement = (
	field: Field,
	box: Box,
	screenW: number,
	screenH: number,
	player: Actor,
): { sx: number; sy: number; camX: number; camY: number } => {
	const bw = box.w * TILE;
	const bh = box.h * TILE;
	const back = backHeight(field, box);
	const margin = TILE / 2;
	// 箱が画面に収まれば真ん中へ。はみ出すとき（縦長の画面の広い店など）は、箱の中で
	// キリコを追って動かす（箱の端は画面の端から margin より内へは入れない）
	const fit = (
		screen: number,
		size: number,
		center: number,
		extra: number,
	): number =>
		size + extra + margin * 2 <= screen
			? Math.round((screen - size - extra) / 2)
			: Math.round(
					Math.min(
						margin,
						Math.max(screen - size - margin, screen / 2 - center),
					),
				);
	const px = (player.fx - box.x) * TILE + TILE / 2;
	const py = (player.fy - box.y) * TILE + TILE / 2;
	const sx = fit(screenW, bw, px, 0);
	// 下に字幕が来るので少し上寄り
	const sy =
		bh + back + SLAB + margin * 2 <= screenH
			? Math.round(back + (screenH - back - bh - SLAB) / 2 - screenH * 0.06)
			: back + fit(screenH - back - SLAB, bh, py, 0);
	return { sx, sy, camX: box.x * TILE - sx, camY: box.y * TILE - sy };
};

const canvas = (w: number, h: number): HTMLCanvasElement => {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	return c;
};

type Ramp = [number, number, number][];
/** 画用紙の中の四角（ソース画素）。 */
type Rect = { x: number; y: number; w: number; h: number };
const clipRect = (r: Rect, w: number, h: number): Rect | null => {
	const x = Math.max(0, Math.floor(r.x));
	const y = Math.max(0, Math.floor(r.y));
	const x1 = Math.min(w, Math.ceil(r.x + r.w));
	const y1 = Math.min(h, Math.ceil(r.y + r.h));
	return x1 > x && y1 > y ? { x, y, w: x1 - x, h: y1 - y } : null;
};

/** 箱の中の座標（ソース画素）に直した灯り。 */
type Lamp = { x: number; y: number; r: number; ramp?: Ramp };

/** 灯りの色から差し色の段（暗→灯りの色→白寄り）を作る。場面の最暗色へ寄せて沈める。 */
const lampRamp = (color: string, base: Ramp): Ramp => {
	const c = hex(color);
	const d = base[0];
	const mix = (
		a: number[],
		b: number[],
		t: number,
	): [number, number, number] => [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t),
	];
	return [mix(d, c, 0.3), mix(d, c, 0.6), c, mix(c, [255, 255, 255], 0.3)];
};
const rampCache = new Map<string, { ramp: Ramp; accent: Ramp }>();

/**
 * 画用紙の中身を場面パレットへ落とす（その場で書き換え）。透明な画素は透明のまま。
 * lift はキャラを背景より一段明るく浮かせるための輝度の上乗せ。
 */
const quantize = (
	g: CanvasRenderingContext2D,
	w: number,
	h: number,
	ox: number,
	oy: number,
	ramp: Ramp,
	accent: Ramp,
	lift: number,
	lamps: Lamp[],
	rect: Rect = { x: 0, y: 0, w, h },
): void => {
	const r0 = clipRect(rect, w, h);
	if (!r0) return;
	const img = g.getImageData(r0.x, r0.y, r0.w, r0.h);
	const d = img.data;
	const n = ramp.length - 1;
	for (let y = r0.y; y < r0.y + r0.h; y++) {
		// 天井から光が落ちている：奥（上）の端と手前の角が暗く、床の中ほどが明るい
		const fy = y / h;
		const lightY =
			0.7 + 0.42 * Math.sin(Math.PI * Math.min(1, 0.15 + fy * 0.95));
		for (let x = r0.x; x < r0.x + r0.w; x++) {
			const i = ((y - r0.y) * r0.w + (x - r0.x)) * 4;
			if (d[i + 3] < 128) {
				d[i + 3] = 0;
				continue;
			}
			const r = d[i];
			const gg = d[i + 1];
			const b = d[i + 2];
			const fx = (x / w) * 2 - 1;
			const light = lightY * (1 - 0.3 * fx * fx);
			let l = (0.3 * r + 0.55 * gg + 0.15 * b) / 255;
			// コントラストを少し立てる（S字）
			l = l * l * (3 - 2 * l);
			l = l * light + lift;
			l += (hash(ox + x, oy + y) - 0.5) * 0.07;
			const dither = BAYER[(y & 3) * 4 + (x & 3)];
			// 灯り（MapDef.lights）の届くところだけ差し色の系統に落とす。
			// 素材の色（彩度）では判定しない：RPGEN 系のチップは草も水も原色で、全部が差し色になる
			let glow = 0;
			let lit: Ramp = accent;
			for (const lp of lamps) {
				const dx = x - lp.x;
				const dy = y - lp.y;
				const k = 1 - Math.sqrt(dx * dx + dy * dy) / lp.r;
				if (k > glow) {
					glow = k;
					lit = lp.ramp ?? accent;
				}
			}
			let c: [number, number, number];
			if (glow + dither * 0.5 > 0.3) {
				l += glow * 0.25;
				const nl = lit.length - 1;
				c = lit[Math.max(0, Math.min(nl, Math.round(l * nl + dither * 0.8)))];
			} else {
				c = ramp[Math.max(0, Math.min(n, Math.round(l * n + dither * 0.9)))];
			}
			d[i] = c[0];
			d[i + 1] = c[1];
			d[i + 2] = c[2];
			d[i + 3] = 255;
		}
	}
	g.putImageData(img, r0.x, r0.y);
};

/** 描いたものの外側に1画素の輪郭（キャラを床から浮かせる。参考作品のキャラも輪郭で立っている）。 */
const outline = (
	g: CanvasRenderingContext2D,
	w: number,
	h: number,
	c: [number, number, number],
	rect: Rect = { x: 0, y: 0, w, h },
): void => {
	const r0 = clipRect(rect, w, h);
	if (!r0) return;
	const img = g.getImageData(r0.x, r0.y, r0.w, r0.h);
	w = r0.w;
	h = r0.h;
	const d = img.data;
	const src = new Uint8Array(w * h);
	for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			if (src[i]) continue;
			if (
				(x > 0 && src[i - 1]) ||
				(x < w - 1 && src[i + 1]) ||
				(y > 0 && src[i - w]) ||
				(y < h - 1 && src[i + w])
			) {
				d[i * 4] = c[0];
				d[i * 4 + 1] = c[1];
				d[i * 4 + 2] = c[2];
				d[i * 4 + 3] = 255;
			}
		}
	g.putImageData(img, r0.x, r0.y);
};

/** 地形の層（下・上）の変換結果。箱・時間帯・マップが変わるまで使い回す。 */
let terrain: {
	key: string;
	below: HTMLCanvasElement;
	/** 上の層を持ち主の行ごとに（Field.aboveStrip）。箱の座標にそろえて変換ずみ。 */
	strips: Map<number, HTMLCanvasElement>;
	back: HTMLCanvasElement | null;
	/** 箱の手前の縁の物（前景）。 */
	front: HTMLCanvasElement | null;
} | null = null;

/**
 * 箱の「奥」。屋内は奥の壁の上端の色で壁を伸ばす（ざらつき付き）。
 * 屋外は箱の上のマスを暗く沈めて描き、上へ行くほど虚空へ溶かす（遠くの町並み）。
 */
const makeBack = (
	field: Field,
	box: Box,
	h: number,
	pal: { ramp: Ramp; accent: Ramp },
	lamps: Lamp[],
	below: CanvasRenderingContext2D,
): HTMLCanvasElement | null => {
	if (h <= 0) return null;
	const bw = box.w * TILE;
	const c = canvas(bw, h);
	const g = c.getContext("2d", { willReadFrequently: true });
	if (!g) return null;
	g.imageSmoothingEnabled = false;
	if (!field.def.outdoor) {
		// 奥の壁のいちばん上の列で、いちばん多い色を壁の色とする
		const top = below.getImageData(0, 1, bw, 1).data;
		const count = new Map<number, number>();
		for (let i = 0; i < top.length; i += 4) {
			const k = (top[i] << 16) | (top[i + 1] << 8) | top[i + 2];
			count.set(k, (count.get(k) ?? 0) + 1);
		}
		let wall = 0;
		let best = -1;
		for (const [k, v] of count)
			if (v > best) {
				best = v;
				wall = k;
			}
		// 壁の色の一段暗い色で、ざらつきを散らす
		const idx = pal.ramp.findIndex(
			(r) => ((r[0] << 16) | (r[1] << 8) | r[2]) === wall,
		);
		const dark = pal.ramp[Math.max(0, idx - 1)];
		const img = g.createImageData(bw, h);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < bw; x++) {
				const i = (y * bw + x) * 4;
				// 上の方ほど暗い粒が多い（天井の影）
				const p = 0.08 + 0.35 * (1 - y / h);
				const useDark = idx > 0 && hash(box.x * TILE + x, y - 999) < p;
				const col = useDark
					? dark
					: [wall >> 16, (wall >> 8) & 255, wall & 255];
				img.data[i] = col[0];
				img.data[i + 1] = col[1];
				img.data[i + 2] = col[2];
				img.data[i + 3] = 255;
			}
		g.putImageData(img, 0, 0);
		return c;
	}
	const ox = box.x * TILE;
	const oy = box.y * TILE - h;
	g.fillStyle = "#000";
	g.fillRect(0, 0, bw, h);
	field.drawBelow(g, ox, oy);
	field.drawAbove(g, ox, oy);
	const shifted = lamps.map((l) => ({ ...l, y: l.y + h }));
	quantize(g, bw, h, ox, oy, pal.ramp, pal.accent, -0.22, shifted);
	// 上へ行くほど虚空へ溶かす（ディザで。半透明にはしない）
	const img = g.getImageData(0, 0, bw, h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < bw; x++) {
			const t = y / h;
			if (t + BAYER[(y & 3) * 4 + (x & 3)] * 0.6 < 0.45)
				img.data[(y * bw + x) * 4 + 3] = 0;
		}
	g.putImageData(img, 0, 0);
	return c;
};
let actorLayer: HTMLCanvasElement | null = null;

/** いま画面に出ている場面のパレット（立ち絵を同じ色に落とすため）。 */
let currentPal: { key: string; ramp: Ramp; accent: Ramp } | null = null;
const portraitCache = new WeakMap<
	HTMLCanvasElement,
	Map<string, HTMLCanvasElement>
>();
/** ドット立ち絵に残す元の色の割合（残りは場面のパレットの色。作者了承の見え方）。 */
const PORTRAIT_KEEP = 0.55;

/**
 * ドット立ち絵（public/portraits-dot。作者の線画を画像生成で清書→ドット化したもの）に、
 * いまの場面の色をかける。明るさで場面のパレットの段を選び、元の色と PORTRAIT_KEEP の割合で混ぜる
 * （キャラの色で見分けがつくまま、夜の色になじむ）。ディザもぼかしも無し。場面ごとにキャッシュ。
 */
export const tintPortrait = (
	src: HTMLCanvasElement,
	height: number,
): HTMLCanvasElement | null => {
	const pal =
		currentPal ??
		(() => {
			const sc = SCENES.shinya;
			return {
				key: "shinya",
				ramp: sc.ramp.map(hex),
				accent: sc.accent.map(hex),
			};
		})();
	const key = `${pal.key}:${height}`;
	let byKey = portraitCache.get(src);
	if (!byKey) {
		byKey = new Map();
		portraitCache.set(src, byKey);
	}
	const hit = byKey.get(key);
	if (hit) return hit;
	const w = src.width;
	const h = Math.min(height, src.height);
	const sg = src.getContext("2d", { willReadFrequently: true });
	if (!sg || w <= 0 || h <= 0) return null;
	const img = sg.getImageData(0, 0, w, h);
	const d = img.data;
	const r = pal.ramp;
	const n = r.length - 1;
	for (let i = 0; i < d.length; i += 4) {
		if (d[i + 3] < 128) {
			d[i + 3] = 0;
			continue;
		}
		let l = (0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2]) / 255;
		l = l * l * (3 - 2 * l) + 0.1;
		const c = r[Math.max(0, Math.min(n, Math.round(l * n)))];
		d[i] = Math.round(c[0] * (1 - PORTRAIT_KEEP) + d[i] * PORTRAIT_KEEP);
		d[i + 1] = Math.round(
			c[1] * (1 - PORTRAIT_KEEP) + d[i + 1] * PORTRAIT_KEEP,
		);
		d[i + 2] = Math.round(
			c[2] * (1 - PORTRAIT_KEEP) + d[i + 2] * PORTRAIT_KEEP,
		);
		d[i + 3] = 255;
	}
	const out = canvas(w, h);
	out.getContext("2d")?.putImageData(img, 0, 0);
	byKey.set(key, out);
	return out;
};

/**
 * 箱の手前の縁の物（前景）。作者提案「手前の電柱などが視点に合わせて動くと立体的」を、
 * 箱の外に浮かせず、模型の手前の縁に立つ物として描く（箱と同じ輪郭・ディザ・光。影に沈めて一段暗く）。
 * 町のチップを2倍の大きさで置く（手前ほど大きい）。並びは箱ごとに決まっている。
 *   poles  … 電柱と電線（箱の断面で切れる）・生けがき
 *   susuki … ススキのしげみ
 * 箱の座標（左上が 0,0・下端が箱の床の手前の縁）で描いた画用紙を返す。
 */
const FRONT_SCALE = 2;
const makeFront = (
	field: Field,
	box: Box,
	kind: "poles" | "susuki",
	pal: { ramp: Ramp; accent: Ramp },
): HTMLCanvasElement | null => {
	const bw = box.w * TILE;
	const bh = box.h * TILE;
	const c = canvas(bw, bh);
	const g = c.getContext("2d", { willReadFrequently: true });
	if (!g) return null;
	g.imageSmoothingEnabled = false;
	const seed = hash(box.x * 7 + box.y * 131, [...field.def.id].length);
	const put = (ref: string, x: number) => {
		g.save();
		g.scale(FRONT_SCALE, FRONT_SCALE);
		// 下端を箱の床の手前の縁より少し下に（手前に立っている）
		drawRefInCell(g, ref, x / FRONT_SCALE, bh / FRONT_SCALE - TILE + 4);
		g.restore();
	};
	if (kind === "poles") {
		// 電柱1本（箱の左か右の 1/4 あたり）と、そこから箱の外へ出ていく電線
		const left = seed < 0.5;
		const px = Math.round(
			bw * (left ? 0.18 + seed * 0.2 : 0.62 + (seed - 0.5) * 0.3),
		);
		put(JP.lamp, px - TILE);
		const [r, gg, b] = pal.ramp[1];
		g.fillStyle = `rgb(${r},${gg},${b})`;
		const armY = bh - FRONT_SCALE * 29;
		for (let wire = 0; wire < 2; wire++) {
			const y0 = armY + wire * 4;
			for (let x = 0; x < bw; x++) {
				const t = Math.abs(x - px) / bw;
				g.fillRect(x, Math.round(y0 + t * t * 26 + wire), 1, 1);
			}
		}
		// 生けがき（電柱と反対側に、2〜3マスぶん）
		const hx = left ? Math.round(bw * 0.55) : Math.round(bw * 0.08);
		const n = 1 + Math.floor(hash(box.x, box.y + 3) * 2);
		for (let i = 0; i < n; i++) put(JP.hedge, hx + i * TILE * FRONT_SCALE);
	} else {
		for (let i = 0; i < 4; i++) {
			const h = hash(box.x + i, box.y + 11);
			if (h < 0.35) continue;
			put(JP.susuki, Math.round(bw * (i / 4 + h * 0.12)));
		}
	}
	// 影に沈める（場面の色で一段暗く）＋輪郭
	quantize(
		g,
		bw,
		bh,
		box.x * TILE,
		box.y * TILE,
		pal.ramp,
		pal.accent,
		-0.28,
		[],
	);
	outline(g, bw, bh, pal.ramp[0]);
	return c;
};

const frontKind = (field: Field): "poles" | "susuki" | undefined => {
	const k =
		field.def.foreground ??
		(field.def.outdoor && !field.def.scene ? "poles" : undefined);
	return k === "none" ? undefined : k;
};

/** 縁がほどける箱：箱の縁から FRAY_W ドットのあいだを、外へ行くほど多く黒で抜く（ディザ）。 */
const FRAY_W = 10;
let frayMask: HTMLCanvasElement | null = null;
const drawFray = (
	ctx: CanvasRenderingContext2D,
	x0: number,
	y0: number,
	w: number,
	h: number,
): void => {
	if (!frayMask || frayMask.width !== w || frayMask.height !== h) {
		frayMask = canvas(w, h);
		const g = frayMask.getContext("2d");
		if (!g) return;
		const img = g.createImageData(w, h);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++) {
				const e = Math.min(x, y, w - 1 - x, h - 1 - y);
				if (e >= FRAY_W) continue;
				const t = 1 - e / FRAY_W;
				if (BAYER[(y & 3) * 4 + (x & 3)] + 0.5 < t * t * 1.1)
					img.data[(y * w + x) * 4 + 3] = 255;
			}
		g.putImageData(img, 0, 0);
	}
	ctx.drawImage(frayMask, x0, y0);
};

/** 暗闇（MapDef.dark）。照らす半径の外ほど多く、場面の最暗色で塗る（2値のディザ）。 */
let darkMask: HTMLCanvasElement | null = null;
const drawDark = (
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	bw: number,
	bh: number,
	player: Actor,
	box: Box,
	dark: { amount: number; radius: number },
	col: [number, number, number],
): void => {
	if (!darkMask || darkMask.width !== bw || darkMask.height !== bh)
		darkMask = canvas(bw, bh);
	const g = darkMask.getContext("2d");
	if (!g) return;
	// 光の中心は、半マス上に立つキリコの胸のあたり
	const cx = (player.fx - box.x) * TILE + TILE / 2;
	const cy = (player.fy - box.y) * TILE;
	const r = dark.radius * TILE;
	const edge = 1.5 * TILE;
	const amount = Math.min(1, dark.amount * 1.15);
	const img = g.createImageData(bw, bh);
	const d = img.data;
	for (let y = 0; y < bh; y++)
		for (let x = 0; x < bw; x++) {
			const dist = Math.hypot(x - cx, y - cy);
			if (dist <= r) continue;
			const cover = Math.min(1, (dist - r) / edge) * amount;
			if (BAYER[(y & 3) * 4 + (x & 3)] + 0.5 < cover) {
				const i = (y * bw + x) * 4;
				d[i] = col[0];
				d[i + 1] = col[1];
				d[i + 2] = col[2];
				d[i + 3] = 255;
			}
		}
	g.putImageData(img, 0, 0);
	ctx.drawImage(darkMask, sx, sy);
};

export const renderDiorama = (
	ctx: CanvasRenderingContext2D,
	screenW: number,
	screenH: number,
	field: Field,
	player: Actor,
	actors: Actor[],
	time: number,
	tod: string | undefined,
	/** 暗闇（MapDef.dark）：照らす半径（マス）の外をディザで潰す。 */
	dark?: { amount: number; radius: number },
): void => {
	// 場面：怪異の地区は MapDef.scene、日常は時間帯
	const sceneKey =
		field.def.scene && DREAM[field.def.scene]
			? `d:${field.def.scene}`
			: (tod ?? "");
	const scene =
		(field.def.scene && DREAM[field.def.scene]) ||
		SCENES[tod ?? ""] ||
		SCENES.shinya;
	let pal = rampCache.get(sceneKey);
	if (!pal) {
		pal = { ramp: scene.ramp.map(hex), accent: scene.accent.map(hex) };
		rampCache.set(sceneKey, pal);
	}
	currentPal = { key: sceneKey, ...pal };
	const fray = scene.frame === "fray";
	const box = boxFor(field, player);
	const placed = boxPlacement(field, box, screenW, screenH, player);
	// 視点の視差（作者提案）：キリコが箱の中を動くと、覗きこむ視点が少しついていく。
	// 箱ぜんたいは少し・奥の背景幕はもっと少し・手前の縁の物は大きくずれる（3層）。整数ドットで
	const vx = Math.max(
		-1,
		Math.min(1, ((player.fx - box.x + 0.5) / box.w) * 2 - 1),
	);
	const vy = Math.max(
		-1,
		Math.min(1, ((player.fy - box.y + 0.5) / box.h) * 2 - 1),
	);
	// 横の視差は、キリコが手前（箱の下）にいるほど大きく、奥にいるほど小さい（作者指摘）。
	// 遠くの人が横に数歩あるいても、眺める視点はほとんど動かない＝手前の物も流れない
	const near = Math.max(0, Math.min(1, (player.fy - box.y + 0.5) / box.h));
	const lateral = vx * near * near;
	const sx = placed.sx - Math.round(lateral * 3);
	const sy = placed.sy - Math.round(vy * 2);
	const backDx = Math.round(lateral * 2);
	const frontDx = -Math.round(lateral * 9);
	const back = backHeight(field, box);
	const bw = box.w * TILE;
	const bh = box.h * TILE;
	const ox = box.x * TILE;
	const oy = box.y * TILE;

	// 虚空（黒＋ゆっくりまたたく星／砂あらし／まっくら）
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, screenW, screenH);
	ctx.fillStyle = scene.star;
	if (scene.voidKind === "static") {
		// 砂あらし：1/15 秒ごとに入れかわる、まばらな点
		const t = Math.floor(time / 66);
		for (let i = 0; i < 260; i++) {
			const x = Math.floor(hash(i, t) * screenW);
			const y = Math.floor(hash(i + 999, t) * screenH);
			ctx.globalAlpha = 0.06 + 0.18 * hash(i, t + 7);
			ctx.fillRect(x, y, 1, 1);
		}
	}
	for (
		let i = 0;
		i < (scene.voidKind && scene.voidKind !== "stars" ? 0 : 90);
		i++
	) {
		const x = Math.floor(hash(i, 1) * screenW);
		const y = Math.floor(hash(i, 2) * screenH);
		const tw = 0.5 + 0.5 * Math.sin(time / (900 + hash(i, 3) * 1800) + i);
		ctx.globalAlpha = 0.08 + 0.35 * tw * hash(i, 4);
		ctx.fillRect(x, y, 1, 1);
	}
	ctx.globalAlpha = 1;

	const lamps: Lamp[] = (field.def.lights ?? [])
		.filter((l) => !l.only || !tod || l.only.split(",").includes(tod))
		.map((l) => ({
			x: (l.x + 0.5) * TILE - ox,
			y: (l.y + 0.5) * TILE - oy,
			r: l.r * TILE,
			// 色の指定がない灯りは場面の差し色（暖色）
			ramp: l.color ? lampRamp(l.color, pal.ramp) : undefined,
		}))
		.filter(
			(l) => l.x > -l.r && l.y > -l.r && l.x < bw + l.r && l.y < bh + l.r,
		);

	// 地形（下の層・上の層）は変わったときだけ変換し直す
	field.sync();
	const key = `${field.def.id}:${box.x},${box.y},${box.w},${box.h}:${sceneKey}:${field.version}`;
	if (!terrain || terrain.key !== key) {
		const below = canvas(bw, bh);
		const bg = below.getContext("2d", { willReadFrequently: true });
		if (!bg) return;
		bg.imageSmoothingEnabled = false;
		bg.fillStyle = "#000";
		bg.fillRect(0, 0, bw, bh);
		field.drawBelow(bg, ox, oy);
		quantize(bg, bw, bh, ox, oy, pal.ramp, pal.accent, 0, lamps);
		const strips = new Map<number, HTMLCanvasElement>();
		for (let r = box.y; r < box.y + box.h + STRIP_UP; r++) {
			const src = field.aboveStrip(r);
			if (!src) continue;
			const c = canvas(bw, bh);
			const sg = c.getContext("2d", { willReadFrequently: true });
			if (!sg) continue;
			sg.imageSmoothingEnabled = false;
			const top = (r - STRIP_UP) * TILE - oy;
			sg.drawImage(src, -ox, top);
			quantize(sg, bw, bh, ox, oy, pal.ramp, pal.accent, 0, lamps, {
				x: 0,
				y: top,
				w: bw,
				h: src.height,
			});
			strips.set(r, c);
		}
		terrain = {
			key,
			below,
			strips,
			back: makeBack(field, box, back, pal, lamps, bg),
			front:
				frontKind(field) === undefined
					? null
					: makeFront(field, box, frontKind(field) as "poles" | "susuki", pal),
		};
	}

	// キャラは毎フレーム、背景より一段明るく浮かせて輪郭をつける。
	// 上の層とは行の順に重ねる（北の行の木や棚はキャラの奥・同じ行と南の行の物は手前）
	if (!actorLayer || actorLayer.width !== bw || actorLayer.height !== bh)
		actorLayer = canvas(bw, bh);
	const g = actorLayer.getContext("2d", { willReadFrequently: true });
	if (!g) return;
	g.setTransform(1, 0, 0, 1, 0, 0);
	g.imageSmoothingEnabled = false;
	const byRow = new Map<number, Actor[]>();
	for (const a of actors) {
		const r = Field.rowOf(a);
		const list = byRow.get(r);
		if (list) list.push(a);
		else byRow.set(r, [a]);
	}
	const rows = [...new Set([...byRow.keys(), ...terrain.strips.keys()])].sort(
		(p, q) => p - q,
	);

	// 床の厚み → 箱の中身 → 断面の縁（怪異の箱は床の厚みも断面も無く、縁が虚空に溶ける）
	if (!fray) {
		ctx.fillStyle = scene.slab;
		ctx.fillRect(sx - EDGE, sy + bh, bw + EDGE * 2, SLAB);
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.fillRect(sx - EDGE, sy + bh + SLAB - 2, bw + EDGE * 2, 2);
	}
	if (terrain.back) ctx.drawImage(terrain.back, sx + backDx, sy - back);
	ctx.drawImage(terrain.below, sx, sy);
	for (const r of rows) {
		// 同じ行では 人 → その行の物のはみ出し（木の葉・棚の上段）の順。幹の横に立つと葉が頭にかぶさる
		const strip = terrain.strips.get(r);
		for (const a of (byRow.get(r) ?? []).sort(
			(p, q) => p.fy - q.fy || p.fx - q.fx,
		)) {
			// 1人ぶんの四角（半マス上に立つ・横と上に1マスの余白）だけ描いて変換する
			const rc = clipRect(
				{
					x: Math.round(a.fx * TILE) - ox - TILE,
					y: Math.round(a.fy * TILE) - oy - 2 * TILE,
					w: 3 * TILE,
					h: 3 * TILE + 2,
				},
				bw,
				bh,
			);
			if (!rc) continue;
			g.clearRect(rc.x, rc.y, rc.w, rc.h);
			g.save();
			g.beginPath();
			g.rect(rc.x, rc.y, rc.w, rc.h);
			g.clip();
			a.draw(g, ox, oy, time);
			g.restore();
			quantize(g, bw, bh, ox, oy, pal.ramp, pal.accent, 0.12, lamps, rc);
			outline(g, bw, bh, pal.ramp[0], rc);
			ctx.drawImage(
				actorLayer,
				rc.x,
				rc.y,
				rc.w,
				rc.h,
				sx + rc.x,
				sy + rc.y,
				rc.w,
				rc.h,
			);
		}
		if (strip) ctx.drawImage(strip, sx, sy);
	}
	// 暗闇：照らす半径の外を、場面のいちばん暗い段でディザ状に潰す（懐中電灯で広がる）
	if (dark && dark.amount > 0)
		drawDark(ctx, sx, sy, bw, bh, player, box, dark, pal.ramp[0]);
	if (fray) {
		drawFray(ctx, sx, sy - back, bw, bh + back);
		return;
	}
	// 手前の縁の物：箱の断面で切る（横は箱の幅の中だけ）
	if (terrain.front) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(sx, 0, bw, sy + bh + SLAB);
		ctx.clip();
		ctx.drawImage(terrain.front, sx + frontDx, sy);
		ctx.restore();
	}
	ctx.fillStyle = scene.cut;
	if (field.def.outdoor) {
		// 屋外: 地面の奥の端にだけ細い線（遠くは虚空へ溶けている）
		ctx.globalAlpha = 0.35;
		ctx.fillRect(sx, sy, bw, 1);
		ctx.globalAlpha = 1;
		ctx.fillRect(sx - EDGE, sy, EDGE, bh); // 左
		ctx.fillRect(sx + bw, sy, EDGE, bh); // 右
	} else {
		ctx.fillRect(sx - EDGE, sy - back - EDGE, bw + EDGE * 2, EDGE); // 上（奥の壁の切り口）
		ctx.fillRect(sx - EDGE, sy - back, EDGE, bh + back); // 左
		ctx.fillRect(sx + bw, sy - back, EDGE, bh + back); // 右
	}
	ctx.fillRect(sx - EDGE, sy + bh, bw + EDGE * 2, 1); // 床の切り口
};
