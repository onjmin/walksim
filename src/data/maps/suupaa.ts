// スーパーみなみ（駅前のスーパー）。docs/content-briefs.md「日常の町 拡張」・
// docs/style-everyday.md（紙物のアーカイブ主義・NPCはくだらない雑談だけ）。
// 20×14・室内（outdoor なし）・BGM null（店内放送とレジの音が音楽のかわり）。
// **夕方のみ入れる**（ekimae 側の入口 (10,4) が他の時間帯を通さない）ので、
// 中の時間帯はいつも夕方。**怪異ゼロの純ノスタルジー地区**——不穏の種も置かない。
//
// 買いもの: 惣菜のコロッケ（半額シール）をかごに入れ、レジのばあちゃんで会計。
// はらわずに出ようとすると　キリコが立ち止まる。朝の搬入 payoff（開店前のトラック・
// 『みなみ』と書かれた箱）は ekimae 側と対になっている。
// 会計のレシートはポケットへ（nostalgia.md P0-9。朝の机で見つかる＝room desk。
// 新しいフラグは無く、got_korokke／seen_kaikei を流用する）。
//
// 座標凍結v3: 入口からの着地 (10,12)／出口 touch (10,13) → ekimae (10,5)。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { npc } from "../helpers";
import { SHOP } from "../tiles";

// 絵は自作チップ（data/tiles.ts の SHOP）。床は木（'.'）——ふるいスーパーの、あぶらのしみた木の床。
const tiles: Record<string, TileDef> = SHOP;

// 北壁ぞい＝ひえた棚（牛乳・とうふ・れいとう）と米の樽・搬入の箱。
// 中央＝棚の列2本（おかし・かんづめ・パン・にちようひん…）。南＝惣菜・特売ワゴン・
// レジ・かご・ガチャガチャ。出口は南の中央 (10,13)。
const rows = [
	"####################", // y0
	"#HHHHHHHHHHHHHHHHHH#", // y1
	"#hhhhhhhhhhhhhhhhhh#", // y2  営業時間 (4,2)・ポップ (8,2)・おとどけ (12,2)・のど自慢 (18,2)
	"#LSs.Ss..Ss..xx..U.#", // y3  スピーカー (1,3)・牛乳 (2,3)(3,3)・とうふ (5,3)・れいとう (9,3)・搬入の箱 (13,3)・米 (17,3)
	"#..................#", // y4
	"#..BBBB..BBBB..BB..#", // y5  おかし (3,5)・カップめん (6,5)・かんづめ (9,5)・のみもの (12,5)・雑誌 (15,5)
	"#..................#", // y6
	"#..BBBB..BBBB..BB..#", // y7  パン (3,7)・ちょうみりょう (6,7)・にちようひん (9,7)・文ぼうぐ (12,7)・おもちゃ (15,7)
	"#..................#", // y8  おくさん (4,8)
	"#..tttt....www.....#", // y9  惣菜 (3,9)(5,9)(6,9)・特売ワゴン (12,9)
	"#..................#", // y10 レジのばあちゃん (7,10)
	"#.....[=]..........#", // y11 レジ (6,11)-(8,11)・レジよこ (8,11)
	"#............k.g...#", // y12 着地 (10,12)・かご (13,12)・ガチャガチャ (15,12)・男の子 (14,12)
	"##########D#########", // y13 出口 (10,13)
];

/** レジのばあちゃん（3層: 初回／二層目の雑談／待機。会計はいつでも割り込む）。 */
const baachan = async (s: Story): Promise<void> => {
	// 会計（かごにコロッケが入っていれば、まずレジを打つ）
	if (s.flag("got_korokke") && !s.flag("seen_kaikei")) {
		s.set("seen_kaikei");
		await s.say(null, "はい、コロッケ半額ね。\nあぶら、まだあったかいよ", {
			name: "レジのばあちゃん",
		});
		// 買ったことは item の音とばあちゃんの「半額ね」で伝わる（レシートの1行を足して5吹き出しに収める）
		s.se("item", { volume: 0.8 });
		await s.say(null, "はしっこ、ひとつ\nおまけしといた", {
			name: "レジのばあちゃん",
		});
		await s.say("kiriko", "……ばあちゃん、それ\n店的に　いいンゴ？");
		await s.say(null, "いいの、いいの", { name: "レジのばあちゃん" });
		// ポケットの紙もの（P0-9）。朝の机で見つかるレシートに、おまけは載っていない
		await s.narrate("レシートを、ポケットに\nおしこんだ。");
		return;
	}
	if (!s.flag("seen_baa")) {
		s.set("seen_baa");
		await s.say(null, "いらっしゃい。……ああ、\n三丁目の。おおきくなって", {
			name: "レジのばあちゃん",
		});
		await s.say("kiriko", "……たぶん、\nひとちがいンゴ");
		await s.say(null, "そうかい。じゃあ、\nはじめまして", {
			name: "レジのばあちゃん",
		});
		await s.say(null, "ゆっくり見ておいで。\nきょうはコロッケが半額", {
			name: "レジのばあちゃん",
		});
		return;
	}
	if (!s.flag("seen_baa2")) {
		s.set("seen_baa2");
		await s.say(null, "この店もね、駅より\nあとに　できたんだよ", {
			name: "レジのばあちゃん",
		});
		await s.say("kiriko", "駅は、いつから？");
		await s.say(null, "さあねえ。……はかりの\n目もりが　もどるくらい前", {
			name: "レジのばあちゃん",
		});
		await s.say("kiriko", "……ぜんぜん\nわからないンゴ");
		return;
	}
	await s.say(null, "ゆっくり　見ておいで", { name: "レジのばあちゃん" });
};

