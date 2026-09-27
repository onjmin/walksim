// すみれ台団地。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 32×24・outdoor・BGM null（生活音だけ）。三棟の団地と中庭・集会所。
// 窓明かりの「数」が主役のマップ（夕方はたくさん・深夜はゼロ＝不在の記号。
// docs/night-fx.md §2。深夜の団地は棟の窓が全部消えている＝liminal）。
//
// 時間帯の顔（flags.tod）:
//   夕方 … 窓明かり・干しぶとん・「ごはんよー」の声・買い物帰り・なわとびの子・
//           回覧板（サインらん）・ふとんをとりこむばあちゃん。怪異ゼロ（必達）
//   宵   … どの窓からもナイターの実況・外灯に羽虫・せっけんのにおい。NPC 0体
//           （docs/nostalgia.md P0-1。書くのは におい・音・点いた灯り だけ）
//   深夜 … NPC 0体必達。脇道の怪異はここの担当2つだけ:
//           kyusuito（給水塔の水音）／shuukaijo（集会所の張り紙が一枚多い）。
//           ノスタルジー層は A棟の階段のいちばん上（座れる場所）と、じはんきの缶だけ
//   朝   … ごみ出し・体そうおわりのじいちゃん・会釈の人。回覧板が次の家へ、
//           かさが消える、ミニトマトが一つぶへる——小さな payoff の束
//
// 座標凍結v3: 東 touch (31,12)→sumire(1,12)・sumire からの着地 (30,12)／
// 北 touch (16,0)→kokudo(20,10)・kokudo からの着地 (16,1)。
//
// 経路: 縦の道(x16)と東西の大どおり(y12)が十字。棟A/B（北）・棟C/集会所（南）の
// あいだの通路と中庭・南の広場でループ。寄り道＝駐輪場・給水塔・物干し場。
// 隠し: 南の生けがきの一枚 (5,21) だけ通れる → うらのねこ。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import { kanHeld, kanLine, kanShinya, kanTick, yoruAkubi } from "../nostalgia";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";

// ── タイル ──
//   o  しまった戸（白壁）  j  集会所の戸  c  下段の窓（白壁）  m  下段の窓（板壁）
//   s  すなば  h  生けがきの通れる一枚（見た目は柵のまま＝無印の隠し）
const TURF = JP.ground;
const WIN_LOW_WHITE = WIN.sash;
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
	c: {
		layers: [WALL.sidingLo, WIN_LOW_WHITE],
		color: "#e8e8e8",
		passable: false,
	},
	m: {
		layers: [WALL.boardLo, WIN_LOW_WHITE],
		color: "#6a4a2a",
		passable: false,
	},
	s: { layers: [JP.sand], color: "#e8cc90", passable: true },
	h: { layers: [TURF, JP.ropeFence], color: "#8a6a3a", passable: true },
};

