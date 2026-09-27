// きさらぎ駅（きさらぎ線・無人ホーム→線路歩き）。DESIGN §4・content-briefs「line:」。
// 30×12 横長のフィルムストリップ。BGM null・ambient static 弱・outside 純黒（style-spaces）。
// 原典の時刻進行を地の文で刻む: ――0:25（駅名標）→ 1:12（線路へ）→ 1:30（太鼓と鈴）→ 2:09（片足の老人）。
// レイのアナウンスはレコード枚数で揺らぐ（DESIGN §5 縦糸）。末尾に右パン小音量の「ぽ」（考察バイト技法7）。
// 信号灯の長短パターンは和文モールスで「ミツケテクレテ アリガトウ」（技法2。答え合わせはしない。
// テキストに書き起こすのは冒頭の1組だけ＝採譜はプレイヤーの仕事。規則のヒントはクレジットに1行）。
// s.note: kisaragi（駅名標）・mary（電話に出た）・taiko・oldman・myaumyau（目撃③）・
// ushiro（二度目の「きみの、うしろ」）・isanuki（西端の看板。train の窓でも呼ぶ）。
// 片道: 電車は去る。西端 (0,7) → tunnel (22,3)。tunnel からは (1,7) に戻ってくる（この対は両道）。

import type { GameState, MapDef, Story, TileDef } from "../../engine/defs";
import type { Dir } from "../../engine/types";
import { SPR } from "../sprites";
import { base, basePx, PROPS, TOWN } from "../tiles";

/** 駅のアナウンス（レイの機械音声。立ち絵なし・名前欄「アナウンス」）。 */
const announce = (s: Story, text: string) =>
	s.say("rei", text, { name: "アナウンス", noPortrait: true });

const PAVE = base(5, 48);
const DIRT = base(1, 162);
const TIES = base(4, 43); // 橋板を枕木に見立てる
const EDGE_LINE = basePx(96, 1760, 16, 3); // 白線（マスの下端に乗る）

// TOWN ＋ 駅の地形。
// - ホームの白線 / w ホームの壁面 / = ホームから線路へ降りる段
// t 線路（枕木） / g 砂利（通れない） / ^ 車止め
// I ホームの柱 / M 駅員室のシャッター / p 公衆電話 / ~ " 向かいのホーム（渡れない）
const tiles: Record<string, TileDef> = {
	...TOWN,
	"-": { layers: [PAVE, EDGE_LINE], color: "#9aa0a8", passable: true },
	w: { layers: [base(1, 170)], color: "#3a3630", passable: false },
	"=": { layers: [base(6, 51)], color: "#8a8a8a", passable: true },
	t: { layers: [DIRT, TIES], color: "#2e2620", passable: true },
	g: { layers: [DIRT], color: "#26221e", passable: false },
	"^": { layers: [DIRT, PROPS.crate], color: "#3a3026", passable: false },
	I: { layers: [PAVE, base(1, 68)], color: "#8c8c90", passable: false },
	M: { layers: [PAVE, PROPS.metalDoor], color: "#8c8c90", passable: false },
	p: { layers: [PAVE, PROPS.console], color: "#8c8c90", passable: false },
	"~": { layers: [PAVE], color: "#4a4b52", passable: false },
	'"': { layers: [PAVE], color: "#44454c", passable: false },
};

const rows = [
	"                              ", // y0
	"                              ", // y1
	"  fMffKffffVfpfff             ", // y2  駅員室 (3,2)・掲示板 (6,2)・自販機 (11,2)・電話 (13,2)
	"  ..Bb..L...L....             ", // y3  ベンチ (4,3)(5,3)・電灯 (8,3)(12,3)・駅名標 (10,3)・うしろ (14,3)
	"  ............I..             ", // y4  降車位置 (4,4)・柱 (14,4)
	"  ---------------             ", // y5  ホームの白線。もどりの電話ベル (16,5)
	" ggwwwwwwwtwwwww=gggggggggggg ", // y6  信号灯 (2,6)・看板 (1,6)・すきま (10,6)・段 (16,6)・きっぷ (18,6)
	"ttttttttttttttttttttttttttttt^", // y7  線路。西端 (0,7) → tunnel
	"gtttttttttttttttttttttttttttt^", // y8  車止め (29,7)(29,8)・花 (28,8)
	"   ~~~~~~~~~~~~~~~~~~~~~~~~   ", // y9  向かいのホーム。ミャウミャウ③ (12,9)
	'   """"""""""""""""""""""""   ', // y10
	"                              ", // y11
];

