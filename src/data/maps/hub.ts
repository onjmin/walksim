// 回線の間（無人駅の待合室・拠点）。DESIGN §4。
// 16×12。ベンチ・自販機・閉じた改札（回送表示）・3つの扉（黄色い部屋・夕暮れの村・過去ログの地層）。
// ネムリンが改札脇で寝ている。レコード3枚で改札が開き（gate_open）、終電（train）に乗れる。
// 小ネタ（DESIGN §11）: This Man のポスター・開かないエレベーター。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { npc, warp } from "../helpers";
import { base, INDOOR } from "../tiles";

const TILE_FLOOR = base(3, 46); // タイルの床（INDOOR の ","）
const C_TILE = "#9a9a9a";

// INDOOR に駅の備品を足す。B b ベンチ / V 自販機 / f 鉄の柵（改札） / G 改札の通りぬけ口 /
// D 扉（かべの下段の出入り口） / E エレベーターの扉（ひらかない） / d 部屋のドア（南端）
const tiles: Record<string, TileDef> = {
	...INDOOR,
	B: {
		layers: [TILE_FLOOR, "sp:9UnaFUN"],
		color: C_TILE,
		passable: false,
	},
	b: {
		layers: [TILE_FLOOR, "sp:PcAZNWo"],
		color: C_TILE,
		passable: false,
	},
	V: {
		layers: [TILE_FLOOR, base(0, 519, 1, 2)],
		color: C_TILE,
		passable: false,
	},
	f: {
		layers: [TILE_FLOOR, base(5, 32)],
		color: C_TILE,
		passable: false,
	},
	G: { layers: [TILE_FLOOR], color: C_TILE, passable: true },
	D: {
		layers: [base(1, 78), base(7, 61, 1, 2)],
		color: "#e8e4dc",
		passable: true,
	},
	E: {
		layers: [base(1, 78), base(0, 193, 1, 2)],
		color: "#e8e4dc",
		passable: false,
	},
	d: {
		layers: [TILE_FLOOR, base(7, 77, 1, 2)],
		color: C_TILE,
		passable: true,
	},
};

const rows = [
	"################", // y0
	"#HHHHHHHHQHHHHH#", // y1  ポスター (9,1)
	"#hhDhkhDhhhDhEh#", // y2  扉: 黄色 (3,2)・村 (7,2)・過去ログ (11,2)。時計 (5,2)・エレベーター (13,2)
	"#,,,,,,,,,,,,,,#", // y3
	"#,,,,,,,,,,,,f,#", // y4  改札の柵 x13
	"#Bb,,,,V,,,,,f,#", // y5  ベンチ (1,5)(2,5)・自販機 (7,5)
	"#,,,,,,,,,,,,G,#", // y6  改札の通りぬけ口 (13,6)
	"#,,,,,,,,,,,,f,#", // y7  ネムリン (12,7)
	"#Bb,,,,,,,,,,f,#", // y8
	"#,,,,,,,,,,,,f,#", // y9
	"#,,,,,,,,,,,,f,#", // y10
	"####d###########", // y11 部屋のドア (4,11) → room
];

/** 駅のアナウンス（レイの機械音声。立ち絵なし・名前欄「アナウンス」）。 */
const announce = (s: Story, text: string) =>
	s.say("rei", text, { name: "アナウンス", noPortrait: true });