// 北＝A棟（西）・B棟（東）。あいだの縦の道 x16 が kokudo へ。
// 中央＝中庭（給水塔・すなば・てつぼう・ベンチ・花だん）と駐輪場・じはんき・クスノキ。
// y12 の大どおりが sumire へ。南＝C棟（西）・集会所（東）・物干し場・広場・生けがき。
const rows = [
	"                :               ", // y0  kokudo への出口 (16,0)
	"  aaaaaaaaaaa   :   aaaaaaaaaaa ", // y1  kokudo からの着地 (16,1)
	"  AAAAAAAAAAA   :   AAAAAAAAAAA ", // y2  A棟・B棟の屋根
	"  (w(w(w(w(w(   :   (w(w(w(w(w( ", // y3  上のかいの窓
	"  (w(w(w(w(w(   :   (w(w(w(w(w( ", // y4
	"  )c)o)c)c)o)   :   )c)o)c)c)o) ", // y5  入口 (5,5)(11,5)(23,5)(29,5)・郵便受け (4,5)
	" ...............:.............. ", // y6  棟の前の通路
	" ,,,,,,,,,,,,,L,:,,,fff,,,,,,L, ", // y7  外灯 (14,7)(29,7)・駐輪場 (20,7)-(22,7)
	" ,,,,,,,,,,,,,,,:,,,,,,,,V,,,,, ", // y8  給水塔 (3,8)・じはんき (25,8)
	" ,,,,,,ss,,,,,,,:,,,,,,,,,,,,,, ", // y9  すなば・てつぼう (11,9)
	" ,,,Bb,ss,,,,,,,:,,,,,,,,,,,T,, ", // y10 ベンチ (4,10)(5,10)・クスノキ (28,10)
	" ,,,,,,,,,*&,,,,:,,,,,,,,,,,,,, ", // y11 花だん (10,11)(11,11)
	",:::::::::::::::::::::::::::::::", // y12 大どおり。sumire への出口 (31,12)・着地 (30,12)
	" ,,,,,,,L,,,,,,,:,,,,,,,L,,,,,, ", // y13 案内図 (13,13)・ごみ置き場 (26,13)・外灯
	" ,,nnnnnnnnnnn,,:,,,,,,,,,,,,,, ", // y14 C棟の屋根
	" p,^^^^^^^^^^^,,:,,zzzzzzz,,,,, ", // y15 C棟うらのプランター (1,15)・集会所の屋根
	" ,,(w(w(w(w(w(,,:,,ZZZZZZZ,,x,, ", // y16 集会所うらの木箱 (28,16)
	" ,,)c)o)c)c)o),,:,,]m]Kkj],,,,, ", // y17 C棟の入口・集会所の掲示 (22,17)(23,17)・戸 (24,17)
	" ...............:.............. ", // y18 南の通路
	" ,,|||||,,,,,,,,,,,!,,,,,,,,,,, ", // y19 物干し場 (3,19)-(7,19)・ラジオ体そうの看板 (19,19)
	" ,,,,,,,,,,,,,,,,,,,,,,,,,,,P,, ", // y20 三輪車 (9,20)・広場・つつじ (28,20)
	" ,|||h|||||||||||||||||||||||x, ", // y21 生けがき（(5,21) だけ通れる）・バケツ (29,21)
	"   ,,,,,,                       ", // y22 生けがきのうら（ねこ (6,22)）
	"                                ", // y23
];

// ── モブの歩行グラ ──
const WIFE = "pub:assets/rpgen/char/09-woman-a.png";
const KID = "pub:assets/rpgen/char/04-child.png";
const KANRININ = "pub:assets/rpgen/char/10-elderly-c.png";
const GRANDPA = "pub:assets/rpgen/char/03-elderly-a.png";
const GRANDMA = "pub:assets/rpgen/char/05-elderly-b.png";
const WOMAN = "pub:assets/rpgen/char/11-woman-b.png";
const MAN = "pub:assets/rpgen/char/16-man-b.png";

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ）。street / sumire と同じ方式：
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
/** 見えない環境音の帯。 */
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
 * 夕方の場面: 棟のあいだの道で、上のかいから晩ごはんの呼び声（音の場面）。
 */
const gohanYobu = async (s: Story): Promise<void> => {
	if (s.flag("seen_gohan_danchi")) return;
	s.set("seen_gohan_danchi");
	await s.wait(300);
	await s.narrate("上のかいの窓から、\n「ごはんよーー」");
	s.se("door", { pan: 0.4, volume: 0.5 });
	await s.narrate("返事のかわりに、どこかで\n戸のしまる音がした。");
	await s.say("kiriko", "（いそいで帰るタイプの\n返事ンゴ）");
};
const gohanBelt = (x: number, y: number): EventDef => ({
	id: `gohan_${x}_${y}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "yu" && !st.flags.seen_gohan_danchi,
	run: gohanYobu,
});

/**
 * 深夜の場面: 給水塔の近くで、かすかな水音（kyusuito へ視線を運ぶだけ。
 * 書き留めるのは塔を調べたとき）。
 */
const mizuOto = async (s: Story): Promise<void> => {
	if (s.flag("seen_mizuoto_danchi")) return;
	s.set("seen_mizuoto_danchi");
	await s.wait(400);
	s.se("train", { pan: -0.2, volume: 0.15 });
	await s.narrate("……水の音がする。\n上のほうからだ。");
};
const mizuBelt = (x: number, y: number): EventDef => ({
	id: `mizu_${x}_${y}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "shinya" && !st.flags.seen_mizuoto_danchi,
	run: mizuOto,
});

