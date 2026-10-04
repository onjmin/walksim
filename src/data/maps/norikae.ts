// 駅と駅のあいだの道（のりかえのみち）。えきまえ『みなみ』と となりまち『つきみ』を、
// 線路ぞいとは べつに 歩いてつなぐ、ほそい商店街の道。docs/style-everyday.md・docs/dialogue-guide.md。
// 40×16・outdoor・BGM @tod。進行には関係しない「歩くための場所」。
// 飲み屋・八百屋・古い床屋・コインパーキング・小さなお稲荷さん・貨物線のガード下。
//
// 時間帯の顔（flags.tod）:
//   夕方 … 人 4人（床屋のおじさん・お稲荷さんの おばあちゃん・八百屋の おばちゃん・道を きく 通勤の人）。
//           北西の 路地を のぼると、つきみの アーケードの うら口（夕方だけ あいている）
//   宵   … 人は出さない。やきとりの のれん・スナックの 看板・ちょうちん・ガードの上の まばらな 音
//   深夜 … 人は出さない。終電のあと。ガードは 一度目は しずか、二度目に 貨物列車が とおる
//           （seen_norikae_kamotsu 1→2）。スナックの 戸の すきまの 灯りが きえる（seen_norikae_snack 1→2）。
//           電柱の 札が 風で まわる（seen_norikae_fuda_kaze）。パーキングの 車止めに すわれる
//           （seen_suwari_norikae）。じはんきで 缶が 買える（kanShinya・kanTick）
//   朝   … 人 3人（床屋のおじさん・八百屋の おばちゃん・通勤の人）。夜と夕方の 回収
//
// 段と回収:
//   乗りかえの札  夕 矢印が ぎゃく（seen_norikae_fuda）→ 通勤の人「札、ぎゃく ですよね」
//                → 深夜 風で まわる（seen_norikae_fuda_kaze）→ 朝 ひもが 針金に・床屋「夜中に まわるから」
//   通勤の人      夕 道を きく（seen_norikae_tsuukin 1→2）→ 朝「きのうは 下見で。きょうから 本番」
//   床屋          夕 おじさん（seen_norikae_toko 1→4。ポールの 絵・まごの 背くらべ・むかしの 路地）
//                → guard_board の 線に『りく』／roji_mon・朝 ポールの カバーが はずれる
//   お稲荷さん    夕 おばあちゃんの 油あげ（seen_norikae_aburaage）→ 深夜 まだ ある（seen_norikae_age_yoru）
//                → 朝 お皿は もう ない（「あしたの 朝、お皿を さげに」の 答え）
//   八百屋        夕『つがる』・あしたは 梨（seen_norikae_yaoya 1→3）→ 朝『幸水 さいご』の 箱
//   やきとり      宵 炭の 音（seen_norikae_tare）→ 朝 空きびんの ケース
//   スナック      宵 カラオケの 前奏 → 深夜 戸の すきま 1→2 → 朝 しばった ゴミぶくろ
//   ポスター      秋まつり → 二度目 夏まつりの はし（seen_norikae_poster 2）→ 朝 はがされた
//   ガード        夕 頭の上の 電車 → 宵 まばら → 深夜 しずか → 貨物 → 朝 満員の 音
//   うら口        夕 からの 牛乳びんの 箱（seen_norikae_gyunyu）→ 宵 ナイターの 音 → 朝 びんが 二本
//   車止め        深夜 すわる（seen_suwari_norikae）→ 朝 そこに スズメ
// ほかの地区を読む所: senro guard_densha（seen_guard_densha）・seen_senro_arcade／tonarimachi
//   seen_yaoya_n・got_taiyaki／zakkyo の 宵（done:zakkyo:arrive_yoru）・seen_zakkyo_kasa1（朝の スナック）／
//   street barber（seen_toko_houki）／akiMatsuri（どこかで 秋まつりを 見た）。
//
// わき道: 床屋と じはんきの あいだの ほそい 路地（x9）。てつの 門に 南京錠で、いつも しまっている
// （のちの 寄り道の 入口の 予定地。いまは ふつうの 路地として 書く。路地の マスは 通れるが、門で 入れない）。
//
// 出入口（向きを そろえる）:
//   東 (39,9) を 右へ 踏む → ekimae (1,15) 右向き。ekimae (0,15) を 左へ → ここ (38,9) 左向き。
//     (39,8) は フェンス・(39,10) は 生けがき なので、(38,9) からしか 踏めない。
//   北西 (3,0) を 上へ 踏む → 夕方だけ tonarimachi (13,18) 上向き。ほかの 時間帯は 門が しまっていて
//     一歩 もどる。tonarimachi (13,19) を 下へ → ここ (3,1) 下向き。(2,0)(4,0) は 虚空。

import type { EventDef, MapDef, Story, TileDef } from "../../engine/defs";
import { npc } from "../helpers";
import {
	akiMatsuri,
	arrived,
	asaClock,
	kanHeld,
	kanLine,
	kanLv,
	kanShinya,
	kanTick,
	numFlag,
	shinyaClock,
	yuClock,
} from "../nostalgia";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";
import { STN } from "../tiles-station";

