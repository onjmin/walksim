// 線路ぞいの 無人駅（夜の 寄り道「線路ぞいの 無人駅」。STORY.md §5.4）。
// 深夜、せんろぞいのみちの あぜ道の おわり（senro の michi_owari）で レコード「終電」を 聞いた あと、
// まくら木の よこを 西へ 歩くと、地図に ない 駅の ホームに 着く。
// 地続き：線路ぞいを 歩いた 先。帰りも 東の 砂利の 道を 歩いて あぜ道の おわりへ もどる。
//
// ルールは 1つ：駅名を 声に 出して 読まない（レコードの 声の『駅名は……いや、読まないで　おこう』）。
// 駅名は どこにも 書かない。
//
// 先客（STORY.md §5.4「やられ役は 先客」）：ベンチで ネクタイを ほどいて すわっている 人（レコード「終電」の
// 声の 主）。顔は 描かない。キリコは つかまらない。駅名標を 調べると、確かめずに、先客が となりに 来て
// 先に 読みあげかける（身代わり。migawariYomu）。ハードカットで 線路の 道に 立っている。一回きり
// （seen_eki_kaeri で 入口が しまる。まくら木の ネクタイの 余波は 同じ）。
//
// 恐怖の 3要素（春日武彦『恐怖の正体』）:
//   危機感      くらい 線路・来ない はずの 電車の 音・ホームの はし（通過の 風）
//   不条理感    地図に ない 駅・時刻表の 時刻が ぜんぶ『２５：１０』
//   視野狭窄    先客は「ここ、どこなんでしょうね」と 駅名標を 見あげる。自分が 駅名標に 近づけば、
//               この 人が 読んで しまう かもしれない。線路の むこうの 灯りは 遠ざかる
//               （答えは ここでは 出さない。真の 筋の 窓の 場面で、その 人は 自分の 部屋に 帰っている）
//
// 段と回収（seen_eki_n＝ここで 何かを 調べた 数。調べる たびに 一段 すすむ。ekiStep）:
//   1 着く → 2 線路の むこうの 灯り → 3 踏切の 音 → 4 レールが 鳴る → 5 灯りが とおい
//   → 6 電車が 来る（駅名標が ライトで うかぶ。通過して、灯りが きえる＝seen_eki_owari）
//   先客     seen_eki_senkyaku（ベンチで 見た）
//   切符     kouken（アイテム。ホームの 灯りの 下）→ 朝 senro の カメラの人
//   帰り     seen_eki_kaeri（先客と いっしょに）→ senro の あぜ道の おわりの まくら木に ネクタイ
//   身代わり seen_eki_migawari（senkyaku.ts）→ senro の 線路の 道。窓の 場面で その 窓だけ 遅れて 灯る

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { numFlag } from "../nostalgia";
import { migawari } from "../senkyaku";
import { JP } from "../tiles";
import { STN } from "../tiles-station";
import { ekiReset } from "./senro";

/** 先客（ベンチの 人）の 名札（顔は 出さない）。 */
const SENKYAKU = { name: "ベンチの人", noPortrait: true, noVoice: true };

/**
 * 駅名標を 調べた。確かめずに、先客が 先に 読みあげかける（身代わり）。
 * その 声も 瞬間も 見せず、ハードカットで せんろぞいのみちの 線路の 道に 立っている。
 */
const migawariYomu = async (s: Story): Promise<void> => {
	await s.narrate("ベンチの　人が、立ちあがって\nとなりに　来た。");
	await s.narrate("駅名標を　見あげて、\n口を　ひらく。");
	await s.say(null, "……え、", SENKYAKU);
	ekiReset(s);
	await migawari(s, "rec_s");
	await s.warp("senro", 33, 7, "down", { fade: false });
	s.bgm(null);
	await s.fadeIn(0);
	await s.wait(1800);
	await s.narrate("……線路の　道に、\n立っていた。");
	await s.wait(1200);
	s.se("hum", { pan: -0.8, volume: 0.15 });
	await s.narrate("西の　線路で、黄色い\nランプが　まわっている。");
};

