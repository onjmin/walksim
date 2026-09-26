// キリコの部屋（はじまりの部屋）。DESIGN §4・content-briefs 品質ノルマ（生活感の小物で埋める）。
// 12×10 の室内。ベッド・机・本棚・テレビ・モニター・蓄音機・日記（セーブ）・やかん・ドア。
// 時計は「2:00」で止まっている。BGM は無音（時計まで止まっているので、音がしない）。
// 深夜2時に目が覚め、ドアの外が いつもの廊下ではなく「回線の間」につながっている（opening）。
// 考察バイト（docs/kousatsu-bait.md 技法3）: カレンダーは 2021年3月・15日にまる。
// 小ネタ: テレビの砂あらし →（レコードを持って戻ったあと・3回目）NNN風の名前の放送（note nnn）。

import type { MapDef, TileDef } from "../../engine/defs";
import { OBJ } from "../helpers";
import { SPR } from "../sprites";
import { base, INDOOR, PROPS } from "../tiles";

// INDOOR に足すもの: c 壁の貼り紙（カレンダー）
const tiles: Record<string, TileDef> = {
	...INDOOR,
	c: {
		layers: [base(1, 78), PROPS.notice],
		color: "#e8e4dc",
		passable: false,
	},
};

// W 窓 / Q 絵（ポスター） / c カレンダー / k 柱時計 / Z z ベッド / t 机 / B 本棚 / V テレビ / M モニター / n いす
const rows = [
	"############", // y0
	"#HHWHHQHHHH#", // y1  窓 (3,1)・ポスター (6,1)
	"#hhhhchhkhh#", // y2  カレンダー (5,2)・柱時計 (8,2)
	"#Zt..B.V.M.#", // y3  ベッド (1,3)・机 (2,3)・本棚 (5,3)・テレビ (7,3)・モニター (9,3)
	"#z.......n.#", // y4  いす (9,4)。起きた場所 (2,4)
	"#..........#", // y5
	"#.........t#", // y6  日記 (2,6)・蓄音機 (5,6)・やかんの台 (10,6)
	"#..........#", // y7
	"#..........#", // y8  hub からの戻り位置 (5,8)
	"#####D######", // y9  ドア (5,9) → hub (10,12)
];

/** レコードを1枚でも持っているか。 */
const anyRecord = (st: { items: Record<string, number> }): boolean =>
	(st.items.rec_a ?? 0) > 0 ||
	(st.items.rec_b ?? 0) > 0 ||
	(st.items.rec_c ?? 0) > 0;