// ── タイル ──
// TOWN をベースに、ガードを data/tiles-station.ts の STN から借りる。
//   m  ブロックべい   -  土の路地・うらの細道   g  路地の てつの門（しまっている）
//   H  ガードの橋台   u  ガード下の道   Q  ガード下の 掲示（けた下の札）
//   c  下段の窓（白壁）   t  下段の窓（タイル）   o  しまった戸（白壁）   j  しまった引き戸（板壁）
//   G  石どうろう   =  お稲荷さんの 石だたみ   r  りんごの箱   q  ポリバケツ
//   S  シャッター   M  まつりの ポスター（シャッターの店の かべ）
//   y  パーキングの 白線と タイヤの あと   Y  精算機の 料金看板   k  車止めの ブロック（すわれる）
const PAVE = JP.pave;
const GUARD = STN.platformWall;
const tiles: Record<string, TileDef> = {
	...TOWN,
	m: { layers: [JP.ground, WALL.tileLo], color: "#c8b8a0", passable: false },
	"-": { layers: [JP.dirtPath], color: "#7a6a50", passable: true },
	g: { layers: [JP.dirtPath, JP.fence], color: "#7a6a50", passable: false },
	H: { layers: [GUARD], color: "#3a3630", passable: false },
	u: { layers: [JP.road], color: "#2a2a2e", passable: true },
	Q: {
		layers: [GUARD, STN.noticeBoard],
		color: "#3a3630",
		passable: false,
	},
	c: {
		layers: [WALL.sidingLo, WIN.sash],
		color: "#e8e8e8",
		passable: false,
	},
	t: { layers: [WALL.tileLo, WIN.sash], color: "#c8b8a0", passable: false },
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
	G: {
		layers: [JP.ishidatami, JP.stoneLantern],
		color: "#8c8c90",
		passable: false,
	},
	"=": { layers: [JP.ishidatami], color: "#8c8c90", passable: true },
	r: { layers: [PAVE, JP.ringoBox], color: "#8c8c90", passable: false },
	q: { layers: [PAVE, JP.polyBucket], color: "#8c8c90", passable: false },
	S: {
		layers: [WALL.tileLo, STN.officeShutter],
		color: "#8a8a8a",
		passable: false,
	},
	M: {
		layers: [WALL.sidingLo, JP.matsuriPoster],
		color: "#e8e8e8",
		passable: false,
	},
	y: { layers: [JP.road, JP.tireMarks], color: "#4a4a4e", passable: true },
	Y: { layers: [JP.road, JP.infoSign], color: "#4a4a4e", passable: false },
	k: { layers: [JP.road, WALL.tileLo], color: "#4a4a4e", passable: false },
};

// 北＝店の ならび（床屋・路地・じはんき・お稲荷さん・やきとり・スナック・ガード・八百屋・
// シャッターの店・コインパーキング）。まんなか＝商店街の道(y9)と 歩道(y10)。
// 南＝家々の 屋根と、そのうらの 細道(y15)。北西の 路地(x3)が つきみの うら口へ。
// ガード(x22-23)は 貨物線。道(y9-10)だけ くぐれる。
const rows = [
	"   .                                    ", // y0  つきみへ (3,0)
	"  m.m   m-m                             ", // y1  tonarimachi からの着地 (3,1)・路地の おく (9,1)
	"  m.m   m-m                             ", // y2
	"  m.m   m-m           HH                ", // y3  ガードの 橋台
	"  m.m   m-m           HH          ffffff", // y4  パーキングの フェンス
	"  m.nnnnn-aazzznnnaaaaHHnnnnnaaaaaYkkkkf", // y5  精算機 (34,5)・車止め (36,5)(37,5)
	"  m.^^^^^-AAZZZ^^^AAAAHH^^^^^AAAAAyyyyyf", // y6
	"  m.(wIw(-(([j[%I%%W$%HH%W$W%(w(w(yyyyyf", // y7  床屋の 袖看板 (6,7)・スナックの 看板 (20,7)
	"  m.)coc)gVVG=G#j##tj#QH#rqr#)SMS)yyyyyf", // y8  床屋の まど (5,8)・路地の門 (9,8)・じはんき (10,8)・さいせん (13,8)・やきとり (16,8)・スナック (20,8)・けた下 (22,8)・りんご (25,8)・ポスター (31,8)
	"  m:::::::::::::::::::uu::::::::::::::::", // y9  道。東 (39,9)→ekimae・着地 (38,9)・ガード下 (22,9)
	"  m....L..............uu.......L.......|", // y10 乗りかえの札 (7,10)・街灯 (31,10)
	"  m,nnnnnzzzzzaaaannn,HHnnnnnnzzzzaaaaa ", // y11 西の路地 (x3)・ガードわきの 細道 (x21)
	"  m,^^^^^ZZZZZAAAA^^^,HH^^^^^^ZZZZAAAAA ", // y12
	"  m,(w(w([[w[[(w(((w(,HH(w((w([w[[(w(w( ", // y13
	"  m,)o)c)]]j]])c)o)o),HH)c)c)c]]]])c)c) ", // y14 ふるい家の うら口 (11,14)
	"  m-------------------HH                ", // y15 うらの細道
];

// ── モブの歩行グラ ──
const TOKOYA = "pub:sprites/mob_ojiichan.png";
const OBAACHAN = "pub:sprites/mob_obaachan.png";
const YAOYA = "pub:sprites/mob_obachan.png";
const TSUUKIN = "pub:sprites/mob_salaryman.png";

/** つきみの うら口の 一言（tonarimachi・senro の 前振り）を、時間帯ごとに 最初の 一回だけに する（セーブしない）。 */
let uraTod = "";