/** 電車が 来る（6段目）。通過して、線路の むこうの 灯りが きえる。 */
const densha = async (s: Story): Promise<void> => {
	s.se("train", { pan: 0.8, volume: 0.4 });
	await s.wait(1200);
	await s.narrate("ホームの　はしが、\nしろく　光った。");
	s.se("train", { pan: 0.4, volume: 0.8 });
	await s.narrate("駅名標の　字が、\nライトで　うかびあがる。");
	// 先客も 見あげている（読まない。間だけ）
	await s.narrate("ベンチの　人が、\n駅名標を　見あげている。");
	await s.wait(1400);
	s.se("train", { volume: 1 });
	await s.wait(600);
	await s.narrate("電車は、とまらなかった。");
	// ホームの はし（y3）に 立っていたら、通過の 風
	if (s.state.y <= 3) await s.narrate("風が、顔の　まえを\nぬけていった。");
	await s.narrate("あかるい　窓が、からっぽの\nまま　ながれていく。");
	// 静寂：音が きえて、何も 書かない 間
	s.bgm(null);
	await s.wait(2400);
	await s.narrate("……線路の　むこうの　灯りが、\nきえていた。");
	s.set("seen_eki_owari");
};

/** 調べる たびに 一段 すすむ（調べた もの の あとに 一行）。 */
const ekiStep = async (s: Story): Promise<void> => {
	if (s.flag("seen_eki_owari")) return;
	const n = numFlag(s, "seen_eki_n") + 1;
	s.set("seen_eki_n", n);
	if (n === 2) {
		await s.narrate("線路の　むこうに、\n灯りが　ひとつ。");
	} else if (n === 3) {
		s.se("kane", { pan: -0.7, volume: 0.15 });
		await s.narrate("とおくで、踏切の　音。\nカン、カン、カン……");
	} else if (n === 4) {
		s.se("hum", { volume: 0.2 });
		await s.narrate("レールが、かすかに\n鳴っている。");
	} else if (n === 5) {
		await s.narrate("線路の　むこうの　灯りが、\nさっきより　とおい。");
	} else if (n >= 6) {
		await densha(s);
	}
};

/** 調べる もの（中身の あとに 一段 すすむ）。 */
const shiraberu =
	(body: (s: Story) => Promise<void>) =>
	async (s: Story): Promise<void> => {
		await body(s);
		await ekiStep(s);
	};

/** 駅名標（いつでも 読める。調べると 先客が 身代わりに 読む。電車が 通った あとは ただの 板）。 */
const ekimeihyou = async (s: Story): Promise<void> => {
	await s.narrate("駅名標。\n字は、はっきり　読める。");
	if (s.flag("seen_eki_owari")) return;
	await migawariYomu(s);
};

/** ベンチの 先客（ネクタイを ほどいた 人。顔は 出さない。話しかけても 一段 すすむ）。 */
const bench = shiraberu(async (s) => {
	if (s.flag("seen_eki_owari")) {
		await s.narrate("ベンチの　人は、\nネクタイを　にぎっている。");
		return;
	}
	if (!s.flag("seen_eki_senkyaku")) {
		s.set("seen_eki_senkyaku");
		await s.narrate("ベンチに、スーツの\nだれかが　すわっている。");
		await s.narrate("ほどいた　ネクタイを、\nひざに　のせている。");
		await s.say(null, "……ここ、どこなんでしょうね", SENKYAKU);
		return;
	}
	await s.narrate("ベンチの　人は、\n駅名標の　ほうを　見ている。");
});

/** 東の 砂利の 道（来た 道。いつでも もどれる。電車の あとは 先客と いっしょに）。 */
const modoru = async (s: Story): Promise<void> => {
	if (!s.flag("seen_eki_owari")) {
		const i = await s.choose(["＞＞1 来た　道を　もどる", "＞＞2 やめておく"], {
			cancel: 1,
		});
		if (i !== 0) {
			await s.move("player", "l");
			return;
		}
	}
	const owari = !!s.flag("seen_eki_owari");
	ekiReset(s);
	if (owari) {
		s.set("seen_eki_kaeri");
		// 守りきった：先客も いっしょに 歩く
		await s.narrate("ベンチの　人も、\nいっしょに　歩きだした。");
	}
	await s.fadeOut(700);
	await s.wait(900);
	await s.warp("senro", 5, 2, "right", { fade: false });
	await s.fadeIn(700);
	if (!owari) return;
	await s.narrate("スーツの　人は、頭を　さげて、\nあぜ道を　帰っていった。");
	// 一息：保線の 機械の 音が 先に もどり、ことばは 遅れて ひとことだけ
	s.se("hum", { pan: -0.8, volume: 0.2 });
	await s.wait(1800);
	await s.say("kiriko", "……うなってるンゴ");
};

