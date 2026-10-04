// コインランドリー　しゃぼん（すみれ町の裏の路地のつきあたり）。docs/content-briefs.md「日常レイヤー」・
// docs/style-everyday.md。12×10・室内（outdoor なし）・24時間・無人の店。
// BGM は時間帯の曲。深夜だけ自室と同じ「乾燥機がまわるあいだ」（amb_kansouki）——家の外で、
// 曲の名まえの場所に いちど来る。
//
// 四つの顔（flags.tod。2026-10-04）:
//   夕方 … 人が二人。台で　せんたくものを　たたむ学生（くつしたが　かたほう　ない）と、
//           2ばんの乾燥機を待つおじさん（会釈だけ。週刊誌をベンチに　おいていく）。
//   宵   … 人は出さない（必達）。せんたくきが一台まわっている（だれのかは言わない）・
//           2ばんは　からっぽ・ベンチに週刊誌がのこる・3ばんの　おくに　くつした。
//   深夜 … 人は出さない（必達）。蛍光灯ぜんぶ・乾燥機が一台だけ（4ばん）まわっている。
//           ベンチに　すわれる（seen_suwari_laundry。缶があれば kanLine）。自販機で温かい缶（kanShinya）。
//   朝   … 店のおばちゃん（そうじ）。夜の変化の行き先を、見た人にだけ。
//
// この店の中の筋（前振り → 回収。回収はどれも前振りのフラグを s.flag で確かめる）:
//   くつした   gakusei（yu。seen_kutsushita）→ kansouki_3（yoru・shinya。seen_kutsushita_mitsuke）
//              → ＞＞1 わすれものの箱へ（seen_kutsushita_hako）→ 朝: wasuremono「もう　ない」・
//              obachan「朝いちばんに　とりにきた」／箱に入れなかった人は keiji の朝の はり紙
//   2ばん      kansouki_2（yu。seen_laundry_kansou 数＝のこり分の段）→ ojisan「……お、おわった」→
//              宵: からっぽ
//   週刊誌     bench（yu・yoru。seen_laundry_zasshi）→ ojisan 2回目「よんでいいよ」→ 深夜すわると
//              占いのページ → 朝: bench「もう　ない」・obachan「まいしゅう　月曜に」
//   宵のせんたく sentakuki（yoru。seen_laundry_sentaku 数）→ 深夜: からっぽ・kansouki_4 がまわる
//              （seen_kansouki_shinya）→ 朝: 4ばんの糸くず「とりに　来たンゴね」
//   缶         jihanki（shinya。ここで買った人は seen_laundry_kan）→ 朝: その段に『うりきれ』
//   すわる     bench（shinya。seen_suwari_laundry）→ 朝: bench の朝日
// 町とのつながり: arrive_yoru は apart の宵のせんたくき（arrive_yoru の done）と音を重ねる。
//
// 座標: すみれ町 (27,2) の戸を上へふむ → ここ (5,8) に上向き。
//       出口 (5,9) を下へふむ（左右は虚空。上からしか ふめない）→ すみれ町 (27,3) に下向き。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { npc } from "../helpers";
import {
	arrived,
	asaClock,
	kanHeld,
	kanLine,
	kanLv,
	kanShinya,
	numFlag,
	shinyaClock,
	yoruAkubi,
	yoruClock,
	yuClock,
} from "../nostalgia";
import { home, JP, town } from "../tiles";

