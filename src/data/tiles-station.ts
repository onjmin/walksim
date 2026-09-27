// 駅と終電のマップチップ（回線の間・終電・きさらぎ駅・供養スレ駅）。
//
// 絵は自作チップ（public/assets/walksim/station.png。scripts/make-station-tiles.mjs）。
// 文字の意味（通れる・通れない・カウンター）は旧版（WOLF 風・RPGEN 風チップ）のまま、
// 深夜の田舎の無人駅と通勤電車の車内の絵に置き換えた。書き方は data/tiles.ts と同じ
// （16x32 の物は下端そろえで上のマスへはみ出し、キャラより手前に描かれる）。

import type { TileDef } from "../engine/defs";
import { JP, TOWN, WALL } from "./tiles";

const STATION_PNG = "pub:assets/walksim/station.png";
/** station.png の (c, r) マスから w×h マス。 */
export const station = (c: number, r: number, w = 1, h = 1): string =>
	`${STATION_PNG}#${c * 16},${r * 16},${w * 16},${h * 16}`;

const floor = (color: string, ...layers: string[]): TileDef => ({
	layers,
	color,
	passable: true,
});
const solid = (color: string, ...layers: string[]): TileDef => ({
	layers,
	color,
	passable: false,
});
const BLACK: TileDef = { layers: [], color: "#000", passable: false };

/** station.png の部品（地・壁・物）。イベントの見た目にも使う。 */
export const STN = {
	// ホームと線路の地
	platform: station(0, 0),
	platformEdge: station(1, 0),
	platformWall: station(2, 0),
	steps: station(3, 0),
	gravel: station(4, 0),
	track: station(5, 0),
	trackOld: station(6, 0),
	oppEdge: station(7, 0),
	// 待合室と車内の地・壁
	hubFloor: station(0, 1),
	hubWallUp: station(1, 1),
	hubWallLo: station(2, 1),
	trainFloor: station(3, 1),
	trainWall: station(4, 1),
	trainWindow: station(5, 1),
	trainAd: station(6, 1),
	trainSeat: station(7, 1),
	// 16x16 の物
	timetableFrame: station(0, 2),
	notice: station(1, 2),
	benchL: station(2, 2),
	benchR: station(3, 2),
	ticketGate: station(4, 2),
	chalkCircle: station(5, 2),
	signal: station(6, 2),
	flower: station(7, 2),
	grave: station(0, 3),
	bufferStop: station(1, 3),
	// 16x32 の物
	clock: station(0, 4, 1, 2),
	northDoor: station(1, 4, 1, 2),
	elevator: station(2, 4, 1, 2),
	exitTop: station(3, 4),
	exitBottom: station(3, 5),
	kioskL: station(4, 4, 1, 2),
	kioskM: station(5, 4, 1, 2),
	kioskR: station(6, 4, 1, 2),
	trainDoor: station(7, 4, 1, 2),
	nameSign: station(0, 6, 1, 2),
	tiltedSign: station(1, 6, 1, 2),
	pillar: station(2, 6, 1, 2),
	officeShutter: station(3, 6, 1, 2),
	phone: station(4, 6, 1, 2),
	noticeBoard: station(5, 6, 1, 2),
	lamp: station(6, 6, 1, 2),
	waitingDoor: station(7, 6, 1, 2),
	timetableL: station(0, 8, 1, 2),
	timetableR: station(1, 8, 1, 2),
} as const;

// ───────────────── 回線の間（無人駅の待合室） ─────────────────
//   #  天井・売店のおく（くらい）  H h  しっくいの壁（上段＝蛍光灯・下段＝緑の腰壁）
//   ,  テラゾーの床  T 時刻表のわく  P はり紙  k 駅の時計  D 北の扉  E 開かないエレベーター
//   B b ベンチ（左右）  V 自販機  f 自動改札機（電光板つき）  G 改札のさきのホーム
//   [ = ] 売店（シャッター。counter）  d ^ 南口のガラス戸（下半分・上半分。床）
//   o 見えない床（黒の海とおなじ色。かくし通路）
const C_HUB_WALL = "#cfc7b0";
const C_HUB_FLOOR = "#a09a8c";

