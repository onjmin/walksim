// すみれ町（住宅街の本体）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 40×24・outdoor・BGM null（生活音だけ）。walksim の本体＝日常。
//
// 四つの顔（flags.tod）:
//   夕方  … 生きた住宅街。NPC 6体（たいそう帰り・塾かばん・ベビーカー・井戸端×2・うちみず）。
//           歯科に灯り・家々の窓明かり
//   宵    … NPC 0体（docs/nostalgia.md P0-1）。家々の窓にテレビの音・公園の外灯がつく。
//           文は「におい・音・点いた灯り」だけ（減った人・消えた窓は書かない）。
//           やまだ家のピアノは、また　おなじところでつっかえる（seen_piano_yu・P0-11）。
//           こんどう家からナイターの実況。げんかんの空きびんが yoruStep で増える（延長の時計・P0-2）
//   深夜  … 無人（NPC 0体・必達）。
//           ひみつきちに しゃがめる（seen_kichi_shinya・P0-7）。じはんきで温かい缶が一本買え、
//           地区を移るたびに冷める（onEnter の kanTick・P0-6）
//   朝    … NPC 4体（登校の子・ごみ出し・たいそう帰りのじいさん・歯科のそうじ）。
//           夕方・深夜に見たものの行き先だけを、見た人に1〜3行（下の「すみれの筋」）
// 二度目で下の層が見える: 校門のプレート（『80』のふちから『70』。seen_gate_plate・P0-8）。
//
// すみれの筋（2026-10-04。どれも前振りを s.flag で確かめ、見ていない人には別の文）:
//   グローブ   bench（seen_glove_sumire）→ 朝、こんどう家の　びんケースのよこ（kondo_door）
//   子犬       koinu_poster（seen_koinu）→ 深夜の kennel（seen_koinu_mitsuke）→ 朝の貼り紙・kirokuLines。
//              貼り紙を見ずに深夜の犬小屋で会った人は seen_koinu_dare → 朝の貼り紙で mitsuke になる。
//              宵・深夜に miura_win の水のおさらを見た人（seen_koinu_sara）→ 朝『ひっこめてある』
//   自転車     alley_bike（seen_jitensha_sumire）→ 朝の takahashi_door（しかられる声）
//   『70』     gate_plate 2回目（seen_gate_70）→ fence_sakura のくい（seen_sakura_70）
//   トンネル   sandbox（seen_suna_tunnel）→ 深夜にほる（seen_suna_nuke）→ 朝『だれ？』
//   車         seisanki 宵か深夜（seen_kuruma_sumire）→ 深夜のつゆ → 朝のかわいた四角
//   早いごみ   gomi 深夜（seen_gomi_hayai）→ 朝のカラス・gomidashi
//   缶と石     kichi_crate_a 深夜（seen_kan_kichi。缶はもちかえる → 朝は room desk の机の缶・木箱で一言）・
//              kichi_crate_b（seen_kichi_ishi → kawara の水きり）
//   一軒の夜   takahashi_door: 夕方のおふろ → 宵のドライヤー → 朝のせんたくき（＋自転車の声）
//   しらさぎ㉒ saka_rail 夕方『中州に白い点』（seen_sagi_saka）→ 朝の saka_rail・kawara sagiBelt
//   ねこ⑤     alley_box 夕方か宵（seen_neko_sumire）→ 深夜は毛だけ → 朝『もどっている』
//   ピアノ     yamada_door か arrive_yu（夕方に着いた人）→ 朝『……こえた』
//   ひみつきち kichi_board 宵『夜は、るす』→ 深夜にしゃがむ（seen_kichi_shinya）→ 朝の板
//   ほかの地区から: たまご⑰（seen_obachan）・ゴミの日⑯・秋まつり③・ささぶね㉓・牛乳（got_gyunyu）・
//              中継の打ち切り（room tv の seen_chukei_end → kondo_win 宵）・
//              ふとんのばあちゃん㉚（danchi の seen_futon_tori → monohoshi 宵）・
//              体操のじいさん㊽（danchi の seen_taiso_danchi → jii_asa 2回目）
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
import {
	arrived,
	kanHeld,
	kanLine,
	kanLv,
	kanShinya,
	kanTick,
	numFlag,
	yoruAkubi,
	yoruStep,
} from "../nostalgia";
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
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
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
			// やまだ家のピアノのつっかえを、着いたときにも一度（P0-11）。
			// 夕方に着いた人は、朝の yamada_door で『……こえた』を聞ける（arrived で読む）
			id: "arrive_yu",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				await s.wait(500);
				await s.narrate(
					"どこかの家から、ピアノ。\n……おなじところで、とまった。",
				);
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
				// 夕方のベビーカー（bebika）で言った心の声を、深夜にもう一度（回収）
				if (s.flag("seen_bebika"))
					await s.say("kiriko", "（……しずかに\n歩くンゴ）");
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

		// ── 小学校（校門はいつも閉まっている） ──
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
						await s.narrate(
							"校舎の　非常口の　みどりの\nあかりだけが　ついている。",
						);
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
				// 『70』に気づいた人は、校庭の桜のくい（fence_sakura）で もう一度　会う
				s.set("seen_gate_70");
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
				if (t === "yoru") {
					// 宵は外灯がとどかず、くいの字は読めない（『70』の回収は夕方と朝だけ）
					await s.narrate("外灯が　とどかない。\n木の　かたちだけ　見える。");
					return;
				}
				if (t === "asa") {
					await s.narrate("すずめが、えだに\nならんでいる。");
				} else {
					await s.narrate("いまは、葉っぱだけが\nしげっている。");
				}
				// 校門のプレートの『70』（gate_plate 2回目・seen_gate_70）を回収。一度だけ
				if (s.flag("seen_gate_70") && !s.flag("seen_sakura_70")) {
					s.set("seen_sakura_70");
					await s.narrate("ねもとの　くいに、\n『70しゅうねん　きねん』。");
					await s.say("kiriko", "（……あの　70ンゴ）");
				}
			},
		},

		// ── 裏の路地（東で street へ。生活のうらがわ） ──
		{
			// ⑤ ねこ: 夕方か宵に見た人（seen_neko_sumire）だけ、深夜にタオルが　ねこの形によれ、朝『もどっている』。
			// （深夜の『毛だけ』は　ekimae crates_b の役なので、ここは　タオルのよれ）
			// 深夜は『からっぽ』と書かない（いないことを言わず、物ののこりで見せる）
			id: "alley_box",
			x: 29,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						s.flag("seen_neko_sumire")
							? "だんボールの　なかの　タオルが、\nねこの　かたちに　よれている。"
							: "路地の　だんボールが、\n夜つゆで　くたっとしている。",
					);
					return;
				}
				if (t === "asa") {
					if (!s.flag("seen_neko_sumire")) {
						await s.narrate(
							"だんボールのなかで、ねこが\n毛づくろいを　している。",
						);
						return;
					}
					await s.narrate("だんボールに、ねこが\nもどっている。");
					// ⑤ 夜の あつまりを 見た 人だけ
					if (s.flag("seen_neko_shukai"))
						await s.narrate("せなかの　毛が、夜つゆで\nしっとり　している。");
					return;
				}
				s.set("seen_neko_sumire");
				if (t === "yoru") {
					await s.narrate("だんボールの　ふちに、ねこが\nあごを　のせている。");
					return;
				}
				await s.narrate("だんボールのなかで、\nねこが　まるくなっている。");
			},
		},
		{
			// たおれた自転車（seen_jitensha_sumire）→ 朝、たかはし家の　しかる声（takahashi_door）
			id: "alley_bike",
			x: 30,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (s.flag("seen_jitensha_sumire")) {
						await s.narrate("自転車が、ちゃんと\n立ててある。");
						return;
					}
					await s.narrate("子ども用の自転車が、\n立ててある。");
					return;
				}
				s.set("seen_jitensha_sumire");
				if (t === "shinya") {
					await s.narrate("子ども用の自転車が、\nたおれたままだ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("たおれたまま、ベルだけ\n上を　むいている。");
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
					// 路地のたおれた自転車（alley_bike）を見た人だけ
					if (s.flag("seen_jitensha_sumire")) {
						await s.narrate(
							"『じてんしゃ、たおしっぱなし\nだったでしょ！』の声。",
						);
						await s.say("kiriko", "（……ばれたンゴね）");
					}
					return;
				}
				if (t === "yoru") {
					// 一軒の夜を音で進める: 夕方のおふろ → 宵のドライヤー → 朝のせんたくき
					await s.narrate("なかから、ドライヤーの\n音。");
					return;
				}
				await s.narrate("なかから、『おふろ\nわいたよー』の声。");
			},
		},
		{
			// 子犬の筋: 貼り紙（seen_koinu）→ 深夜の犬小屋で見つける（kennel・seen_koinu_mitsuke）
			// → 朝の『みつかりました』・みうら家のおさら（miura_win）・まとめ（kirokuLines）
			id: "koinu_poster",
			x: 35,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべの貼り紙。『こいぬを\nさがしています』");
				await s.narrate("しっぽの先だけ白い、と\n書いてある。");
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("うえに、あたらしい紙。\n――『みつかりました』");
					if (s.flag("seen_koinu_mitsuke")) {
						await s.say("kiriko", "（犬小屋の、あの\nしっぽンゴ）");
					} else if (s.flag("seen_koinu_dare")) {
						// 貼り紙を見ずに、深夜の犬小屋で会った人（kennel・seen_koinu_dare）。
						// ここで貼り紙とつながる（まとめ kirokuLines の子犬の行がのる）
						s.set("seen_koinu_mitsuke");
						await s.say("kiriko", "（……犬小屋の、\nあの　ちいさいのンゴ）");
					}
					return;
				}
				s.set("seen_koinu");
				// 深夜、さきに犬小屋の子犬（kennel・seen_koinu_dare）を見てから　ここを読んだ人は、
				// その場でつながる（dare は深夜にしか立たない）
				if (s.flag("seen_koinu_dare") && !s.flag("seen_koinu_mitsuke")) {
					s.set("seen_koinu_mitsuke");
					await s.say("kiriko", "（……犬小屋の、\nあの　ちいさいのンゴ）");
					return;
				}
				if (t === "yoru")
					await s.narrate("でんちゅうにも、\nおなじ紙が　はってある。");
			},
		},
		{
			// 子犬を待つ家。宵に出した水のおさら（宵・深夜に見た人は seen_koinu_sara）は、
			// 子犬が見つかった朝には　ひっこめてある（見ていない人には、においだけ）
			id: "miura_win",
			x: 36,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					s.set("seen_koinu_sara");
					await s.narrate("くらい。れいぞうこの音が\nかすかに　している。");
					// 子犬は　犬小屋（kennel）にいて、ここへは　もどっていない
					await s.narrate("おさらの　水は、\nへっていない。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_koinu_sara"))
						await s.narrate("まどの下の　おさらは、\nもう　ひっこめてある。");
					await s.narrate("みそしるの　においがする。");
					return;
				}
				if (t === "yoru") {
					s.set("seen_koinu_sara");
					await s.narrate("まどの下に、水の　おさらが\n出してある。");
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
			// ㉓ ささぶね: 夕方に流れていくのを見た人（seen_sasabune）は、朝の kawara hashi_ue で
			// 岸にひっかかった　ささぶねに　会う
			id: "mizo",
			x: 38,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					s.set("seen_sasabune");
					await s.narrate("ささの葉の　ふねが、\nみぞを　ながれていく。");
					return;
				}
				if (t === "asa") {
					await s.narrate("みぞの水が、すんでいる。");
					return;
				}
				await s.narrate("みぞの水の音だけが、\nしている。");
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
					// 登校の子（gakko_ko）の「まにあう、はず」を聞いた人だけ
					if (s.flag("seen_gakko_ko"))
						await s.say("kiriko", "（……まにあう、はずンゴ）");
					return;
				}
				if (t === "yoru") {
					await s.narrate("すべり面に、外灯が\nながく　うつっている。");
					return;
				}
				await s.narrate("すべりだいの下に、\nくつあとが　いっぱいだ。");
			},
		},
		// すなばのトンネル: 夕方の「こうじちゅう」（seen_suna_tunnel）→ 深夜に　むこうまで　ほる
		// （seen_suna_nuke）→ 朝、子どもの字で『だれ？』。左右の2マスで共用
		...[26, 27].map(
			(x): EventDef => ({
				id: `sandbox_${x}`,
				x,
				y: 10,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						if (s.flag("seen_suna_nuke")) {
							await s.narrate(
								"トンネルの　むこうに、\n外灯が　ちいさく　見える。",
							);
							return;
						}
						await s.narrate("すなの山は、くずれずに\nのこっている。");
						if (!s.flag("seen_suna_tunnel")) return;
						const i = await s.choose(
							["＞＞1 トンネルを　ほる", "＞＞2 やめておく"],
							{
								cancel: 1,
							},
						);
						if (i !== 0) return;
						s.set("seen_suna_nuke");
						await s.narrate("てが、すなで　つめたい。");
						await s.wait(1200);
						await s.narrate("……むこうまで、ぬけた。");
						return;
					}
					if (t === "asa") {
						if (s.flag("seen_suna_nuke")) {
							await s.narrate(
								"トンネルが、ぬけている。\nよこに、えだで『だれ？』",
							);
							await s.say("kiriko", "（……吾輩ンゴ）");
							return;
						}
						await s.narrate("山の上に、はっぱが\n一まい　のっている。");
						return;
					}
					s.set("seen_suna_tunnel");
					if (t === "yoru") {
						await s.narrate(
							"トンネルの　入り口に、\nスコップが　ささったまま。",
						);
						return;
					}
					await s.narrate("すなばに、大きな山と\nトンネル。こうじちゅうだ。");
				},
			}),
		),
		{
			// ゆるいじゃぐち（seen_jaguchi）→ 朝、ひとばんぶんの水たまり
			id: "fountain",
			x: 29,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (s.flag("seen_jaguchi")) {
						await s.narrate("水のみ場の　下に、\nひとばんぶんの　水たまり。");
						return;
					}
					await s.narrate("水のみ場の水が、\nきらきらしている。");
					return;
				}
				s.set("seen_jaguchi");
				if (t === "shinya") {
					await s.narrate("水のみ場。ぽつ、ぽつ、と\nしずくの音。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("じゃぐちの　先で、しずくが\nふくらんでは　おちる。");
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
		// わすれものの　グローブ（seen_glove_sumire）→ 朝、こんどう家の　びんケースのよこ（kondo_door）
		...[22, 23].map(
			(x): EventDef => ({
				id: `bench_${x}`,
				x,
				y: 10,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "asa") {
						await s.narrate(
							s.flag("seen_glove_sumire")
								? "グローブが、なくなっている。"
								: "ベンチは、つゆで　ぬれている。",
						);
						return;
					}
					const seen = s.flag("seen_glove_sumire");
					s.set("seen_glove_sumire");
					if (t === "shinya") {
						await s.narrate(
							seen
								? "グローブは、ベンチの下に\nそのままだ。"
								: "ベンチの下に、野球の　グローブ。\nつゆで　しめっている。",
						);
						return;
					}
					if (t === "yoru") {
						await s.narrate(
							"ベンチの下の　グローブ。\n外灯で、かげが　ながい。",
						);
						return;
					}
					await s.narrate("ベンチのしたに、\n野球のグローブ。");
					await s.say("kiriko", "わすれものンゴ");
				},
			}),
		),

		// ── 緑地（掲示板・じはんき・街灯） ──
		// ③ 秋まつり: seen_aki_sumire → room calendar（asa）・yamamichi susuki（akiMatsuri）。
		// となりまちのポスター（seen_aki_tonari）を見た人には、一度だけキリコの一言（seen_aki_kurabe）
		...[15, 16].map(
			(x): EventDef => ({
				id: `keijiban_${x}`,
				x,
				y: 11,
				trigger: "talk",
				run: async (s) => {
					// 朝より前（夕方〜深夜）に読んだ人（mae）にだけ、朝の一回目で『ふえている』。朝の二回目からと、
					// はじめて読む朝の人には、ただ『はってある』（朝の紙を見たら seen_taiso_kami）
					const mae = !!s.flag("seen_aki_sumire") && !s.flag("seen_taiso_kami");
					s.set("seen_aki_sumire");
					await s.narrate("町内の掲示板。\n『つきみ秋まつり　らいげつ』");
					if (s.flag("seen_aki_tonari") && !s.flag("seen_aki_kurabe")) {
						s.set("seen_aki_kurabe");
						await s.say("kiriko", "（となりまちの、\nあれンゴ）");
					}
					await s.narrate("『犬のふんは\nもちかえりましょう』の紙。");
					// 時刻は jii_asa（たいそうの　かえり）・団地の 6時半の会とそろえる
					if (s.flag("tod") === "asa") {
						s.set("seen_taiso_kami");
						await s.narrate(
							mae
								? "『ラジオたいそう　6時半』の\n紙が、ふえている。"
								: "『ラジオたいそう　6時半』の\n紙も　はってある。",
						);
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
				// 夕方は　ぜんぶコーヒー → 宵に赤い札がひとつ → 深夜はそれが一本買える → 朝もひとつだけ
				if (t === "yoru") {
					await s.narrate(
						"あかりの　なかに、ひとつだけ\n『あたたか～い』の　赤い札。",
					);
					// 通りの自販機の　はしの一列（street vending_ev・seen_akafuda_st）を見てきた人は、くらべる
					await s.say(
						"kiriko",
						s.flag("seen_akafuda_st")
							? "（こっちは、まだ\nひとつだけンゴ）"
							: "（……まだ　九月ンゴ）",
					);
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
				// 歯みがきカレンダー（seen_hamigaki）→ 朝の歯医者さん（haisha_asa）の「みがいた？」
				s.set("seen_hamigaki");
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

		// ── 月ぎめパーキング ──
		{
			// 宵に帰ってきた一台（seen_kuruma_sumire。人は書かず、さめるエンジンの音だけ）
			// → 深夜のつゆ → 朝、一台ぶんだけ　かわいた地面
			id: "seisanki",
			x: 1,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					s.set("seen_kuruma_sumire");
					await s.narrate("一台だけ、とまっている。");
					s.se("tick", { volume: 0.3 });
					await s.narrate("エンジンが、かち、かち、と\nさめていく音。");
					return;
				}
				if (t === "shinya") {
					// 車は、宵に見ていなくても　ある（ここで見た人も　朝の四角へ）
					s.set("seen_kuruma_sumire");
					await s.narrate("一台。フロントガラスに\nつゆが　おりている。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_kuruma_sumire")
							? "一台ぶんの　しかくだけ、\n地面が　かわいている。"
							: "精算機は、しずかだ。\nランプも、きえている。",
					);
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
		// 深夜に　もう出てる　ふくろ（seen_gomi_hayai）→ 朝のカラス・ごみ出しの人のぼやき（gomidashi）
		...[1, 2].map(
			(x): EventDef => ({
				id: `gomi_${x}`,
				x,
				y: 13,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						s.set("seen_gomi_hayai");
						await s.narrate(
							"ネットの下に、ふくろが\nひとつ。もう　出してある。",
						);
						return;
					}
					if (t === "asa") {
						await s.narrate("ごみぶくろが、きちんと\nならんでいる。");
						await s.narrate("カラスが、電線から\n見ている。");
						if (s.flag("seen_gomi_hayai"))
							await s.narrate(
								"はしの　ふくろだけ、\nカラスに　つつかれている。",
							);
						return;
					}
					if (t === "yoru") {
						await s.narrate("ネットが、かべに\nたたんで　かけてある。");
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
					// つっかえを聞いた人（ここで聞いたか、夕方に着いたときの arrive_yu）だけ
					if (s.flag("seen_piano_yu") || arrived(s, "sumire", "yu")) {
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
		// （窓 (13,17) は光源だけ。ピアノは yamada_door がもつ）

		// ── おおた家（うちみずの家。窓 (19,17) は光源だけで、話はげんかんにまとめる） ──
		{
			// うちみずの人（uchimizu・seen_uchimizu）の家。道の色で一晩をたどる:
			// 夕方のバケツ → 宵、げんかんの前だけ　くろい → 深夜に　かわく → 朝、もう　ぬれている
			id: "oota_door",
			x: 17,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『おおた』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("家の中は、しずかだ。");
					await s.narrate("げんかんの　まえの　道は、\nもう　かわいている。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"牛乳うけに、びんが　二本。\n道が、もう　ぬれている。",
					);
					// キリコは1つだけ（ゆうべ コンビニで牛乳を買った人 ＞ うちみずの人と話した人）
					if (s.flag("got_gyunyu"))
						await s.say("kiriko", "（吾輩のは、\nコンビニのンゴ）");
					else if (s.flag("seen_uchimizu"))
						await s.say("kiriko", "（あさも、やるンゴね）");
					return;
				}
				if (t === "yoru") {
					await s.narrate("げんかんの　まえだけ、\n道が　まだ　くろい。");
					return;
				}
				await s.narrate("よびりんの下に、\n『セールスおことわり』。");
				// うちみずの人と話した人だけ（まだ　まいている最中なので、ひしゃくは手の中）
				if (s.flag("seen_uchimizu"))
					await s.narrate(
						"げんかんわきの　バケツに、\n水が　はんぶん　のこっている。",
					);
			},
		},

		// ── 家のうら（物干し・犬小屋） ──
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
				if (t === "yoru") {
					await s.narrate(
						"ふとんは、まだ　ほしたまま。\n夜風で、すこし　ゆれている。",
					);
					// ㉚ 団地のふとんのばあちゃん（danchi futon_tori・seen_futon_tori）に会った人だけ
					if (s.flag("seen_futon_tori"))
						await s.say(
							"kiriko",
							"（団地の　ばあちゃんなら、\nたたきに　くるンゴ）",
						);
					return;
				}
				await s.narrate("ふとんが、とりこまれずに\nのこっている。");
			},
		},
		{
			// 深夜、ぽちの犬小屋に　しっぽの先だけ白い子犬（貼り紙 koinu_poster を見た人は
			// seen_koinu_mitsuke → 朝の貼り紙・まとめ）。貼り紙を見ていない人も、しっぽの白は見る
			// （seen_koinu_dare → 朝の貼り紙で『あの　ちいさいの』とつながる）。ぽちは夜、家の中
			id: "kennel",
			x: 15,
			y: 19,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					if (s.flag("seen_koinu_mitsuke") || s.flag("seen_koinu_dare")) {
						await s.narrate("しっぽの白いのが、\nねいきを　たてている。");
						return;
					}
					await s.narrate("犬小屋の　おくで、ちいさいのが\nまるまっている。");
					await s.narrate("しっぽの先だけ、白い。");
					if (s.flag("seen_koinu")) {
						s.set("seen_koinu_mitsuke");
						await s.say("kiriko", "（……ここに　いたンゴ）");
						return;
					}
					s.set("seen_koinu_dare");
					await s.say("kiriko", "（……だれンゴ？）");
					return;
				}
				if (t === "asa") {
					// 名前は、夕方・宵に犬小屋の『ぽち』を読んだ人だけ
					await s.narrate(
						s.flag("seen_kennel")
							? "ぽちが、あくびをした。"
							: "犬小屋の　犬が、\nあくびをした。",
					);
					// 深夜に子犬を見た人だけ（貼り紙を見ていてもいなくても）
					if (s.flag("seen_koinu_mitsuke") || s.flag("seen_koinu_dare"))
						await s.narrate("犬小屋の　しきわらに、\nちいさな　くぼみ。");
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
					// 部屋で中継の打ち切りを見た人（room tv・seen_chukei_end）には、この家のテレビも消える。
					// 『ぷつん』は一度だけ（seen_kondo_tv）。そのあとは、足される音（せんを　ぬく音。
					// kondo_door の　ふえる空きびんと　そろえる）
					if (s.flag("seen_chukei_end")) {
						if (!s.flag("seen_kondo_tv")) {
							s.set("seen_kondo_tv");
							await s.narrate("窓のおくの　テレビが、\nぷつん、と　きえた。");
							return;
						}
						await s.narrate("窓のおくで、ぽん、と\nせんを　ぬく音。");
						return;
					}
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
			// 宵の空きびんは、地区を回るほど増える（yoruStep＝延長の時計。P0-2 を強める。
			// 点数・回は言わない）。朝はケースにまとめてあり、ベンチのグローブ（seen_glove_sumire）が
			// そのよこにある（こんどう家の子のわすれもの、とは言わない）
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
					await s.narrate("ビールの　あきびんが、\nケースに　まとめてある。");
					if (s.flag("seen_glove_sumire"))
						await s.narrate("そのよこに、グローブ。\nつゆで　しめっている。");
					return;
				}
				if (t === "yoru") {
					// 宵は apart→street→sumire と来るので、ここで yoruStep は2から。2を「二本」にそろえる
					const n = ["二", "三", "四", "五"][
						Math.min(3, Math.max(0, yoruStep(s) - 2))
					];
					await s.narrate(`げんかんの　わきに、ビールの\nあきびんが　${n}本。`);
					return;
				}
				await s.narrate("ぎょうざのにおいが、\nすきまから　もれてくる。");
			},
		},

		// ── 空き地（柵の一枚（26,13）だけ、見た目のまま通れる＝隠し） ──
		// 深夜は、ひみつきちに しゃがめる（nostalgia.md P0-7。座れる3か所のひとつ）。
		// 数秒なにも起きず、音がひとつ増えて、ボケで閉じる。何も起きない・ノートにも書かない。
		// 2回目からは短い1行だけ（seen_kichi_shinya。左右の板で共用）。
		// 宵は『るす』（前振り）→ 深夜にしゃがむ → 朝、しゃがんだ人だけ『かってに入った』
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
					const t = s.flag("tod");
					// 宵は、るす（深夜にしゃがむ前振り）
					if (t === "yoru") {
						await s.narrate(
							"『ひみつきち　だいほんぶ』。\n板のすきまが、まっくらだ。",
						);
						await s.say("kiriko", "……夜は、るすンゴ");
						return;
					}
					// 朝は、深夜にしゃがんだ人（seen_kichi_shinya）だけ　ぼしゅうの字を読みかえす
					if (t === "asa") {
						if (s.flag("seen_kichi_shinya")) {
							await s.narrate("板の　『メンバーぼしゅう中』。");
							await s.say("kiriko", "（……ゆうべ、かってに\n入ったンゴ）");
							return;
						}
						await s.narrate(
							"朝の光で、『ひみつきち』の\nマジックの字が　よく見える。",
						);
						await s.say("kiriko", "……入りたいンゴ");
						return;
					}
					await s.narrate("板に、マジックで\n『ひみつきち　だいほんぶ』。");
					await s.narrate("したに、小さく\n『メンバーぼしゅう中』。");
					await s.say("kiriko", "……入りたいンゴ");
				},
			}),
		),
		{
			// メンバーの　あきかん三本。深夜にしゃがんで（seen_kichi_shinya）缶をのみほした人は、
			// 自分の缶を　ならびに足して　四本を見る（seen_kan_kichi）。でも　缶は　もちかえる——
			// 朝、その缶は　部屋の机にある（room desk の kanAsa「机のすみに、ゆうべの　あき缶」）。
			// 朝の木箱は三本のまま、キリコが机の缶を思いだす。got_kan は読むだけ（kanLv）。
			// ※ 缶を　ここに置いていく形にすると、kanAsa の机の缶と　二か所になるので　しない
			id: "kichi_crate_a",
			x: 23,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				await s.narrate("木箱。なかに、ジュースの\nあきかんが　三本。");
				if (s.flag("seen_kan_kichi")) {
					if (t === "asa")
						await s.say("kiriko", "（吾輩のは、\nうちの　机ンゴ）");
					return;
				}
				if (t === "shinya" && s.flag("seen_kichi_shinya") && kanLv(s) === 4) {
					s.set("seen_kan_kichi");
					await s.narrate("あきかんの　ならびに、\nのみおえた　缶を　たした。");
					await s.wait(1200);
					await s.narrate("……四本。");
					await s.say("kiriko", "（……でも、ゴミは\nもってかえるンゴ）");
				}
			},
		},
		{
			// ⑥ 水きり: ひらたい石が三つ（seen_kichi_ishi）→ kawara mizukiri_ishi（asa）。
			// 川で水きりをした人（seen_mizukiri_nage）には、朝　一つへっている（だれかが　持っていった。
			// kawara の朝は　石の山が　もとにもどっている）。朝は seen_kichi_ishi を立てない
			// （朝はじめて見た人が、同じ朝に　三→二と　変わらないように）
			id: "kichi_crate_b",
			x: 27,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "asa" && s.flag("seen_mizukiri_nage")) {
					await s.narrate(
						s.flag("seen_kichi_ishi")
							? "木箱のうえの　石が、\n二つに　へっている。"
							: "木箱のうえに、\nひらべったい石が　二つ。",
					);
					return;
				}
				s.set("seen_kichi_ishi");
				await s.narrate("木箱のうえに、\nひらべったい石が　三つ。");
				await s.narrate("……たからもの、かも\nしれない。");
				if (s.flag("seen_mizukiri_nage"))
					await s.say("kiriko", "（……水きりの　石ンゴ）");
			},
		},

		// （杉やぶの小道 (29〜39,13〜18) は、見るだけの木立。夏の名残は natsuCount の3か所、
		//   野球の小物はベンチのグローブにまとめた）

		// ── 坂道（川へ下りる。手すりの向こうに川） ──
		{
			// ㉒ しらさぎを坂の上から: 夕方の中州の白い点（seen_sagi_saka）→ kawara sagiBelt（asa）。
			// 朝は、かわらで飛ぶのを見た人（seen_sagi_asa）には　からっぽ、坂の上だけの人には　まだ一つ
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
					if (s.flag("seen_sagi_asa")) {
						await s.narrate("中州は、もう　からっぽだ。");
						return;
					}
					if (s.flag("seen_sagi_saka")) {
						await s.narrate("中州に、白い点が\nまだ　ひとつ。");
						return;
					}
					await s.narrate("手すりのむこう、川が\nあさの色で　ひかっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("手すりのむこう、川に\n街灯が　ゆれている。");
					return;
				}
				s.set("seen_sagi_saka");
				await s.narrate("手すりのむこう、川が\nひかっている。");
				await s.narrate("中州に、白い点が\nひとつ　うごかない。");
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
			// 「ながさより　かいすう」を、話しかけた回数で返す（seen_obachan_b は数。numFlag）
			async (s) => {
				const n = numFlag(s, "seen_obachan_b");
				s.set("seen_obachan_b", n + 1);
				if (n === 0) {
					await s.say(null, "はなしはね、ながさより\nかいすうなのよ", {
						name: "となりのおばちゃん",
					});
					await s.say("kiriko", "ふかいンゴ……");
					return;
				}
				if (n === 1) {
					await s.say(null, "あら、また来た。\nかいすう、ふえたわね", {
						name: "となりのおばちゃん",
					});
					return;
				}
				await s.say(null, "かいすうで　いったら、\nもう　しんせきね", {
					name: "となりのおばちゃん",
				});
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
			// 夕方の　じゅくの子（juku_ko・seen_juku_ko）と同じ子。きのうの「ないしょ」の続き
			async (s) => {
				const juku = s.flag("seen_juku_ko");
				if (!s.flag("seen_gakko_ko")) {
					s.set("seen_gakko_ko");
					if (juku) {
						await s.say(null, "あ。……きのうのは、\nないしょ　だよ", {
							name: "とうこうの子",
						});
						await s.say("kiriko", "なにも　見てないンゴ");
					}
					await s.say(null, "しゅうごう、7時半。\n……まにあう、はず", {
						name: "とうこうの子",
					});
					return;
				}
				await s.say(
					null,
					juku
						? "たんご、ひとつ\nわすれた"
						: "わすれものは、ない。\nたぶん、ない",
					{ name: "とうこうの子" },
				);
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"gomidashi",
			3,
			13,
			SPR.woman,
			// 夕方の井戸端の　おばちゃん（obachan_a）と同じ人。初回の1行目は一つだけ:
			// ⑰ たまご（seen_obachan）＞ 深夜の早いごみ（gomi・seen_gomi_hayai）＞ いつもの「セーフ」。
			// 2回目は ⑯ ゴミの日（apart seen_keiji・danchi seen_gomi_fuda）を見た人にキリコの返事
			async (s) => {
				const name = s.flag("seen_obachan") ? "おばちゃん" : "ごみ出しの人";
				if (!s.flag("seen_gomidashi")) {
					s.set("seen_gomidashi");
					if (s.flag("seen_obachan")) {
						await s.say(
							null,
							"あら、きのうの。たまご、\nちゃんと　かえたわよ",
							{
								name,
							},
						);
						return;
					}
					if (s.flag("seen_gomi_hayai")) {
						await s.say(null, "ゆうべから　出したの、\nだれよ……もう", { name });
						await s.say("kiriko", "（……吾輩じゃ\nないンゴ）");
						return;
					}
					await s.say(null, "セーフ、セーフ。\n8時まえ、セーフ", { name });
					await s.say("kiriko", "……なにがンゴ？");
					return;
				}
				await s.say(null, "もえるゴミは、かようと\nきんよう。おぼえた？", {
					name,
				});
				if (s.flag("seen_keiji") || s.flag("seen_gomi_fuda"))
					await s.say("kiriko", "（……きょうが、\nかようンゴ）");
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"jii_asa",
			19,
			6,
			ELDER,
			async (s) => {
				// 6時半のたいそう（掲示板の紙・団地の会）の　かえり。夕方の taiso_jii（seen_taiso_jii）の
				// 「第二」を聞いた人には、その続き
				if (!s.flag("seen_jii_asa")) {
					s.set("seen_jii_asa");
					await s.say(null, "たいそうの　かえりだ。\n第一のほう", {
						name: "じいさん",
					});
					await s.say("kiriko", "だいいちンゴ");
					await s.say(
						null,
						s.flag("seen_taiso_jii")
							? "きのうの　第二が、\nまだ　こしに　のこってる"
							: "第二はな、夕方に\nとってあるんだ",
						{ name: "じいさん" },
					);
					return;
				}
				// ㊽ 団地の体操のじいちゃん（danchi taiso_jichan・seen_taiso_danchi）と話した人だけ
				if (s.flag("seen_taiso_danchi")) {
					await s.say(null, "団地の　じいさん、\nまだ　のばしてたろ", {
						name: "じいさん",
					});
					await s.say("kiriko", "（……よっ、とンゴ）");
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
				// 初回の　おまけは一つだけ: 夕方の歯みがきカレンダー（dental_win・seen_hamigaki）＞
				// 団地の管理人さんの「音のしない　そうじ機」（danchi kanrinin・seen_kanrinin）
				if (!s.flag("seen_haisha_asa")) {
					s.set("seen_haisha_asa");
					await s.narrate("歯科の前を、ほうきで\nはいている。");
					await s.say(null, "あけるまえの　そうじが、\nしごとの　半分でね", {
						name: "歯医者さん",
					});
					if (s.flag("seen_hamigaki")) {
						await s.say(null, "ゆうべ、歯は\nみがいた？", {
							name: "歯医者さん",
						});
						await s.say("kiriko", "……み、みがいたンゴ");
					} else if (s.flag("seen_kanrinin")) {
						await s.say("kiriko", "（音のしない\nそうじ機ンゴ）");
					}
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