/**
 * ガード下（(22,9)(22,10)。貨物線）。夕＝頭の上の 電車／宵＝まばら／深夜＝一度目は しずか、
 * 二度目に 貨物列車（seen_norikae_kamotsu 1→2）／朝＝満員の 電車。時間帯ごとに 一度ずつ。
 */
const guardBelt = (y: number): EventDef => ({
	id: `guard_${y}`,
	x: 22,
	y,
	trigger: "touch",
	through: true,
	when: (st) => {
		const t = st.flags.tod;
		if (t === "yu") return !st.flags.seen_norikae_guard_yu;
		if (t === "yoru") return !st.flags.seen_norikae_guard_yoru;
		if (t === "asa") return !st.flags.seen_norikae_guard_asa;
		const k = st.flags.seen_norikae_kamotsu;
		return typeof k !== "number" || k < 2;
	},
	run: async (s) => {
		const t = s.flag("tod");
		if (t === "yu") {
			s.set("seen_norikae_guard_yu");
			s.se("train", { volume: 1 });
			await s.wait(500);
			await s.narrate("――頭の　上を、電車が\nとおっていく。");
			await s.narrate("ガードの　天井から、\nこまかい　砂が　おちた。");
			// senro の ガード下で 電車を 聞いた人
			if (s.flag("seen_guard_densha"))
				await s.say("kiriko", "（せんろの　ガードより、\nひくいンゴ）");
			return;
		}
		if (t === "yoru") {
			s.set("seen_norikae_guard_yoru");
			s.se("train", { pan: 0.3, volume: 0.5 });
			await s.narrate("ゴトン、ゴトン。\n頭の　上の　音が、まばらだ。");
			return;
		}
		if (t === "asa") {
			s.set("seen_norikae_guard_asa");
			s.se("train", { volume: 0.9 });
			await s.wait(400);
			await s.narrate("ガードの　上を、電車が\nつづけて　とおる。");
			if (numFlag(s, "seen_norikae_kamotsu") >= 2)
				await s.say("kiriko", "（ゆうべの　ながいのとは、\n音が　ちがうンゴ）");
			else if (s.flag("seen_norikae_guard_yu"))
				await s.say("kiriko", "（夕方より、\n音が　おもたいンゴ）");
			return;
		}
		// 深夜
		if (numFlag(s, "seen_norikae_kamotsu") === 0) {
			s.set("seen_norikae_kamotsu", 1);
			await s.narrate("終電の　あとの　ガード。\nじぶんの　足音だけ。");
			return;
		}
		s.set("seen_norikae_kamotsu", 2);
		s.se("train", { pan: -0.2, volume: 0.6 });
		await s.wait(700);
		await s.narrate("……ゴトン、ゴトン。\nながい　ながい　音。");
		s.se("train", { pan: 0.2, volume: 0.5 });
		await s.wait(700);
		await s.narrate("貨物列車　らしい。\nコンテナを　かぞえてみる。");
		await s.say("kiriko", "（……23で、\nわからなくなったンゴ）");
	},
});

/**
 * 深夜、コインパーキングの 車止めに すわる（seen_suwari_norikae。kawara の fumiato・senro の
 * ブロックべいと おなじ型）。なにも起きない。暗転中は 文を 出さない。電車の 音は 鳴らさない。
 * 2回目からは 選ばずに 短い 1行だけ（缶 ＞ 精算機の 赤）。朝の kurumadome が スズメで 回収する。
 */
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_norikae")) {
		if (kanHeld(s)) await kanLine(s);
		else await s.narrate("車止めに　すわって、\n精算機の　赤を　ながめた。");
		return;
	}
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_norikae");
	await s.narrate("車止めに　こしかけて、\n目を　とじた。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate("どこかの　換気扇が、\nカタン、と　とまった。");
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("ブロックが、夜つゆで\nしっとり　つめたい。");
	await s.say("kiriko", "……つきみまで、\nあと　すこしンゴ");
};

/** 車止め（(36,5)(37,5) で 共用）。 */
const kurumadome = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("車止めの　ブロック。\nちょうど　いい　高さ。");
		await suwaru(s);
		return;
	}
	if (t === "yoru") {
		await s.narrate("車止めが、ひるまの\nぬくみを　のこしている。");
		return;
	}
	if (t === "asa") {
		// ゆうべ 深夜に すわった人（suwaru）
		if (s.flag("seen_suwari_norikae")) {
			s.se("suzume", { volume: 0.5 });
			await s.narrate("ゆうべ　すわった　車止めに、\nスズメが　一羽。");
			await s.say("kiriko", "（吾輩の　席ンゴ）");
			return;
		}
		await s.narrate("車止めに、朝つゆ。");
		return;
	}
	await s.narrate("車止めの　ブロック。\nかどが、すこし　かけている。");
};

