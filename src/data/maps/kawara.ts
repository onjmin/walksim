// かわらのみち（川沿いの土手道）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 40×16・outdoor・BGM null。土手の上の道(y8)と水ぎわの道(y11)の二段構え＋神社の高台。
//
// 時間帯の顔:
//   夕方 … 川面のきらめき・釣りじいちゃん・ヒグラシ・川しもの鉄橋を電車がわたる
//   深夜 … NPC 0体必達。音だけの川。脇道の怪異はここの担当2つ:
//           modoribashi（渡り切る直前の気配。ふりむいても誰もいない・わたりきれば何もない）
//           komainu は朝の担当（夕方に狛犬を調べたフラグがある人だけ、朝に差分の一言）
//   朝   … きらめきがもどる・ランニングの人の payoff
//
// 座標凍結v3: 北 (5,1)→sumire(5,22)・sumire からの着地 (5,2)／
// 東 (38,8)→street(20,19)・street からの着地 (37,8)。
//
// 経路: 一本道にしない（土手道⇄石段の神社⇄水ぎわ⇄戻り橋の対岸）。
// 対岸は行き止まりだが「見るもの」を置く（花火のもえかす・川ごしの町）。

import type { GameState, MapDef, Story, TileDef } from "../../engine/defs";
import type { Dir } from "../../engine/types";
import { npc, warp } from "../helpers";
import { base, FIELD, PROPS, TOWN } from "../tiles";

// ── タイル ──
// FIELD をベースに、神社の高台（TOWN の石畳）と社・石段を足す。
//   i  田（通れない・counter）   b  ススキ（茂みで代用）   G  石どうろう
//   z Z わら屋根（社）   [ ]  板壁   j  社の戸（しまっている）
//   .  水ぎわ・高台の石畳   =  石段   #  橋   ~  川
const PAVE = base(5, 48);
const tiles: Record<string, TileDef> = {
	...FIELD,
	i: {
		layers: [FIELD["."].layers[0], base(0, 11)],
		color: "#7a9a3a",
		passable: false,
		counter: true,
	},
	".": { layers: [PAVE], color: "#8c8c90", passable: true },
	G: {
		layers: [PAVE, PROPS.stoneLantern],
		color: "#8c8c90",
		passable: false,
	},
	z: TOWN.z,
	Z: TOWN.Z,
	"[": TOWN["["],
	"]": TOWN["]"],
	j: {
		layers: [base(1, 56), base(7, 55, 1, 2)],
		color: "#6a4a2a",
		passable: false,
	},
	"=": { layers: [base(6, 51)], color: "#8a8a8a", passable: true },
	L: {
		layers: [FIELD["."].layers[0], "sp:2gTYec"],
		color: "#6fae3a",
		passable: false,
	},
};

const rows = [
	"                                        ", // y0
	"     :                                  ", // y1  sumire への出口 (5,1)
	"     :                        zzz       ", // y2  sumire からの着地 (5,2)・社の屋根
	"     :                        ZZZ       ", // y3
	"     :                      ..[j[...    ", // y4  狛犬 (29,4)(33,4)・社の戸 (31,4)
	"     :                      ........    ", // y5  さいせん箱 (30,5)・絵馬かけ (34,5)
	"iiii,:,,,,,,,,,,,,,,,,,,,,,,.G...G..    ", // y6  田んぼ・石どうろう
	"iiii,:,,L,,,,,,,,,,,,,,,L,,,,,,=,,,,,,, ", // y7  街灯・石段 (31,7)
	",,::::::::::::::::::::::::::::::::::::: ", // y8  土手の道。street への出口 (38,8)・着地 (37,8)
	",,,,,,,,,,,,=,,b,,b,,,b,,,,b,,,,,,,,,,, ", // y9  土手の斜面とススキ・ハーモニカの子 (25,9)
	",,,,,,,,,,,,=,b,,,,,,,,,,b,,,,,,,b,,,,, ", // y10 石段 (12,9-10)・つりの人 (9,10)・バケツ (8,10)
	",,,,,,..........................,,,,,,, ", // y11 水ぎわの道・石碑 (19,10)・橋のたもと (20,11)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y12 川と戻り橋 (x20)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y13
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y14 わたりきる直前 (20,14)
	"                 ,b,,,b,                ", // y15 対岸（行き止まり）。花火のあと (21,15)
];