// ── タイル（home.png の壁・床と town.png の部品を重ねる。単色だけのタイルは作らない） ──
//   H h 壁（上段・下段）  . コンクリートの床  D 出口のマット
//   E  乾燥機（上の段。壁の下段にうめこみ）  K  乾燥機（下の段。床）  w  せんたくき
//   P  掲示（壁の下段）  C  かべの時計（壁の下段）  k  ランドリーかご  R  両替機  V  自販機（2マス）
//   [ = ]  たたみ台（カウンター。向こうの人に話しかけられる）  B b  ベンチ（左右）
//   g  観葉植物  f  わすれものの箱  u  ごみばこ
const C_WALL = "#dcd6c8";
const C_CONC = "#b4b2aa";
const WALL_TOP = home(1, 0);
const WALL_BOT = home(2, 0);
const FLOOR = home(5, 0);
const solid = (color: string, ...layers: string[]): TileDef => ({
	layers,
	color,
	passable: false,
});
const tiles: Record<string, TileDef> = {
	H: solid(C_WALL, WALL_TOP),
	h: solid(C_WALL, WALL_BOT),
	E: solid(C_WALL, WALL_BOT, JP.carWashTop),
	P: solid(C_WALL, WALL_BOT, home(1, 1)),
	C: solid(C_WALL, WALL_BOT, home(3, 1)),
	".": { layers: [FLOOR], color: C_CONC, passable: true },
	D: { layers: [home(7, 4)], color: "#5a5e64", passable: true },
	K: solid(C_CONC, FLOOR, JP.carWashTop),
	w: solid(C_CONC, FLOOR, JP.carWashBottom),
	k: solid(C_CONC, FLOOR, home(7, 6)),
	R: solid(C_CONC, FLOOR, JP.gatePillar),
	V: solid(C_CONC, FLOOR, JP.vending),
	"[": { ...solid(C_CONC, FLOOR, JP.counterL), counter: true },
	"=": { ...solid(C_CONC, FLOOR, JP.counterM), counter: true },
	"]": { ...solid(C_CONC, FLOOR, JP.counterR), counter: true },
	B: solid(C_CONC, FLOOR, town(4, 5)),
	b: solid(C_CONC, FLOOR, town(5, 5)),
	g: solid(C_CONC, FLOOR, home(4, 3)),
	f: solid(C_CONC, FLOOR, home(5, 3)),
	u: solid(C_CONC, FLOOR, home(6, 3)),
	" ": { layers: [], color: "#000", passable: false },
};

// 北の壁＝乾燥機の二段（1〜4ばん。下の段を調べる）・掲示・時計・両替機・自販機。
// 西の壁ぞい＝せんたくき三台。まんなか＝たたみ台。東＝ベンチ。南＝わすれものの箱・出口。
const rows = [
	"            ", // y0
	" HHHHHHHHHH ", // y1
	" EEEEhPhChh ", // y2  掲示 (6,2)・時計 (8,2)
	" KKKKk...RV ", // y3  乾燥機 1〜4ばん (1,3)-(4,3)・かご (5,3)・両替機 (9,3)・自販機 (10,3)
	" .......... ", // y4
	" w......... ", // y5  学生 (5,5)（夕方）
	" w..[=]..Bb ", // y6  せんたくき (1,6)・たたみ台 (4,6)-(6,6)・おじさん (8,6)（夕方）・ベンチ (9,6)(10,6)
	" w......... ", // y7  おばちゃん (7,7)（朝）
	" g.......fu ", // y8  着地 (5,8)・わすれものの箱 (9,8)
	"     D      ", // y9  出口 (5,9)
];

