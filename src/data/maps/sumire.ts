// すみれ町（住宅街の本体）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 40×24・outdoor・BGM null（生活音だけ）。walksim の本体＝日常。怪異は脇道のおまけ。
//
// 四つの顔（flags.tod）:
//   夕方  … 生きた住宅街。NPC 6体（たいそう帰り・塾かばん・ベビーカー・井戸端×2・うちみず）。
//           歯科に灯り・家々の窓明かり。怪異ゼロ（必達）
//   宵    … NPC 0体（docs/nostalgia.md P0-1）。家々の窓にテレビの音・公園の外灯がつく。
//           文は「におい・音・点いた灯り」だけ（減った人・消えた窓は書かない）。
//           やまだ家のピアノは、また　おなじところでつっかえる（seen_piano_yu・P0-11）。
//           こんどう家からナイターの実況（延長の段には関係なく「実況」だけ・P0-2）
//   深夜  … 無人（NPC 0体・必達）。脇道の怪異は4つだけ:
//           blanko（公園）/ pool（校門）/ seisanki（パーキング）/ denwa（おおた家）。
//           どれも進行と無関係・説明しない・死なない。
//           ひみつきちに しゃがめる（seen_kichi_shinya・P0-7）。じはんきで温かい缶が一本買え、
//           地区を移るたびに冷める（onEnter の kanTick・P0-6）。どちらも怪異ではない
//   朝    … NPC 4体（登校の子・ごみ出し・たいそうへ行くじいさん・歯科のそうじ）。
//           貼り紙『みつかりました』・グローブの回収・ピアノの「こえた」など、小さな payoff
// 二度目で下の層が見える: 校門のプレート（『80』のふちから『70』。seen_gate_plate・P0-8）。
//
// 座標凍結v3: 東 touch (38,3)→street(3,19)（street からの着地は (37,3)）／
//   南 touch (5,23)→kawara(5,2)（着地 (5,22)）／西 touch (0,12)→danchi(30,12)（着地 (1,12)）
//
// 地区: 北＝小学校（校門は閉まっている・フェンス越しの校庭）と裏の路地（→street）。
//   中央＝公園（ブランコ2・すべり台・砂場・水のみ場・外灯）・歯科・月ぎめパーキング・緑地。
//   南＝家々（表札・植木・犬小屋・物干し）・ごみ集積所・空き地（隠し: 柵の一枚が通れる）・
//   川へ下りる坂道（→kawara）

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import { kanHeld, kanLine, kanShinya, kanTick, yoruAkubi } from "../nostalgia";
import { SPR } from "../sprites";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";

// ── タイル ──
// TOWN をベースに、住宅街の部品を足す。
//   o  しまった戸（白壁）  j  しまった戸（板壁）  r  しまった戸（レンガ壁）
//   c  大きな窓（白壁の下段）  t  大きな窓（レンガ壁の下段）  m  窓（板壁の下段）
//   +  歯科の看板（白壁の上段）  q  校門の門柱  G  しまった校門（鉄柵）
//   g  校庭の土（入れない）  s  すなば  u  ブランコ  /  すべり台
//   h  空き地の柵（見た目は柵・通れる＝無印の隠し）  _  坂の段差
const TURF = JP.ground;
const WIN_LOW_WHITE = WIN.sash;
const WIN_LOW_BRICK = WIN.sash;
const tiles: Record<string, TileDef> = {
	...TOWN,
	o: {
		layers: [WALL.sidingLo, DOOR.house],
		color: "#e8e8e8",
		passable: false,
	},
	j: {
		layers: [WALL.boardLo, DOOR.sliding],
		color: "#6a4a2a",
		passable: false,
	},
	r: {
		layers: [WALL.tileLo, DOOR.shop],
		color: "#a04a3a",
		passable: false,
	},
	c: {
		layers: [WALL.sidingLo, WIN_LOW_WHITE],
		color: "#e8e8e8",
		passable: false,
	},
	t: {
		layers: [WALL.tileLo, WIN_LOW_BRICK],
		color: "#a04a3a",
		passable: false,
	},
	m: {
		layers: [WALL.boardLo, WIN_LOW_WHITE],
		color: "#6a4a2a",
		passable: false,
	},
	"+": {
		layers: [WALL.sidingUp, JP.cross],
		color: "#e8e8e8",
		passable: false,
	},
	q: { layers: [JP.gatePillar], color: "#7a7a70", passable: false },
	G: {
		layers: [JP.schoolGate],
		color: "#5a5a60",
		passable: false,
	},
	g: { layers: [JP.schoolDirt], color: "#c8a26a", passable: true },
	s: { layers: [JP.sand], color: "#e8cc90", passable: true },
	u: {
		layers: [TURF],
		above: [JP.swing],
		color: "#8a6a3a",
		passable: false,
	},
	"/": {
		layers: [TURF],
		above: [JP.slide],
		color: "#8a8a90",
		passable: false,
	},
	h: { layers: [TURF, JP.ropeFence], color: "#8a6a3a", passable: true },
	_: { layers: [JP.slopeStep], color: "#8a8078", passable: true },
};