// ── モブの歩行グラ ──
const GRANDPA = "pub:assets/rpgen/char/03-elderly-a.png";
const RUNNER = "pub:assets/rpgen/char/11-woman-b.png";
const KID = "pub:assets/rpgen/char/04-child.png";

/** 向きの逆算（戻り橋の「ふりむく」「一歩もどる」に使う）。 */
const BACK: Record<Dir, "u" | "d" | "l" | "r"> = {
	up: "d",
	down: "u",
	left: "r",
	right: "l",
};
const FORWARD: Record<Dir, "u" | "d" | "l" | "r"> = {
	up: "u",
	down: "d",
	left: "l",
	right: "r",
};
const OPPOSITE: Record<Dir, Dir> = {
	up: "down",
	down: "up",
	left: "right",
	right: "left",
};

/** 狛犬の一言（夕方に見たフラグがある人だけ、朝に差分が出る）。 */
const komainu = async (s: Story, which: "a" | "b"): Promise<void> => {
	const t = s.flag("tod");
	if (t === "yu") {
		s.set("seen_komainu_yu");
		if (which === "a") {
			await s.narrate("こまいぬ。口を　あけている\nほうだ。");
			await s.narrate("……ちょっと、わらっている\nようにも　見える。");
			return;
		}
		await s.narrate("こまいぬ。口を　とじている\nほうだ。");
		await s.narrate("あごの下に、くもの巣。");
		return;
	}
	if (t === "asa") {
		if (s.flag("seen_komainu_yu")) {
			await s.narrate("こまいぬ。……あれ。");
			await s.wait(500);
			await s.narrate("きのうは、参道のほうを\nむいていた気がする。");
			await s.note("komainu");
			return;
		}
		await s.narrate("こまいぬ。あさの光で、\n石のはだが　しろい。");
		return;
	}
	// 深夜はただの石（違和感は担当分だけに絞る。朝の差分をほのめかさない）
	await s.narrate("こまいぬ。くらくて、\nかおが　見えない。");
};