/** ベンチ（2マスとも同じ）。深夜だけ すわれる（座る作法は kawara fumiato の suwaru）。 */
const bench = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	const zasshi = !!s.flag("seen_laundry_zasshi");
	if (t === "asa") {
		// 週刊誌を見た人にだけ、ないこと（obachan が「まいしゅう　月曜に」で答える）
		await s.narrate(
			zasshi ? "ベンチの　週刊誌は、\nもう　ない。" : "ながい　ベンチ。",
		);
		if (s.flag("seen_suwari_laundry"))
			await s.narrate("ゆうべ　すわった　ところに、\n朝日が　さしている。");
		return;
	}
	if (t === "shinya") {
		if (s.flag("seen_suwari_laundry")) {
			if (kanHeld(s)) await kanLine(s);
			else await s.narrate("ベンチで、乾燥機の\n音を　すこし　きいた。");
			return;
		}
		await s.narrate("ながい　ベンチ。");
		const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
			cancel: 1,
		});
		if (i !== 0) return;
		s.set("seen_suwari_laundry");
		await s.narrate("ベンチに　すわって、\nまわる　ドラムを　見ていた。");
		await s.fadeOut(900, "#0a0c14");
		await s.wait(900);
		await s.fadeIn(900);
		// 夕方・宵の週刊誌（seen_laundry_zasshi）を見た人だけ、ひらく
		if (zasshi) await s.narrate("週刊誌の、うらないの\nページだけ　よんだ。");
		if (kanHeld(s)) await kanLine(s);
		else await s.narrate("足もとに、乾燥機の\nあたたかい　風。");
		await s.say("kiriko", "……ぬくいンゴ。\nもうすこし　あるくンゴ");
		return;
	}
	// 夕方・宵: おじさんの週刊誌（ふせたまま。宵も　のこっている）
	s.set("seen_laundry_zasshi");
	await s.narrate(
		t === "yoru"
			? "ベンチに、週刊誌が\nふせたまま　のこっている。"
			: "ベンチに、週刊誌が\nふせてある。",
	);
};

