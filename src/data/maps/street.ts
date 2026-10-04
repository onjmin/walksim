// まちのどおり（日常レイヤーの主舞台）。DESIGN §4 時間帯システム・docs/style-everyday.md・

// docs/content-briefs.md「日常レイヤー」。30×20・outdoor（TOD_PRESETS が tint/outside を乗せる）・
// BGM null（ヒグラシ・チャイム・電車などの生活音が音楽のかわり）。
//
// 同一マップが flags.tod（"yu"|"yoru"|"shinya"|"asa"）で四つの顔を持つ：
//   夕方  … 生きた町。NPC 7体・時計は 17:XX・東端は工事の囲い（お知らせ掲示）
//   宵    … 晩ごはんのあとの任意の散歩（docs/nostalgia.md P0-1）。NPC 0体・時計は 20:XX
//           （地区を回るたびに進む＝yoruClock）・街灯がつく。文は におい・音・点いた灯り だけ
//           （消えた窓・減った人は書かない）。自販機の赤い札・コンビニの牛乳・自分の窓のあかり
//   深夜  … 無人（NPC 0体・必達）。時計は 2:00。
//   朝    … 光と音が戻る。NPC 5体・セリフ全差し替え・setup/payoff の対（§4）。
//
// 物語（STORY.md §5.5）：夕方の 地の文で「キリコが 外の 町で 暮らしはじめた」ことを はっきり 言う。
// 深夜の バス停で レコード「早番」（rec_q。辞めた 人）。rec_q を 拾うと、
// 深夜の この 通りで「窓」の 場面（転：声の 主たちは 窓の むこうで 暮らしていた）→ 夜明け（tod="asa"・
// ending_ready）→ うみべへ（結は umi.ts）。
//
// 座標凍結v2: (2,9)→apart(10,5)／apart 階段→(2,10)。開始位置は (24,10) 西向き（data/index.ts）。
// 座標凍結v3（日常の町 拡張）: うらどおり西端 (2,19)→sumire(37,3)／うらどおり (21,19)→
// kawara(37,8)／大どおり西 (0,11)→kokudo(38,10)。もどりの着地は (3,19)/(20,19)/(1,11)。
//
// 環境音は seLoop でなくワンショットの重ね掛けで作る（Story API に seLoop が無いため）。
// onEnter で一波 ＋ 道の途中の見えない帯（wave）で歩くたびに遠近を変えて鳴らす。
// MML SE は待ち時間 0（loudness.ts）なので文送りを止めない。

import { prepareCameoVoices } from "../../engine/audio";
import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { settings } from "../../engine/settings";
import { npc, warp } from "../helpers";
import { kanShinya, kanTick, yoruAkubi, yoruClock } from "../nostalgia";
import { SPR } from "../sprites";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";