export const suupaa: MapDef = {
	id: "suupaa",
	name: "スーパーみなみ",
	bgm: null,
	outside: "#14120e",
	tiles,
	rows,
	events: [
		// ── 入った直後（店内放送。auto once） ──
		{
			id: "housou_first",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(600);
				await s.narrate("天じょうのスピーカーから、\n店内放送。");
				await s.narrate(
					"『本日も　スーパーみなみへ\nご来店　くださいまして――』",
				);
				await s.say("kiriko", "（この放送の声、\nずっと　おなじンゴ）");
			},
		},

		// ── 出口（座標凍結v3。はらいわすれは通さない） ──
		{
			id: "deguchi",
			x: 10,
			y: 13,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (s.flag("got_korokke") && !s.flag("seen_kaikei")) {
					await s.say("kiriko", "（――まだ、おかねを\nはらってないンゴ）");
					await s.move("player", "u");
					return;
				}
				await s.warp("ekimae", 10, 5, "down", { se: "doorbell" });
			},
		},

		// ── 人たち ──
		npc("baachan_ev", 7, 10, "pub:sprites/mob_obaachan.png", baachan, {
			dir: "down",
		}),
		npc(
			"okusan",
			4,
			8,
			"pub:sprites/mob_mama.png",
			async (s) => {
				if (!s.flag("seen_suupaa_okusan")) {
					s.set("seen_suupaa_okusan");
					await s.say(null, "コロッケにするか、\nアジフライにするか……", {
						name: "おくさん",
					});
					await s.say("kiriko", "（じゃまを　しては\nいけないンゴ）");
					return;
				}
				await s.say(null, "……よし、りょうほう", { name: "おくさん" });
			},
			{ dir: "down" },
		),
		npc(
			"gacha_kid",
			14,
			12,
			"pub:sprites/mob_child.png",
			async (s) => {
				if (!s.flag("seen_gacha_kid")) {
					s.set("seen_gacha_kid");
					await s.say(null, "あと10円　たりない", { name: "男の子" });
					await s.say("kiriko", "（……10円、そっと\nおいていきたいンゴ）");
					return;
				}
				await s.say(null, "きょうは　あきらめる。\nあしたのぼくが　回す", {
					name: "男の子",
				});
			},
			{ dir: "right" },
		),

		// ── 北壁ぞい（ひえた棚・米・搬入の箱・スピーカー） ──
		{
			id: "speaker_ev",
			x: 1,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("スピーカー。ときどき、\n放送が　入る。");
				await s.narrate("『たまごは　おひとりさま\n一パックまで――』");
			},
		},
		{
			id: "milk_a",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ぎゅうにゅうの　ケース。\nよく　ひえている。");
				await s.narrate("……おくのから取るくせは、\nなおらない。");
			},
		},
		{
			id: "milk_b",
			x: 3,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("コーヒーぎゅうにゅうも\nある。");
				await s.narrate("おふろの　あとのやつだ。");
			},
		},
		{
			id: "tofu",
			x: 5,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("とうふが、水のなかで\nしずんでいる。");
			},
		},
		{
			id: "reitou",
			x: 9,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"ふたつきの　れいとうケース。\nガラスが、白くくもっている。",
				);
				await s.narrate("ふたを　すこしあけて、\nすぐ　しめた。つめたい。");
			},
		},
		{
			id: "hako",
			x: 13,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『みなみ』と書かれた\nはこが　つんである。");
				await s.narrate("あしたの朝、ならぶ分だ。");
			},
		},
		{
			id: "kome",
			x: 17,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("こめの　はかり売り。\n『こしひかり』の札。");
				await s.narrate("ますが、ふちまで\nみがかれている。");
			},
		},

		// ── 北壁の紙もの（ぜんぶに背景を持たせる） ──
		{
			id: "eigyo_fuda",
			x: 4,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『えいぎょう時間』の札。\n10:00〜19:00。");
			},
		},
		{
			id: "pop",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("手がきのポップ。\n『てんちょう　いちおし』");
				await s.narrate("なにを　おしているのかは、\n書いていない。");
			},
		},
		{
			id: "otodoke",
			x: 12,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『おとどけ　やります』の\n札。でんわばんごう　つき。");
			},
		},
		{
			id: "nodojiman",
			x: 18,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『みなみ　ちびっこのど自慢』\nの、はり紙。");
				await s.narrate("日づけは、ずいぶん\nまえだ。");
			},
		},

		// ── 棚の列1（おかし・カップめん・かんづめ・のみもの・雑誌） ──
		{
			id: "okashi",
			x: 3,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("おかしの棚。あたりつきの\nガムが、まだ　うっている。");
			},
		},
		{
			id: "cupmen",
			x: 6,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("カップめんの棚。\n『しんはつばい』の札つき。");
			},
		},
		{
			id: "kanzume",
			x: 9,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かんづめの棚。ももの缶が、\nたかいところにある。");
			},
		},
		{
			id: "nomimono",
			x: 12,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ラムネと、ジュースの\nびんが　ならんでいる。");
			},
		},
		{
			id: "zasshi",
			x: 15,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("まんが雑誌のラック。\nひもで　しばられていない。");
				await s.say("kiriko", "……立ちよみは、また\nこんどンゴ");
			},
		},

		// ── 棚の列2（パン・ちょうみりょう・にちようひん・文ぼうぐ・おもちゃ） ──
		{
			id: "pan",
			x: 3,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("パンの棚。あんぱんは\nうりきれている。");
				await s.narrate("あんぱんは、先に\nなくなるらしい。");
			},
		},
		{
			id: "choumiryou",
			x: 6,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("しょうゆの一升びんが、\nどんとある。");
			},
		},
		{
			id: "nichiyou",
			x: 9,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("せんざいの箱。テレビで\n見たやつだ。");
			},
		},
		{
			id: "bunbougu",
			x: 12,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("はしっこに、文ぼうぐ。\nけしゴムと、じゆうちょう。");
			},
		},
		{
			id: "omocha",
			x: 15,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ちいさな　おもちゃの棚。\nくじつきだ。");
			},
		},

		// ── 惣菜と特売（半額シール・二度目にへっている山） ──
		{
			id: "korokke",
			x: 3,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("got_korokke")) {
					await s.narrate("コロッケのパック。\n半額のシールが　はってある。");
					const i = await s.choose(["＞＞1 かごに入れる", "＞＞2 やめておく"], {
						cancel: 1,
					});
					if (i === 0) {
						s.set("got_korokke");
						await s.say("kiriko", "……半額は、正義ンゴ");
						await s.narrate("コロッケを、かごに入れた。\nレジで　はらおう。");
					}
					return;
				}
				if (!s.flag("seen_kaikei")) {
					await s.narrate("もう、かごの中だ。");
					return;
				}
				await s.narrate("のこりのコロッケにも、\nシールが　はられていく。");
			},
		},
		{
			id: "menchi",
			x: 5,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("メンチカツは、うりきれ。\nふだだけ、のこっている。");
			},
		},
		{
			id: "yakisoba",
			x: 6,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("やきそばのパック。\nゆげで、ふたが　くもる。");
			},
		},
		{
			id: "wagon",
			x: 12,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_suupaa_wagon")) {
					s.set("seen_suupaa_wagon");
					await s.narrate("『とくばい』の赤い札。\nティッシュの山だ。");
					return;
				}
				await s.narrate("……山が、すこし\nひくくなっている。");
			},
		},

		// ── レジまわり・かご・ガチャガチャ ──
		{
			id: "rejiyoko",
			x: 8,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レジよこの、ガムと\nかん電池。");
				await s.narrate("つい、手にとりそうになる\nならびだ。");
			},
		},
		{
			id: "kago",
			x: 13,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("買いものかごが、\nかさねて　つんである。");
				await s.narrate("青いのと、ときどき\n赤いの。");
			},
		},
		{
			id: "gacha",
			x: 15,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ガチャガチャが、二台。\n一台は『じゅんびちゅう』。");
				await s.narrate("まわすところを、\nつい　見てしまう。");
			},
		},
	],
};