// 北＝小学校（y0-5）と裏の路地（y3・東で street へ）。中央＝上のどおり（y6）・
// パーキング／歯科／緑地／公園（y7-11）・大どおり（y12-13）。
// 南＝ごみ集積所・家二軒・空き地（柵の h だけ通れる）・杉やぶ・坂道（x5 で kawara へ）。
const rows = [
	"  nnnnnnnnnnnnn              zzzzz aaaa ", // y0  小学校の棟・たかはし家・みうら家
	"  ^^^^^^^^^^^^^              ZZZZZ AAAA ", // y1
	"  %W%W%W%W%W%W%              ]m]j] )co) ", // y2  たかはし家の戸 (32,2)・みうら家の窓 (36,2)
	"  #t#t#t#t#t#t#             ........... ", // y3  裏の路地。street へ (38,3)・着地 (37,3)
	"  ggggggggggggg                  :      ", // y4  校庭（入れない）
	"  fffffqGGqffff                  :      ", // y5  校門 (8,5)-(9,5)・フェンス
	" :::::::::::::::::::::::::::::::::::::: ", // y6  上のどおり。とびだし看板 (1,6)
	" fffffff,,,,,,,,L,,,|||||,||||||  nnnnn ", // y7  緑地・公園の生けがき（入口 x25）・こんどう家
	" V.....faaaaa,P,,,P,|L,,,,,,/,,|  ^^^^^ ", // y8  精算機 (1,8)・歯科の屋根・外灯 (21,8)・すべり台 (28,8)
	" ......fAAAAA,*,,,*,|,,uu,,,,U,|  %W%W% ", // y9  ブランコ (23,9)-(24,9)・水のみ場 (29,9)
	" ......f(+(w(,,,,,,,|!Bb,,ss,L,|  #t#r# ", // y10 公園の看板・ベンチ・すなば・こんどう家の戸 (37,10)
	" fff..ff)c)o),,Kk,V,|||||,||||||  ,,,,, ", // y11 歯科の窓 (9,11)・戸 (11,11)・掲示板・じはんき
	"::::::::::::::::::::::::::::::::::::::: ", // y12 大どおり。danchi へ (0,12)・カーブミラー (38,12)
	" xx:::::::::::::::::::||||h||||:L,,,,,, ", // y13 ごみ集積所 (1,13)-(2,13)・空き地の柵（h＝通れる）
	"    f::fnnnnnn,,zzzzz |,Kk,,,,|,,T,,T,, ", // y14 やまだ家・おおた家・空き地のひみつきち
	"    f__f^^^^^^,,ZZZZZ |x,,,,*,| ,,,,,,, ", // y15 坂の段差
	"    f::f(w((w(,,[m[m[ |,,,,x,,| ,T,,T,, ", // y16
	"    f::f)c)o)c,,]j]m] |,,,,,,,| ,,,,,,, ", // y17 やまだ家の戸 (11,17)・おおた家の戸 (17,17)
	"    f::f||,,,,,,,,,,P ||||||||| ||||||| ", // y18 物干し (9,18)（(10,18) から）・うえ木 (20,18)
	"    f__f|||||||x|||||                   ", // y19 犬小屋 (15,19)（(15,18) から）
	"    f::f                                ", // y20 坂道
	"    f::!                                ", // y21 かわらのみち の看板 (7,21)
	"    f:f                                 ", // y22 着地 (5,22)
	"     :                                  ", // y23 kawara へ (5,23)
];

// ── モブの歩行グラ（同梱の RPGEN DQ 風） ──
const CHILD = "pub:sprites/mob_child.png";
const ELDER = "pub:sprites/mob_ojiichan.png";
const GRANDMA = "pub:sprites/mob_obaachan.png";
const WOMAN = "pub:sprites/mob_student.png";
const MAN_B = "pub:sprites/mob_salaryman.png";

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ）。street と同じ方式：
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
/** 見えない環境音の帯（大どおりの2列にまたがせる）。 */
const waveBelt = (
	id: string,
	x: number,
	ys: number[],
	pan: number,
): EventDef[] =>
	ys.map((y) => ({
		id: `${id}_${y}`,
		x,
		y,
		trigger: "touch" as const,
		through: true,
		when: (st: GameState) => st.flags.tod === "yu" || st.flags.tod === "asa",
		run: wave(id, pan),
	}));

/**
 * 怪異 blanko（深夜の公園）。ブランコに近づくと一度だけ。
 * SE は鳴らさない——無音が正解（briefs「脇道の怪異プール」）。
 */
