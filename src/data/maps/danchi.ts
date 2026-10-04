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
//   深夜 … NPC 0体必達。
//           ノスタルジー層は A棟の階段のいちばん上（座れる場所）と、じはんきの缶だけ
//   朝   … ごみ出し・体そうおわりのじいちゃん・会釈の人。回覧板が次の家へ、
//           かさが消える、ミニトマトが一つぶへる——小さな payoff の束
//
// 夕方に見た物が、宵・深夜・朝で少しずつ変わる（見た人にだけ。2026-10-04）:
//   405のチラシ（seen_danchi_405）・回覧板（seen_kairan_mita）・てすりのかさ（seen_kasa_danchi）・
//   風りん（seen_furin_danchi）・ふとん（seen_futon_b／㉚ seen_futon_tori。深夜 出しっぱなし→朝 とりこまれる）・
//   ミニトマト（seen_tomato_danchi）・
//   すなばのスコップ（seen_baketsu → 深夜 ぬく seen_scoop_motsu → バケツへ seen_scoop_shimau）・
//   夕刊の自転車（seen_yukan_jitensha）・
//   なわとびの子（seen_nawatobi 数 → 宵の『3』『6』『9』seen_tetsubo_chalk → 深夜の『10』seen_nawatobi_10 → 朝の階段）・
//   上のかいの窓の声（seen_gohan_*）・深夜のじはんきの一本（seen_kan_danchi → 朝の つめかえ）・
//   クスノキのスズメ（seen_kusunoki_suzume → 朝 とびだす seen_kusunoki_asa・てつぼう）・
//   ひがんばなのくき（seen_kadan_kuki → 朝 ほどけかける）・給水塔のランプ（深夜 seen_kyusui_danchi → 朝）・
//   将棋の『まった』（seen_shogi_danchi → 宵の盤・朝のじいちゃん seen_shogi_asa）・
//   405の輪ゴム（seen_danchi_405 → 朝のばあちゃん seen_405_wagomu → postbox_a）・
//   建った順（b_plate seen_bplate_atarashi・c_plate seen_cplate_shiiru → 案内図の『D棟（予定）』）・
//   おしるこの札（夕 補充の人が かえる seen_shiruko_fuda → 宵の赤い札 → 宵の二度目は ガ seen_shiruko_yoru → 朝の つめかえ）
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
import {
	akiMatsuri,
	arrived,
	chukeiDan,
	kanHeld,
	kanLine,
	kanLv,
	kanShinya,
	kanTick,
	nekoSeen,
	numFlag,
	yoruAkubi,
} from "../nostalgia";
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
	" ,|||h|||||||||:|||||||||||||x, ", // y21 生けがき（(5,21) だけ通れる）・海への坂の入口 (15,21)・バケツ (29,21)
	"   ,,,,,,      :                ", // y22 生けがきのうら（ねこ (6,22)）・坂 (15,22)
	"               :                ", // y23 うみべへ (15,23)
];

// ── モブの歩行グラ ──
const WIFE = "pub:sprites/mob_mama.png";
const KID = "pub:sprites/mob_child.png";
const KANRININ = "pub:sprites/mob_ojiichan.png";
const GRANDPA = "pub:sprites/mob_ojiichan.png";
const GRANDMA = "pub:sprites/mob_obaachan.png";
const WOMAN = "pub:sprites/mob_student.png";
const MAN = "pub:sprites/mob_salaryman.png";

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ）。street / sumire と同じ方式：
 * 直前に鳴らした帯をモジュール変数で覚え、往復の連打を防ぐ（セーブしない）。
 */
let lastWave = "";
const wave = (id: string, pan: number) => async (s: Story) => {
	if (lastWave === id) return;
	lastWave = id;
	const t = s.flag("tod");
	if (t === "yu") {
		// 段: 通るたびに ヒグラシが 遠のく（0.8 → 0.5 → 鳴かない）。3回目以降は gaito_niwa が読む
		const n = numFlag(s, "seen_higurashi_danchi") + 1;
		s.set("seen_higurashi_danchi", n);
		if (n === 1) s.se("higurashi", { pan, volume: 0.8 });
		else if (n === 2) s.se("higurashi", { pan, volume: 0.5 });
	} else if (t === "asa") {
		// 回収: クスノキの スズメ（seen_kusunoki_suzume）を 見た人には、東の帯で 近く大きく
		if (id === "wave_e" && s.flag("seen_kusunoki_suzume"))
			s.se("suzume", { pan: 0.4, volume: 1.0 });
		else s.se("suzume", { pan, volume: 0.8 });
	}
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
 * 棟のあいだの道で、上のかいの窓（音の場面。人の姿は書かない）。おなじ窓が時間帯で段になる:
 *   夕方 … 晩ごはんの呼び声（seen_gohan_danchi。room が読む）
 *   宵   … おなじ窓の、お皿の音（seen_gohan_yoru）
 *   朝   … おなじ声の「わすれもの」（seen_gohan_asa）
 * 宵・朝は、夕方に呼び声を聞いた人にだけ（聞いていない人には何も出さない）。
 */
const gohanYobu = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "yoru") {
		if (!s.flag("seen_gohan_danchi") || s.flag("seen_gohan_yoru")) return;
		s.set("seen_gohan_yoru");
		await s.wait(300);
		await s.narrate("さっきの窓から、\nお皿を　かさねる音。");
		return;
	}
	if (t === "asa") {
		if (!s.flag("seen_gohan_danchi") || s.flag("seen_gohan_asa")) return;
		s.set("seen_gohan_asa");
		await s.wait(300);
		await s.narrate("上のかいの窓から、\n「わすれもの　ないー？」");
		s.se("door", { pan: 0.4, volume: 0.5 });
		await s.say("kiriko", "（ゆうべと　おなじ\n声ンゴ）");
		return;
	}
	if (t !== "yu" || s.flag("seen_gohan_danchi")) return;
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
	when: (st) => {
		const f = st.flags;
		if (f.tod === "yu") return !f.seen_gohan_danchi;
		if (f.tod === "yoru") return !!f.seen_gohan_danchi && !f.seen_gohan_yoru;
		if (f.tod === "asa") return !!f.seen_gohan_danchi && !f.seen_gohan_asa;
		return false;
	},
	run: gohanYobu,
});