export const room: MapDef = {
	id: "room",
	name: "キリコの部屋",
	bgm: null,
	outside: "#1b1410",
	tiles,
	rows,
	events: [
		// ── 目が覚める（auto once）。短く：2:00・音がしない・ドアの下の光 ──
		{
			id: "opening",
			x: 2,
			y: 4,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(600);
				await s.narrate("……目が　さめた。");
				await s.narrate("時計の音が　しない。\n――2:00。とまっている。");
				await s.say("kiriko", "……まだ　よなかンゴ");
				await s.narrate(
					"ドアの下から、しろい光が\nすじに　なって　もれている。",
				);
				await s.say("kiriko", "……ろうかの電気、\nこんな色だったンゴ？");
			},
		},
		// ── 蓄音機がひとりでに回っている（レコードを持って初めて戻ったとき） ──
		{
			id: "phono_spin",
			x: 6,
			y: 5,
			trigger: "auto",
			once: true,
			when: (st) => anyRecord(st) && !!st.flags["done:room:opening"],
			run: async (s) => {
				await s.wait(400);
				s.se("record");
				await s.narrate("――蓄音機が、ひとりでに\nまわっている。");
				await s.narrate("レコードは、\nのせていないのに。");
				s.se("needle");
				await s.narrate("針をあげると、すなおに\nとまった。");
			},
		},
		// ── ドア。はじめて開けたときだけ、外がおかしいことに気づく ──
		{
			id: "door",
			x: 5,
			y: 9,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (!s.flag("seen_door")) {
					s.set("seen_door");
					s.se("door");
					await s.narrate("ドアを　あけた。\n――いつもの　ろうかが、ない。");
					await s.narrate(
						"だれもいない　駅の待合室が、\nしずかに　つづいている。",
					);
					await s.warp("hub", 10, 12, "up");
					return;
				}
				await s.warp("hub", 10, 12, "up", { se: "door" });
			},
		},
		// ── 日記（セーブ）。絵は記録の水晶（helpers.ts の OBJ.save）で代用 ──
		{
			id: "diary",
			x: 2,
			y: 6,
			sprite: OBJ.save,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate(
					"日記帳だ。ひらいたページに\n今日の日付だけ　書いてある。",
				);
				await s.saveMenu();
			},
		},
		// ── 蓄音機（メニューの案内） ──
		{
			id: "phono",
			x: 5,
			y: 6,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("キリコの　蓄音機だ。");
				await s.narrate(
					"ひろった　レコードは、メニューの\n「レコード」で　いつでも　聞ける。",
				);
			},
		},
		// ── しらべられる家具（見えない talk イベント） ──
		{
			id: "clock",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべの時計。\n――2:00で　とまっている。");
				s.se("tick");
				await s.wait(700);
				if (!s.flag("seen_clock")) {
					s.set("seen_clock");
					await s.say("kiriko", "……いま、動いたンゴ？");
					return;
				}
				await s.narrate("……秒針は、それきり\nうごかない。");
			},
		},
		{
			id: "window",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("そとは　まっくら。\nまちの明かりが、ひとつもない。");
				await s.narrate("街灯も、信号の色も、\nどこにも　ない。");
			},
		},
		{
			id: "calendar",
			x: 5,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("カレンダー。\n2021年3月の　ままだ。");
				await s.narrate("15日に、まるが　ついている。");
				await s.narrate("なんの日かは、思い出せない。");
			},
		},
		{
			id: "poster",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レコードやの　ポスター。\n『中古盤、高価買取』");
				await s.say("kiriko", "……売らないンゴ");
			},
		},
		{
			id: "bed",
			x: 1,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"ふとんは　まだ　あたたかい。\n……もう　ねむれる気が　しない。",
				);
			},
		},
		{
			id: "desk",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("机のうえは、きれいだ。");
				await s.narrate("……こんなに　きれいなのは、\nめずらしい。");
			},
		},
		{
			id: "pc",
			x: 9,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"モニターは　ついていない。\nじぶんの顔だけ、うつっている。",
				);
			},
		},
		{
			id: "shelf",
			x: 5,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("本と、レコードの空き箱。\nどれも　見おぼえがある。");
			},
		},
		// ── テレビ（砂あらし。まれに NNN 風の放送 → note nnn） ──
		{
			id: "tv",
			x: 7,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const n = Number(s.flag("seen_tv") ?? 0);
				s.set("seen_tv", n + 1);
				// 「まれ」は乱数でなく回数で作る：3回目以降＋レコードを持って外から戻ったあと
				// （s.has で見る。items を直に読むと validate がこの分岐をたどれない）
				const rec =
					s.has("rec_a") > 0 || s.has("rec_b") > 0 || s.has("rec_c") > 0;
				if (!s.flag("note_nnn") && n >= 2 && rec) {
					await s.narrate("テレビを　つけた。\n――砂あらしが、ふっと　やんだ。");
					await s.narrate("くらい画面を、白い文字が\nながれていく。");
					await s.narrate(
						"『名無しさん』『名無しさん』\n『名無しさん』『名無しさん』",
					);
					await s.say("kiriko", "……ぜんぶ、おなじ\n名前ンゴ");
					await s.narrate("文字は、しばらく　つづいて、\nふつりと　きれた。");
					await s.note("nnn");
					await s.narrate("あとには、砂あらしだけが\nのこっている。");
					return;
				}
				s.se("hum", { volume: 0.6 });
				await s.narrate("テレビを　つけた。\n――ざあ、と　砂あらし。");
				await s.narrate("なにも　うつらないので、\nけした。");
			},
		},
		{
			id: "kettle",
			x: 10,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("やかんが　のっている。\nさわると、まだ　あたたかい。");
				await s.say("kiriko", "……わかした　おぼえは、\nないンゴ");
			},
		},
	],
};
