// かわらのみち（川沿いの土手道）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 40×16・outdoor・BGM null（川の気配と生活音だけ）。土手の上の道(y8)と水ぎわの道(y11)の
// 二段構え＋石段の上の神社の高台＋戻り橋の対岸。
//
// 時間帯の顔（flags.tod）:
//   夕方 … 川面のきらめき・ヒグラシ。NPC 4体（つりの人=3層会話・ランニングの人=周回・
//           ハーモニカの子・水きりの子）。川しもの鉄橋を電車がわたる（定時音は正常の側に置く）。
//           水ぎわで一度だけ蚊にさされる（ka_a/b/c・seen_ka。寝る前と朝の一行は room bed）
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。土手の街灯と常夜灯がつき、川の音がちかい。
//           文は「におい・音・点いた灯り」だけ（減った人・消えた窓は書かない）。つりのバケツだけ残っている
//   深夜 … NPC 0体必達。音だけの川。土手のふみあとに すわれる（P0-7）・対岸から自分のアパートのあたり（P0-5）。
//           手の中の缶は、地区を移るたびに冷める（onEnter の kanTick・P0-6）。脇道の怪異はここの担当2つだけ:
//           modoribashi（渡り切る直前の気配。ふりむいても誰もいない・わたりきれば何もない）
//           komainu は朝の担当（夕方に狛犬を調べたフラグがある人だけ、朝に差分の一言）
//   朝   … きらめきがもどる・スズメ。NPC 3体（つりの人・ランニングの人=周回・犬のさんぽの人）。
//           しらさぎの飛び立ち・バケツのリリースサイズ・ふみあとの「けさの分」など小さな payoff
//
// 座標凍結v3: 北 (5,1)→sumire(5,22)・sumire からの着地 (5,2)／
// 東 (38,8)→street(20,19)・street からの着地 (37,8)。
//
// 経路: 一本道にしない（土手道⇄石段の神社⇄水ぎわ⇄戻り橋の対岸）。
// 対岸は行き止まりだが「見るもの」を置く（花火のもえかす・川ごしの町）。
// 隠し: 対岸の西はし、ススキ（h・無印）が見た目のまま通れる → 水きり石の穴場。
// 二度目で変わる: 絵馬かけ・ご神木・水きり石（かりたあと）。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import type { Dir } from "../../engine/types";
import { npc, warp } from "../helpers";
import { kanHeld, kanLine, kanTick, yoruAkubi } from "../nostalgia";
import { DOOR, FIELD, JP, TOWN, WALL } from "../tiles";

// ── タイル ──
// FIELD をベースに、神社の高台（TOWN の石畳）と社・石段を足す。
//   i  田（通れない・counter＝あぜ越しに調べられる）   b  ススキ（茂みで代用）
//   h  ススキ（見た目は b と同じ・通れる＝対岸の隠し）   G  石どうろう（常夜灯）
//   z Z わら屋根（社）   [ ]  板壁   j  社の戸（しまっている）   Y  ご神木（高台のクスノキ）
//   .  水ぎわ・高台の石畳   =  石段   #  橋   ~  川   L  街灯
const PAVE = JP.ishidatami;
const tiles: Record<string, TileDef> = {
	...FIELD,
	i: {
		layers: [JP.paddy],
		color: "#7a9a3a",
		passable: false,
		counter: true,
	},
	".": { layers: [PAVE], color: "#8c8c90", passable: true },
	G: {
		layers: [PAVE, JP.stoneLantern],
		color: "#8c8c90",
		passable: false,
	},
	z: TOWN.z,
	Z: TOWN.Z,
	"[": TOWN["["],
	"]": TOWN["]"],
	j: {
		layers: [WALL.boardLo, DOOR.sliding],
		color: "#6a4a2a",
		passable: false,
	},
	"=": { layers: [JP.stoneSteps], color: "#8a8a8a", passable: true },
	Y: {
		layers: [PAVE, JP.tree],
		color: "#4a7a3a",
		passable: false,
	},
	h: {
		layers: [JP.ground, JP.susuki],
		color: "#6fae3a",
		passable: true,
	},
	L: { ...TOWN.L, layers: [JP.ground, JP.lamp] },
	// FIELD の地面・土手の道・川・橋も自作チップに（文字の意味は FIELD と同じ）
	",": { layers: [JP.grassTuft], color: "#6a7a48", passable: true },
	":": { layers: [JP.dirtPath], color: "#7a6a50", passable: true },
	"~": { layers: [JP.water], color: "#4a6a88", passable: false },
	"#": { layers: [JP.bridgeV], color: "#8a8880", passable: true },
};