/**
 * 深夜の座れる場所: A棟の階段を、いちばん上まで（docs/nostalgia.md P0-7）。
 * 足音を三つ → 暗転（のぼりきるまで）→ 見わたし → とおくに自分の窓（P0-5）。何も起きない。
 * 文は暗転が明けてから出す（暗転 .fade は吹き出しより上に重なるので、暗いあいだの文は見えない）。
 * 缶を持っていれば、かぞえる1行のかわりに缶の1行（吹き出しは既存文を入れて5まで）。
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
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
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
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
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
		if (t === "yu") {
			// ヒグラシは 帯（seen_higurashi_danchi）と おなじ段で: 0.8 → 0.5 → 鳴かない。ここでは 数えない
			const n = numFlag(s, "seen_higurashi_danchi");
			if (n < 2) s.se("higurashi", { volume: 0.8 });
			else if (n === 2) s.se("higurashi", { volume: 0.5 });
		} else if (t === "asa") s.se("suzume", { volume: 0.8 });
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
			// 宵（P0-1）。ナイターの実況は chukeiDan の段で進む（P0-2）: 0〜1 きこえる → 2 大きくなる → 3 とぎれる。
			// 深夜の arrive_shinya が「しない」で回収する
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				const dan = chukeiDan(s);
				// 深夜の arrive_shinya が 読む（3＝宵で もう とぎれた）
				s.set("seen_danchi_jikkyo", dan);
				if (dan >= 3) {
					await s.narrate("実況が　とぎれた。\nどこかで、窓が　しまる音。");
				} else if (dan === 2) {
					await s.narrate("実況の　声が、\nひときわ　大きくなる。");
				} else {
					await s.narrate("どの窓からも、\nおなじ実況が　きこえる。");
				}
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
				// 夕方の arrive_yu（「ひとつ、またひとつ」）を 見た人には、おなじ ことばで 裏がえす
				await s.narrate(
					arrived(s, "danchi", "yu")
						? "ひとつ、またひとつ　ついた\n窓が、ひとつも　ない。"
						: "窓のあかりが、\nひとつも　ない。",
				);
				// 宵の arrive_yoru（実況）を 聞いた人には、音の ぬけたあとを
				// 宵で とぎれたのを 見た人（段3）には、とぎれた ままを
				if (arrived(s, "danchi", "yoru")) {
					await s.narrate(
						numFlag(s, "seen_danchi_jikkyo") >= 3
							? "とぎれた　まま、\nどの窓も　しずかだ。"
							: "あれだけ　きこえた　実況が、\nどの窓からも　しない。",
					);
				}
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
				// 「ぱん、ぱん」は すみれだけ（団地の ふとんは、朝 b_futon で とりこまれている＝㉚）。
				// 深夜の arrive_shinya（窓が ひとつも ない）を 見た人には、おなじ棟が あく
				await s.narrate(
					arrived(s, "danchi", "shinya")
						? "ゆうべ　まっくらだった　棟で、\nカーテンが　つぎつぎ　あく。"
						: "カーテンの　あく音が、\n棟から　棟へ　うつっていく。",
				);
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_kokudo", 16, 0, { map: "kokudo", x: 20, y: 10, dir: "up" }),
		warp("to_sumire", 31, 12, { map: "sumire", x: 1, y: 12, dir: "right" }),
		// 南の生けがきの切れ目から、坂を下って うみべへ（地続きの拡張 2026-09-28）
		warp("to_umi", 15, 23, { map: "umi", x: 20, y: 1, dir: "down" }),

		// ── 環境音の帯（大どおり2箇所 ＋ 棟の前の通路） ──
		...waveBelt("wave_w", 8, [12], -0.4),
		...waveBelt("wave_e", 24, [12], 0.4),

		// ── 場面の帯（上のかいの窓：夕＝呼び声／宵＝お皿／朝＝わすれもの） ──
		// （朝のラジオのかたづけは、taiso_jichan の初回の頭へ移した）
		gohanBelt(16, 3),
		gohanBelt(16, 4),

		// ── 給水塔 ──
		{
			id: "kyusuito_ev",
			x: 3,
			y: 8,
			sprite: JP.waterTower,
			trigger: "talk",
			fixedDir: true,
			// ㉝ ふたつの給水塔のランプ: 宵に 赤いランプが 見えはじめ → 深夜 点滅（seen_kyusui_danchi。
			// koen kyusuito の深夜が読む）。公園の ランプ（seen_kyusui_koen）を 見た人には かわりばんこ →
			// 朝、ランプは きえている（深夜に 見た人にだけ）
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					s.set("seen_kyusui_danchi");
					await s.narrate(
						"給水塔。てっぺんの　赤い\nランプが、ゆっくり　点滅している。",
					);
					if (s.flag("seen_kyusui_koen")) {
						await s.narrate(
							"丘の上の　給水塔の　ランプと、\nかわりばんこに　ひかる。",
						);
						return;
					}
					await s.say("kiriko", "（いち、に……さん。\nゆっくりンゴ）");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_kyusui_danchi")
							? "ランプは　きえて、タンクに\nあさの空が　うつっている。"
							: "給水塔のタンクに、\nあさの空が　うつっている。",
					);
					return;
				}
				// 宵は夕日のかわりに、棟の窓あかりの 上の ランプ（深夜の 点滅の 前ぶれ）
				if (t === "yoru") {
					await s.narrate(
						"給水塔。棟の窓あかりより\n上に、赤い　ランプが　ひとつ。",
					);
					return;
				}
				await s.narrate(
					"給水塔。夕日をせおって、\nまっくろな　かげになっている。",
				);
				await s.narrate("見上げると、くびが\nいたくなる高さだ。");
			},
		},

		// ── 集会所 ──
		{
			// ③ つきみ秋まつりの はり紙（夕・宵で seen_aki_danchi → nostalgia akiMatsuri）。
			// 二度目で、画びょうの あとに むかしの紙の はし（『ふっかつ』の前の。もとの shuukaijo_k を吸収）
			id: "shuukaijo_ev",
			x: 22,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("集会所の掲示。はり紙は\n三枚。くらくて　よめない。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"集会所の掲示。はり紙は\n三枚。はしが　めくれている。",
					);
					// 夕に はり紙を よんだ人（seen_shuukaijo_hari）だけ: こども将棋の 申しこみ →
					// 夕の『まった！』（shuukaijo_win の seen_shogi_danchi）も 聞いた人に キリコ。
					// 朝の じいちゃん（taiso_jichan の seen_shogi_asa）と かぶらないよう、名前（物）に よせる
					if (s.flag("seen_shuukaijo_hari")) {
						await s.narrate(
							"『こども将棋』の　紙に、\nえんぴつの　名前が　ひとつ。",
						);
						if (s.flag("seen_shogi_danchi"))
							await s.say("kiriko", "（あの　『まった』の\n名前ンゴ？）");
					}
					return;
				}
				s.set("seen_aki_danchi");
				if (t === "yoru") {
					await s.narrate("外灯で、『つきみ』の　字だけ\nよめる。");
					return;
				}
				if (s.flag("seen_shuukaijo_hari")) {
					await s.narrate(
						"画びょうの　あとに、\nむかしの『こども将棋』の　はし。",
					);
					return;
				}
				s.set("seen_shuukaijo_hari");
				await s.narrate(
					"集会所の掲示。『つきみ秋まつり\nうちあわせ』『体そうの会』",
				);
				await s.narrate("『こども将棋　ふっかつ』。\nはり紙は、三枚だ。");
			},
		},
		{
			id: "shuukaijo_win",
			x: 20,
			y: 17,
			trigger: "talk",
			// 夕方の こども将棋の『まった！』（seen_shogi_danchi）→ 宵は ならべたままの 盤（物だけ）→
			// 朝の 体そうの じいちゃん（taiso_jichan の2回目・seen_shogi_asa）
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("くらい。ざぶとんの山が\nかげに見える。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ガラスに『体そうの会』の\n紙。すこし　やけている。");
					await s.narrate("戸のまえに、ぞうきんが\n干してある。");
					return;
				}
				if (t === "yoru") {
					// しょうぎの会は夕方まで（灯りも yu だけ）。宵は におい だけ置く
					await s.narrate("窓のすきまから、お茶の\nにおいが　すこしする。");
					if (s.flag("seen_shogi_danchi"))
						await s.narrate("くらい　おくに、ならべた\nままの　盤の　かげ。");
					return;
				}
				s.set("seen_shogi_danchi");
				await s.narrate("窓のなか、しょうぎの駒の\n音がしている。");
				await s.narrate("ときどき、こどもの　声で\n『まった！』");
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
			// 405 の チラシ（夕・宵で seen_danchi_405）→ 深夜も あふれたまま →
			// 朝、輪ゴムで たばねてある（見た人にだけ）
			run: async (s) => {
				const t = s.flag("tod");
				const mita = !!s.flag("seen_danchi_405");
				if (t === "shinya") {
					await s.narrate(
						mita
							? "郵便受けの列。405だけ、\nあふれたままだ。"
							: "郵便受けの列。\nしずかだ。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("朝刊が、ならんで\nささっている。");
					if (!mita) return;
					await s.narrate("405の　チラシが、輪ゴムで\nたばねてある。");
					// ㉚ 朝の ばあちゃん（futon_tori）から 聞いた人（seen_405_wagomu）は こたえあわせ。
					// 聞いていなくて、るすの家の ふとんを たたいた ばあちゃん（seen_futon_tori）を 見た人は 推測
					if (s.flag("seen_405_wagomu"))
						await s.say("kiriko", "（ばあちゃんの　輪ゴム\nンゴ）");
					else if (s.flag("seen_futon_tori"))
						await s.say("kiriko", "（ふとんの　ばあちゃん\nンゴ……？）");
					return;
				}
				s.set("seen_danchi_405");
				await s.narrate("ぎんいろの郵便受けの列。");
				await s.narrate(
					t === "yoru"
						? "405の口から、チラシが\n一まい　おちかけている。"
						: "405の口だけ、チラシが\nあふれている。",
				);
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
			// ゆうべの カレー（夕・宵で seen_awin_danchi）→ 朝も まだ におう
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("一階の窓。カーテンの\nすきまも、くらい。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_awin_danchi")
							? "一階の窓。ゆうべの\nカレーの　においが　まだ　する。"
							: "一階の窓。\nごはんの　たける　におい。",
					);
					return;
				}
				s.set("seen_awin_danchi");
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
			// 夕・宵に よんだ人（seen_kairan_mita）だけ、深夜は そのまま・朝は つぎの家へ。
			// ③ つきみ秋まつりの おしらせ（seen_aki_danchi → nostalgia akiMatsuri）
			run: async (s) => {
				const t = s.flag("tod");
				const mita = !!s.flag("seen_kairan_mita");
				if (t === "asa") {
					if (!mita) {
						await s.narrate("郵便受けの上は、\nなにも　ない。");
						return;
					}
					await s.narrate("回覧板が、なくなっている。\nもう、つぎの家だ。");
					// ゆうべサインしていれば一言（P0-9）。そうでなく 回覧板の人に「つぎは」を
					// 聞いた人（kairan_hito の2回目・seen_kairan_tsugi）には、行き先を
					if (s.flag("seen_kairan_sign"))
						await s.say("kiriko", "（吾輩の字も、\nいっしょに　行ったンゴ）");
					else if (s.flag("seen_kairan_tsugi"))
						await s.say("kiriko", "（やまもとさんちンゴ）");
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						mita
							? "回覧板は、そのままだ。"
							: "郵便受けの上に、回覧板。\nくらくて　よめない。",
					);
					return;
				}
				s.set("seen_kairan_mita");
				s.set("seen_aki_danchi");
				if (t === "yoru") {
					await s.narrate("回覧板。外灯で、\nサインらんが　白い。");
					await s.narrate("表紙に『つきみ秋まつりの\nおしらせ』。");
				} else {
					await s.narrate(
						"郵便受けの上に、回覧板。\n『つきみ秋まつりの　おしらせ』",
					);
					await s.narrate("ひもで、ボールペンが\nむすんである。");
				}
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
				// 建った順 A→B→C→D（予定）。annaizu の二度目で 回収
				s.set("seen_bplate_atarashi");
			},
		},
		{
			id: "b_win_tv",
			x: 21,
			y: 5,
			trigger: "talk",
			// 既存 P0-2 延長: 部屋のテレビで 中継の 打ち切り（seen_chukei_end）を 見た人だけ、
			// 宵は 声が きれて カーテンが しまる（あきらめた 家。ラジオの つづきは kokudo・umi に
			// まかせる）→ 朝は おなじ窓の声「けっきょく　見た？」（結果の 数字は 書かない）
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("B棟の一階。\nしずかだ。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_chukei_end")) {
						await s.say(null, "ゆうべの　やきう、\nけっきょく　見た？", {
							name: "窓の声",
						});
						await s.say("kiriko", "（さいごまでは、\n見られなかったンゴ）");
						return;
					}
					await s.narrate("B棟の一階。朝の\nニュースの声。");
					return;
				}
				// 宵は延長の段に関係なく「実況」だけ（P0-2。テレビ・中継の語は使わない＝
				// 部屋のテレビの中継が打ち切られたあとも、食いちがわない）。
				// seen_chukei_end の枝は、打ち切りのあと（声が きれた）を 物の変化で 見せるだけ
				if (t === "yoru") {
					if (s.flag("seen_chukei_end")) {
						await s.narrate(
							"B棟の一階。やきうの　声が\nきれて、カーテンが　しまった。",
						);
						return;
					}
					await s.narrate("B棟の一階。窓から、\nやきうの　実況。");
					return;
				}
				await s.narrate("B棟の一階。テレビの\n野球中けいの声。");
			},
		},
		{
			// てすりの かさ（夕・宵で seen_kasa_danchi）→ 深夜も そのまま →
			// 朝、なくなっている（もちぬしは 会釈の人＝eshaku_asa）
			id: "b_stairs",
			x: 23,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const mita = !!s.flag("seen_kasa_danchi");
				if (t === "asa") {
					await s.narrate(
						mita
							? "てすりのかさが、\nなくなっている。"
							: "B棟の階段。てすりが、\n朝日で　あたたかい。",
					);
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						mita
							? "かさは、そのままだ。"
							: "B棟の階段。てすりが、\n夜つゆで　つめたい。",
					);
					return;
				}
				s.set("seen_kasa_danchi");
				await s.narrate(
					t === "yoru"
						? "B棟の階段。てすりの\nかさが、外灯で　ひかっている。"
						: "B棟の階段。てすりに、\nかさが一本　かかっている。",
				);
			},
		},
		{
			// 風りん（夕・宵で seen_furin_danchi）→ 深夜の 風は ここが 受ける →
			// 朝、はずされている（見た人にだけ）。natsuCount（夏まつりの 名残）には 数えない
			id: "b_win_furin",
			x: 25,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("風りんが、ときどき\nひとつ　鳴る。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_furin_danchi")) {
						await s.narrate("風りんが、もう\nはずされている。");
						await s.say("kiriko", "（ゆうべのが、ことしの\nさいごンゴ）");
						return;
					}
					// arrive_asa の「カーテンの　あく音」と かぶらない絵（初秋）
					await s.narrate("一階の窓。あみどに、\nトンボが　とまっている。");
					return;
				}
				s.set("seen_furin_danchi");
				await s.narrate(
					t === "yoru"
						? "風りんが、外灯の\nほうへ　ゆれている。"
						: "一階の窓に、風りん。\nちりん、と一度だけ。",
				);
			},
		},
		{
			// ㉚ ふとん（夕・宵で seen_futon_b）。ばあちゃん（futon_tori・seen_futon_tori）に
			// 会った人には、宵は たたいたあと。深夜は 出しっぱなし → 朝、やっと とりこまれている
			// （るすの家が かえってきた。ばあちゃんの「なしを　もらってね」へ）。
			// 「ぱん、ぱん」は sumire（arrive_asa・monohoshi の「ここだった」）だけに のこす
			id: "b_futon",
			x: 27,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const tori = !!s.flag("seen_futon_tori");
				const dashippa = tori || !!s.flag("seen_futon_b");
				if (t === "shinya") {
					await s.narrate(
						dashippa
							? "ベランダに、ふとんが\n出しっぱなしの家が一けん。"
							: "ベランダは、\nどこも　くらい。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate(
						dashippa
							? "出しっぱなしだった　ふとんが、\nやっと　とりこまれている。"
							: "二階の　ベランダに、\nふとんが　一まい　出た。",
					);
					return;
				}
				s.set("seen_futon_b");
				if (t === "yoru") {
					await s.narrate(
						tori
							? "二階の　ふとん、たたいた\nあとみたいに　ふくらんでいる。"
							: "二階のベランダに、\nふとんが　まだ　ほしてある。",
					);
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
				// はがしあと＝むかしの『予定』。annaizu の二度目で 回収
				s.set("seen_cplate_shiiru");
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
					// なわとびの子（seen_nawatobi）を 見た人に 一度だけ（seen_nawatobi_asa）。
					// 深夜に てつぼうの『10』（seen_nawatobi_10）を 見ていれば キリコ
					if (
						numFlag(s, "seen_nawatobi") >= 1 &&
						!s.flag("seen_nawatobi_asa")
					) {
						s.set("seen_nawatobi_asa");
						s.se("stairs", { volume: 0.4 });
						await s.narrate(
							"ランドセルの子が、\nなわとびを　まいて　おりてきた。",
						);
						await s.say(null, "……じゅっかい、いった。\n見てなかったでしょ", {
							name: "なわとびの子",
						});
						if (s.flag("seen_nawatobi_10"))
							await s.say("kiriko", "（チョークで　見たンゴ）");
						return;
					}
					await s.narrate("上から、とん、とん、と\nおりてくる音。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("階段に、おふろの\nにおいが　おりてくる。");
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
					// ⑰ たまごの 買いもの帰り（kaimono_yu の seen_kaimono_danchi）を 聞いた人だけ
					if (s.flag("seen_kaimono_danchi")) {
						await s.narrate("たまごやきの　におい。");
						await s.say("kiriko", "（やすかった　たまご\nンゴ）");
						return;
					}
					await s.narrate("トースターの、ちん、と\nいう音がした。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"おさらを　あらう音。\nたまねぎの　においだけ　のこる。",
					);
					return;
				}
				await s.narrate("たまねぎを　いためる音と、\nにおい。");
			},
		},
		{
			// ミニトマト（夕・宵で seen_tomato_danchi）→ 深夜も ふたつぶ →
			// 朝、窓から 手が のびて 一つぶ（一度だけ seen_tomato_asa。あとは へったまま）
			id: "c_ura_pot",
			x: 1,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const mita = !!s.flag("seen_tomato_danchi");
				if (t === "asa") {
					if (!mita) {
						await s.narrate("プランターのミニトマト。\nあかい実が、ひとつぶ。");
						return;
					}
					if (!s.flag("seen_tomato_asa")) {
						s.set("seen_tomato_asa");
						await s.narrate(
							"C棟の窓から　手がのびて、\n一つぶ　もいでいった。",
						);
						await s.say("kiriko", "（べんとうの\nいろどりンゴ）");
						return;
					}
					await s.narrate("ミニトマトは、\nひとつぶに　へっている。");
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						mita
							? "ミニトマトの実は、\nふたつぶのままだ。"
							: "プランターの葉が、\n夜風で　ゆれている。",
					);
					return;
				}
				s.set("seen_tomato_danchi");
				await s.narrate(
					t === "yoru"
						? "プランターのミニトマト。\nくらがりに、実が　ふたつぶ。"
						: "プランターのミニトマト。\nあかい実が、ふたつぶ。",
				);
			},
		},

		// ── 中庭（すなば・てつぼう・花だん・外灯。座る場所は A棟の階段にまかせる） ──
		...[7, 8].map(
			(x): EventDef => ({
				// バケツの城（夕・宵で seen_sandbox_danchi）→ 朝、すこし くずれる。
				// 深夜のスコップは、広場の バケツ（seen_baketsu）を 知っている人だけ ぬいて もてる
				// （seen_scoop_motsu）。しまうのは、広場まで 歩いて バケツの前で（baketsu の深夜
				// → seen_scoop_shimau → 朝の baketsu）。地続き: ここから バケツには 手が とどかない
				id: `sandbox_${x}`,
				x,
				y: 9,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						if (s.flag("seen_scoop_motsu")) {
							await s.narrate("すなばに、スコップの\nささっていた　あな。");
							return;
						}
						await s.narrate("すなば。スコップが\nささったままだ。");
						if (!s.flag("seen_baketsu")) return;
						const i = await s.choose(
							["＞＞1 ぬいて　もっていく", "＞＞2 そのまま"],
							{ cancel: 1 },
						);
						if (i !== 0) return;
						s.set("seen_scoop_motsu");
						await s.narrate("スコップを　ぬいた。");
						return;
					}
					if (t === "asa") {
						await s.narrate(
							s.flag("seen_sandbox_danchi")
								? "バケツの城は、すこし\nくずれていた。"
								: "すなば。すなが、\nつゆで　しめっている。",
						);
						return;
					}
					s.set("seen_sandbox_danchi");
					await s.narrate(
						t === "yoru"
							? "すなば。バケツの城が、\nくらがりに　ひとつ。"
							: "すなば。バケツの城が、\nひとつ　できている。",
					);
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
				const t = s.flag("tod");
				if (t === "shinya") {
					// なわとびの子（seen_nawatobi）を 見た人だけ、チョークの『10』
					// （seen_nawatobi_10 → 朝の c_stairs）
					if (numFlag(s, "seen_nawatobi") >= 1) {
						s.set("seen_nawatobi_10");
						// 宵の『3』『6』『9』（seen_tetsubo_chalk）を 見た人だけ「『9』の　となり」
						await s.narrate(
							s.flag("seen_tetsubo_chalk")
								? "『9』の　となりに、\n『10』。まるが　ついている。"
								: "てつぼうの下に、チョークで\n『10』。まるが　ついている。",
						);
						return;
					}
					await s.narrate("てつぼうが、夜つゆで\nぬれている。");
					return;
				}
				if (t === "yoru") {
					// なわとびの子（seen_nawatobi）を 見た人は、宵に『3』『6』『9』→ 深夜に『10』（段）
					if (numFlag(s, "seen_nawatobi") >= 1) {
						s.set("seen_tetsubo_chalk");
						await s.narrate("てつぼうの　下に、チョークで\n『3』『6』『9』。");
						return;
					}
					await s.narrate("外灯で、てつぼうの\nかげが　すなばまで　のびる。");
					return;
				}
				if (t === "asa") {
					await s.narrate("てつぼうに、\nスズメが　ならんでいる。");
					// 夕方の クスノキの ねぐら（kusunoki の seen_kusunoki_suzume）を 見た人だけ
					if (s.flag("seen_kusunoki_suzume"))
						await s.say("kiriko", "（クスノキの　とまり客\nンゴ）");
					return;
				}
				await s.narrate("てつぼう。にぎると\nひんやりする。");
				await s.say("kiriko", "……さか上がりは、\nくろれきしンゴ");
			},
		},
		...[10, 11].map(
			(x): EventDef => ({
				// ひがんばなの くき（彼岸の前）。夕・宵・深夜に 見た人（seen_kadan_kuki）は、
				// 深夜に 先が ふくらみ → 朝、あかく ほどけかける（ひと晩の のび）
				id: `kadan_${x}`,
				x,
				y: 11,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					const mita = !!s.flag("seen_kadan_kuki");
					if (t === "asa") {
						if (mita) {
							await s.narrate("くきの　先が、あかく\nほどけかけていた。");
							await s.say("kiriko", "（ひと晩ぶん、\nのびたンゴ）");
							return;
						}
						await s.narrate("花だん。『みどりの会』の\n札が　立っている。");
						await s.narrate("土が、しめっている。\n水やりの　あとだ。");
						return;
					}
					if (t === "shinya") {
						s.set("seen_kadan_kuki");
						await s.narrate(
							mita
								? "くきの　先が、\nふくらんでいる。"
								: "ひがんばなの　くきの　先が、\nふくらんでいる。",
						);
						return;
					}
					s.set("seen_kadan_kuki");
					await s.narrate(
						t === "yoru"
							? "外灯で、ひがんばなの\nくきの　かげが　ながい。"
							: "花だんに、ひがんばなの\nくきが　一本　のびている。",
					);
				},
			}),
		),
		{
			id: "gaito_niwa",
			x: 14,
			y: 7,
			trigger: "talk",
			// なわとびの子（nawatobi_kid・seen_nawatobi）を 見た人だけ、宵は 下の土に すれたあと。
			// 夕は「外灯が　つくまでに」（2段目＝seen_nawatobi 2 以上）を 聞いた人だけ、まだ つかない外灯を
			// 見上げる（その先の『10』は tetsubo・c_stairs）
			run: async (s) => {
				const t = s.flag("tod");
				const nawa = numFlag(s, "seen_nawatobi") >= 1;
				if (t === "shinya") {
					await s.narrate("この明かりの下だけ、\n地面が　白い。");
					return;
				}
				if (t === "asa") {
					await s.narrate("外灯は、もう\nきえている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						nawa
							? "外灯の　下の　土に、\nなわとびの　すれた　あと。"
							: "中庭の外灯に、\n羽虫が　あつまりはじめた。",
					);
					return;
				}
				await s.narrate("中庭の外灯。\nまだ、ついていない。");
				// 回収: 大どおりの帯で ヒグラシが 鳴かなくなった人（seen_higurashi_danchi 3回以上）
				if (numFlag(s, "seen_higurashi_danchi") >= 3)
					await s.narrate("ヒグラシが、もう\nきこえない。");
				if (numFlag(s, "seen_nawatobi") >= 2)
					await s.say("kiriko", "（これが　つくまで、\nンゴね）");
			},
		},

		// ── 駐輪場・じはんき・クスノキ ──
		{
			// 夕刊を のせたままの 一台（夕・宵で seen_yukan_jitensha）→ 深夜も そのまま →
			// 朝、いちばんに 出ていく（一度だけ seen_yukan_asa）
			id: "chuurinjo_a",
			x: 20,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const mita = !!s.flag("seen_yukan_jitensha");
				if (t === "asa") {
					if (mita && !s.flag("seen_yukan_asa")) {
						s.set("seen_yukan_asa");
						await s.narrate(
							"夕刊をのせたままの　一台が、\nいちばんに　出ていった。",
						);
						await s.say("kiriko", "（つんだままンゴ）");
						return;
					}
					await s.narrate("駐輪場。自転車が\nどんどん　出ていく時間だ。");
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						mita
							? "かごの夕刊が、夜つゆで\nしなっている。"
							: "自転車の列が、外灯で\nひかっている。",
					);
					return;
				}
				s.set("seen_yukan_jitensha");
				await s.narrate("駐輪場。かごに夕刊が\n入ったままのが、一台。");
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
					// この じはんきで 一本目を 買ったとき（kanLv 0→1）だけ seen_kan_danchi
					const before = kanLv(s);
					await kanShinya(s);
					if (before === 0 && kanLv(s) >= 1) s.set("seen_kan_danchi");
					return;
				}
				// おしるこの 札: 夕 補充の人が 札を かえる（seen_shiruko_fuda）→ 二度目は 赤い札 →
				// 宵 その札が あかるい → 宵の二度目は 札に ガ（seen_shiruko_yoru）→ 深夜の 一本 → 朝の つめかえ（補充の人）
				if (t === "asa") {
					await s.narrate("じはんきの　前で、缶の\nつめかえを　している。");
					// 深夜に この じはんきで 缶を 買った人（seen_kan_danchi）だけ。
					// そうでなく 夕方に 札を かえる人を 見た人（seen_shiruko_fuda）は その人だと 気づく
					if (s.flag("seen_kan_danchi"))
						await s.say("kiriko", "（ゆうべの　一本ぶん\nンゴ）");
					else if (s.flag("seen_shiruko_fuda"))
						await s.say("kiriko", "（きのうの　補充の\n人ンゴ）");
					return;
				}
				if (t === "yoru") {
					// 宵の二度目: あかるい札に ガが よってくる
					if (s.flag("seen_shiruko_yoru")) {
						await s.narrate(
							"赤い札の　あかりに、\nちいさな　ガが　とまっている。",
						);
						return;
					}
					s.set("seen_shiruko_yoru");
					// 夕方に 札を かえる手を 見た人（seen_shiruko_fuda）だけ、その札が 光る
					await s.narrate(
						s.flag("seen_shiruko_fuda")
							? "さっき　かえた　赤い札だけ、\nあかるい。"
							: "おしるこの　段だけ、札が\n赤い『あったか～い』に。",
					);
					return;
				}
				// 夕方: 一度目は 補充の人が 札を かえている（宵・朝で 回収）
				if (!s.flag("seen_shiruko_fuda")) {
					s.set("seen_shiruko_fuda");
					await s.narrate("補充の　人が、おしるこの\n札を　はがしている。");
					await s.say(null, "あしたから、ひえるって\nいうからね", {
						name: "補充の人",
					});
					return;
				}
				await s.narrate("おしるこの　段だけ、\n札が　赤い。");
			},
		},
		{
			id: "kusunoki",
			x: 28,
			y: 10,
			trigger: "talk",
			// スズメの ねぐら: 夕方 すいこまれていく（seen_kusunoki_suzume）→ 宵は しずか →
			// 深夜は はばたき → 朝、いっせいに とびだす（一度だけ seen_kusunoki_asa）・てつぼうの スズメ
			run: async (s) => {
				const t = s.flag("tod");
				const mita = !!s.flag("seen_kusunoki_suzume");
				if (t === "shinya") {
					await s.narrate(
						mita
							? "はっぱの　おくで、ときどき\nちいさな　はばたき。"
							: "クスノキ。こずえの鳴る音が\n上をとおっていく。",
					);
					return;
				}
				if (t === "asa") {
					if (mita && !s.flag("seen_kusunoki_asa")) {
						s.set("seen_kusunoki_asa");
						s.se("suzume", { pan: 0.4, volume: 0.8 });
						await s.narrate("クスノキから、スズメが\nいっせいに　とびだした。");
						await s.say("kiriko", "（満員の　ぶんンゴ）");
						return;
					}
					await s.narrate("すずめの声が、\n上から　ふってくる。");
					return;
				}
				if (t === "yoru") {
					// 宵は夕日のかわりに、外灯(29,7)のあかり
					await s.narrate(
						mita
							? "クスノキは、しずかだ。\nなかに、あれだけ　いるのに。"
							: "大きなクスノキ。はっぱの\nすきまから、外灯のあかり。",
					);
					return;
				}
				s.set("seen_kusunoki_suzume");
				s.se("suzume", { pan: 0.4, volume: 0.6 });
				await s.narrate("クスノキに、スズメが\nつぎつぎ　すいこまれていく。");
				await s.say("kiriko", "（なかは、満員ンゴ）");
			},
		},

		// ── 大どおり（案内図・ごみ置き場。カーブミラーは すみれ側に まかせる） ──
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
					// 表示板（b_plate・c_plate）を 読んだ人だけ、建った順を つなぐ（どちらか一つ）
					if (s.flag("seen_cplate_shiiru"))
						await s.say("kiriko", "（Cも、むかしは\n『予定』だったンゴ？）");
					else if (s.flag("seen_bplate_atarashi"))
						await s.say("kiriko", "（Bも、あとから\nできたンゴね）");
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
			// ⑯ ゴミの日の 札（夕・宵で seen_gomi_fuda → gomi_asa・sumire gomidashi・apart keiji の朝）
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("ごみ置き場に、ふくろが\nならびはじめた。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("ごみ置き場。ネットが\nきちんと　たたんである。");
					return;
				}
				s.set("seen_gomi_fuda");
				await s.narrate("ごみ置き場の　かべに、\n『もえるごみ　火・金』の札。");
			},
		},

		// ── 南の広場（看板・三輪車・物置・バケツ。干しものは ふとんの筋1本に） ──
		{
			id: "taiso_kanban",
			x: 19,
			y: 19,
			trigger: "talk",
			// 夕・宵に よんだ人（seen_taiso_kanban）→ 深夜は おぼえている → 朝の じいちゃん（taiso_jichan）。
			// ⑲ 宵は 部屋の天気よほう（room tv の seen_tenki）を 見た人だけ キリコ
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					s.set("seen_taiso_kanban");
					await s.narrate(
						"くらがりで、『6時半』の　字だけ\n白く　うかんでいる。",
					);
					if (s.flag("seen_tenki"))
						await s.say("kiriko", "（あしたは　はれ。\n6時半、あるンゴ）");
					return;
				}
				if (t === "shinya") {
					await s.narrate("看板は、くらくて\nよみにくい。");
					// 夕・宵に よんだ人（seen_taiso_kanban）だけ
					if (s.flag("seen_taiso_kanban"))
						await s.say("kiriko", "……よまなくても、\nおぼえてるンゴ");
					return;
				}
				await s.narrate("『あさのラジオ体そう』\n『毎あさ　6時半から』");
				// 朝の「おわったあと」は、じいちゃん（taiso_jichan）にまかせる
				if (t === "asa") return;
				s.set("seen_taiso_kanban");
				await s.narrate("『しゅうかいじょ前　雨天\n中止』。手書きだ。");
			},
		},
		{
			// 三輪車（夕・宵で seen_sanrinsha）→ 深夜も たおれたまま → 朝、おきあがっている
			id: "sanrinsha",
			x: 9,
			y: 20,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const mita = !!s.flag("seen_sanrinsha");
				if (t === "shinya") {
					await s.narrate(
						mita
							? "三輪車は、たおれたまま\n夜つゆに　ぬれている。"
							: "三輪車が、夜つゆに\nぬれて　たおれている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate(
						mita
							? "三輪車が、ちゃんと\nおきあがっている。"
							: "三輪車が、とめてある。",
					);
					return;
				}
				s.set("seen_sanrinsha");
				await s.narrate("三輪車が、ころんと\nたおれている。");
				if (t === "yoru") {
					await s.say("kiriko", "（もちぬしは、いまごろ\nおふろンゴ）");
					return;
				}
				await s.say("kiriko", "（もちぬしは、\nばんごはん中ンゴ）");
			},
		},
		{
			id: "soko_crate",
			x: 28,
			y: 16,
			trigger: "talk",
			// つなの はみ出し（夕・宵で seen_tsuna_danchi）→ 深夜は はしだけ 白い → 朝、おしこんである
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("くらがりに、つなの　はしだけ\n白く　見える。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『じちかい』と書かれた\n木箱。");
					// 夕・宵に はみ出しを 見た人だけ。夕の 管理人さん（kanrinin の seen_kanrinin）を 知る人に キリコ
					if (s.flag("seen_tsuna_danchi")) {
						await s.narrate("はみ出していた　つなが、\n中に　おしこんである。");
						if (s.flag("seen_kanrinin")) {
							await s.say("kiriko", "（ほうきの　人ンゴ）");
							return;
						}
					}
					// キリコの 心の声は 一つだけ（ほうきの人を 出さなかったときに 秋まつり）
					if (akiMatsuri(s))
						await s.say("kiriko", "（秋まつりの　つなひき\nンゴ？）");
					return;
				}
				s.set("seen_tsuna_danchi");
				await s.narrate("『じちかい』と書かれた\n木箱。");
				await s.narrate("つなひきの　つなが\nはみ出している。");
				// ③ つきみ秋まつりの おしらせ（回覧板・はり紙・ほかの町。nostalgia akiMatsuri）を 見た人だけ
				if (akiMatsuri(s))
					await s.say("kiriko", "（秋まつりの　つなひき\nンゴ？）");
			},
		},
		{
			id: "baketsu",
			x: 29,
			y: 21,
			trigger: "talk",
			// すなば道具の かくし場所（seen_baketsu）を 知ると、深夜の すなばで スコップを ぬける
			// （seen_scoop_motsu）。もって ここまで 来ると しまう（seen_scoop_shimau）。
			// しまった人だけ、朝 スコップが ちゃんと ある。もったまま 朝に なった人は、朝 かえす
			run: async (s) => {
				const t = s.flag("tod");
				const motsu = !!s.flag("seen_scoop_motsu");
				const shimau = !!s.flag("seen_scoop_shimau");
				if (t === "asa") {
					if (shimau) {
						await s.narrate("バケツの下に、スコップが\nちゃんと　ある。");
						await s.say("kiriko", "（吾輩の　しごとンゴ）");
						return;
					}
					if (motsu) {
						s.set("seen_scoop_shimau");
						await s.narrate(
							"ゆうべの　スコップを、\nバケツの　下に　かえした。",
						);
						await s.say("kiriko", "（一晩、あずかって\nいたンゴ）");
						return;
					}
					await s.narrate("ふせたバケツ。\nつゆで　ぬれている。");
					return;
				}
				if (t === "shinya" && shimau) {
					await s.narrate(
						"ふせたバケツ。下から、\nスコップの　柄が　のぞいている。",
					);
					return;
				}
				if (t === "shinya" && motsu) {
					s.set("seen_scoop_shimau");
					await s.narrate("ふせたバケツの　下に、\nスコップを　しまった。");
					return;
				}
				// 夕・宵（深夜に先に ここへ 来ても）、かくし場所を 知る
				s.set("seen_baketsu");
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
				// ⑤ 朝: 深夜の あつまり（seen_neko_shukai）を 見た人には、のこった 一ぴき
				if (s.flag("tod") === "asa") {
					if (s.flag("seen_neko_shukai")) {
						await s.narrate("一ぴきだけ、まだ\nまるく　なっている。");
						await s.say("kiriko", "（おまえは、ここの\n子ンゴね）");
						return;
					}
					if (!s.flag("seen_neko_danchi")) {
						s.set("seen_neko_danchi");
						await s.narrate("……先客がいた。");
					}
					await s.narrate("ねこが、つゆの　草で\n顔を　あらっている。");
					return;
				}
				// ⑤ 夕方に よその ねこを 見ていれば、深夜は ここに あつまっている
				if (
					s.flag("tod") === "shinya" &&
					nekoSeen(s) > 0 &&
					!s.flag("seen_neko_shukai")
				) {
					s.set("seen_neko_shukai");
					s.set("seen_neko_danchi");
					await s.narrate("……先客が、いっぱい\nいた。");
					await s.narrate("ねこが　四ひき、\nまるく　すわっている。");
					await s.narrate("夕方に　見た　かおが、\nまざっている。");
					// ⑤ 駅前の コンテナの 毛（ekimae crates_b の seen_neko_eki）を 見た人だけ
					if (s.flag("seen_neko_eki"))
						await s.narrate(
							"コンテナに　ついていた　毛と\nおなじ　いろの　子も　いる。",
						);
					await s.say("kiriko", "（夜は、ここに\nあつまるンゴね）");
					return;
				}
				if (s.flag("seen_neko_shukai") && s.flag("tod") === "shinya") {
					await s.narrate("ねこたちは、まだ\nまるく　すわっている。");
					return;
				}
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
			// ⑰ たまご（seen_kaimono_danchi → 朝の c_win）。キリコの一言は 井戸端の うわさ
			// （sumire obachan_a の seen_obachan）に 気づくだけ（「ちゃんと　かえた」の答えは、
			// 朝の sumire gomidashi の 本人の一言にまかせる）。続けて 一つだけ:
			// ⑱ スーパーの まよう奥さん（seen_suupaa_okusan）＞ 放送の 段（seen_suupaa_tamago 2 以上）
			async (s) => {
				if (s.flag("seen_kaimono_danchi")) {
					await s.say(null, "こどもを　つれてくと、\n二パック　かえるの", {
						name: "買いものの人",
					});
					return;
				}
				s.set("seen_kaimono_danchi");
				await s.say(null, "スーパーみなみの帰りなの。\nたまご、安かったわよ", {
					name: "買いものの人",
				});
				await s.say(
					"kiriko",
					s.flag("seen_obachan")
						? "（おばちゃんの　うわさの\nたまごンゴ）"
						: "（たまごンゴ……）",
				);
				if (numFlag(s, "seen_suupaa_okusan") >= 1) {
					// suupaa okusan の2段目は、先に コロッケを 買った人（got_korokke）に ゆずって
					// アジフライ、それ以外は「りょうほう」。ここからは 買った順が 見えないので、
					// コロッケを もっている人には、どちらの 段とも 合う「アジフライ　ふたつ」だけ言う
					await s.say(
						null,
						s.flag("got_korokke")
							? "コロッケの　子ね。\nアジフライ、ふたつ　買ったわ"
							: "けっきょく、\nりょうほう　買ったわ",
						{ name: "買いものの人" },
					);
					await s.say("kiriko", "（さっきの　人ンゴ）");
					return;
				}
				if (numFlag(s, "seen_suupaa_tamago") >= 2)
					await s.say(null, "さいごの　一パック、\nとれたのよ", {
						name: "買いものの人",
					});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"nawatobi_kid",
			12,
			10,
			KID,
			// 段（seen_nawatobi 数・話すたび +1）: 3回 → 6回（「外灯が　つくまでに」→ gaito_niwa）→ 9回。
			// 深夜の てつぼうの『10』（seen_nawatobi_10）・朝の C棟の階段へ
			async (s) => {
				const n = numFlag(s, "seen_nawatobi");
				s.set("seen_nawatobi", n + 1);
				if (n === 0) {
					await s.say(null, "二じゅうとび、きょうこそ\n十回いくから。見てて", {
						name: "なわとびの子",
					});
					await s.narrate("……三回で　ひっかかった。");
					await s.say(null, "いまのは　じゅんび", { name: "なわとびの子" });
					return;
				}
				if (n === 1) {
					await s.say(null, "……六回。外灯が　つくまでに、\n十回　いくから", {
						name: "なわとびの子",
					});
					return;
				}
				await s.say(null, "……九回。……つぎ、\n見てなくて　いいから", {
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
				// 2回目: 行き先（seen_kairan_tsugi → 朝の kairanban で回収）
				s.set("seen_kairan_tsugi");
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
				// ㉚ 朝も おなじ場所に。夕方に るすの家の ふとんを たたいた（seen_futon_tori）人には、
				// その家から 梨（宵は b_futon・布団は room bed が 読む）。
				// 405の あふれた チラシ（postbox_a の seen_danchi_405）を 見た人には、輪ゴムの ぬし
				// （seen_405_wagomu → postbox_a の朝）
				if (s.flag("tod") === "asa") {
					if (s.flag("seen_futon_tori")) {
						await s.say(null, "けさ、るすの　うちから\nなしを　もらってね", {
							name: "ばあちゃん",
						});
						if (s.flag("seen_danchi_405")) {
							s.set("seen_405_wagomu");
							await s.say(null, "405さんの　チラシも、\nたばねといたよ", {
								name: "ばあちゃん",
							});
						}
						await s.say("kiriko", "（たたいた　かいが\nあったンゴ）");
						return;
					}
					await s.say(null, "ふとん、ほすよ。\nきょうは　晴れるからね", {
						name: "ばあちゃん",
					});
					return;
				}
				if (!s.flag("seen_futon_tori")) {
					s.set("seen_futon_tori");
					await s.narrate("二かいのベランダを\n見上げて、手をふっている。");
					await s.say(null, "ふとーん。ふとん、\nとりこむよーー", {
						name: "ばあちゃん",
					});
					await s.narrate("……へんじが　ない。");
					// 「しめっけは　敵」は 1回目に言う（seen_futon_tori は ここで立つ。読み手が
					// 1回しか 話していない人にも 通じるように）
					await s.say(
						null,
						"るすだね。しめっけは　敵。\nかわりに　たたいておくか",
						{
							name: "ばあちゃん",
						},
					);
					await s.say("kiriko", "（ひとの家のを、\nンゴ……？）");
					return;
				}
				await s.say(null, "うちのじゃないよ。でも、\nほっとけないからね", {
					name: "ばあちゃん",
				});
			},
			{
				dir: "up",
				when: (st) => st.flags.tod === "yu" || st.flags.tod === "asa",
			},
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
				// ⑯ ゴミの日の 札（danchi gomi の seen_gomi_fuda・apart keiji の seen_keiji）を 見た人
				if (s.flag("seen_gomi_fuda") || s.flag("seen_keiji")) {
					await s.say("kiriko", "か、かようと\nきんよう、ンゴ！");
					await s.say(null, "あら。たすかる", { name: "ごみ出しの人" });
					return;
				}
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
					// 体そうは 6時半＝もう おわっている（もとの 朝の帯 taisoato を ここの頭へ）
					s.se("record", { pan: 0.3, volume: 0.35 });
					await s.narrate("集会所の　前で、ラジオを\nかたづける音。");
					await s.say(null, "体そうかい？　きょうの分は\nもう　おわったよ", {
						name: "じいちゃん",
					});
					// 看板の『6時半』（taiso_kanban の seen_taiso_kanban）を よんだ人は、おぼえていた側の いいわけ
					await s.say(
						"kiriko",
						s.flag("seen_taiso_kanban")
							? "ろ、6時半は　おぼえて\nいたンゴ……"
							: "ね、ねぼうでは\nないンゴ",
					);
					await s.say(
						null,
						"おわったあとの　のばしが\nだいじでな。……よっ、と",
						{
							name: "じいちゃん",
						},
					);
					// 回収は 一つだけ: ⑩ 案内図の『D棟（予定）』に 気づいた 人 ＞
					// 夕方の 管理人さん（kanrinin の seen_kanrinin）と 話した 人
					if (s.flag("seen_annaizu2")) {
						await s.say(null, "D棟が　たつまでは、\nここで　やるさ", {
							name: "じいちゃん",
						});
					} else if (s.flag("seen_kanrinin")) {
						await s.narrate("……ゆうべの、\n管理人さんだ。");
						await s.say(null, "体そうのあとは、ほうきさ。\n……また　落ちてる", {
							name: "じいちゃん",
						});
					}
					return;
				}
				// 2回目: 夕方の 集会所の『まった！』（shuukaijo_win の seen_shogi_danchi）を 聞いた人に 一度
				if (s.flag("seen_shogi_danchi") && !s.flag("seen_shogi_asa")) {
					s.set("seen_shogi_asa");
					await s.say(null, "ゆうべは、こどもに\n三回　まけてな", {
						name: "じいちゃん",
					});
					await s.say("kiriko", "（『まった』の　子ンゴ）");
					// 夕に 集会所の『こども将棋　ふっかつ』（shuukaijo_ev の seen_shuukaijo_hari）を よんだ人だけ
					if (s.flag("seen_shuukaijo_hari"))
						await s.say(null, "むかしは　わしが\nおしえとったんだ", {
							name: "じいちゃん",
						});
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
			// てすりの かさ（b_stairs の seen_kasa_danchi）の もちぬし。会釈して、大どおりを
			// いそいで 行ってしまう（東の出口 (31,12)＝sumire への つなぎ目まで 歩かせてから 消す。
			// その場で ふっと 消さない＝二度は 話せない）。
			// 右 (18,12) から 話しかけられたときは、一段 上 (y11) を まわって 重ならない
			async (s) => {
				await s.narrate("いそぎ足の人が、\nかさを　一本　もっている。");
				await s.narrate("会釈を　された。");
				if (s.flag("seen_kasa_danchi"))
					await s.say("kiriko", "（てすりの　かさンゴ）");
				const migi = s.state.y === 12 && s.state.x > 17;
				await s.move(
					"eshaku_asa",
					migi ? `u${"r".repeat(13)}dr` : "r".repeat(14),
					{ through: true, speed: 1.5 },
				);
				await s.wait(200);
				s.hide("eshaku_asa");
				await s.narrate("もう、大どおりの\nむこうだ。");
			},
			{ dir: "up", when: (st) => st.flags.tod === "asa" },
		),
	],
};