export const laundry: MapDef = {
	id: "laundry",
	name: "コインランドリー　しゃぼん",
	bgm: "@tod", // 時間帯の曲（data/index.ts の todBgm）
	// 深夜は自室・アパートと同じ「乾燥機がまわるあいだ」（ここが その曲の場所）
	todBgm: { shinya: "amb_kansouki" },
	outside: "#14120e",
	tiles,
	rows,
	// 24時間の店なので、灯りはどの時間帯も（ジオラマ表示の差し色の源）
	lights: [
		{ x: 3, y: 5, r: 3, color: "#e8f0ff" }, // 蛍光灯（西）
		{ x: 8, y: 5, r: 3, color: "#e8f0ff" }, // 蛍光灯（東）
		{ x: 10, y: 3, r: 1.5, color: "#eef4ff" }, // 自販機
	],
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
				await s.wait(400);
				await s.narrate("乾燥機の　まわる音。\nやわらかい　においがする。");
			},
		},
		{
			// 人は出さない。アパートの宵のせんたくき（apart arrive_yoru）を聞いた人には、音を重ねる
			id: "arrive_yoru",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(400);
				await s.narrate(
					"あかるい。だれも　いない。\nせんたくきが　ひとつ　まわっている。",
				);
				if (arrived(s, "apart", "yoru"))
					await s.say("kiriko", "（……アパートの　廊下と、\nおなじ　音ンゴ）");
				await yoruAkubi(s);
			},
		},
		{
			// 人も声も出さない。4ばん（kansouki_4）だけが　まわっている
			id: "arrive_shinya",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(600);
				await s.narrate("蛍光灯が、ぜんぶ\nついている。");
				await s.narrate("乾燥機が　一台だけ、\nまわっている。");
			},
		},
		{
			id: "arrive_asa",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				await s.wait(400);
				await s.narrate("朝の光と、蛍光灯が\nまざっている。");
			},
		},

		// ── 出口（下へふむ。すみれ町の戸のすぐ下に、下向き） ──
		{
			id: "deguchi",
			x: 5,
			y: 9,
			trigger: "touch",
			exit: "down",
			through: true,
			run: async (s) => {
				await s.warp("sumire", 27, 3, "down", { se: "door" });
			},
		},

		// ── 人たち（夕方の二人・朝のおばちゃん。宵・深夜は出さない） ──
		npc(
			"gakusei",
			5,
			5,
			"pub:sprites/mob_student.png",
			async (s) => {
				// 3段（数）: かたほう ない → くだらない話 → あしたの朝。くつしたは 3ばんの　おく（kansouki_3）
				const n = numFlag(s, "seen_laundry_gakusei");
				if (n < 2) s.set("seen_laundry_gakusei", n + 1);
				if (n === 0) {
					s.set("seen_kutsushita");
					await s.say(null, "……くつした、\nかたほう　ない", { name: "学生" });
					await s.say("kiriko", "（よく　あるンゴ）");
					return;
				}
				if (n === 1) {
					await s.say(
						null,
						"かたほうずつ　ちがうの、\nおしゃれって　ことに　しよ",
						{ name: "学生" },
					);
					await s.say("kiriko", "……それは、ゆうきンゴ");
					return;
				}
				await s.say(null, "あしたの朝、\nもういっかい　さがしにくる", {
					name: "学生",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"ojisan",
			8,
			6,
			"pub:sprites/mob_man.png",
			async (s) => {
				// 会釈しか返さない人。2ばん（kansouki_2）がとまったあとだけ、ひとこと。
				// 2回目は ベンチの週刊誌（seen_laundry_zasshi）を見た人に「よんでいいよ」
				const n = numFlag(s, "seen_laundry_ojisan");
				if (n < 2) s.set("seen_laundry_ojisan", n + 1);
				if (numFlag(s, "seen_laundry_kansou") >= 2) {
					await s.say(null, "……お、おわった", { name: "おじさん" });
					await s.say("kiriko", "（……でも、\n立たないンゴ）");
					return;
				}
				if (n === 1 && s.flag("seen_laundry_zasshi")) {
					await s.say(null, "それ、よんでいいよ。\nもう　よんだ", {
						name: "おじさん",
					});
					return;
				}
				await s.narrate("おじさんは、ちょっと\n会釈した。");
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"obachan",
			7,
			7,
			"pub:sprites/mob_obachan.png",
			async (s) => {
				// 朝のそうじ。1回目＝週刊誌（seen_laundry_zasshi）、2回目＝くつした（seen_kutsushita_hako）
				const n = numFlag(s, "seen_laundry_obachan");
				if (n < 2) s.set("seen_laundry_obachan", n + 1);
				if (n === 0) {
					await s.say(null, "おはよう。……あら、\nはやいのね", {
						name: "店のおばちゃん",
					});
					if (s.flag("seen_laundry_zasshi")) {
						await s.say(
							null,
							"ベンチの　週刊誌ね、\nまいしゅう　月曜に　おいてくの",
							{ name: "店のおばちゃん" },
						);
						await s.say("kiriko", "（……あの　おじさんンゴ）");
					}
					return;
				}
				if (n === 1 && s.flag("seen_kutsushita_hako")) {
					await s.say(
						null,
						"わすれものの　くつした、\n朝いちばんに　とりにきたよ",
						{
							name: "店のおばちゃん",
						},
					);
					await s.say("kiriko", "（……ほんとに　来たンゴ）");
					return;
				}
				await s.say(null, "フィルター、ほら。\n糸くずが　こんなに", {
					name: "店のおばちゃん",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),

		// ── 乾燥機（北の壁。下の段の 2〜4ばん） ──
		{
			// 夕方: おじさんの2ばん。調べるたびに のこりがへる（seen_laundry_kansou 数）→ とまる →
			// ojisan「……お、おわった」。宵は からっぽ（夕方に のこりを見た人だけ「ドアが　あけてある」）
			id: "kansouki_2",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					const n = numFlag(s, "seen_laundry_kansou");
					if (n < 3) s.set("seen_laundry_kansou", n + 1);
					if (n === 0) {
						await s.narrate("2ばんの　乾燥機。\n『のこり　12分』");
						return;
					}
					if (n === 1) {
						await s.narrate("『のこり　4分』");
						return;
					}
					if (n === 2) {
						await s.narrate("ピー、と　鳴って、\nドラムが　とまった。");
						return;
					}
					await s.narrate("2ばんは、とまったままだ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						s.flag("seen_laundry_kansou")
							? "2ばんは　からっぽ。\nドアが　あけてある。"
							: "2ばんは、とまっている。",
					);
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						"2ばんの　ガラスに、\n吾輩の　顔が　まるく　うつる。",
					);
					return;
				}
				await s.narrate("朝の光で、ガラスが\n白く　ひかっている。");
			},
		},
		{
			// くつしたの段。夕方は「おくは　くらくて　見えない」（前振り）。人のいない宵・深夜に
			// 見つかる（seen_kutsushita_mitsuke）→ わすれものの箱へ（seen_kutsushita_hako）。
			// 箱に入れなかった人の朝は からっぽ（keiji の はり紙が答え）
			id: "kansouki_3",
			x: 3,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					await s.narrate("3ばん。ドアが\nあけっぱなしだ。");
					await s.narrate("ドラムの　おくは、\nくらくて　見えない。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_kutsushita_mitsuke")
							? "3ばんは、からっぽだ。"
							: "3ばん。ドアが\nはんぶん　あいている。",
					);
					return;
				}
				if (s.flag("seen_kutsushita_hako")) {
					await s.narrate("3ばんは、からっぽだ。");
					return;
				}
				const mitsuke = !!s.flag("seen_kutsushita_mitsuke");
				s.set("seen_kutsushita_mitsuke");
				await s.narrate(
					mitsuke
						? "くつしたは、まだ\nドラムの　おくに　ある。"
						: "3ばん。ドラムの　おくに、\nくつしたが　かたほう。",
				);
				// 夕方に学生の「かたほう　ない」（gakusei）を聞いた人だけ、はじめの一度
				if (!mitsuke && s.flag("seen_kutsushita"))
					await s.say("kiriko", "（……あの子の　かたほうンゴ）");
				const i = await s.choose(
					["＞＞1 わすれものの箱へ", "＞＞2 そのままにする"],
					{
						cancel: 1,
					},
				);
				if (i !== 0) return;
				s.set("seen_kutsushita_hako");
				await s.narrate("くつしたを、わすれものの\n箱に　入れた。");
			},
		},
		{
			// 宵のせんたく（sentakuki・seen_laundry_sentaku）の行き先。深夜は4ばんだけ　まわっている
			// （seen_kansouki_shinya）→ 朝: 糸くず一つ。深夜に見ていない人の朝は「とまっている」
			id: "kansouki_4",
			x: 4,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					if (s.flag("seen_kansouki_shinya")) {
						await s.narrate("ドラムの　なかで、タオルが\nおちては　あがる。");
						return;
					}
					s.set("seen_kansouki_shinya");
					await s.narrate("4ばんだけ、まわっている。\n『のこり　18分』");
					if (numFlag(s, "seen_laundry_sentaku") >= 1)
						await s.say("kiriko", "（……宵の　せんたくきの\nぶんンゴ？）");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_kansouki_shinya")) {
						await s.narrate("4ばんは　からっぽ。\nドアに、糸くずが　ひとつ。");
						await s.say("kiriko", "（……ちゃんと、\nとりに　来たンゴね）");
						return;
					}
					await s.narrate("4ばん。とまっている。");
					return;
				}
				await s.narrate("4ばん。とまっている。");
			},
		},

		// ── せんたくき（西の壁ぞい） ──
		{
			// 宵の段（数）: まわっている → のこり2分 → とまる。人は来ない（だれのかは言わない）。
			// 深夜は　からっぽ（中身は4ばんへ。kansouki_4 が受ける）
			id: "sentakuki",
			x: 1,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					const n = numFlag(s, "seen_laundry_sentaku");
					if (n < 3) s.set("seen_laundry_sentaku", n + 1);
					if (n === 0) {
						await s.narrate("せんたくきが　まわっている。\n『のこり　9分』");
						return;
					}
					if (n === 1) {
						await s.narrate("『のこり　2分』");
						return;
					}
					await s.narrate("ピー、と　鳴って、\nとまった。");
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						numFlag(s, "seen_laundry_sentaku") >= 1
							? "せんたくきは　からっぽ。\nふたに、水てきが　のこっている。"
							: "せんたくきは、\nぜんぶ　とまっている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("せんたくきの　ふたが、\nぜんぶ　あけてある。");
					return;
				}
				await s.narrate("せんたくき。\n『つかえます』の　ランプ。");
			},
		},

		// ── ベンチ（2マス。深夜だけ すわれる） ──
		{ id: "bench_9", x: 9, y: 6, trigger: "talk", run: bench },
		{ id: "bench_10", x: 10, y: 6, trigger: "talk", run: bench },

		// ── 北の壁の小物（自販機・両替機・掲示・時計） ──
		{
			// 初秋の『あったか～い』は一列だけ。深夜は温かい缶（kanShinya）。ここで買った人
			// （seen_laundry_kan）の朝は、その段に『うりきれ』
			id: "jihanki",
			x: 10,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (s.flag("seen_laundry_kan")) {
						await s.narrate(
							"『あったか～い』の　ひとつに、\n赤い　『うりきれ』。",
						);
						await s.say("kiriko", "（……ゆうべの、\nさいごの　一本ンゴ）");
						return;
					}
					await s.narrate("自販機。『あったか～い』が\n一列だけ　ある。");
					return;
				}
				if (t === "shinya") {
					s.se("hum", { volume: 0.6 });
					await s.narrate("自販機の　うなり。\n『あったか～い』が　一列だけ。");
					const mae = kanLv(s);
					await kanShinya(s);
					if (mae === 0 && kanLv(s) >= 1) s.set("seen_laundry_kan");
					return;
				}
				await s.narrate("自販機。『あったか～い』が\n一列だけ　ある。");
				if (t === "yu") await s.narrate("まだ、だれも　買っていない。");
			},
		},
		{
			id: "ryougae",
			x: 9,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("両替機。『千円札　のみ』");
				if (s.flag("tod") === "shinya")
					await s.narrate("みどりの　ランプだけ、\nついている。");
			},
		},
		{
			// 掲示。2回目で下の紙（seen_laundry_keiji）。朝、くつしたを見つけて箱に入れなかった人
			// （seen_kutsushita_mitsuke で seen_kutsushita_hako の無い人）には、おばちゃんの はり紙
			id: "keiji",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				if (
					s.flag("tod") === "asa" &&
					s.flag("seen_kutsushita_mitsuke") &&
					!s.flag("seen_kutsushita_hako")
				) {
					await s.narrate(
						"あたらしい　はり紙。\n『3ばんに　くつした　かたほう』",
					);
					await s.say("kiriko", "（……とりに　来ると\nいいンゴね）");
					return;
				}
				if (!s.flag("seen_laundry_keiji")) {
					s.set("seen_laundry_keiji");
					await s.narrate(
						"『乾燥機の　なかの　ものは\nすぐに　おとりください』",
					);
					return;
				}
				await s.narrate("下に、もう一まい。\n『わすれものは　一週間』");
			},
		},
		{
			// かべの時計（24時間の店の時計は、町の時計と同じに進む）
			id: "tokei",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const ji =
					t === "yoru"
						? yoruClock(s)
						: t === "shinya"
							? shinyaClock(s)
							: t === "asa"
								? asaClock(s)
								: yuClock(s);
				await s.narrate(`かべの時計。――${ji}。`);
			},
		},

		// ── わすれものの箱（南） ──
		{
			// くつしたの段の受け（kansouki_3 の ＞＞1 で seen_kutsushita_hako）
			id: "wasuremono",
			x: 9,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const hako = !!s.flag("seen_kutsushita_hako");
				await s.narrate("『わすれもの』の　箱。");
				if (t === "asa") {
					if (hako) {
						await s.narrate(
							"くつしたは、もう　ない。\nハンカチは、まだ　ある。",
						);
						await s.say("kiriko", "（……かたほう、\nそろったンゴね）");
						return;
					}
					await s.narrate("ハンカチが　一まい。");
					return;
				}
				await s.narrate(
					hako
						? "ハンカチの　となりに、\nあの　くつした。"
						: "ハンカチが　一まい。",
				);
			},
		},
	],
};