// 西＝田んぼとかかし。北＝sumire への道(x5)と、石段の上の神社（ご神木・狛犬・常夜灯）。
// 中央＝土手の道(y8)・ススキの斜面・水ぎわの道(y11)。南＝川・戻り橋・対岸（隠しの穴場つき）。
const rows = [
	"                                        ", // y0
	"     :                                  ", // y1  sumire への出口 (5,1)
	"     :                        zzz       ", // y2  sumire からの着地 (5,2)・社の屋根
	"     :                        ZZZ       ", // y3
	"     :                      ..[j[...    ", // y4  狛犬 (29,4)(33,4)・社の戸 (31,4)
	"     :                      Y.......    ", // y5  ご神木 (28,5)・さいせん箱 (30,5)・絵馬かけ (34,5)
	"iiii,:,,,,,,,,,,,,,,,,,,,,,,G....G..    ", // y6  田んぼ・かかし (1,6)・常夜灯 (28,6)(33,6)。(29,6) から狛犬の前 (29,5) へ
	"iiii,:,,L,,,,,,,,,,,,,,,L,,,,,,=,,,,,,, ", // y7  街灯 (8,7)(24,7)・きょり標 (12,7)・石段 (31,7)
	",,::::::::::::::::::::::::::::::::::::: ", // y8  土手の道。street への出口 (38,8)・着地 (37,8)
	",,,,,,,,,,,,=,,b,,b,,,b,,,,b,,,,,,,,,,, ", // y9  土手の斜面とススキ・ハーモニカの子 (25,9)
	",,,,,,,,,,,,=,b,,,,,,,,,,b,,,,,,,b,,,,, ", // y10 石段 (12,9-10)・つりの人 (9,10)・バケツ (8,10)・石碑 (19,10)
	",,,,,,..........................,,,,,,, ", // y11 水ぎわの道・水きりの子 (17,11)・橋のたもと (20,11)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y12 川と戻り橋 (x20)・銘板 (21,12)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y13 橋の上から (19,13)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y14 わたりきる直前 (20,14)
	"            ,,,h,,h,,,b,                ", // y15 対岸（行き止まり）。花火のあと (21,15)・隠しの h (18,15)(15,15)
];

// ── モブの歩行グラ ──
const GRANDPA = "pub:sprites/mob_ojiichan.png";
const RUNNER = "pub:sprites/mob_student.png";
const KID = "pub:sprites/mob_child.png";
const WALKER = "pub:sprites/mob_mama.png";

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

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ）。street・sumire と同じ方式：
 * 直前に鳴らした帯をモジュール変数で覚え、往復の連打を防ぐ（セーブしない）。
 */
let lastWave = "";
const wave = (id: string, pan: number) => async (s: Story) => {
	if (lastWave === id) return;
	lastWave = id;
	const t = s.flag("tod");
	if (t === "yu") s.se("higurashi", { pan, volume: 0.8 });
	else if (t === "asa") s.se("suzume", { pan, volume: 0.8 });
};
/** 見えない環境音の帯（土手の道 y8 に置く）。 */
const waveBelt = (id: string, x: number, pan: number): EventDef => ({
	id,
	x,
	y: 8,
	trigger: "touch",
	through: true,
	when: (st: GameState) => st.flags.tod === "yu" || st.flags.tod === "asa",
	run: wave(id, pan),
});

