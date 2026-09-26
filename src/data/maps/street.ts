// まちのどおり（日常レイヤーの主舞台）。DESIGN §4 時間帯システム・docs/style-everyday.md・
// docs/content-briefs.md「日常レイヤー」。30×20・outdoor（TOD_PRESETS が tint/outside を乗せる）・
// BGM null（ヒグラシ・チャイム・電車などの生活音が音楽のかわり）。
//
// 同一マップが flags.tod（"yu"|"shinya"|"asa"）で三つの顔を持つ：
//   夕方  … 生きた町。NPC 7体・時計は 17:XX・東端は工事の囲い（お知らせ掲示＝不穏の種①）
//   深夜  … 無人（NPC 0体・必達）。時計は全部 2:00（2つ目で s.note("nisen")）。
//           囲いが駅の入口に変わっている（触れると hub へ）。違和感はこの3系統だけ
//   朝    … 光と音が戻る。NPC 5体・セリフ全差し替え・setup/payoff の対（§4）。
//           囲いの前のイベントが flags.ending_ready でエンディング（まとめカードは
//           旧 terminus.ts の組み立てをそのまま移設。帰り方はフラグ seen_kaeri を読む）
//
// 座標凍結v2: (2,9)→apart(10,5)／apart 階段→(2,10)／東端の駅入口 (28,10)→hub(10,12)
// （深夜のみ）／hub 南口→(27,10)。開始位置は (24,10) 西向き（data/index.ts）。
// 座標凍結v3（日常の町 拡張）: うらどおり西端 (2,19)→sumire(37,3)／うらどおり (21,19)→
// kawara(37,8)／大どおり西 (0,11)→kokudo(38,10)。もどりの着地は (3,19)/(20,19)/(1,11)。
//
// 環境音は seLoop でなくワンショットの重ね掛けで作る（Story API に seLoop が無いため）。
// onEnter で一波 ＋ 道の途中の見えない帯（wave）で歩くたびに遠近を変えて鳴らす。
// MML SE は待ち時間 0（loudness.ts）なので文送りを止めない。
//
// 不穏の種（夕方の時点では完全に日常）: ①工事のお知らせ掲示（開始すぐ・東端）
// ②下校の子の「道の下から線路が出た」 ③バス停のらくがき『2じ』

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import { SPR } from "../sprites";
import { base, basePx, field, TOWN } from "../tiles";

