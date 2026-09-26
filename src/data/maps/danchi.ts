// すみれ台団地。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 32×14・outdoor・BGM null。二棟の団地と中庭。窓明かりの「数」が主役のマップ
// （夕方はたくさん・深夜はゼロ＝不在の記号。docs/night-fx.md §2）。
//
// 時間帯の顔:
//   夕方 … 窓明かり・干しぶとん・買い物帰り・なわとびの子
//   深夜 … NPC 0体必達。脇道の怪異はここの担当2つ:
//           kyusuito（給水塔の水音）／shuukaijo（集会所の張り紙が一枚多い）
//   朝   … ゴミ出しの列・ラジオ体そう・ふとんをたたく音
//
// 座標凍結v3: 東 (31,12)→sumire(1,12)・sumire からの着地 (30,12)／
// 北 (16,0)→kokudo(20,10)・kokudo からの着地 (16,1)。
//
// 経路: 棟のあいだの道(x16)と中庭で小さなループ。寄り道＝駐輪場・集会所・給水塔。

import type { MapDef, TileDef } from "../../engine/defs";
import { npc, warp } from "../helpers";
import { base, basePx, field, PROPS, TOWN } from "../tiles";

// ── タイル ──
//   o  しまった戸（白壁）  j  集会所の戸  c  下段の窓  s  すなば
const WIN_LOW_WHITE = basePx(48, 1382);
const tiles: Record<string, TileDef> = {
	...TOWN,
	o: {
		layers: [base(1, 60), base(7, 77, 1, 2)],
		color: "#e8e8e8",
		passable: false,
	},
	j: {
		layers: [base(1, 56), base(7, 55, 1, 2)],
		color: "#6a4a2a",
		passable: false,
	},
	c: {
		layers: [base(1, 60), WIN_LOW_WHITE],
		color: "#e8e8e8",
		passable: false,
	},
	s: { layers: [field(7, 2)], color: "#e8cc90", passable: true },
};

// A棟（西）・B棟（東）。あいだの道 x16 が kokudo へ。集会所は南東。
const rows = [
	"                :               ", // y0  kokudo への出口 (16,0)
	"  AAAAAAAAAAA   :   AAAAAAAAAAA ", // y1  kokudo からの着地 (16,1)
	"  (w(w(w(w(w(   :   (w(w(w(w(w( ", // y2  A棟・B棟（上のかい）
	"  (w(w(w(w(w(   :   (w(w(w(w(w( ", // y3
	"  )c)o)c)c)o)   :   )c)o)c)c)o) ", // y4  入口 (5,4)(11,4)(23,4)(29,4)・郵便受け (4,4)
	" .............,,:,............. ", // y5  棟の前の通路
	" ,,,,,,,,,,,,,,L:,xx,,,,zzzzz,, ", // y6  駐輪場 (18,6)(19,6)・集会所の屋根
	" ,,,,,,,ss,,,,,,:,,,,,,,ZZZZZ,, ", // y7  給水塔 (3,7)・すなば・てつぼう (11,7)
	" ,,,,,Bbss,,,,,,:,,,,,,,]Kkj],, ", // y8  ベンチ (6,8)・集会所の掲示 (25,8)(26,8)
	" ,,,*&,,,,,,,,,,:L,,,,,,,,,,,,, ", // y9  花だん
	" ,,,,,,,,,,,,,,,:,,,,,,,,,,,,,, ", // y10 ごみ置き場 (13,10)・案内図 (14,10)
	" ,,,,,,,,,,,,,V,:,,,,,,,,,,,,,, ", // y11 自販機 (14,11)
	",:::::::::::::::::::::::::::::::", // y12 東西の道。sumire への出口 (31,12)・着地 (30,12)
	" ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, ", // y13
];

// ── モブの歩行グラ ──
const WIFE = "pub:assets/rpgen/char/09-woman-a.png";
const KID = "pub:assets/rpgen/char/04-child.png";
const KANRININ = "pub:assets/rpgen/char/10-elderly-c.png";
const GRANDPA = "pub:assets/rpgen/char/03-elderly-a.png";
const MAN = "pub:assets/rpgen/char/16-man-b.png";

