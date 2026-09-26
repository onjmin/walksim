// こくどう（国道ぞいの歩道）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 40×12・outdoor・BGM null。二車線の国道（わたれない）と南の歩道、歩道橋、つぶれたファミレス。
//
// 時間帯の顔:
//   夕方 … トラックの風・バス待ちの人・部活帰り
//   深夜 … NPC 0体必達。脇道の怪異はここの担当2つ:
//           famiresu（割れた窓の奥で一瞬だけ灯り。once・二度目はない）
//           hodokyo（歩道橋の上。車は来ないのにライトだけが流れる）
//   朝   … 始発前のバス停・ジョギングの人
//
// 座標凍結v3: 東 (39,10)→street(1,11)・street からの着地 (38,10)／
// 西 (0,10)→ekimae(30,9)・ekimae からの着地 (1,10)／
// 南 (20,11)→danchi(16,1)・danchi からの着地 (20,10)。
//
// 歩道橋: 南階段 (24,9)→デッキ(25,2)／デッキ西端 (24,2)→歩道(24,10)／
// デッキ東端 (28,2)→北側(28,7)／北階段 (28,6)→デッキ(27,2)。
// 北側（ファミレス前）へは歩道橋でしか渡れない＝橋に用事を作る。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { npc, warp } from "../helpers";
import { base, basePx, PROPS, TOWN } from "../tiles";

// ── タイル ──
//   r  車道（わたれない）  -  車道（センターライン）  =  歩道橋の階段
//   t  ファミレスの窓（レンガ下段）  j  しまった戸  b  草むら  V  自販機
const ASPHALT = base(3, 46);
const EDGE_LINE = basePx(96, 1760, 16, 3);
const WIN_LOW_BRICK = basePx(16, 1382);
const tiles: Record<string, TileDef> = {
	...TOWN,
	r: { layers: [ASPHALT], color: "#55565e", passable: false },
	"-": { layers: [ASPHALT, EDGE_LINE], color: "#55565e", passable: false },
	"=": { layers: [base(6, 51)], color: "#8a8a8a", passable: true },
	t: {
		layers: [base(1, 62), WIN_LOW_BRICK],
		color: "#a04a3a",
		passable: false,
	},
	j: {
		layers: [base(1, 56), base(7, 55, 1, 2)],
		color: "#6a4a2a",
		passable: false,
	},
	b: {
		layers: [TOWN[","].layers[0], base(0, 10)],
		color: "#5f8e2a",
		passable: false,
	},
};

const rows = [
	"                                        ", // y0
	"                        fffff           ", // y1  歩道橋のらんかん（北）
	"                        .....           ", // y2  歩道橋のデッキ (24-28,2)
	"        nnnnnnnnnnn     fffff           ", // y3  ファミレスの屋根・らんかん（南）
	"        ^^^^^^^^^^^                     ", // y4
	"        #t#t#j#t#t#                     ", // y5  われた窓 (9,5)・入口 (13,5)
	"      ......................=..         ", // y6  ファミレス前・北階段 (28,6)
	"      .........................         ", // y7
	"----------------------------------------", // y8  国道（センターライン）
	"rrrrrrrrrrrrrrrrrrrrrrrr=rrrrrrrrrrrrrrr", // y9  南階段 (24,9)
	"........................................", // y10 歩道。西 (0,10)→ekimae・東 (39,10)→street
	"bbbbbbbbLbbbbbbbbbbb:.......!..V..!.Lbbb", // y11 バスだまり・danchi への道 (20,11)
];

// ── モブの歩行グラ ──
const OBACHAN = "pub:assets/rpgen/char/05-elderly-b.png";
const STUDENT = "pub:assets/rpgen/char/04-child.png";
const RUNNER = "pub:assets/rpgen/char/11-woman-b.png";
const MAN = "pub:assets/rpgen/char/16-man-b.png";

/** 歩道橋の上からの国道（tod で顔が変わる。深夜が hodokyo の担当）。 */
const hodokyoView = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("歩道橋の上。国道は、\nどこまでも　からっぽだ。");
		await s.wait(800);
		await s.narrate("……とおくで、ライトだけが\nながれていった。");
		await s.wait(500);
		await s.narrate("車の音は、しなかった。");
		await s.note("hodokyo");
		return;
	}
	if (t === "asa") {
		await s.narrate("歩道橋の上。とおくの車が、\nぽつ、ぽつ、と走っていく。");
		await s.narrate("はたらく人の　時間だ。");
		return;
	}
	s.se("train", { pan: -0.4, volume: 0.4 });
	await s.narrate("歩道橋の上。トラックが、\n下を　とおりぬけていく。");
	await s.narrate("国道は、西日のほうへ\nまっすぐ　のびている。");
};

