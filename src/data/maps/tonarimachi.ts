// となりまち「つきみ」（アーケード商店街）。docs/content-briefs.md「日常の町 拡張」。
// 36×20・outdoor・BGM null・夕方のみ（ekimae の改札からしか来られない）・怪異ゼロ。
// ここは「行かなくてもいい豊かさ」の担当——進行に一切関係しない。純ノスタルジー地区。
//
// 座標凍結v3: ekimae の乗車演出 → (3,10) 着地／駅の talk (2,9) → 乗車演出 → ekimae(5,9)。
// たいやきを買っている（got_taiyaki）と、帰りの車窓の一言が変わる。
//
// 経路: 一本目のアーケード(y10-11)と二本目(y16-17)を、東の路地(x30-33)と西の路地(x0)で
// つないだ回遊ループ。店のあいだの ちいさなくぼみ（x10/x16/x22）にも見るものを置く。

import type { GameState, MapDef, Story, TileDef } from "../../engine/defs";
import { npc } from "../helpers";
import { base, basePx, PROPS, TOWN } from "../tiles";

// ── タイル ──
//   M  駅の改札（もどりの talk）  i  たいやき屋の中  < = >  カウンター
//   o j  しまった戸  d  あいている戸  c  下段の窓（白壁）  t  下段の窓（レンガ）
const PAVE = base(3, 46);
const WIN_LOW_WHITE = basePx(48, 1382);
const WIN_LOW_BRICK = basePx(16, 1382);
const tiles: Record<string, TileDef> = {
	...TOWN,
	M: {
		layers: [base(1, 60), PROPS.metalDoor],
		color: "#8c8c90",
		passable: false,
	},
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
	d: {
		layers: [base(1, 60), base(7, 77, 1, 2)],
		color: "#e8e8e8",
		passable: true,
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
	".": { layers: [PAVE], color: "#9a9a9a", passable: true },
};

// 一本目: 駅・レコード店・本屋・ゲーセン・模型屋・たいやき屋。
// 二本目: 純喫茶・金物屋・洋品店・八百屋・テナント募集。
const rows = [
	"                                    ", // y0
	"                                    ", // y1
	"                                    ", // y2
	"                                    ", // y3
	"                                    ", // y4
	"                                    ", // y5
	"                                    ", // y6
	"aaaaannnnn nnnnn nnnnn nnnnnnnnnnn  ", // y7  駅とアーケード一本目の屋根
	"AAAAA(w(w( (w(w( (w(w( %W%W%%iiii%  ", // y8  たいやき屋の中 (30,8)
	")cM)))c)d).)d)c).)j)t).#t#t#%<==>%  ", // y9  改札 (2,9)・くぼみ (10,9)(16,9)(22,9)
	"..................................  ", // y10 着地 (3,10)・レコード店主 (7,10)
	"..................................  ", // y11
	"..L.......Bb....p............L....  ", // y12 丸ポスト (6,12)・電話ボックス (20,12)
	". zzzzz nnnnn aaaaa zzzzz nnnn....  ", // y13 二本目の屋根・東の路地 (30-33)
	". ZZZZZ ^^^^^ AAAAA ZZZZZ ^^^^....  ", // y14 西の路地 (x0)
	". )o)c) )c)d) )c)c) )c)o) ]jj]....  ", // y15 純喫茶・金物屋・洋品店・八百屋・テナント
	"....................................", // y16
	"....................................", // y17
	"  .L......!.....Bb........L.......  ", // y18 福引き (10,18)
	"                                    ", // y19
];

// ── モブの歩行グラ ──
const RECORD_OYAJI = "pub:assets/rpgen/char/10-elderly-c.png";
const TAIYAKI_OBACHAN = "pub:assets/rpgen/char/09-woman-a.png";
const STUDENT = "pub:assets/rpgen/char/04-child.png";
const WIFE = "pub:assets/rpgen/char/17-woman-d.png";
const YAOYA = "pub:assets/rpgen/char/02-merchant.png";
const MAN = "pub:assets/rpgen/char/14-man-a.png";

/** 帰りの乗車演出（夕日の車窓。たいやきを買っていると一言ふえる）。 */
const rideHome = async (s: Story): Promise<void> => {
	await s.fadeOut(600);
	s.se("train", { volume: 0.7 });
	await s.wait(900);
	await s.narrate("――ガタン、ゴトン。");
	await s.narrate("夕日が、川をわたるあいだ\nずっと　ついてきた。");
	if (s.flag("got_taiyaki"))
		await s.narrate("ふくろの中の　たいやきが、\nまだ　あたたかい。");
	s.se("train", { volume: 0.4, pan: -0.3 });
	await s.wait(400);
	await s.warp("ekimae", 5, 9, "down");
};

export const tonarimachi: MapDef = {
	id: "tonarimachi",
	name: "となりまち",
	bgm: null,
	outdoor: true,
	outside: "#0d0a0c",
	tiles,
	rows,
	// アーケードは夕方から灯りの列（ここだけは「明るい夕方」でよい。生活の密度が主役）
	lights: [
		{ x: 6, y: 9, r: 2, only: "yu,yoru" },
		{ x: 14, y: 9, r: 2, only: "yu,yoru" },
		{ x: 20, y: 9, r: 2, only: "yu,yoru" },
		{ x: 24, y: 9, r: 2, only: "yu,yoru" },
		{ x: 26, y: 9, r: 2, only: "yu,yoru" },
		{ x: 30, y: 9, r: 3, color: "#ffcc88", only: "yu,yoru" },
		{ x: 5, y: 15, r: 2, only: "yu,yoru" },
		{ x: 9, y: 15, r: 2, only: "yu,yoru" },
		{ x: 15, y: 15, r: 2, only: "yu,yoru" },
		{ x: 17, y: 15, r: 2, only: "yu,yoru" },
		{ x: 21, y: 15, r: 2, only: "yu,yoru" },
		{ x: 2, y: 12, r: 3, color: "#ffdf9e", only: "yu,yoru" },
		{ x: 29, y: 12, r: 3, color: "#ffdf9e", only: "yu,yoru" },
		{ x: 3, y: 18, r: 3, color: "#ffdf9e", only: "yu,yoru" },
		{ x: 26, y: 18, r: 3, color: "#ffdf9e", only: "yu,yoru" },
	],
	onEnter: async (s) => {
		s.se("higurashi", { volume: 0.6 });
	},
	events: [
		// ── 着いたとき（一度だけ） ──
		{
			id: "arrive",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(500);
				s.se("doorbell", { pan: 0.4, volume: 0.7 });
				await s.wait(500);
				await s.narrate("アーケードの下は、\nもう　夕方の買いもの時だ。");
				await s.narrate("しらない町の、しっている\nにおいがする。");
				await s.say("kiriko", "……にぎやかンゴ");
			},
		},

		// ── 駅（もどりの talk。座標凍結v3） ──
		{
			id: "eki_kaisatsu",
			x: 2,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("つきみ駅の改札。かえりの\n電車が、もう入っている。");
				const i = await s.choose(["＞＞1 のって帰る", "＞＞2 まだ歩く"], {
					cancel: 1,
				});
				if (i === 0) {
					await rideHome(s);
					return;
				}
				await s.say("kiriko", "もうすこしだけ、\n見ていくンゴ");
			},
		},
		{
			id: "ekimei",
			x: 1,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("駅名標。『つきみ』。");
				await s.narrate("となりの駅は『みなみ』と\n書いてある。……うちの駅だ。");
			},
		},

		// ── レコード店（キリコが長居する店） ──
		{
			id: "record_win",
			x: 6,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"レコード店の窓。ジャケットが\nびっしり　ならんでいる。",
				);
				await s.narrate("どの背も、日に焼けている。");
			},
		},
		{
			id: "record_door",
			x: 8,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("あけっぱなしの戸から、\nレコードの音が　もれている。");
				await s.narrate("……ざらざらした、いい音だ。");
			},
		},
		{
			id: "record_wagon",
			x: 6,
			y: 10,
			sprite: PROPS.crate,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("店頭のワゴン。『どれでも\n3まい500円』。");
				await s.say("kiriko", "……えらべる気が\nしないンゴ");
			},
		},

		// ── 本屋 ──
		{
			id: "honya_win",
			x: 14,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("本屋の窓。『本日発売』の\nポスターが　三枚。");
				await s.narrate("しらない漫画ばかりだ。");
			},
		},
		{
			id: "honya_door",
			x: 12,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("本屋の戸。立ち読みの\nせなかが、二つ見える。");
			},
		},

		// ── ゲーセン（音だけ・入れない） ──
		{
			id: "geesen_door",
			x: 18,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				s.se("decide", { volume: 0.4, pan: 0.1 });
				await s.wait(300);
				s.se("decide", { volume: 0.3, pan: -0.1 });
				await s.narrate("とびらのおくから、電子音と\nだれかの歓声。");
				await s.say("kiriko", "……きょうは、やめて\nおくンゴ");
			},
		},
		{
			id: "geesen_win",
			x: 20,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"ゲーセンの窓。ポスターだらけで\n中は見えない。音だけ、もれてる。",
				);
			},
		},
		...([19, 20] as const).map((x, i) => ({
			id: `geesen_oto_${i}`,
			x,
			y: 10,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) => !st.flags.seen_geesen_oto,
			run: async (s: Story) => {
				s.set("seen_geesen_oto");
				s.se("decide", { volume: 0.35, pan: 0 });
				await s.narrate("ゲーセンの前だけ、\n音の温度が　たかい。");
			},
		})),

		// ── 模型屋 ──
		{
			id: "mokei_a",
			x: 24,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"模型屋のショーウィンドウ。\n戦艦の箱絵が、波をけたてる。",
				);
				await s.say("kiriko", "箱の絵だけで　ごはん\n三ばい　いけるンゴ");
			},
		},
		{
			id: "mokei_b",
			x: 26,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ジオラマ。ちいさな駅と、\nちいさな　ふみきり。");
				await s.narrate("ちいさな人が、ちいさな\nかばんを　もっている。");
			},
		},

		// ── たいやき屋（買うと帰りの車窓が変わる） ──
		{
			id: "taiyaki_yuge",
			x: 28,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("あまい　においが、\nここまで　ながれてくる。");
			},
		},

		// ── くぼみ（店のあいだの見るもの） ──
		{
			id: "matsuri_poster",
			x: 10,
			y: 9,
			sprite: PROPS.notice,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『つきみ秋まつり』の\nポスター。");
				await s.narrate("しらない　おまつりだ。\n日づけは、らいげつ。");
				await s.say("kiriko", "……来られたら、\n来るンゴ");
			},
		},
		{
			id: "jihanki_kubomi",
			x: 16,
			y: 9,
			sprite: PROPS.vending,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				s.se("hum", { volume: 0.5 });
				await s.narrate("じはんき。しらない\nメーカーの　ジュースだ。");
			},
		},
		{
			id: "oki_kanban",
			x: 22,
			y: 9,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『本日　大やす売り』の\n置き看板。");
				await s.narrate("……どの店のものかは、\n書いていない。");
			},
		},

		// ── 一本目の通りの小物 ──
		{
			id: "maru_post",
			x: 6,
			y: 12,
			sprite: base(4, 519, 1, 2),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("まるい、ふるい形のポスト。");
				await s.narrate("ペンキだけ、ぬりたてで\nつやつやだ。……現役らしい。");
			},
		},
		{
			id: "denwa_box",
			x: 20,
			y: 12,
			sprite: PROPS.console,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("電話ボックス。ガラスが\nみがきあげてある。");
				await s.narrate("中に、電話帳が\n二冊も　さがっている。");
			},
		},
		{
			id: "arcade_lamp",
			x: 2,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"アーケードの灯り。はしから\nはしまで、ぜんぶ　ついている。",
				);
			},
		},
		{
			id: "bench_1",
			x: 10,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ベンチ。だれかの水とうが\nわすれてある。");
				await s.narrate("……もちぬしは、たぶん\nゲーセンだ。");
			},
		},
		{
			id: "ueki_hachi",
			x: 16,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("店さきの　植木ばち。\nきちんと　手入れされている。");
			},
		},

		// ── 二本目の通り（純喫茶・金物屋・洋品店・八百屋・テナント） ──
		{
			id: "kissa_door",
			x: 3,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("純喫茶の戸。ベルつきだ。\n『モーニングやってます』");
				await s.narrate("コーヒーのにおいが、\n戸のすきまから　もれている。");
			},
		},
		{
			id: "kissa_win",
			x: 5,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レースのカーテンごし、\nシャンデリアの灯り。");
				await s.narrate("……よるの色の店だ。");
			},
		},
		{
			id: "kanamono_win",
			x: 9,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"金物屋の窓。なべ、やかん、\nざる。ぜんぶ銀色にひかる。",
				);
			},
		},
		{
			id: "kanamono_door",
			x: 11,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("店さきに、たわしの山。");
				await s.narrate("ひとつください、が\n言いづらい　量だ。");
			},
		},
		{
			id: "yohin_a",
			x: 15,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("洋品店のマネキン。\nセーターは、もう秋ものだ。");
			},
		},
		{
			id: "yohin_b",
			x: 17,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『サイズ　とりよせます』の\n手書きの札。");
			},
		},
		{
			id: "yaoya_win",
			x: 21,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("八百屋の店さき。だいこんが\nそろって　白い。");
			},
		},
		{
			id: "tenant",
			x: 27,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("シャッターに『テナント\n募集』の紙。");
				await s.narrate("……ここだけ、通りの音が\nとおくなる。");
			},
		},
		{
			id: "mikan_box",
			x: 20,
			y: 16,
			sprite: base(5, 125),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("箱づみの　りんご。\n『つがる』と書いてある。");
			},
		},

		// ── 東の路地（回遊ループのつなぎ目にも見るものを） ──
		{
			id: "katteguchi",
			x: 31,
			y: 14,
			sprite: PROPS.crate,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("店の勝手口。ネギの\nはこが、つんである。");
			},
		},
		{
			id: "fukubiki",
			x: 10,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『福引き』ののぼりと、\nガラガラの抽選器。");
				await s.narrate("係の人は、いま\n留守のようだ。");
				await s.say("kiriko", "（一回だけ回したい\nンゴ……がまん）");
			},
		},
		{
			id: "bench_2",
			x: 16,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("二本目の通りのベンチ。\nこっちは、ひなたぼっこ用だ。");
			},
		},
		{
			id: "hata",
			x: 26,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『歳末大売り出し』のはた。");
				await s.narrate("……まだ、秋のはじめだ。\n気がはやい。");
			},
		},
		{
			id: "arcade_lamp2",
			x: 3,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("こっちのアーケードの灯りは、\nすこし　オレンジ色だ。");
			},
		},

		// ── 人たち（夕方だけの町なので when は不要） ──
		npc("record_oyaji", 7, 10, RECORD_OYAJI, async (s) => {
			if (!s.flag("seen_record_oyaji")) {
				s.set("seen_record_oyaji");
				await s.say(null, "いらっしゃい。……おっ、\nいい耳してそうな顔だ", {
					name: "レコード店主",
				});
				await s.say("kiriko", "か、顔でわかるンゴ？");
				await s.say(null, "わかるよ。ゆっくり\n見ていきな", {
					name: "レコード店主",
				});
				return;
			}
			if (!s.flag("seen_record_oyaji2")) {
				s.set("seen_record_oyaji2");
				await s.say(null, "蓄音機の針かい？\nまだ置いてるよ、おくに", {
					name: "レコード店主",
				});
				await s.say("kiriko", "……！　この店、\nしんようできるンゴ");
				await s.say(null, "はは。針がいる子は\nひさしぶりだ", {
					name: "レコード店主",
				});
				return;
			}
			await s.say(null, "閉店？　気分しだいだね。\nゆっくりしていきな", {
				name: "レコード店主",
			});
		}),
		npc(
			"taiyaki_obachan",
			30,
			8,
			TAIYAKI_OBACHAN,
			async (s) => {
				if (!s.flag("got_taiyaki")) {
					await s.say(null, "たいやき、やいてるよ。\nあんこ、しっぽまで入り", {
						name: "たいやき屋",
					});
					const i = await s.choose(["＞＞1 ひとつ買う", "＞＞2 またこんど"], {
						cancel: 1,
					});
					if (i === 0) {
						s.se("item", { volume: 0.8 });
						await s.narrate(
							"あつあつの　たいやきを、\n紙ぶくろに　入れてくれた。",
						);
						s.set("got_taiyaki");
						await s.say(null, "あちち、のうちに\nおたべ", {
							name: "たいやき屋",
						});
						await s.say("kiriko", "（電車まで　がまん……\nできるンゴか？）");
						return;
					}
					await s.say(null, "はいよ。にげないから、\nいつでもおいで", {
						name: "たいやき屋",
					});
					return;
				}
				await s.say(null, "まいど！　あんこは\nしっぽから？　頭から？", {
					name: "たいやき屋",
				});
				await s.say("kiriko", "……なやましい質問ンゴ");
			},
			{ dir: "down" },
		),
		npc(
			"tachiyomi",
			13,
			10,
			STUDENT,
			async (s) => {
				await s.say(null, "……いま、いいところ\nなんです", {
					name: "立ち読みの子",
				});
				await s.narrate("ページをめくる手が、\n止まらない。");
			},
			{ dir: "up" },
		),
		npc(
			"kaimono_wife",
			18,
			16,
			WIFE,
			async (s) => {
				await s.say(null, "ここのコロッケはね、\nならんでも　買うのよ", {
					name: "買いものの人",
				});
				await s.say("kiriko", "（コロッケ情報が\n多い町ンゴ）");
			},
			{ wander: true },
		),
		npc(
			"yaoya_oyaji",
			22,
			16,
			YAOYA,
			async (s) => {
				await s.say(null, "りんご、はしりだよ！\nすっぱいの上等！", {
					name: "八百屋",
				});
				await s.say(null, "……すっぱくないのも\nあるよ", { name: "八百屋" });
			},
			{ dir: "up" },
		),
		npc(
			"eshaku",
			26,
			11,
			MAN,
			async (s) => {
				await s.narrate("かるく、会釈をされた。\nしらない町でも、おなじだ。");
			},
			{ dir: "down" },
		),
	],
};