// ── タイル ──
// TOWN をベースに、店先と東端の駅の名残を足す。
//   i  店の中の床   < = >  店のカウンター（むこうの店主に話しかけられる）
//   o  しまった戸（白壁）   j  しまった戸（板壁）
//   c  大きな窓（白壁の下段。コンビニ・民家）   t  大きな窓（レンガ壁の下段。電器屋）
//   m  窓（板壁の下段）   s  すなば   E  囲いのおくの下り階段（見えるだけ・通れない）
const PAVE = base(3, 46);
const WIN_LOW_WHITE = basePx(48, 1382);
const WIN_LOW_BRICK = basePx(16, 1382);
const tiles: Record<string, TileDef> = {
	...TOWN,
	i: { layers: [PAVE], color: "#9a9a9a", passable: true },
	"<": {
		layers: [PAVE, base(1, 98)],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
	"=": {
		layers: [PAVE, base(2, 98)],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
	">": {
		layers: [PAVE, base(3, 98)],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
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
	t: {
		layers: [base(1, 62), WIN_LOW_BRICK],
		color: "#a04a3a",
		passable: false,
	},
	m: {
		layers: [base(1, 56), WIN_LOW_WHITE],
		color: "#6a4a2a",
		passable: false,
	},
	s: { layers: [field(7, 2)], color: "#e8cc90", passable: true },
	E: {
		layers: [base(2, 46), base(6, 51)],
		color: "#3a3a40",
		passable: false,
	},
};

// 西＝アパート（ドア (2,9)）と裏どおり（x4 の路地から。無印の隠し）。
// 北＝商店（カウンター）・電器屋・コンビニ・とこや。東端＝工事の囲い (28,10)。
// 南＝掲示板・時計塔・ベンチ・バス停の並びと、小さな公園・住宅のうらどおり。
const rows = [
	"                              ", // y0
	"                              ", // y1
	"                              ", // y2
	"    |||||||                   ", // y3  物干しのロープ (8,3)
	"    ..x...x                   ", // y4  裏どおり。だんボール (6,4)・ねこ (7,4)・ビールケース (10,4)
	"aaaa.......                   ", // y5  アパートの屋根・裏どおり
	"AAAA.nnnnnn aaaa              ", // y6  路地 (4,5)-(4,9)
	"(w(w.^^^^^^ AAAA (((((( zzz   ", // y7  コンビニ (17-22)・とこや (24-26)
	"(w(w.%iiii% %WW% (w((w( ZZZ   ", // y8  店主 (7,8)
	"))d).%<==>%P%tt%x)ccoc)p]j]!f ", // y9  アパートのドア (2,9)・カウンター・電器屋の窓 (13,9)・お知らせ (27,9)
	"!::::::::::::::::::::::::::::E", // y10 大どおり。開始 (24,10)・hub からの戻り (27,10)・駅の入口 (28,10)
	",::::::::::::::::::::::::::ff ", // y11
	",L,,,*&Kk,,L,,,,Bb,V,,,!,L,   ", // y12 花だん (5,12)・掲示板 (7,12)・時計塔 (13,12)・ベンチ (16,12)・バス停 (23,12)
	"  ,,,,,,,,,,,,,,,,,,,,,,,     ", // y13 公園のこみち
	"  ,,,,T,,,T,ss,T,,,T,,,,,     ", // y14 すなば (12,14)
	"  ,,,zzzzz,,,nnnnn,,,,,,      ", // y15 南の住宅
	"  ,,,ZZZZZ,,,^^^^^,,,,,,      ", // y16
	"  ,,,[[[[[,,,(((((,,,,,,      ", // y17
	"  ,,,]m]j],,,)c)o),,,,,,      ", // y18 すずきさん家 (8,18)・たなかさん家 (16,18)
	"  .....................x      ", // y19 うらどおり。みぞ (1,19)・ものおき (23,19)
];

// ── モブの歩行グラ（同梱の RPGEN DQ 風） ──
const CHILD = "pub:assets/rpgen/char/04-child.png";
const GRANDMA = "pub:assets/rpgen/char/05-elderly-b.png";
const WALKER = "pub:assets/rpgen/char/11-woman-b.png";
const WORKER = "pub:assets/rpgen/char/12-warrior-b.png";
const SHOPKEEPER = "pub:assets/rpgen/char/02-merchant.png";

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

/**
 * 深夜の時計（全部 2:00）。べつべつの時計を2つ見たところで、ノートに書き留める
 * （1つ目は「止まってるのか」で流せる微差。反復で必然に変わる。style-everyday §3）。
 */
const NISEN_KEYS = ["tower", "barber", "conbini"] as const;
const nisen = async (s: Story, key: string): Promise<void> => {
	if (s.flag(`seen_nisen_${key}`)) return;
	s.set(`seen_nisen_${key}`);
	const n = NISEN_KEYS.filter((k) => !!s.flag(`seen_nisen_${k}`)).length;
	if (n === 2) await s.say("kiriko", "……さっきのも、\n2時だったンゴ");
	else if (n >= 3) await s.narrate("……ぜんぶ、おなじ時間だ。");
	// 2つ目で書き留める（3つ目以降の note() は何もしない）
	if (n >= 2) await s.note("nisen");
};

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

/** 朝の店主（夕方の買い物の payoff。プレイヤーの選択でひとことが変わる）。 */
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
			await s.say("kiriko", "ぎゅうにゅうが\nなかったンゴ……");
			await s.say(null, "はは。じゃあ　きょうは\nぎゅうにゅうを　買いな", {
				name: "店主",
			});
			return;
		}
		await s.say(null, "おはようさん。\nきょうは　早いんだね", { name: "店主" });
		return;
	}
	await s.say(null, "よく　ねむれた顔だ。\n……いや、ねぶそくか？", {
		name: "店主",
	});
};

// ── エンディング（朝・囲いの前。まとめカードは旧 terminus.ts の組み立てを移設） ──

const endingAtKakoi = async (s: Story): Promise<void> => {
	s.face("player", "right");
	await s.wait(400);
	await s.narrate("囲いのむこうから、\n工事の音がしている。");
	await s.wait(600);
	await s.say("kiriko", "……朝めし、たべるンゴ");
	s.set("clear");
	s.set("ending_seen");
	// まとめカード（帰り方は terminus が s.set("seen_kaeri", "walk"|"train") で残す）
	const recs = ["rec_a", "rec_b", "rec_c", "rec_last"].filter(
		(id) => s.has(id) > 0,
	).length;
	const myau = ["seen_myau1", "seen_myau2", "seen_myau3"].filter(
		(f) => !!s.flag(f),
	).length;
	const lines = [`レコード　${recs}まい`, `ミャウミャウ目撃　${myau}かい`];
	if (s.flag("found_miniwai")) lines.push("ミニワイに　会った（もきゅ）");
	if (s.flag("seen_yobigoe_reply")) lines.push("呼び声に　へんじをした");
	else if (s.flag("note_yobigoe")) lines.push("呼び声に　だまっていた");
	lines.push(
		s.flag("seen_kaeri") === "train" ? "終電で　帰った" : "あるいて　帰った",
	);
	await s.ending({
		summary: {
			sections: [{ title: "こんやの　きろく", lines }],
		},
	});
};

