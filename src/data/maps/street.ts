// まちのどおり（日常レイヤーの主舞台）。DESIGN §4 時間帯システム・docs/style-everyday.md・

// docs/content-briefs.md「日常レイヤー」。30×20・outdoor（TOD_PRESETS が tint/outside を乗せる）・
// BGM null（ヒグラシ・チャイム・電車などの生活音が音楽のかわり）。
//
// 同一マップが flags.tod（"yu"|"yoru"|"shinya"|"asa"）で四つの顔を持つ：
//   夕方  … 生きた町。NPC 7体・時計は 17:XX・東端は工事の囲い（お知らせ掲示）
//   宵    … 晩ごはんのあとの任意の散歩（docs/nostalgia.md P0-1）。NPC 0体・時計は 20:05〜21:15
//           （地区を回るたびに7分進む＝yoruClock）・街灯がつく。文は におい・音・点いた灯り だけ
//           （消えた窓・減った人は書かない）。自販機の赤い札・コンビニの牛乳・自分の窓のあかり
//   深夜  … 人も人の声も出さない（NPC 0体・必達）。時計は 2:05〜3:55（地区を回るたびに11分進む＝shinyaClock）
//   朝    … 光と音が戻る。NPC 5体・セリフ全差し替え・setup/payoff の対（§4）。
//           時計は 7時ごろ（ここに着いて 7:02。地区を回るたびに4分進む＝asaClock）
//
// 物語（STORY.md §5.5）：夕方の 地の文で「キリコが 外の 町で 暮らしはじめた」ことを はっきり 言う。
// 深夜の バス停で レコード「早番」（rec_q。辞めた 人）。rec_q を 拾うと、
// 深夜の この 通りで「窓」の 場面（転：窓の あかりと 物音を 見て、窓が ぜんぶ あかるく なるまで いる）
// → 夜明け（tod="asa"・ending_ready）→ うみべへ（結は umi.ts）。
//
// ここで 立てる 新しい フラグ（2026-10-04 演出の 強化。seen_mywin_ao・seen_eshaku_kutsu・
// seen_sasoi_kaeri は nostalgia.ts の「フラグの約束」の 表にも）:
//   seen_jihanki_st   vending_ev（yu・つめたいだけ）          → vending_ev（asa「札が、ついている」）
//   seen_akafuda_st   vending_ev（yoru・はしの あかい札）     → arrive_shinya（2行目）・vending_ev（asa「札が　ふえている」）
//   seen_densha_asa   densha_asa_a/b（asa・seen_densha_shinya の人）→ 同じ（一度だけ。電車の 4段の おしまい）
//   seen_mywin_ao     my_win（shinya・モニター、あんなに あかるい）→ apart door_room（shinya）
//   seen_eshaku_kutsu eshaku（yu の 2回目・くつひも）         → umi yoake_arrive（asa）
//   seen_sasoi_kaeri  arrive_yoru（room window の 誘い seen_yoru_sasoi の 回収）→ 同じ（一度だけ）
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
import {
	arrived,
	asaClock,
	kanShinya,
	kanTick,
	natsuOwari,
	numFlag,
	shinyaClock,
	yoruAkubi,
	yoruClock,
} from "../nostalgia";
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
	// 「S」うらどおりから かわらへ おりる 石段（下へ だけ 入れる。左右は いけがき「b」）
	S: { layers: [JP.stoneSteps], color: "#8a8a8a", passable: true },
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
	"  ,,,]m]j],,,)c)o),,,,,,      ", // y18 すずきさん家 (8,18)・たなかさん家 (16,18)
	"  ..................bSbx      ", // y19 うらどおり。かわらへの石段 (21,19)（(21,18) から下へ）・ものおき (23,19)
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
		// ⑱ スーパーで あんぱんの 売りきれを 見た 人だけ（suupaa pan）。足さずに 差しかえる（吹き出しを ふやさない）
		await s.say(
			"kiriko",
			s.flag("seen_suupaa_pan")
				? "スーパーも　うりきれてたンゴ。\nあんぱんで　いいンゴ"
				: "あんぱんで　いいンゴ",
		);
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
			// 深夜に シャッターの 下の 牛乳の ケースを 見た 人だけ（shop_front の shinya）
			if (s.flag("seen_gyunyu_case"))
				await s.say("kiriko", "（夜中に、とどいてたンゴ）");
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
	// 夕方・宵に すずきさん家の カレーの 窓を 見た 人だけ（h1_win）
	if (s.flag("seen_curry_st")) await s.narrate("カレーの　家の　窓にも。");
	// 去り方の 目録（受験・鯖・ミスキー。STORY.md §4.5）。深夜なので 声は 出さず、物音と 灯りだけ
	await s.narrate("机の　あかり。\n単語帳を　めくる　音。");
	await s.narrate("キーを　たたく　音が、とまっては\nまた　はじまる。");
	await s.narrate("画面の　あかりが、\nついたり　消えたり。");
	// ⑪ 辞めた 人（早番・04:10）：夕方の 会釈の 人。夜明けに うみべで すれ違う
	await s.narrate(
		"……ひとつ、あかりが　消えた。\n玄関で、くつひもを　むすぶ　音。",
	);
	await s.wait(500);
	await s.say("kiriko", "……みんな、窓の　むこうに\nいたンゴ");
	// ここから 夜明けまで 地続き（場面を 飛ばさない。深夜の 新聞の バイクは 入れない）
	await s.wait(700);
	await s.narrate("とおくで、カラスが\n鳴いた。");
	await s.narrate("空の　はしっこが、\nしろく　なってきた。");
	// 朝の スレの 住民の 声（カメオ音源）を ここで 読み込む（ボイス OFF なら 何もしない）
	if (settings.voice) {
		const ready = prepareCameoVoices();
		await s.narrate("（あちこちの　窓で、目ざましが\n鳴りはじめる――）");
		await ready.catch(() => {});
	}
	await s.narrate("……窓が　ぜんぶ　あかるく\nなるまで、見ていた。");
	await s.say("kiriko", "……海、見にいくンゴ");
	// 町は 7時ごろ（ここの 時計で 7:02。asaClock）
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
	// 民家・商店の窓明かりは夕方と宵（深夜の民家は消えている＝寝しずまった町。窓の場面の灯りは文だけ）。
	// ただしシャッターの下りた店（商店 (7,8)＝shop_front・電器屋 (13,9)＝denki_tv。電器屋は入口だけ）は宵には点けない
	// （宵は すきまから 夕はんの におい・テレビの 声が もれるだけ。電器屋の ショーウィンドウは 消えたテレビ）。
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
				// ふろの においの 出どころは すずきさん家（h1_door の yoru）
				await s.narrate("どこかの家の、ふろの\nにおいがする。");
				// P0-1 部屋の 窓の 誘い（room window・seen_yoru_sasoi「そとの風すうンゴ？」）の 回収。一度だけ
				if (s.flag("seen_yoru_sasoi") && !s.flag("seen_sasoi_kaeri")) {
					s.set("seen_sasoi_kaeri");
					await s.say("kiriko", "（……風、すずしいンゴ）");
				}
				// あんぱんで 牛乳の ない 人だけ（conbini_door の yoru で 買える）
				if (s.flag("got_dinner_pan") && !s.flag("got_gyunyu"))
					await s.say("kiriko", "（……ぎゅうにゅう、\nなかったンゴ）");
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
				// 宵に 自販機の あかい札（vending_ev・seen_akafuda_st）を 見た 人は、うなりを 札に。
				// （コンビニは 深夜も 点いている。conbini_win・room window とそろえる）
				// それが 無くて 宵の ふろの においの 家（h1_door・seen_furo_st）を 見た 人は、そのあとに キリコ
				if (s.flag("seen_akafuda_st")) {
					await s.narrate("コンビニの　あかりと、\n自販機の　あかい札だけ。");
					return;
				}
				await s.narrate("コンビニの　あかりと、\n自販機の　うなりだけ。");
				if (s.flag("seen_furo_st"))
					await s.say("kiriko", "（ふろの　におい、\nもう　しないンゴ）");
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
				// 深夜に シャッターの 下の 牛乳の ケースを 見た 人だけ（shop_front）。朝は 人の 手で はこばれる
				if (s.flag("seen_gyunyu_case"))
					await s.narrate(
						"ゆうべの　牛乳の　ケースが、\n店の　中へ　はこばれていく。",
					);
				await s.say("kiriko", "……ねむいンゴ");
			},
		},

		// ── 出入り口（座標凍結v2） ──
		warp(
			"to_apart",
			2,
			9,
			{ map: "apart", x: 10, y: 5, dir: "up" },
			{ se: "door" },
		),
		// ── 出入り口（座標凍結v3: 日常の町 拡張。二重ループの町） ──
		warp("to_sumire", 2, 19, { map: "sumire", x: 37, y: 3, dir: "left" }),
		warp("to_kawara", 21, 19, { map: "kawara", x: 38, y: 8, dir: "down" }),
		warp("to_kokudo", 0, 11, { map: "kokudo", x: 38, y: 10, dir: "left" }),
		// 裏どおりの北はしから、みどりがおか公園への石段（地続きの拡張 2026-09-28）
		warp("to_koen", 4, 3, { map: "koen", x: 20, y: 22, dir: "up" }),
		// 工事の囲いがふさいでいる（見た目つきの talk イベント＝通れない）。
		// 夕方の 穴（seen_kakoi_ana）・作業員（seen_sagyo）・子どもの うわさ（seen_kids）→ 朝の 土管
		{
			id: "kakoi",
			x: 28,
			y: 10,
			sprite: JP.kakoi,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"工事の囲いだ。赤いランプが、\nゆっくり　点滅している。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("囲いの　上で、黄色い\nランプが　まわっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("工事の囲いだ。");
					// 夕方に 穴か「なんか　出た」を 知った 人だけ、その 正体
					if (
						s.flag("seen_kakoi_ana") ||
						s.flag("seen_sagyo") ||
						s.flag("seen_kids")
					) {
						await s.narrate(
							"穴の　よこに、ふるい　土管が\n一本、ころがしてある。",
						);
						return;
					}
					await s.narrate("おくで、作業の音が\nしている。");
					return;
				}
				s.set("seen_kakoi_ana");
				await s.narrate("工事の囲いだ。すきまから、\nほった土が見える。");
				await s.say("kiriko", "……おっきい穴ンゴ");
			},
		},
		// 囲いのよこの掲示（工事のお知らせ）。夕・宵に 読んだ 人は、朝の 足された 紙に 気づき、
		// 朝の 作業員（sagyo_asa の 1回目）に「こんしゅうまつまで」を 言う。
		// 宵は 囲いの 黄色い ランプ・深夜は 赤い ランプ（kakoi と おなじ 灯り）で 紙の 見え方が かわる
		{
			id: "notice",
			x: 27,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				// 深夜は 赤い ランプの たびに 一部だけ 見える（フラグは 立てない）
				if (t === "shinya") {
					await s.narrate(
						"赤い　ランプが　つくたび、\n『通りぬけ』の　字だけ　見える。",
					);
					return;
				}
				if (t === "yu" || t === "yoru") s.set("seen_notice_st");
				await s.narrate("『道路補修工事のおしらせ』");
				await s.narrate("『期間中は　通りぬけが\nできません』");
				// 宵も『こんしゅうまつ』は 読める（朝の sagyo_asa で キリコが 言う）
				await s.narrate(
					t === "yoru"
						? "黄色い　ランプが　まわるたび、\n『こんしゅうまつ』の　字が　うかぶ。"
						: "こうじは　こんしゅうまつ\nまで、と書いてある。",
				);
				if (t === "asa") {
					await s.narrate("下に『本日　埋めもどし』の\n紙が　足してある。");
					if (s.flag("seen_notice_st"))
						await s.say("kiriko", "（きのうは、なかった\n紙ンゴ）");
				}
			},
		},
		// 夕方の遠い電車（seen_densha_yu → room の 布団の 遠い音・深夜の ここ）
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
		// ④ 深夜は 終電の あと（夕方に ここで 電車を 聞いた 人だけ。同じ 2マス・一度だけ）
		...[10, 11].map(
			(y): EventDef => ({
				id: `densha_shinya_${y === 10 ? "a" : "b"}`,
				x: 15,
				y,
				trigger: "touch",
				through: true,
				when: (st) =>
					st.flags.tod === "shinya" &&
					!!st.flags.seen_densha_yu &&
					!st.flags.seen_densha_shinya,
				run: async (s) => {
					s.set("seen_densha_shinya");
					await s.narrate("電車の　音は、もう\nしない。");
				},
			}),
		),
		// ④ 朝は 始発のあと（深夜に ここで「もう　しない」を 聞いた 人だけ。夕方→布団→深夜→朝の 4段）。
		// 朝の 子ども (14,10)(15,10) と 重ならないよう 一つ 東の 2マス
		...[10, 11].map(
			(y): EventDef => ({
				id: `densha_asa_${y === 10 ? "a" : "b"}`,
				x: 16,
				y,
				trigger: "touch",
				through: true,
				when: (st) =>
					st.flags.tod === "asa" &&
					!!st.flags.seen_densha_shinya &&
					!st.flags.seen_densha_asa,
				run: async (s) => {
					s.set("seen_densha_asa");
					s.se("densha_far", { pan: 0.4, volume: 0.5 });
					await s.narrate("とおくを、電車が\nとおる音。");
					await s.say("kiriko", "（もう、はしってるンゴ）");
				},
			}),
		),

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
			// 宿題の 段（seen_shukudai 数）→ 朝の kodomo_asa_b「あさの　あたしは、だめだった」
			async (s) => {
				const n = numFlag(s, "seen_shukudai");
				s.set("seen_shukudai", n + 1);
				if (n === 0) {
					await s.say(null, "宿題は、あしたの朝の\nあたしに　まかせた", {
						name: "女の子",
					});
					await s.say("kiriko", "……だいじょうぶンゴ？");
					await s.say(null, "あしたの　あたしは\nすごいから", {
						name: "女の子",
					});
					return;
				}
				await s.say(null, "……あしたの　あたしに、\nメモ　のこしとく", {
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
		// ⑪ 早番の人。しゃべらない 通行人の 段（1回目 会釈 seen_eshaku_st → 2回目 くつひもを むすびなおす
		// seen_eshaku_kutsu → 3回目から また 会釈）。どちらも umi yoake_arrive（asa）が 読んで、夜明けに すれ違う。
		// 深夜の 窓の 場面の「くつひもを　むすぶ　音」とも 響く
		npc(
			"eshaku",
			18,
			11,
			SPR.townsfolk,
			async (s) => {
				if (!s.flag("seen_eshaku_st")) {
					s.set("seen_eshaku_st");
					await s.narrate("作業着の　人。かるく、\n会釈をされた。");
					return;
				}
				if (!s.flag("seen_eshaku_kutsu")) {
					s.set("seen_eshaku_kutsu");
					await s.narrate("かがんで、くつひもを\nむすびなおしている。");
					return;
				}
				await s.narrate("また、会釈を　された。");
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
				// ⑦ 二度目で、朝の 行き先を 言う（かわらの やしろで 会える）
				if (!s.flag("seen_baachan2")) {
					s.set("seen_baachan2");
					await s.say(
						null,
						"あしたの　朝はね、かわらの\nやしろを　はきに　いくの",
						{
							name: "ばあちゃん",
						},
					);
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
				// ⑬ 公園の わすれがさ『3の2　さとう』を 見た 人だけ、一度
				if (s.flag("seen_koen_kasa") && !s.flag("seen_kasa_sato")) {
					s.set("seen_kasa_sato");
					await s.narrate(
						"はれてるのに、男の子が\nビニールがさを　もっている。",
					);
					await s.narrate("えに、マジックで\n『3の2　さとう』。");
					await s.say("kiriko", "（公園の、あの\nかさンゴ）");
				}
				// 夕方の「道の下から なんか出た」を 聞いた 人だけ、その つづき
				if (s.flag("seen_kids")) {
					// 朝の 作業員から「ふるい土管」を 聞いた 人は、先に 言ってしまう（種あかしは 一度だけ）
					if (s.flag("seen_sagyo_asa")) {
						if (s.flag("seen_dokan_kid")) {
							await s.say(null, "……土管、うちに\nほしいなあ", {
								name: "男の子",
							});
							return;
						}
						s.set("seen_dokan_kid");
						await s.say("kiriko", "ふるい　土管、\nだったンゴ");
						await s.say(null, "……なーんだ。\nでも　土管も　かっこいい", {
							name: "男の子",
						});
						return;
					}
					await s.say(null, "工事の　なんかのこと、\n先生に聞いてみるんだ", {
						name: "男の子",
					});
					return;
				}
				await s.say(null, "工事の　あな、きょう\nうめちゃうんだって", {
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
				// 夕方の「あしたの朝の　あたしに　まかせた」（kodomo_b・seen_shukudai）を 聞いた 人だけ。
				// 2回 聞いた 人には、2回目の「メモ　のこしとく」の そのあと
				const n = numFlag(s, "seen_shukudai");
				if (n > 0) {
					await s.say(
						null,
						n >= 2
							? "……メモ、あさの　あたしは\n読まなかった"
							: "……あさの　あたしは、\nだめだった",
						{ name: "女の子" },
					);
					await s.say(null, "ほら、言ったのに", { name: "男の子" });
					// 夕方の すなばの プリンの 型（sandbox・seen_purin）を 見た 人には、取りに いった 子
					await s.say(
						null,
						s.flag("seen_purin")
							? "……でも　プリンの型は、\nとってきた"
							: "学校つくまでが\nしょうぶだから",
						{ name: "女の子" },
					);
				} else {
					await s.say(null, "……宿題、学校で\nやるの", { name: "女の子" });
					// すなばの 型（seen_purin）だけ 見た 人にも、なくなった 型の 行き先を
					if (s.flag("seen_purin"))
						await s.narrate(
							"女の子の　手さげから、\nプリンの　型が　のぞいている。",
						);
				}
				// ⑧ スーパーの ガチャの 子（「あしたのぼくが　回す」）と 話した 人だけ
				if (s.flag("seen_gacha_kid") && !s.flag("seen_gacha_asa")) {
					s.set("seen_gacha_asa");
					await s.say(null, "あ、ガチャの　とこに\nいた人", { name: "男の子" });
					// ガチャに 10円を のせて きた 人だけ（suupaa gacha・seen_gacha_10en）
					await s.say(
						null,
						s.flag("seen_gacha_10en")
							? "あの　10円で、\nかえりに　回すんだ"
							: "10円、もらった。\nかえりに　回すんだ",
						{ name: "男の子" },
					);
					await s.say("kiriko", "（あしたのぼく、\nえらいンゴ）");
				}
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
				// 夕方に においを かがれた 人だけ「おぼえてて」（会っていない人には言わせない）
				if (s.flag("seen_sanpo")) {
					await s.narrate("犬が、しっぽを\nちぎれるほど　ふっている。");
					await s.say("kiriko", "……おぼえてて\nくれたンゴ");
					return;
				}
				await s.narrate("犬が、キリコの　くつを\nくんくん　かいでいる。");
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
					// 夕方に「図面とちがうのが出た」か、子どもの噂を 聞いた 人だけ たずねる
					if (s.flag("seen_sagyo") || s.flag("seen_kids")) {
						await s.say("kiriko", "……なにが　出たンゴ？");
						await s.say(null, "ん？　ただの\nふるい土管だったよ", {
							name: "作業員",
						});
					}
					// 夕・宵に 囲いの お知らせ（notice・seen_notice_st）を 読んだ 人だけ
					if (s.flag("seen_notice_st")) {
						await s.say("kiriko", "こんしゅうまつまで、って\n書いてあったンゴ");
						await s.say(null, "はやく　すむ　ぶんには、\nだれも　こまらんよ", {
							name: "作業員",
						});
					}
					return;
				}
				// 2回目: ベンチの ざっし（bench_ev・seen_zasshi）の 持ちぬし。一度だけ
				if (s.flag("seen_zasshi") && !s.flag("seen_zasshi_owner")) {
					s.set("seen_zasshi_owner");
					await s.say("kiriko", "ベンチの　ざっし、\nしらないンゴ？");
					await s.say(null, "あ、おれのだ。\n月曜は　つい　買っちまう", {
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
					await s.narrate(`まちの時計。――${shinyaClock(s)}。`);
					return;
				}
				// 朝は 7時ごろ（ここに 着いて 7:02。地区ごとに4分）。夕方の ハト（seen_tokei_hato）が もどっている
				if (t === "asa") {
					await s.narrate(`まちの時計。――${asaClock(s)}。`);
					await s.narrate(
						s.flag("seen_tokei_hato")
							? "ハトが、また　うえに\nとまっている。"
							: "ハトが、うえで　はねを\nのばしている。",
					);
					return;
				}
				// 宵は地区を回るたびに7分ずつ進む（20:05〜21:15。yoruClock）
				if (t === "yoru") {
					await s.narrate(`まちの時計。――${yoruClock(s)}。`);
					await s.narrate("文字盤を、街灯が\nてらしている。");
					return;
				}
				s.set("seen_tokei_hato");
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
					await s.narrate(`おくの時計――${shinyaClock(s, 1)}。`);
					return;
				}
				// 朝は まだ 開店前。宵の ほうきの 音（seen_toko_houki）を 聞いた 人には、はいた あとの ゆか
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_toko_houki")
							? "とこやの　まど。ゆかに、\nかみの毛　ひとつ　ない。"
							: "サインポールは、まだ\nとまっている。『10時から』の札。",
					);
					await s.narrate(`おくの時計は――${asaClock(s, 3)}。`);
					return;
				}
				// 宵は店じまい（時計は見せない。時計塔だけが宵の時刻を持つ）
				if (t === "yoru") {
					s.set("seen_toko_houki");
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
				// 深夜は 灯りと 機械だけ（店員・人の 物音は 書かない）
				if (t === "shinya") {
					await s.narrate("あかりが、ついている。");
					await s.narrate(
						"レジの　よこで、ホットスナックの\nケースが　ひかっている。",
					);
					await s.narrate(`時計は――${shinyaClock(s)}。`);
					return;
				}
				if (t === "asa") {
					await s.narrate("『あさごはん　あります』の\nのぼりが　出ている。");
					return;
				}
				// 宵は ゆげと レジの 音だけ（人の 姿は 書かない。時計は見せない）
				if (t === "yoru") {
					await s.narrate(
						"おでんの　ゆげ。レジの　ほうで、\nピッ、と　バーコードの　音。",
					);
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
				// 朝は まだ 開店前（深夜の「じぶんが　うつっている」画面に、朝の とおり）
				if (t === "asa") {
					await s.narrate("くらい画面に、朝の　とおりが\nうつっている。");
					return;
				}
				// 宵は入口のシャッターのすきまから実況（P0-2）。ショーウィンドウは 下ろさない（深夜・朝の くらい画面と つながる）。
				// 部屋の テレビで 中継の 打ち切り（seen_chukei_end）を 見た 人には、ここも 天気の 番組に かわっている
				if (t === "yoru") {
					if (s.flag("seen_chukei_end")) {
						await s.narrate(
							"入口だけ、シャッター。\nすきまから、あしたの　天気の　音楽。",
						);
						await s.say("kiriko", "（ここも、きれたンゴ）");
						return;
					}
					await s.narrate(
						"入口だけ、シャッター。\nすきまから、実況の声が　もれる。",
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
		// 店先（夕方は店主がいるのでカウンターにゆずる）。
		// 深夜の 牛乳の ケース（seen_gyunyu_case）→ 朝の arrive_asa で 店に はこばれる・tenshuAsa の 牛乳
		{
			id: "shop_front",
			x: 8,
			y: 9,
			trigger: "talk",
			when: (st) => st.flags.tod !== "yu",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("あけたばかりの　みせから、\nだしのにおいがする。");
					return;
				}
				if (t === "shinya") {
					s.set("seen_gyunyu_case");
					await s.narrate(
						"シャッターの　下に、朝の\n牛乳の　ケースが　とどいている。",
					);
					return;
				}
				await s.narrate(
					"シャッター。すきまから、\n夕はんの　においが　もれる。",
				);
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
					await natsuOwari(s);
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
				// 夕方の らくがき（seen_rakugaki_st）→ 深夜の くらがり → 朝の まゆげ
				if (t === "shinya") {
					await s.narrate("さいしゅうバスは、\nとっくに行ったあとだ。");
					if (s.flag("seen_rakugaki_st"))
						await s.narrate(
							"すみの　らくがきが、\nくらがりで　うすく　見える。",
						);
					return;
				}
				if (t === "asa") {
					await s.narrate("バスてい。つぎの　バスは\n7:50。");
					if (s.flag("seen_rakugaki_st")) {
						await s.narrate("へのへのもへじに、\nまゆげが　足されている。");
						await s.say("kiriko", "（けさの　しわざンゴ）");
					}
					return;
				}
				if (t === "yoru") {
					await s.narrate("さいしゅうの　19:20は、\nもう　出たあと。");
					return;
				}
				s.set("seen_rakugaki_st");
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
		// 自販機の 札の 段（夕 つめたいだけ seen_jihanki_st → 宵 はしの 一列だけ あかい札 seen_akafuda_st
		// → 深夜 arrive_shinya の「自販機の　あかい札だけ」・ここで 缶
		// → 朝 宵を 見た 人は「ふえている」／夕だけの 人は「ついている」）
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
				// 朝の 札は 三つに 分ける。宵の 一列を 見た 人は「ふえている」、
				// 夕の つめたいだけを 見た 人は「ついている」、どちらも 無い 人には ならびだけ
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_akafuda_st")
							? "『あたたか～い』の札が\nふえている。"
							: s.flag("seen_jihanki_st")
								? "『あたたか～い』の札が、\nついている。"
								: "『あたたか～い』の札が、\n二列　ならんでいる。",
					);
					return;
				}
				// 宵は端の一列だけ赤い札（深夜の缶の前ぶれ。札の字は朝の文とそろえる）
				if (t === "yoru") {
					s.set("seen_akafuda_st");
					await s.narrate("はしの一列だけ、\nあかい札。『あたたか～い』");
					return;
				}
				s.set("seen_jihanki_st");
				await s.narrate("じはんき。つめたいのしか\n入っていない。");
			},
		},
		{
			id: "bench_ev",
			x: 16,
			y: 12,
			trigger: "talk",
			// よみかけの ざっし（seen_zasshi）→ 朝 なくなる → 朝の 作業員（sagyo_asa の 2回目）が 持ちぬし
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (s.flag("seen_zasshi")) {
						await s.narrate("ざっしが、なくなっている。");
						await s.say("kiriko", "……つづき、気になるンゴ");
						return;
					}
					await s.narrate("ベンチに、朝の　日が\nさしている。");
					return;
				}
				s.set("seen_zasshi");
				if (t === "shinya") {
					await s.narrate(
						"ざっしは、おきっぱなしだ。\n夜つゆで、しめっている。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("ざっしの　ページが、\n風で　めくれている。");
					return;
				}
				await s.narrate("ベンチに、よみかけの\n漫画ざっしが　おいてある。");
			},
		},
		// ⑦ ばあちゃんの 花だん（夕 baachan「花は　きいてるよ、あんたの　足音も」seen_baachan →
		// 宵 ほしてある じょうろ → 深夜 つまさき → 朝 やしろの 前の 水まき seen_baachan2 → kawara houki_baachan）
		{
			id: "flower_ev",
			x: 5,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("花は、しずかに\nとじている。");
					// 夕方の「足音も」を 聞いた 人だけ（理由は 言わせない）
					if (s.flag("seen_baachan"))
						await s.narrate("つまさきで、そっと\nとおりすぎた。");
					return;
				}
				if (t === "asa") {
					await s.narrate("けさも、もう\n水がまいてある。");
					// 夕方に「あしたの　朝は　やしろを　はきに」を 聞いた 人だけ（kawara houki_baachan の 前ぶれ）
					if (s.flag("seen_baachan2"))
						await s.say("kiriko", "（やしろに　いく　前に、\nまいたンゴね）");
					return;
				}
				// 宵は 人を 出さずに、ばあちゃんの いた 跡
				if (t === "yoru") {
					await s.narrate("花だん。じょうろが、\nさかさに　ほしてある。");
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
				// ⑱ スーパーの ばあちゃんの 人ちがい「三丁目の。おおきくなって」（suupaa・seen_baa）
				if (s.flag("seen_baa"))
					await s.say("kiriko", "（三丁目の、までは\nあってたンゴ）");
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
				// ⑤ 深夜は「いない」と 書かない。夕方に ねこを 見た 人には くぼみ、見ていない 人には だんボールだけ
				if (t === "shinya") {
					await s.narrate(
						s.flag("seen_neko")
							? "だんボールに、まるい\nくぼみだけ　のこっている。"
							: "だんボールが、ひとつ。\n口を　あけて　おいてある。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ねこが、あくびをした。");
					// ⑤ 夕方に ここの ねこを 見て、夜の あつまり（danchi neko_ura）も 見た 人だけ
					if (s.flag("seen_neko") && s.flag("seen_neko_shukai"))
						await s.narrate("しっぽに、団地の\n草の実が　ついている。");
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
		// 物干しの ゆかた（夏まつりの あと。seen_yukata）→ 朝は Tシャツに かわる。
		// キリコの 一言は、夏の 名残 三つ（seen_natsu_owari）＞ アパートの 宵の せんたくき の 順に 一つ
		{
			id: "laundry",
			x: 8,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (!s.flag("seen_yukata")) {
						await s.narrate("Tシャツが、ロープに\nならんでいる。");
						return;
					}
					await s.narrate("ゆかたの　かわりに、\nTシャツが　ならんでいる。");
					if (s.flag("seen_natsu_owari"))
						await s.say("kiriko", "（夏、かたづけたンゴね）");
					else if (arrived(s, "apart", "yoru"))
						await s.say("kiriko", "（ゆうべ　まわってたの、\nこれンゴね）");
					return;
				}
				s.set("seen_yukata");
				if (t === "shinya") {
					await s.narrate("ゆかたが、風も　なく\nまっすぐ　さがっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("ゆかたの　すそが、\n夜風に　ゆれている。");
					return;
				}
				await s.narrate("ロープに、ゆかたが\nほしっぱなしだ。");
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
			// おきっぱなしの プリンの 型（seen_purin）→ 朝 なくなる → kodomo_asa_b の 女の子が「とってきた」
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_purin")
							? "プリンの　型が　ない。\nちいさな　足あとが、ひとつ。"
							: "すなばに、ちいさな足あとが\nもう　ついている。",
					);
					return;
				}
				s.set("seen_purin");
				if (t === "shinya") {
					await s.narrate("プリンの型に、夜つゆが\nたまっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("プリンの　型に、街灯が\nうつっている。");
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
				// カレーの 窓（seen_curry_st）→ 深夜の 窓の 場面（mado）で「カレーの　家の　窓にも。」
				if (t === "yoru") {
					s.set("seen_curry_st");
					await s.narrate("まどのおくで、\nお皿を　洗う音。");
					await s.narrate("カレーの　においが、\nすこし　のこっている。");
					return;
				}
				s.set("seen_curry_st");
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
				// 宵は arrive_yoru の「ふろの　におい」の 出どころ（気づきの 一言は 一度だけ。seen_furo_st
				// → arrive_shinya（深夜の 2行目のあと「ふろの　におい、もう　しない」））
				if (t === "yoru") {
					await s.narrate("ふろばの　窓から、ゆげと\nシャンプーの　におい。");
					if (!s.flag("seen_furo_st")) {
						s.set("seen_furo_st");
						await s.say("kiriko", "（……ここンゴね）");
					}
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
				// たなかさん家の 犬の 段（夕 h2_door 水をのむ → 宵 ここ はなさき → 深夜 しずか → 朝 h2_door げんき）
				if (t === "yoru") {
					await s.narrate(
						"カーテンの　すきまから、\n犬の　はなさきが　のぞいている。",
					);
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
				// 宵は実況が聞こえるだけ（P0-2）。部屋の テレビで 打ち切り（seen_chukei_end）を 見た 人には、ニュースに かわる
				if (t === "yoru") {
					if (s.flag("seen_chukei_end")) {
						await s.narrate("おくの　テレビは、もう\nニュースの　声。");
						await s.narrate("……ため息が、ひとつ。");
						return;
					}
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
				// ⑫ 深夜は 言いきらず 問いに（seen_mywin_ao。答えは apart door_room の「やっぱり、つけっぱなしンゴ」）
				// 窓は 見えているので、かわら taigan_view の「けしてきたっけ」とは 形を 分けて 見えている ものを 問う
				if (t === "shinya") {
					s.set("seen_mywin_ao");
					await s.narrate("はしの窓だけ、あおく\nひかっている。");
					await s.say("kiriko", "……モニター、\nあんなに　あかるいンゴ？");
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
	],
};