// ── タイル ──
// TOWN をベースに、店先を足す。
//   i  店の中の床   < = >  店のカウンター（むこうの店主に話しかけられる）
//   o  しまった戸（白壁）   j  しまった戸（板壁）
//   c  大きな窓（白壁の下段。コンビニ・民家）   t  大きな窓（レンガ壁の下段。電器屋）
//   m  窓（板壁の下段）   s  すなば
const PAVE = JP.pave;
const WIN_LOW_WHITE = WIN.sash;
const WIN_LOW_BRICK = WIN.sash;
const tiles: Record<string, TileDef> = {
	...TOWN,
	i: { layers: [PAVE], color: "#9a9a9a", passable: true },
	"<": {
		layers: [PAVE, JP.counterL],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
	"=": {
		layers: [PAVE, JP.counterM],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
	">": {
		layers: [PAVE, JP.counterR],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
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
	s: { layers: [JP.sand], color: "#e8cc90", passable: true },
};

// 西＝アパート（ドア (2,9)）と裏どおり（x4 の路地から。無印の隠し）。
// 北＝商店（カウンター）・電器屋・コンビニ・とこや。東端＝工事の囲い (28,10)。
// 南＝掲示板・時計塔・ベンチ・バス停の並びと、小さな公園・住宅のうらどおり。
const rows = [
	"                              ", // y0
	"                              ", // y1
	"                              ", // y2
	"    .||||||                   ", // y3  物干しのロープ (8,3)・北 (4,3)→koen（みどりがおか公園への石段）
	"    ..x...x                   ", // y4  裏どおり。だんボール (6,4)・ねこ (7,4)・ビールケース (10,4)
	"aaaa.......                   ", // y5  アパートの屋根・裏どおり
	"AAAA.nnnnnn aaaa              ", // y6  路地 (4,5)-(4,9)
	"(w(w.^^^^^^ AAAA (((((( zzz   ", // y7  キリコの部屋の窓 (3,7)（(4,7) から）・コンビニ (17-22)・とこや (24-26)
	"(w(w.%iiii% %WW% (w((w( ZZZ   ", // y8  店主 (7,8)
	"))d).%<==>%P%tt%x)ccoc)p]j]!f ", // y9  アパートのドア (2,9)・カウンター・電器屋の窓 (13,9)・お知らせ (27,9)
	"!:::::::::::::::::::::::::::::", // y10 大どおり。開始 (24,10)・工事の囲い (28,10)
	",::::::::::::::::::::::::::ff ", // y11
	",L,,,*&Kk,,L,,,,Bb,V,,,!,L,   ", // y12 花だん (5,12)・掲示板 (7,12)・時計塔 (13,12)・ベンチ (16,12)・バス停 (23,12)
	"  ,,,,,,,,,,,,,,,,,,,,,,,     ", // y13 公園のこみち
	"  ,,,,T,,,T,ss,T,,,T,,,,,     ", // y14 すなば (12,14)
	"  ,,,zzzzz,,,nnnnn,,,,,,      ", // y15 南の住宅
	"  ,,,ZZZZZ,,,^^^^^,,,,,,      ", // y16
	"  ,,,[[[[[,,,(((((,,,,,,      ", // y17
	"  ,,,]m]j],,,)c)o),,,,,,      ", // y18 みぞ (2,18)（(3,18) から）・すずきさん家 (8,18)・たなかさん家 (16,18)
	"  .....................x      ", // y19 うらどおり。ものおき (23,19)
];

// ── モブの歩行グラ（同梱の RPGEN DQ 風） ──
const CHILD = "pub:sprites/mob_child.png";
const GRANDMA = "pub:sprites/mob_obaachan.png";
const WALKER = "pub:sprites/mob_student.png";
const WORKER = "pub:sprites/mob_worker.png";
const SHOPKEEPER = "pub:sprites/mob_shopkeeper.png";

/** 晩ごはんを買ったか（＞＞1おにぎり／＞＞2パン。持ちものは増やさない・フラグだけ）。 */
const hasDinner = (s: Story): boolean =>
	!!(s.flag("got_dinner_onigiri") || s.flag("got_dinner_pan"));

/**
 * 環境音のワンショット（ヒグラシ／スズメ）。同じ帯を往復しても連打にならないよう、
 * 直前に鳴らした帯をモジュール変数で覚える（音だけの状態なのでセーブしない）。
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
const waveBelt = (id: string, x: number, pan: number): EventDef[] =>
	[10, 11].map((y) => ({
		id: `${id}_${y}`,
		x,
		y,
		trigger: "touch" as const,
		through: true,
		when: (st: GameState) => st.flags.tod === "yu" || st.flags.tod === "asa",
		run: wave(id, pan),
	}));

// ── 店主（街路のガイド役。3層: 初回＝買い物／二層目＝雑談／待機） ──

const offerDinner = async (s: Story): Promise<void> => {
	await s.say(null, "晩めしかい。いま\nのこってるのは――", { name: "店主" });
	const i = await s.choose(["＞＞1 おにぎり", "＞＞2 パン", "＞＞3 また来る"]);
	if (i === 0) {
		await s.say(null, "おにぎりね。具は\n鮭しか　のこってないよ", {
			name: "店主",
		});
		await s.say("kiriko", "鮭で　いいンゴ");
		s.se("item", { volume: 0.8 });
		await s.narrate("おにぎりを、ふたつ\n買った。");
		s.set("got_dinner_onigiri");
		await s.say(null, "まいど。あっためは\nうちで　やりな", { name: "店主" });
		return;
	}
	if (i === 1) {
		await s.say(null, "パンね。……あんぱんしか\nのこってないけど", {
			name: "店主",
		});
		await s.say("kiriko", "あんぱんで　いいンゴ");
		s.se("item", { volume: 0.8 });
		await s.narrate("あんぱんを、ひとつ\n買った。");
		s.set("got_dinner_pan");
		await s.say(null, "まいど。ぎゅうにゅうは\nあるかい、うちに", {
			name: "店主",
		});
		await s.say("kiriko", "……たぶんンゴ");
		return;
	}
	await s.say(null, "はいよ。暗くなる前に\nまた来な", { name: "店主" });
};

const tenshu = async (s: Story): Promise<void> => {
	s.se("doorbell", { volume: 0.8 });
	if (!s.flag("seen_tenshu")) {
		s.set("seen_tenshu");
		await s.narrate("カウンターのおくから、\n店主が　かおを出した。");
		await s.say(null, "おかえり。きょうも\nおつかれさん", { name: "店主" });
		await s.say("kiriko", "……ただいまンゴ");
		await offerDinner(s);
		return;
	}
	if (!hasDinner(s)) {
		await offerDinner(s);
		return;
	}
	if (!s.flag("seen_tenshu2")) {
		s.set("seen_tenshu2");
		await s.say(null, "あんた、ゆうべも\nおそくまで　起きてたろ", {
			name: "店主",
		});
		await s.say("kiriko", "な、なんで\nわかるンゴ");
		await s.say(null, "朝、カーテンが\nしまったままだった", { name: "店主" });
		await s.say("kiriko", "……見はられてるンゴ");
		await s.say(null, "はは。町内じゃ\nそういうのは　筒ぬけだよ", {
			name: "店主",
		});
		return;
	}
	await s.say(null, "まいど。\n気をつけて　お帰り", { name: "店主" });
};

/** 宵にコンビニで牛乳を買って、朝の店主にツッコまれる人（あんぱんの人だけ。nostalgia.md P0-11）。 */
const gyunyuBoke = (s: Story): boolean =>
	!!(s.flag("got_dinner_pan") && s.flag("got_gyunyu"));

/**
 * 朝の店主（夕方の買い物の payoff。プレイヤーの選択でひとことが変わる）。
 * 宵・夕のフラグがあれば1往復だけ足す（牛乳 > 延長。一度に一つ。フラグの無い人は現行のまま）。
 */
const tenshuAsa = async (s: Story): Promise<void> => {
	if (!s.flag("seen_tenshu_asa")) {
		s.set("seen_tenshu_asa");
		if (s.flag("got_dinner_onigiri")) {
			await s.say(null, "おはようさん。\n鮭、どうだった？", { name: "店主" });
			await s.say("kiriko", "……うまかったンゴ");
			await s.say(null, "きょうは　たらこが入る。\nゆうがた、おいで", {
				name: "店主",
			});
			return;
		}
		if (s.flag("got_dinner_pan")) {
			await s.say(null, "おはようさん。\nあんぱん、どうだった？", {
				name: "店主",
			});
			if (gyunyuBoke(s)) {
				await s.say("kiriko", "ぎゅうにゅうは、ゆうべ\nコンビニで　買ったンゴ");
				await s.say(null, "……うちで　買いなよ", { name: "店主" });
				return;
			}
			await s.say("kiriko", "ぎゅうにゅうが\nなかったンゴ……");
			await s.say(null, "はは。じゃあ　きょうは\nぎゅうにゅうを　買いな", {
				name: "店主",
			});
			return;
		}
		await s.say(null, "おはようさん。\nきょうは　早いんだね", { name: "店主" });
		return;
	}
	// 2回目: ゆうべの延長（部屋のテレビで中継の打ち切りを見た人。牛乳の1往復を出した人には出さない）
	if (
		s.flag("seen_chukei_end") &&
		!s.flag("seen_tenshu_asa2") &&
		!gyunyuBoke(s)
	) {
		s.set("seen_tenshu_asa2");
		await s.say(null, "ゆうべの延長、\n見たかい", { name: "店主" });
		await s.say("kiriko", "中継、きれたンゴ");
		await s.say(null, "うちの　ラジオは\nさいごまで　やってたよ", {
			name: "店主",
		});
		return;
	}
	await s.say(null, "よく　ねむれた顔だ。\n……いや、ねぶそくか？", {
		name: "店主",
	});
};

// ── 転：窓（STORY.md §5.5・§5.97）。rec_q で 開く ──
// 2026-10-04 怪異側（板の 名残）を 消して 作りなおし中。それまでの 仮の 条件として、早番の レコード 1枚で 開く。

/** 窓の 場面を 見られるか（深夜・早番の レコード・まだ 見ていない）。 */
export const madoReady = (st: GameState): boolean =>
	st.flags.tod === "shinya" && !st.flags.seen_mado && (st.items.rec_q ?? 0) > 0;

const mado = async (s: Story): Promise<void> => {
	s.set("seen_mado");
	await s.wait(600);
	await s.narrate("まちのどおりの　窓に、\nあかりが　ついていた。");
	await s.narrate("ひとつ、また　ひとつ。");
	// 去り方の 目録（受験・鯖・ミスキー。STORY.md §4.5）
	await s.narrate("机の　あかり。\n単語帳を　めくる　音。");
	await s.narrate("ヘッドホンごしの　声が、\n窓の　むこうで　笑っている。");
	await s.narrate("みじかい　文を　打っては、\n消している　指。");
	// 辞めた 人（早番）：夜明けに うみべで すれ違う
	await s.narrate(
		"……ひとつ、あかりが　消えた。\n玄関で、くつひもを　むすぶ　音。",
	);
	// 朝の スレの 住民の 声（カメオ音源）を ここで 読み込む（ボイス OFF なら 何もしない）
	if (settings.voice) {
		const ready = prepareCameoVoices();
		await s.narrate(
			"（窓の　むこうで、いくつもの\n声が　めを　さましていく――）",
		);
		await ready.catch(() => {});
	}
	await s.wait(500);
	await s.say("kiriko", "……みんな、窓の　むこうに\nいたンゴ");
	await s.narrate("レコードの　声の　主は、\nこの　町で　くらしていた。");
	await s.wait(700);
	await s.narrate("空の　はしっこが、\nしろく　なってきた。");
	await s.say("kiriko", "……海、見にいくンゴ");
	s.set("tod", "asa");
	s.set("ending_ready");
	await s.warp("street", s.state.x, s.state.y, s.state.dir, { fade: true });
};

export const street: MapDef = {
	id: "street",
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 0, y: 3, w: 12, h: 9 }, // アパートと裏どおり
		{ x: 12, y: 6, w: 10, h: 6 }, // 商店とコンビニ
		{ x: 22, y: 6, w: 8, h: 6 }, // とこやと駅の入口
		{ x: 0, y: 12, w: 13, h: 8 }, // 公園の西・すずきさん家
		{ x: 13, y: 12, w: 14, h: 8 }, // 公園の東・たなかさん家
	],
	name: "まちのどおり",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	outdoor: true,
	outside: "#0d0b09",
	tiles,
	rows,
	// 光源（docs/night-fx.md §2）。街灯・自販機・コンビニは宵と深夜（夕方は「まだついていない」）、
	// 民家・商店の窓明かりは夕方と宵（深夜の民家は消えている＝無人の記号）。
	// ただしシャッターの下りた店（商店 (7,8)＝shop_front・電器屋 (13,9)＝denki_tv）は宵には点けない。
	// 深夜に灯る窓は、キリコの部屋 (3,7) のモニターの青だけ（宵は電気のつけっぱなし。nostalgia.md P0-5）。
	// アパートのはしの列は、宵は (3,7) の一灯だけ（下の (3,8) は夕方だけ。重ねない）。
	// 1画面の同時点灯は8灯まで（nostalgia.md §5）: 横長の画面（20×11マス）で (4,7) に立っても、宵は8灯
	lights: [
		{ x: 1, y: 12, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 11, y: 12, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 25, y: 12, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 19, y: 12, r: 1.5, color: "#eef4ff", only: "yoru,shinya" },
		{ x: 19, y: 9, r: 4, color: "#cfe4ff", only: "yoru,shinya" },
		{ x: 21, y: 9, r: 2, color: "#cfe4ff", only: "yoru,shinya" },
		{ x: 7, y: 8, r: 2, only: "yu" },
		{ x: 13, y: 9, r: 2, color: "#cfe4ff", only: "yu" },
		{ x: 25, y: 8, r: 2, only: "yu,yoru" },
		{ x: 1, y: 8, r: 2, only: "yu,yoru" },
		{ x: 3, y: 8, r: 2, only: "yu" },
		{ x: 19, y: 9, r: 3, color: "#cfe4ff", only: "yu,yoru" },
		{ x: 8, y: 18, r: 2, only: "yu,yoru" },
		{ x: 16, y: 18, r: 2, only: "yu,yoru" },
		{ x: 3, y: 7, r: 1.5, only: "yoru" },
		{ x: 3, y: 7, r: 1.5, color: "#cfe4ff", only: "shinya" },
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。宵・深夜は鳴らさない）。
	// 深夜は手の缶が一段さめる（kanTick。歩くだけでは「ぬるい」で止まる。文は出さない）
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
				s.se("chime17");
				await s.wait(1600);
				await s.narrate("――チャイムが、\n鳴りおわった。");
				await s.narrate(
					"キリコが　おんJを　出て、\n外の　町で　暮らしはじめて　ひと月。",
				);
				await s.say("kiriko", "はらへったンゴ。晩ごはん\n買って、帰るンゴ");
			},
		},
		// 宵（晩ごはんのあと、アパートから出てきたところ。4地区目あたりであくび＝yoruAkubi）
		{
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("どこかの家の、ふろの\nにおいがする。");
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
				await s.narrate("しんと、している。");
				await s.wait(400);
				await s.narrate("じぶんの足音だけが、\nついてくる。");
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
				s.se("shutter", { pan: 0.3, volume: 0.8 });
				await s.wait(700);
				await s.narrate("シャッターの　あく音。");
				await s.say("kiriko", "……ねむいンゴ");
			},
		},

		// ── 出入り口（座標凍結v2） ──
		warp(
			"to_apart",
			2,
			9,
			{ map: "apart", x: 10, y: 5, dir: "left" },
			{ se: "door" },
		),
		// ── 出入り口（座標凍結v3: 日常の町 拡張。二重ループの町） ──
		warp("to_sumire", 2, 19, { map: "sumire", x: 37, y: 3, dir: "left" }),
		warp("to_kawara", 21, 19, { map: "kawara", x: 37, y: 8, dir: "left" }),
		warp("to_kokudo", 0, 11, { map: "kokudo", x: 38, y: 10, dir: "left" }),
		// 裏どおりの北はしから、みどりがおか公園への石段（地続きの拡張 2026-09-28）
		warp("to_koen", 4, 3, { map: "koen", x: 20, y: 22, dir: "up" }),
		// 工事の囲いがふさいでいる（見た目つきの talk イベント＝通れない）
		{
			id: "kakoi",
			x: 28,
			y: 10,
			sprite: JP.kakoi,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate(
						"工事の囲いだ。赤いランプが、\nゆっくり　点滅している。",
					);
					return;
				}
				if (s.flag("tod") === "asa") {
					await s.narrate("工事の囲いだ。\n――もとどおりに、ある。");
					await s.narrate("おくで、作業の音が\nしている。");
					return;
				}
				await s.narrate("工事の囲いだ。すきまから、\nほった土が見える。");
				await s.say("kiriko", "……おっきい穴ンゴ");
			},
		},
		// 囲いのよこの掲示（工事のお知らせ）
		{
			id: "notice",
			x: 27,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『道路補修工事のおしらせ』");
				await s.narrate("『期間中は　通りぬけが\nできません』");
				await s.narrate("こうじは　こんしゅうまつ\nまで、と書いてある。");
				if (s.flag("tod") === "asa")
					await s.narrate("……きのうと、おなじ\n掲示だ。");
			},
		},
		// 夕方の遠い電車
		{
			id: "densha_yu_a",
			x: 15,
			y: 10,
			trigger: "touch",
			through: true,
			when: (st) => st.flags.tod === "yu" && !st.flags.seen_densha_yu,
			run: async (s) => {
				s.set("seen_densha_yu");
				s.se("densha_far", { pan: 0.4, volume: 0.5 });
				await s.narrate("とおくを、電車が\nとおる音。");
			},
		},
		{
			id: "densha_yu_b",
			x: 15,
			y: 11,
			trigger: "touch",
			through: true,
			when: (st) => st.flags.tod === "yu" && !st.flags.seen_densha_yu,
			run: async (s) => {
				s.set("seen_densha_yu");
				s.se("densha_far", { pan: 0.4, volume: 0.5 });
				await s.narrate("とおくを、電車が\nとおる音。");
			},
		},

		// ── 環境音の帯（夕方＝ヒグラシ／朝＝スズメ。歩くたび遠近が変わる） ──
		...waveBelt("wave_w", 6, -0.4),
		...waveBelt("wave_m", 14, 0),
		...waveBelt("wave_e", 21, 0.4),

		// ── レコード「早番」（深夜の バス停の よこ。辞めた 人の 声。STORY.md §4.5） ──
		{
			id: "rec_q_ev",
			x: 22,
			y: 12,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: (st) => st.flags.tod === "shinya" && !(st.items.rec_q ?? 0),
			run: async (s) => {
				await s.narrate("バス停の　よこに、\n黒いレコードが　おいてある。");
				s.se("item");
				s.give("rec_q");
				s.set("got_rec_q");
				await s.record("rec_q");
				await s.say("kiriko", "……いってらっしゃいンゴ");
			},
		},
		// ── 転：窓（深夜。早番の レコードで。エンディングは umi.ts） ──
		{
			id: "mado_ev",
			x: 5,
			y: 0,
			trigger: "auto",
			once: true,
			when: madoReady,
			run: mado,
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		npc("tenshu", 7, 8, SHOPKEEPER, tenshu, {
			dir: "down",
			when: (st) => st.flags.tod === "yu",
		}),
		npc(
			"kodomo_a",
			10,
			11,
			CHILD,
			async (s) => {
				if (!s.flag("seen_kids")) {
					s.set("seen_kids");
					await s.say(
						null,
						"あのさ、工事のとこ、道の\n下から　なんか　出たって",
						{
							name: "男の子",
						},
					);
					await s.say("kiriko", "なんか？");
					await s.say(null, "おっちゃんが言ってた。\nむかしのやつ、だって", {
						name: "男の子",
					});
					await s.say(null, "……たからものかなあ", { name: "男の子" });
					return;
				}
				await s.say(null, "宿題？　やってない。\nこれから　やる", {
					name: "男の子",
				});
			},
			{ dir: "right", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"kodomo_b",
			11,
			11,
			CHILD,
			async (s) => {
				await s.say(null, "宿題は、あしたの朝の\nあたしに　まかせた", {
					name: "女の子",
				});
				await s.say("kiriko", "……だいじょうぶンゴ？");
				await s.say(null, "あしたの　あたしは\nすごいから", {
					name: "女の子",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"sanpo",
			7,
			13,
			WALKER,
			async (s) => {
				if (!s.flag("seen_sanpo")) {
					s.set("seen_sanpo");
					await s.narrate("足もとで、犬が　キリコの\nにおいを　かいだ。");
					await s.say(null, "すみません、\n人なつっこくて", {
						name: "さんぽの人",
					});
					await s.say("kiriko", "……くすぐったいンゴ");
					await s.say(null, "この子、さんぽの時間だけ\nまちがえないんですよ", {
						name: "さんぽの人",
					});
					return;
				}
				await s.narrate("犬が、こっちを見て\nしっぽを　ふった。");
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),
		// 会釈だけの通行人（何度話しかけても同じ。無害な他者＝いちばんのベースライン）
		npc(
			"eshaku",
			18,
			11,
			SPR.townsfolk,
			async (s) => {
				await s.narrate("かるく、会釈をされた。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"baachan",
			5,
			11,
			GRANDMA,
			async (s) => {
				if (!s.flag("seen_baachan")) {
					s.set("seen_baachan");
					await s.say(null, "みずまきはね、\n日がおちる前が　いいんだよ", {
						name: "ばあちゃん",
					});
					await s.say("kiriko", "へえ……ンゴ");
					await s.say(null, "花はね、きいてるよ。\nあんたの足音も", {
						name: "ばあちゃん",
					});
					await s.say("kiriko", "……いい意味ンゴ？");
					return;
				}
				await s.say(null, "きをつけて　お帰り", { name: "ばあちゃん" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"sagyo_yu",
			25,
			10,
			WORKER,
			async (s) => {
				if (!s.flag("seen_sagyo")) {
					s.set("seen_sagyo");
					await s.say(null, "きょうは　ここまで。\n……ん、通れないよ、ここ", {
						name: "作業員",
					});
					await s.say("kiriko", "なにを　ほってるンゴ？");
					await s.say(null, "水道管。……たぶんね", { name: "作業員" });
					await s.say("kiriko", "たぶん、ンゴ？");
					await s.say(null, "図面とちがうのが\n出てきてさ。よくあるよ", {
						name: "作業員",
					});
					return;
				}
				await s.say(null, "あぶないから、\n囲いには入らんでね", {
					name: "作業員",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（セリフ全差し替え。夕方の setup の payoff） ──
		npc("tenshu_asa", 7, 10, SHOPKEEPER, tenshuAsa, {
			dir: "up",
			when: (st) => st.flags.tod === "asa",
		}),
		npc(
			"kodomo_asa_a",
			14,
			10,
			CHILD,
			async (s) => {
				await s.say(null, "工事の　なんかのこと、\n先生に聞いてみるんだ", {
					name: "男の子",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"kodomo_asa_b",
			15,
			10,
			CHILD,
			async (s) => {
				await s.say(null, "……あさの　あたしは、\nだめだった", {
					name: "女の子",
				});
				await s.say(null, "だから　言ったのに", { name: "男の子" });
				await s.say(null, "学校つくまでが\nしょうぶだから", {
					name: "女の子",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"sanpo_asa",
			10,
			13,
			WALKER,
			async (s) => {
				await s.say(null, "あら、\nおはようございます", {
					name: "さんぽの人",
				});
				await s.narrate("犬が、しっぽを\nちぎれるほど　ふっている。");
				await s.say("kiriko", "……おぼえてて\nくれたンゴ");
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"sagyo_asa",
			25,
			10,
			WORKER,
			async (s) => {
				if (!s.flag("seen_sagyo_asa")) {
					s.set("seen_sagyo_asa");
					await s.say(null, "おはよう。きょうで\n埋めもどしだよ", {
						name: "作業員",
					});
					await s.say("kiriko", "……なにが　出たンゴ？");
					await s.say(null, "ん？　ただの\nふるい土管だったよ", {
						name: "作業員",
					});
					return;
				}
				await s.say(null, "あぶないから、\nはなれててな", { name: "作業員" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),

		// ── 深夜、コンビニの灯りが道にこぼれる（1軒だけ生きている。中に入れない） ──
		{
			id: "light_a",
			x: 18,
			y: 10,
			sprite: JP.lightSpill,
			trigger: "talk",
			through: true,
			fixedDir: true,
			when: (st) => st.flags.tod === "shinya",
		},
		{
			id: "light_b",
			x: 19,
			y: 10,
			sprite: JP.lightSpill,
			trigger: "talk",
			through: true,
			fixedDir: true,
			when: (st) => st.flags.tod === "shinya",
		},

		// ── しらべられるもの ──
		{
			id: "clock_tower",
			x: 13,
			y: 12,
			sprite: JP.clockPole,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("まちの時計。――2:00。");
					return;
				}
				if (t === "asa") {
					await s.narrate("まちの時計。――7:02。");
					await s.narrate("秒しんが、うごいている。");
					return;
				}
				// 宵は地区を回るたびに数分ずつ進む（20:05〜20:47）
				if (t === "yoru") {
					await s.narrate(`まちの時計。――${yoruClock(s)}。`);
					await s.narrate("文字盤を、街灯が\nてらしている。");
					return;
				}
				await s.narrate("まちの時計。――17:03。");
				await s.narrate("ハトが、うえに\nとまっている。");
			},
		},
		{
			id: "barber",
			x: 24,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("とこやの　サインポールは、\nとまっている。");
					await s.narrate("おくの時計――2:00。");
					return;
				}
				if (t === "asa") {
					await s.narrate("サインポールが、\nまわりだした。");
					await s.narrate("おくの時計は――7:05。");
					return;
				}
				// 宵は店じまい（時計は見せない。時計塔だけが宵の時刻を持つ）
				if (t === "yoru") {
					await s.narrate("とこやの　まど。\n『本日終了』の札。");
					await s.narrate("おくで、ほうきの\n音がしている。");
					return;
				}
				await s.narrate("とこやの　まど。サインポールが\nまわっている。");
				await s.narrate("おくの時計は――17:06。");
			},
		},
		{
			id: "conbini_win",
			x: 18,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("あかりが、ついている。");
					await s.narrate("レジには、だれもいない。");
					await s.narrate("……時計は――2:00。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『あさごはん　あります』の\nのぼりが　出ている。");
					return;
				}
				// 宵のレジには店員の背中（文だけ。人のスプライトは出さない。時計は見せない）
				if (t === "yoru") {
					await s.narrate("おでんの　ゆげ。レジに、\n店員さんの　せなか。");
					return;
				}
				await s.narrate("コンビニのまど。おでんの\nゆげで、くもっている。");
				await s.narrate("レジのおくの時計は\n――17:08。");
			},
		},
		{
			id: "conbini_door",
			x: 20,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("じどうドアのおくで、機械の\n音だけ、している。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ドアが開いて、パンの\nにおいがした。");
					return;
				}
				// 宵は牛乳が買える（店員は出さない。朝の店主のツッコミ＝tenshuAsa へ。P0-11）
				if (t === "yoru") {
					if (s.flag("got_gyunyu")) {
						await s.narrate("じどうドアの　おくから、\nおでんの　におい。");
						return;
					}
					await s.narrate("じどうドアの　むこうに、\n牛乳の　棚。");
					const i = await s.choose(["＞＞1 牛乳を　買う", "＞＞2 見るだけ"], {
						cancel: 1,
					});
					if (i !== 0) return;
					s.se("item", { volume: 0.8 });
					s.set("got_gyunyu");
					await s.narrate(
						"牛乳パックを、ひとつ\n買った。てのひらが、つめたい。",
					);
					if (s.flag("got_dinner_pan"))
						await s.say("kiriko", "（あんぱんには、\nこれンゴ）");
					return;
				}
				await s.narrate("じどうドア。『ポイント\n2ばい』のシールつき。");
			},
		},
		{
			id: "denki_tv",
			x: 13,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ならんだテレビは、\nぜんぶ消えている。");
					await s.narrate("くらい画面に、じぶんが\nうつっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ならんだテレビが、あさの\n体操を　やっている。");
					return;
				}
				// 宵はシャッターのすきまから実況（延長の段には関係なく、聞こえるだけ。P0-2）
				if (t === "yoru") {
					await s.narrate(
						"電器屋は、シャッター。\nすきまから、実況の声が　もれる。",
					);
					await s.say("kiriko", "（店じまいのあとも、\nやきうンゴ）");
					return;
				}
				await s.narrate("ならんだテレビが、ぜんぶ\nおなじ夕方のニュース。");
				await s.narrate("画面のすみに――17:04。");
			},
		},
		// 貼り紙の下の貼り紙（時間帯を問わず同じ。二度目で下の紙に気づく。P0-8）
		{
			id: "denki_bill",
			x: 14,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("はり紙。『テレビ\nおやすくします』");
				if (!s.flag("seen_denki_bill")) {
					s.set("seen_denki_bill");
					await s.narrate("日づけは、先月だ。");
					await s.say(
						"kiriko",
						"（ここ、むかしは\n駄菓子屋だった気がするンゴ）",
					);
					return;
				}
				await s.narrate("はり紙の下に、もう一枚。\n『テレビ　修理します』");
				await s.narrate("その下に、もう一枚。\n『ラジオ　修理します』");
				await s.say("kiriko", "……ずっと、電器屋\nだったンゴ");
			},
		},
		// 店先（夕方は店主がいるのでカウンターにゆずる）
		{
			id: "shop_front",
			x: 8,
			y: 9,
			trigger: "talk",
			when: (st) => st.flags.tod !== "yu",
			run: async (s) => {
				if (s.flag("tod") === "asa") {
					await s.narrate("あけたばかりの　みせから、\nだしのにおいがする。");
					return;
				}
				await s.narrate("シャッターが、\nおりている。");
			},
		},
		// 掲示板（時間帯を問わず同じ。二度目で去年の紙に気づく。P0-8）
		{
			id: "board_ev",
			x: 7,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("町内の掲示板。");
				if (!s.flag("seen_board_st")) {
					s.set("seen_board_st");
					await s.narrate("『ゴミは　朝8時までに』");
					await s.narrate("『なつまつりは　おわりました』\nの紙も、まだある。");
					return;
				}
				await s.narrate(
					"『なつまつりは　おわりました』\nの紙の下に、もう一枚。",
				);
				await s.narrate("去年の、おなじ紙だ。");
				await s.say("kiriko", "……二回ぶん、\nおわってるンゴ");
			},
		},
		{
			id: "busstop",
			x: 23,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("さいしゅうバスは、\nとっくに行ったあとだ。");
					await s.narrate("すみの　らくがきが、\nくらがりで　うすく　見える。");
					return;
				}
				if (t === "asa") {
					await s.narrate("バスてい。一番バスまで、\nまだ時間がある。");
					return;
				}
				await s.narrate("バスてい。さいしゅうは\n19:20だ。");
				await s.narrate("すみに、らくがき。\n――『へのへのもへじ』");
				await s.say("kiriko", "……おこさまンゴ");
			},
		},
		// ── ポスト ──
		{
			id: "post_ev",
			x: 21,
			y: 12,
			sprite: JP.postSquare,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ゆうびんポスト。つぎの\nあつめは、あしたの　朝だ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ゆうびんポスト。けさの\nあつめは、9時からだ。");
					return;
				}
				await s.narrate("ゆうびんポスト。きょうの\nあつめは、もう　おわった。");
			},
		},
		{
			id: "vending_ev",
			x: 19,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				const t = s.flag("tod");
				// 深夜はあたたかい缶が一本だけ買える（手の缶は、地区を移るたびにさめていく。P0-6）
				if (t === "shinya") {
					await s.narrate("ひくく、うなっている。\nあかりは、ついたまま。");
					await kanShinya(s);
					return;
				}
				if (t === "asa") {
					await s.narrate("『あたたか～い』の札が\nふえている。");
					return;
				}
				// 宵は端の一列だけ赤い札（深夜の缶の前ぶれ。札の字は朝の文とそろえる）
				if (t === "yoru") {
					await s.narrate("はしの一列だけ、\nあかい札。『あたたか～い』");
					return;
				}
				await s.narrate("じはんき。つめたいのしか\n入っていない。");
			},
		},
		{
			id: "bench_ev",
			x: 16,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"ざっしは、おきっぱなしだ。\n夜つゆで、しめっている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ざっしが、なくなっている。");
					await s.say("kiriko", "……つづき、気になるンゴ");
					return;
				}
				await s.narrate("ベンチに、よみかけの\n漫画ざっしが　おいてある。");
			},
		},
		{
			id: "flower_ev",
			x: 5,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("花は、しずかに\nとじている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("けさも、もう\n水がまいてある。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("花だん。しめった　つちの\nにおいが　する。");
					return;
				}
				await s.narrate("花だん。水をまいたばかりで\nつちの　においがする。");
			},
		},
		{
			id: "lamp_ev",
			x: 11,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("街灯。しろく、\nついている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("街灯。もう、\nきえている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("街灯。いつのまにか、\nついていた。");
					return;
				}
				await s.narrate("街灯。まだ、\nついていない。");
			},
		},
		{
			id: "west_sign",
			x: 0,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『みなみ三丁目』");
				await s.narrate("バスどおりへ　つづく道だ。");
			},
		},
		{
			id: "pot_ev",
			x: 11,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("よく手入れされた\nうえ木だ。");
			},
		},

		// ── 裏どおり（x4 の路地から。無印の隠し） ──
		{
			id: "neko",
			x: 7,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ねこは、いない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ねこが、あくびをした。");
					return;
				}
				if (!s.flag("seen_neko")) {
					s.set("seen_neko");
					await s.narrate("だんボールのかげで、ねこが\nまるくなっている。");
					return;
				}
				await s.narrate("ねこが、うすめで\nこっちを見た。");
			},
		},
		{
			id: "laundry",
			x: 8,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("シーツは、夜つゆに\nぬれている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あたらしい洗濯物に\nかわっている。");
					return;
				}
				await s.narrate("ロープに、シーツが\nほしっぱなしだ。");
			},
		},
		{
			id: "crate_a",
			x: 6,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("だんボールが、たたんで\nつんである。");
			},
		},
		{
			id: "crate_b",
			x: 10,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ビールケース。みせの\nうらぐちだ。");
			},
		},

		// ── 公園と南の住宅（寄り道。行き止まりにも見るものを置く） ──
		{
			id: "sandbox",
			x: 12,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("プリンの型に、夜つゆが\nたまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("すなばに、ちいさな足あとが\nもう　ついている。");
					return;
				}
				await s.narrate("すなば。プリンの型が\nおきっぱなしだ。");
			},
		},
		{
			id: "h1_win",
			x: 6,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("まっくらだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("みそしるのにおいと、\nテレビの音がする。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("まどのおくで、\nお皿を　洗う音。");
					await s.narrate("カレーの　においが、\nすこし　のこっている。");
					return;
				}
				await s.narrate("まどのおく、カレーの\nにおいがする。");
			},
		},
		{
			id: "h1_door",
			x: 8,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『すずき』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("しずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("おちゃわんの音が\nしている。");
					return;
				}
				await s.narrate("中から、笑い声。");
			},
		},
		{
			id: "h2_win",
			x: 14,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("カーテンは、\nしまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ふとんが、ベランダに\nほしてある。");
					return;
				}
				await s.narrate("テレビのひかりが、カーテンに\nちらちらしている。");
			},
		},
		{
			id: "h2_door",
			x: 16,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『たなか』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("しずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("犬の鳴き声。\n……げんきだ。");
					return;
				}
				// 宵は実況が聞こえるだけ（延長の段には関係なく。P0-2）
				if (t === "yoru") {
					await s.narrate("おくで、やきうの　実況。\n……まだ　延長している。");
					return;
				}
				await s.narrate("おくで、犬が水をのむ\n音がする。");
			},
		},
		// キリコの部屋の窓（アパートのはし。路地 (4,7) から左向き。スプライトは無し。P0-5）。
		// 宵は電気のつけっぱなし、深夜はモニターの青（どちらもキリコ本人のしわざ。窓の中に人影は描かない）。
		// 朝は、夕方の店主のカーテンの話（seen_tenshu2）を聞いた人にだけ出る
		// （フラグの無い人の朝は現行と同一＝P0-11・§5。見た目のスプライトは無いので、隠れても変わらない）
		{
			id: "my_win",
			x: 3,
			y: 7,
			trigger: "talk",
			when: (st) => st.flags.tod !== "asa" || !!st.flags.seen_tenshu2,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate("はしの窓に、あかり。");
					await s.say("kiriko", "……でんき、\nつけっぱなしンゴ");
					return;
				}
				if (t === "shinya") {
					await s.narrate("はしの窓だけ、あおく\nひかっている。");
					await s.say("kiriko", "……モニター、\nけしわすれたンゴ");
					return;
				}
				if (t === "asa") {
					// 夕方の店主の「朝、カーテンが　しまったままだった」を聞いた人だけ（when）
					await s.narrate("はしの窓。カーテンが、\nちゃんと　あいている。");
					await s.say("kiriko", "これで　店主に\nばれないンゴ");
					return;
				}
				await s.narrate("アパートの　はしの窓。");
				await s.say("kiriko", "あそこが、吾輩の\nへやンゴ");
			},
		},
		// うらどおりの西はし、sumire 行き (2,19) の北どなり（踏まずに調べられるように）
		{
			id: "mizo",
			x: 2,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("みぞを、水が\nながれていく音がする。");
			},
		},
		{
			id: "shed",
			x: 23,
			y: 19,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ものおき。よこに、子ども用の\n自転車が　とめてある。");
			},
		},
	],
};