export const norikae: MapDef = {
	id: "norikae",
	// ジオラマ表示の箱。上段＝店の ならびと 道／下段＝家の うらと 細道
	boxes: [
		{ x: 0, y: 0, w: 12, h: 11 }, // 西の 路地と 床屋
		{ x: 12, y: 0, w: 12, h: 11 }, // お稲荷さんと 飲み屋と ガード
		{ x: 24, y: 0, w: 16, h: 11 }, // 八百屋と パーキング
		{ x: 0, y: 11, w: 24, h: 5 }, // うらの 細道
		{ x: 24, y: 11, w: 16, h: 5 }, // 東の 家なみ
	],
	name: "のりかえのみち",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	outdoor: true,
	outside: "#0c0a0a",
	tiles,
	rows,
	// 光源は 店の 灯り（夕・宵）・スナックの 看板（宵）・ちょうちん（宵）・じはんき・街灯・
	// ガード下の 蛍光灯・精算機の『空』・つきみの うら口の 灯り。深夜は 店が みな くらい
	lights: [
		{ x: 5, y: 8, r: 2, only: "yu" }, // 床屋の まど
		{ x: 26, y: 8, r: 2.5, only: "yu" }, // 八百屋の 店先
		{ x: 16, y: 8, r: 2, color: "#ffcc88", only: "yu,yoru" }, // やきとりの のれん
		{ x: 20, y: 7, r: 2, color: "#ff9ec8", only: "yoru" }, // スナックの 看板
		{ x: 13, y: 8, r: 1.5, color: "#ff9a6a", only: "yoru" }, // お稲荷さんの ちょうちん
		{ x: 10, y: 8, r: 1.5, color: "#eef4ff", only: "yoru,shinya" }, // じはんき
		{ x: 22, y: 9, r: 2, color: "#e8f0ff", only: "yoru,shinya" }, // ガード下の 蛍光灯
		{ x: 7, y: 10, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 街灯（西）
		{ x: 31, y: 10, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 街灯（東）
		{ x: 34, y: 5, r: 1.5, color: "#ff6a6a", only: "yoru,shinya" }, // 精算機の『空』
		{ x: 3, y: 0, r: 2.5, color: "#ffcc88", only: "yu,yoru,shinya" }, // つきみの うら口
		{ x: 7, y: 13, r: 2, only: "yu,yoru" }, // 家の まど
		{ x: 31, y: 13, r: 2, only: "yu,yoru" },
	],
	// 入るたびに 環境音を 一波（夕方＝ヒグラシ／朝＝スズメ）。深夜は 缶が 地区ひとつぶん 冷める
	onEnter: async (s) => {
		kanTick(s);
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { volume: 0.7 });
		else if (t === "asa") s.se("suzume", { volume: 0.7 });
	},
	events: [
		// ── 着いたとき（時間帯ごとに 一度だけ。座標は y0 の 空き） ──
		{
			id: "arrive_yu",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				await s.wait(500);
				// つきみの うら口から 来た人（北西の 路地 (3,1) に 着く）
				if (s.state.y <= 2)
					await s.narrate("アーケードの　うら口から、\nほそい　路地に　出た。");
				else await s.narrate("ほそい　商店街が、\n駅から　駅へ　のびている。");
				await s.narrate("やきとりの　けむりと、\nヒグラシの　声。");
			},
		},
		{
			id: "arrive_yoru",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("のれんの　灯りが、ぽつ、ぽつと\nならんでいる。");
				if (arrived(s, "norikae", "yu"))
					await s.narrate("夕方の　人どおりは、\nもう　ない。");
			},
		},
		{
			id: "arrive_shinya",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(700);
				await s.narrate("シャッターの　道。\nじぶんの　足音が　ひびく。");
				await s.narrate("終電は、もう　行った。");
			},
		},
		// 朝: 上から 1つ（ゆうべの 深夜 ＞ 夕方 ＞ はじめての人）
		{
			id: "arrive_asa",
			x: 4,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				await s.wait(500);
				s.se("shutter", { pan: 0.4, volume: 0.4 });
				await s.wait(500);
				if (arrived(s, "norikae", "shinya")) {
					await s.narrate(
						"ゆうべ　しまっていた　店が、\nシャッターを　あげていく。",
					);
					return;
				}
				if (arrived(s, "norikae", "yu")) {
					await s.narrate(
						"きのうの　夕方の　道を、\nこんどは　朝の　人が　いそぐ。",
					);
					return;
				}
				await s.narrate("シャッターの　あがる　音。\n朝の　乗りかえの　道。");
			},
		},

		// ── 出入口（地続き） ──
		{
			id: "to_ekimae",
			x: 39,
			y: 9,
			trigger: "touch",
			exit: "right",
			through: true,
			run: async (s) => {
				await s.warp("ekimae", 1, 15, "right");
			},
		},
		// 北西: つきみの アーケードの うら口（夕方だけ あいている）
		{
			id: "to_tonarimachi",
			x: 3,
			y: 0,
			trigger: "touch",
			exit: "up",
			exitWhen: (st) => st.flags.tod === "yu",
			through: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					if (!s.flag("seen_norikae_ura")) {
						s.set("seen_norikae_ura");
						await s.narrate("路地の　さきに、アーケードの\nあかりが　見える。");
					}
					await s.warp("tonarimachi", 13, 18, "up");
					return;
				}
				const first = uraTod !== t;
				uraTod = t === undefined ? "" : String(t);
				if (t === "yoru") {
					s.se("shutter", { pan: 0.2, volume: 0.3 });
					await s.narrate("アーケードの　うら口の\nてつの門が、しまっている。");
					// 夕方に ここを くぐった人
					if (s.flag("seen_norikae_ura"))
						await s.say("kiriko", "（夕方は、あいてたンゴ）");
					// tonarimachi の たいやき（got_taiyaki）。宵の 最初の 一回だけ
					if (first && s.flag("got_taiyaki"))
						await s.narrate("門の　むこうから、まだ\nあんこの　におい。");
				} else if (t === "shinya") {
					await s.narrate("門に、南京錠。\nおくに　常夜灯が　ひとつ。");
					// senro の 西はしで アーケードを くぐった人（深夜の 最初の 一回だけ）
					if (first && s.flag("seen_senro_arcade"))
						await s.say(
							"kiriko",
							"（線路の　ほうの　入口も、\nしまってるンゴね）",
						);
				} else {
					await s.narrate(
						"門は、まだ　しまっている。\n『7時30分　開門』の　札。",
					);
					// tonarimachi の 八百屋と 話した人（朝の 最初の 一回だけ）
					if (first && numFlag(s, "seen_yaoya_n") > 0)
						await s.narrate(
							"門の　むこうで、八百屋の\nトラックが　バックしている。",
						);
				}
				await s.move("player", "d");
			},
		},

		// ── ガード下（貨物線） ──
		guardBelt(9),
		guardBelt(10),
		// けた下の 札と 背くらべの 線（回数で 段。床屋の まご『りく』は 床屋の 3回目を 聞いた人）
		{
			id: "guard_board",
			x: 22,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya" || t === "yoru") {
					s.se("hum", { volume: 0.1 });
					await s.narrate("蛍光灯が、ジーと\n鳴っている。");
				}
				const n = numFlag(s, "seen_norikae_kurabe");
				if (n === 0) {
					s.set("seen_norikae_kurabe", 1);
					await s.narrate("『けた下　2.4m』の　札。\n黄色と　黒の　しましま。");
					return;
				}
				if (n === 1) {
					s.set("seen_norikae_kurabe", 2);
					await s.narrate("しましまの　下に、\nえんぴつの　線が　いくつも。");
					await s.narrate("背くらべの　あと　らしい。");
					return;
				}
				if (numFlag(s, "seen_norikae_toko") >= 3) {
					await s.narrate("いちばん　上の　線に、\n『りく　小6』。");
					await s.say("kiriko", "（床屋の　まごンゴ）");
					return;
				}
				await s.narrate("いちばん　上の　線は、\n吾輩には　とどかない。");
			},
		},

		// ── 北の 店の ならび ──
		// 床屋の まど（サインポール）
		{
			id: "tokoya_mado",
			x: 5,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate("サインポールは　とまって、\nビニールの　カバー。");
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						"まどの　中に、いすが　三つ。\n白い　布が　かけてある。",
					);
					// street の とこやで 宵の ほうきの 音を 聞いた人
					if (s.flag("seen_toko_houki"))
						await s.say(
							"kiriko",
							"（まちの　とこやより、\nいすが　おおいンゴ）",
						);
					return;
				}
				if (t === "asa") {
					if (numFlag(s, "seen_norikae_toko") >= 1) {
						await s.narrate("サインポールの　カバーが、\nはずされている。");
						await s.narrate(`おくの　時計――${asaClock(s, 2)}。`);
						return;
					}
					await s.narrate("サインポールは、まだ\nとまっている。");
					return;
				}
				await s.narrate("床屋の　まど。\nサインポールが　まわっている。");
				// 床屋の おじさんの 2回目（「にげてるだけ」）を 聞いた人
				if (numFlag(s, "seen_norikae_toko") >= 2)
					await s.say("kiriko", "（……ほんとに、上に\nにげてるだけンゴ？）");
			},
		},
		// わき道: 床屋と じはんきの あいだの、いつも しまっている 路地（ふつうの 路地として）
		{
			id: "roji_mon",
			x: 9,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const n = numFlag(s, "seen_norikae_roji");
				if (t === "yoru") {
					await s.narrate("路地の　おくは、\nまっくらだ。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("門の　南京錠が、\n街灯で　ひかっている。");
					return;
				}
				if (t === "asa") {
					// 夕方に 門の すきまの 植木鉢を 見た人
					if (n >= 2) {
						await s.narrate(
							"植木鉢が、ぬれている。\nだれかが　水を　やったらしい。",
						);
						return;
					}
					await s.narrate("門は、けさも　しまっている。");
					return;
				}
				if (n === 0) {
					s.set("seen_norikae_roji", 1);
					await s.narrate("ほそい　路地の　入口に、\nてつの　門。");
					await s.narrate("南京錠が　かかっている。");
					return;
				}
				if (n === 1) {
					s.set("seen_norikae_roji", 2);
					await s.narrate("門の　すきまから、\n植木鉢の　ならびが　見える。");
					return;
				}
				await s.narrate("門の　上に、ちいさな　札。\n字は、もう　よめない。");
			},
		},
		// たばこ屋の あとの じはんき（深夜は 缶。朝は 補充）
		{
			id: "jihanki",
			x: 10,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					s.se("hum", { volume: 0.12 });
					await s.narrate("じはんきが、ぶうん、と\nうなっている。");
					const b = kanLv(s);
					await kanShinya(s);
					if (b === 0 && kanLv(s) === 1) s.set("seen_norikae_kan");
					return;
				}
				if (t === "yoru") {
					await s.narrate("はしの　一列に、あかい札。\n『あったか～い』");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_norikae_kan")) {
						await s.narrate("補充の　人が、あかい札の\n列を　つめている。");
						await s.say("kiriko", "（ゆうべの　一本の、\nつぎのぶんンゴ）");
						return;
					}
					await s.narrate("じはんきの　よこに、\n補充の　段ボール。");
					return;
				}
				await s.narrate(
					"たばこ屋の　あとの　じはんき。\n『たばこ』の　字だけ　のこる。",
				);
			},
		},
		// お稲荷さん（おばあちゃんの 油あげ → 深夜 まだ ある → 朝 お皿は もう ない）
		{
			id: "saisen",
			x: 13,
			y: 8,
			sprite: JP.saisen,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				const age = !!s.flag("seen_norikae_aburaage");
				if (t === "yoru") {
					await s.narrate("ちょうちんに、灯りが\nはいっている。");
					if (age) await s.narrate("油あげの　お皿が、\nあかく　てらされる。");
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						"ちょうちんは　きえて、\nのぼりが　ぱたん、と　鳴る。",
					);
					if (age) {
						s.set("seen_norikae_age_yoru");
						await s.narrate("お皿の　油あげは、\nまだ　ある。");
					}
					return;
				}
				if (t === "asa") {
					if (age) {
						await s.narrate("お皿は、もう　ない。\n石に、水を　まいた　あと。");
						await s.say(
							"kiriko",
							s.flag("seen_norikae_age_yoru")
								? "（ゆうべは、まだ\nあったンゴ……）"
								: "（さげに　きたンゴね）",
						);
						return;
					}
					await s.narrate("ちいさな　お稲荷さん。\n石だたみが　ぬれている。");
					return;
				}
				await s.narrate("ちいさな　お稲荷さん。\nあかい　のぼりが　二本。");
				if (age) await s.narrate("お皿に、油あげが\nひとつ　のっている。");
			},
		},
		// やきとり（宵の 炭の 音 → 朝の 空きびん）
		{
			id: "yakitori",
			x: 16,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					s.set("seen_norikae_tare");
					await s.narrate("のれんに、灯りが　すけている。\n炭の　はぜる　音。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("のれんは　しまわれて、\n引き戸に『本日終了』。");
					return;
				}
				if (t === "asa") {
					await s.narrate("戸の　前に、空きびんの\nケースが　つんである。");
					if (s.flag("seen_norikae_tare"))
						await s.say("kiriko", "（ゆうべの　ぶんンゴ）");
					return;
				}
				await s.narrate("やきとりの　けむりが、\nのれんの　下から　はう。");
				await s.narrate("たれの　におい。");
				await s.say("kiriko", "（……おなかが、\nへんじ　したンゴ）");
			},
		},
		// スナック（宵の 前奏 → 深夜 戸の すきまの 灯り 1→2 → 朝 しばった ゴミぶくろ）
		{
			id: "snack",
			x: 20,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const n = numFlag(s, "seen_norikae_snack");
				if (t === "yoru") {
					await s.narrate("看板に　灯りが　はいった。\n『スナック　ゆり』");
					await s.narrate("戸の　むこうから、\nカラオケの　前奏だけ。");
					// zakkyo の 宵（6階の カラオケ）を 聞いた人
					if (arrived(s, "zakkyo", "yoru"))
						await s.say("kiriko", "（雑居ビルでも、\nだれか　うたってたンゴ）");
					return;
				}
				if (t === "shinya") {
					if (n === 0) {
						s.set("seen_norikae_snack", 1);
						await s.narrate(
							"看板は　きえている。\n戸の　すきまだけ　あかるい。",
						);
						return;
					}
					if (n === 1) {
						s.set("seen_norikae_snack", 2);
						s.se("tick", { volume: 0.2 });
						await s.narrate("パチン。戸の　すきまの\n灯りも、いま　きえた。");
						return;
					}
					await s.narrate("戸の　すきまは、\nもう　くらい。");
					return;
				}
				if (t === "asa") {
					if (n >= 2) {
						await s.narrate(
							"戸の　前に、ゴミぶくろ。\nきちんと　しばってある。",
						);
						await s.say("kiriko", "（あの　あと、\nかたづけたンゴね）");
						return;
					}
					if (n === 1) {
						await s.narrate("戸の　すきまは、くらい。");
						await s.say("kiriko", "（いつ　きえたンゴ）");
						return;
					}
					// zakkyo の かさ立て（のこった 一本）を 深夜に 見た人
					if (s.flag("seen_zakkyo_kasa1")) {
						await s.narrate(
							"戸の　よこに、ビニールがさが\n一本　たてかけてある。",
						);
						await s.say(
							"kiriko",
							"（雑居ビルの　かさ立ても、\n一本だったンゴ）",
						);
						return;
					}
					await s.narrate("戸の　前に、\nおしぼりの　ふくろ。");
					return;
				}
				await s.narrate("スナックの　戸。\n『18時から』の　札。");
			},
		},
		// 八百屋の 店先（『つがる』→ あしたは 梨 → 朝『幸水　さいご』）
		{
			id: "yaoya_mise",
			x: 25,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate("店先に、ブルーシートが\nかけてある。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("シートの　すそから、\nりんごの　あまい　におい。");
					return;
				}
				if (t === "asa") {
					if (numFlag(s, "seen_norikae_yaoya") >= 2) {
						await s.narrate("店先に、梨の　箱。\n『幸水　さいご』の　札。");
						await s.say("kiriko", "（ほんとに　きたンゴ）");
						return;
					}
					await s.narrate("段ボールが、店先に\nつみあがっていく。");
					return;
				}
				await s.narrate("『つがる』　ひと山　280円。\nまっかな　札。");
				// tonarimachi の 八百屋と 話した人
				if (numFlag(s, "seen_yaoya_n") > 0)
					await s.say("kiriko", "（つきみの　八百屋より、\nやすいンゴ）");
			},
		},
		// シャッターの店の まつりポスター（秋まつり → 夏まつりの はし → 朝 はがされた）
		{
			id: "poster",
			x: 31,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const n = numFlag(s, "seen_norikae_poster");
				if (t === "asa") {
					if (n >= 2) {
						await s.narrate(
							"夏まつりの　はしっこが、\nきれいに　はがされている。",
						);
						await s.say("kiriko", "（夏が、ひとつ\nへったンゴ）");
						return;
					}
					await s.narrate("『つきみ秋まつり』の\nポスター。まるい　月の絵。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("ポスターの　かどが、\n風で　ぱたぱた　鳴る。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("月の絵が、街灯で\nしろく　うかんでいる。");
					return;
				}
				if (n === 0) {
					s.set("seen_norikae_poster", 1);
					await s.narrate("シャッターに、ポスター。\n『つきみ秋まつり』");
					await s.narrate("日づけは、らいげつ。");
					// ほかの 地区で 秋まつりの おしらせを 見た人
					if (akiMatsuri(s))
						await s.say("kiriko", "（ここにも、はってあるンゴ）");
					return;
				}
				if (n === 1) s.set("seen_norikae_poster", 2);
				await s.narrate("ポスターの　下から、\n夏まつりの　ポスターの　はし。");
			},
		},
		// コインパーキングの 精算機（時計が 時間帯ごとに ちがう）
		{
			id: "seisanki",
			x: 34,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("『空』の　字だけが、\nずっと　赤い。");
					await s.narrate(`精算機の　時計――${shinyaClock(s, 2)}。`);
					return;
				}
				if (t === "yoru") {
					await s.narrate("『空』の　字が、\n赤く　ひかっている。");
					await s.narrate("『夜間　最大　600円』");
					return;
				}
				if (t === "asa") {
					await s.narrate("『空』の　ランプ。\nけさも、だれも　とめない。");
					await s.narrate(`精算機の　時計――${asaClock(s, 2)}。`);
					return;
				}
				await s.narrate("コインパーキング。\n『60分　200円』");
				await s.narrate("とめてある　車は、ない。");
				await s.narrate(`精算機の　時計――${yuClock(s, 2)}。`);
			},
		},
		{ id: "kurumadome_a", x: 36, y: 5, trigger: "talk", run: kurumadome },
		{ id: "kurumadome_b", x: 37, y: 5, trigger: "talk", run: kurumadome },

		// ── 道の 南がわ ──
		// 乗りかえの 札（夕 矢印が ぎゃく → 深夜 風で まわる → 朝 針金）
		{
			id: "fuda",
			x: 7,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate("電柱の　札が、街灯で\nくっきり　見える。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("ひもが　ゆるくて、札が\n風で　くるりと　まわった。");
					if (s.flag("seen_norikae_fuda")) {
						s.set("seen_norikae_fuda_kaze");
						await s.say("kiriko", "（……それで　ぎゃく\nだったンゴ）");
					}
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_norikae_fuda_kaze")) {
						await s.narrate("札の　ひもが、\n針金に　かわっている。");
						await s.say("kiriko", "（もう　まわらないンゴ）");
						return;
					}
					await s.narrate(
						"『のりかえ　つきみ駅』の　札。\n矢印は、ちゃんと　北西。",
					);
					return;
				}
				s.set("seen_norikae_fuda");
				await s.narrate("電柱に、手書きの　札。\n『のりかえ　つきみ駅　→』");
				await s.narrate("矢印は、みなみ駅の　ほうを\nさしている。");
			},
		},
		// ふるい 家の うら口（からの 牛乳びんの 箱 → 宵 ナイター → 朝 びんが 二本）
		{
			id: "ura_hikido",
			x: 11,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate("うら口の　すきまから、\nナイターの　実況。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("うら口は　くらい。\n牛乳びんの　箱だけ　白い。");
					return;
				}
				if (t === "asa") {
					await s.narrate("牛乳びんの　箱に、\nびんが　二本。");
					if (s.flag("seen_norikae_gyunyu"))
						await s.say("kiriko", "（夜の　あいだに、\nとどいたンゴ）");
					return;
				}
				s.set("seen_norikae_gyunyu");
				await s.narrate("ふるい　家の　うら口。\n牛乳びんの　箱が　かかる。");
				await s.narrate("箱は、からっぽ。");
			},
		},

		// ── 夕方の 人たち ──
		// 床屋の おじさん（4段。2＝ポールの 絵／3＝まごの 背くらべ → guard_board／4＝むかしの 路地）
		npc(
			"tokoya_yu",
			6,
			9,
			TOKOYA,
			async (s) => {
				const name = "床屋の人";
				const n = numFlag(s, "seen_norikae_toko");
				if (n === 0) {
					s.set("seen_norikae_toko", 1);
					await s.say(null, "いらっしゃい……じゃ\nないか。ははは", { name });
					await s.say(null, "夕方は　ひまでね。\nポール　ながめてんの", {
						name,
					});
					return;
				}
				if (n === 1) {
					s.set("seen_norikae_toko", 2);
					await s.say(null, "このポール、まわってる\nように　見えるだろ", {
						name,
					});
					await s.say("kiriko", "まわってるンゴ");
					await s.say(null, "しま模様が、上に\nにげてるだけ　なんだよ", {
						name,
					});
					return;
				}
				if (n === 2) {
					s.set("seen_norikae_toko", 3);
					await s.say(null, "まごがね、ガードの\nところで　背くらべ　してた", {
						name,
					});
					await s.say(null, "もう、うちの　いすより\nでかいよ", { name });
					return;
				}
				// 4回目: 閉まった 路地を 見た人には、むかしの 近道の 話
				if (numFlag(s, "seen_norikae_roji") >= 1) {
					s.set("seen_norikae_toko", 4);
					await s.say(null, "あの　路地？　むかしは\nむこうまで　ぬけられた", {
						name,
					});
					await s.say(
						null,
						"大家さんが、しめちゃった\nんだよ。ネコが　よろこんでる",
						{
							name,
						},
					);
					return;
				}
				await s.say(null, "……ポール、とめるの\n6時半ね", { name });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// お稲荷さんの おばあちゃん（油あげ。朝は 来ない＝お皿だけが 答える）
		npc(
			"obaachan_yu",
			14,
			9,
			OBAACHAN,
			async (s) => {
				const name = "おばあちゃん";
				if (!s.flag("seen_norikae_aburaage")) {
					s.set("seen_norikae_aburaage");
					await s.say(null, "お稲荷さんにね、\n油あげ", { name });
					await s.say(null, "きつねうどんの　あまり\nじゃ　ないよ", { name });
					await s.say("kiriko", "（……あまりンゴね）");
					return;
				}
				await s.say(null, "あしたの　朝、お皿を\nさげに　くるの", { name });
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		// 八百屋の おばちゃん（3段。2＝あしたは 梨 → 朝の yaoya_mise）
		npc(
			"yaoya_yu",
			26,
			9,
			YAOYA,
			async (s) => {
				const name = "八百屋の人";
				const n = numFlag(s, "seen_norikae_yaoya");
				if (n === 0) {
					s.set("seen_norikae_yaoya", 1);
					await s.say(null, "はい　いらっしゃい！\n『つがる』、きょうから", {
						name,
					});
					// tonarimachi の 八百屋と 話した人
					if (numFlag(s, "seen_yaoya_n") > 0) {
						await s.say("kiriko", "つきみの　八百屋にも\nあったンゴ");
						await s.say(null, "あっちは　300円でしょ。\nうちは　280円", {
							name,
						});
					}
					return;
				}
				if (n === 1) {
					s.set("seen_norikae_yaoya", 2);
					await s.say(null, "あしたの　朝はね、梨が\nくるの。幸水の　さいご", {
						name,
					});
					return;
				}
				if (n === 2) s.set("seen_norikae_yaoya", 3);
				await s.say(null, "閉店まえに　来たら、\nひとつ　おまけ", { name });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// 道を きく 通勤の人（2段。札を 見た人には「ぎゃく ですよね」。朝の tsuukin_asa が 答える）
		npc(
			"tsuukin_yu",
			20,
			10,
			TSUUKIN,
			async (s) => {
				const name = "通勤の人";
				const n = numFlag(s, "seen_norikae_tsuukin");
				if (n === 0) {
					s.set("seen_norikae_tsuukin", 1);
					await s.say(
						null,
						"すみません、つきみ駅って\nこっちで　あってます？",
						{
							name,
						},
					);
					await s.say("kiriko", "（吾輩に　きくンゴ……）");
					await s.say(null, "……地図だと、10分って\nあるんですけどね", { name });
					return;
				}
				if (n === 1) s.set("seen_norikae_tsuukin", 2);
				if (s.flag("seen_norikae_fuda")) {
					await s.say(null, "あの　電柱の　札、矢印\nぎゃく　ですよね", {
						name,
					});
					await s.say("kiriko", "（吾輩も、そう\nおもうンゴ）");
					return;
				}
				await s.say(null, "……もう、15分\nあるいてるんですけどね", { name });
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の 人たち（夕方の 前振りを 見た人にだけ 答える） ──
		npc(
			"tokoya_asa",
			6,
			9,
			TOKOYA,
			async (s) => {
				const name = "床屋の人";
				// 深夜に 札が まわるのを 見た人
				if (s.flag("seen_norikae_fuda_kaze")) {
					await s.say(null, "電柱の　札、針金で\nとめといたよ", { name });
					await s.say(null, "ゆうべ、風が　あったろ。\n夜中に　まわるんだ", {
						name,
					});
					return;
				}
				if (numFlag(s, "seen_norikae_toko") >= 1) {
					await s.say(null, "おはよう。ポールは\nカバー　とるとこから", {
						name,
					});
					return;
				}
				await s.narrate("床屋の　人が、店の　前を\nほうきで　はいている。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"yaoya_asa",
			26,
			9,
			YAOYA,
			async (s) => {
				const name = "八百屋の人";
				if (numFlag(s, "seen_norikae_yaoya") >= 2) {
					await s.say(null, "ほら、幸水。\nこれで　ことしは　おしまい", {
						name,
					});
					return;
				}
				if (numFlag(s, "seen_norikae_yaoya") >= 1) {
					await s.say(null, "はい　おはよう！\n『つがる』、まだ　あるよ", {
						name,
					});
					return;
				}
				await s.narrate("八百屋の　人は、段ボールを\nはこぶのに　いそがしい。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"tsuukin_asa",
			28,
			10,
			TSUUKIN,
			async (s) => {
				const name = "通勤の人";
				if (numFlag(s, "seen_norikae_tsuukin") >= 1) {
					await s.say(null, "あ、きのうの。\nけさは　7分で　来ました", {
						name,
					});
					await s.say(null, "きのうは　下見で。\nきょうから、この道です", {
						name,
					});
					return;
				}
				await s.say(null, "……すみません、\nいそいでて", { name });
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),
	],
};