export const kawara: MapDef = {
	id: "kawara",
	name: "かわらのみち",
	bgm: null,
	outdoor: true,
	outside: "#0b0c09",
	tiles,
	rows,
	// 光源は土手の街灯2本だけ（川沿いはくらいのが正しい。docs/night-fx.md §2）
	lights: [
		{ x: 8, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 24, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
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
				await s.narrate("川のにおいがする。");
				await s.narrate("水面が、夕日で\nちかちかしている。");
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
				await s.narrate("くらくて、川は\n見えない。");
				await s.narrate("音だけが、ずっと\nながれている。");
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
				s.se("suzume", { pan: 0.3, volume: 0.8 });
				await s.wait(600);
				await s.narrate("川が、あさの光を\nはねかえしている。");
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_sumire", 5, 1, { map: "sumire", x: 5, y: 22, dir: "up" }),
		warp("to_street", 38, 8, { map: "street", x: 20, y: 19, dir: "left" }),

		// ── 川しもの鉄橋（夕方に一度・定時音を正常の側に置く） ──
		...([34, 35] as const).map((x, i) => ({
			id: `tekkyo_belt_${i}`,
			x,
			y: 8,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => st.flags.tod === "yu" && !st.flags.seen_tekkyo,
			run: async (s: Story) => {
				s.set("seen_tekkyo");
				s.se("densha_far", { pan: 0.6, volume: 0.6 });
				await s.narrate("川しもの鉄橋を、電車が\nわたっていく音。");
			},
		})),

		// ── 戻り橋（深夜・渡り切る直前に一度だけ。どちらを選んでも死なない） ──
		{
			id: "modoribashi_ev",
			x: 20,
			y: 14,
			trigger: "touch",
			through: true,
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(400);
				await s.narrate("――うしろで、じゃり、と\n音がした。");
				const dir = s.state.dir;
				const i = await s.choose(["＞＞1 ふりむく", "＞＞2 わたりきる"]);
				if (i === 0) {
					s.face("player", OPPOSITE[dir] ?? "up");
					await s.wait(900);
					await s.narrate("……だれも、いない。");
					await s.move("player", BACK[dir] ?? "u");
					await s.narrate("いつのまにか、一歩\nもどっていた。");
				} else {
					await s.move("player", FORWARD[dir] ?? "d");
					await s.narrate("……わたりきった。");
					await s.wait(700);
					await s.narrate("なにも、おきない。");
				}
				await s.note("modoribashi");
			},
		},
		{
			id: "hashi_sekihi",
			x: 19,
			y: 10,
			sprite: PROPS.grave,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("橋のたもとの、ふるい石碑。");
				await s.narrate(
					"『もどりばし』と　よめる。\n由来は、けずれて　よめない。",
				);
			},
		},

		// ── 川面（夕=きらめき／深夜=音だけ／朝=きらめき） ──
		{
			id: "kawa_a",
			x: 10,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("水の音だけが、する。\nながれは、見えない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あさの川。しらさぎが、\n一羽だけ立っている。");
					return;
				}
				await s.narrate("夕日の帯が、水面を\nゆらゆら　ながれていく。");
			},
		},
		{
			id: "kawa_b",
			x: 30,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("……ちゃぷ、と　どこかで\n魚がはねた。たぶん、魚だ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あさもやが、水面に\nうすく　のこっている。");
					return;
				}
				await s.narrate("川のまんなかに、\n中州の草が　ゆれている。");
			},
		},

		// ── 田んぼの端 ──
		{
			id: "tanbo",
			x: 3,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("田んぼから、カエルの声。\n……夜も、はたらきものだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("いねの先に、朝つゆが\nならんで　ひかっている。");
					return;
				}
				await s.narrate("いねが、おもたそうに\n頭を下げはじめている。");
			},
		},
		{
			id: "tanbo_sign",
			x: 4,
			y: 7,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("田んぼの看板。こどもの字で\n『はいらないでね』。");
				await s.narrate("……はいりません。");
			},
		},

		// ── 神社（石段の上。狛犬が komainu の担当） ──
		{
			id: "ishidan",
			x: 31,
			y: 7,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_ishidan,
			run: async (s) => {
				s.set("seen_ishidan");
				await s.narrate("石段。まんなかだけ、\nすりへって　白い。");
			},
		},
		{
			id: "yashiro",
			x: 31,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("ちいさな　やしろ。戸の前が\nきれいに　はいてある。");
					return;
				}
				await s.narrate("ちいさな　やしろ。\nしめなわは、あたらしい。");
				await s.narrate("名前は、どこにも\n書かれていない。");
			},
		},
		{
			id: "komainu_a",
			x: 29,
			y: 4,
			sprite: base(3, 131, 1, 2),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await komainu(s, "a");
			},
		},
		{
			id: "komainu_b",
			x: 33,
			y: 4,
			sprite: base(4, 131, 1, 2),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await komainu(s, "b");
			},
		},
		{
			id: "saisen",
			x: 30,
			y: 5,
			sprite: PROPS.chestBrown,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("さいせん箱。");
					await s.say("kiriko", "……夜のおまいりは、\nやめておくンゴ");
					return;
				}
				await s.narrate("さいせん箱。");
				const i = await s.choose(["＞＞1 5円いれる", "＞＞2 やめておく"], {
					cancel: 1,
				});
				if (i === 0) {
					s.se("kane", { volume: 0.7 });
					await s.narrate("ちゃりん。");
					await s.say("kiriko", "……ねがいごとは、\nとくに　ないンゴ");
					s.set("seen_saisen");
					return;
				}
				await s.say("kiriko", "ごえんが　なかったンゴ");
			},
		},
		{
			id: "emakake",
			x: 34,
			y: 5,
			sprite: base(5, 30),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (!s.flag("seen_ema")) {
					s.set("seen_ema");
					await s.narrate("絵馬かけ。『家内安全』\n『ごうかく』『健康第一』……");
					await s.narrate("しらない人の　ねがいごとが\nならんでいる。");
					return;
				}
				await s.narrate("いちばん古い絵馬は、\n字が　きえて　よめない。");
			},
		},
		{
			id: "touro",
			x: 29,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("石どうろう。中に、\nろうそくの　あとがある。");
			},
		},

		// ── ススキと土手 ──
		{
			id: "susuki_a",
			x: 15,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ススキの穂が、しろい。\n夜のほうが、よく見える。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ススキに、朝つゆ。\nさわると　つめたい。");
					return;
				}
				await s.narrate("ススキが、夕日で\n金色になっている。");
			},
		},
		{
			id: "fumiato",
			x: 26,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("土手のくさに、ふみあと。\n近道の　あとらしい。");
			},
		},
		{
			id: "tsuri_bucket",
			x: 8,
			y: 10,
			sprite: base(1, 124),
			trigger: "talk",
			fixedDir: true,
			when: (st) => st.flags.tod !== "shinya",
			run: async (s) => {
				if (s.flag("tod") === "asa") {
					await s.narrate(
						"バケツの中に、ちいさいのが\n一ぴき。……リリースサイズだ。",
					);
					return;
				}
				await s.narrate("つりのバケツ。中では\n小魚が　まわっている。");
			},
		},
		{
			id: "tsuri_ato",
			x: 8,
			y: 10,
			trigger: "talk",
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.narrate("つり人の　跡。バケツの\n丸いあとだけ、のこっている。");
			},
		},

		// ── 対岸（行き止まりの見るもの） ──
		{
			id: "hanabi_ato",
			x: 21,
			y: 15,
			sprite: base(2, 190),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("花火の　もえかす。");
				await s.narrate("夏の　わすれものだ。");
			},
		},
		{
			id: "taigan_view",
			x: 22,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("川ごしの町。街灯が、\nぽつ、ぽつ、と　あるだけだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("川ごしの町が、あさの\n白い光の中にある。");
					return;
				}
				await s.narrate("川ごしに、町。\nぜんぶ、夕やけの色だ。");
			},
		},
		{
			id: "susuki_taigan",
			x: 18,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("こっち岸のススキは、\nだれにも　刈られていない。");
			},
		},

		// ── 夕方の人たち ──
		npc(
			"tsuri_jichan",
			9,
			10,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_tsuri")) {
					s.set("seen_tsuri");
					await s.say(
						null,
						"つれるかって？　それを\nきくのは　やぼってもんよ",
						{
							name: "つりの人",
						},
					);
					await s.say("kiriko", "（きいてないンゴ……）");
					await s.say(null, "川を見てるだけで、\n一日おわる。それでいいの", {
						name: "つりの人",
					});
					return;
				}
				await s.narrate("うきが、ぴくりとも\nしていない。");
				await s.say(null, "……しっ。いまいいとこ", { name: "つりの人" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"runner_yu",
			17,
			7,
			RUNNER,
			async (s) => {
				await s.narrate("じゅんび体そう中だ。\nかるく、会釈をされた。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"harmonica_kid",
			25,
			9,
			KID,
			async (s) => {
				if (!s.flag("seen_harmonica")) {
					s.set("seen_harmonica");
					await s.narrate("ハーモニカの音が、\nとぎれとぎれに　きこえる。");
					await s.say(null, "れんしゅう中だから、\nきかないで", {
						name: "土手の子",
					});
					await s.say("kiriko", "（きこえてたンゴ）");
					return;
				}
				await s.say(null, "……はっぴょう会、\nらいしゅうなんだ", {
					name: "土手の子",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち ──
		npc(
			"tsuri_asa",
			9,
			10,
			GRANDPA,
			async (s) => {
				await s.say(null, "あさまづめ、ってやつよ。\n……つれるかは、べつの話", {
					name: "つりの人",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"runner_asa",
			28,
			7,
			RUNNER,
			async (s) => {
				await s.narrate("ゆうべの人だ、という顔を\nされた。");
				await s.narrate("……会釈を、かえしておく。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
	],
};