const blanko = async (s: Story): Promise<void> => {
	if (s.flag("seen_blanko")) return;
	s.set("seen_blanko");
	await s.wait(400);
	await s.narrate("――ブランコが、ひとつだけ\nゆれている。");
	await s.wait(900);
	await s.narrate("ゆれは、小さくなって、\nとまった。");
	await s.note("blanko");
};
/** blanko の接近帯（ブランコのまわりの歩けるマス）。 */
const blankoBelt = (x: number, y: number): EventDef => ({
	id: `blanko_${x}_${y}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "shinya" && !st.flags.seen_blanko,
	run: blanko,
});

/** 怪異 denwa の遠聞こえ（おおた家の前のどおり）。 */
const denwaHint = (x: number, y: number): EventDef => ({
	id: `denwa_hint_${x}_${y}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "shinya" && !st.flags.seen_denwa_hint,
	run: async (s) => {
		s.set("seen_denwa_hint");
		await s.narrate("……どこかで、電話が\n鳴っている。");
	},
});

export const sumire: MapDef = {
	id: "sumire",
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 1, y: 0, w: 14, h: 7 }, // 小学校
		{ x: 15, y: 3, w: 11, h: 4 }, // 坂の上の道
		{ x: 26, y: 0, w: 14, h: 7 }, // いしはら家・みずの家
		{ x: 0, y: 7, w: 10, h: 6 }, // 歯科と緑地
		{ x: 10, y: 7, w: 9, h: 6 }, // 掲示板と自販機
		{ x: 19, y: 7, w: 13, h: 6 }, // 公園
		{ x: 32, y: 7, w: 8, h: 6 }, // こんどう家
		{ x: 0, y: 13, w: 14, h: 7 }, // やまだ家と坂
		{ x: 14, y: 13, w: 15, h: 7 }, // おおた家と空き地
		{ x: 29, y: 13, w: 11, h: 6 }, // 南の木立
		{ x: 0, y: 20, w: 10, h: 4 }, // 坂道
	],
	name: "すみれ町",
	bgm: null,
	outdoor: true,
	outside: "#0d0b09",
	tiles,
	rows,
	// 光源（docs/night-fx.md §2）。歯科は夕方だけ（診療中の窓）。家の窓は夕〜夜
	// （深夜は消えている＝寝しずまった町の記号）。公園の外灯と街灯・じはんきは夜〜深夜。
	lights: [
		{ x: 9, y: 11, r: 2, color: "#cfe4ff", only: "yu" }, // 歯科の窓
		{ x: 9, y: 17, r: 2, only: "yu,yoru" }, // やまだ家の窓（西）
		{ x: 13, y: 17, r: 2, only: "yu,yoru" }, // やまだ家の窓（東）
		{ x: 19, y: 17, r: 2, only: "yu,yoru" }, // おおた家の窓
		{ x: 30, y: 2, r: 2, only: "yu,yoru" }, // たかはし家の窓
		{ x: 36, y: 2, r: 2, only: "yu,yoru" }, // みうら家の窓
		{ x: 35, y: 10, r: 2, only: "yu,yoru" }, // こんどう家の窓
		{ x: 21, y: 8, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 公園の外灯（北）
		{ x: 29, y: 10, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 公園の外灯（南）
		{ x: 16, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 上のどおりの街灯
		{ x: 14, y: 13, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 大どおりの街灯（西）
		{ x: 32, y: 13, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 大どおりの街灯（東）
		{ x: 18, y: 11, r: 1.5, color: "#eef4ff", only: "yoru,shinya" }, // じはんき
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。宵・深夜は無音のまま）。
	// 深夜は、手の中の缶が一段さめる（kanTick・文は出さない。nostalgia.md P0-6）
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
				await s.narrate("どこかの家から、\nピアノの音がする。");
			},
		},
		{
			// 宵（nostalgia.md P0-1）。4地区目あたりで、あくびが一度だけ（yoruAkubi）
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("あちこちの窓から、\nテレビの　笑い声。");
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
				await s.narrate("家のあかりが、\nぜんぶ　消えている。");
				await s.wait(400);
				await s.narrate("足音だけが、よく\nひびく。");
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
				await s.narrate("ぱん、ぱん、と\nふとんを　たたく音。");
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_street", 38, 3, { map: "street", x: 3, y: 19, dir: "right" }),
		warp("to_kawara", 5, 23, { map: "kawara", x: 5, y: 2, dir: "down" }),
		warp("to_danchi", 0, 12, { map: "danchi", x: 30, y: 12, dir: "left" }),

		// ── 環境音の帯（大どおり2列 ＋ 上のどおり） ──
		...waveBelt("wave_w", 8, [12, 13], -0.4),
		...waveBelt("wave_e", 31, [12, 13], 0.4),
		...waveBelt("wave_n", 20, [6], 0),

		// ── 怪異の帯（深夜のみ・すべて任意の脇道） ──
		blankoBelt(23, 8),
		blankoBelt(24, 8),
		blankoBelt(22, 9),
		blankoBelt(25, 9),
		denwaHint(16, 12),
		denwaHint(18, 12),

		// ── 小学校（校門はいつも閉まっている。深夜だけ、おくで水の音＝pool） ──
		...[8, 9].map(
			(x): EventDef => ({
				id: `gate_${x}`,
				x,
				y: 5,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						await s.narrate("校門は、しまっている。");
						await s.wait(600);
						await s.narrate("――おくで、水の音が\nしている。");
						await s.say("kiriko", "……プールは、夏で\nおわったはずンゴ");
						await s.narrate("門は、あかない。");
						await s.note("pool");
						return;
					}
					if (t === "asa") {
						await s.narrate("校門は、まだ\nしまっている。");
						await s.narrate("チャイムの　ためし鳴らしが\n一度だけ　聞こえた。");
						return;
					}
					if (t === "yoru") {
						await s.narrate("校門は、しまっている。");
						await s.narrate("職員室のほうから、\nコピー機の　音。");
						return;
					}
					await s.narrate("校門は、もう\nしまっている。");
					await s.narrate("校庭のすみで、ボールの\n音が　まだしている。");
				},
			}),
		),
		{
			// 二度目で下の層に気づく（nostalgia.md P0-8。時間帯を問わず同じ文。
			// 変わるのではなく、気づく——1文字ちがいの張り紙＝yellow の技法とは混ぜない）
			id: "gate_plate",
			x: 7,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("門柱のプレート。\n『すみれ小学校』。");
				await s.narrate("よこに、小さく\n『創立80周年』。");
				if (!s.flag("seen_gate_plate")) {
					s.set("seen_gate_plate");
					return;
				}
				await s.narrate(
					"『80』のシールの　ふちから、\n『70』が　のぞいている。",
				);
				await s.say("kiriko", "つぎは、この上に\n『90』ンゴね");
			},
		},
		{
			id: "fence_ground",
			x: 4,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("フェンスごしの校庭。\nだれも、いない。");
					await s.narrate("白線だけが、うすく\n見える。");
					return;
				}
				if (t === "asa") {
					await s.narrate("せんせいが、ライン引きを\nおしている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("フェンスごしの校庭。\nどこかで、虫が　鳴いている。");
					return;
				}
				await s.narrate("フェンスごしの校庭。\n白線が、半分きえている。");
			},
		},
		{
			id: "fence_sakura",
			x: 12,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("校庭のすみに、桜の木。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("えだの影が、フェンスに\nかさなっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("すずめが、えだに\nならんでいる。");
					return;
				}
				await s.narrate("いまは、葉っぱだけが\nしげっている。");
			},
		},

		// ── 裏の路地（東で street へ。生活のうらがわ） ──
		{
			id: "alley_box",
			x: 29,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("だんボールは、\nからっぽだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("だんボールに、ねこが\nもどっている。");
					return;
				}
				await s.narrate("だんボールのなかで、\nねこが　まるくなっている。");
			},
		},
		{
			id: "alley_bike",
			x: 30,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("子ども用の自転車が、\nたおれたままだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("自転車が、ちゃんと\n立ててある。");
					return;
				}
				await s.narrate("子ども用の自転車。\nたおれている。");
			},
		},
		{
			id: "takahashi_door",
			x: 32,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『たかはし』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("しずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("せんたくきの　まわる音が\nしている。");
					return;
				}
				await s.narrate("なかから、テレビの\nわらい声。");
			},
		},
		{
			id: "koinu_poster",
			x: 35,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべの貼り紙。『こいぬを\nさがしています』");
				await s.narrate("しっぽの先だけ白い、と\n書いてある。");
				if (s.flag("tod") === "asa") {
					await s.narrate("うえに、あたらしい紙。\n――『みつかりました』");
				}
			},
		},
		{
			id: "miura_win",
			x: 36,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("くらい。れいぞうこの音が\nかすかに　している。");
					return;
				}
				if (t === "asa") {
					await s.narrate("みそしるの　においがする。");
					return;
				}
				await s.narrate("まどのおく、さかなを\nやく　においがする。");
			},
		},

		// ── 上のどおり（西端＝とびだし看板・東端＝みぞ。行き止まりにも見るもの） ──
		{
			id: "tobidashi",
			x: 1,
			y: 6,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『とびだし　ちゅうい』の\n看板だ。");
				await s.narrate("絵の子は、ずっと\n走りだす　かっこうのまま。");
			},
		},
		{
			id: "mizo",
			x: 38,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("みぞの水の音だけが、\nしている。");
					return;
				}
				await s.narrate("みぞを、水が\nながれていく。");
			},
		},

		// ── 公園（ブランコ・すべり台・すなば・水のみ場・ベンチ・外灯） ──
		// ブランコは北どなりが裏（調べられない）。左 (23,9) は西の (22,9)、右 (24,9) は南の (24,10) から
		...[23, 24].map(
			(x): EventDef => ({
				id: `swing_${x}`,
				x,
				y: 9,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						if (s.flag("seen_blanko")) {
							await s.narrate("ブランコは、もう\nうごかない。");
							return;
						}
						await s.narrate("ブランコが、ふたつ\nならんで　とまっている。");
						return;
					}
					if (t === "asa") {
						await s.narrate("くさりに、朝つゆが\nついている。");
						return;
					}
					if (t === "yoru") {
						await s.narrate("ブランコ。外灯で、くさりが\nひかっている。");
						return;
					}
					await s.narrate("ブランコ。くさりが\nまだ　あたたかい。");
				},
			}),
		),
		{
			id: "slide",
			x: 28,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("すべりだいの　てすりが、\n外灯で　白い。");
					return;
				}
				if (t === "asa") {
					await s.narrate("だれかが、もう\nひとすべりした跡がある。");
					return;
				}
				await s.narrate("すべりだいの下に、\nくつあとが　いっぱいだ。");
			},
		},
		...[26, 27].map(
			(x): EventDef => ({
				id: `sandbox_${x}`,
				x,
				y: 10,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						await s.narrate("すなの山は、くずれずに\nのこっている。");
						return;
					}
					if (t === "asa") {
						await s.narrate("山の上に、はっぱが\n一まい　のっている。");
						return;
					}
					await s.narrate("すなばに、大きな山と\nトンネル。こうじちゅうだ。");
				},
			}),
		),
		{
			id: "fountain",
			x: 29,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("水のみ場。ぽつ、ぽつ、と\nしずくの音。");
					return;
				}
				if (t === "asa") {
					await s.narrate("水のみ場の水が、\nきらきらしている。");
					return;
				}
				await s.narrate("水のみ場。じゃぐちが\nすこし　ゆるい。");
			},
		},
		{
			// 公園の西のすみ。(22,8) をあけて、(21,9)(22,9) へ入れるようにしてある
			// （公園の看板・ベンチ西・左のブランコを、そこから調べる）
			id: "park_lamp",
			x: 21,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("外灯の下だけ、\n地面が　しろい。");
					return;
				}
				if (t === "asa") {
					await s.narrate("外灯は、もう\nきえている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("公園の外灯。じじ、と\n鳴りながら　ついている。");
					return;
				}
				await s.narrate("公園の外灯。\nまだ、ついていない。");
			},
		},
		{
			id: "park_sign",
			x: 21,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『すみれこうえん』");
				await s.narrate("『よる9時いこうの\nりようは　ごえんりょください』");
				if (s.flag("tod") === "shinya") {
					await s.say("kiriko", "……9時は、とっくに\nすぎてるンゴ");
				}
			},
		},
		...[22, 23].map(
			(x): EventDef => ({
				id: `bench_${x}`,
				x,
				y: 10,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						await s.narrate("グローブは、ベンチの下に\nそのままだ。");
						return;
					}
					if (t === "asa") {
						await s.narrate("グローブが、\nなくなっている。");
						return;
					}
					await s.narrate("ベンチのしたに、\n野球のグローブ。");
					await s.say("kiriko", "わすれものンゴ");
				},
			}),
		),

		// ── 緑地（花だん・掲示板・じはんき・街灯） ──
		{
			id: "hanadan",
			x: 14,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("花だん。ヒャクニチソウが\nまだ　さいている。");
			},
		},
		...[15, 16].map(
			(x): EventDef => ({
				id: `keijiban_${x}`,
				x,
				y: 11,
				trigger: "talk",
				run: async (s) => {
					await s.narrate("町内の掲示板。\n『秋祭りは　11/3』");
					await s.narrate("『犬のふんは\nもちかえりましょう』の紙。");
					if (s.flag("tod") === "asa") {
						await s.narrate("『あさのラジオたいそう』の\n紙が、ふえている。");
					}
				},
			}),
		),
		{
			// 深夜は、灯っている自販機で温かい缶が一本買える（nostalgia.md P0-6。
			// 買ったあとは、いまの温度を1行。のみほしたあとは何も足さない）
			id: "vending",
			x: 18,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("じはんき。うなりと、\nあかり。");
					await kanShinya(s);
					return;
				}
				if (t === "asa") {
					await s.narrate("『あたたか～い』の札が\nひとつだけ　ある。");
					return;
				}
				await s.narrate("じはんき。ならびが、\nぜんぶ　コーヒーだ。");
				await s.say("kiriko", "……そんなにンゴ？");
			},
		},

		// ── すみれ歯科（夕方だけ灯り） ──
		{
			id: "dental_win",
			x: 9,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("くらい。サボテンのかげが\nまどに　ある。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あかりは、まだない。\nスリッパが、ならべてある。");
					return;
				}
				if (t === "yoru") {
					// 診療は18時まで（灯りは夕方だけ）。宵は においだけ。
					// 閉まった建物の中からの水の音は書かない（すぐ北の校門＝深夜の pool と同じ文法になる）
					await s.narrate("まどの　すきまから、\n歯医者の　においが　する。");
					return;
				}
				await s.narrate("まちあいしつに、あかり。");
				await s.narrate("『歯みがきカレンダー』の\n紙が、はってある。");
			},
		},
		{
			id: "dental_door",
			x: 11,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『すみれ歯科』");
				const t = s.flag("tod");
				// 宵も、もう診療時間の外（18時まで）
				if (t === "shinya" || t === "yoru") {
					await s.narrate("『じかんがい』の札が\nかかっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("けさの新聞が、ドアに\nはさまっている。");
					return;
				}
				await s.narrate("『本日の診療は\n18時まで』の札。");
			},
		},

		// ── 月ぎめパーキング（深夜＝seisanki） ──
		{
			id: "seisanki",
			x: 1,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("車は、一台もない。");
					await s.wait(600);
					await s.narrate("……精算機のランプだけ、\nじゅんに　ついていく。");
					await s.note("seisanki");
					return;
				}
				if (t === "asa") {
					await s.narrate("精算機は、しずかだ。\nランプも、きえている。");
					return;
				}
				await s.narrate("月ぎめの精算機。");
				await s.narrate("りょうしゅう書のボタンが\nへこんでいる。");
			},
		},
		{
			id: "parking_sign",
			x: 6,
			y: 8,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『月ぎめパーキング』\n『契約者　ぼしゅう中』");
				if (s.flag("tod") !== "shinya") {
					await s.narrate("がらんとしている。\n『空きあり』の札。");
				}
			},
		},

		// ── 大どおり（東端＝カーブミラー・西＝ごみ集積所） ──
		{
			id: "mirror",
			x: 38,
			y: 12,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"カーブミラーに、まがった\n道と、じぶんだけが　うつる。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("カーブミラーに、あさの空が\nまるく　うつっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("カーブミラーに、街灯が\nまるく　うつっている。");
					return;
				}
				await s.narrate("カーブミラーに、\n夕やけが　うつっている。");
			},
		},
		...[1, 2].map(
			(x): EventDef => ({
				id: `gomi_${x}`,
				x,
				y: 13,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						await s.narrate(
							"ごみ集積所。カラスよけの\nネットが、たたんである。",
						);
						return;
					}
					if (t === "asa") {
						await s.narrate("ごみぶくろが、きちんと\nならんでいる。");
						await s.narrate("カラスが、電線から\n見ている。");
						return;
					}
					await s.narrate("ごみ集積所。かいしゅうは\nもう　おわっている。");
				},
			}),
		),

		// ── やまだ家（ピアノの家） ──
		// 夕方と宵に、おなじところでつっかえるのを聞いておくと（seen_piano_yu）、
		// 朝はそこを「こえた」になる（nostalgia.md P0-11。うまくなった、とは書かない）
		{
			id: "yamada_door",
			x: 11,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『やまだ』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ピアノは、やんでいる。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_piano_yu")) {
						await s.narrate("ピアノの音。きのう\nつっかえたところ――");
						await s.narrate("……こえた。");
						return;
					}
					await s.narrate("けさは、テレビの\n天気よほうの音。");
					return;
				}
				s.set("seen_piano_yu");
				if (t === "yoru") {
					await s.narrate("なかから、ピアノ。\nまた、おなじところで――");
					await s.narrate("……つっかえた。");
					return;
				}
				await s.narrate("なかから、ピアノの\nれんしゅうの音。");
				await s.narrate("おなじところで、\nつっかえている。");
			},
		},
		{
			id: "yamada_win",
			x: 13,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("まっくらだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("カーテンが、\nあけてある。");
					return;
				}
				await s.narrate("レースのカーテンごしに、\nゆげが　見える。");
			},
		},

		// ── おおた家（深夜＝denwa） ──
		{
			id: "oota_door",
			x: 17,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『おおた』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.wait(500);
					await s.narrate("――家の中で、電話が\n鳴りつづけている。");
					await s.narrate("だれも、出ない。");
					await s.say("kiriko", "……るすンゴ？");
					await s.note("denwa");
					return;
				}
				if (t === "asa") {
					await s.narrate("牛乳うけに、びんが\n二本　ささっている。");
					return;
				}
				await s.narrate("よびりんの下に、\n『セールスおことわり』。");
			},
		},
		{
			id: "oota_win",
			x: 19,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("あかりは、ない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ふとんが、まどに\nほしてある。");
					return;
				}
				await s.narrate("テレビの音と、\nおふろの音。");
			},
		},

		// ── 家のうら（物干し・犬小屋・うえ木） ──
		{
			id: "monohoshi",
			x: 9,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ふとんが、夜つゆに\nぬれはじめている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ぱん、ぱん、と\nたたく音は、ここだった。");
					return;
				}
				await s.narrate("ふとんが、とりこまれずに\nのこっている。");
			},
		},
		{
			id: "kennel",
			x: 15,
			y: 19,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("犬小屋は、からっぽだ。");
					await s.narrate("家の中から、いびきの音。");
					return;
				}
				if (t === "asa") {
					await s.narrate("犬が、あくびをした。\nしっぽの先が、白い。");
					return;
				}
				if (!s.flag("seen_kennel")) {
					s.set("seen_kennel");
					await s.narrate("犬小屋。『ぽち』と\n書いてある。");
					await s.narrate("なかで、犬が\nねている。");
					return;
				}
				await s.narrate("犬が、かた目だけあけて\nこっちを見た。");
			},
		},
		{
			id: "ueki",
			x: 20,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("よく刈りこまれた\nうえ木だ。");
			},
		},

		// ── こんどう家（大どおりの北がわ） ──
		{
			id: "kondo_win",
			x: 35,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("あまどが、しまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あまどを　あける音が、\nいま　した。");
					return;
				}
				if (t === "yoru") {
					// 部屋のテレビと同じナイター（nostalgia.md P0-2）。延長の段には関係なく「実況」だけ。
					// 回・点数・チーム名は言わない（数字を言い切るのは apart の朝刊の1か所だけ）
					await s.narrate("窓のおくから、ナイターの\n実況が　きこえる。");
					await s.narrate(
						"『打った、大きい――』\nのあと、家じゅうで　ためいき。",
					);
					return;
				}
				await s.narrate("窓のおく、やきゅう中継の\n音がする。");
			},
		},
		{
			id: "kondo_door",
			x: 37,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『こんどう』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("しずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("そうじきの音がする。");
					return;
				}
				await s.narrate("ぎょうざのにおいが、\nすきまから　もれてくる。");
			},
		},

		// ── 空き地（柵の一枚（26,13）だけ、見た目のまま通れる＝隠し） ──
		// 深夜は、ひみつきちに しゃがめる（nostalgia.md P0-7。座れる3か所のひとつ）。
		// 数秒なにも起きず、音がひとつ増えて、ボケで閉じる。何も起きない・ノートにも書かない。
		// 2回目からは短い1行だけ（seen_kichi_shinya。左右の板で共用）
		...[24, 25].map(
			(x): EventDef => ({
				id: `kichi_board_${x}`,
				x,
				y: 14,
				trigger: "talk",
				run: async (s) => {
					if (s.flag("tod") === "shinya") {
						if (s.flag("seen_kichi_shinya")) {
							await s.narrate("ひみつきちに　しゃがんで、\nすこし　外を見た。");
							return;
						}
						await s.narrate("『ひみつきち　だいほんぶ』。");
						const i = await s.choose(["＞＞1 しゃがむ", "＞＞2 やめておく"], {
							cancel: 1,
						});
						if (i !== 0) return;
						s.set("seen_kichi_shinya");
						await s.narrate("ひみつきちに、しゃがんだ。\n……ひざが、つかえる。");
						await s.wait(2500);
						await s.narrate("板のすきまから、外灯が\nひとつだけ　見える。");
						// 手に缶があれば、じはんきのうなりの代わりに缶の1行（一段さめる）
						if (kanHeld(s)) {
							await kanLine(s);
						} else {
							s.se("hum", { pan: -0.5, volume: 0.25 });
							await s.narrate("とおくで、じはんきが\nひくく　うなっている。");
						}
						await s.say("kiriko", "（メンバーに、\nなった気がするンゴ）");
						return;
					}
					await s.narrate("板に、マジックで\n『ひみつきち　だいほんぶ』。");
					await s.narrate("したに、小さく\n『メンバーぼしゅう中』。");
					await s.say("kiriko", "……入りたいンゴ");
				},
			}),
		),
		{
			id: "kichi_crate_a",
			x: 23,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("木箱。なかに、ジュースの\nあきかんが　三本。");
			},
		},
		{
			id: "kichi_crate_b",
			x: 27,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("木箱のうえに、\nひらべったい石が　三つ。");
				await s.narrate("……たからもの、かも\nしれない。");
			},
		},

		// ── 杉やぶの小道（せみのぬけがら・野球のボール） ──
		{
			id: "semi",
			x: 33,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("木のみきに、せみの\nぬけがらが　そのままだ。");
					return;
				}
				await s.narrate("木のみきに、せみの\nぬけがらが　のこっている。");
			},
		},
		{
			id: "yabu_ball",
			x: 36,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("やぶのおくに、野球の\nボール。だれかのだ。");
			},
		},

		// ── 坂道（川へ下りる。手すりの向こうに川） ──
		{
			id: "saka_rail",
			x: 4,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("川は、見えない。\n水の音だけ、のぼってくる。");
					return;
				}
				if (t === "asa") {
					await s.narrate("手すりのむこう、川が\nあさの色で　ひかっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("手すりのむこう、川に\n街灯が　ゆれている。");
					return;
				}
				await s.narrate("手すりのむこう、川が\nひかっている。");
			},
		},
		{
			id: "saka_sign",
			x: 7,
			y: 21,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『かわらのみち　→』\n『じてんしゃは　おりて』");
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		npc(
			"taiso_jii",
			28,
			10,
			ELDER,
			async (s) => {
				if (!s.flag("seen_taiso_jii")) {
					s.set("seen_taiso_jii");
					await s.say(null, "たいそうはな、ゆうがたも\nあるんだよ。第二がね", {
						name: "じいさん",
					});
					await s.say("kiriko", "だいに、ンゴ？");
					await s.say(null, "第一より、こしに\nくるんだ、これが", {
						name: "じいさん",
					});
					return;
				}
				await s.say(null, "……いま、こしを\nのばしてるところ", {
					name: "じいさん",
				});
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"juku_ko",
			21,
			12,
			CHILD,
			async (s) => {
				if (!s.flag("seen_juku_ko")) {
					s.set("seen_juku_ko");
					await s.say(null, "じゅくの前に、ちょっと\nよりみち。ないしょね", {
						name: "じゅくの子",
					});
					await s.say("kiriko", "なにも　見てないンゴ");
					await s.say(null, "よし", { name: "じゅくの子" });
					return;
				}
				await s.say(null, "えいごの　たんご、\n三つだけ　おぼえた", {
					name: "じゅくの子",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"bebika",
			10,
			12,
			WOMAN,
			async (s) => {
				if (!s.flag("seen_bebika")) {
					s.set("seen_bebika");
					await s.narrate("ベビーカーの中で、\nあかちゃんが　ねている。");
					await s.say(null, "やっと　ねたところ\nなんです", {
						name: "ベビーカーの人",
					});
					await s.say("kiriko", "（……しずかに\n歩くンゴ）");
					return;
				}
				await s.say(null, "このまま、もう一しゅう\nしてきます", {
					name: "ベビーカーの人",
				});
			},
			{ dir: "right", when: (st) => st.flags.tod === "yu" },
		),
		// 井戸端のふたり（掛け合い）。ごみ集積所のかどで、きょうも会議中
		npc(
			"obachan_a",
			4,
			13,
			SPR.woman,
			async (s) => {
				if (!s.flag("seen_obachan")) {
					s.set("seen_obachan");
					await s.say(null, "スーパーみなみ、きょう\nたまごが　安いのよ", {
						name: "おばちゃん",
					});
					await s.say(null, "あら。それ、きのうの\nちらしじゃない？", {
						name: "となりのおばちゃん",
					});
					await s.say(null, "…………", { name: "おばちゃん" });
					await s.say(null, "たしかめてくる", { name: "おばちゃん" });
					return;
				}
				await s.say(null, "きょうは、ここまでの\nはなし", {
					name: "おばちゃん",
				});
			},
			{ dir: "right", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"obachan_b",
			5,
			13,
			GRANDMA,
			async (s) => {
				await s.say(null, "はなしはね、ながさより\nかいすうなのよ", {
					name: "となりのおばちゃん",
				});
				await s.say("kiriko", "ふかいンゴ……");
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"uchimizu",
			14,
			17,
			SPR.townsfolk,
			async (s) => {
				if (!s.flag("seen_uchimizu")) {
					s.set("seen_uchimizu");
					await s.narrate("ひしゃくで、みちに\n水を　まいている。");
					await s.say(null, "ゆうがたは、これを\nやらないとね", {
						name: "うちみずの人",
					});
					await s.say("kiriko", "なんでンゴ？");
					await s.say(null, "なんでだろうね。\nおやじも、やってたから", {
						name: "うちみずの人",
					});
					return;
				}
				await s.say(null, "ぬれた道のにおいは、\nゆうがたの　においだよ", {
					name: "うちみずの人",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（セリフ全差し替え。夕方の setup の payoff） ──
		npc(
			"gakko_ko",
			11,
			6,
			CHILD,
			async (s) => {
				if (!s.flag("seen_gakko_ko")) {
					s.set("seen_gakko_ko");
					await s.say(null, "しゅうごう、7時半。\n……まにあう、はず", {
						name: "とうこうの子",
					});
					return;
				}
				await s.say(null, "わすれものは、ない。\nたぶん、ない", {
					name: "とうこうの子",
				});
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"gomidashi",
			3,
			13,
			SPR.woman,
			async (s) => {
				if (!s.flag("seen_gomidashi")) {
					s.set("seen_gomidashi");
					await s.say(null, "セーフ、セーフ。\n8時まえ、セーフ", {
						name: "ごみ出しの人",
					});
					await s.say("kiriko", "……なにがンゴ？");
					return;
				}
				await s.say(null, "もえるゴミは、かようと\nきんよう。おぼえた？", {
					name: "ごみ出しの人",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"jii_asa",
			19,
			6,
			ELDER,
			async (s) => {
				if (!s.flag("seen_jii_asa")) {
					s.set("seen_jii_asa");
					await s.say(null, "これから、あさの\nたいそう。第一のほう", {
						name: "じいさん",
					});
					await s.say("kiriko", "だいいちンゴ");
					await s.say(null, "第二はな、夕方に\nとってあるんだ", {
						name: "じいさん",
					});
					return;
				}
				await s.say(null, "つづけるのが\nコツだよ。……たぶん", {
					name: "じいさん",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"haisha_asa",
			10,
			12,
			MAN_B,
			async (s) => {
				if (!s.flag("seen_haisha_asa")) {
					s.set("seen_haisha_asa");
					await s.narrate("歯科の前を、ほうきで\nはいている。");
					await s.say(null, "あけるまえの　そうじが、\nしごとの　半分でね", {
						name: "歯医者さん",
					});
					return;
				}
				await s.say(null, "きょうも、むし歯ゼロだと\nいいんだけどね", {
					name: "歯医者さん",
				});
			},
			{ dir: "up", when: (st) => st.flags.tod === "asa" },
		),
	],
};