// ── タイル ──
//   (空白) くらやみ   z  線路の むこうの 草（通れない）   t  線路   g  砂利の 道
//   e  ホームの はし   P  ホーム   F  ホームの さく
//   L  ホームの 灯り   N  駅名標   T  時刻表   B b  ベンチ
const C_PF = "#4a4640";
const onPf = (img: string): TileDef => ({
	layers: [STN.platform, img],
	color: C_PF,
	passable: false,
});
const tiles: Record<string, TileDef> = {
	" ": { layers: [], color: "#05060a", passable: false },
	z: { layers: [JP.ground], color: "#1e2418", passable: false },
	t: { layers: [STN.track], color: "#2e2620", passable: false },
	g: { layers: [STN.gravel], color: "#3a3630", passable: true },
	e: { layers: [STN.platformEdge], color: C_PF, passable: true },
	P: { layers: [STN.platform], color: C_PF, passable: true },
	F: { layers: [STN.platform, JP.fence], color: C_PF, passable: false },
	L: onPf(STN.lamp),
	N: onPf(STN.nameSign),
	T: onPf(STN.notice),
	B: onPf(STN.benchL),
	b: onPf(STN.benchR),
};

const rows = [
	"                    ", // y0
	"zzzzzzzzzzzzzzzzzzzz", // y1  線路の むこう（灯りは (2,1)）
	"tttttttttttttttttttt", // y2  線路
	"  eeeeeeeeeeeeeee   ", // y3  ホームの はし
	"  PPPPLPPNPPTPBbPggg", // y4  灯り (6,4)・駅名標 (9,4)・時刻表 (12,4)・ベンチ (14,4)(15,4)・砂利の 道 (17〜19,4)
	"  PPPPPPPPPPPPPPP   ", // y5
	"  FFFFFFFFFFFFFFF   ", // y6
	"                    ", // y7
];

export const senroEki: MapDef = {
	id: "senro_eki",
	name: "？？？",
	bgm: null,
	outdoor: true,
	outside: "#05060a",
	tiles,
	rows,
	lights: [
		{ x: 6, y: 4, r: 3, color: "#e8f0ff" }, // ホームの 灯り
		{ x: 2, y: 1, r: 1.2, color: "#ffcc88" }, // 線路の むこうの 灯り
	],
	events: [
		{ id: "ekimeihyou", x: 9, y: 4, trigger: "talk", run: ekimeihyou },
		{
			id: "jikokuhyou",
			x: 12,
			y: 4,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("時刻表。\n時刻が、ぜんぶ『２５：１０』。");
			}),
		},
		...[14, 15].map((x) => ({
			id: `bench_${x}`,
			x,
			y: 4,
			trigger: "talk" as const,
			run: bench,
		})),
		{
			id: "akari",
			x: 6,
			y: 4,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("ホームの　灯り。\n蛍光灯が、一本だけ。");
				if (!s.has("kouken")) {
					await s.narrate("灯りの　下に、\n切符が　一枚。");
					s.se("item");
					s.give("kouken");
				}
			}),
		},
		{
			id: "hashi",
			x: 1,
			y: 4,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("ホームの　はし。\nその　さきは、まっくら。");
			}),
		},
		{
			id: "sen_mukou",
			x: 8,
			y: 2,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("線路。\nまくら木が、くらやみへ　つづく。");
			}),
		},
		{
			id: "modoru",
			x: 19,
			y: 4,
			trigger: "touch",
			exit: "right",
			through: true,
			run: modoru,
		},
	],
};
