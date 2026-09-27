// 伊佐貫トンネル（きさらぎ線）。DESIGN §4・content-briefs「line:」。
// 24×6・dark 0.85・BGM null の一本道＝余白の極限（style-spaces）。
// 中間で照明が消える（flash 黒 700ms →「――2:45」）。出口ちかくで人影の言及（地の文のみ・実体なし）。
// s.note: yamanoke（壁の落書き「テン　ソウ　メツ」）。
// 東 (23,3) → kisaragi (1,7)・西 (0,3) → terminus (13,5)（どちらも両道）。

import type { GameState, MapDef, Story } from "../../engine/defs";
import { TUNNEL } from "../tiles-underground";

// 自作チップ（data/tiles-underground.ts の TUNNEL）。
// # 闇 / W 煤けたレンガの巻き / w 湿ったコンクリートの側壁（ケーブル棚） / t 線路（きさらぎ駅から枕木がつづく）
const tiles = TUNNEL;

const rows = [
	"########################", // y0
	"WWWWWWWWWWWWWWWWWWWWWWWW", // y1
	"wwwwwwwwwwwwwwwwwwwwwwww", // y2  落書き (7,2)・照明 (9,2)・水音 (14,2)・たいひこう (16,2)・プレート (19,2)
	"tttttttttttttttttttttttt", // y3  西 (0,3) → terminus ／ 東 (23,3) → kisaragi
	"WWWWWWWWWWWWWWWWWWWWWWWW", // y4
	"########################", // y5
];

export const tunnel: MapDef = {
	id: "tunnel",
	scene: "tunnel", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "伊佐貫トンネル",
	bgm: null,
	dark: 0.85,
	outside: "#000",
	tiles,
	rows,
	events: [
		// ── 出入り口 ──
		{
			id: "to_kisaragi",
			x: 23,
			y: 3,
			trigger: "touch",
			through: true,
			run: async (s) => {
				await s.warp("kisaragi", 1, 7, "right");
			},
		},
		{
			id: "to_terminus",
			x: 0,
			y: 3,
			trigger: "touch",
			through: true,
			run: async (s) => {
				await s.warp("terminus", 13, 5, "left");
			},
		},

		// ── 入った直後（auto once） ──
		{
			id: "enter",
			x: 22,
			y: 3,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(400);
				await s.narrate("トンネルの中は、そとより\nしずかだ。");
				await s.say("kiriko", "……足音だけ、ンゴ");
			},
		},

		// ── 中間で照明が消える（――2:45） ──
		...([11, 12] as const).map((x, i) => ({
			id: `blackout_${i}`,
			x,
			y: 3,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !st.flags.seen_flash,
			run: async (s: Story) => {
				s.set("seen_flash");
				await s.flash("#000", 700);
				await s.narrate("――2:45");
				await s.narrate("……電気が、また　ついた。");
				await s.say("kiriko", "……いまの、なしンゴ");
			},
		})),

		// ── 出口ちかくの人影（地の文のみ。実体は置かない） ──
		{
			id: "kage",
			x: 3,
			y: 3,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_kage,
			run: async (s) => {
				s.set("seen_kage");
				await s.narrate("トンネルの先に、だれか\n立っている気がした。");
				await s.narrate("……目を　こらすと、いない。");
			},
		},

		// ── 壁のしらべもの ──
		{
			id: "yamanoke",
			x: 7,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("note_yamanoke")) {
					await s.narrate("壁に、ふるい　白い字。\n『テン　ソウ　メツ』");
					await s.say("kiriko", "……意味は、調べない\n約束ンゴ");
					await s.note("yamanoke");
					return;
				}
				// 二度目（往復路）の差分はこの1つだけ（余白の極限を保つ）
				await s.narrate("『テン　ソウ　メツ』。\n……ふえては、いない。");
			},
		},
		{
			id: "light",
			x: 9,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				await s.narrate("照明が、うなっている。\nときどき、まばたきをする。");
			},
		},
		{
			id: "drip",
			x: 14,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				s.se("tick", { volume: 0.4, pan: -0.4 });
				await s.narrate("……水の音。どこかで\nしたたっている。");
			},
		},
		{
			id: "alcove",
			x: 16,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"たいひこう（壁のくぼみ）。\nひとが　ひとり、入れるくらい。",
				);
				await s.narrate("……入っている　あいだは、\n息を　とめる気がする。");
			},
		},
		{
			id: "plate",
			x: 19,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"『いさぬき隧道』のプレート。\n竣工の年は、さびて　よめない。",
				);
			},
		},
	],
};