/**
 * 朝の場面: 集会所の前で、ラジオをかたづける音（体そうは6時半＝もうおわっている）。
 */
const taisoAto = async (s: Story): Promise<void> => {
	if (s.flag("seen_taisoato_danchi")) return;
	s.set("seen_taisoato_danchi");
	s.se("record", { pan: 0.3, volume: 0.35 });
	await s.narrate("集会所の前で、ラジオを\nかたづけている音。");
	await s.narrate("きょうの体そうは、\nもう　おわったらしい。");
};
const taisoBelt = (x: number, y: number): EventDef => ({
	id: `taisoato_${x}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "asa" && !st.flags.seen_taisoato_danchi,
	run: taisoAto,
});

/**
 * 深夜の座れる場所: A棟の階段を、いちばん上まで（docs/nostalgia.md P0-7）。
 * 足音を三つ → 暗転（のぼりきるまで）→ 見わたし → とおくに自分の窓（P0-5）。何も起きない。
 * 文は暗転が明けてから出す（暗転 .fade は吹き出しより上に重なるので、暗いあいだの文は見えない）。
 * 缶を持っていれば、かぞえる1行のかわりに缶の1行（吹き出しは既存文を入れて5まで）。
 * 給水塔の水音（kyusuito）には触れない。
 */
const ichibanUe = async (s: Story): Promise<void> => {
	s.set("seen_danchi_ue");
	for (let n = 0; n < 3; n++) {
		s.se("stairs", { volume: 0.5 });
		await s.wait(400);
	}
	await s.fadeOut(700, "#04060f");
	await s.wait(400);
	await s.fadeIn(700);
	await s.narrate("いちばん上の　おどりばに、\nすわった。");
	if (!kanHeld(s)) await s.narrate("町の灯りを、\nひとつずつ　かぞえた。");
	await s.narrate("とおくに、アパートの\nあおい窓が　ひとつ。");
	await s.say("kiriko", "……あれ、吾輩の\nへやンゴ？");
	if (kanHeld(s)) await kanLine(s);
};

export const danchi: MapDef = {
	id: "danchi",
	// ジオラマ表示（?diorama）の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 0, y: 0, w: 15, h: 8 }, // A棟
		{ x: 15, y: 0, w: 17, h: 8 }, // B棟
		{ x: 0, y: 8, w: 16, h: 5 }, // 棟のあいだ（西）
		{ x: 16, y: 8, w: 16, h: 5 }, // 棟のあいだ（東）
		{ x: 0, y: 13, w: 15, h: 6 }, // C棟
		{ x: 15, y: 13, w: 17, h: 6 }, // 集会所
		{ x: 0, y: 19, w: 16, h: 5 }, // 南の通路（西）
		{ x: 16, y: 19, w: 16, h: 5 }, // 南の通路（東）
	],
	name: "すみれ台団地",
	bgm: null,
	outdoor: true,
	outside: "#0c0b0d",
	tiles,
	rows,
	// 窓明かりは夕方の主役（三棟ぶん、数で見せる）。深夜は外灯とじはんきだけ
	// ＝棟の窓が全部消えている（不在の記号）。docs/night-fx.md §2 の定番値。
	lights: [
		// A棟の窓（点在）
		{ x: 3, y: 5, r: 2, only: "yu,yoru" },
		{ x: 5, y: 3, r: 2, only: "yu,yoru" },
		{ x: 7, y: 4, r: 2, only: "yu,yoru" },
		{ x: 9, y: 5, r: 2, only: "yu,yoru" },
		{ x: 11, y: 3, r: 2, only: "yu,yoru" },
		// B棟の窓（点在）
		{ x: 21, y: 4, r: 2, only: "yu,yoru" },
		{ x: 23, y: 3, r: 2, only: "yu,yoru" },
		{ x: 25, y: 5, r: 2, only: "yu,yoru" },
		{ x: 27, y: 4, r: 2, only: "yu,yoru" },
		{ x: 29, y: 3, r: 2, only: "yu,yoru" },
		// C棟の窓（点在）
		{ x: 4, y: 17, r: 2, only: "yu,yoru" },
		{ x: 6, y: 16, r: 2, only: "yu,yoru" },
		{ x: 10, y: 17, r: 2, only: "yu,yoru" },
		{ x: 12, y: 16, r: 2, only: "yu,yoru" },
		// 集会所（夕方だけ。しょうぎの会の窓）
		{ x: 20, y: 17, r: 2, only: "yu" },
		// 外灯（深夜の団地はこれとじはんきだけ）
		{ x: 14, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 29, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 8, y: 13, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 24, y: 13, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		// じはんき
		{ x: 25, y: 8, r: 1.5, color: "#eef4ff", only: "yoru,shinya" },
	],
	// 入るたびに環境音を一波（夕＝ヒグラシ／朝＝スズメ。宵・深夜は無音のまま）。
	// 深夜は手の缶が一段さめる（kanTick。文は出さない）
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
				await s.narrate("窓のあかりが、\nひとつ、またひとつ。");
				await s.narrate("どの窓にも、晩ごはんの\n時間が来ている。");
			},
		},
		{
			// 宵（P0-1）。ナイターは段に関係なく「実況が聞こえる」だけ（P0-2）
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("どの窓からも、\nおなじ実況が　きこえる。");
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
				await s.narrate("窓のあかりが、\nひとつも　ない。");
				await s.narrate("A棟も、B棟も、\nC棟も。");
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

		// ── 環境音の帯（大どおり2箇所 ＋ 棟の前の通路） ──
		...waveBelt("wave_w", 8, [12], -0.4),
		...waveBelt("wave_e", 24, [12], 0.4),
		...waveBelt("wave_n", 16, [6], 0),

		// ── 場面の帯（夕＝呼び声／深夜＝水音／朝＝ラジオのかたづけ） ──
		gohanBelt(16, 3),
		gohanBelt(16, 4),
		mizuBelt(2, 8),
		mizuBelt(4, 8),
		mizuBelt(3, 9),
		taisoBelt(19, 18),
		taisoBelt(20, 18),
		taisoBelt(21, 18),

		// ── 給水塔（深夜の水音が kyusuito の担当） ──
		{
			id: "kyusuito_ev",
			x: 3,
			y: 8,
			sprite: JP.waterTower,
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
				// 宵は夕日のかわりに、棟の窓あかりをせおう（水の音は深夜の kyusuito だけのもの。
				// 人影めいた「立っている」は使わず、夕方と同じ「かげ」にそろえる）
				await s.narrate(
					t === "yoru"
						? "給水塔。棟の窓あかりを\nせおって、まっくろな　かげになっている。"
						: "給水塔。夕日をせおって、\nまっくろな　かげになっている。",
				);
				await s.narrate("見上げると、くびが\nいたくなる高さだ。");
			},
		},

		// ── 集会所（深夜の張り紙が shuukaijo の担当） ──
		{
			id: "shuukaijo_ev",
			x: 22,
			y: 17,
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
			x: 23,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"画びょうの　あとだらけだ。\nずいぶん　はられてきたらしい。",
				);
			},
		},
		{
			id: "shuukaijo_door",
			x: 24,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					await s.narrate("集会所の戸。中から、\nお茶わんの音がする。");
					return;
				}
				if (t === "asa") {
					await s.narrate("戸のまえに、ぞうきんが\n干してある。");
					return;
				}
				await s.narrate("集会所の戸は、\nしまっている。");
			},
		},
		{
			id: "shuukaijo_win",
			x: 20,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("くらい。ざぶとんの山が\nかげに見える。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ガラスに『体そうの会』の\n紙。すこし　やけている。");
					return;
				}
				if (t === "yoru") {
					// しょうぎの会は夕方まで（灯りも yu だけ）。宵は におい だけ置く
					await s.narrate("窓のすきまから、お茶の\nにおいが　すこしする。");
					return;
				}
				await s.narrate("窓のなか、しょうぎの駒の\n音がしている。");
			},
		},

		// ── A棟 ──
		{
			id: "a_plate",
			x: 2,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『すみれ台団地　A棟』の\n表示板。");
				await s.narrate("下に『ボールあそびは\nひろばで』のシール。");
			},
		},
		{
			id: "postbox_a",
			x: 4,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("郵便受けの列。405だけ、\nあふれたままだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("朝刊が、ならんで\nささっている。");
					await s.narrate("405だけ、きのうの\nままだ。");
					return;
				}
				await s.narrate("ぎんいろの郵便受けの列。");
				await s.narrate("405の口だけ、チラシが\nあふれている。");
			},
		},
		{
			id: "a_stairs",
			x: 5,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 座れる場所（P0-7）。2回目からは短い1行だけ
					if (s.flag("seen_danchi_ue")) {
						s.se("stairs", { volume: 0.4 });
						await s.narrate("いちばん上の　おどりばで、\nすこし　町を見た。");
						return;
					}
					await s.narrate("A棟の階段。電灯が、\n各階に　ひとつずつ。");
					const i = await s.choose(
						["＞＞1 いちばん上まで", "＞＞2 やめておく"],
						{ cancel: 1 },
					);
					if (i === 0) await ichibanUe(s);
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"けさの新聞が、一部だけ\n階段のすみに　のこっている。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"A棟の階段。いちばん上の\nおどりばまで、電灯が　ついている。",
					);
					return;
				}
				await s.narrate("A棟の階段。だれかの\n足音が、上でひびいている。");
			},
		},
		{
			id: "a_win",
			x: 7,
			y: 5,
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
				if (t === "yoru") {
					await s.narrate(
						"一階の窓。カレーのにおいに、\nせっけんの　においが　まざる。",
					);
					return;
				}
				await s.narrate("一階の窓。カレーの\nにおいが　もれている。");
			},
		},
		{
			id: "kairanban",
			x: 9,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("回覧板が、なくなっている。\nもう、つぎの家だ。");
					// ゆうべサインしていれば一言（P0-9）
					if (s.flag("seen_kairan_sign"))
						await s.say("kiriko", "（吾輩の字も、\nいっしょに　行ったンゴ）");
					return;
				}
				if (t === "shinya") {
					await s.narrate("回覧板は、そのままだ。");
					return;
				}
				await s.narrate("郵便受けの上に、回覧板。\n『秋まつりの　おしらせ』");
				await s.narrate("ひもで、ボールペンが\nむすんである。");
				// サインらん（P0-9）。回覧板の人の「こどもは　サインでいいの」のあと、夕方だけ書ける
				if (s.flag("seen_kairan_sign")) {
					await s.narrate(
						"サインらんの　いちばん下に、\nななめの　『きりこ』。",
					);
					return;
				}
				if (t !== "yu" || !s.flag("seen_kairan_danchi")) return;
				await s.narrate("サインらんの　いちばん下が、\nまだ　あいている。");
				const i = await s.choose(["＞＞1 サインする", "＞＞2 やめておく"], {
					cancel: 1,
				});
				if (i !== 0) return;
				s.set("seen_kairan_sign");
				await s.narrate("『きりこ』と　書いた。\n字が、すこし　ななめだ。");
			},
		},

		// ── B棟 ──
		{
			id: "b_plate",
			x: 20,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『すみれ台団地　B棟』の\n表示板。");
				await s.narrate("字が、Aのより\nすこし　あたらしい。");
			},
		},
		{
			id: "b_win_tv",
			x: 21,
			y: 5,
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
				// 宵は延長の段に関係なく「実況」だけ（P0-2。テレビ・中継の語は使わない＝
				// 部屋のテレビの中継が打ち切られたあとも、食いちがわない）
				if (t === "yoru") {
					await s.narrate("B棟の一階。窓から、\nやきうの　実況。");
					return;
				}
				await s.narrate("B棟の一階。テレビの\n野球中けいの声。");
			},
		},
		{
			id: "b_stairs",
			x: 23,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("てすりのかさが、\nなくなっている。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("かさは、そのままだ。");
					return;
				}
				await s.narrate("B棟の階段。てすりに、\nかさが一本　かかっている。");
			},
		},
		{
			id: "b_win_furin",
			x: 25,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("風りんは、しずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("風りんが、もう\nはずされている。");
					return;
				}
				await s.narrate("一階の窓に、風りん。\nちりん、と一度だけ。");
			},
		},
		{
			id: "b_futon",
			x: 27,
			y: 5,
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

		// ── C棟 ──
		{
			id: "c_plate",
			x: 3,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『すみれ台団地　C棟』の\n表示板。");
				await s.narrate("『C』の字の上に、\nシールの　はがしあと。");
			},
		},
		{
			id: "c_stairs",
			x: 6,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("足音が、よくひびく。\nじぶんのだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("上から、とん、とん、と\nおりてくる音。");
					return;
				}
				await s.narrate("C棟の階段。ゆうはんの\nにおいが、たまっている。");
			},
		},
		{
			id: "c_win",
			x: 8,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("カーテンごしも、\nくらい。");
					return;
				}
				if (t === "asa") {
					await s.narrate("トースターの、ちん、と\nいう音がした。");
					return;
				}
				await s.narrate("たまねぎを　いためる音と、\nにおい。");
			},
		},
		{
			id: "c_ura_pot",
			x: 1,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						"プランターのミニトマト。\n……ひとつぶに、へっている。",
					);
					return;
				}
				if (t === "shinya") {
					await s.narrate("ミニトマトの実は、\nふたつぶのままだ。");
					return;
				}
				await s.narrate("プランターのミニトマト。\nあかい実が、ふたつぶ。");
			},
		},

		// ── 中庭（すなば・てつぼう・ベンチ・花だん・外灯） ──
		...[7, 8].map(
			(x): EventDef => ({
				id: `sandbox_${x}`,
				x,
				y: 9,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						await s.narrate("すなば。スコップが\nささったままだ。");
						return;
					}
					if (t === "asa") {
						await s.narrate("バケツの城は、すこし\nくずれていた。");
						return;
					}
					await s.narrate("すなば。バケツの城が、\nひとつ　できている。");
				},
			}),
		),
		{
			id: "tetsubo",
			x: 11,
			y: 9,
			sprite: JP.tetsubo,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("てつぼう。にぎると\nひんやりする。");
				await s.say("kiriko", "……さか上がりは、\nくろれきしンゴ");
			},
		},
		...[4, 5].map(
			(x): EventDef => ({
				id: `bench_${x}`,
				x,
				y: 10,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "asa") {
						await s.narrate("ベンチに、しんぶんが\nたたんで　おいてある。");
						return;
					}
					if (t === "shinya") {
						await s.narrate("だれもいないベンチが、\n外灯のはしに　見える。");
						return;
					}
					await s.narrate(
						"中庭のベンチ。せもたれの\nペンキが、すこし　はげてる。",
					);
				},
			}),
		),
		...[10, 11].map(
			(x): EventDef => ({
				id: `kadan_${x}`,
				x,
				y: 11,
				trigger: "talk",
				run: async (s) => {
					await s.narrate("花だん。『みどりの会』の\n札が　立っている。");
					if (s.flag("tod") === "asa") {
						await s.narrate("土が、しめっている。\n水やりの　あとだ。");
					}
				},
			}),
		),
		{
			id: "gaito_niwa",
			x: 14,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("この明かりの下だけ、\n地面が　白い。");
					return;
				}
				if (t === "asa") {
					await s.narrate("外灯は、もう\nきえている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("中庭の外灯に、\n羽虫が　あつまりはじめた。");
					return;
				}
				await s.narrate("中庭の外灯。\nまだ、ついていない。");
			},
		},

		// ── 駐輪場・じはんき・クスノキ ──
		{
			id: "chuurinjo_a",
			x: 20,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("駐輪場。自転車が\nどんどん　出ていく時間だ。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("自転車の列が、外灯で\nひかっている。");
					return;
				}
				await s.narrate("駐輪場。かごに夕刊が\n入ったままのが、一台。");
			},
		},
		{
			id: "chuurinjo_b",
			x: 22,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("カバーのかかった一台。\nずっと、そのままらしい。");
				if (s.flag("tod") === "shinya") {
					await s.narrate("カバーが、風で\nすこし　ふくらんだ。");
				}
			},
		},
		{
			id: "vending_ev",
			x: 25,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("じはんき。この明かりだけが\nついている。");
					// 『あったか～い』の缶（P0-6。一晩に一本。持っていれば いまの温度を1行）
					await kanShinya(s);
					return;
				}
				await s.narrate("じはんき。おしるこの\nボタンが、もう　ある。");
			},
		},
		{
			id: "kusunoki",
			x: 28,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("クスノキ。こずえの鳴る音が\n上をとおっていく。");
					return;
				}
				if (t === "asa") {
					await s.narrate("すずめの声が、\n上から　ふってくる。");
					return;
				}
				// 宵は夕日のかわりに、外灯(29,7)のあかり
				await s.narrate(
					t === "yoru"
						? "大きなクスノキ。はっぱの\nすきまから、外灯のあかり。"
						: "大きなクスノキ。はっぱの\nすきまから、夕日。",
				);
			},
		},

		// ── 大どおり（カーブミラー・案内図・ごみ置き場） ──
		{
			id: "mirror",
			x: 1,
			y: 12,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("カーブミラー。\nうつっているのは、じぶんだけだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"カーブミラーが、みがかれた\nばかりみたいに　ひかっている。",
					);
					return;
				}
				await s.narrate("カーブミラーのなかで、\n町が　まがっている。");
			},
		},
		{
			id: "annaizu",
			x: 13,
			y: 13,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			// 二度目で下の層（来なかった未来の点線）に気づく（P0-8。時間帯を問わず同じ文）
			run: async (s) => {
				if (s.flag("seen_annaizu2")) {
					await s.narrate("案内図のすみに、点線の\n四角。『D棟（予定）』");
					await s.narrate("点線は、南のひろばに\nかさなっている。");
					await s.say("kiriko", "……ラジオ体そうの\nばしょ、なくなるンゴ？");
					return;
				}
				s.set("seen_annaizu2");
				await s.narrate("団地の案内図。棟が三つ、\nならんで書いてある。");
				await s.narrate("『げんざい地』のシールが、\nはがれかけている。");
			},
		},
		{
			id: "gomi",
			x: 26,
			y: 13,
			sprite: JP.gomi,
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

		// ── 南の広場（看板・物干し・三輪車・つつじ・物置） ──
		{
			id: "taiso_kanban",
			x: 19,
			y: 19,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("看板は、くらくて\nよみにくい。");
					await s.say("kiriko", "……よまなくても、\nおぼえてるンゴ");
					return;
				}
				await s.narrate("『あさのラジオ体そう』\n『毎あさ　6時半から』");
				if (t === "asa") {
					await s.narrate("きょうの分は、\nもう　おわったあとだ。");
					return;
				}
				await s.narrate("『しゅうかいじょ前　雨天\n中止』。手書きだ。");
			},
		},
		...[4, 6].map(
			(x): EventDef => ({
				id: `monohoshi_${x}`,
				x,
				y: 19,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						await s.narrate("シーツが、夜風で\nゆっくり　ふくらむ。");
						return;
					}
					if (t === "asa") {
						await s.narrate(
							"シーツは、とりこまれた。\nロープだけが、ゆれている。",
						);
						return;
					}
					await s.narrate("物干し場。シーツが一まい\nのこっている。");
				},
			}),
		),
		{
			id: "sanrinsha",
			x: 9,
			y: 20,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("三輪車は、たおれたまま\n夜つゆに　ぬれている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("三輪車が、おきあがって\nいる。");
					return;
				}
				await s.narrate("三輪車が、ころんと\nたおれている。");
				if (t === "yoru") {
					await s.say("kiriko", "（もちぬしは、いまごろ\nおふろンゴ）");
					return;
				}
				await s.say("kiriko", "（もちぬしは、\nばんごはん中ンゴ）");
			},
		},
		{
			id: "tsutsuji",
			x: 28,
			y: 20,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("つつじの木。かりこみが\nやけに　まるい。");
			},
		},
		{
			id: "soko_crate",
			x: 28,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『じちかい』と書かれた\n木箱。");
				await s.narrate("つなひきの　つなが\nはみ出している。");
			},
		},
		{
			id: "baketsu",
			x: 29,
			y: 21,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "asa") {
					await s.narrate("バケツのなかみは、\nもう　もち出されたあとだ。");
					return;
				}
				await s.narrate("ふせたバケツ。すなば\n道具の、かくし場所だ。");
			},
		},

		// ── 生けがきのうら（(5,21) だけ通れる＝無印の隠し） ──
		{
			id: "neko_ura",
			x: 6,
			y: 22,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_neko_danchi")) {
					s.set("seen_neko_danchi");
					await s.narrate("……先客がいた。");
					await s.narrate("ねこが、こっちを見て、\nまた目を　とじた。");
					if (s.flag("tod") === "shinya") {
						await s.say("kiriko", "（おまえも、ねむれない\nクチンゴ？）");
					}
					return;
				}
				await s.narrate("ねこは、まだいる。\nここが　定位置らしい。");
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		npc(
			"kaimono_yu",
			18,
			12,
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
			12,
			10,
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
			6,
			KANRININ,
			async (s) => {
				if (!s.flag("seen_kanrinin")) {
					s.set("seen_kanrinin");
					await s.say(null, "ほうきはね、音のしない\nそうじ機なんだよ", {
						name: "管理人さん",
					});
					await s.say("kiriko", "……名言っぽいンゴ");
					return;
				}
				await s.say(null, "おちばはね、はいた先から\nまた落ちてくるんだ", {
					name: "管理人さん",
				});
				await s.say(null, "……まあ、それがいいのさ", { name: "管理人さん" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"kairan_hito",
			14,
			18,
			WOMAN,
			async (s) => {
				if (!s.flag("seen_kairan_danchi")) {
					s.set("seen_kairan_danchi");
					await s.say(null, "回覧板、とどけてるの。\nよんだら　はんこね", {
						name: "回覧板の人",
					});
					await s.say("kiriko", "はんこ、もってない\nンゴ……");
					await s.say(null, "こどもは　サインでいいの", {
						name: "回覧板の人",
					});
					await s.say("kiriko", "（こども　あつかい\nンゴ）");
					return;
				}
				await s.say(null, "つぎは　A棟の\nやまもとさんち", {
					name: "回覧板の人",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"futon_tori",
			24,
			6,
			GRANDMA,
			async (s) => {
				if (!s.flag("seen_futon_tori")) {
					s.set("seen_futon_tori");
					await s.narrate("二かいのベランダを\n見上げて、手をふっている。");
					await s.say(null, "ふとーん。ふとん、\nとりこむよーー", {
						name: "ばあちゃん",
					});
					await s.narrate("……へんじが　ない。");
					await s.say(null, "るすだね。かわりに\nたたいておくか", {
						name: "ばあちゃん",
					});
					await s.say("kiriko", "（ひとの家のを、\nンゴ……？）");
					return;
				}
				await s.say(null, "うちのじゃないよ。でも、\nしめっけは　敵だからね", {
					name: "ばあちゃん",
				});
			},
			{ dir: "up", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち ──
		npc(
			"gomi_asa",
			25,
			13,
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
			21,
			19,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_taiso_danchi")) {
					s.set("seen_taiso_danchi");
					await s.say(null, "体そうかい？　きょうの分は\nもう　おわったよ", {
						name: "じいちゃん",
					});
					await s.say("kiriko", "ね、ねぼうでは\nないンゴ");
					await s.say(
						null,
						"おわったあとの　のばしが\nだいじでな。……よっ、と",
						{
							name: "じいちゃん",
						},
					);
					return;
				}
				await s.say(null, "六時半だよ、あした。\n……来る気が　あるなら", {
					name: "じいちゃん",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"eshaku_asa",
			17,
			12,
			MAN,
			async (s) => {
				await s.narrate("いそぎ足のまま、\n会釈をされた。");
			},
			{ dir: "up", when: (st) => st.flags.tod === "asa" },
		),
	],
};