export const street: MapDef = {
	id: "street",
	name: "まちのどおり",
	bgm: null,
	outdoor: true,
	outside: "#0d0b09",
	tiles,
	rows,
	// 光源（docs/night-fx.md §2）。街灯・自販機・コンビニは深夜のみ（夕方は「まだついていない」）、
	// 民家・商店の窓明かりは夕方のみ（深夜の民家は消えている＝無人の記号）
	lights: [
		{ x: 1, y: 12, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 11, y: 12, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 25, y: 12, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 19, y: 12, r: 1.5, color: "#eef4ff", only: "yoru,shinya" },
		{ x: 19, y: 9, r: 4, color: "#cfe4ff", only: "yoru,shinya" },
		{ x: 21, y: 9, r: 2, color: "#cfe4ff", only: "yoru,shinya" },
		{ x: 7, y: 8, r: 2, only: "yu,yoru" },
		{ x: 13, y: 9, r: 2, color: "#cfe4ff", only: "yu,yoru" },
		{ x: 25, y: 8, r: 2, only: "yu,yoru" },
		{ x: 1, y: 8, r: 2, only: "yu,yoru" },
		{ x: 3, y: 8, r: 2, only: "yu,yoru" },
		{ x: 19, y: 9, r: 3, color: "#cfe4ff", only: "yu,yoru" },
		{ x: 8, y: 18, r: 2, only: "yu,yoru" },
		{ x: 16, y: 18, r: 2, only: "yu,yoru" },
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。深夜は無音のまま）
	onEnter: async (s) => {
		lastWave = "";
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
				await s.say("kiriko", "はらへったンゴ。晩ごはん\n買って、帰るンゴ");
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
		// 深夜だけ、囲いのあった場所が駅の入口（→ hub）
		{
			id: "sta_in",
			x: 28,
			y: 10,
			trigger: "touch",
			through: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				if (!s.flag("seen_sta_in")) {
					s.set("seen_sta_in");
					await s.narrate("くらい階段が、下へ\nつづいている。");
				}
				await s.warp("hub", 10, 12, "up", { se: "stairs" });
			},
		},
		// 夕方・朝は工事の囲いがふさいでいる（見た目つきの talk イベント＝通れない）
		{
			id: "kakoi",
			x: 28,
			y: 10,
			sprite: base(5, 32),
			trigger: "talk",
			fixedDir: true,
			when: (st) => st.flags.tod !== "shinya",
			run: async (s) => {
				if (s.flag("tod") === "asa") {
					await s.narrate("工事の囲いだ。\n――もとどおりに、ある。");
					await s.narrate("おくで、作業の音が\nしている。");
					return;
				}
				await s.narrate("工事の囲いだ。すきまから、\nほった土が見える。");
				await s.say("kiriko", "……おっきい穴ンゴ");
			},
		},
		// 囲いのよこの掲示（夕方・朝＝工事のお知らせ／深夜＝駅名標）
		{
			id: "notice",
			x: 27,
			y: 9,
			trigger: "talk",
			when: (st) => st.flags.tod !== "shinya",
			run: async (s) => {
				await s.narrate("『道路補修工事のおしらせ』");
				await s.narrate("『期間中は　通りぬけが\nできません』");
				await s.narrate("こうじは　こんしゅうまつ\nまで、と書いてある。");
				if (s.flag("tod") === "asa")
					await s.narrate("……きのうと、おなじ\n掲示だ。");
			},
		},
		{
			id: "ekimei",
			x: 27,
			y: 9,
			trigger: "talk",
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.narrate("駅名標だ。ひらがなで\n『かいせん』。");
				await s.narrate("となりの駅は、\n書かれていない。");
			},
		},

		// ── 深夜、囲いに近づくと遠くで終電の音（右パン・一度だけ。否認可能なまま） ──
		{
			id: "densha2_a",
			x: 25,
			y: 10,
			trigger: "touch",
			through: true,
			when: (st) => st.flags.tod === "shinya" && !st.flags.seen_densha2,
			run: async (s) => {
				s.set("seen_densha2");
				s.se("densha_far", { pan: 0.7, volume: 0.7 });
				await s.narrate("とおくで、電車の音が\nした。……気がする。");
			},
		},
		{
			id: "densha2_b",
			x: 25,
			y: 11,
			trigger: "touch",
			through: true,
			when: (st) => st.flags.tod === "shinya" && !st.flags.seen_densha2,
			run: async (s) => {
				s.set("seen_densha2");
				s.se("densha_far", { pan: 0.7, volume: 0.7 });
				await s.narrate("とおくで、電車の音が\nした。……気がする。");
			},
		},
		// 夕方の遠い電車（定時音を正常の側に置いておく。深夜の反転の下ごしらえ）
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

		// ── エンディング（朝・囲いの手前。terminus の書き換えが ending_ready を立てる） ──
		{
			id: "ending_ev",
			x: 27,
			y: 10,
			trigger: "touch",
			through: true,
			when: (st) => st.flags.tod === "asa" && !!st.flags.ending_ready,
			run: endingAtKakoi,
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
					await s.say(null, "あのさ、工事のとこ、道の\n下から線路が出たって", {
						name: "男の子",
					});
					await s.say("kiriko", "せんろ？");
					await s.say(null, "おっちゃんが言ってた。\nむかしのやつ、だって", {
						name: "男の子",
					});
					await s.say(null, "……ほんとかなあ", { name: "男の子" });
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
				await s.say(null, "きのうの線路のこと、\n先生に聞いてみるんだ", {
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
					await s.say("kiriko", "……線路、あったンゴ？");
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
			sprite: base(5, 47),
			trigger: "talk",
			through: true,
			fixedDir: true,
			when: (st) => st.flags.tod === "shinya",
		},
		{
			id: "light_b",
			x: 19,
			y: 10,
			sprite: base(5, 47),
			trigger: "talk",
			through: true,
			fixedDir: true,
			when: (st) => st.flags.tod === "shinya",
		},

		// ── しらべられるもの（時計は夕方から見られるようにしておく＝深夜の反復の前提） ──
		{
			id: "clock_tower",
			x: 13,
			y: 12,
			sprite: base(2, 116, 1, 2),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("まちの時計。――2:00。");
					await nisen(s, "tower");
					return;
				}
				if (t === "asa") {
					await s.narrate("まちの時計。――7:02。");
					await s.narrate("秒しんが、うごいている。");
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
					await nisen(s, "barber");
					return;
				}
				if (t === "asa") {
					await s.narrate("サインポールが、\nまわりだした。");
					await s.narrate("おくの時計は――7:05。");
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
					await nisen(s, "conbini");
					return;
				}
				if (t === "asa") {
					await s.narrate("『あさごはん　あります』の\nのぼりが　出ている。");
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
				await s.narrate("ならんだテレビが、ぜんぶ\nおなじ夕方のニュース。");
				await s.narrate("画面のすみに――17:04。");
			},
		},
		{
			id: "denki_bill",
			x: 14,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("はり紙。『テレビ\nおやすくします』");
				await s.narrate("日づけは、先月だ。");
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
		{
			id: "board_ev",
			x: 7,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("町内の掲示板。");
				await s.narrate("『ゴミは　朝8時までに』");
				await s.narrate("『なつまつりは　おわりました』\nの紙も、まだある。");
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
					await s.narrate("らくがきの『2じ』が、\nそのままある。");
					return;
				}
				if (t === "asa") {
					await s.narrate("バスてい。一番バスまで、\nまだ時間がある。");
					return;
				}
				await s.narrate("バスてい。さいしゅうは\n19:20だ。");
				await s.narrate("すみに、らくがき。\n――『2じ』");
				await s.say("kiriko", "……おこさまンゴ");
			},
		},
		// ── ポスト（脇道の怪異 post。深夜だけ、中でかすかに紙の音。朝は普通） ──
		{
			id: "post_ev",
			x: 21,
			y: 12,
			sprite: base(4, 519, 1, 2),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ゆうびんポスト。");
					await s.wait(500);
					await s.narrate("……中で、かさ、と\n紙の音がした。");
					await s.narrate("あつめは、夕方で\nおわっているはずだ。");
					await s.note("post");
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
				if (t === "shinya") {
					await s.narrate("ひくく、うなっている。\nあかりは、ついたまま。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『あたたか～い』の札が\nふえている。");
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
				await s.narrate("おくで、犬が水をのむ\n音がする。");
			},
		},
		{
			id: "mizo",
			x: 1,
			y: 19,
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