export const danchi: MapDef = {
	id: "danchi",
	name: "すみれ台団地",
	bgm: null,
	outdoor: true,
	outside: "#0c0b0d",
	tiles,
	rows,
	// 窓明かりは夕方の主役（数で見せる）。深夜は街灯と自販機だけ＝不在の記号。
	lights: [
		{ x: 3, y: 4, r: 2, only: "yu,yoru" },
		{ x: 7, y: 4, r: 2, only: "yu,yoru" },
		{ x: 9, y: 4, r: 2, only: "yu,yoru" },
		{ x: 21, y: 4, r: 2, only: "yu,yoru" },
		{ x: 25, y: 4, r: 2, only: "yu,yoru" },
		{ x: 27, y: 4, r: 2, only: "yu,yoru" },
		{ x: 4, y: 2, r: 2, only: "yu,yoru" },
		{ x: 10, y: 3, r: 2, only: "yu,yoru" },
		{ x: 22, y: 2, r: 2, only: "yu,yoru" },
		{ x: 28, y: 3, r: 2, only: "yu,yoru" },
		{ x: 15, y: 6, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 17, y: 9, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 14, y: 11, r: 1.5, color: "#eef4ff", only: "yoru,shinya" },
	],
	onEnter: async (s) => {
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { volume: 0.8 });
		else if (t === "asa") s.se("suzume", { volume: 0.8 });
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
				await s.narrate("窓のあかりが、\nひとつ、またひとつ。");
				await s.narrate("どの窓にも、晩ごはんの\n時間が来ている。");
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
				await s.narrate("窓のあかりが、\nひとつも　ない。");
				await s.narrate("棟のあいだを、風が\nとおりぬけていく。");
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
				s.se("suzume", { pan: -0.3, volume: 0.8 });
				await s.wait(500);
				await s.narrate("ぱん、ぱん、と\nふとんをたたく音。");
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_kokudo", 16, 0, { map: "kokudo", x: 20, y: 10, dir: "up" }),
		warp("to_sumire", 31, 12, { map: "sumire", x: 1, y: 12, dir: "right" }),

		// ── 給水塔（深夜の水音が kyusuito の担当） ──
		{
			id: "kyusuito_ev",
			x: 3,
			y: 7,
			sprite: base(2, 129, 1, 3),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("給水塔。");
					await s.wait(600);
					s.se("train", { pan: 0.3, volume: 0.2 });
					await s.narrate("……上のほうで、水の\nうごく音がしている。");
					await s.narrate("どの窓も、くらいままだ。");
					await s.note("kyusuito");
					return;
				}
				if (t === "asa") {
					await s.narrate("給水塔のタンクに、\nあさの空が　うつっている。");
					return;
				}
				await s.narrate(
					"給水塔。夕日をせおって、\nまっくろな　かげになっている。",
				);
			},
		},

		// ── 集会所（深夜の張り紙が shuukaijo の担当） ──
		{
			id: "shuukaijo_ev",
			x: 25,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("集会所の掲示。");
					await s.wait(600);
					await s.narrate("……はり紙が、四枚ある。");
					await s.narrate("ふえた一枚は、くらくて\nよめない。");
					await s.note("shuukaijo");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"集会所の掲示。はり紙は\n三枚。はしが　めくれている。",
					);
					return;
				}
				await s.narrate("集会所の掲示。『秋まつり\nうちあわせ』『体そうの会』");
				await s.narrate("『こども将棋　ふっかつ』。\nはり紙は、三枚だ。");
			},
		},
		{
			id: "shuukaijo_k",
			x: 26,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"画びょうの　あとだらけだ。\nずいぶん　はられてきたらしい。",
				);
			},
		},
		{
			id: "shuukaijo_door",
			x: 27,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					await s.narrate("集会所の戸。中から、\nお茶わんの音がする。");
					return;
				}
				await s.narrate("集会所の戸は、\nしまっている。");
			},
		},

		// ── A棟・B棟 ──
		{
			id: "a_plate",
			x: 2,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『すみれ台団地　A棟』の\n表示板。");
			},
		},
		{
			id: "postbox_row",
			x: 4,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						"ぎんいろの郵便受けの列。\n朝刊が、ならんで　ささっている。",
					);
					return;
				}
				await s.narrate("ぎんいろの郵便受けの列。\nチラシが、はみ出している。");
			},
		},
		{
			id: "a_stairs",
			x: 5,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("A棟の階段。電灯が、\n各階に　ひとつずつ。");
					return;
				}
				await s.narrate("A棟の階段。だれかの\n足音が、上でひびいている。");
			},
		},
		{
			id: "a_win",
			x: 7,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("一階の窓。カーテンの\nすきまも、くらい。");
					return;
				}
				if (t === "asa") {
					await s.narrate("一階の窓。みそしるの\nにおいがする。");
					return;
				}
				await s.narrate("一階の窓。カレーの\nにおいが　もれている。");
			},
		},
		{
			id: "b_win",
			x: 21,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("B棟の一階。\nしずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("めざましの音。……まだ\n止められていない。");
					return;
				}
				await s.narrate("B棟の一階。テレビの\n野球中けいの声。");
			},
		},
		{
			id: "b_futon",
			x: 27,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ベランダに、ふとんが\n出しっぱなしの家が一けん。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ベランダに、あたらしい\nふとんが　ならびはじめた。");
					return;
				}
				await s.narrate("二階のベランダに、\nふとんが　ほしてある。");
				await s.say("kiriko", "……とりこみ、\nわすれてるンゴ？");
			},
		},
		{
			id: "b_stairs",
			x: 29,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("B棟の階段。かべに、\n三輪車が　とめてある。");
			},
		},

		// ── 中庭 ──
		{
			id: "sandbox",
			x: 8,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("すなば。スコップが\nささったままだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("すなばに、けさの\n足あとが　もうある。");
					return;
				}
				await s.narrate("すなば。バケツの城が、\nひとつ　できている。");
			},
		},
		{
			id: "tetsubo",
			x: 11,
			y: 7,
			sprite: base(5, 32),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("てつぼう。にぎると\nひんやりする。");
				await s.say("kiriko", "……さか上がりは、\nくろれきしンゴ");
			},
		},
		{
			id: "bench_ev",
			x: 6,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("ベンチに、ラジオが\nおいてある。体そうの前だ。");
					return;
				}
				await s.narrate(
					"中庭のベンチ。せもたれの\nペンキが、すこし　はげてる。",
				);
			},
		},
		{
			id: "kadan",
			x: 4,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("花だん。『みどりの会』の\n札が　立っている。");
			},
		},
		{
			id: "chuurinjo",
			x: 18,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("駐輪場。自転車が\nどんどん　出ていく時間だ。");
					return;
				}
				await s.narrate("駐輪場。かごに夕刊が\n入ったままのが、一台。");
			},
		},
		{
			id: "gomi",
			x: 13,
			y: 10,
			sprite: base(7, 125),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						"ごみ置き場に、ふくろの列。\nカラスは、まだ来ていない。",
					);
					return;
				}
				await s.narrate("ごみ置き場。ネットが\nきちんと　たたんである。");
			},
		},
		{
			id: "annaizu",
			x: 14,
			y: 10,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("団地の案内図。");
				await s.narrate("『げんざい地』のシールが、\nはがれかけている。");
			},
		},
		{
			id: "vending_ev",
			x: 14,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("じはんき。この明かりだけが\nついている。");
					return;
				}
				await s.narrate("じはんき。おしるこの\nボタンが、もう　ある。");
			},
		},

		// ── 夕方の人たち ──
		npc(
			"kaimono_yu",
			18,
			10,
			WIFE,
			async (s) => {
				await s.say(null, "スーパーみなみの帰りなの。\nたまご、安かったわよ", {
					name: "買いものの人",
				});
				await s.say("kiriko", "（みんな　たまごの\n話をしてるンゴ……）");
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"nawatobi_kid",
			10,
			9,
			KID,
			async (s) => {
				if (!s.flag("seen_nawatobi")) {
					s.set("seen_nawatobi");
					await s.say(null, "二じゅうとび、きょうこそ\n十回いくから。見てて", {
						name: "なわとびの子",
					});
					await s.narrate("……三回で　ひっかかった。");
					await s.say(null, "いまのは　じゅんび", { name: "なわとびの子" });
					return;
				}
				await s.say(null, "……六回まで　いった。\nきろく　こうしん中", {
					name: "なわとびの子",
				});
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"kanrinin",
			7,
			5,
			KANRININ,
			async (s) => {
				await s.say(null, "ほうきはね、音のしない\nそうじ機なんだよ", {
					name: "管理人さん",
				});
				await s.say("kiriko", "……名言っぽいンゴ");
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち ──
		npc(
			"gomi_asa",
			12,
			10,
			WIFE,
			async (s) => {
				await s.say(null, "もえるごみ、きょうよね？\n……よね？", {
					name: "ごみ出しの人",
				});
				await s.say("kiriko", "た、たぶん、ンゴ");
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"taiso_jichan",
			8,
			9,
			GRANDPA,
			async (s) => {
				await s.say(null, "ラジオ体そう、いまから\nはじまるよ。やってくかい", {
					name: "じいちゃん",
				});
				await s.say("kiriko", "え、えんりょして\nおくンゴ……");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"eshaku_asa",
			17,
			10,
			MAN,
			async (s) => {
				await s.narrate("いそぎ足のまま、\n会釈をされた。");
			},
			{ dir: "up", when: (st) => st.flags.tod === "asa" },
		),
	],
};