/** 向きの逆算（うしろの座標に使う）。 */
const VEC: Record<Dir, [number, number]> = {
	up: [0, -1],
	down: [0, 1],
	left: [-1, 0],
	right: [1, 0],
};

export const kisaragi: MapDef = {
	id: "kisaragi",
	scene: "kisaragi", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "きさらぎ駅",
	bgm: null,
	ambient: { kind: "static", color: "#3a4044" },
	outside: "#000",
	tiles,
	rows,
	events: [
		// ── 降車直後（auto once）。終電が去る＝片道の宣告 ──
		{
			id: "arrive",
			x: 4,
			y: 4,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(500);
				s.se("door");
				await s.narrate("――うしろで、ドアが\nしまった。");
				s.se("train", { volume: 0.6, pan: -0.3 });
				await s.wait(700);
				await s.narrate("終電が、うごきだす。");
				s.se("train", { volume: 0.35, pan: -0.7 });
				await s.wait(700);
				s.se("train", { volume: 0.15, pan: -1 });
				await s.narrate("……あかりが、西のやみに\nすいこまれていった。");
				await s.say("kiriko", "…………");
				await s.narrate("ホームには、だれも　いない。");
			},
		},

		// ── 西端 → トンネル（両道） ──
		{
			id: "to_tunnel",
			x: 0,
			y: 7,
			trigger: "touch",
			through: true,
			run: async (s) => {
				await s.warp("tunnel", 22, 3, "left");
			},
		},

		// ── アナウンス（once・ホームを歩くと）。レコード枚数で揺らぐ＋技法7 ──
		...([3, 4, 5] as const).map((y, i) => ({
			id: `housou_${i}`,
			x: 7,
			y,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !st.flags.seen_housou,
			run: async (s: Story) => {
				s.set("seen_housou");
				await s.wait(300);
				const recs = ["rec_a", "rec_b", "rec_c"].filter(
					(id) => s.has(id) > 0,
				).length;
				if (recs >= 3) {
					await announce(s, "本日の……　運行は、\n終了　しました");
					await announce(s, "おかえりは――");
					await s.wait(900);
					await s.narrate("――つづきは、なかった。");
					s.se("popo", { pan: 0.9, volume: 0.2 });
					return;
				}
				await announce(s, "本日の　運行は\n終了しました");
			},
		})),

		// ── 駅名標（――0:25。note kisaragi） ──
		{
			id: "ekimei",
			x: 10,
			y: 3,
			sprite: PROPS.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (!s.flag("note_kisaragi")) await s.narrate("――0:25");
				await s.narrate("駅名標。ひらがなで\n『きさらぎ』。");
				await s.narrate("りょうどなりの駅名は、\nどちらも　空欄だ。");
				await s.note("kisaragi");
			},
		},

		// ── ホームのしらべもの ──
		{
			id: "keijiban",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_keiji")) {
					s.set("seen_keiji");
					await s.narrate("掲示板。なにも\nはられていない。");
					return;
				}
				await s.narrate("なにも　はられていない。\n……画鋲だけ、ふえている。");
			},
		},
		{
			id: "office",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("駅員室の　シャッター。\n『しばらく　留守にします』");
				await s.narrate("……『しばらく』の字が、\nいちばん　あたらしい。");
			},
		},
		{
			id: "vending",
			x: 11,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("じはんき。あかりが\nきえている。");
				await s.narrate("ボタンは、ぜんぶ\n『うりきれ』。");
			},
		},
		// 公衆電話（メリーさん。線路に降りて戻ると once で鳴る）
		{
			id: "phone",
			x: 13,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("seen_ring") && !s.flag("seen_marycall")) {
					s.set("seen_marycall");
					await s.narrate("電話が、鳴っている。");
					const c = await s.choose(["＞＞1 出る", "＞＞2 出ない"]);
					if (c === 0) {
						await s.narrate("じゅわきを、耳に　あてた。");
						await s.wait(600);
						await s.narrate("――『いま、どこ？』");
						await s.narrate("――切れた。");
						await s.say("kiriko", "……そっちこそ、\nどこンゴ");
						await s.note("mary");
						return;
					}
					await s.narrate("ベルは、しばらく　鳴って\n――やんだ。");
					return;
				}
				if (s.flag("seen_marycall")) {
					await s.narrate("公衆電話。\n……もう、鳴らない気がする。");
					return;
				}
				await s.narrate("公衆電話。じゅわきを\nあげてみる。");
				await s.narrate("――つながらない。");
			},
		},
		{
			id: "bench",
			x: 4,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ベンチが、つめたい。\n……ずっと前から、つめたい。");
			},
		},
		{
			id: "lamp",
			x: 8,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("電灯。……虫が、一匹も\nよってこない。");
			},
		},
		{
			id: "pillar",
			x: 14,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ホームの柱。……かげが、\nひとりぶん　こい。");
			},
		},

		// ── 君野うしろ（柱の陰 → 真うしろ）。note ushiro ──
		{
			id: "ushiro_ev",
			x: 14,
			y: 3,
			sprite: "char:ushiro",
			dir: "up",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (!s.flag("seen_ushiro1")) {
					await s.narrate("柱のかげに、女の子。\n……こちらに、背をむけている。");
					await s.say("kiriko", "……もしもしンゴ？");
					await s.narrate("（……ふりむかない。）");
					await s.fadeOut(250);
					const [dx, dy] = VEC[s.state.dir];
					const bx = Math.max(0, Math.min(29, s.state.x - dx));
					const by = Math.max(0, Math.min(11, s.state.y - dy));
					s.place("ushiro_ev", bx, by, s.state.dir);
					await s.fadeIn(250);
					await s.narrate("――きえた。");
					s.set("seen_ushiro1");
					return;
				}
				if (!s.flag("note_ushiro")) {
					await s.say("ushiro", "きみの、うしろ", { name: "？？？" });
					await s.narrate("……それきり、なにも\n言わなくなった。");
					await s.note("ushiro");
					s.place("ushiro_ev", 15, 3, "down");
					return;
				}
				await s.narrate("（……なにも　言わない。\nこちらを、見てもいない。）");
			},
		},

		// ── 線路へ降りる段（――1:12） ──
		{
			id: "stairs",
			x: 16,
			y: 6,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_rail,
			run: async (s) => {
				s.set("seen_rail");
				await s.narrate("――1:12");
				await s.say("kiriko", "線路を　あるいて帰るンゴ");
				await s.narrate("西へ。……トンネルの方へ、\nレールが　つづいている。");
			},
		},
		// もどると電話が鳴っている（once の前ふり。段の上と、すきまの上の2か所）
		...(
			[
				[16, 5],
				[10, 5],
			] as const
		).map(([x, y], i) => ({
			id: `ring_${i}`,
			x,
			y,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !!st.flags.seen_rail && !st.flags.seen_ring,
			run: async (s: Story) => {
				s.set("seen_ring");
				await s.narrate("――どこかで、ベルの音。");
				await s.narrate("……公衆電話が、鳴っている。");
			},
		})),

		// ── 太鼓と鈴（――1:30。once・note taiko） ──
		...([7, 8] as const).map((y, i) => ({
			id: `taiko_${i}`,
			x: 8,
			y,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !st.flags.note_taiko,
			run: async (s: Story) => {
				await s.narrate("――1:30");
				s.se("taiko", { pan: -0.8, volume: 0.9 });
				await s.wait(800);
				s.se("suzu", { pan: 0.8, volume: 0.7 });
				await s.wait(800);
				s.se("taiko", { pan: -0.5 });
				await s.wait(700);
				s.se("suzu", { pan: 0.5, volume: 0.8 });
				await s.wait(700);
				await s.narrate("たいこの音…と、すずの音…");
				await s.narrate("交互に。……すこしずつ、\n近づいてくる。");
				await s.say("kiriko", "……とまらないほうが、\nいい気がするンゴ");
				await s.note("taiko");
			},
		})),

		// ── 片足の老人（――2:09。接近で現れ、ふれると消える。note oldman） ──
		...([7, 8] as const).map((y, i) => ({
			id: `old_app_${i}`,
			x: 4,
			y,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !st.flags.seen_oldman,
			run: async (s: Story) => {
				s.set("seen_oldman");
				s.show("oldman_ev");
				// さけびごえは原典準拠の地の文のみ。ここに大音量のSEを足さない（DESIGN §8 ジャンプスケア禁止）
				await s.narrate("――さけびごえが、した。");
				s.face("player", s.state.x < 6 ? "right" : "left");
				await s.wait(600);
				await s.narrate("――2:09");
				await s.narrate("おじいさんが、立っていた。");
				await s.narrate("かた足で、じっと\nこちらを　見ている。");
			},
		})),
		{
			id: "oldman_ev",
			x: 6,
			y: 7,
			sprite: "char:oldman",
			dir: "left",
			trigger: "talk",
			fixedDir: true,
			when: (st) => !!st.flags.seen_oldman,
			run: async (s) => {
				await s.narrate("（…………。）");
				s.hide("oldman_ev");
				await s.narrate("――ふっと、消えた。");
				await s.note("oldman");
			},
		},
		...(
			[
				[5, 7],
				[7, 7],
				[6, 8],
			] as const
		).map(([x, y], i) => ({
			id: `old_near_${i}`,
			x,
			y,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !!st.flags.seen_oldman && !st.flags.note_oldman,
			run: async (s: Story) => {
				s.hide("oldman_ev");
				await s.narrate("――ふっと、消えた。");
				await s.note("oldman");
			},
		})),

		// ── ミャウミャウ目撃③（向かいのホーム。渡れない） ──
		{
			id: "myau3_ev",
			x: 12,
			y: 9,
			sprite: SPR.myaumyauC,
			dir: "up",
			trigger: "talk",
			fixedDir: true,
			when: (st) => !st.flags.seen_myau3,
		},
		...([7, 8] as const).map((y, i) => ({
			id: `myau3_see_${i}`,
			x: 13,
			y,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !st.flags.seen_myau3,
			run: async (s: Story) => {
				s.face("player", "down");
				await s.narrate("むこうのホームに、\nだれか　いる。");
				await s.narrate("紙袋あたま。……こっちに\n手を　ふっている。");
				await s.say("kiriko", "み、ミャウミャウンゴ！\nどうやって　そっちに――");
				await s.say("myaumyau", "……こっちは　だめぷ");
				await s.fadeOut(200);
				s.set("seen_myau3");
				s.hide("myau3_ev");
				await s.fadeIn(200);
				await s.narrate("――もう、いなかった。");
				await s.note("myaumyau");
			},
		})),

		// ── ホームの下のすきま（隠し・無印通行） ──
		{
			id: "nook",
			x: 10,
			y: 6,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.found_nimotsu,
			run: async (s) => {
				s.set("found_nimotsu");
				await s.narrate("ホームの下に、すきま。");
				await s.narrate("傘が　三本、きちんと\nならべて　立ててある。");
				await s.say("kiriko", "……かりるのは、\nやめておくンゴ");
			},
		},

		// ── 線路ばたのしらべもの ──
		{
			id: "ticket",
			x: 18,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"きっぷが、おちている。\n行き先は、こすれて　よめない。",
				);
			},
		},
		{
			id: "buffer",
			x: 29,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("車止め。レールは、ここで\nおわっている。");
				await s.narrate("……のびていく先は、\n西にしか　ない。");
			},
		},
		{
			id: "flower",
			x: 28,
			y: 8,
			sprite: base(5, 11),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("花が　一輪、そなえてある。\n……まだ、あたらしい。");
			},
		},
		// 信号灯（技法2: 和文モールス。答え合わせはしない）
		{
			id: "signal",
			x: 2,
			y: 6,
			sprite: PROPS.lantern,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("信号灯。赤が、ついたり\nきえたり　している。");
				await s.narrate("（・・－・－　・－－・……）");
				await s.narrate("ながいのと、みじかいの。\n――くりかえしている。");
				await s.say("kiriko", "……信号、ンゴ？");
			},
		},
		// 西端の看板（いさぬき。note isanuki）
		{
			id: "isanuki_sign",
			x: 1,
			y: 6,
			sprite: PROPS.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("かたむいた看板。\n『いさぬき』");
				await s.say("kiriko", "……よめるのに、しらない\n名前ンゴ");
				await s.note("isanuki");
			},
		},
	],
};