export const HUB: Record<string, TileDef> = {
	"#": solid("#1b1410"),
	H: solid(C_HUB_WALL, STN.hubWallUp),
	h: solid(C_HUB_WALL, STN.hubWallLo),
	T: solid(C_HUB_WALL, STN.hubWallLo, STN.timetableFrame),
	P: solid(C_HUB_WALL, STN.hubWallLo, STN.notice),
	k: solid(C_HUB_WALL, STN.hubWallLo, STN.clock),
	D: floor(C_HUB_WALL, STN.hubWallLo, STN.northDoor),
	E: solid(C_HUB_WALL, STN.hubWallLo, STN.elevator),
	",": floor(C_HUB_FLOOR, STN.hubFloor),
	B: solid(C_HUB_FLOOR, STN.hubFloor, STN.benchL),
	b: solid(C_HUB_FLOOR, STN.hubFloor, STN.benchR),
	V: solid(C_HUB_FLOOR, STN.hubFloor, JP.vending),
	f: solid(C_HUB_FLOOR, STN.hubFloor, STN.ticketGate),
	G: floor(C_HUB_FLOOR, STN.platform),
	"[": { ...solid(C_HUB_FLOOR, STN.hubFloor, STN.kioskL), counter: true },
	"=": { ...solid(C_HUB_FLOOR, STN.hubFloor, STN.kioskM), counter: true },
	"]": { ...solid(C_HUB_FLOOR, STN.hubFloor, STN.kioskR), counter: true },
	// 南口の扉は上下2マスに分けて描く（着地点 (10,12) でキリコが点滅しないように。data/tiles.ts の説明）
	d: floor(C_HUB_FLOOR, STN.hubFloor, STN.exitBottom),
	"^": floor(C_HUB_FLOOR, STN.hubFloor, STN.exitTop),
	o: { layers: [], color: "#08070c", passable: true },
	" ": BLACK,
};

// ───────────────── 終電（車内） ─────────────────
//   #  車両の外（くらい）  h  化粧板の壁（網棚とつり革）  W  車窓（夜）  Q  路線図・中づり
//   .  車内の床  n  ロングシート  E  降車ドア（東の端）
const C_CAR_WALL = "#c6cabe";
const C_CAR_FLOOR = "#6c7076";

export const TRAIN: Record<string, TileDef> = {
	"#": solid("#1b1410"),
	h: solid(C_CAR_WALL, STN.trainWall),
	W: solid(C_CAR_WALL, STN.trainWindow),
	Q: solid(C_CAR_WALL, STN.trainAd),
	".": floor(C_CAR_FLOOR, STN.trainFloor),
	n: solid(C_CAR_FLOOR, STN.trainFloor, STN.trainSeat),
	E: solid(C_CAR_WALL, STN.trainDoor),
	" ": BLACK,
};

// ───────────────── ホームの共通 ─────────────────
const C_PLAT = "#8e8c86";
const PLAT = STN.platform;

// ───────────────── きさらぎ駅（無人ホームと線路） ─────────────────
//   .  ホーム  -  ホームの端（点字ブロックと白線）  w  ホームの壁面  =  線路へ降りる段
//   t  線路（枕木とレール）  g  砂利（通れない）  ^  車止め
//   f  網フェンス  M  駅員室のシャッター  K  掲示板  V  自販機  p  公衆電話
//   B b  ベンチ（左右）  L  電灯  I  ホームの柱  ~ "  向かいのホーム（縁・面。渡れない）
export const KISARAGI: Record<string, TileDef> = {
	".": floor(C_PLAT, PLAT),
	"-": floor("#9aa0a8", STN.platformEdge),
	w: solid("#3a3630", STN.platformWall),
	"=": floor("#8a8a8a", STN.steps),
	t: floor("#2e2620", STN.track),
	g: solid("#26221e", STN.gravel),
	"^": solid("#3a3026", STN.gravel, STN.bufferStop),
	f: solid(C_PLAT, PLAT, JP.fence),
	M: solid(C_PLAT, PLAT, STN.officeShutter),
	K: solid(C_PLAT, PLAT, STN.noticeBoard),
	V: solid(C_PLAT, PLAT, JP.vending),
	p: solid(C_PLAT, PLAT, STN.phone),
	B: solid(C_PLAT, PLAT, STN.benchL),
	b: solid(C_PLAT, PLAT, STN.benchR),
	L: { ...solid(C_PLAT, PLAT, STN.lamp), thin: true }, // 細い柱なので裏が無い
	I: { ...solid(C_PLAT, PLAT, STN.pillar), thin: true },
	"~": solid("#4a4b52", STN.oppEdge),
	'"': solid("#44454c", PLAT),
	" ": BLACK,
};

// ───────────────── 供養スレ駅（終点） ─────────────────
//   ( )  駅舎の白壁（上段・下段。TOWN のサイディング）  w  窓（TOWN）
//   k K  時刻表（左右。なにも書かれていない）  D  待合室の扉（あかない）
//   .  ホーム  -  ホームの端  t  線路の名残（通れない）
//   V  自販機  L  常夜灯  B b  ベンチ（左右）
export const TERMINUS: Record<string, TileDef> = {
	"(": TOWN["("],
	")": TOWN[")"],
	w: TOWN.w,
	k: solid("#e8e8e8", WALL.sidingLo, STN.timetableL),
	K: solid("#e8e8e8", WALL.sidingLo, STN.timetableR),
	D: solid("#e8e8e8", WALL.sidingLo, STN.waitingDoor),
	".": floor(C_PLAT, PLAT),
	"-": floor("#9aa0a8", STN.platformEdge),
	t: solid("#2e2620", STN.trackOld),
	V: solid(C_PLAT, PLAT, JP.vending),
	L: { ...solid(C_PLAT, PLAT, STN.lamp), thin: true },
	B: solid(C_PLAT, PLAT, STN.benchL),
	b: solid(C_PLAT, PLAT, STN.benchR),
	" ": BLACK,
};