export const kokudo: MapDef = {
	id: "kokudo",
	name: "こくどう",
	bgm: null,
	outdoor: true,
	outside: "#0a0a0c",
	tiles,
	rows,
	// ナトリウム灯の色（#ffdf9e）が国道の夜。ファミレスは灯りを持たない（死んだ店の記号）
	lights: [
		{ x: 8, y: 11, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 36, y: 11, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 16, y: 6, r: 2, color: "#cfe4ff", only: "yoru,shinya" },
		{ x: 31, y: 11, r: 1.5, color: "#eef4ff", only: "yoru,shinya" },
	],
	onEnter: async (s) => {
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { volume: 0.7 });
		else if (t === "asa") s.se("suzume", { volume: 0.7 });
	},
	events: [
		// ── 着いたとき（時間帯ごとに一度だけ） ──
		{
			id: "arrive_yu",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				await s.wait(500);
				s.se("train", { pan: -0.5, volume: 0.4 });
				await s.wait(600);
				await s.narrate("大きなトラックが、風を\nつれて　とおりすぎた。");
			},
		},
		{
			id: "arrive_shinya",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(700);
				await s.narrate("国道に、車が一台も\nいない。");
				await s.narrate("街灯の音だけが、\nじー、と　している。");
			},
		},
		{
			id: "arrive_asa",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				await s.wait(500);
				s.se("suzume", { pan: 0.2, volume: 0.7 });
				await s.wait(500);
				await s.narrate("アスファルトが、朝つゆで\nすこし　しめっている。");
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_ekimae", 0, 10, { map: "ekimae", x: 30, y: 9, dir: "left" }),
		warp("to_street", 39, 10, { map: "street", x: 1, y: 11, dir: "right" }),
		warp("to_danchi", 20, 11, { map: "danchi", x: 16, y: 1, dir: "down" }),

		// ── 歩道橋（階段はワープで昇り降り） ──
		warp(
			"hodo_up_s",
			24,
			9,
			{ map: "kokudo", x: 25, y: 2, dir: "right" },
			{ se: "stairs" },
		),
		warp(
			"hodo_dn_w",
			24,
			2,
			{ map: "kokudo", x: 24, y: 10, dir: "down" },
			{ se: "stairs" },
		),
		warp(
			"hodo_up_n",
			28,
			6,
			{ map: "kokudo", x: 27, y: 2, dir: "left" },
			{ se: "stairs" },
		),
		warp(
			"hodo_dn_e",
			28,
			2,
			{ map: "kokudo", x: 28, y: 7, dir: "down" },
			{ se: "stairs" },
		),
		{
			id: "hodokyo_view",
			x: 26,
			y: 1,
			trigger: "talk",
			run: hodokyoView,
		},
		{
			id: "hodokyo_rakugaki",
			x: 26,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"らんかんの　らくがき。\nしらない名前の　あいあいがさ。",
				);
			},
		},

		// ── つぶれたファミレス（深夜の一瞬の灯りが famiresu の担当。once） ──
		{
			id: "famiresu_win",
			x: 9,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					if (!s.flag("seen_famiresu")) {
						s.set("seen_famiresu");
						await s.narrate("われた窓。中は、くらい。");
						await s.wait(800);
						await s.flash("#ffe9b0", 180);
						await s.narrate("――おくで、一瞬だけ\n灯りがついた。");
						await s.wait(600);
						await s.narrate("……もう、つかない。");
						await s.note("famiresu");
						return;
					}
					await s.narrate("われた窓。中は、くらい。\n……くらい、ままだ。");
					return;
				}
				await s.narrate("われた窓に、テープが\nばってん印に　はってある。");
				await s.narrate("中に、さかさまの\nいすが見える。");
			},
		},
		{
			id: "famiresu_door",
			x: 13,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『ながらくの　ごあいこ――』");
				await s.narrate("はり紙のつづきは、\n日に焼けて　よめない。");
			},
		},
		{
			id: "famiresu_win2",
			x: 15,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("窓ごしに、レジだけが\nそのまま　のこっている。");
			},
		},
		{
			id: "famiresu_kanban",
			x: 12,
			y: 6,
			sprite: PROPS.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("たおれかけた看板。");
				await s.narrate("『ファミリーレストラン\n■■■■』……店名は、よめない。");
			},
		},

		// ── ファミレス前（歩道橋でしか来られない側） ──
		{
			id: "akikan",
			x: 10,
			y: 6,
			sprite: PROPS.crate,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("回収されない　ビールケース。\n中に、空きかんが三本。");
			},
		},
		{
			id: "densou_ban",
			x: 16,
			y: 6,
			sprite: PROPS.bigScreen,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("電光掲示板。『スピード\nおとせ』が、ながれている。");
					await s.narrate("……見ている車は、いない。");
					return;
				}
				await s.narrate("電光掲示板。『スピード\nおとせ』が、ながれている。");
			},
		},
		{
			id: "nobori",
			x: 19,
			y: 6,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("色あせた　のぼり。\n『うどん　はじめました』");
				await s.narrate("……はじまって、そして\nおわったらしい。");
			},
		},
		{
			id: "driveinn_sign",
			x: 6,
			y: 6,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『ドライブイン　みなみ\nこの先500m』");
				await s.say("kiriko", "……この店の　ことンゴ？");
			},
		},
		{
			id: "taiya_ato",
			x: 22,
			y: 6,
			sprite: base(0, 250),
			trigger: "talk",
			through: true,
			fixedDir: true,
			run: async (s) => {
				await s.narrate("アスファルトに、黒い\nタイヤのあと。");
			},
		},

		// ── 南の歩道ぞい ──
		{
			id: "guardrail",
			x: 12,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ガードレール。とそうが\nところどころ、はげている。");
				await s.narrate("大きな　へこみが、ひとつ。");
			},
		},
		{
			id: "busstop",
			x: 28,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"バスてい。さいしゅうは\n22時台。とっくに　おわった。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("バスてい。始発まで、\nあと　すこし。");
					return;
				}
				await s.narrate("バスてい。一時間に、二本。");
				await s.narrate("時こく表のガラスが、\n夕日で　オレンジ色だ。");
			},
		},
		{
			id: "vending_ev",
			x: 31,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("じはんき。国道の夜に、\nこの明かりだけが　ある。");
					return;
				}
				await s.narrate("じはんき。となりに、\nつぶれた台が　一台。");
			},
		},
		{
			id: "kiropost",
			x: 34,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("キロポスト。\n『東京まで　112km』");
				await s.say("kiriko", "……とおいのか、ちかいのか\nわからない数字ンゴ");
			},
		},
		{
			id: "sokkou",
			x: 5,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("草むらのおくに、側溝。\n水の音がしている。");
			},
		},
		{
			id: "lamp_w",
			x: 8,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("国道の街灯。オレンジ色に\nついている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("街灯。もう、きえている。");
					return;
				}
				await s.narrate("せの高い街灯。まだ、\nついていない。");
			},
		},

		// ── 夕方の人たち ──
		npc(
			"bus_obachan",
			26,
			11,
			OBACHAN,
			async (s) => {
				if (!s.flag("seen_bus_obachan")) {
					s.set("seen_bus_obachan");
					await s.say(null, "バスねえ。時こく表は\nあくまで　目安なのよ", {
						name: "バス待ちの人",
					});
					await s.say("kiriko", "そういうもの、ンゴ？");
					await s.say(null, "そういうものよ。だから\nあめ玉、なめて待つの", {
						name: "バス待ちの人",
					});
					return;
				}
				await s.say(null, "……まだ来ないわねえ", { name: "バス待ちの人" });
			},
			{ dir: "right", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"bukatsu_kid",
			23,
			11,
			STUDENT,
			async (s) => {
				await s.say(null, "部活のあとの　この道、\nながいんだよなー", {
					name: "部活帰りの子",
				});
				await s.say(null, "……はらへった", { name: "部活帰りの子" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"stretch_man",
			35,
			11,
			MAN,
			async (s) => {
				await s.narrate("ストレッチ中だ。\nかるく、会釈をされた。");
			},
			{ dir: "up", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち ──
		npc(
			"bus_asa",
			26,
			11,
			MAN,
			async (s) => {
				await s.say(null, "始発って、まにあうと\nちょっと　勝った気がするね", {
					name: "バス待ちの人",
				});
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"jog_asa",
			14,
			10,
			RUNNER,
			async (s) => {
				await s.narrate("ジョギングの人が、\n白い息で　走っていく。");
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
	],
};