export const hub: MapDef = {
	id: "hub",
	name: "回線の間",
	bgm: "deep1",
	outside: "#08070c",
	tiles,
	rows,
	events: [
		// ── 出入り口 ──
		warp(
			"to_room",
			4,
			11,
			{ map: "room", x: 5, y: 8, dir: "up" },
			{ se: "door" },
		),
		warp(
			"to_yellow",
			3,
			2,
			{ map: "yellow", x: 4, y: 5, dir: "up" },
			{ se: "door" },
		),
		warp(
			"to_village",
			7,
			2,
			{ map: "village", x: 4, y: 6, dir: "up" },
			{ se: "door" },
		),
		warp(
			"to_kakolog",
			11,
			2,
			{ map: "kakolog2", x: 4, y: 6, dir: "up" },
			{ se: "door" },
		),

		// ── 改札が開く（レコード3枚。auto once で gate_open を立てる） ──
		{
			id: "gate_open_ev",
			x: 13,
			y: 6,
			trigger: "auto",
			once: true,
			when: (st) =>
				!st.flags.gate_open &&
				(st.items.rec_a ?? 0) > 0 &&
				(st.items.rec_b ?? 0) > 0 &&
				(st.items.rec_c ?? 0) > 0,
			run: async (s) => {
				await s.wait(500);
				s.se("chapter");
				await announce(s, "――おまたせ　いたしました");
				await announce(s, "まもなく、終電が　まいります");
				await s.narrate(
					"改札の　電光板が、『回送』から\n『きさらぎ』に　かわった。",
				);
				s.set("gate_open");
			},
		},
		// ── 改札の通りぬけ口。閉まっている間は乗れない ──
		{
			id: "gate",
			x: 13,
			y: 6,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (!s.flag("gate_open")) {
					s.se("cancel");
					await s.narrate(
						"改札は　しまっている。\n電光板は『回送』のまま　うごかない。",
					);
					await announce(
						s,
						"――レコードを　おもちでない方は、\nごじょうしゃ　いただけません",
					);
					await s.move("player", "l");
					return;
				}
				await s.narrate("改札が　ひらいている。");
				await s.warp("train", 1, 3, "right", { se: "warp" });
			},
		},

		// ── ネムリン（改札の番人。ヒント役） ──
		npc(
			"nemurin",
			12,
			7,
			"char:nemurin",
			async (s) => {
				if (s.flag("gate_open")) {
					await s.say(
						"nemurin",
						"改札、あいたピロ。\n……いってらっしゃいむ〜ん",
					);
					return;
				}
				if (!s.flag("seen_nemurin")) {
					s.set("seen_nemurin");
					await s.say(
						"nemurin",
						"……ふぁ。おきゃくさんピロ？\nうちは　改札の番ピロ",
					);
					await s.say(
						"nemurin",
						"終電は、きっぷの　かわりに\n黒いレコード盤が　3まい　いるピロ",
					);
					await s.say(
						"nemurin",
						"とびらの　おくに　おちてる……\nはずピロ。……眠たいむ〜ん",
					);
					return;
				}
				await s.say(
					"nemurin",
					"レコード、みつかったピロ？\n……うちは　ここで　寝てるピロ",
				);
			},
			{ dir: "right" },
		),

		// ── しらべられるもの（見えない talk イベント） ──
		{
			id: "clock",
			x: 5,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("駅の時計だ。\n――2:00で　とまっている。");
				await s.narrate("……部屋の時計と、おなじ時刻。");
			},
		},
		{
			id: "poster",
			x: 9,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべの　ポスター。");
				await s.narrate("『この顔を　夢で　見たことが\nありますか？』");
				await s.narrate("……顔の絵は、はがれて　ない。");
			},
		},
		{
			id: "elevator",
			x: 13,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("エレベーターの扉だ。\nボタンが、どこにも　ない。");
				await s.narrate("よこに　手がきの　メモ。\n『4　2　6　2　10……』");
				await s.narrate("（つづきは　よめない。）");
			},
		},
		{
			id: "vending",
			x: 7,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"じはんき。ひくく　うなっている。\nボタンは　ぜんぶ『うりきれ』。",
				);
			},
		},
		{
			id: "board",
			x: 13,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("gate_open")) {
					await s.narrate("電光板。『――きさらぎ――』");
					return;
				}
				await s.narrate(
					"電光板。『――回送――』\nじこくひょうは　どこにも　ない。",
				);
			},
		},
	],
};