/** 朝、水ぎわに下りたとき一度だけ（しらさぎの飛び立ち。kawa_b の朝の payoff）。 */
const sagiBelt = (x: number, y: number): EventDef => ({
	id: `sagi_${x}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "asa" && !st.flags.seen_sagi_asa,
	run: async (s) => {
		s.set("seen_sagi_asa");
		await s.narrate("――しらさぎが、はねの音も\nたてずに　とびたった。");
		await s.narrate("川しもへ、白い点に\nなっていく。");
	},
});

/**
 * 夕方の水ぎわで、蚊（nostalgia.md P0-10。帯3つのどれかで一日一回だけ・seen_ka）。
 * からだの一行なので、郷愁の文とは吹き出しを分けておく。
 */
const kaBelt = (id: string, x: number): EventDef => ({
	id,
	x,
	y: 11,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "yu" && !st.flags.seen_ka,
	run: async (s) => {
		s.set("seen_ka");
		await s.narrate("……ぷうん、と　耳もとで\n音がした。");
		await s.narrate("うでを、蚊に　さされた。");
		await s.say("kiriko", "（夕方の川は、\nこれがあるンゴ）");
	},
});

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

/** 常夜灯（(28,6)(33,6) で共用。夜にひが入る＝だれかが世話をしている。説明しない）。 */
const jouyatou = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("石どうろうに、ひが\n入っている。");
		await s.narrate("ちいさな　ほのおが、\nしずかに　ゆれている。");
		return;
	}
	if (t === "yoru") {
		// 宵は、ともしたばかり（深夜＝ちいさな ほのお・朝＝においだけ へつづく）。
		// 「いつのまにか」は書かない（この地区では戻り橋の怪異の言い回し）
		await s.narrate("石どうろうに、ひが\n入っている。");
		await s.narrate("ろうそくは、まだ　ながい。");
		return;
	}
	if (t === "asa") {
		await s.narrate("ひは、もう　きえている。");
		await s.narrate("ろうそくの　においだけ、\nのこっている。");
		return;
	}
	await s.narrate("石どうろう。あたらしい\nろうそくが、立ててある。");
};

/** 土手の街灯（(8,7)(24,7) で共用。lights は yoru,shinya で点く）。 */
const gaitou = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("街灯のあかりに、羽虫が\nあつまっている。");
		return;
	}
	if (t === "yoru") {
		await s.narrate("土手の街灯。まるい　あかりが\n道に　おちている。");
		return;
	}
	if (t === "asa") {
		await s.narrate("街灯。もう、\nきえている。");
		return;
	}
	await s.narrate("土手の街灯。まだ、\nついていない。");
};

/**
 * 深夜、土手のしゃめんに すわる（fumiato。nostalgia.md P0-7。seen_suwari_kawara）。なにも起きない。
 * 目をとじる → 暗転して、目をあける → カエルがふえてくる → 草のつめたさ（缶があれば缶の1行に替える）。
 * 文は暗転の前とあとにだけ出す（暗転 .fade は吹き出しより上に重なるので、暗いあいだの文は見えない）。
 * 無音は暗転の 2.7 秒だけ。深夜の電車・トラックの音は鳴らさない。
 * 2回目からは選ばずに短い1行だけ（缶があれば缶の1行。danchi・sumire の座る場所とそろえる）。
 */
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_kawara")) {
		if (kanHeld(s)) await kanLine(s);
		else await s.narrate("しゃめんに　すわって、\nすこし　川の音を　きいた。");
		return;
	}
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_kawara");
	await s.narrate("しゃめんに　すわって、\n目を　とじた。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate("カエルの声が、ひとつ、\nまたひとつ　ふえてくる。");
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("しゃめんの草が、\n夜つゆで　つめたい。");
	await s.say("kiriko", "……よし。もうすこし\nあるくンゴ");
};

export const kawara: MapDef = {
	id: "kawara",
	foreground: "susuki", // ジオラマ表示の前景（手前のススキ）
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 26, y: 1, w: 12, h: 7 }, // 神社
		{ x: 14, y: 12, w: 13, h: 4 }, // 川ぞいの橋
		{ x: 0, y: 0, w: 13, h: 6 }, // すみれ町へのみち
		{ x: 0, y: 6, w: 13, h: 6 }, // 田んぼと土手
		{ x: 13, y: 6, w: 13, h: 6 }, // 土手のなかほど
		{ x: 26, y: 7, w: 14, h: 5 }, // 土手の東
	],
	name: "かわらのみち",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	outdoor: true,
	outside: "#0b0c09",
	tiles,
	rows,
	// 光源は土手の街灯2本と神社の常夜灯2基だけ（川沿いはくらいのが正しい。docs/night-fx.md §2）
	lights: [
		{ x: 8, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 24, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 28, y: 6, r: 2, color: "#ffcc88", only: "yoru,shinya" }, // 常夜灯
		{ x: 33, y: 6, r: 2, color: "#ffcc88", only: "yoru,shinya" },
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。宵・深夜は無音のまま）。
	// 深夜は、手の中の缶が地区ひとつぶん冷める（nostalgia.md P0-6。文は出さない）
	onEnter: async (s) => {
		lastWave = "";
		kanTick(s);
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
		// 宵（nostalgia.md P0-1。座標は y0 の空き。4地区目あたりで あくび）
		{
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("川の音が、夕方より\nちかく　きこえる。");
				await yoruAkubi(s);
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

		// ── 環境音の帯（土手の道。歩くたび遠近が変わる） ──
		waveBelt("wave_w", 10, -0.3),
		waveBelt("wave_m", 19, 0),
		waveBelt("wave_e", 29, 0.4),
		// 朝の水ぎわ（しらさぎ）
		sagiBelt(12, 11),
		sagiBelt(20, 11),
		// 夕方の水ぎわ（蚊。どれか一つで一日一回）
		kaBelt("ka_a", 11),
		kaBelt("ka_b", 16),
		kaBelt("ka_c", 24),

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
			sprite: JP.sekihi,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("橋のたもとの、ふるい石碑。");
				await s.narrate(
					"『もどりばし』と　よめる。\n由来は、けずれて　よめない。",
				);
			},
		},
		{
			id: "hashi_meiban",
			x: 21,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("橋のたもとの、銘板。\nひらがなで『もどりはし』。");
				await s.narrate("……にごらずに、\nほってある。");
			},
		},
		{
			id: "hashi_ue",
			x: 19,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("くらい水が、橋の下を\nくぐっていく音がする。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あさもやの　きれはしが、\n橋の下から　ながれ出た。");
					return;
				}
				await s.narrate("橋の上は、川かぜの\nとおり道だ。");
				if (t === "yoru") {
					await s.narrate("土手の上に、街灯が\nふたつ　ついている。");
					return;
				}
				await s.narrate("きらめきが、川しもまで\nつづいている。");
			},
		},

		// ── 川面（夕=きらめき／宵・深夜=音だけ／朝=きらめき） ──
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
				if (t === "yoru") {
					await s.narrate("水面は　くろい。\nさざなみが、岸を　たたく音。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あさの光が、水面で\nこまかく　われている。");
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
					if (!s.flag("seen_sagi_asa")) {
						await s.narrate("あさの川。しらさぎが、\n一羽だけ立っている。");
						return;
					}
					await s.narrate("あさもやが、水面に\nうすく　のこっている。");
					return;
				}
				await s.narrate("川のまんなかに、\n中州の草が　ゆれている。");
			},
		},

		// ── 田んぼの端（あぜ越しに調べられる） ──
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
			id: "kakashi",
			x: 1,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("かかしは、夜も\n立ちっぱなしだ。");
					await s.say("kiriko", "（……ごくろうさま\nンゴ）");
					return;
				}
				if (t === "asa") {
					await s.narrate("かかしの　かたに、すずめ。");
					await s.narrate("いばしょを、\nまちがえている。");
					return;
				}
				await s.narrate(
					"田んぼのおくに、かかし。\nむぎわらぼうしが　あたらしい。",
				);
			},
		},
		{
			id: "tanbo_sign",
			x: 4,
			y: 7,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("田んぼの看板。こどもの字で\n『はいらないでね』。");
				await s.narrate("……はいりません。");
			},
		},

		// ── 神社（石段の上。狛犬が komainu の担当・常夜灯は lights と対） ──
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
			id: "kazoe",
			x: 31,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("チョークの数字は、\nくらくて　よめない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("石段のチョークが、\nあさつゆで　にじんでいる。");
					await s.narrate("『5』だけ、くっきり\nのこっている。");
					return;
				}
				await s.narrate("石段のはしに、チョークの\n数字。『1 2 3 5 6……』");
				await s.narrate("4だけ、とばしてある。");
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
			sprite: JP.komainuA,
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
			sprite: JP.komainuB,
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
			sprite: JP.saisen,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("さいせん箱。");
					await s.say("kiriko", "……夜のおまいりは、\nやめておくンゴ");
					return;
				}
				await s.narrate("さいせん箱。");
				if (s.flag("tod") === "asa") {
					await s.narrate("ふちに、みかんが\nひとつ　のっている。");
				}
				const i = await s.choose(["＞＞1 5円いれる", "＞＞2 やめておく"], {
					cancel: 1,
				});
				if (i === 0) {
					s.se("kane", { volume: 0.7 });
					await s.narrate("ちゃりん。");
					if (!s.flag("seen_saisen")) {
						s.set("seen_saisen");
						await s.say("kiriko", "……ねがいごとは、\nとくに　ないンゴ");
						return;
					}
					await s.say("kiriko", "きょうの分ンゴ");
					return;
				}
				await s.say("kiriko", "ごえんが　なかったンゴ");
			},
		},
		{
			id: "emakake",
			x: 34,
			y: 5,
			sprite: JP.emakake,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (!s.flag("seen_ema")) {
					s.set("seen_ema");
					await s.narrate("絵馬かけ。風で、絵馬が\nこつ、と鳴った。");
					await s.narrate("『じてんしゃが　ほしい』");
					await s.narrate("『はっぴょう会で　まちがえ\nませんように』");
					await s.narrate("『でっかいコイが　つれます\nように』");
					return;
				}
				await s.narrate("いちばん古い絵馬は、\n字が　きえて　よめない。");
			},
		},
		{
			id: "goshinboku",
			x: 28,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_goshinboku")) {
					s.set("seen_goshinboku");
					await s.narrate(
						"ふるい　クスノキ。みきに、\nしめなわが　まいてある。",
					);
					return;
				}
				await s.narrate("みきのうろに、どんぐりが\nためこんである。");
				await s.narrate("……だれのだろう。");
			},
		},
		{
			id: "touro_a",
			x: 28,
			y: 6,
			trigger: "talk",
			run: jouyatou,
		},
		{
			id: "touro_b",
			x: 33,
			y: 6,
			trigger: "talk",
			run: jouyatou,
		},

		// ── 土手の道と斜面（街灯・きょり標・ススキ・ふみあと） ──
		{
			id: "lamp_w",
			x: 8,
			y: 7,
			trigger: "talk",
			run: gaitou,
		},
		{
			id: "lamp_e",
			x: 24,
			y: 7,
			trigger: "talk",
			run: gaitou,
		},
		{
			id: "kyorihyo",
			x: 12,
			y: 7,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("くいの　きょり標。\n『河口から 12.5km』");
				await s.narrate("川は、まだ　ずっと\nつづいているらしい。");
			},
		},
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
				if (t === "yoru") {
					await s.narrate("ススキの　ねもとで、\n虫が　鳴きはじめた。");
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
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("……けさの分が、もう\nついている。");
					return;
				}
				// 深夜だけ、ここに すわれる（座れる場所は町に3か所だけ）
				if (t === "shinya") await suwaru(s);
			},
		},
		{
			id: "kasen_sign",
			x: 16,
			y: 10,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『ぞうすい時は　川に\n近づかない』");
				await s.narrate("かんばんの絵の波は、\nずいぶん　元気だ。");
			},
		},
		{
			id: "tsuri_bucket",
			x: 8,
			y: 10,
			sprite: JP.bucket,
			trigger: "talk",
			fixedDir: true,
			when: (st) => st.flags.tod !== "shinya",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						"バケツの中に、ちいさいのが\n一ぴき。……リリースサイズだ。",
					);
					return;
				}
				// 宵はバケツだけが残っている（つりの人のことは書かない。深夜は丸いあとだけ＝tsuri_ato）
				if (t === "yoru") {
					await s.narrate(
						"つりのバケツ。ときどき、\nぱしゃ、と　水が　はねる。",
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

		// ── 対岸（行き止まりの見るもの＋ススキ h のむこうの隠し） ──
		// 足もとの物なので踏んで通れる（東どなりの taigan_view を (21,15) から調べる）
		{
			id: "hanabi_ato",
			x: 21,
			y: 15,
			sprite: JP.hanabiAto,
			trigger: "talk",
			through: true,
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
					// 帰る場所のあたり（nostalgia.md P0-5）。一度だけ。窓が見えたとは言わない
					if (s.flag("seen_taigan_shinya")) return;
					s.set("seen_taigan_shinya");
					await s.say("kiriko", "……うちの　アパート、\nあのへんンゴ？");
					await s.narrate("街灯の　ならびの、どこか。");
					await s.say("kiriko", "（電気、けして\nきたっけ）");
					return;
				}
				if (t === "yoru") {
					await s.narrate("川ごしの町。窓の灯りが、\nならんで　ともっている。");
					await s.say("kiriko", "（どれが　どの家か、\nさっぱりンゴ）");
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
				// 宵は音だけ（宵の文に「だれも」を出さない。nostalgia.md P0-1 の受け入れ条件）
				if (s.flag("tod") === "yoru") {
					await s.narrate("こっち岸のススキが、\n川かぜで　さわさわ　鳴る。");
					return;
				}
				await s.narrate("こっち岸のススキは、\nだれにも　刈られていない。");
			},
		},
		{
			id: "mizukiri_ishi",
			x: 13,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("ススキのかげに、ひらたい\n石が、白く　つんである。");
					return;
				}
				if (s.flag("seen_mizukiri_nage")) {
					await s.narrate("石の山が、ひとつぶん\nひくくなっている。");
					return;
				}
				await s.narrate(
					"ススキのかげに、ひらたい\n石が、きれいに　つんである。",
				);
				await s.narrate("だれかの、水きりの\nとっておきらしい。");
				const i = await s.choose(
					["＞＞1 一まい　かりる", "＞＞2 そっとしておく"],
					{ cancel: 1 },
				);
				if (i === 0) {
					s.set("seen_mizukiri_nage");
					await s.narrate("えいっ。");
					await s.narrate("――三回はねて、\nしずんだ。");
					await s.say("kiriko", "……かえせなくなったンゴ");
					return;
				}
				await s.narrate("そっとしておいた。");
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		// つりの人（3層: 初回／二層目=ぬしの話／待機）
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
				if (!s.flag("seen_tsuri2")) {
					s.set("seen_tsuri2");
					await s.say(null, "この川にはな、ぬしが\nいるんだ。二十年ものの鯉", {
						name: "つりの人",
					});
					await s.say("kiriko", "見たこと、あるンゴ？");
					await s.say(null, "二十年前に、\nいっぺんだけな", {
						name: "つりの人",
					});
					await s.say("kiriko", "……それ、もう　いない\nンゴじゃ……");
					await s.say(null, "――しっ。いま、いいとこ", { name: "つりの人" });
					return;
				}
				await s.narrate("うきが、ぴくりとも\nしていない。");
				await s.say(null, "……しっ。いまいいとこ", { name: "つりの人" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// ランニングの人（周回。話しかけても会釈だけ＝無害な他者のベースライン）
		npc(
			"runner_yu",
			16,
			8,
			RUNNER,
			async (s) => {
				await s.narrate("はしりながら、かるく\n会釈をされた。");
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
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
		npc(
			"mizukiri_kid",
			17,
			11,
			KID,
			async (s) => {
				if (!s.flag("seen_mizukiri_kid")) {
					s.set("seen_mizukiri_kid");
					await s.say(null, "見てて。……そりゃっ", { name: "水きりの子" });
					await s.narrate("石は、一回もはねずに\nしずんだ。");
					await s.say(null, "……いまのは、にぎりが\nわるかった", {
						name: "水きりの子",
					});
					await s.say("kiriko", "（きろくは、ゼロンゴ）");
					return;
				}
				await s.say(null, "五回はねる人も、いるんだ。\nどこで練習してんだか", {
					name: "水きりの子",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（セリフ全差し替え。夕方の setup の payoff） ──
		npc(
			"tsuri_asa",
			9,
			10,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_tsuri_asa")) {
					s.set("seen_tsuri_asa");
					await s.say(
						null,
						"あさまづめ、ってやつよ。\n……つれるかは、べつの話",
						{
							name: "つりの人",
						},
					);
					if (s.flag("seen_tsuri")) {
						await s.say(null, "ゆうべの子か。ほら、\nバケツ、見てみな", {
							name: "つりの人",
						});
						await s.say("kiriko", "（……ちいさいンゴ）");
					}
					return;
				}
				await s.narrate("うきを、じっと\n見ている。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"runner_asa",
			28,
			8,
			RUNNER,
			async (s) => {
				if (!s.flag("seen_runner_asa")) {
					s.set("seen_runner_asa");
					await s.narrate("ゆうべの人だ、という顔を\nされた。");
					await s.narrate("……会釈を、かえしておく。");
					return;
				}
				await s.narrate("きょうも、おなじペースで\nはしっていく。");
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"inu_sanpo",
			14,
			8,
			WALKER,
			async (s) => {
				if (!s.flag("seen_inu_kawara")) {
					s.set("seen_inu_kawara");
					await s.narrate("犬が、川に向かって\n一声だけ　ほえた。");
					await s.say(null, "すみません。あの白い鳥に\nだけ、ほえるんです", {
						name: "犬のさんぽの人",
					});
					await s.say("kiriko", "（こだわりが　あるンゴ）");
					return;
				}
				await s.say(null, "この子、さんぽの順路に\nうるさいんですよ", {
					name: "犬のさんぽの人",
				});
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
	],
};
